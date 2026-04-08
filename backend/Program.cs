using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Data;
using Panahgah.Api.Middleware;
using Panahgah.Api.Models;
using Panahgah.Api.Services;

var builder = WebApplication.CreateBuilder(args);

const string localFrontendCorsPolicy = "LocalFrontendCorsPolicy";

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PanahgahAppConnection")));
builder.Services.AddDbContext<AuthIdentityDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PanahgahIdentityConnection")));
builder.Services.AddSingleton<DonorMlPipelineService>();
builder.Services.AddHostedService<DonorMlSchedulerService>();

builder.Services.AddIdentityApiEndpoints<ApplicationUser>(options =>
    {
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 14;
    })
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AuthIdentityDbContext>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    // Frontend and API are on different origins in deployment, so auth cookie must allow
    // cross-site credentialed requests.
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthPolicies.RequireAdmin, policy =>
        policy.RequireRole(AuthRoles.Admin));

    options.AddPolicy(AuthPolicies.RequireDonor, policy =>
        policy.RequireRole(AuthRoles.Donor));

    options.AddPolicy(AuthPolicies.RequireDonorOrAdmin, policy =>
        policy.RequireRole(AuthRoles.Donor, AuthRoles.Admin));
});

builder.Services.AddHttpClient<AnthropicSocialPostGenerator>();
builder.Services.AddHttpClient<GeminiSocialPostGenerator>();
builder.Services.AddScoped<ISocialPostGenerator, ConfigurableSocialPostGenerator>();

builder.Services.AddCors(options =>
{
    options.AddPolicy(localFrontendCorsPolicy, policy =>
    {
        // Always merge env-configured origins with these defaults. If Railway sets AllowedCorsOrigins
        // to a partial list, the previous code replaced the whole default list and the production
        // frontend (https://panahgah.up.railway.app) was missing — browsers then block with CORS.
        var configuredOrigins = builder.Configuration["AllowedCorsOrigins"]?
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            ?? [];

        string[] defaultOrigins =
        [
            "https://panahgah.up.railway.app",
            "http://localhost:5173",
            "https://localhost:5173",
            "http://127.0.0.1:5173",
            "https://127.0.0.1:5173",
            "http://localhost:4173",
            "https://localhost:4173",
            "http://127.0.0.1:4173",
            "https://127.0.0.1:4173",
            "http://localhost:3000",
            "https://localhost:3000"
        ];

        var allowedOrigins = defaultOrigins
            .Concat(configuredOrigins)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        // WithCredentials + cross-origin: browser sends Origin. Railway frontends often use a different
        // *.up.railway.app hostname than the single string in defaultOrigins; allow any HTTPS Railway app.
        static bool IsOriginAllowed(string? origin, string[] allowList)
        {
            if (string.IsNullOrWhiteSpace(origin)) return false;
            foreach (var o in allowList)
            {
                if (string.Equals(o, origin, StringComparison.OrdinalIgnoreCase)) return true;
            }

            if (!Uri.TryCreate(origin, UriKind.Absolute, out var uri)) return false;
            if (uri.Scheme != Uri.UriSchemeHttps) return false;
            return uri.Host.EndsWith(".up.railway.app", StringComparison.OrdinalIgnoreCase);
        }

        policy
            .SetIsOriginAllowed(origin => IsOriginAllowed(origin, allowedOrigins))
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

// Run CORS early so error responses (e.g. 500) still get Access-Control-Allow-Origin when possible.
app.UseCors(localFrontendCorsPolicy);
app.UseHttpsRedirection();
app.UseMiddleware<SecurityHeadersMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();

// Apply database migrations automatically on startup
using (var scope = app.Services.CreateScope())
{
    var appDb = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await appDb.Database.MigrateAsync();

    // Guardrail: fix Postgres identity/sequence drift that can cause
    // "23505 duplicate key value violates unique constraint PK_process_recordings"
    // on inserts (when the sequence lags behind existing rows).
    await appDb.Database.ExecuteSqlRawAsync(@"
DO $$
DECLARE seq text;
DECLARE max_id bigint;
BEGIN
  SELECT pg_get_serial_sequence('process_recordings', 'recording_id') INTO seq;
  IF seq IS NOT NULL THEN
    SELECT COALESCE(MAX(recording_id), 0) INTO max_id FROM process_recordings;
    PERFORM setval(seq, GREATEST(max_id, 1), max_id > 0);
  END IF;
END $$;
");

    var identityDb = scope.ServiceProvider.GetRequiredService<AuthIdentityDbContext>();
    await identityDb.Database.MigrateAsync();
}

await AuthIdentityGenerator.SeedAsync(app.Services, app.Configuration);

app.Run();

// Round 2 attempt
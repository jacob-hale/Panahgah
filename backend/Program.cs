using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Middleware;
using Panahgah.Api.Models;
using Panahgah.Api.Services;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

const string localFrontendCorsPolicy = "LocalFrontendCorsPolicy";
// Local CLI runs may not set ASPNETCORE_ENVIRONMENT=Development, so load this file as an optional fallback.
builder.Configuration.AddJsonFile("appsettings.Development.json", optional: true, reloadOnChange: true);
var appConnection = ResolveConnectionString("PanahgahAppConnection", builder.Configuration);
var identityConnection = ResolveConnectionString("PanahgahIdentityConnection", builder.Configuration);

if (string.IsNullOrWhiteSpace(appConnection) || string.IsNullOrWhiteSpace(identityConnection))
{
    throw new InvalidOperationException(
        "Missing DB connection strings. Set ConnectionStrings:PanahgahAppConnection and " +
        "ConnectionStrings:PanahgahIdentityConnection in backend/appsettings.Development.json " +
        "or environment variables.");
}

static string? ResolveConnectionString(string name, IConfiguration configuration)
{
    var fromConfig = configuration.GetConnectionString(name);
    if (!string.IsNullOrWhiteSpace(fromConfig))
    {
        return fromConfig.Trim();
    }

    var fromEnv = Environment.GetEnvironmentVariable($"ConnectionStrings__{name}");
    if (!string.IsNullOrWhiteSpace(fromEnv))
    {
        return fromEnv.Trim();
    }

    var candidate = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.Development.json");
    if (!File.Exists(candidate))
    {
        return null;
    }

    try
    {
        using var document = JsonDocument.Parse(File.ReadAllText(candidate));
        if (document.RootElement.TryGetProperty("ConnectionStrings", out var cs) &&
            cs.TryGetProperty(name, out var value) &&
            value.ValueKind == JsonValueKind.String)
        {
            return value.GetString()?.Trim();
        }
    }
    catch
    {
        // If this fallback parse fails, caller throws the existing startup message.
    }

    return null;
}

// Railway (and most PaaS) front apps reverse-proxy to the container.
// Respect X-Forwarded-* so HTTPS redirection and scheme detection behave correctly.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor |
        ForwardedHeaders.XForwardedProto |
        ForwardedHeaders.XForwardedHost;

    // In container/PaaS environments, proxy IPs are not known ahead of time.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Railway expects the app to bind to the port it provides.
// Do not apply PORT in Development: many dev shells inherit PORT from other tools, which would
// override launchSettings (e.g. 5238) and break the Vite proxy target → ECONNREFUSED.
var portEnv = Environment.GetEnvironmentVariable("PORT");
if (!builder.Environment.IsDevelopment()
    && int.TryParse(portEnv, out var port) && port is > 0 and < 65536)
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Add services to the container.
builder.Services.Configure<SocialPublicFeedOptions>(builder.Configuration.GetSection(SocialPublicFeedOptions.SectionName));
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<InstagramTimelineCacheVersion>();
builder.Services.AddHttpClient<InstagramPublicMediaFeedService>();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(appConnection));
builder.Services.AddDbContext<AuthIdentityDbContext>(options =>
    options.UseNpgsql(identityConnection));
builder.Services.AddDbContext<DataProtectionKeyContext>(options =>
    options.UseNpgsql(identityConnection));
builder.Services.AddSingleton<DonorMlPipelineService>();
builder.Services.AddSingleton<GirlsReintegrationMlPipelineService>();
builder.Services.AddHostedService<DonorMlSchedulerService>();

builder.Services
    .AddDataProtection()
    .PersistKeysToDbContext<DataProtectionKeyContext>()
    .SetApplicationName("Panahgah.Api");

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
builder.Services.AddHttpClient<GeminiSocialPostGenerator>(client =>
{
    // Default HttpClient timeout is 100s; Gemini generateContent often needs longer when the client uses a 120s budget.
    client.Timeout = TimeSpan.FromSeconds(180);
});
builder.Services.AddHttpClient<ISocialPublishingService, SocialPublishingService>();
builder.Services.AddScoped<ISocialPostGenerator, ConfigurableSocialPostGenerator>();
builder.Services.AddScoped<ISocialConnectionSecretResolver, SocialConnectionSecretResolver>();
builder.Services.AddScoped<IMediaAssetSelector, MediaAssetSelector>();
builder.Services.AddScoped<ICampaignSchedulerService, CampaignSchedulerService>();
builder.Services.AddHttpClient<MetaGraphSocialPublisher>();
builder.Services.AddScoped<ISocialPublisher, MetaGraphSocialPublisher>();
builder.Services.AddHostedService<SocialPublishWorker>();

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
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync("{\"error\":\"An unexpected error occurred.\"}");
        });
    });

    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseRouting();

// Run CORS early so error responses (e.g. 500) still get Access-Control-Allow-Origin when possible.
app.UseCors(localFrontendCorsPolicy);
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
    // duplicate key violations when a sequence lags behind existing rows.
    await appDb.Database.ExecuteSqlRawAsync(@"
DO $$
DECLARE seq_process text;
DECLARE max_process_id bigint;
DECLARE seq_supporters text;
DECLARE max_supporter_id bigint;
BEGIN
  SELECT pg_get_serial_sequence('process_recordings', 'recording_id') INTO seq_process;
  IF seq_process IS NOT NULL THEN
    SELECT COALESCE(MAX(recording_id), 0) INTO max_process_id FROM process_recordings;
    PERFORM setval(seq_process, GREATEST(max_process_id, 1), max_process_id > 0);
  END IF;

  SELECT pg_get_serial_sequence('supporters', 'supporter_id') INTO seq_supporters;
  IF seq_supporters IS NOT NULL THEN
    SELECT COALESCE(MAX(supporter_id), 0) INTO max_supporter_id FROM supporters;
    PERFORM setval(seq_supporters, GREATEST(max_supporter_id, 1), max_supporter_id > 0);
  END IF;
END $$;
");

    var identityDb = scope.ServiceProvider.GetRequiredService<AuthIdentityDbContext>();
    await identityDb.Database.MigrateAsync();

    var dataProtectionDb = scope.ServiceProvider.GetRequiredService<DataProtectionKeyContext>();
    await dataProtectionDb.Database.MigrateAsync();
}

await AuthIdentityGenerator.SeedAsync(app.Services, app.Configuration);

app.Run();

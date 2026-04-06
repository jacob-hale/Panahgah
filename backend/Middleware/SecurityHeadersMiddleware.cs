namespace Panahgah.Api.Middleware;

public class SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment)
{
    private readonly RequestDelegate _next = next;
    private readonly IWebHostEnvironment _environment = environment;
    private const string CspHeaderValue = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'";

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;
        var isSwaggerRequest = path.StartsWithSegments("/swagger") || path.StartsWithSegments("/openapi");

        if (!_environment.IsDevelopment())
        {
            context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        }

        if (!isSwaggerRequest)
        {
            context.Response.Headers["Content-Security-Policy"] = CspHeaderValue;
        }

        await _next(context);
    }
}

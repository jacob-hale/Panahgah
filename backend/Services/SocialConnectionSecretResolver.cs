using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Services;

public interface ISocialConnectionSecretResolver
{
    Task<(SocialPlatformConnection? connection, string? accessToken, string? errorMessage)> ResolveByPlatformAsync(
        string platform,
        CancellationToken cancellationToken);
}

public sealed class SocialConnectionSecretResolver(
    ApplicationDbContext dbContext,
    IConfiguration configuration) : ISocialConnectionSecretResolver
{
    public async Task<(SocialPlatformConnection? connection, string? accessToken, string? errorMessage)> ResolveByPlatformAsync(
        string platform,
        CancellationToken cancellationToken)
    {
        var normalized = platform.Trim().ToLowerInvariant();
        var connection = await dbContext.social_platform_connections
            .AsNoTracking()
            .Where(c => c.is_active && c.platform.ToLower() == normalized)
            .OrderByDescending(c => c.updated_at_utc)
            .FirstOrDefaultAsync(cancellationToken);

        if (connection is null)
        {
            return (null, null, $"No active connection found for platform '{platform}'.");
        }

        if (string.IsNullOrWhiteSpace(connection.token_source))
        {
            return (connection, null, $"No token_source configured for platform '{platform}'.");
        }

        var token = EnvConfigResolver.Resolve(connection.token_source, configuration);

        if (string.IsNullOrWhiteSpace(token))
        {
            return (
                connection,
                null,
                $"Token source '{connection.token_source}' is not set in environment/configuration.");
        }

        return (connection, token.Trim(), null);
    }
}

using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Data;
using Panahgah.Api.Models;
using System.Text.Json;

namespace Panahgah.Api.Services;

public interface ISocialPublisher
{
    Task<(bool isSuccess, string? platformPostId, string? errorMessage)> PublishAsync(
        ScheduledSocialPost post,
        CancellationToken cancellationToken);
}

public interface ISocialPublishingService
{
    Task<(bool isSuccess, string? postId, string? errorMessage)> PublishToFacebookAsync(
        string message,
        CancellationToken cancellationToken = default);

    Task<(bool isSuccess, string? postId, string? errorMessage)> PublishToInstagramAsync(
        string imageUrl,
        string caption,
        CancellationToken cancellationToken = default);
}

public sealed class SocialPublishingService(
    HttpClient httpClient,
    IConfiguration configuration,
    ISocialConnectionSecretResolver connectionResolver) : ISocialPublishingService
{
    private const string GraphVersion = "v25.0";

    public async Task<(bool isSuccess, string? postId, string? errorMessage)> PublishToFacebookAsync(
        string message,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return (false, null, "Message is required.");
        }

        var resolved = await ResolveFacebookAsync(cancellationToken);
        if (resolved.error is not null)
        {
            return (false, null, resolved.error);
        }

        var endpoint = $"https://graph.facebook.com/{GraphVersion}/{resolved.pageId}/feed";
        var payload = new Dictionary<string, string>
        {
            ["message"] = message.Trim(),
            ["access_token"] = resolved.accessToken!,
        };

        var response = await httpClient.PostAsync(endpoint, new FormUrlEncodedContent(payload), cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return (false, null, $"Facebook publish failed ({(int)response.StatusCode}): {TryGetGraphError(body)}");
        }

        return (true, TryReadJsonString(body, "id"), null);
    }

    public async Task<(bool isSuccess, string? postId, string? errorMessage)> PublishToInstagramAsync(
        string imageUrl,
        string caption,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
        {
            return (false, null, "imageUrl is required.");
        }

        var resolved = await ResolveInstagramAsync(cancellationToken);
        if (resolved.error is not null)
        {
            return (false, null, resolved.error);
        }

        var createEndpoint = $"https://graph.facebook.com/{GraphVersion}/{resolved.instagramBusinessId}/media";
        var createPayload = new Dictionary<string, string>
        {
            ["image_url"] = imageUrl.Trim(),
            ["caption"] = caption?.Trim() ?? string.Empty,
            ["access_token"] = resolved.accessToken!,
        };

        var createResponse = await httpClient.PostAsync(createEndpoint, new FormUrlEncodedContent(createPayload), cancellationToken);
        var createBody = await createResponse.Content.ReadAsStringAsync(cancellationToken);
        if (!createResponse.IsSuccessStatusCode)
        {
            return (false, null, $"Instagram media creation failed ({(int)createResponse.StatusCode}): {TryGetGraphError(createBody)}");
        }

        var creationId = TryReadJsonString(createBody, "id");
        if (string.IsNullOrWhiteSpace(creationId))
        {
            return (false, null, "Instagram media creation did not return an id.");
        }

        var publishEndpoint = $"https://graph.facebook.com/{GraphVersion}/{resolved.instagramBusinessId}/media_publish";
        var publishPayload = new Dictionary<string, string>
        {
            ["creation_id"] = creationId,
            ["access_token"] = resolved.accessToken!,
        };

        var publishResponse = await httpClient.PostAsync(publishEndpoint, new FormUrlEncodedContent(publishPayload), cancellationToken);
        var publishBody = await publishResponse.Content.ReadAsStringAsync(cancellationToken);
        if (!publishResponse.IsSuccessStatusCode)
        {
            return (false, null, $"Instagram publish failed ({(int)publishResponse.StatusCode}): {TryGetGraphError(publishBody)}");
        }

        return (true, TryReadJsonString(publishBody, "id"), null);
    }

    private async Task<(string? pageId, string? accessToken, string? error)> ResolveFacebookAsync(CancellationToken cancellationToken)
    {
        var resolved = await connectionResolver.ResolveByPlatformAsync("facebook", cancellationToken);
        var token = resolved.accessToken
            ?? EnvConfigResolver.Resolve("FACEBOOK_PAGE_ACCESS_TOKEN", configuration);
        var pageId = resolved.connection?.page_id
            ?? EnvConfigResolver.Resolve("FACEBOOK_PAGE_ID", configuration)
            ?? configuration["Social:FacebookPageId"];

        if (string.IsNullOrWhiteSpace(token))
        {
            return (null, null, "FACEBOOK_PAGE_ACCESS_TOKEN is not configured.");
        }

        if (string.IsNullOrWhiteSpace(pageId))
        {
            return (null, null, "Facebook page id is not configured.");
        }

        return (pageId.Trim(), token.Trim(), null);
    }

    private async Task<(string? instagramBusinessId, string? accessToken, string? error)> ResolveInstagramAsync(CancellationToken cancellationToken)
    {
        var resolved = await connectionResolver.ResolveByPlatformAsync("instagram", cancellationToken);
        var token = resolved.accessToken
            ?? EnvConfigResolver.Resolve("FACEBOOK_PAGE_ACCESS_TOKEN", configuration);
        var instagramBusinessId = resolved.connection?.instagram_business_account_id
            ?? EnvConfigResolver.Resolve("INSTAGRAM_BUSINESS_ID", configuration)
            ?? configuration["Social:InstagramBusinessId"];

        if (string.IsNullOrWhiteSpace(token))
        {
            return (null, null, "FACEBOOK_PAGE_ACCESS_TOKEN is not configured.");
        }

        if (string.IsNullOrWhiteSpace(instagramBusinessId))
        {
            return (null, null, "instagram_business_account_id / INSTAGRAM_BUSINESS_ID is not configured.");
        }

        return (instagramBusinessId.Trim(), token.Trim(), null);
    }

    private static string TryReadJsonString(string json, string propertyName)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return string.Empty;
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
                ? value.GetString() ?? string.Empty
                : string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string TryGetGraphError(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return "No response body.";
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("error", out var error))
            {
                var message = error.TryGetProperty("message", out var msg) ? msg.GetString() : null;
                var type = error.TryGetProperty("type", out var t) ? t.GetString() : null;
                var code = error.TryGetProperty("code", out var c) ? c.GetRawText() : null;
                return $"{message ?? "Unknown error"} (type={type ?? "?"}, code={code ?? "?"})";
            }
        }
        catch
        {
            // Ignore parse errors.
        }

        return json;
    }
}

public sealed class DryRunSocialPublisher : ISocialPublisher
{
    public Task<(bool isSuccess, string? platformPostId, string? errorMessage)> PublishAsync(
        ScheduledSocialPost post,
        CancellationToken cancellationToken)
    {
        string fakePlatformId = $"dryrun-{post.platform}-{Guid.NewGuid():N}";
        return Task.FromResult<(bool isSuccess, string? platformPostId, string? errorMessage)>(
            (isSuccess: true, platformPostId: fakePlatformId, errorMessage: null));
    }
}

public sealed class MetaGraphSocialPublisher(
    HttpClient httpClient,
    ISocialConnectionSecretResolver connectionResolver,
    ILogger<MetaGraphSocialPublisher> logger) : ISocialPublisher
{
    private const string GraphVersion = "v25.0";
    private static readonly TimeSpan InstagramPublishRetryDelay = TimeSpan.FromSeconds(3);
    private const int InstagramPublishMaxAttempts = 4;

    public async Task<(bool isSuccess, string? platformPostId, string? errorMessage)> PublishAsync(
        ScheduledSocialPost post,
        CancellationToken cancellationToken)
    {
        var resolved = await connectionResolver.ResolveByPlatformAsync(post.platform, cancellationToken);
        if (resolved.connection is null || string.IsNullOrWhiteSpace(resolved.accessToken))
        {
            return (false, null, resolved.errorMessage ?? "Missing connection/token.");
        }

        var platform = post.platform.Trim().ToLowerInvariant();
        return platform switch
        {
            "facebook" => await PublishFacebookAsync(post, resolved.connection, resolved.accessToken, cancellationToken),
            "instagram" => await PublishInstagramAsync(post, resolved.connection, resolved.accessToken, cancellationToken),
            _ => (false, null, $"Unsupported platform '{post.platform}'."),
        };
    }

    private async Task<(bool isSuccess, string? platformPostId, string? errorMessage)> PublishFacebookAsync(
        ScheduledSocialPost post,
        SocialPlatformConnection connection,
        string accessToken,
        CancellationToken cancellationToken)
    {
        var endpoint = $"https://graph.facebook.com/{GraphVersion}/{connection.page_id}/feed";
        var payload = new Dictionary<string, string>
        {
            ["message"] = post.caption,
            ["access_token"] = accessToken,
        };

        var response = await httpClient.PostAsync(endpoint, new FormUrlEncodedContent(payload), cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var graphError = TryGetGraphError(body);
            logger.LogWarning("Facebook publish failed for page {PageId}: {GraphError}", connection.page_id, graphError);
            var hint = graphError.Contains("code=2500", StringComparison.OrdinalIgnoreCase)
                ? " Hint: token/page mismatch. Verify token has asset access to configured page_id."
                : string.Empty;
            return (false, null, $"Facebook publish failed ({(int)response.StatusCode}): {graphError}{hint}");
        }

        var postId = TryReadJsonString(body, "id");
        return (true, postId, null);
    }

    private async Task<(bool isSuccess, string? platformPostId, string? errorMessage)> PublishInstagramAsync(
        ScheduledSocialPost post,
        SocialPlatformConnection connection,
        string accessToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(connection.instagram_business_account_id))
        {
            return (false, null, "instagram_business_account_id is required for Instagram publishing.");
        }

        if (string.IsNullOrWhiteSpace(post.media_url))
        {
            return (false, null, "Instagram publishing currently requires media_url.");
        }

        var createMediaEndpoint =
            $"https://graph.facebook.com/{GraphVersion}/{connection.instagram_business_account_id}/media";
        var createPayload = new Dictionary<string, string>
        {
            ["caption"] = post.caption,
            ["image_url"] = post.media_url!,
            ["access_token"] = accessToken,
        };

        var createResponse = await httpClient.PostAsync(
            createMediaEndpoint,
            new FormUrlEncodedContent(createPayload),
            cancellationToken);
        var createBody = await createResponse.Content.ReadAsStringAsync(cancellationToken);
        if (!createResponse.IsSuccessStatusCode)
        {
            var graphError = TryGetGraphError(createBody);
            logger.LogWarning("Instagram media creation failed for ig {IgBusinessId}: {GraphError}", connection.instagram_business_account_id, graphError);
            return (false, null, $"Instagram media creation failed ({(int)createResponse.StatusCode}): {graphError}");
        }

        var creationId = TryReadJsonString(createBody, "id");
        if (string.IsNullOrWhiteSpace(creationId))
        {
            logger.LogWarning("Instagram create media response missing creation id: {Body}", createBody);
            return (false, null, "Instagram media creation did not return an id.");
        }

        var publishEndpoint =
            $"https://graph.facebook.com/{GraphVersion}/{connection.instagram_business_account_id}/media_publish";
        var publishPayload = new Dictionary<string, string>
        {
            ["creation_id"] = creationId,
            ["access_token"] = accessToken,
        };

        for (var attempt = 1; attempt <= InstagramPublishMaxAttempts; attempt += 1)
        {
            var publishResponse = await httpClient.PostAsync(
                publishEndpoint,
                new FormUrlEncodedContent(publishPayload),
                cancellationToken);
            var publishBody = await publishResponse.Content.ReadAsStringAsync(cancellationToken);
            if (publishResponse.IsSuccessStatusCode)
            {
                var mediaId = TryReadJsonString(publishBody, "id");
                return (true, mediaId, null);
            }

            var graphError = TryGetGraphError(publishBody);
            var shouldRetry = attempt < InstagramPublishMaxAttempts && ShouldRetryInstagramPublish(graphError);
            if (shouldRetry)
            {
                logger.LogInformation(
                    "Instagram media not ready yet for ig {IgBusinessId}. Retrying publish attempt {Attempt}/{MaxAttempts}. Error: {GraphError}",
                    connection.instagram_business_account_id,
                    attempt,
                    InstagramPublishMaxAttempts,
                    graphError);
                await Task.Delay(InstagramPublishRetryDelay, cancellationToken);
                continue;
            }

            logger.LogWarning("Instagram publish failed for ig {IgBusinessId}: {GraphError}", connection.instagram_business_account_id, graphError);
            return (false, null, $"Instagram publish failed ({(int)publishResponse.StatusCode}): {graphError}");
        }

        return (false, null, "Instagram publish failed after retries.");
    }

    private static string TryReadJsonString(string json, string propertyName)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return string.Empty;
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
                ? value.GetString() ?? string.Empty
                : string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    private static string TryGetGraphError(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return "No response body.";
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("error", out var error))
            {
                var message = error.TryGetProperty("message", out var msg) ? msg.GetString() : null;
                var type = error.TryGetProperty("type", out var t) ? t.GetString() : null;
                var code = error.TryGetProperty("code", out var c) ? c.GetRawText() : null;
                return $"{message ?? "Unknown error"} (type={type ?? "?"}, code={code ?? "?"})";
            }
        }
        catch
        {
            // Ignore parse errors.
        }

        return json;
    }

    private static bool ShouldRetryInstagramPublish(string graphError)
    {
        if (string.IsNullOrWhiteSpace(graphError))
        {
            return false;
        }

        var error = graphError.ToLowerInvariant();
        return error.Contains("not ready", StringComparison.Ordinal)
               || error.Contains("processing", StringComparison.Ordinal)
               || error.Contains("please wait", StringComparison.Ordinal)
               || error.Contains("media is still being processed", StringComparison.Ordinal);
    }
}

public sealed class SocialPublishWorker(IServiceScopeFactory scopeFactory, ILogger<SocialPublishWorker> logger)
    : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(20);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var publisher = scope.ServiceProvider.GetRequiredService<ISocialPublisher>();
                var connectedPlatforms = await db.social_platform_connections
                    .AsNoTracking()
                    .Where(c => c.is_active)
                    .Select(c => c.platform)
                    .Distinct()
                    .ToListAsync(stoppingToken);

                var now = DateTime.UtcNow;
                var duePosts = await db.scheduled_social_posts
                    .Where(p => p.status == "scheduled" && p.scheduled_for_utc <= now)
                    .OrderBy(p => p.scheduled_for_utc)
                    .Take(10)
                    .ToListAsync(stoppingToken);

                foreach (var post in duePosts)
                {
                    post.status = "publishing";
                    post.attempt_count += 1;
                }

                if (duePosts.Count > 0)
                {
                    await db.SaveChangesAsync(stoppingToken);
                }

                foreach (var post in duePosts)
                {
                    var hasConnection = connectedPlatforms
                        .Any(p => string.Equals(p, post.platform, StringComparison.OrdinalIgnoreCase));
                    if (!hasConnection)
                    {
                        post.status = "failed";
                        post.error_message = $"No active connection configured for platform '{post.platform}'.";
                        continue;
                    }

                    var publishResult = await publisher.PublishAsync(post, stoppingToken);
                    if (publishResult.isSuccess)
                    {
                        post.status = "published";
                        post.platform_post_id = publishResult.platformPostId;
                        post.error_message = null;
                        post.published_at_utc = DateTime.UtcNow;
                    }
                    else
                    {
                        post.status = post.attempt_count >= 3 ? "failed" : "scheduled";
                        post.error_message = publishResult.errorMessage ?? "Unknown publishing error.";
                    }
                }

                if (duePosts.Count > 0)
                {
                    await db.SaveChangesAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error while processing social publish queue.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }
}

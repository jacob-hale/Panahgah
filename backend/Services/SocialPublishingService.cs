using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Data;
using Panahgah.Api.Models;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace Panahgah.Api.Services;

public interface ISocialPublisher
{
    /// <summary>publishedPostUrl is a public permalink when Graph returns one (or a best-effort fallback).</summary>
    Task<(bool isSuccess, string? platformPostId, string? publishedPostUrl, string? errorMessage)> PublishAsync(
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
    public Task<(bool isSuccess, string? platformPostId, string? publishedPostUrl, string? errorMessage)> PublishAsync(
        ScheduledSocialPost post,
        CancellationToken cancellationToken)
    {
        string fakePlatformId = $"dryrun-{post.platform}-{Guid.NewGuid():N}";
        return Task.FromResult<(bool isSuccess, string? platformPostId, string? publishedPostUrl, string? errorMessage)>(
            (true, fakePlatformId, null, null));
    }
}

public sealed class MetaGraphSocialPublisher(
    HttpClient httpClient,
    ISocialConnectionSecretResolver connectionResolver,
    ILogger<MetaGraphSocialPublisher> logger) : ISocialPublisher
{
    private const string GraphVersion = "v25.0";
    private static readonly TimeSpan InstagramPublishRetryDelay = TimeSpan.FromSeconds(4);
    private const int InstagramPublishMaxAttempts = 8;
    private const int InstagramMediaCreateMaxAttempts = 8;

    /// <summary>
    /// Facebook sometimes benefits from a cache-busting query param; Instagram's crawler is stricter—use clean URLs for IG.
    /// </summary>
    private static string WithFacebookPhotoCacheBuster(string rawUrl, int postId)
    {
        var u = rawUrl.Trim();
        if (string.IsNullOrEmpty(u))
        {
            return u;
        }

        var sep = u.Contains('?', StringComparison.Ordinal) ? "&" : "?";
        return $"{u}{sep}fb_cb={postId}";
    }

    private async Task<string?> TryGetGraphPermalinkAsync(
        string? objectId,
        string accessToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(objectId))
        {
            return null;
        }

        try
        {
            var url =
                $"https://graph.facebook.com/{GraphVersion}/{Uri.EscapeDataString(objectId)}?fields=permalink,permalink_url&access_token={Uri.EscapeDataString(accessToken)}";
            using var response = await httpClient.GetAsync(url, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("permalink", out var p) && p.ValueKind == JsonValueKind.String)
            {
                var s = p.GetString();
                if (!string.IsNullOrWhiteSpace(s))
                {
                    return s;
                }
            }

            if (doc.RootElement.TryGetProperty("permalink_url", out var pu) && pu.ValueKind == JsonValueKind.String)
            {
                var s = pu.GetString();
                if (!string.IsNullOrWhiteSpace(s))
                {
                    return s;
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Permalink lookup failed for object {ObjectId}", objectId);
        }

        return null;
    }

    private static string? BuildFacebookPermalinkFallback(string objectId)
    {
        if (string.IsNullOrWhiteSpace(objectId))
        {
            return null;
        }

        var idx = objectId.IndexOf('_');
        if (idx > 0 && idx < objectId.Length - 1)
        {
            var pagePart = objectId[..idx];
            var postPart = objectId[(idx + 1)..];
            return $"https://www.facebook.com/{pagePart}/posts/{postPart}";
        }

        return null;
    }

    private static Dictionary<string, string> BuildInstagramCreatePayload(
        string imageUrl,
        string? caption,
        string accessToken,
        int createAttempt)
    {
        var captionText = SocialCaptionFormatting.EnsurePanahgahHashtag(caption);
        var payload = new Dictionary<string, string>
        {
            ["image_url"] = imageUrl,
            ["caption"] = captionText,
            ["access_token"] = accessToken,
        };

        // First half: explicit IMAGE. Later attempts omit media_type (Graph accepts image_url-only for photos).
        if (createAttempt <= InstagramMediaCreateMaxAttempts / 2)
        {
            payload["media_type"] = "IMAGE";
        }

        return payload;
    }

    private async Task<HttpResponseMessage> SendInstagramPreflightRequestAsync(
        string imageUrl,
        CancellationToken cancellationToken)
    {
        using var headReq = new HttpRequestMessage(HttpMethod.Head, imageUrl);
        headReq.Headers.TryAddWithoutValidation("User-Agent", "facebookexternalhit/1.1");
        var headResp = await httpClient.SendAsync(headReq, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (headResp.StatusCode != HttpStatusCode.MethodNotAllowed && headResp.StatusCode != HttpStatusCode.NotImplemented)
        {
            return headResp;
        }

        headResp.Dispose();
        using var getReq = new HttpRequestMessage(HttpMethod.Get, imageUrl);
        getReq.Headers.TryAddWithoutValidation("User-Agent", "facebookexternalhit/1.1");
        getReq.Headers.Range = new RangeHeaderValue(0, 0);
        return await httpClient.SendAsync(getReq, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
    }

    private async Task<string?> GetInstagramImagePreflightNoteAsync(string imageUrl, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await SendInstagramPreflightRequestAsync(imageUrl, cancellationToken);
            var ok = response.IsSuccessStatusCode
                     || response.StatusCode == HttpStatusCode.PartialContent;
            if (!ok)
            {
                return $" Preflight: HTTP {(int)response.StatusCode} when fetching image headers (Instagram may fail too).";
            }

            long? totalBytes = response.Content.Headers.ContentLength;
            var range = response.Content.Headers.ContentRange;
            if (response.StatusCode == HttpStatusCode.PartialContent && range?.HasLength == true && range.Length.HasValue)
            {
                totalBytes = range.Length.Value;
            }

            if (totalBytes.HasValue && totalBytes.Value > 8_300_000)
            {
                return " Preflight: file appears larger than ~8MB (Instagram often rejects oversized feed images). "
                       + "Re-export as JPEG, typically under ~4–8MB.";
            }

            var mt = response.Content.Headers.ContentType?.MediaType ?? string.Empty;
            if (!string.IsNullOrEmpty(mt) && !mt.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                return $" Preflight: Content-Type was '{mt}' (expected image/jpeg or image/png).";
            }
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Instagram image preflight failed for {Url}", imageUrl);
        }

        return null;
    }

    public async Task<(bool isSuccess, string? platformPostId, string? publishedPostUrl, string? errorMessage)> PublishAsync(
        ScheduledSocialPost post,
        CancellationToken cancellationToken)
    {
        var resolved = await connectionResolver.ResolveByPlatformAsync(post.platform, cancellationToken);
        if (resolved.connection is null || string.IsNullOrWhiteSpace(resolved.accessToken))
        {
            return (false, null, null, resolved.errorMessage ?? "Missing connection/token.");
        }

        var platform = post.platform.Trim().ToLowerInvariant();
        return platform switch
        {
            "facebook" => await PublishFacebookAsync(post, resolved.connection, resolved.accessToken, cancellationToken),
            "instagram" => await PublishInstagramAsync(post, resolved.connection, resolved.accessToken, cancellationToken),
            _ => (false, null, null, $"Unsupported platform '{post.platform}'."),
        };
    }

    private async Task<(bool isSuccess, string? platformPostId, string? publishedPostUrl, string? errorMessage)> PublishFacebookAsync(
        ScheduledSocialPost post,
        SocialPlatformConnection connection,
        string accessToken,
        CancellationToken cancellationToken)
    {
        var hasMedia = !string.IsNullOrWhiteSpace(post.media_url);
        var endpoint = hasMedia
            ? $"https://graph.facebook.com/{GraphVersion}/{connection.page_id}/photos"
            : $"https://graph.facebook.com/{GraphVersion}/{connection.page_id}/feed";
        var payload = new Dictionary<string, string> { ["access_token"] = accessToken };
        var captionText = SocialCaptionFormatting.EnsurePanahgahHashtag(post.caption);
        if (hasMedia)
        {
            payload["url"] = WithFacebookPhotoCacheBuster(post.media_url!, post.scheduled_post_id);
            payload["caption"] = captionText;
        }
        else
        {
            payload["message"] = captionText;
        }

        var response = await httpClient.PostAsync(endpoint, new FormUrlEncodedContent(payload), cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var graphError = TryGetGraphError(body);
            logger.LogWarning("Facebook publish failed for page {PageId}: {GraphError}", connection.page_id, graphError);
            var hint = graphError.Contains("code=2500", StringComparison.OrdinalIgnoreCase)
                ? " Hint: token/page mismatch. Verify token has asset access to configured page_id."
                : (hasMedia && graphError.Contains("code=100", StringComparison.OrdinalIgnoreCase)
                    ? $" Hint: invalid media parameter. Verify media_url is a publicly reachable direct PNG/JPG URL. media_url={post.media_url}"
                    : string.Empty);
            return (false, null, null, $"Facebook publish failed ({(int)response.StatusCode}): {graphError}{hint}");
        }

        var postId = TryReadJsonString(body, "id");
        var permalink = await TryGetGraphPermalinkAsync(postId, accessToken, cancellationToken)
                          ?? BuildFacebookPermalinkFallback(postId);
        return (true, postId, permalink, null);
    }

    private async Task<(bool isSuccess, string? platformPostId, string? publishedPostUrl, string? errorMessage)> PublishInstagramAsync(
        ScheduledSocialPost post,
        SocialPlatformConnection connection,
        string accessToken,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(connection.instagram_business_account_id))
        {
            return (false, null, null, "instagram_business_account_id is required for Instagram publishing.");
        }

        if (string.IsNullOrWhiteSpace(post.media_url))
        {
            return (false, null, null, "Instagram publishing currently requires media_url.");
        }

        var createMediaEndpoint =
            $"https://graph.facebook.com/{GraphVersion}/{connection.instagram_business_account_id}/media";
        var imageUrl = post.media_url!.Trim();
        var preflightNote = await GetInstagramImagePreflightNoteAsync(imageUrl, cancellationToken);
        HttpResponseMessage? createResponse = null;
        string createBody = string.Empty;

        for (var createAttempt = 1; createAttempt <= InstagramMediaCreateMaxAttempts; createAttempt += 1)
        {
            var createPayload = BuildInstagramCreatePayload(imageUrl, post.caption, accessToken, createAttempt);

            createResponse = await httpClient.PostAsync(
                createMediaEndpoint,
                new FormUrlEncodedContent(createPayload),
                cancellationToken);
            createBody = await createResponse.Content.ReadAsStringAsync(cancellationToken);

            if (createResponse.IsSuccessStatusCode)
            {
                break;
            }

            var graphError = TryGetGraphError(createBody);
            logger.LogWarning(
                "Instagram media creation failed for ig {IgBusinessId} (attempt {Attempt}/{Max}): {GraphError} image_url={ImageUrl}",
                connection.instagram_business_account_id,
                createAttempt,
                InstagramMediaCreateMaxAttempts,
                graphError,
                imageUrl);

            var shouldRetryCreate = createAttempt < InstagramMediaCreateMaxAttempts
                                    && ShouldRetryInstagramMediaCreate(graphError);
            if (shouldRetryCreate)
            {
                var jitterMs = Random.Shared.Next(400, 1800);
                var backoffMs = 2000 + createAttempt * 2800 + jitterMs;
                await Task.Delay(TimeSpan.FromMilliseconds(Math.Min(backoffMs, 45_000)), cancellationToken);
                continue;
            }

            var hint = BuildInstagramMediaCreateFailureHint(graphError, imageUrl) + (preflightNote ?? string.Empty);
            return (false, null, null, $"Instagram media creation failed ({(int)createResponse.StatusCode}): {graphError}{hint}");
        }

        if (createResponse is null || !createResponse.IsSuccessStatusCode)
        {
            var graphError = TryGetGraphError(createBody);
            var hint = BuildInstagramMediaCreateFailureHint(graphError, imageUrl) + (preflightNote ?? string.Empty);
            return (false, null, null, $"Instagram media creation failed ({(int)(createResponse?.StatusCode ?? 0)}): {graphError}{hint}");
        }

        var creationId = TryReadJsonString(createBody, "id");
        if (string.IsNullOrWhiteSpace(creationId))
        {
            logger.LogWarning("Instagram create media response missing creation id: {Body}", createBody);
            return (false, null, null, "Instagram media creation did not return an id.");
        }

        var waitError = await WaitForInstagramMediaContainerAsync(creationId, accessToken, cancellationToken);
        if (waitError is not null)
        {
            return (false, null, null, waitError);
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
                var permalink = await TryGetGraphPermalinkAsync(mediaId, accessToken, cancellationToken);
                return (true, mediaId, permalink, null);
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
            return (false, null, null, $"Instagram publish failed ({(int)publishResponse.StatusCode}): {graphError}");
        }

        return (false, null, null, "Instagram publish failed after retries.");
    }

    /// <summary>
    /// Instagram processes images asynchronously. Publishing before <c>status_code</c> is <c>FINISHED</c>
    /// returns OAuthException 9007 ("Media ID is not available").
    /// </summary>
    private async Task<string?> WaitForInstagramMediaContainerAsync(
        string containerId,
        string accessToken,
        CancellationToken cancellationToken)
    {
        var deadline = DateTime.UtcNow.AddMinutes(3);
        var pollDelay = TimeSpan.FromSeconds(1.5);

        while (DateTime.UtcNow < deadline)
        {
            var statusUrl =
                $"https://graph.facebook.com/{GraphVersion}/{containerId}?fields=status_code&access_token={Uri.EscapeDataString(accessToken)}";

            using var response = await httpClient.GetAsync(statusUrl, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogInformation(
                    "Instagram container status check HTTP {Status} for container {ContainerId}",
                    (int)response.StatusCode,
                    containerId);
                await Task.Delay(pollDelay, cancellationToken);
                pollDelay = MinPollDelay(pollDelay);
                continue;
            }

            if (!TryParseInstagramContainerStatus(body, out var status))
            {
                await Task.Delay(pollDelay, cancellationToken);
                pollDelay = MinPollDelay(pollDelay);
                continue;
            }

            logger.LogDebug("Instagram media container {ContainerId} status_code={Status}", containerId, status);

            if (string.Equals(status, "FINISHED", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            if (string.Equals(status, "PUBLISHED", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            if (string.Equals(status, "ERROR", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(status, "EXPIRED", StringComparison.OrdinalIgnoreCase))
            {
                return $"Instagram rejected the media container (status_code={status}). Response: {body}";
            }

            // IN_PROGRESS — keep polling
            await Task.Delay(pollDelay, cancellationToken);
            pollDelay = MinPollDelay(pollDelay);
        }

        return "Timed out waiting for Instagram to finish processing the image (container status never reached FINISHED).";
    }

    private static TimeSpan MinPollDelay(TimeSpan current) =>
        current >= TimeSpan.FromSeconds(5) ? current : current + TimeSpan.FromMilliseconds(400);

    private static bool TryParseInstagramContainerStatus(string body, out string status)
    {
        status = string.Empty;
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("status_code", out var sc))
            {
                return false;
            }

            if (sc.ValueKind == JsonValueKind.String)
            {
                status = sc.GetString() ?? string.Empty;
                return !string.IsNullOrEmpty(status);
            }

            if (sc.ValueKind == JsonValueKind.Number)
            {
                status = sc.GetRawText();
                return true;
            }
        }
        catch
        {
            // Ignore parse errors.
        }

        return false;
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
               || error.Contains("media is still being processed", StringComparison.Ordinal)
               || error.Contains("9007", StringComparison.Ordinal)
               || error.Contains("media id is not available", StringComparison.Ordinal);
    }

    /// <summary>
    /// Subcode 2207052 / code 9004 is often a transient fetch failure on Meta's side or CDN/WAF differences for crawlers.
    /// </summary>
    private static bool ShouldRetryInstagramMediaCreate(string graphError)
    {
        if (string.IsNullOrWhiteSpace(graphError))
        {
            return false;
        }

        var e = graphError.ToLowerInvariant();
        return e.Contains("9004", StringComparison.Ordinal)
               || e.Contains("2207052", StringComparison.Ordinal)
               || e.Contains("could not be fetched", StringComparison.Ordinal);
    }

    private static string BuildInstagramMediaCreateFailureHint(string graphError, string? mediaUrl)
    {
        if (string.IsNullOrWhiteSpace(graphError))
        {
            return string.Empty;
        }

        if (graphError.Contains("36001", StringComparison.OrdinalIgnoreCase))
        {
            return $" Hint: unsupported image format. Use a public direct PNG/JPG image URL. media_url={mediaUrl}";
        }

        if (graphError.Contains("9004", StringComparison.OrdinalIgnoreCase)
            || graphError.Contains("2207052", StringComparison.OrdinalIgnoreCase))
        {
            return " Hint: Instagram could not download or classify this URL as an image (SPA/bot blocking, robots.txt, " +
                   "wrong Content-Type, very large PNG, or intermittent Meta fetch). Feed photos are safest as public JPEG/PNG under ~8MB. " +
                   $"Try: curl -I -L -A facebookexternalhit \"{mediaUrl}\"";
        }

        return string.Empty;
    }
}

public sealed class SocialPublishWorker(
    IServiceScopeFactory scopeFactory,
    InstagramTimelineCacheVersion timelineCacheVersion,
    ILogger<SocialPublishWorker> logger)
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
                        post.published_post_url = publishResult.publishedPostUrl;
                        post.error_message = null;
                        post.published_at_utc = DateTime.UtcNow;
                        if (post.platform.Contains("Instagram", StringComparison.OrdinalIgnoreCase))
                        {
                            timelineCacheVersion.Bump();
                        }
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

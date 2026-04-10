using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Panahgah.Api.Contracts;

namespace Panahgah.Api.Services;

/// <summary>
/// Loads recent media for the connected Instagram Business account via Graph API (requires the same Page token used for publishing).
/// </summary>
public sealed class InstagramPublicMediaFeedService(
    HttpClient httpClient,
    ISocialConnectionSecretResolver connectionResolver,
    IConfiguration configuration,
    IMemoryCache memoryCache,
    IOptions<SocialPublicFeedOptions> feedOptions,
    InstagramTimelineCacheVersion timelineCacheVersion,
    ILogger<InstagramPublicMediaFeedService> logger)
{
    private const string GraphVersion = "v25.0";

    public async Task<IReadOnlyList<PublicSocialFeedItemDto>> FetchTimelineAsync(int maxItems, CancellationToken cancellationToken)
    {
        maxItems = Math.Clamp(maxItems, 1, 200);
        var opts = feedOptions.Value;
        var cacheMinutes = Math.Clamp(opts.instagram_timeline_cache_minutes, 1, 120);

        var resolved = await connectionResolver.ResolveByPlatformAsync("instagram", cancellationToken);
        var token = resolved.accessToken
            ?? EnvConfigResolver.Resolve("FACEBOOK_PAGE_ACCESS_TOKEN", configuration);
        var igId = resolved.connection?.instagram_business_account_id?.Trim()
            ?? EnvConfigResolver.Resolve("INSTAGRAM_BUSINESS_ID", configuration)
            ?? configuration["Social:InstagramBusinessId"];

        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(igId))
        {
            logger.LogWarning("Instagram timeline: missing token or instagram_business_account_id.");
            return [];
        }

        var cacheKey = $"ig_public_timeline_{igId}_{maxItems}_v{timelineCacheVersion.Current}";
        if (memoryCache.TryGetValue(cacheKey, out IReadOnlyList<PublicSocialFeedItemDto>? cached) && cached is not null)
        {
            return cached;
        }

        var list = new List<PublicSocialFeedItemDto>();
        var nextUrl =
            $"https://graph.facebook.com/{GraphVersion}/{Uri.EscapeDataString(igId)}/media" +
            $"?fields=id,caption,media_type,permalink,timestamp,thumbnail_url,media_url" +
            $"&limit={Math.Min(25, maxItems)}&access_token={Uri.EscapeDataString(token)}";

        var pages = 0;
        while (!string.IsNullOrEmpty(nextUrl) && list.Count < maxItems && pages < 12)
        {
            pages++;
            using var response = await httpClient.GetAsync(nextUrl, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Instagram timeline Graph error ({Status}): {Body}", (int)response.StatusCode, body);
                break;
            }

            try
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in data.EnumerateArray())
                    {
                        if (list.Count >= maxItems)
                        {
                            break;
                        }

                        var permalink = GetString(el, "permalink");
                        if (string.IsNullOrWhiteSpace(permalink))
                        {
                            continue;
                        }

                        var caption = GetString(el, "caption");
                        var thumb = GetString(el, "thumbnail_url");
                        var mediaUrl = GetString(el, "media_url");
                        var mediaType = GetString(el, "media_type");
                        // Prefer full media_url for single images (rectangular); thumbnails are often square/cropped.
                        var displayUrl = mediaType.Equals("IMAGE", StringComparison.OrdinalIgnoreCase)
                            ? (string.IsNullOrWhiteSpace(mediaUrl) ? thumb : mediaUrl)
                            : string.IsNullOrWhiteSpace(mediaUrl)
                                ? thumb
                                : mediaUrl;
                        if (string.IsNullOrWhiteSpace(displayUrl))
                        {
                            displayUrl = thumb;
                        }

                        DateTime? ts = null;
                        var tsRaw = GetString(el, "timestamp");
                        if (!string.IsNullOrWhiteSpace(tsRaw) &&
                            DateTime.TryParse(tsRaw, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsed))
                        {
                            ts = parsed.Kind == DateTimeKind.Utc ? parsed : parsed.ToUniversalTime();
                        }

                        list.Add(new PublicSocialFeedItemDto
                        {
                            platform = "Instagram",
                            platforms = null,
                            caption = caption ?? string.Empty,
                            media_type = string.IsNullOrWhiteSpace(mediaType) ? null : mediaType,
                            media_url = string.IsNullOrWhiteSpace(displayUrl) ? null : displayUrl,
                            published_post_url = permalink,
                            instagram_post_url = permalink,
                            facebook_post_url = null,
                            published_at_utc = ts,
                            campaign_title = null,
                        });
                    }
                }

                nextUrl = string.Empty;
                if (doc.RootElement.TryGetProperty("paging", out var paging) &&
                    paging.TryGetProperty("next", out var nextEl) &&
                    nextEl.ValueKind == JsonValueKind.String)
                {
                    nextUrl = nextEl.GetString() ?? string.Empty;
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Instagram timeline: failed to parse Graph response.");
                break;
            }
        }

        IReadOnlyList<PublicSocialFeedItemDto> result = list;
        memoryCache.Set(
            cacheKey,
            result,
            new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(cacheMinutes) });

        return result;
    }

    private static string GetString(JsonElement el, string name) =>
        el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? p.GetString() ?? string.Empty : string.Empty;
}

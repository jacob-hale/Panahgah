namespace Panahgah.Api.Contracts;

/// <summary>
/// Public News page feed. Optionally sync recent Instagram posts from the Instagram Graph API (same token as publishing),
/// plus optional manual items (e.g. Facebook-only permalinks).
/// </summary>
public sealed class SocialPublicFeedOptions
{
    public const string SectionName = "SocialPublicFeed";

    /// <summary>
    /// When true, loads recent media for the Instagram Business account linked to your Facebook Page (see active
    /// <c>social_platform_connections</c> row for platform instagram, or INSTAGRAM_BUSINESS_ID + FACEBOOK_PAGE_ACCESS_TOKEN).
    /// Your profile URL (e.g. instagram.com/panahgah.refuge) is the public page; the API uses the numeric IG user id.
    /// </summary>
    public bool fetch_instagram_timeline { get; set; }

    /// <summary>Max Instagram posts to pull from Graph (before merging with Items).</summary>
    public int instagram_timeline_limit { get; set; } = 50;

    /// <summary>Cache timeline responses to respect Graph rate limits.</summary>
    public int instagram_timeline_cache_minutes { get; set; } = 20;

    public List<SocialPublicFeedItemConfig> Items { get; set; } = [];
}

public sealed class SocialPublicFeedItemConfig
{
    /// <summary>Instagram post permalink, e.g. https://www.instagram.com/p/AbCdEf/</summary>
    public string? instagram_post_url { get; set; }

    /// <summary>Facebook post permalink.</summary>
    public string? facebook_post_url { get; set; }

    public string? caption { get; set; }

    public string? campaign_title { get; set; }

    /// <summary>Optional ISO 8601 UTC for display ordering (newest first when set).</summary>
    public string? published_at_utc { get; set; }
}

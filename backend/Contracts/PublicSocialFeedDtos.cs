namespace Panahgah.Api.Contracts;

/// <summary>Published social posts for the public website (no auth).</summary>
public sealed class PublicSocialFeedItemDto
{
    /// <summary>Display label, e.g. "Instagram · Facebook" when cross-posted.</summary>
    public string platform { get; set; } = string.Empty;

    public string[]? platforms { get; set; }

    public string caption { get; set; } = string.Empty;

    /// <summary>From Instagram Graph when syncing timeline (IMAGE, VIDEO, CAROUSEL_ALBUM, etc.).</summary>
    public string? media_type { get; set; }

    public string? media_url { get; set; }

    /// <summary>Best permalink for embeds (Instagram preferred).</summary>
    public string? published_post_url { get; set; }

    public string? facebook_post_url { get; set; }
    public string? instagram_post_url { get; set; }

    public DateTime? published_at_utc { get; set; }
    public string? campaign_title { get; set; }
}

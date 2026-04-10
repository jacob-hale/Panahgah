using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public sealed class SocialCampaignCreateDto
{
    [Required, MaxLength(120)]
    public string campaign_name { get; set; } = string.Empty;

    [Required, MaxLength(40)]
    public string platform { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string objective { get; set; } = string.Empty;

    public DateTime start_utc { get; set; }
    public DateTime? end_utc { get; set; }
}

public sealed class ScheduledSocialPostCreateDto
{
    public int? campaign_id { get; set; }
    public int? media_asset_id { get; set; }

    [Required, MaxLength(40)]
    public string platform { get; set; } = string.Empty;

    public DateTime scheduled_for_utc { get; set; }

    [Required, MaxLength(5000)]
    public string caption { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? media_url { get; set; }
}

public sealed class CampaignGenerateRequestDto
{
    [Required, MaxLength(120)]
    public string campaign_name { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string campaign_goal { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string post_topic { get; set; } = string.Empty;

    [Required, MaxLength(80)]
    public string media_category { get; set; } = "random";

    [Required, MaxLength(80)]
    public string tone { get; set; } = string.Empty;

    [MaxLength(80)]
    public string? post_type { get; set; }

    public DateTime start_utc { get; set; }
    public DateTime end_utc { get; set; }
    public int posts_per_week { get; set; } = 3;
    public bool include_resident_story { get; set; } = true;
    public bool post_to_facebook { get; set; } = true;
    public bool post_to_instagram { get; set; } = true;
}

public sealed class SinglePostGenerateRequestDto
{
    [Required, MaxLength(120)]
    public string post_topic { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string goal { get; set; } = "Donations";

    [Required, MaxLength(80)]
    public string tone { get; set; } = "Empathetic and hopeful";

    [MaxLength(80)]
    public string? post_type { get; set; }

    [Required, MaxLength(80)]
    public string media_category { get; set; } = "random";

    public bool include_resident_story { get; set; } = true;
    public DateTime scheduled_for_utc { get; set; }
    public bool post_to_facebook { get; set; } = true;
    public bool post_to_instagram { get; set; } = true;
}

public sealed class ScheduledSocialPostResponseDto
{
    public int scheduled_post_id { get; set; }
    public int? campaign_id { get; set; }
    public int? media_asset_id { get; set; }

    /// <summary>Campaign name or single-post topic label for the queue.</summary>
    public string? campaign_title { get; set; }

    public string platform { get; set; } = string.Empty;
    public DateTime scheduled_for_utc { get; set; }
    public string caption { get; set; } = string.Empty;
    public string? media_url { get; set; }
    public string status { get; set; } = string.Empty;
    public int attempt_count { get; set; }
    public string? error_message { get; set; }
    public string? platform_post_id { get; set; }

    /// <summary>Public URL on Facebook or Instagram after a successful publish.</summary>
    public string? published_post_url { get; set; }

    public DateTime created_at_utc { get; set; }
    public DateTime? published_at_utc { get; set; }
}

public sealed class ScheduledSocialPostUpdateDto
{
    [MaxLength(5000)]
    public string? caption { get; set; }

    [MaxLength(1000)]
    public string? media_url { get; set; }

    public DateTime? scheduled_for_utc { get; set; }
}

public sealed class ScheduledSocialPostBulkActionDto
{
    public List<int> scheduled_post_ids { get; set; } = [];
}

public sealed class DraftRegenerateRequestDto
{
    public List<int> scheduled_post_ids { get; set; } = [];

    [Required, MaxLength(120)]
    public string post_topic { get; set; } = string.Empty;

    [Required, MaxLength(120)]
    public string goal { get; set; } = "Donations";

    [Required, MaxLength(80)]
    public string tone { get; set; } = string.Empty;

    [MaxLength(80)]
    public string? post_type { get; set; }

    [Required, MaxLength(80)]
    public string media_category { get; set; } = "random";

    public bool include_resident_story { get; set; } = true;
}

public sealed class CampaignMediaUploadResponseDto
{
    public string category { get; set; } = string.Empty;
    public string file_name { get; set; } = string.Empty;
    public string public_url { get; set; } = string.Empty;
    public int width { get; set; }
    public int height { get; set; }
    public long size_bytes { get; set; }
    public string format { get; set; } = string.Empty;
}

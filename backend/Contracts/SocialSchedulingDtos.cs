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

    [Required, MaxLength(40)]
    public string platform { get; set; } = string.Empty;

    public DateTime scheduled_for_utc { get; set; }

    [Required, MaxLength(5000)]
    public string caption { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? media_url { get; set; }
}

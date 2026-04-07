using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public class ProcessRecordingsQueryDto
{
    public int? resident_id { get; set; }

    public int page { get; set; } = 1;
    public int page_size { get; set; } = 10;

    /// <summary>
    /// Sort order for session_date. Allowed: "desc" (default), "asc".
    /// </summary>
    public string? sort_order { get; set; } = "desc";

    /// <summary>
    /// Multi-select session types. Bind via repeated query params: session_type=Individual&session_type=Group
    /// </summary>
    public string[]? session_type { get; set; }

    public bool? progress_noted { get; set; }
    public bool? concerns_flagged { get; set; }
    public bool? referral_made { get; set; }

    public DateOnly? from_date { get; set; }
    public DateOnly? to_date { get; set; }
}

public class PagedResponseDto<T>
{
    public required IReadOnlyList<T> items { get; set; }
    public required int total_records { get; set; }
    public required int total_pages { get; set; }
    public required int current_page { get; set; }
    public required int page_size { get; set; }
}

public class ProcessRecordingUpsertDto
{
    [Required]
    public int resident_id { get; set; }
    [Required]
    public DateOnly session_date { get; set; }
    [Required, MaxLength(256)]
    public string social_worker { get; set; } = string.Empty;
    [Required, MaxLength(64)]
    public string session_type { get; set; } = string.Empty;
    [Range(1, 1440)]
    public int session_duration_minutes { get; set; }
    [Required, MaxLength(64)]
    public string emotional_state_observed { get; set; } = string.Empty;
    [Required, MaxLength(64)]
    public string emotional_state_end { get; set; } = string.Empty;
    [Required, MaxLength(4000)]
    public string session_narrative { get; set; } = string.Empty;
    [Required, MaxLength(2000)]
    public string interventions_applied { get; set; } = string.Empty;
    [Required, MaxLength(2000)]
    public string follow_up_actions { get; set; } = string.Empty;
    [Required]
    public bool progress_noted { get; set; }
    [Required]
    public bool concerns_flagged { get; set; }
    [Required]
    public bool referral_made { get; set; }
    [MaxLength(4000)]
    public string? notes_restricted { get; set; }
}

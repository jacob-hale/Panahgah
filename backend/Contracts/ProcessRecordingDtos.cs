using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

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
    [Required, MaxLength(4000)]
    public string notes_restricted { get; set; } = string.Empty;
}

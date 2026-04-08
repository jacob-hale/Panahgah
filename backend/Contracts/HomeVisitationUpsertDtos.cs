using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public sealed class HomeVisitationUpsertDto
{
    [Required]
    public int resident_id { get; set; }

    [Required]
    public DateOnly visit_date { get; set; }

    [Required, MaxLength(256)]
    public string social_worker { get; set; } = string.Empty;

    [Required, MaxLength(64)]
    public string visit_type { get; set; } = string.Empty;

    [Required, MaxLength(256)]
    public string location_visited { get; set; } = string.Empty;

    [MaxLength(512)]
    public string family_members_present { get; set; } = string.Empty;

    [Required, MaxLength(512)]
    public string purpose { get; set; } = string.Empty;

    [Required, MaxLength(4000)]
    public string observations { get; set; } = string.Empty;

    [Required, MaxLength(64)]
    public string family_cooperation_level { get; set; } = string.Empty;

    [Required]
    public bool safety_concerns_noted { get; set; }

    [Required]
    public bool follow_up_needed { get; set; }

    [MaxLength(2000)]
    public string? follow_up_notes { get; set; }

    [Required, MaxLength(64)]
    public string visit_outcome { get; set; } = string.Empty;
}


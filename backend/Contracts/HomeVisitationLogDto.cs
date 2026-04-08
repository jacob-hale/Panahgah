using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

/// <summary>Staff portal payload: controlled vocabulary + optional free text. Other DB columns use <see cref="HomeVisitationCatalog"/> defaults.</summary>
public sealed class HomeVisitationLogDto
{
    [Required]
    public int resident_id { get; set; }

    [Required, MaxLength(64)]
    public string visit_type { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string home_environment_observation { get; set; } = string.Empty;

    /// <summary>Required when <see cref="home_environment_observation"/> is "Other (describe below)".</summary>
    [MaxLength(4000)]
    public string? home_environment_other { get; set; }

    /// <summary>Optional nuance beyond the structured observation.</summary>
    [MaxLength(4000)]
    public string? observations_additional { get; set; }

    [Required, MaxLength(64)]
    public string family_cooperation_level { get; set; } = string.Empty;

    [Required]
    public bool safety_concerns_noted { get; set; }

    [Required, MaxLength(128)]
    public string follow_up_action { get; set; } = string.Empty;

    /// <summary>Required when <see cref="follow_up_action"/> is "Other (describe below)".</summary>
    [MaxLength(2000)]
    public string? follow_up_other_details { get; set; }
}

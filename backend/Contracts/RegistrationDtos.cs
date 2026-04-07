using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public sealed class DonorRegisterRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(14)]
    public string Password { get; set; } = string.Empty;

    [Required, MaxLength(256)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? FirstName { get; set; }

    [MaxLength(128)]
    public string? LastName { get; set; }

    [MaxLength(64)]
    public string? Phone { get; set; }

    /// <summary>Primary classification, e.g. individual, organization.</summary>
    [Required, MaxLength(64)]
    public string PrimarySupporterType { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? Region { get; set; }

    [MaxLength(128)]
    public string? Country { get; set; }

    /// <summary>Interest keys: monetary, volunteer, skills, in_kind, time, social_media.</summary>
    public string[] ContributionInterests { get; set; } = [];
}

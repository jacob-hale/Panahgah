using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public sealed class SupporterUpsertDto
{
    [Required, MaxLength(64)]
    public string supporter_type { get; set; } = string.Empty;

    [Required, MaxLength(256)]
    public string display_name { get; set; } = string.Empty;

    [MaxLength(256)]
    public string? organization_name { get; set; }

    [MaxLength(128)]
    public string? first_name { get; set; }

    [MaxLength(128)]
    public string? last_name { get; set; }

    [Required, MaxLength(64)]
    public string relationship_type { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string region { get; set; } = string.Empty;

    [Required, MaxLength(128)]
    public string country { get; set; } = string.Empty;

    [Required, EmailAddress, MaxLength(256)]
    public string email { get; set; } = string.Empty;

    [Required, MaxLength(64)]
    public string phone { get; set; } = string.Empty;

    [Required, MaxLength(32)]
    public string status { get; set; } = string.Empty;

    [MaxLength(64)]
    public string acquisition_channel { get; set; } = string.Empty;

    /// <summary>Optional JSON array string of interest keys (same as self-signup).</summary>
    public string? contribution_interests { get; set; }
}

public sealed class SupporterSelfUpdateDto
{
    [Required, MaxLength(256)]
    public string display_name { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? first_name { get; set; }

    [MaxLength(128)]
    public string? last_name { get; set; }

    [MaxLength(64)]
    public string? phone { get; set; }

    [Required, MaxLength(64)]
    public string supporter_type { get; set; } = string.Empty;

    [MaxLength(128)]
    public string? region { get; set; }

    [MaxLength(128)]
    public string? country { get; set; }

    public string[] contribution_interests { get; set; } = [];
}

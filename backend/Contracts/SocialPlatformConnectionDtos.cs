using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public sealed class SocialPlatformConnectionUpsertDto
{
    [Required, MaxLength(40)]
    public string platform { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string account_label { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string page_id { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? instagram_business_account_id { get; set; }

    public bool is_placeholder { get; set; } = true;
}

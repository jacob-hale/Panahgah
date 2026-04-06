using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public class DonationUpsertDto
{
    [Required]
    public int supporter_id { get; set; }
    [Required, MaxLength(64)]
    public string donation_type { get; set; } = string.Empty;
    [Required]
    public DateOnly donation_date { get; set; }
    [Required, MaxLength(64)]
    public string channel_source { get; set; } = string.Empty;
    [MaxLength(16)]
    public string? currency_code { get; set; }
    public decimal? amount { get; set; }
    [Required]
    public decimal estimated_value { get; set; }
    [Required, MaxLength(32)]
    public string impact_unit { get; set; } = string.Empty;
    [Required]
    public bool is_recurring { get; set; }
    [MaxLength(256)]
    public string? campaign_name { get; set; }
    [Required, MaxLength(2000)]
    public string notes { get; set; } = string.Empty;
    public int? created_by_partner_id { get; set; }
    public int? referral_post_id { get; set; }
}

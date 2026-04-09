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

public sealed class DonorDonationCreateDto
{
    [Required, Range(1, 1000000)]
    public decimal amount { get; set; }

    [Required]
    public bool is_recurring { get; set; }

    [MaxLength(256)]
    public string? campaign_name { get; set; }
}

public sealed class DonationAllocationReadDto
{
    public int allocation_id { get; set; }
    public int donation_id { get; set; }
    public int safehouse_id { get; set; }
    public string program_area { get; set; } = string.Empty;
    public decimal amount_allocated { get; set; }
    public DateOnly allocation_date { get; set; }
    public string allocation_notes { get; set; } = string.Empty;
}

public sealed class DonationReadDto
{
    public int donation_id { get; set; }
    public int supporter_id { get; set; }
    public string donation_type { get; set; } = string.Empty;
    public DateOnly donation_date { get; set; }
    public string channel_source { get; set; } = string.Empty;
    public string? currency_code { get; set; }
    public decimal? amount { get; set; }
    public decimal estimated_value { get; set; }
    public string impact_unit { get; set; } = string.Empty;
    public bool is_recurring { get; set; }
    public string? campaign_name { get; set; }
    public string notes { get; set; } = string.Empty;
    public int? created_by_partner_id { get; set; }
    public int? referral_post_id { get; set; }
    public List<DonationAllocationReadDto> donation_allocations { get; set; } = [];
}

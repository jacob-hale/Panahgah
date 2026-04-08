using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public sealed class DonationAllocationCreateDto
{
    [Required]
    public int donation_id { get; set; }

    [Required]
    public int safehouse_id { get; set; }

    [Required, MaxLength(128)]
    public string program_area { get; set; } = string.Empty;

    [Required]
    public decimal amount_allocated { get; set; }

    [Required]
    public DateOnly allocation_date { get; set; }

    [Required, MaxLength(2000)]
    public string allocation_notes { get; set; } = string.Empty;
}

public sealed class DonationAllocationUpdateDto
{
    [Required]
    public int safehouse_id { get; set; }

    [Required, MaxLength(128)]
    public string program_area { get; set; } = string.Empty;

    [Required]
    public decimal amount_allocated { get; set; }

    [Required]
    public DateOnly allocation_date { get; set; }

    [Required, MaxLength(2000)]
    public string allocation_notes { get; set; } = string.Empty;
}

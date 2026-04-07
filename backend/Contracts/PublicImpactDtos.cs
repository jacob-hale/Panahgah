namespace Panahgah.Api.Contracts;

public sealed class PublicImpactSummaryDto
{
    public int safehouse_count { get; init; }
    public int resident_count { get; init; }
    public int donation_count { get; init; }
    public decimal estimated_donation_total_php { get; init; }
}


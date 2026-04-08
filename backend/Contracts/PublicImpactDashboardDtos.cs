namespace Panahgah.Api.Contracts;

public sealed class PublicImpactDashboardDto
{
    public required PublicImpactHeroDto hero { get; init; }
    public required PublicImpactOutcomesDto outcomes { get; init; }
    public required PublicImpactSafetyDto safety { get; init; }
    public required PublicImpactDonorImpactDto donor_impact { get; init; }
    public required IReadOnlyList<PublicImpactTrendPointDto> trends { get; init; }
}

public sealed class PublicImpactHeroDto
{
    public int safehouse_count { get; init; }
    public int resident_count { get; init; }
    public decimal progress_rate { get; init; } // 0..1
    public int successful_reintegration_count { get; init; }
}

public sealed class PublicImpactOutcomesDto
{
    public decimal avg_health_score { get; init; } // 0..5 (seeded data)
    public decimal avg_education_progress_percent { get; init; } // 0..100
}

public sealed class PublicImpactSafetyDto
{
    public int incident_count_total { get; init; }
    public decimal incident_resolved_rate { get; init; } // 0..1
    public int high_severity_incident_count { get; init; }
    public int referrals_made_count { get; init; }
}

public sealed class PublicImpactDonorImpactDto
{
    public decimal donations_total_amount_php { get; init; }
    public decimal donations_total_estimated_php { get; init; }
    public required IReadOnlyList<PublicImpactProgramAllocationDto> allocations_by_program_area { get; init; }
}

public sealed class PublicImpactProgramAllocationDto
{
    public required string program_area { get; init; }
    public decimal amount_allocated { get; init; }
}

public sealed class PublicImpactTrendPointDto
{
    // Some prod rows may have NULL month_start; keep this nullable to avoid 500s.
    public DateOnly? month_start { get; init; }
    public decimal avg_health_score { get; init; }
    public decimal avg_education_progress { get; init; }
    public int sessions_count { get; init; }
}


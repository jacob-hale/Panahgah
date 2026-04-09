namespace Panahgah.Api.Contracts;

public sealed class AdminDashboardMetricsDto
{
    public AdminDashboardKpisDto kpis { get; set; } = new();
    public List<SafehouseResidentBreakdownDto> safehouse_resident_breakdown { get; set; } = [];
    public List<RecentDonationDto> recent_donations { get; set; } = [];
    public List<UpcomingCaseConferenceDto> upcoming_case_conferences { get; set; } = [];
    public ProgressSummaryDto progress_summary { get; set; } = new();
    public DonorMlInsightsResponseDto donor_ml { get; set; } = new();
}

public sealed class AdminDashboardKpisDto
{
    public int active_residents_total { get; set; }
    public int safehouse_count { get; set; }
    public int recent_donations_count { get; set; }
    public decimal recent_donations_estimated_total { get; set; }
    public decimal donations_lifetime_amount_total { get; set; }
    public decimal donations_lifetime_estimated_total { get; set; }
    public decimal donations_last_30_days_amount_total { get; set; }
    public decimal donations_last_30_days_estimated_total { get; set; }
    public decimal progress_noted_rate_percent { get; set; }
}

public sealed class SafehouseResidentBreakdownDto
{
    public int safehouse_id { get; set; }
    public string safehouse_name { get; set; } = string.Empty;
    public int active_residents_count { get; set; }
}

public sealed class RecentDonationDto
{
    public int donation_id { get; set; }
    public DateOnly donation_date { get; set; }
    public decimal estimated_value { get; set; }
    public string donation_type { get; set; } = string.Empty;
    public string supporter_name { get; set; } = string.Empty;
}

public sealed class UpcomingCaseConferenceDto
{
    public int plan_id { get; set; }
    public DateOnly case_conference_date { get; set; }
    public int resident_id { get; set; }
    public string resident_case_code { get; set; } = string.Empty;
    public int safehouse_id { get; set; }
    public string safehouse_name { get; set; } = string.Empty;
    public string plan_status { get; set; } = string.Empty;
}

public sealed class ProgressSummaryDto
{
    public int total_sessions { get; set; }
    public int progress_noted_count { get; set; }
    public int concerns_flagged_count { get; set; }
}

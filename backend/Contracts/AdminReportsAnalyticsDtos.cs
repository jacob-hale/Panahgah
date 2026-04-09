namespace Panahgah.Api.Contracts;

public sealed class AdminReportsAnalyticsDto
{
    public required AdminReportsBeneficiarySummaryDto beneficiaries { get; init; }
    public required AdminReportsOutcomeSummaryDto outcomes { get; init; }
    public required AdminReportsReintegrationDto reintegration { get; init; }
    public required IReadOnlyList<AdminReportsDonationMonthPointDto> donation_trend_monthly { get; init; }
    public required IReadOnlyList<AdminReportsNetworkMonthTrendDto> network_monthly_trends { get; init; }
    public required IReadOnlyList<AdminReportsSafehousePerformanceDto> safehouse_performance { get; init; }
    public int total_process_recordings { get; init; }
}

public sealed class AdminReportsBeneficiarySummaryDto
{
    public int residents_total { get; init; }
    public int residents_active { get; init; }
}

public sealed class AdminReportsOutcomeSummaryDto
{
    public decimal avg_health_score { get; init; }
    public decimal avg_education_progress_percent { get; init; }
}

/// <summary>
/// Reintegration rate uses denominator = residents with any non-empty reintegration_status.
/// </summary>
public sealed class AdminReportsReintegrationDto
{
    public int completed_count { get; init; }
    public int with_status_count { get; init; }
    public decimal completion_rate { get; init; }
}

public sealed class AdminReportsDonationMonthPointDto
{
    public DateOnly month_start { get; init; }
    public decimal amount_sum { get; init; }
    public decimal estimated_value_sum { get; init; }
}

public sealed class AdminReportsNetworkMonthTrendDto
{
    public DateOnly? month_start { get; init; }
    public decimal avg_health_score { get; init; }
    public decimal avg_education_progress { get; init; }
    public int sessions_count { get; init; }
}

public sealed class AdminReportsSafehousePerformanceDto
{
    public int safehouse_id { get; init; }
    public required string safehouse_name { get; init; }
    public DateOnly metric_month { get; init; }
    public int active_residents { get; init; }
    public decimal avg_health_score { get; init; }
    public decimal avg_education_progress { get; init; }
    public int process_recording_count { get; init; }
}

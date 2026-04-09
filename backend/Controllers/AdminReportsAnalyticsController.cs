using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/admin/reports")]
public sealed class AdminReportsAnalyticsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("analytics")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<ActionResult<AdminReportsAnalyticsDto>> GetAnalytics()
    {
        var residentsTotal = await dbContext.residents.AsNoTracking().CountAsync();

        var residentRows = await dbContext.residents.AsNoTracking()
            .Select(r => r.case_status)
            .ToListAsync();
        var residentsActive = residentRows.Count(IsActiveCaseStatus);

        var avgHealth = await dbContext.health_wellbeing_records.AsNoTracking().AnyAsync()
            ? await dbContext.health_wellbeing_records.AsNoTracking().AverageAsync(r => r.general_health_score)
            : 0m;

        var avgEdu = await dbContext.education_records.AsNoTracking().AnyAsync()
            ? await dbContext.education_records.AsNoTracking().AverageAsync(r => r.progress_percent)
            : 0m;

        var completedReint = await dbContext.residents.AsNoTracking()
            .CountAsync(r => r.reintegration_status == "Completed");

        var withStatus = await dbContext.residents.AsNoTracking()
            .CountAsync(r => r.reintegration_status != null && r.reintegration_status.Trim().Length > 0);

        var reintRate = withStatus == 0 ? 0m : Math.Round((decimal)completedReint / withStatus, 4);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var currentMonthStart = new DateOnly(today.Year, today.Month, 1);
        var firstTrendMonth = currentMonthStart.AddMonths(-11);

        var donationRows = await dbContext.donations.AsNoTracking()
            .Where(d => d.donation_date >= firstTrendMonth)
            .Select(d => new { d.donation_date, d.amount, d.estimated_value })
            .ToListAsync();

        var donationByMonth = donationRows
            .GroupBy(d => new DateOnly(d.donation_date.Year, d.donation_date.Month, 1))
            .ToDictionary(
                g => g.Key,
                g => (
                    amount: g.Sum(x => x.amount ?? 0m),
                    est: g.Sum(x => x.estimated_value)));

        var donationTrend = new List<AdminReportsDonationMonthPointDto>();
        for (var i = 0; i < 12; i++)
        {
            var m = firstTrendMonth.AddMonths(i);
            donationByMonth.TryGetValue(m, out var sums);
            donationTrend.Add(new AdminReportsDonationMonthPointDto
            {
                month_start = m,
                amount_sum = sums.amount,
                estimated_value_sum = sums.est
            });
        }

        var networkMonthly = await dbContext.safehouse_monthly_metrics.AsNoTracking()
            .GroupBy(m => EF.Property<DateOnly?>(m, nameof(SafehouseMonthlyMetric.month_start)))
            .Select(g => new AdminReportsNetworkMonthTrendDto
            {
                month_start = g.Key,
                avg_health_score = g.Average(x => EF.Property<decimal?>(x, nameof(SafehouseMonthlyMetric.avg_health_score))) ?? 0m,
                avg_education_progress = g.Average(x => EF.Property<decimal?>(x, nameof(SafehouseMonthlyMetric.avg_education_progress))) ?? 0m,
                sessions_count = g.Sum(x => EF.Property<int?>(x, nameof(SafehouseMonthlyMetric.process_recording_count))) ?? 0
            })
            .OrderBy(x => x.month_start)
            .ToListAsync();

        var networkLast12 = networkMonthly
            .Where(x => x.month_start.HasValue && x.month_start.Value >= firstTrendMonth)
            .OrderBy(x => x.month_start)
            .ToList();
        if (networkLast12.Count > 12)
        {
            networkLast12 = networkLast12.TakeLast(12).ToList();
        }

        var inner = dbContext.safehouse_monthly_metrics.AsNoTracking()
            .GroupBy(m => m.safehouse_id)
            .Select(g => new { safehouse_id = g.Key, maxMonth = g.Max(x => x.month_start) });

        var safehousePerformance = await (
            from m in dbContext.safehouse_monthly_metrics.AsNoTracking()
            join s in dbContext.safehouses.AsNoTracking() on m.safehouse_id equals s.safehouse_id
            join mp in inner on new { m.safehouse_id, Month = m.month_start } equals new { mp.safehouse_id, Month = mp.maxMonth }
            select new AdminReportsSafehousePerformanceDto
            {
                safehouse_id = s.safehouse_id,
                safehouse_name = s.name,
                metric_month = m.month_start,
                active_residents = m.active_residents,
                avg_health_score = m.avg_health_score,
                avg_education_progress = m.avg_education_progress,
                process_recording_count = m.process_recording_count
            })
            .OrderBy(x => x.safehouse_name)
            .ToListAsync();

        var totalSessions = await dbContext.process_recordings.AsNoTracking().CountAsync();

        var dto = new AdminReportsAnalyticsDto
        {
            beneficiaries = new AdminReportsBeneficiarySummaryDto
            {
                residents_total = residentsTotal,
                residents_active = residentsActive
            },
            outcomes = new AdminReportsOutcomeSummaryDto
            {
                avg_health_score = avgHealth,
                avg_education_progress_percent = avgEdu
            },
            reintegration = new AdminReportsReintegrationDto
            {
                completed_count = completedReint,
                with_status_count = withStatus,
                completion_rate = reintRate
            },
            donation_trend_monthly = donationTrend,
            network_monthly_trends = networkLast12,
            safehouse_performance = safehousePerformance,
            total_process_recordings = totalSessions
        };

        return Ok(dto);
    }

    private static bool IsActiveCaseStatus(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var normalized = value.Trim().ToLowerInvariant();
        return normalized switch
        {
            "active" => true,
            "open" => true,
            "ongoing" => true,
            "in care" => true,
            "in-care" => true,
            "enrolled" => true,
            "current" => true,
            "admitted" => true,
            _ => false
        };
    }
}

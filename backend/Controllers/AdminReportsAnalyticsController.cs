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

        // Avoid .Trim() in LINQ — PostgreSQL translation can fail; empty string still excluded.
        var withStatus = await dbContext.residents.AsNoTracking()
            .CountAsync(r => r.reintegration_status != null && r.reintegration_status != "");

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

        // Match PublicImpactController: prod rows may have NULL month_start despite the CLR model.
        // Use EF.Property with nullable types so EF never materializes NULL into DateOnly.
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

        // Do not materialize full SafehouseMonthlyMetric rows — NULL month_start breaks DateOnly mapping.
        var maxPerHouse = await dbContext.safehouse_monthly_metrics.AsNoTracking()
            .GroupBy(m => m.safehouse_id)
            .Select(g => new
            {
                safehouse_id = g.Key,
                maxMonth = g.Max(x => EF.Property<DateOnly?>(x, nameof(SafehouseMonthlyMetric.month_start)))
            })
            .ToListAsync();

        List<AdminReportsSafehousePerformanceDto> safehousePerformance;
        if (maxPerHouse.Count == 0)
        {
            safehousePerformance = [];
        }
        else
        {
            var maxWithMonth = maxPerHouse.Where(x => x.maxMonth.HasValue).ToList();
            if (maxWithMonth.Count == 0)
            {
                safehousePerformance = [];
            }
            else
            {
                var houseIds = maxWithMonth.Select(x => x.safehouse_id).Distinct().ToList();
                var maxDict = maxWithMonth.ToDictionary(x => x.safehouse_id, x => x.maxMonth!.Value);

                var projectedRows = await (
                    from m in dbContext.safehouse_monthly_metrics.AsNoTracking()
                    join s in dbContext.safehouses.AsNoTracking() on m.safehouse_id equals s.safehouse_id
                    where houseIds.Contains(m.safehouse_id)
                    select new
                    {
                        safehouse_id = s.safehouse_id,
                        safehouse_name = s.name,
                        month_start = EF.Property<DateOnly?>(m, nameof(SafehouseMonthlyMetric.month_start)),
                        active_residents = EF.Property<int?>(m, nameof(SafehouseMonthlyMetric.active_residents)) ?? 0,
                        avg_health_score = EF.Property<decimal?>(m, nameof(SafehouseMonthlyMetric.avg_health_score)) ?? 0m,
                        avg_education_progress = EF.Property<decimal?>(m, nameof(SafehouseMonthlyMetric.avg_education_progress)) ?? 0m,
                        process_recording_count = EF.Property<int?>(m, nameof(SafehouseMonthlyMetric.process_recording_count)) ?? 0
                    }).ToListAsync();

                safehousePerformance = projectedRows
                    .Where(x => maxDict.TryGetValue(x.safehouse_id, out var mm) && x.month_start == mm)
                    .Select(x => new AdminReportsSafehousePerformanceDto
                    {
                        safehouse_id = x.safehouse_id,
                        safehouse_name = x.safehouse_name,
                        metric_month = x.month_start!.Value,
                        active_residents = x.active_residents,
                        avg_health_score = x.avg_health_score,
                        avg_education_progress = x.avg_education_progress,
                        process_recording_count = x.process_recording_count
                    })
                    .OrderBy(x => x.safehouse_name)
                    .ToList();
            }
        }

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

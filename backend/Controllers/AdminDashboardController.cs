using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Services;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/admin/dashboard-metrics")]
public class AdminDashboardController(ApplicationDbContext dbContext, DonorMlPipelineService donorMlPipelineService) : ControllerBase
{
    private const int RecentDonationLimit = 5;
    private const int UpcomingConferenceLimit = 10;
    private const int UpcomingConferenceWindowDays = 7;

    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetDashboardMetrics()
    {
        var safehouses = await dbContext.safehouses
            .AsNoTracking()
            .Select(s => new { s.safehouse_id, s.name })
            .ToListAsync();

        var residents = await dbContext.residents
            .AsNoTracking()
            .Select(r => new { r.resident_id, r.safehouse_id, r.case_status, r.case_control_no, r.internal_code })
            .ToListAsync();

        var activeResidents = residents
            .Where(r => IsActiveCaseStatus(r.case_status))
            .ToList();

        var safehouseResidentBreakdown = safehouses
            .Select(s => new SafehouseResidentBreakdownDto
            {
                safehouse_id = s.safehouse_id,
                safehouse_name = s.name,
                active_residents_count = activeResidents.Count(r => r.safehouse_id == s.safehouse_id)
            })
            .OrderByDescending(r => r.active_residents_count)
            .ThenBy(r => r.safehouse_name)
            .ToList();

        var recentDonations = await dbContext.donations
            .AsNoTracking()
            .OrderByDescending(d => d.donation_date)
            .ThenByDescending(d => d.donation_id)
            .Take(RecentDonationLimit)
            .Join(
                dbContext.supporters.AsNoTracking(),
                donation => donation.supporter_id,
                supporter => supporter.supporter_id,
                (donation, supporter) => new RecentDonationDto
                {
                    donation_id = donation.donation_id,
                    donation_date = donation.donation_date,
                    estimated_value = donation.estimated_value,
                    donation_type = donation.donation_type,
                    supporter_name = supporter.display_name
                })
            .ToListAsync();

        var donationTotals = await dbContext.donations
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new
            {
                lifetime_amount = g.Sum(x => (decimal?)x.amount) ?? 0m,
                lifetime_estimated = g.Sum(x => (decimal?)x.estimated_value) ?? 0m
            })
            .FirstOrDefaultAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var last30DaysStart = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(-30));
        var conferenceWindowEnd = today.AddDays(UpcomingConferenceWindowDays);
        var donationLast30DaysTotals = await dbContext.donations
            .AsNoTracking()
            .Where(d => d.donation_date >= last30DaysStart)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                amount = g.Sum(x => (decimal?)x.amount) ?? 0m,
                estimated = g.Sum(x => (decimal?)x.estimated_value) ?? 0m
            })
            .FirstOrDefaultAsync();
        var upcomingCaseConferences = await dbContext.intervention_plans
            .AsNoTracking()
            .Where(p => p.case_conference_date.HasValue
                        && p.case_conference_date.Value >= today
                        && p.case_conference_date.Value <= conferenceWindowEnd)
            .OrderBy(p => p.case_conference_date)
            .ThenBy(p => p.plan_id)
            .Take(UpcomingConferenceLimit)
            .Join(
                dbContext.residents.AsNoTracking(),
                plan => plan.resident_id,
                resident => resident.resident_id,
                (plan, resident) => new
                {
                    plan,
                    resident
                })
            .Join(
                dbContext.safehouses.AsNoTracking(),
                planResident => planResident.resident.safehouse_id,
                safehouse => safehouse.safehouse_id,
                (planResident, safehouse) => new UpcomingCaseConferenceDto
                {
                    plan_id = planResident.plan.plan_id,
                    case_conference_date = planResident.plan.case_conference_date!.Value,
                    resident_id = planResident.plan.resident_id,
                    resident_case_code = !string.IsNullOrWhiteSpace(planResident.resident.case_control_no)
                        ? planResident.resident.case_control_no
                        : planResident.resident.internal_code,
                    safehouse_id = safehouse.safehouse_id,
                    safehouse_name = safehouse.name,
                    plan_status = planResident.plan.status
                })
            .ToListAsync();

        var processTotals = await dbContext.process_recordings
            .AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new ProgressSummaryDto
            {
                total_sessions = g.Count(),
                progress_noted_count = g.Count(x => x.progress_noted),
                concerns_flagged_count = g.Count(x => x.concerns_flagged)
            })
            .FirstOrDefaultAsync() ?? new ProgressSummaryDto();

        var progressRate = processTotals.total_sessions == 0
            ? 0m
            : Math.Round((decimal)processTotals.progress_noted_count / processTotals.total_sessions * 100m, 1);

        var response = new AdminDashboardMetricsDto
        {
            kpis = new AdminDashboardKpisDto
            {
                active_residents_total = activeResidents.Count,
                safehouse_count = safehouses.Count,
                recent_donations_count = recentDonations.Count,
                recent_donations_estimated_total = recentDonations.Sum(d => d.estimated_value),
                donations_lifetime_amount_total = donationTotals?.lifetime_amount ?? 0m,
                donations_lifetime_estimated_total = donationTotals?.lifetime_estimated ?? 0m,
                donations_last_30_days_amount_total = donationLast30DaysTotals?.amount ?? 0m,
                donations_last_30_days_estimated_total = donationLast30DaysTotals?.estimated ?? 0m,
                progress_noted_rate_percent = progressRate
            },
            safehouse_resident_breakdown = safehouseResidentBreakdown,
            recent_donations = recentDonations,
            upcoming_case_conferences = upcomingCaseConferences,
            progress_summary = processTotals,
            donor_ml = await donorMlPipelineService.GetLatestInsightsAsync() ?? new DonorMlInsightsResponseDto()
        };

        return Ok(response);
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

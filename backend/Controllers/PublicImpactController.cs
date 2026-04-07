using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/public-impact")]
public sealed class PublicImpactController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("summary")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicImpactSummaryDto>> GetSummary()
    {
        // EF Core DbContext is not thread-safe; don't run concurrent queries on the same instance.
        var safehouseCount = await dbContext.safehouses.AsNoTracking().CountAsync();
        var residentCount = await dbContext.residents.AsNoTracking().CountAsync();
        var donationCount = await dbContext.donations.AsNoTracking().CountAsync();
        var estimatedDonationTotal = await dbContext.donations.AsNoTracking()
            .SumAsync(d => (decimal?)d.estimated_value);

        return Ok(new PublicImpactSummaryDto
        {
            safehouse_count = safehouseCount,
            resident_count = residentCount,
            donation_count = donationCount,
            estimated_donation_total_php = estimatedDonationTotal ?? 0m
        });
    }

    [HttpGet("dashboard")]
    [AllowAnonymous]
    public async Task<ActionResult<PublicImpactDashboardDto>> GetDashboard()
    {
        var safehouseCount = await dbContext.safehouses.AsNoTracking().CountAsync();
        var residentCount = await dbContext.residents.AsNoTracking().CountAsync();

        var recordingsTotal = await dbContext.process_recordings.AsNoTracking().CountAsync();
        var recordingsProgressNoted = recordingsTotal == 0
            ? 0
            : await dbContext.process_recordings.AsNoTracking().CountAsync(r => r.progress_noted);
        var progressRate = recordingsTotal == 0 ? 0m : (decimal)recordingsProgressNoted / recordingsTotal;

        var successfulReintegrationCount = await dbContext.residents.AsNoTracking()
            .CountAsync(r => r.reintegration_status == "Completed");

        // AverageAsync throws if the table has no rows (common on a fresh prod DB). Guard explicitly.
        var avgHealthScore = await dbContext.health_wellbeing_records.AsNoTracking().AnyAsync()
            ? await dbContext.health_wellbeing_records.AsNoTracking().AverageAsync(r => r.general_health_score)
            : 0m;

        var avgEducationProgress = await dbContext.education_records.AsNoTracking().AnyAsync()
            ? await dbContext.education_records.AsNoTracking().AverageAsync(r => r.progress_percent)
            : 0m;

        var incidentTotal = await dbContext.incident_reports.AsNoTracking().CountAsync();
        var incidentResolved = incidentTotal == 0
            ? 0
            : await dbContext.incident_reports.AsNoTracking().CountAsync(i => i.resolved);
        var incidentResolvedRate = incidentTotal == 0 ? 0m : (decimal)incidentResolved / incidentTotal;

        var highSeverityIncidentCount = await dbContext.incident_reports.AsNoTracking()
            .CountAsync(i => i.severity == "High");

        var referralsMadeCount = await dbContext.process_recordings.AsNoTracking()
            .CountAsync(r => r.referral_made);

        var donationsTotalAmountPhp = await dbContext.donations.AsNoTracking()
            .Where(d => d.amount != null && d.currency_code == "PHP")
            .SumAsync(d => (decimal?)d.amount) ?? 0m;

        var donationsTotalEstimatedPhp = await dbContext.donations.AsNoTracking()
            .SumAsync(d => (decimal?)d.estimated_value) ?? 0m;

        var allocationsByProgramArea = await dbContext.donation_allocations.AsNoTracking()
            .GroupBy(a => a.program_area)
            .Select(g => new PublicImpactProgramAllocationDto
            {
                program_area = g.Key,
                amount_allocated = g.Sum(x => x.amount_allocated)
            })
            .OrderByDescending(x => x.amount_allocated)
            .ToListAsync();

        var trends = await dbContext.safehouse_monthly_metrics.AsNoTracking()
            .GroupBy(m => m.month_start)
            .Select(g => new PublicImpactTrendPointDto
            {
                month_start = g.Key,
                avg_health_score = g.Average(x => x.avg_health_score),
                avg_education_progress = g.Average(x => x.avg_education_progress),
                sessions_count = g.Sum(x => x.process_recording_count)
            })
            .OrderBy(x => x.month_start)
            .ToListAsync();

        return Ok(new PublicImpactDashboardDto
        {
            hero = new PublicImpactHeroDto
            {
                safehouse_count = safehouseCount,
                resident_count = residentCount,
                progress_rate = progressRate,
                successful_reintegration_count = successfulReintegrationCount
            },
            outcomes = new PublicImpactOutcomesDto
            {
                avg_health_score = avgHealthScore,
                avg_education_progress_percent = avgEducationProgress
            },
            safety = new PublicImpactSafetyDto
            {
                incident_count_total = incidentTotal,
                incident_resolved_rate = incidentResolvedRate,
                high_severity_incident_count = highSeverityIncidentCount,
                referrals_made_count = referralsMadeCount
            },
            donor_impact = new PublicImpactDonorImpactDto
            {
                donations_total_amount_php = donationsTotalAmountPhp,
                donations_total_estimated_php = donationsTotalEstimatedPhp,
                allocations_by_program_area = allocationsByProgramArea
            },
            trends = trends
        });
    }
}


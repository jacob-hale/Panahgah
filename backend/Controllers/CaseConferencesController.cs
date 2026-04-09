using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/case-conferences")]
public sealed class CaseConferencesController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("upcoming")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<ActionResult<IReadOnlyList<UpcomingCaseConferenceListItemDto>>> GetUpcoming(
        [FromQuery] int resident_id,
        [FromQuery] int days = 30,
        [FromQuery] int take = 25)
    {
        days = Math.Clamp(days, 1, 180);
        take = Math.Clamp(take, 1, 200);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var end = today.AddDays(days);

        var items = await dbContext.intervention_plans.AsNoTracking()
            .Where(p => p.resident_id == resident_id
                        && p.case_conference_date.HasValue
                        && p.case_conference_date.Value >= today
                        && p.case_conference_date.Value <= end)
            .OrderBy(p => p.case_conference_date)
            .ThenBy(p => p.plan_id)
            .Join(
                dbContext.residents.AsNoTracking(),
                plan => plan.resident_id,
                resident => resident.resident_id,
                (plan, resident) => new UpcomingCaseConferenceListItemDto
                {
                    plan_id = plan.plan_id,
                    case_conference_date = plan.case_conference_date!.Value,
                    resident_id = plan.resident_id,
                    resident_case_code = !string.IsNullOrWhiteSpace(resident.case_control_no)
                        ? resident.case_control_no
                        : resident.internal_code,
                    plan_status = plan.status
                })
            .Take(take)
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("history")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<ActionResult<IReadOnlyList<UpcomingCaseConferenceListItemDto>>> GetHistory(
        [FromQuery] int resident_id,
        [FromQuery] int take = 50)
    {
        take = Math.Clamp(take, 1, 200);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var items = await dbContext.intervention_plans.AsNoTracking()
            .Where(p => p.resident_id == resident_id
                        && p.case_conference_date.HasValue
                        && p.case_conference_date.Value < today)
            .OrderByDescending(p => p.case_conference_date)
            .ThenByDescending(p => p.plan_id)
            .Join(
                dbContext.residents.AsNoTracking(),
                plan => plan.resident_id,
                resident => resident.resident_id,
                (plan, resident) => new UpcomingCaseConferenceListItemDto
                {
                    plan_id = plan.plan_id,
                    case_conference_date = plan.case_conference_date!.Value,
                    resident_id = plan.resident_id,
                    resident_case_code = !string.IsNullOrWhiteSpace(resident.case_control_no)
                        ? resident.case_control_no
                        : resident.internal_code,
                    plan_status = plan.status
                })
            .Take(take)
            .ToListAsync();

        return Ok(items);
    }
}


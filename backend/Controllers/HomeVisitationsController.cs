using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/home-visitations")]
public sealed class HomeVisitationsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<ActionResult<IReadOnlyList<HomeVisitationListItemDto>>> GetRecent([FromQuery] int take = 100)
    {
        take = Math.Clamp(take, 1, 500);

        var items = await dbContext.home_visitations
            .AsNoTracking()
            .OrderByDescending(v => v.visit_date)
            .ThenByDescending(v => v.visitation_id)
            .Take(take)
            .Select(v => new HomeVisitationListItemDto
            {
                visitation_id = v.visitation_id,
                resident_id = v.resident_id,
                resident_case_control_no = v.resident.case_control_no,
                resident_internal_code = v.resident.internal_code,
                visit_date = v.visit_date,
                visit_type = v.visit_type,
                location_visited = v.location_visited,
                family_cooperation_level = v.family_cooperation_level,
                safety_concerns_noted = v.safety_concerns_noted,
                follow_up_needed = v.follow_up_needed,
                visit_outcome = v.visit_outcome,
                social_worker = v.social_worker
            })
            .ToListAsync();

        return Ok(items);
    }
}


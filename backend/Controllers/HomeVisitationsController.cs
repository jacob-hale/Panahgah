using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/home-visitations")]
public sealed class HomeVisitationsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<ActionResult<PagedResponseDto<HomeVisitationListItemDto>>> GetAll([FromQuery] HomeVisitationsQueryDto query)
    {
        var q = dbContext.home_visitations.AsNoTracking().AsQueryable();

        if (query.resident_id.HasValue)
        {
            q = q.Where(v => v.resident_id == query.resident_id.Value);
        }

        var sortOrder = (query.sort_order ?? "desc").Trim().ToLowerInvariant();
        var asc = sortOrder == "asc";
        q = asc
            ? q.OrderBy(v => v.visit_date).ThenBy(v => v.visitation_id)
            : q.OrderByDescending(v => v.visit_date).ThenByDescending(v => v.visitation_id);

        var page = query.page <= 0 ? 1 : query.page;
        var pageSize = query.page_size < 0 ? 10 : query.page_size;
        pageSize = pageSize == 0 ? 0 : Math.Clamp(pageSize, 1, 200);

        var totalRecords = await q.CountAsync();
        if (pageSize == 0)
        {
            var all = await ProjectToListItemDtos(q)
                .ToListAsync();

            return Ok(new PagedResponseDto<HomeVisitationListItemDto>
            {
                items = all,
                total_records = totalRecords,
                total_pages = totalRecords == 0 ? 1 : 1,
                current_page = 1,
                page_size = 0
            });
        }

        var totalPages = totalRecords == 0 ? 1 : (int)Math.Ceiling(totalRecords / (double)pageSize);
        if (page > totalPages)
        {
            page = totalPages;
        }

        var items = await ProjectToListItemDtos(q)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResponseDto<HomeVisitationListItemDto>
        {
            items = items,
            total_records = totalRecords,
            total_pages = totalPages,
            current_page = page,
            page_size = pageSize
        });
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Create([FromBody] HomeVisitationLogDto request)
    {
        var visitType = request.visit_type.Trim();
        if (!HomeVisitationCatalog.IsAllowedVisitType(visitType))
        {
            return BadRequest("Invalid visit_type.");
        }

        var homeEnv = request.home_environment_observation.Trim();
        if (!HomeVisitationCatalog.IsAllowedHomeEnvironmentObservation(homeEnv))
        {
            return BadRequest("Invalid home_environment_observation.");
        }

        var coop = request.family_cooperation_level.Trim();
        if (!HomeVisitationCatalog.IsAllowedFamilyCooperationLevel(coop))
        {
            return BadRequest("Invalid family_cooperation_level.");
        }

        const string homeOther = "Other (describe below)";

        var homeOtherText = request.home_environment_other?.Trim() ?? string.Empty;
        if (homeEnv.Equals(homeOther, StringComparison.Ordinal))
        {
            if (homeOtherText.Length < 3)
            {
                return BadRequest("home_environment_other is required when home_environment_observation is Other.");
            }
        }

        var residentExists = await dbContext.residents.AsNoTracking()
            .AnyAsync(r => r.resident_id == request.resident_id);
        if (!residentExists)
        {
            return NotFound("Resident not found.");
        }

        var observationsParts = new List<string> { $"Home environment: {homeEnv}" };
        if (homeEnv.Equals(homeOther, StringComparison.Ordinal))
        {
            observationsParts.Add(homeOtherText);
        }

        var additional = request.observations_additional?.Trim() ?? string.Empty;
        if (additional.Length > 0)
        {
            observationsParts.Add($"Additional notes: {additional}");
        }

        var observations = string.Join("\n\n", observationsParts);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var visitation = new HomeVisitation
        {
            resident_id = request.resident_id,
            visit_date = today,
            social_worker = HomeVisitationCatalog.DefaultSocialWorker,
            visit_type = visitType,
            location_visited = HomeVisitationCatalog.DefaultLocationVisited,
            family_members_present = string.Empty,
            purpose = HomeVisitationCatalog.DefaultPurpose,
            observations = observations,
            family_cooperation_level = coop,
            safety_concerns_noted = request.safety_concerns_noted,
            follow_up_needed = request.follow_up_needed,
            follow_up_notes = null,
            visit_outcome = HomeVisitationCatalog.DefaultVisitOutcome
        };

        dbContext.home_visitations.Add(visitation);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    private static IQueryable<HomeVisitationListItemDto> ProjectToListItemDtos(IQueryable<HomeVisitation> q) =>
        q.Select(v => new HomeVisitationListItemDto
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
        });
}

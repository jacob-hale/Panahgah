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
    public async Task<IActionResult> Create([FromBody] HomeVisitationUpsertDto request)
    {
        var visitType = request.visit_type.Trim();
        if (!HomeVisitationCatalog.IsAllowedVisitType(visitType))
        {
            return BadRequest("Invalid visit_type.");
        }

        var visitation = new HomeVisitation
        {
            resident_id = request.resident_id,
            visit_date = request.visit_date,
            social_worker = request.social_worker.Trim(),
            visit_type = visitType,
            location_visited = request.location_visited.Trim(),
            family_members_present = request.family_members_present.Trim(),
            purpose = request.purpose.Trim(),
            observations = request.observations.Trim(),
            family_cooperation_level = request.family_cooperation_level.Trim(),
            safety_concerns_noted = request.safety_concerns_noted,
            follow_up_needed = request.follow_up_needed,
            follow_up_notes = string.IsNullOrWhiteSpace(request.follow_up_notes) ? null : request.follow_up_notes.Trim(),
            visit_outcome = request.visit_outcome.Trim()
        };

        dbContext.home_visitations.Add(visitation);
        await dbContext.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), new { resident_id = visitation.resident_id }, null);
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


using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;
using System.Text.Json;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/supporters")]
public class SupportersController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("me")]
    [Authorize(Policy = AuthPolicies.RequireDonorOrAdmin)]
    public async Task<IActionResult> GetMyProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var supporter = await dbContext.supporters.AsNoTracking()
            .FirstOrDefaultAsync(s => s.identity_user_id == userId);
        return supporter is null ? NotFound() : Ok(supporter);
    }

    [HttpPut("me")]
    [Authorize(Policy = AuthPolicies.RequireDonorOrAdmin)]
    public async Task<IActionResult> UpdateMyProfile([FromBody] SupporterSelfUpdateDto request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var supporter = await dbContext.supporters.FirstOrDefaultAsync(s => s.identity_user_id == userId);
        if (supporter is null)
        {
            return NotFound("No supporter profile is linked to this account.");
        }

        var normalizedInterests = ContributionInterestCatalog.Normalize(request.contribution_interests);
        var interestsJson = normalizedInterests.Length > 0 ? JsonSerializer.Serialize(normalizedInterests) : null;

        supporter.display_name = request.display_name.Trim();
        supporter.first_name = request.first_name?.Trim();
        supporter.last_name = request.last_name?.Trim();
        supporter.phone = request.phone?.Trim() ?? string.Empty;
        supporter.supporter_type = request.supporter_type.Trim();
        supporter.region = request.region?.Trim() ?? string.Empty;
        supporter.country = request.country?.Trim() ?? string.Empty;
        supporter.contribution_interests = interestsJson;

        await dbContext.SaveChangesAsync();
        return Ok(supporter);
    }

    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetAll([FromQuery] SupportersQueryDto query)
    {
        var q = dbContext.supporters.AsNoTracking().OrderByDescending(s => s.created_at);

        var totalRecords = await q.CountAsync();

        var pageSize = query.page_size < 0 ? 10 : query.page_size;
        if (pageSize == 0)
        {
            var all = await q.ToListAsync();
            return Ok(new PagedResponseDto<Supporter>
            {
                items = all,
                total_records = totalRecords,
                total_pages = 1,
                current_page = 1,
                page_size = 0
            });
        }

        if (pageSize < 1)
        {
            pageSize = 10;
        }

        if (pageSize > 500)
        {
            pageSize = 500;
        }

        var totalPages = (int)Math.Ceiling(totalRecords / (double)pageSize);
        if (totalPages <= 0)
        {
            totalPages = 1;
        }

        var currentPage = query.page < 1 ? 1 : query.page;
        if (currentPage > totalPages)
        {
            currentPage = totalPages;
        }

        var items = await q
            .Skip((currentPage - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new PagedResponseDto<Supporter>
        {
            items = items,
            total_records = totalRecords,
            total_pages = totalPages,
            current_page = currentPage,
            page_size = pageSize
        });
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetById(int id)
    {
        var supporter = await dbContext.supporters.AsNoTracking().FirstOrDefaultAsync(s => s.supporter_id == id);
        return supporter is null ? NotFound() : Ok(supporter);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Create([FromBody] SupporterUpsertDto request)
    {
        var supporter = new Supporter
        {
            supporter_type = request.supporter_type.Trim(),
            display_name = request.display_name.Trim(),
            organization_name = request.organization_name?.Trim(),
            first_name = request.first_name?.Trim(),
            last_name = request.last_name?.Trim(),
            relationship_type = request.relationship_type.Trim(),
            region = request.region.Trim(),
            country = request.country.Trim(),
            email = request.email.Trim().ToLowerInvariant(),
            phone = request.phone.Trim(),
            status = request.status.Trim(),
            acquisition_channel = string.IsNullOrWhiteSpace(request.acquisition_channel)
                ? "staff_created"
                : request.acquisition_channel.Trim(),
            contribution_interests = request.contribution_interests?.Trim(),
            created_at = DateTime.UtcNow
        };

        dbContext.supporters.Add(supporter);
        await dbContext.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = supporter.supporter_id }, supporter);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Update(int id, [FromBody] SupporterUpsertDto request)
    {
        var supporter = await dbContext.supporters.FirstOrDefaultAsync(s => s.supporter_id == id);
        if (supporter is null)
        {
            return NotFound();
        }

        supporter.supporter_type = request.supporter_type.Trim();
        supporter.display_name = request.display_name.Trim();
        supporter.organization_name = request.organization_name?.Trim();
        supporter.first_name = request.first_name?.Trim();
        supporter.last_name = request.last_name?.Trim();
        supporter.relationship_type = request.relationship_type.Trim();
        supporter.region = request.region.Trim();
        supporter.country = request.country.Trim();
        supporter.email = request.email.Trim().ToLowerInvariant();
        supporter.phone = request.phone.Trim();
        supporter.status = request.status.Trim();
        if (!string.IsNullOrWhiteSpace(request.acquisition_channel))
        {
            supporter.acquisition_channel = request.acquisition_channel.Trim();
        }

        supporter.contribution_interests = request.contribution_interests?.Trim();

        await dbContext.SaveChangesAsync();
        return Ok(supporter);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmationRequestDto request)
    {
        if (!request.ConfirmDelete)
        {
            return BadRequest("ConfirmDelete must be true.");
        }

        var supporter = await dbContext.supporters.FirstOrDefaultAsync(s => s.supporter_id == id);
        if (supporter is null)
        {
            return NotFound();
        }

        dbContext.supporters.Remove(supporter);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }
}

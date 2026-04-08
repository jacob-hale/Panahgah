using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/donation-allocations")]
public class DonationAllocationsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> List([FromQuery] int? donationId)
    {
        var query = dbContext.donation_allocations.AsNoTracking().AsQueryable();
        if (donationId is int d)
        {
            query = query.Where(a => a.donation_id == d);
        }

        var list = await query.OrderByDescending(a => a.allocation_date).ToListAsync();
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetById(int id)
    {
        var row = await dbContext.donation_allocations.AsNoTracking().FirstOrDefaultAsync(a => a.allocation_id == id);
        return row is null ? NotFound() : Ok(row);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Create([FromBody] DonationAllocationCreateDto request)
    {
        var donationExists = await dbContext.donations.AnyAsync(d => d.donation_id == request.donation_id);
        if (!donationExists)
        {
            return BadRequest("Donation not found.");
        }

        var safehouseExists = await dbContext.safehouses.AnyAsync(s => s.safehouse_id == request.safehouse_id);
        if (!safehouseExists)
        {
            return BadRequest("Safehouse not found.");
        }

        var allocation = new DonationAllocation
        {
            donation_id = request.donation_id,
            safehouse_id = request.safehouse_id,
            program_area = request.program_area.Trim(),
            amount_allocated = request.amount_allocated,
            allocation_date = request.allocation_date,
            allocation_notes = request.allocation_notes.Trim()
        };

        dbContext.donation_allocations.Add(allocation);
        await dbContext.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = allocation.allocation_id }, allocation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Update(int id, [FromBody] DonationAllocationUpdateDto request)
    {
        var allocation = await dbContext.donation_allocations.FirstOrDefaultAsync(a => a.allocation_id == id);
        if (allocation is null)
        {
            return NotFound();
        }

        var safehouseExists = await dbContext.safehouses.AnyAsync(s => s.safehouse_id == request.safehouse_id);
        if (!safehouseExists)
        {
            return BadRequest("Safehouse not found.");
        }

        allocation.safehouse_id = request.safehouse_id;
        allocation.program_area = request.program_area.Trim();
        allocation.amount_allocated = request.amount_allocated;
        allocation.allocation_date = request.allocation_date;
        allocation.allocation_notes = request.allocation_notes.Trim();

        await dbContext.SaveChangesAsync();
        return Ok(allocation);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmationRequestDto request)
    {
        if (!request.ConfirmDelete)
        {
            return BadRequest("ConfirmDelete must be true.");
        }

        var allocation = await dbContext.donation_allocations.FirstOrDefaultAsync(a => a.allocation_id == id);
        if (allocation is null)
        {
            return NotFound();
        }

        dbContext.donation_allocations.Remove(allocation);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }
}

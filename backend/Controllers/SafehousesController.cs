using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/safehouses")]
public class SafehousesController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireDonorOrAdmin)]
    public async Task<IActionResult> GetAll()
    {
        var safehouses = await dbContext.safehouses.AsNoTracking().ToListAsync();
        return Ok(safehouses);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireDonorOrAdmin)]
    public async Task<IActionResult> GetById(int id)
    {
        var safehouse = await dbContext.safehouses.AsNoTracking().FirstOrDefaultAsync(s => s.safehouse_id == id);
        return safehouse is null ? NotFound() : Ok(safehouse);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Create([FromBody] SafehouseUpsertDto request)
    {
        var safehouse = new Safehouse
        {
            safehouse_code = request.safehouse_code.Trim(),
            name = request.name.Trim(),
            region = request.region.Trim(),
            city = request.city.Trim(),
            province = request.province.Trim(),
            country = request.country.Trim(),
            open_date = request.open_date,
            status = request.status.Trim(),
            capacity_girls = request.capacity_girls,
            capacity_staff = request.capacity_staff,
            current_occupancy = request.current_occupancy,
            notes = request.notes.Trim()
        };

        dbContext.safehouses.Add(safehouse);
        await dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = safehouse.safehouse_id }, safehouse);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Update(int id, [FromBody] SafehouseUpsertDto request)
    {
        var safehouse = await dbContext.safehouses.FirstOrDefaultAsync(s => s.safehouse_id == id);
        if (safehouse is null)
        {
            return NotFound();
        }

        safehouse.safehouse_code = request.safehouse_code.Trim();
        safehouse.name = request.name.Trim();
        safehouse.region = request.region.Trim();
        safehouse.city = request.city.Trim();
        safehouse.province = request.province.Trim();
        safehouse.country = request.country.Trim();
        safehouse.open_date = request.open_date;
        safehouse.status = request.status.Trim();
        safehouse.capacity_girls = request.capacity_girls;
        safehouse.capacity_staff = request.capacity_staff;
        safehouse.current_occupancy = request.current_occupancy;
        safehouse.notes = request.notes.Trim();

        await dbContext.SaveChangesAsync();
        return Ok(safehouse);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmationRequestDto request)
    {
        if (!request.ConfirmDelete)
        {
            return BadRequest("ConfirmDelete must be true.");
        }

        var safehouse = await dbContext.safehouses.FirstOrDefaultAsync(s => s.safehouse_id == id);
        if (safehouse is null)
        {
            return NotFound();
        }

        dbContext.safehouses.Remove(safehouse);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }
}

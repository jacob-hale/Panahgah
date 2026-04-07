using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/donations")]
public class DonationsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetAll()
    {
        var donations = await dbContext.donations
            .AsNoTracking()
            .Include(d => d.donation_allocations)
            .OrderByDescending(d => d.donation_date)
            .ToListAsync();
        return Ok(donations);
    }

    [HttpGet("mine")]
    [Authorize(Policy = AuthPolicies.RequireDonor)]
    public async Task<IActionResult> GetMine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var supporter = await dbContext.supporters.AsNoTracking()
            .FirstOrDefaultAsync(s => s.identity_user_id == userId);
        if (supporter is null)
        {
            return Ok(Array.Empty<Donation>());
        }

        var donations = await dbContext.donations
            .AsNoTracking()
            .Include(d => d.donation_allocations)
            .Where(d => d.supporter_id == supporter.supporter_id)
            .OrderByDescending(d => d.donation_date)
            .ToListAsync();
        return Ok(donations);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireDonorOrAdmin)]
    public async Task<IActionResult> GetById(int id)
    {
        var donation = await dbContext.donations
            .AsNoTracking()
            .Include(d => d.donation_allocations)
            .FirstOrDefaultAsync(d => d.donation_id == id);
        if (donation is null)
        {
            return NotFound();
        }

        if (!User.IsInRole(AuthRoles.Admin))
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Forbid();
            }

            var supporter = await dbContext.supporters.AsNoTracking()
                .FirstOrDefaultAsync(s => s.identity_user_id == userId);
            if (supporter is null || supporter.supporter_id != donation.supporter_id)
            {
                return Forbid();
            }
        }

        return Ok(donation);
    }

    [HttpPost]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Create([FromBody] DonationUpsertDto request)
    {
        var donation = new Donation
        {
            supporter_id = request.supporter_id,
            donation_type = request.donation_type.Trim(),
            donation_date = request.donation_date,
            channel_source = request.channel_source.Trim(),
            currency_code = request.currency_code?.Trim(),
            amount = request.amount,
            estimated_value = request.estimated_value,
            impact_unit = request.impact_unit.Trim(),
            is_recurring = request.is_recurring,
            campaign_name = request.campaign_name?.Trim(),
            notes = request.notes.Trim(),
            created_by_partner_id = request.created_by_partner_id,
            referral_post_id = request.referral_post_id
        };

        dbContext.donations.Add(donation);
        await dbContext.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = donation.donation_id }, donation);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Update(int id, [FromBody] DonationUpsertDto request)
    {
        var donation = await dbContext.donations.FirstOrDefaultAsync(d => d.donation_id == id);
        if (donation is null)
        {
            return NotFound();
        }

        donation.supporter_id = request.supporter_id;
        donation.donation_type = request.donation_type.Trim();
        donation.donation_date = request.donation_date;
        donation.channel_source = request.channel_source.Trim();
        donation.currency_code = request.currency_code?.Trim();
        donation.amount = request.amount;
        donation.estimated_value = request.estimated_value;
        donation.impact_unit = request.impact_unit.Trim();
        donation.is_recurring = request.is_recurring;
        donation.campaign_name = request.campaign_name?.Trim();
        donation.notes = request.notes.Trim();
        donation.created_by_partner_id = request.created_by_partner_id;
        donation.referral_post_id = request.referral_post_id;

        await dbContext.SaveChangesAsync();
        return Ok(donation);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> Delete(int id, [FromBody] DeleteConfirmationRequestDto request)
    {
        if (!request.ConfirmDelete)
        {
            return BadRequest("ConfirmDelete must be true.");
        }

        var donation = await dbContext.donations.FirstOrDefaultAsync(d => d.donation_id == id);
        if (donation is null)
        {
            return NotFound();
        }

        dbContext.donations.Remove(donation);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }
}

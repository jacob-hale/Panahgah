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
}


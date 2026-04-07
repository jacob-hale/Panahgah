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
        var safehouseCountTask = dbContext.safehouses.AsNoTracking().CountAsync();
        var residentCountTask = dbContext.residents.AsNoTracking().CountAsync();
        var donationCountTask = dbContext.donations.AsNoTracking().CountAsync();
        var estimatedDonationTotalTask = dbContext.donations.AsNoTracking()
            .SumAsync(d => (decimal?)d.estimated_value);

        await Task.WhenAll(safehouseCountTask, residentCountTask, donationCountTask, estimatedDonationTotalTask);

        return Ok(new PublicImpactSummaryDto
        {
            safehouse_count = safehouseCountTask.Result,
            resident_count = residentCountTask.Result,
            donation_count = donationCountTask.Result,
            estimated_donation_total_php = estimatedDonationTotalTask.Result ?? 0m
        });
    }
}


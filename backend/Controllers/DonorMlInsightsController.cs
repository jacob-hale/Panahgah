using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Panahgah.Api.Auth;
using Panahgah.Api.Data;
using Panahgah.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/ml/donor")]
[Authorize(Policy = AuthPolicies.RequireAdmin)]
public class DonorMlInsightsController(
    DonorMlPipelineService donorMlPipelineService,
    ApplicationDbContext dbContext) : ControllerBase
{
    private sealed class SupporterContactDto
    {
        public string? display_name { get; set; }
        public string? email { get; set; }
        public string? phone { get; set; }
    }

    [HttpPost("train")]
    public async Task<IActionResult> Train(CancellationToken cancellationToken)
    {
        try
        {
            var result = await donorMlPipelineService.TrainAsync("manual", cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Problem($"Donor model training failed: {ex.Message}", statusCode: 500);
        }
    }

    [HttpGet("insights")]
    public async Task<IActionResult> GetInsights(CancellationToken cancellationToken)
    {
        var result = await donorMlPipelineService.GetLatestInsightsAsync(cancellationToken);
        if (result is null)
        {
            return Ok(new Contracts.DonorMlInsightsResponseDto());
        }

        var supporterIds = result.donor_lapse.top_donors
            .Concat(result.donor_upgrade.top_donors)
            .Select(d => d.supporter_id)
            .Distinct()
            .ToList();

        var supporterLookup = await dbContext.supporters
            .AsNoTracking()
            .Where(s => supporterIds.Contains(s.supporter_id))
            .Select(s => new
            {
                s.supporter_id,
                s.display_name,
                s.email,
                s.phone
            })
            .ToDictionaryAsync(
                s => s.supporter_id,
                s => new SupporterContactDto
                {
                    display_name = s.display_name,
                    email = s.email,
                    phone = s.phone
                },
                cancellationToken);

        static void EnrichRows(IEnumerable<Contracts.DonorMlDonorRowDto> rows, IReadOnlyDictionary<int, SupporterContactDto> lookup)
        {
            foreach (var row in rows)
            {
                if (lookup.TryGetValue(row.supporter_id, out var supporter))
                {
                    row.supporter_name = string.IsNullOrWhiteSpace(supporter.display_name) ? null : supporter.display_name;
                    row.supporter_email = string.IsNullOrWhiteSpace(supporter.email) ? null : supporter.email;
                    row.supporter_phone = string.IsNullOrWhiteSpace(supporter.phone) ? null : supporter.phone;
                }
            }
        }

        EnrichRows(result.donor_lapse.top_donors, supporterLookup);
        EnrichRows(result.donor_upgrade.top_donors, supporterLookup);

        return Ok(result);
    }
}

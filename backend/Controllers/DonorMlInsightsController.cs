using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Panahgah.Api.Auth;
using Panahgah.Api.Services;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/ml/donor")]
[Authorize(Policy = AuthPolicies.RequireAdmin)]
public class DonorMlInsightsController(DonorMlPipelineService donorMlPipelineService) : ControllerBase
{
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

        return Ok(result);
    }
}

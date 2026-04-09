using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Services;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/ml/girls-reintegration")]
[Authorize(Policy = AuthPolicies.RequireAdmin)]
public sealed class GirlsReintegrationInsightsController(
    GirlsReintegrationMlPipelineService pipelineService) : ControllerBase
{
    [HttpPost("train")]
    public async Task<IActionResult> Train(CancellationToken cancellationToken)
    {
        try
        {
            var result = await pipelineService.TrainAsync("manual", cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Problem($"Girls reintegration model training failed: {ex.Message}", statusCode: 500);
        }
    }

    [HttpGet("insights")]
    public async Task<IActionResult> GetInsights(CancellationToken cancellationToken)
    {
        var result = await pipelineService.GetLatestInsightsAsync(cancellationToken);
        if (result is null)
        {
            return Ok(new GirlsReintegrationInsightsResponseDto());
        }

        return Ok(result);
    }
}

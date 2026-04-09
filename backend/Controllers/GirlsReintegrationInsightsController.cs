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
        catch (GirlsReintegrationTrainingException ex)
        {
            var body = new GirlsReintegrationTrainErrorDto
            {
                error = ex.Message,
                code = ex.Code,
                hint = ex.Hint
            };

            if (ex.Code == "python_training_failed")
            {
                return StatusCode(StatusCodes.Status500InternalServerError, body);
            }

            return BadRequest(body);
        }
        catch (FileNotFoundException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new GirlsReintegrationTrainErrorDto
            {
                error = ex.Message,
                code = "trainer_script_missing",
                hint = "Confirm backend/ML/girls_reintegration_train.py is published with the API (see Dockerfile / csproj Content)."
            });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new GirlsReintegrationTrainErrorDto
            {
                error = ex.Message,
                code = "unexpected",
                hint = "Check Railway logs for the full stack trace (database access, serialization, or process spawn)."
            });
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

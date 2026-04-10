using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Services;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/ml/model5")]
[Authorize(Policy = AuthPolicies.RequireAdmin)]
public class Model5InsightsController(
    ApplicationDbContext dbContext,
    IWebHostEnvironment environment,
    IConfiguration configuration,
    ISocialPostGenerator socialPostGenerator) : ControllerBase
{
    [HttpPost("train")]
    public async Task<IActionResult> TrainFromDatabase()
    {
        try
        {
            var posts = await dbContext.social_media_posts
                .AsNoTracking()
                .Select(p => new
                {
                    p.platform,
                    p.day_of_week,
                    p.post_hour,
                    p.post_type,
                    p.media_type,
                    p.num_hashtags,
                    p.mentions_count,
                    p.has_call_to_action,
                    p.call_to_action_type,
                    p.content_topic,
                    p.sentiment_tone,
                    p.caption_length,
                    p.features_resident_story,
                    p.campaign_name,
                    p.is_boosted,
                    p.boost_budget_php,
                    p.donation_referrals,
                    p.created_at
                })
                .ToListAsync();

            if (posts.Count < 30)
            {
                return BadRequest("Need at least 30 social media posts to train Model 5.");
            }

            var contentRoot = environment.ContentRootPath;
            var defaultTrainScriptPath = Path.Combine(contentRoot, "ML", "model_5_train.py");
            var defaultArtifactsDir = Path.Combine(contentRoot, "ML", "artifacts");

            var pythonExecutable = ResolvePythonExecutable();
            var trainScriptPath = configuration["Ml:Model5TrainScriptPath"] ?? defaultTrainScriptPath;
            var artifactsDir = configuration["Ml:Model5ArtifactsDir"] ?? defaultArtifactsDir;

            if (!System.IO.File.Exists(trainScriptPath))
            {
                return Problem($"Model 5 train script not found: {trainScriptPath}", statusCode: 500);
            }

            var inputJson = JsonSerializer.Serialize(new { posts });
            var startInfo = new ProcessStartInfo
            {
                FileName = pythonExecutable,
                Arguments = $"\"{trainScriptPath}\" --artifacts-dir \"{artifactsDir}\"",
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = startInfo };
            process.Start();

            await process.StandardInput.WriteAsync(inputJson);
            process.StandardInput.Close();

            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var stderrTask = process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            if (process.ExitCode != 0)
            {
                return Problem($"Model 5 training failed: {stderr}", statusCode: 500);
            }

            return Content(stdout, "application/json", Encoding.UTF8);
        }
        catch (Exception ex)
        {
            return Problem($"Model 5 training failed before execution: {ex.Message}", statusCode: 500);
        }
    }

    [HttpGet("insights")]
    public async Task<IActionResult> GetInsights()
    {
        var insightsResult = await TryScoreInsightsAsync();
        if (insightsResult is null)
        {
            return Ok(new Model5InsightsResponseDto());
        }

        var resolvedInsights = insightsResult.Value;
        if (!resolvedInsights.isSuccess)
        {
            return Problem(resolvedInsights.errorMessage, statusCode: 500);
        }

        return Ok(resolvedInsights.data);
    }

    [HttpPost("generate-post")]
    public async Task<IActionResult> GeneratePost([FromBody] SocialPostGenerateRequestDto request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.platform) ||
            string.IsNullOrWhiteSpace(request.goal) ||
            string.IsNullOrWhiteSpace(request.post_type) ||
            string.IsNullOrWhiteSpace(request.post_topic) ||
            string.IsNullOrWhiteSpace(request.tone))
        {
            return BadRequest("platform, goal, post_type, post_topic, and tone are required.");
        }

        var insightsResult = await TryScoreInsightsAsync();
        if (insightsResult is null)
        {
            return BadRequest("No social media posts were found to derive recommendations.");
        }

        var resolvedInsights = insightsResult.Value;
        if (!resolvedInsights.isSuccess || resolvedInsights.data is null)
        {
            return Problem(resolvedInsights.errorMessage, statusCode: 500);
        }

        try
        {
            var generated = await socialPostGenerator.GenerateAsync(request, resolvedInsights.data, cancellationToken);
            return Ok(generated);
        }
        catch (Exception ex)
        {
            return Problem($"Social post generation failed: {ex.Message}", statusCode: 500);
        }
    }

    private async Task<(bool isSuccess, string? errorMessage, Model5InsightsResponseDto? data)?> TryScoreInsightsAsync()
    {
        var posts = await dbContext.social_media_posts
            .AsNoTracking()
            .Select(p => new
            {
                p.platform,
                p.day_of_week,
                p.post_hour,
                p.post_type,
                p.media_type,
                p.num_hashtags,
                p.mentions_count,
                p.has_call_to_action,
                p.call_to_action_type,
                p.content_topic,
                p.sentiment_tone,
                p.caption_length,
                p.features_resident_story,
                p.campaign_name,
                p.is_boosted,
                p.boost_budget_php
            })
            .ToListAsync();

        if (posts.Count == 0)
        {
            return null;
        }

        var contentRoot = environment.ContentRootPath;
        var defaultScriptPath = Path.Combine(contentRoot, "ML", "model_5_score.py");
        var defaultModelPath = Path.Combine(contentRoot, "ML", "artifacts", "model5_predictive.joblib");
        var pythonExecutable = ResolvePythonExecutable();
        var scriptPath = configuration["Ml:Model5ScriptPath"] ?? defaultScriptPath;
        var modelPath = configuration["Ml:Model5ModelPath"] ?? defaultModelPath;

        if (!System.IO.File.Exists(scriptPath))
        {
            return (false, $"Model 5 scoring script not found: {scriptPath}", null);
        }

        if (!System.IO.File.Exists(modelPath))
        {
            return (false, $"Model 5 model artifact not found: {modelPath}", null);
        }

        var inputJson = JsonSerializer.Serialize(new { posts });
        var startInfo = new ProcessStartInfo
        {
            FileName = pythonExecutable,
            Arguments = $"\"{scriptPath}\" --model-path \"{modelPath}\"",
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = startInfo };
        process.Start();

        await process.StandardInput.WriteAsync(inputJson);
        process.StandardInput.Close();

        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            return (false, $"Model 5 scoring failed: {stderr}", null);
        }

        try
        {
            var result = JsonSerializer.Deserialize<Model5InsightsResponseDto>(stdout);
            if (result is null)
            {
                return (false, "Model 5 scorer returned empty payload.", null);
            }

            return (true, null, result);
        }
        catch (JsonException)
        {
            var preview = stdout.Length > 500 ? stdout[..500] : stdout;
            return (false, $"Model 5 scorer returned invalid JSON: {preview}", null);
        }
    }

    private string ResolvePythonExecutable()
    {
        var configured = configuration["Ml:PythonExecutable"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured;
        }

        return OperatingSystem.IsWindows() ? "python" : "/opt/venv/bin/python";
    }
}

using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/ml/model5")]
[Authorize(Policy = AuthPolicies.RequireAdmin)]
public class Model5InsightsController(ApplicationDbContext dbContext, IWebHostEnvironment environment, IConfiguration configuration) : ControllerBase
{
    [HttpGet("insights")]
    public async Task<IActionResult> GetInsights()
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
            return Ok(new Model5InsightsResponseDto());
        }

        var contentRoot = environment.ContentRootPath;
        var defaultScriptPath = Path.GetFullPath(Path.Combine(contentRoot, "..", "ML Pipelines", "model_5_score.py"));
        var defaultModelPath = Path.GetFullPath(Path.Combine(contentRoot, "..", "ML Pipelines", "artifacts", "model5_predictive.joblib"));

        var pythonExecutable = configuration["Ml:PythonExecutable"] ?? "python";
        var scriptPath = configuration["Ml:Model5ScriptPath"] ?? defaultScriptPath;
        var modelPath = configuration["Ml:Model5ModelPath"] ?? defaultModelPath;

        if (!System.IO.File.Exists(scriptPath))
        {
            return Problem($"Model 5 scoring script not found: {scriptPath}", statusCode: 500);
        }

        if (!System.IO.File.Exists(modelPath))
        {
            return Problem($"Model 5 model artifact not found: {modelPath}", statusCode: 500);
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
            return Problem($"Model 5 scoring failed: {stderr}", statusCode: 500);
        }

        try
        {
            var result = JsonSerializer.Deserialize<Model5InsightsResponseDto>(stdout);
            if (result is null)
            {
                return Problem("Model 5 scorer returned empty payload.", statusCode: 500);
            }

            return Ok(result);
        }
        catch (JsonException)
        {
            var preview = stdout.Length > 500 ? stdout[..500] : stdout;
            return Problem($"Model 5 scorer returned invalid JSON: {preview}", statusCode: 500);
        }
    }
}

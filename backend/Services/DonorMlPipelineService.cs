using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;

namespace Panahgah.Api.Services;

public sealed class DonorMlPipelineService(
    IServiceScopeFactory scopeFactory,
    IWebHostEnvironment environment,
    IConfiguration configuration)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly SemaphoreSlim _runLock = new(1, 1);

    public async Task<DonorMlInsightsResponseDto?> GetLatestInsightsAsync(CancellationToken cancellationToken = default)
    {
        var latestPath = GetLatestInsightsPath();
        if (!File.Exists(latestPath))
        {
            return null;
        }

        var json = await File.ReadAllTextAsync(latestPath, cancellationToken);
        return JsonSerializer.Deserialize<DonorMlInsightsResponseDto>(json, JsonOptions);
    }

    public async Task<DonorMlInsightsResponseDto> TrainAsync(string initiatedBy, CancellationToken cancellationToken = default)
    {
        await _runLock.WaitAsync(cancellationToken);
        try
        {
            using var scope = scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var donations = await dbContext.donations.AsNoTracking().Select(d => new
            {
                d.supporter_id,
                d.donation_date,
                d.estimated_value,
                d.is_recurring,
                d.donation_type,
                d.channel_source,
                d.amount
            }).ToListAsync(cancellationToken);

            var supporters = await dbContext.supporters.AsNoTracking().Select(s => new
            {
                s.supporter_id,
                s.supporter_type,
                s.relationship_type,
                s.region,
                s.country,
                s.acquisition_channel
            }).ToListAsync(cancellationToken);

            var payload = JsonSerializer.Serialize(new
            {
                donations,
                supporters,
                initiated_by = initiatedBy
            }, JsonOptions);

            var startInfo = new ProcessStartInfo
            {
                FileName = configuration["Ml:PythonExecutable"] ?? "/opt/venv/bin/python",
                Arguments = $"\"{GetTrainScriptPath()}\" --artifacts-dir \"{GetArtifactsDir()}\"",
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = startInfo };
            process.Start();

            await process.StandardInput.WriteAsync(payload);
            process.StandardInput.Close();

            var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
            await process.WaitForExitAsync(cancellationToken);

            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            if (process.ExitCode != 0)
            {
                throw new InvalidOperationException($"Donor MLR training failed: {stderr}");
            }

            var result = JsonSerializer.Deserialize<DonorMlInsightsResponseDto>(stdout, JsonOptions);
            if (result is null)
            {
                throw new InvalidOperationException("Donor MLR trainer returned empty payload.");
            }

            return result;
        }
        finally
        {
            _runLock.Release();
        }
    }

    private string GetArtifactsDir()
    {
        var defaultArtifactsDir = Path.Combine(environment.ContentRootPath, "ML", "artifacts");
        return configuration["Ml:DonorArtifactsDir"] ?? defaultArtifactsDir;
    }

    private string GetTrainScriptPath()
    {
        var defaultScriptPath = Path.Combine(environment.ContentRootPath, "ML", "donor_models_train.py");
        var scriptPath = configuration["Ml:DonorTrainScriptPath"] ?? defaultScriptPath;
        if (!File.Exists(scriptPath))
        {
            throw new FileNotFoundException($"Donor MLR training script not found: {scriptPath}");
        }

        return scriptPath;
    }

    private string GetLatestInsightsPath()
    {
        return Path.Combine(GetArtifactsDir(), "donor_mlr_latest.json");
    }
}

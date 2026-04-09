using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;

namespace Panahgah.Api.Services;

public sealed class GirlsReintegrationMlPipelineService(
    IServiceScopeFactory scopeFactory,
    IWebHostEnvironment environment,
    IConfiguration configuration)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly SemaphoreSlim _runLock = new(1, 1);

    public async Task<GirlsReintegrationInsightsResponseDto?> GetLatestInsightsAsync(CancellationToken cancellationToken = default)
    {
        var latestPath = GetLatestInsightsPath();
        if (!File.Exists(latestPath))
        {
            return null;
        }

        var json = await File.ReadAllTextAsync(latestPath, cancellationToken);
        return JsonSerializer.Deserialize<GirlsReintegrationInsightsResponseDto>(json, JsonOptions);
    }

    public async Task<GirlsReintegrationInsightsResponseDto> TrainAsync(string initiatedBy, CancellationToken cancellationToken = default)
    {
        await _runLock.WaitAsync(cancellationToken);
        try
        {
            using var scope = scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var residents = await dbContext.residents.AsNoTracking()
                .Select(r => new
                {
                    r.resident_id,
                    r.internal_code,
                    r.safehouse_id,
                    r.case_status,
                    r.case_category,
                    r.current_risk_level,
                    r.initial_risk_level,
                    r.present_age,
                    r.reintegration_status,
                    r.reintegration_type,
                    r.length_of_stay,
                    r.date_of_admission,
                    r.date_closed
                })
                .ToListAsync(cancellationToken);

            var safehouses = await dbContext.safehouses.AsNoTracking()
                .Select(s => new { s.safehouse_id, s.safehouse_code, s.name })
                .ToListAsync(cancellationToken);

            var processRecordings = await dbContext.process_recordings.AsNoTracking()
                .Select(p => new { p.resident_id, p.session_duration_minutes, p.progress_noted, p.concerns_flagged, p.referral_made })
                .ToListAsync(cancellationToken);

            var homeVisitations = await dbContext.home_visitations.AsNoTracking()
                .Select(v => new { v.resident_id, v.follow_up_needed, v.safety_concerns_noted })
                .ToListAsync(cancellationToken);

            var educationRecords = await dbContext.education_records.AsNoTracking()
                .Select(e => new
                {
                    e.resident_id,
                    e.attendance_rate,
                    e.progress_percent,
                    e.gpa_like_score
                })
                .ToListAsync(cancellationToken);

            var healthRecords = await dbContext.health_wellbeing_records.AsNoTracking()
                .Select(h => new
                {
                    h.resident_id,
                    h.nutrition_score,
                    h.sleep_score,
                    h.energy_score,
                    h.general_health_score
                })
                .ToListAsync(cancellationToken);

            var interventionPlans = await dbContext.intervention_plans.AsNoTracking()
                .Select(i => new { i.resident_id, i.status, i.plan_category })
                .ToListAsync(cancellationToken);

            var incidentReports = await dbContext.incident_reports.AsNoTracking()
                .Select(i => new { i.resident_id, i.severity, i.resolved })
                .ToListAsync(cancellationToken);

            var payload = JsonSerializer.Serialize(new
            {
                residents,
                safehouses,
                process_recordings = processRecordings,
                home_visitations = homeVisitations,
                education_records = educationRecords,
                health_records = healthRecords,
                intervention_plans = interventionPlans,
                incident_reports = incidentReports,
                initiated_by = initiatedBy
            }, JsonOptions);

            var startInfo = new ProcessStartInfo
            {
                FileName = ResolvePythonExecutable(),
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
                throw new InvalidOperationException($"Girls reintegration MLR training failed: {stderr}");
            }

            var result = JsonSerializer.Deserialize<GirlsReintegrationInsightsResponseDto>(stdout, JsonOptions);
            if (result is null)
            {
                throw new InvalidOperationException("Girls reintegration MLR trainer returned empty payload.");
            }

            return result;
        }
        finally
        {
            _runLock.Release();
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

    private string GetArtifactsDir()
    {
        var defaultArtifactsDir = Path.Combine(environment.ContentRootPath, "ML", "artifacts");
        return configuration["Ml:GirlsReintegrationArtifactsDir"] ?? defaultArtifactsDir;
    }

    private string GetTrainScriptPath()
    {
        var defaultScriptPath = Path.Combine(environment.ContentRootPath, "ML", "girls_reintegration_train.py");
        var scriptPath = configuration["Ml:GirlsReintegrationTrainScriptPath"] ?? defaultScriptPath;
        if (!File.Exists(scriptPath))
        {
            throw new FileNotFoundException($"Girls reintegration training script not found: {scriptPath}");
        }

        return scriptPath;
    }

    private string GetLatestInsightsPath()
    {
        return Path.Combine(GetArtifactsDir(), "girls_reintegration_mlr_latest.json");
    }
}

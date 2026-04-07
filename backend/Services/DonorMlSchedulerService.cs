using Panahgah.Api.Contracts;

namespace Panahgah.Api.Services;

public sealed class DonorMlSchedulerService(
    DonorMlPipelineService donorMlPipelineService,
    IConfiguration configuration,
    ILogger<DonorMlSchedulerService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var enabled = configuration.GetValue("Ml:DonorScheduler:Enabled", true);
        if (!enabled)
        {
            logger.LogInformation("Donor MLR scheduler disabled by configuration.");
            return;
        }

        var intervalHours = configuration.GetValue("Ml:DonorScheduler:IntervalHours", 24);
        var initialDelayMinutes = configuration.GetValue("Ml:DonorScheduler:InitialDelayMinutes", 2);
        var interval = TimeSpan.FromHours(Math.Max(1, intervalHours));
        var initialDelay = TimeSpan.FromMinutes(Math.Max(0, initialDelayMinutes));

        if (initialDelay > TimeSpan.Zero)
        {
            await Task.Delay(initialDelay, stoppingToken);
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                DonorMlInsightsResponseDto result = await donorMlPipelineService.TrainAsync("scheduler", stoppingToken);
                logger.LogInformation(
                    "Donor MLR scheduled run complete. Status: {Status}, LapseRows: {LapseRows}, UpgradeRows: {UpgradeRows}",
                    result.pipeline_health.status,
                    result.pipeline_health.rows_used_lapse,
                    result.pipeline_health.rows_used_upgrade);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Donor MLR scheduled run failed.");
            }

            await Task.Delay(interval, stoppingToken);
        }
    }
}

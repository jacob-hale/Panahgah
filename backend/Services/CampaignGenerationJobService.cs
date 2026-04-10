using System.Collections.Concurrent;
using Panahgah.Api.Contracts;

namespace Panahgah.Api.Services;

public sealed class CampaignGenerationJobService(IServiceScopeFactory scopeFactory)
{
    private readonly ConcurrentDictionary<Guid, CampaignGenerationJobState> _jobs = new();

    public Guid Start(CampaignGenerateRequestDto request)
    {
        var jobId = Guid.NewGuid();
        var state = new CampaignGenerationJobState
        {
            job_id = jobId,
            status = "queued",
            created_at_utc = DateTime.UtcNow
        };
        _jobs[jobId] = state;

        _ = Task.Run(async () =>
        {
            state.status = "running";
            state.started_at_utc = DateTime.UtcNow;
            try
            {
                using var scope = scopeFactory.CreateScope();
                var scheduler = scope.ServiceProvider.GetRequiredService<ICampaignSchedulerService>();
                var created = await scheduler.GenerateCampaignAsync(request, CancellationToken.None);
                state.generated_count = created.Count;
                state.status = "succeeded";
                state.finished_at_utc = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                state.status = "failed";
                state.error = ex.Message;
                state.finished_at_utc = DateTime.UtcNow;
            }
        });

        return jobId;
    }

    public CampaignGenerationJobState? Get(Guid jobId)
    {
        return _jobs.TryGetValue(jobId, out var state) ? state : null;
    }
}

public sealed class CampaignGenerationJobState
{
    public Guid job_id { get; set; }
    public string status { get; set; } = "queued";
    public int generated_count { get; set; }
    public string? error { get; set; }
    public DateTime created_at_utc { get; set; }
    public DateTime? started_at_utc { get; set; }
    public DateTime? finished_at_utc { get; set; }
}


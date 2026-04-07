namespace Panahgah.Api.Contracts;

public sealed class DonorMlInsightsResponseDto
{
    public DonorMlModelSummaryDto donor_lapse { get; set; } = new();
    public DonorMlModelSummaryDto donor_upgrade { get; set; } = new();
    public DonorMlPipelineHealthDto pipeline_health { get; set; } = new();
}

public sealed class DonorMlModelSummaryDto
{
    public int low_count { get; set; }
    public int medium_count { get; set; }
    public int high_count { get; set; }
    public int top_count { get; set; }
    public List<DonorMlSegmentDto> top_segments { get; set; } = [];
    public List<DonorMlFeatureDto> key_features { get; set; } = [];
    public DonorMlMetricsDto metrics { get; set; } = new();
    public DonorMlAskLadderDto ask_ladder_summary { get; set; } = new();
}

public sealed class DonorMlSegmentDto
{
    public string supporter_type { get; set; } = string.Empty;
    public string acquisition_channel { get; set; } = string.Empty;
    public double avg_score { get; set; }
}

public sealed class DonorMlFeatureDto
{
    public string feature { get; set; } = string.Empty;
    public double importance { get; set; }
}

public sealed class DonorMlMetricsDto
{
    public double? roc_auc { get; set; }
    public double avg_precision { get; set; }
    public double f1 { get; set; }
    public double test_positive_rate { get; set; }
    public int train_rows { get; set; }
    public int test_rows { get; set; }
}

public sealed class DonorMlAskLadderDto
{
    public double suggested_ask_floor_avg { get; set; }
    public double suggested_ask_ceiling_avg { get; set; }
}

public sealed class DonorMlPipelineHealthDto
{
    public string status { get; set; } = "not_trained";
    public DateTime? last_trained_at_utc { get; set; }
    public long last_run_duration_ms { get; set; }
    public int rows_used_lapse { get; set; }
    public int rows_used_upgrade { get; set; }
    public string initiated_by { get; set; } = string.Empty;
    public List<string> warnings { get; set; } = [];
}

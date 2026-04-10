namespace Panahgah.Api.Contracts;

/// <summary>Returned on failed POST /api/ml/girls-reintegration/train (400/500 JSON body).</summary>
public sealed class GirlsReintegrationTrainErrorDto
{
    public string error { get; set; } = string.Empty;
    public string code { get; set; } = string.Empty;
    public string? hint { get; set; }
}

public sealed class GirlsReintegrationInsightsResponseDto
{
    public GirlsReadinessDistributionDto readiness_distribution { get; set; } = new();
    public List<GirlsResidentWorklistRowDto> top_resident_worklist { get; set; } = [];
    public List<GirlsFeatureImportanceDto> key_features { get; set; } = [];
    public GirlsModelMetricsDto model_metrics { get; set; } = new();
    public GirlsLabelAuditDto label_audit { get; set; } = new();
    public GirlsPipelineHealthDto pipeline_health { get; set; } = new();
}

public sealed class GirlsLabelAuditDto
{
    public int labeled_negative { get; set; }
    public int labeled_positive { get; set; }
    public List<string> unmapped_status_samples { get; set; } = [];
}

public sealed class GirlsReadinessDistributionDto
{
    public int high_count { get; set; }
    public int medium_count { get; set; }
    public int low_count { get; set; }
}

public sealed class GirlsResidentWorklistRowDto
{
    public int resident_id { get; set; }
    public string resident_code { get; set; } = string.Empty;
    public string safehouse { get; set; } = string.Empty;
    public double readiness_score { get; set; }
    public string readiness_band { get; set; } = string.Empty;
    public int process_recordings_count { get; set; }
    public int home_visitations_count { get; set; }
    public int intervention_plans_count { get; set; }
    public int incident_reports_count { get; set; }
}

public sealed class GirlsFeatureImportanceDto
{
    public string feature { get; set; } = string.Empty;
    public double importance { get; set; }
}

public sealed class GirlsModelMetricsDto
{
    public double? roc_auc { get; set; }
    public double? roc_auc_std { get; set; }
    public double avg_precision { get; set; }
    public double? avg_precision_std { get; set; }
    public double f1 { get; set; }
    public double? f1_cv_mean { get; set; }
    public double? f1_cv_std { get; set; }
    public double? optimal_threshold { get; set; }
    public double test_positive_rate { get; set; }
    public int train_rows { get; set; }
    public int test_rows { get; set; }
    public string? eval_mode { get; set; }
    public int? cv_folds { get; set; }
}

public sealed class GirlsPipelineHealthDto
{
    public string status { get; set; } = "not_trained";
    public string? last_trained_at_utc { get; set; }
    public int? last_run_duration_ms { get; set; }
    public int? rows_used { get; set; }
    public string? initiated_by { get; set; }
    public List<string> warnings { get; set; } = [];
}

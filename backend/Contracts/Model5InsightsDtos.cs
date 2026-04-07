namespace Panahgah.Api.Contracts;

public sealed class Model5InsightsResponseDto
{
    public double baseline_expected_referrals { get; set; }
    public List<Model5PostingWindowDto> best_windows { get; set; } = [];
    public List<Model5PostTypeByPlatformDto> best_post_type_by_platform { get; set; } = [];
    public Model5StoryEffectDto story_effect { get; set; } = new();
}

public sealed class Model5PostingWindowDto
{
    public string day_of_week { get; set; } = string.Empty;
    public int? post_hour { get; set; }
    public double avg_referrals { get; set; }
    public double uplift_pct { get; set; }
}

public sealed class Model5PostTypeByPlatformDto
{
    public string platform { get; set; } = string.Empty;
    public string post_type { get; set; } = string.Empty;
    public double avg_referrals { get; set; }
    public double uplift_pct { get; set; }
}

public sealed class Model5StoryEffectDto
{
    public double with_story_avg { get; set; }
    public double without_story_avg { get; set; }
    public int with_story_count { get; set; }
    public int without_story_count { get; set; }
}

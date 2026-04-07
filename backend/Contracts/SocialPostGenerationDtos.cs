namespace Panahgah.Api.Contracts;

public sealed class SocialPostGenerateRequestDto
{
    public string platform { get; set; } = string.Empty;
    public string goal { get; set; } = string.Empty;
    public string post_type { get; set; } = string.Empty;
    public string post_topic { get; set; } = string.Empty;
    public bool include_resident_story { get; set; }
    public string tone { get; set; } = string.Empty;
    public string? key_details { get; set; }
}

public sealed class SocialPostGenerateResponseDto
{
    public string recommended_day_of_week { get; set; } = string.Empty;
    public int? recommended_post_hour { get; set; }
    public string recommended_post_type { get; set; } = string.Empty;
    public string rationale { get; set; } = string.Empty;
    public List<GeneratedSocialPostDto> generated_posts { get; set; } = [];
}

public sealed class GeneratedSocialPostDto
{
    public string variant_name { get; set; } = string.Empty;
    public string caption { get; set; } = string.Empty;
    public List<string> hashtags { get; set; } = [];
}

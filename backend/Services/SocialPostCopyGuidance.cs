using System.Text;
using Panahgah.Api.Contracts;

namespace Panahgah.Api.Services;

/// <summary>
/// Shared instructions for AI caption generation (Gemini / Anthropic).
/// </summary>
internal static class SocialPostCopyGuidance
{
    internal const string OrganizationSystemBlock =
        """
        Organizational context — Panahgah Refuge (India):
        - Nonprofit safe shelter and holistic rehabilitation for girls and young women who have survived sexual abuse and exploitation.
        - Programs emphasize trauma-informed care, education, life skills, and supported reintegration: safe reunification with biological family when appropriate, or foster or adoptive placement when that is the better path.
        - Write with dignity, hope, and accuracy. No graphic detail, no sensationalism, no invented statistics or fake quotes.
        - Personal stories: use at most one brief vignette per caption; prefer anonymous phrasing ("a resident", "the girls we serve") or a single plausible, non-repeated context-appropriate name. Do not reuse the same name across both caption variants in one response. Avoid Western default names like "Sarah" unless the brief explicitly supplies a name.
        - Do not center men or boys in survivor narratives unless the user brief explicitly asks; focus on girls/women survivors, female residents, caregivers, staff, donors, and community allies.
        - Captions are for English-speaking social audiences (donors, partners); keep India context authentic without exoticizing survivors.
        """;

    internal static string BuildUserPrompt(SocialPostGenerateRequestDto request, Model5InsightsResponseDto insights)
    {
        var bestWindow = insights.best_windows.FirstOrDefault();
        var bestPostType = insights.best_post_type_by_platform
            .FirstOrDefault(x => string.Equals(x.platform, request.platform, StringComparison.OrdinalIgnoreCase));

        var sb = new StringBuilder();
        sb.AppendLine("Create two social post drafts from this brief:");
        sb.AppendLine($"Platform: {request.platform}");
        sb.AppendLine($"Goal: {request.goal}");
        sb.AppendLine($"Preferred post type: {request.post_type}");
        sb.AppendLine($"Topic: {request.post_topic}");
        sb.AppendLine($"Tone: {request.tone}");
        sb.AppendLine($"Include resident story: {request.include_resident_story}");
        sb.AppendLine($"Key details: {request.key_details ?? "None"}");
        sb.AppendLine();
        sb.AppendLine("Model insights to incorporate:");
        sb.AppendLine($"Baseline expected referrals/post: {insights.baseline_expected_referrals:F2}");
        sb.AppendLine(
            $"Resident story effect avg referrals: with story {insights.story_effect.with_story_avg:F2}, without story {insights.story_effect.without_story_avg:F2}.");
        sb.AppendLine(
            $"Recommended platform post type: {(bestPostType is null ? "N/A" : $"{bestPostType.post_type} ({bestPostType.uplift_pct:F1}% uplift)")}");
        sb.AppendLine(
            $"Recommended posting window: {(bestWindow is null ? "N/A" : $"{bestWindow.day_of_week} @ {bestWindow.post_hour}:00 ({bestWindow.uplift_pct:F1}% uplift)")}");
        sb.AppendLine();
        sb.AppendLine("Output exactly the required JSON object.");
        return sb.ToString();
    }
}

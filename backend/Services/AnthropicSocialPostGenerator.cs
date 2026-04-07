using System.Text;
using System.Text.Json;
using Panahgah.Api.Contracts;

namespace Panahgah.Api.Services;

public interface ISocialPostGenerator
{
    Task<SocialPostGenerateResponseDto> GenerateAsync(
        SocialPostGenerateRequestDto request,
        Model5InsightsResponseDto insights,
        CancellationToken cancellationToken = default);
}

public sealed class AnthropicSocialPostGenerator(HttpClient httpClient, IConfiguration configuration) : ISocialPostGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<SocialPostGenerateResponseDto> GenerateAsync(
        SocialPostGenerateRequestDto request,
        Model5InsightsResponseDto insights,
        CancellationToken cancellationToken = default)
    {
        var apiKey = configuration["Llms:AnthropicApiKey"] ?? configuration["ANTHROPIC_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Anthropic API key is not configured.");
        }

        var model = configuration["Llms:AnthropicModel"] ?? "claude-3-5-haiku-latest";

        var systemPrompt =
            """
            You are a social media copywriter for a nonprofit. Generate high-performing draft posts using provided model insights.
            Return ONLY valid JSON with this schema:
            {
              "recommended_day_of_week": "string",
              "recommended_post_hour": 0,
              "recommended_post_type": "string",
              "rationale": "string",
              "generated_posts": [
                { "variant_name": "Primary", "caption": "string", "hashtags": ["#tag1", "#tag2"] },
                { "variant_name": "Alternative", "caption": "string", "hashtags": ["#tag1", "#tag2"] }
              ]
            }
            Keep captions platform-appropriate and under 220 words. Avoid unsupported claims.
            """;

        var userPrompt = BuildUserPrompt(request, insights);
        var payload = new
        {
            model,
            max_tokens = 900,
            system = systemPrompt,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = userPrompt
                }
            }
        };

        using var requestMessage = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        requestMessage.Headers.Add("x-api-key", apiKey);
        requestMessage.Headers.Add("anthropic-version", "2023-06-01");
        requestMessage.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        using var response = await httpClient.SendAsync(requestMessage, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Anthropic request failed: {responseBody}");
        }

        var completionText = ExtractTextFromAnthropicResponse(responseBody);
        var generated = JsonSerializer.Deserialize<SocialPostGenerateResponseDto>(completionText, JsonOptions);
        if (generated is null)
        {
            throw new InvalidOperationException("LLM returned an empty response.");
        }

        if (generated.generated_posts.Count == 0)
        {
            throw new InvalidOperationException("LLM response did not include generated posts.");
        }

        return generated;
    }

    private static string BuildUserPrompt(SocialPostGenerateRequestDto request, Model5InsightsResponseDto insights)
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

    private static string ExtractTextFromAnthropicResponse(string responseBody)
    {
        using var document = JsonDocument.Parse(responseBody);
        var root = document.RootElement;
        if (!root.TryGetProperty("content", out var contentArray) || contentArray.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("Unexpected Anthropic response format.");
        }

        var textBlock = contentArray.EnumerateArray()
            .FirstOrDefault(x => x.TryGetProperty("type", out var typeEl) && typeEl.GetString() == "text");

        if (textBlock.ValueKind == JsonValueKind.Undefined || !textBlock.TryGetProperty("text", out var textEl))
        {
            throw new InvalidOperationException("No text content found in Anthropic response.");
        }

        return textEl.GetString() ?? throw new InvalidOperationException("Anthropic text payload was null.");
    }
}

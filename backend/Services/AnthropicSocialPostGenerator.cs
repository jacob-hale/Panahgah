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
            SocialPostCopyGuidance.OrganizationSystemBlock
            + """
            
            You are a social media copywriter. Generate high-performing draft posts using the brief and model insights.
            Return ONLY valid JSON. Use real sentences for every string field—never output the literal word "string" as a value.

            Shape (example structure only—replace values with real content):
            {
              "recommended_day_of_week": "Wednesday",
              "recommended_post_hour": 16,
              "recommended_post_type": "Impact story",
              "rationale": "One sentence explaining why these choices fit the brief.",
              "generated_posts": [
                { "variant_name": "Primary", "caption": "Body copy only—no #Panahgah here; optional other hashtags at the end of the caption if useful.", "hashtags": ["#Community"] },
                { "variant_name": "Alternative", "caption": "A second distinct caption option.", "hashtags": [] }
              ]
            }

            Do not put #Panahgah inside the caption string (it is appended automatically at the very end). Other hashtags may appear at the end of the caption before that step. Keep captions platform-appropriate and under 220 words.
            """;

        var userPrompt = SocialPostCopyGuidance.BuildUserPrompt(request, insights);
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

        SocialCaptionFormatting.FinalizeGeneratorResponse(generated);
        return generated;
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

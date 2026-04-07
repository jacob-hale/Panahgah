using System.Text;
using System.Text.Json;
using Panahgah.Api.Contracts;

namespace Panahgah.Api.Services;

public sealed class GeminiSocialPostGenerator(HttpClient httpClient, IConfiguration configuration) : ISocialPostGenerator
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
        var apiKey = configuration["Llms:GeminiApiKey"] ?? configuration["GEMINI_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured.");
        }

        var configuredModels = configuration["Llms:GeminiModel"];
        var modelCandidates = (configuredModels ?? "gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-flash-latest,gemini-1.5-pro,gemini-1.5-pro-latest")
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToList();
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
        if (modelCandidates.Count == 0)
        {
            modelCandidates.AddRange(await DiscoverGenerateContentModelsAsync(apiKey, cancellationToken));
        }

        string? lastFailure = null;
        string? responseBody = null;
        var tokenBudgets = new[] { 900, 1400, 1800 };
        foreach (var tokenBudget in tokenBudgets)
        {
            var payload = BuildPayload(systemPrompt, userPrompt, tokenBudget);
            foreach (var model in modelCandidates)
            {
                var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                using var response = await httpClient.PostAsync(
                    endpoint,
                    new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
                    cancellationToken);
                responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    lastFailure = $"Model {model} failed: {responseBody}";
                    continue;
                }

                try
                {
                    var completionText = ExtractTextFromGeminiResponse(responseBody);
                    var normalized = NormalizeModelJson(completionText);
                    var jsonPayload = ExtractFirstJsonObject(normalized);
                    var generated = JsonSerializer.Deserialize<SocialPostGenerateResponseDto>(jsonPayload, JsonOptions);
                    if (generated is null)
                    {
                        lastFailure = "Gemini returned an empty response.";
                        continue;
                    }

                    if (generated.generated_posts.Count == 0)
                    {
                        lastFailure = "Gemini response did not include generated posts.";
                        continue;
                    }

                    return generated;
                }
                catch (InvalidOperationException ex) when (ex.Message.Contains("truncated", StringComparison.OrdinalIgnoreCase))
                {
                    lastFailure = $"Model {model} output was truncated at {tokenBudget} tokens.";
                    continue;
                }
                catch (JsonException ex)
                {
                    lastFailure = $"Model {model} returned invalid JSON: {ex.Message}";
                    continue;
                }
            }
        }

        if (lastFailure is not null)
        {
            var discovered = await DiscoverGenerateContentModelsAsync(apiKey, cancellationToken);
            foreach (var tokenBudget in tokenBudgets)
            {
                var payload = BuildPayload(systemPrompt, userPrompt, tokenBudget);
                foreach (var discoveredModel in discovered.Where(x => !modelCandidates.Contains(x, StringComparer.OrdinalIgnoreCase)))
                {
                    var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{discoveredModel}:generateContent?key={apiKey}";
                    using var retryResponse = await httpClient.PostAsync(
                        endpoint,
                        new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
                        cancellationToken);
                    responseBody = await retryResponse.Content.ReadAsStringAsync(cancellationToken);

                    if (!retryResponse.IsSuccessStatusCode)
                    {
                        lastFailure = $"Model {discoveredModel} failed: {responseBody}";
                        continue;
                    }

                    try
                    {
                        var completionText = ExtractTextFromGeminiResponse(responseBody);
                        var normalized = NormalizeModelJson(completionText);
                        var jsonPayload = ExtractFirstJsonObject(normalized);
                        var generated = JsonSerializer.Deserialize<SocialPostGenerateResponseDto>(jsonPayload, JsonOptions);
                        if (generated is null || generated.generated_posts.Count == 0)
                        {
                            lastFailure = $"Model {discoveredModel} returned empty data.";
                            continue;
                        }

                        return generated;
                    }
                    catch (Exception ex)
                    {
                        lastFailure = $"Model {discoveredModel} parse failed: {ex.Message}";
                    }
                }
            }
        }

        if (lastFailure is not null || responseBody is null)
        {
            throw new InvalidOperationException($"Gemini request failed: {lastFailure}");
        }
        throw new InvalidOperationException("Gemini request failed for unknown reasons.");
    }

    private static object BuildPayload(string systemPrompt, string userPrompt, int maxOutputTokens)
    {
        return new
        {
            system_instruction = new
            {
                parts = new[]
                {
                    new { text = systemPrompt }
                }
            },
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[]
                    {
                        new { text = userPrompt }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.7,
                maxOutputTokens,
                responseMimeType = "application/json"
            }
        };
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

    private static string ExtractTextFromGeminiResponse(string responseBody)
    {
        using var document = JsonDocument.Parse(responseBody);
        if (!document.RootElement.TryGetProperty("candidates", out var candidates) || candidates.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("Unexpected Gemini response format.");
        }

        var firstCandidate = candidates.EnumerateArray().FirstOrDefault();
        if (firstCandidate.ValueKind == JsonValueKind.Undefined ||
            !firstCandidate.TryGetProperty("content", out var content) ||
            !content.TryGetProperty("parts", out var parts) ||
            parts.ValueKind != JsonValueKind.Array)
        {
            throw new InvalidOperationException("No content returned by Gemini.");
        }

        var textPart = parts.EnumerateArray()
            .FirstOrDefault(x => x.TryGetProperty("text", out _));
        if (textPart.ValueKind == JsonValueKind.Undefined || !textPart.TryGetProperty("text", out var textEl))
        {
            throw new InvalidOperationException("No text part returned by Gemini.");
        }

        return textEl.GetString() ?? throw new InvalidOperationException("Gemini text payload was null.");
    }

    private static string NormalizeModelJson(string content)
    {
        var trimmed = content.Trim();
        if (!trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            return trimmed;
        }

        var lines = trimmed.Split('\n');
        if (lines.Length < 3)
        {
            return trimmed;
        }

        var body = string.Join('\n', lines.Skip(1).Take(lines.Length - 2));
        return body.Trim();
    }

    private static string ExtractFirstJsonObject(string content)
    {
        var text = content.Trim();
        var start = text.IndexOf('{');
        if (start < 0)
        {
            throw new InvalidOperationException("Gemini response did not contain a JSON object.");
        }

        var depth = 0;
        var inString = false;
        var escaped = false;
        for (var i = start; i < text.Length; i++)
        {
            var ch = text[i];
            if (inString)
            {
                if (escaped)
                {
                    escaped = false;
                    continue;
                }

                if (ch == '\\')
                {
                    escaped = true;
                    continue;
                }

                if (ch == '"')
                {
                    inString = false;
                }

                continue;
            }

            if (ch == '"')
            {
                inString = true;
                continue;
            }

            if (ch == '{')
            {
                depth++;
                continue;
            }

            if (ch == '}')
            {
                depth--;
                if (depth == 0)
                {
                    return text[start..(i + 1)];
                }
            }
        }

        throw new InvalidOperationException("Gemini response JSON object appears truncated.");
    }

    private async Task<List<string>> DiscoverGenerateContentModelsAsync(string apiKey, CancellationToken cancellationToken)
    {
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}";
        using var response = await httpClient.GetAsync(endpoint, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return [];
        }

        using var document = JsonDocument.Parse(body);
        if (!document.RootElement.TryGetProperty("models", out var models) || models.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var discovered = new List<string>();
        foreach (var model in models.EnumerateArray())
        {
            if (!model.TryGetProperty("name", out var nameEl))
            {
                continue;
            }

            if (!model.TryGetProperty("supportedGenerationMethods", out var methods) || methods.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var supportsGenerateContent = methods.EnumerateArray()
                .Any(x => string.Equals(x.GetString(), "generateContent", StringComparison.OrdinalIgnoreCase));
            if (!supportsGenerateContent)
            {
                continue;
            }

            var fullName = nameEl.GetString();
            if (string.IsNullOrWhiteSpace(fullName))
            {
                continue;
            }

            // API expects the short model id in endpoint path, not "models/" prefix.
            var shortName = fullName.StartsWith("models/", StringComparison.OrdinalIgnoreCase)
                ? fullName["models/".Length..]
                : fullName;

            discovered.Add(shortName);
        }

        return discovered
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}

using System.Text;
using System.Text.Json;
using Panahgah.Api.Contracts;
using System.Diagnostics;

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
        var apiKey = EnvConfigResolver.Resolve("Llms:GeminiApiKey", configuration)
            ?? EnvConfigResolver.Resolve("GEMINI_API_KEY", configuration);
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured.");
        }

        var configuredModels = configuration["Llms:GeminiModel"];
        var modelCandidates = (configuredModels ?? "gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-flash-latest,gemini-1.5-pro,gemini-1.5-pro-latest")
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToList();
        var maxModelsToTry = int.TryParse(configuration["Llms:GeminiMaxModelsToTry"], out var mm) && mm > 0
            ? Math.Min(mm, 4)
            : 2;
        if (modelCandidates.Count > maxModelsToTry)
        {
            modelCandidates = modelCandidates.Take(maxModelsToTry).ToList();
        }
        var maxRequestSeconds = int.TryParse(configuration["Llms:GeminiMaxRequestSeconds"], out var ms) && ms > 0
            ? Math.Min(ms, 90)
            : 25;
        var stopwatch = Stopwatch.StartNew();
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
        if (modelCandidates.Count == 0)
        {
            modelCandidates.AddRange(await DiscoverGenerateContentModelsAsync(apiKey, cancellationToken));
        }

        string? lastFailure = null;
        string? responseBody = null;
        var tokenBudgets = new[] { 900, 1300 };
        foreach (var tokenBudget in tokenBudgets)
        {
            if (stopwatch.Elapsed > TimeSpan.FromSeconds(maxRequestSeconds))
            {
                break;
            }
            var payload = BuildPayload(systemPrompt, userPrompt, tokenBudget);
            foreach (var model in modelCandidates)
            {
                if (stopwatch.Elapsed > TimeSpan.FromSeconds(maxRequestSeconds))
                {
                    break;
                }

                try
                {
                    var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                    using var perAttemptCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                    perAttemptCts.CancelAfter(TimeSpan.FromSeconds(Math.Min(12, maxRequestSeconds)));
                    using var response = await httpClient.PostAsync(
                        endpoint,
                        new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
                        perAttemptCts.Token);
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

                        SocialCaptionFormatting.FinalizeGeneratorResponse(generated);
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
                catch (OperationCanceledException)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    lastFailure = $"Model {model} request timed out.";
                    continue;
                }
                catch (HttpRequestException ex)
                {
                    lastFailure = $"Model {model} network error: {ex.Message}";
                    continue;
                }
            }
        }

        if (lastFailure is not null && stopwatch.Elapsed <= TimeSpan.FromSeconds(maxRequestSeconds))
        {
            List<string> discovered;
            try
            {
                discovered = await DiscoverGenerateContentModelsAsync(apiKey, cancellationToken);
            }
            catch (Exception ex)
            {
                discovered = [];
                lastFailure = $"Gemini model discovery failed: {ex.Message}";
            }

            foreach (var tokenBudget in tokenBudgets)
            {
                if (stopwatch.Elapsed > TimeSpan.FromSeconds(maxRequestSeconds))
                {
                    break;
                }
                var payload = BuildPayload(systemPrompt, userPrompt, tokenBudget);
                foreach (var discoveredModel in discovered.Where(x => !modelCandidates.Contains(x, StringComparer.OrdinalIgnoreCase)))
                {
                    if (stopwatch.Elapsed > TimeSpan.FromSeconds(maxRequestSeconds))
                    {
                        break;
                    }

                    try
                    {
                        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{discoveredModel}:generateContent?key={apiKey}";
                        using var perAttemptCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                        perAttemptCts.CancelAfter(TimeSpan.FromSeconds(Math.Min(12, maxRequestSeconds)));
                        using var retryResponse = await httpClient.PostAsync(
                            endpoint,
                            new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
                            perAttemptCts.Token);
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

                            SocialCaptionFormatting.FinalizeGeneratorResponse(generated);
                            return generated;
                        }
                        catch (Exception ex)
                        {
                            lastFailure = $"Model {discoveredModel} parse failed: {ex.Message}";
                        }
                    }
                    catch (OperationCanceledException)
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                        lastFailure = $"Model {discoveredModel} request timed out.";
                    }
                    catch (HttpRequestException ex)
                    {
                        lastFailure = $"Model {discoveredModel} network error: {ex.Message}";
                    }
                }
            }
        }

        if (lastFailure is not null || responseBody is null)
        {
            if (stopwatch.Elapsed > TimeSpan.FromSeconds(maxRequestSeconds))
            {
                throw new InvalidOperationException(
                    "AI generation timed out. Try fewer posts (or a smaller date range), then run again.");
            }
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

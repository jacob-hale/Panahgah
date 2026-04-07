using Panahgah.Api.Contracts;

namespace Panahgah.Api.Services;

public sealed class ConfigurableSocialPostGenerator(
    IConfiguration configuration,
    AnthropicSocialPostGenerator anthropicGenerator,
    GeminiSocialPostGenerator geminiGenerator) : ISocialPostGenerator
{
    public Task<SocialPostGenerateResponseDto> GenerateAsync(
        SocialPostGenerateRequestDto request,
        Model5InsightsResponseDto insights,
        CancellationToken cancellationToken = default)
    {
        var provider = configuration["Llms:Provider"]?.Trim().ToLowerInvariant();

        return provider switch
        {
            "anthropic" => anthropicGenerator.GenerateAsync(request, insights, cancellationToken),
            "gemini" => geminiGenerator.GenerateAsync(request, insights, cancellationToken),
            _ => AutoSelectGenerator().GenerateAsync(request, insights, cancellationToken)
        };
    }

    private ISocialPostGenerator AutoSelectGenerator()
    {
        var hasGeminiKey = !string.IsNullOrWhiteSpace(configuration["Llms:GeminiApiKey"] ?? configuration["GEMINI_API_KEY"]);
        if (hasGeminiKey)
        {
            return geminiGenerator;
        }

        return anthropicGenerator;
    }
}

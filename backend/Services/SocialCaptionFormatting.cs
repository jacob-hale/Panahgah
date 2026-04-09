using System.Text.RegularExpressions;
using Panahgah.Api.Contracts;

namespace Panahgah.Api.Services;

public static class SocialCaptionFormatting
{
    public const string PanahgahHashtag = "#Panahgah";

    private static readonly Regex PanahgahTagRegex = new(
        @"#\s*Panahgah\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    /// <summary>
    /// Returns null when the model echoed JSON placeholders instead of real copy.
    /// </summary>
    public static string? NormalizeAiCaption(string? caption)
    {
        if (string.IsNullOrWhiteSpace(caption))
        {
            return null;
        }

        var t = caption.Trim();
        if (t.Equals("string", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return t;
    }

    /// <summary>
    /// Removes any #Panahgah tokens, then appends a single <see cref="PanahgahHashtag"/> at the end (standard hashtag placement).
    /// </summary>
    public static string EnsurePanahgahHashtag(string? caption)
    {
        var body = StripPanahgahHashtag(caption);
        var trimmed = body.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return PanahgahHashtag;
        }

        return $"{trimmed} {PanahgahHashtag}";
    }

    public static string StripPanahgahHashtag(string? caption)
    {
        if (string.IsNullOrWhiteSpace(caption))
        {
            return string.Empty;
        }

        var s = PanahgahTagRegex.Replace(caption, " ");
        return CollapseSpaces(s);
    }

    private static string CollapseSpaces(string s) =>
        Regex.Replace(s.Trim(), @"\s{2,}", " ");

    public static bool ContainsPanahgahHashtag(string text) =>
        PanahgahTagRegex.IsMatch(text);

    /// <summary>
    /// Fix placeholder captions and ensure #Panahgah on each variant before returning from the LLM.
    /// </summary>
    public static void FinalizeGeneratorResponse(SocialPostGenerateResponseDto dto)
    {
        const string fallbackBody =
            "Panahgah Refuge in India walks alongside girls healing from abuse—safe shelter, education, and paths home to family, foster care, or adoption when that is right.";

        foreach (var p in dto.generated_posts)
        {
            var normalized = NormalizeAiCaption(p.caption);
            var body = string.IsNullOrEmpty(normalized) ? fallbackBody : normalized;
            p.caption = EnsurePanahgahHashtag(body);
        }
    }
}

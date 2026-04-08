namespace Panahgah.Api.Auth;

public static class ContributionInterestCatalog
{
    public static readonly HashSet<string> AllowedKeys =
    [
        "monetary",
        "volunteer",
        "skills",
        "in_kind",
        "time",
        "social_media"
    ];

    public static string[] Normalize(IEnumerable<string>? interests)
    {
        return (interests ?? [])
            .Select(s => s.Trim().ToLowerInvariant())
            .Where(AllowedKeys.Contains)
            .Distinct()
            .ToArray();
    }
}

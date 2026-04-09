namespace Panahgah.Api.Contracts;

public sealed class HomeVisitationListItemDto
{
    public int visitation_id { get; init; }
    public int resident_id { get; init; }
    public required string resident_case_control_no { get; init; }
    public required string resident_internal_code { get; init; }
    public DateOnly visit_date { get; init; }
    public required string visit_type { get; init; }
    public required string location_visited { get; init; }
    public required string family_cooperation_level { get; init; }
    public bool safety_concerns_noted { get; init; }
    public bool follow_up_needed { get; init; }
    public required string visit_outcome { get; init; }
    public required string social_worker { get; init; }
}

public static class HomeVisitationCatalog
{
    public static readonly string[] AllowedVisitTypes =
    [
        "Initial assessment",
        "Routine follow-up",
        "Reintegration assessment",
        "Post-placement monitoring",
        "Emergency"
    ];

    /// <summary>Structured home-environment observation; stored in observations with optional additional notes.</summary>
    public static readonly string[] AllowedHomeEnvironmentObservations =
    [
        "Stable, clean, and supportive",
        "Adequate with minor concerns",
        "Concerning conditions observed",
        "Unsafe or unsuitable",
        "Other (describe below)"
    ];

    public static readonly string[] AllowedFamilyCooperationLevels =
    [
        "Cooperative",
        "Highly Cooperative",
        "Neutral",
        "Uncooperative"
    ];

    /// <summary>DB requires non-null strings for fields not collected on the streamlined form.</summary>
    public const string DefaultSocialWorker = "Unspecified";

    public const string DefaultLocationVisited = "Not specified on form";
    public const string DefaultPurpose = "Home visitation log (staff portal)";
    public const string DefaultVisitOutcome = "Recorded via staff portal";

    public static bool IsAllowedVisitType(string value) =>
        AllowedVisitTypes.Contains(value, StringComparer.OrdinalIgnoreCase);

    public static bool IsAllowedHomeEnvironmentObservation(string value) =>
        AllowedHomeEnvironmentObservations.Contains(value, StringComparer.Ordinal);

    public static bool IsAllowedFamilyCooperationLevel(string value) =>
        AllowedFamilyCooperationLevels.Contains(value, StringComparer.Ordinal);
}



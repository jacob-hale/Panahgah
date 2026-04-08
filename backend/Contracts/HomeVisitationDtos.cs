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

    public static bool IsAllowedVisitType(string value) =>
        AllowedVisitTypes.Contains(value, StringComparer.OrdinalIgnoreCase);
}



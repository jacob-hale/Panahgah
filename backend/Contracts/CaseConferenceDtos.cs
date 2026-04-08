namespace Panahgah.Api.Contracts;

public sealed class UpcomingCaseConferenceListItemDto
{
    public int plan_id { get; init; }
    public DateOnly case_conference_date { get; init; }
    public int resident_id { get; init; }
    public required string resident_case_code { get; init; }
    public string? plan_status { get; init; }
}


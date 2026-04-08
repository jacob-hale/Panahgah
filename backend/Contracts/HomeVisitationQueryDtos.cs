namespace Panahgah.Api.Contracts;

public sealed class HomeVisitationsQueryDto
{
    public int? resident_id { get; set; }

    public int page { get; set; } = 1;
    public int page_size { get; set; } = 10;

    /// <summary>
    /// Sort order for visit_date. Allowed: "desc" (default), "asc".
    /// </summary>
    public string? sort_order { get; set; } = "desc";
}


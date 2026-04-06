namespace Panahgah.Api.Models;

public class MlInsight
{
    public int insight_id { get; set; }
    public DateTime created_at { get; set; }
    public string business_solution { get; set; } = string.Empty;
    public string action_items { get; set; } = string.Empty;
}

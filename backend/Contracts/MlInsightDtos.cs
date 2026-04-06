using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public class MlInsightCreateDto
{
    [Required, MaxLength(4000)]
    public string business_solution { get; set; } = string.Empty;
    [Required, MaxLength(4000)]
    public string action_items { get; set; } = string.Empty;
}

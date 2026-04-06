using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public class SafehouseUpsertDto
{
    [Required, MaxLength(64)]
    public string safehouse_code { get; set; } = string.Empty;
    [Required, MaxLength(256)]
    public string name { get; set; } = string.Empty;
    [Required, MaxLength(64)]
    public string region { get; set; } = string.Empty;
    [Required, MaxLength(128)]
    public string city { get; set; } = string.Empty;
    [Required, MaxLength(128)]
    public string province { get; set; } = string.Empty;
    [Required, MaxLength(128)]
    public string country { get; set; } = string.Empty;
    [Required]
    public DateOnly open_date { get; set; }
    [Required, MaxLength(64)]
    public string status { get; set; } = string.Empty;
    [Range(0, int.MaxValue)]
    public int capacity_girls { get; set; }
    [Range(0, int.MaxValue)]
    public int capacity_staff { get; set; }
    [Range(0, int.MaxValue)]
    public int current_occupancy { get; set; }
    [Required, MaxLength(2000)]
    public string notes { get; set; } = string.Empty;
}

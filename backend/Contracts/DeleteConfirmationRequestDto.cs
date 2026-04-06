using System.ComponentModel.DataAnnotations;

namespace Panahgah.Api.Contracts;

public class DeleteConfirmationRequestDto
{
    [Required]
    public bool ConfirmDelete { get; set; }
}

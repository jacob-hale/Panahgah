namespace Panahgah.Api.Services;

/// <summary>
/// Training failed for a reason we can explain to admins (data volume, labels, Python stderr).
/// </summary>
public sealed class GirlsReintegrationTrainingException : Exception
{
    public GirlsReintegrationTrainingException(string code, string message, string? hint = null, Exception? inner = null)
        : base(message, inner)
    {
        Code = code;
        Hint = hint;
    }

    public string Code { get; }
    public string? Hint { get; }
}

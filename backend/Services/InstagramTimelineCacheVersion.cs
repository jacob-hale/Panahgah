namespace Panahgah.Api.Services;

/// <summary>Bumps cache key generation so the public IG timeline refetches after new posts go live.</summary>
public sealed class InstagramTimelineCacheVersion
{
    private long _generation;

    public long Current => System.Threading.Interlocked.Read(ref _generation);

    public void Bump() => System.Threading.Interlocked.Increment(ref _generation);
}

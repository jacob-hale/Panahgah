namespace Panahgah.Api.Services;

public static class EnvConfigResolver
{
    public static string? Resolve(string key, IConfiguration? configuration = null)
    {
        var fromConfig = configuration?[key];
        if (!string.IsNullOrWhiteSpace(fromConfig))
        {
            return fromConfig.Trim();
        }

        var fromEnvironment = Environment.GetEnvironmentVariable(key);
        if (!string.IsNullOrWhiteSpace(fromEnvironment))
        {
            return fromEnvironment.Trim();
        }

        return TryReadFromDotEnv(key);
    }

    private static string? TryReadFromDotEnv(string key)
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), ".env"),
            Path.Combine(Directory.GetCurrentDirectory(), "..", ".env"),
        };

        foreach (var candidate in candidates.Select(Path.GetFullPath))
        {
            if (!File.Exists(candidate))
            {
                continue;
            }

            foreach (var line in File.ReadLines(candidate))
            {
                var trimmed = line.Trim();
                if (trimmed.Length == 0 || trimmed.StartsWith('#'))
                {
                    continue;
                }

                var content = trimmed.StartsWith("export ", StringComparison.OrdinalIgnoreCase)
                    ? trimmed["export ".Length..].Trim()
                    : trimmed;

                var idx = content.IndexOf('=');
                if (idx <= 0)
                {
                    continue;
                }

                var lineKey = content[..idx].Trim();
                if (!string.Equals(lineKey, key, StringComparison.Ordinal))
                {
                    continue;
                }

                var value = content[(idx + 1)..].Trim().Trim('"');
                return string.IsNullOrWhiteSpace(value) ? null : value;
            }
        }

        return null;
    }
}

namespace Panahgah.Api.Contracts;

public sealed class SocialMediaMonthlyTimeseriesResponseDto
{
    public List<SocialMediaMonthlyTimeseriesPointDto> points { get; set; } = [];
}

public sealed class SocialMediaMonthlyTimeseriesPointDto
{
    /// <summary>First day of the month (UTC), ISO date.</summary>
    public string period { get; set; } = string.Empty;

    public int post_count { get; set; }

    /// <summary>Likes + comments + shares + saves for posts in this month.</summary>
    public long total_engagement { get; set; }

    public int total_donation_referrals { get; set; }

    public decimal total_estimated_donation_value_php { get; set; }
}

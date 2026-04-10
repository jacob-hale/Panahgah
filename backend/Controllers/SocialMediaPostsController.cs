using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/social-media-posts")]
public class SocialMediaPostsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetAll()
    {
        var posts = await dbContext.social_media_posts
            .AsNoTracking()
            .OrderByDescending(p => p.created_at)
            .ToListAsync();

        return Ok(posts);
    }

    [HttpGet("post-types")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetPostTypes()
    {
        var postTypes = await dbContext.social_media_posts
            .AsNoTracking()
            .Select(p => p.post_type)
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync();

        return Ok(postTypes);
    }

    /// <summary>
    /// Monthly rollups from <c>social_media_posts</c> for charts. Includes every month in the window (zeros if no posts).
    /// </summary>
    /// <param name="months">Trailing calendar months to include (UTC month boundaries), default 12, max 24.</param>
    [HttpGet("timeseries/monthly")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetMonthlyTimeseries([FromQuery] int months = 12, CancellationToken cancellationToken = default)
    {
        months = Math.Clamp(months, 1, 24);

        var now = DateTime.UtcNow;
        var endMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startMonth = endMonth.AddMonths(-(months - 1));
        var exclusiveUpper = endMonth.AddMonths(1);

        var aggregated = await dbContext.social_media_posts
            .AsNoTracking()
            .Where(p => p.created_at >= startMonth && p.created_at < exclusiveUpper)
            .GroupBy(p => new { p.created_at.Year, p.created_at.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                post_count = g.Count(),
                total_engagement = g.Sum(p => (long)p.likes + p.comments + p.shares + p.saves),
                total_donation_referrals = g.Sum(p => p.donation_referrals),
                total_estimated_donation_value_php = g.Sum(p => p.estimated_donation_value_php),
            })
            .ToListAsync(cancellationToken);

        var lookup = aggregated.ToDictionary(x => (x.Year, x.Month));

        var points = new List<SocialMediaMonthlyTimeseriesPointDto>();
        for (var cursor = startMonth; cursor <= endMonth; cursor = cursor.AddMonths(1))
        {
            var y = cursor.Year;
            var m = cursor.Month;
            if (lookup.TryGetValue((y, m), out var row))
            {
                points.Add(new SocialMediaMonthlyTimeseriesPointDto
                {
                    period = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc).ToString("yyyy-MM-dd"),
                    post_count = row.post_count,
                    total_engagement = row.total_engagement,
                    total_donation_referrals = row.total_donation_referrals,
                    total_estimated_donation_value_php = row.total_estimated_donation_value_php,
                });
            }
            else
            {
                points.Add(new SocialMediaMonthlyTimeseriesPointDto
                {
                    period = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc).ToString("yyyy-MM-dd"),
                    post_count = 0,
                    total_engagement = 0,
                    total_donation_referrals = 0,
                    total_estimated_donation_value_php = 0,
                });
            }
        }

        return Ok(new SocialMediaMonthlyTimeseriesResponseDto { points = points });
    }
}

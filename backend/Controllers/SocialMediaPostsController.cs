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
    /// Monthly rollups from <c>social_media_posts</c> for charts (engagement + fields used for referral modeling).
    /// </summary>
    [HttpGet("timeseries/monthly")]
    [Authorize(Policy = AuthPolicies.RequireAdmin)]
    public async Task<IActionResult> GetMonthlyTimeseries(CancellationToken cancellationToken)
    {
        var rows = await dbContext.social_media_posts
            .AsNoTracking()
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
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync(cancellationToken);

        var points = rows
            .Select(x => new SocialMediaMonthlyTimeseriesPointDto
            {
                period = new DateTime(x.Year, x.Month, 1, 0, 0, 0, DateTimeKind.Utc).ToString("yyyy-MM-dd"),
                post_count = x.post_count,
                total_engagement = x.total_engagement,
                total_donation_referrals = x.total_donation_referrals,
                total_estimated_donation_value_php = x.total_estimated_donation_value_php,
            })
            .ToList();

        return Ok(new SocialMediaMonthlyTimeseriesResponseDto { points = points });
    }
}

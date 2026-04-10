using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Panahgah.Api.Contracts;
using Panahgah.Api.Services;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/public/social-feed")]
[AllowAnonymous]
public sealed class PublicSocialFeedController(
    IOptions<SocialPublicFeedOptions> options,
    InstagramPublicMediaFeedService instagramFeed) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PublicSocialFeedItemDto>>> GetFeed(
        [FromQuery] int take = 24,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 100);
        var opts = options.Value;
        var configs = opts.Items ?? [];

        var merged = new List<PublicSocialFeedItemDto>();

        if (opts.fetch_instagram_timeline)
        {
            var cap = Math.Max(take, Math.Clamp(opts.instagram_timeline_limit, 1, 200));
            var fromIg = await instagramFeed.FetchTimelineAsync(cap, cancellationToken);
            merged.AddRange(fromIg);
        }

        foreach (var c in configs)
        {
            var cfgDto = MapConfigToDto(c);
            if (cfgDto is null)
            {
                continue;
            }

            var igKey = NormalizePermalink(cfgDto.instagram_post_url);
            if (igKey is not null)
            {
                var match = merged.FirstOrDefault(r => NormalizePermalink(r.instagram_post_url) == igKey);
                if (match is not null)
                {
                    if (!string.IsNullOrWhiteSpace(cfgDto.facebook_post_url))
                    {
                        match.facebook_post_url = cfgDto.facebook_post_url;
                        match.platform = "Instagram · Facebook";
                        match.platforms = ["Instagram", "Facebook"];
                    }

                    if (!string.IsNullOrWhiteSpace(cfgDto.campaign_title))
                    {
                        match.campaign_title = cfgDto.campaign_title;
                    }

                    if (!string.IsNullOrWhiteSpace(cfgDto.caption))
                    {
                        match.caption = cfgDto.caption;
                    }

                    continue;
                }
            }

            merged.Add(cfgDto);
        }

        var ordered = merged
            .OrderByDescending(x => x.published_at_utc ?? DateTime.MinValue)
            .Take(take)
            .ToList();

        return Ok(ordered);
    }

    private static string? NormalizePermalink(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        return url.Trim().TrimEnd('/').ToLowerInvariant();
    }

    private static PublicSocialFeedItemDto? MapConfigToDto(SocialPublicFeedItemConfig c)
    {
        var ig = c.instagram_post_url?.Trim();
        var fb = c.facebook_post_url?.Trim();
        if (string.IsNullOrWhiteSpace(ig) && string.IsNullOrWhiteSpace(fb))
        {
            return null;
        }

        string[]? platformLabels = null;
        string platformLabel;
        if (!string.IsNullOrWhiteSpace(ig) && !string.IsNullOrWhiteSpace(fb))
        {
            platformLabels = ["Instagram", "Facebook"];
            platformLabel = "Instagram · Facebook";
        }
        else if (!string.IsNullOrWhiteSpace(ig))
        {
            platformLabel = "Instagram";
        }
        else
        {
            platformLabel = "Facebook";
        }

        var primary = !string.IsNullOrWhiteSpace(ig) ? ig : fb;

        DateTime? publishedAt = null;
        if (!string.IsNullOrWhiteSpace(c.published_at_utc) &&
            DateTime.TryParse(
                c.published_at_utc,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsed))
        {
            publishedAt = parsed;
        }

        return new PublicSocialFeedItemDto
        {
            platform = platformLabel,
            platforms = platformLabels,
            caption = c.caption?.Trim() ?? string.Empty,
            media_url = null,
            published_post_url = primary,
            facebook_post_url = string.IsNullOrWhiteSpace(fb) ? null : fb,
            instagram_post_url = string.IsNullOrWhiteSpace(ig) ? null : ig,
            published_at_utc = publishedAt,
            campaign_title = string.IsNullOrWhiteSpace(c.campaign_title) ? null : c.campaign_title.Trim(),
        };
    }
}

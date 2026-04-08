using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Auth;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;
using Panahgah.Api.Services;
using System.Text.Json;

namespace Panahgah.Api.Controllers;

[ApiController]
[Route("api/social-post-scheduler")]
[Authorize(Policy = AuthPolicies.RequireAdmin)]
public sealed class SocialPostSchedulerController(
    ApplicationDbContext dbContext,
    ISocialConnectionSecretResolver connectionSecretResolver,
    IHttpClientFactory httpClientFactory) : ControllerBase
{
    [HttpGet("connections")]
    public async Task<IActionResult> GetConnections()
    {
        var connections = await dbContext.social_platform_connections
            .AsNoTracking()
            .Where(c => c.is_active)
            .OrderByDescending(c => c.updated_at_utc)
            .ToListAsync();

        return Ok(connections);
    }

    [HttpPost("connections")]
    public async Task<IActionResult> UpsertConnection([FromBody] SocialPlatformConnectionUpsertDto request)
    {
        var platform = request.platform.Trim();
        var existing = await dbContext.social_platform_connections
            .FirstOrDefaultAsync(c => c.platform == platform && c.page_id == request.page_id.Trim());

        if (existing is null)
        {
            var created = new SocialPlatformConnection
            {
                platform = platform,
                account_label = request.account_label.Trim(),
                page_id = request.page_id.Trim(),
                instagram_business_account_id = string.IsNullOrWhiteSpace(request.instagram_business_account_id)
                    ? null
                    : request.instagram_business_account_id.Trim(),
                token_source = "FACEBOOK_PAGE_ACCESS_TOKEN",
                is_placeholder = request.is_placeholder,
                is_active = true,
                created_at_utc = DateTime.UtcNow,
                updated_at_utc = DateTime.UtcNow
            };
            dbContext.social_platform_connections.Add(created);
            await dbContext.SaveChangesAsync();
            return Ok(created);
        }

        existing.account_label = request.account_label.Trim();
        existing.instagram_business_account_id = string.IsNullOrWhiteSpace(request.instagram_business_account_id)
            ? null
            : request.instagram_business_account_id.Trim();
        if (string.IsNullOrWhiteSpace(existing.token_source))
        {
            existing.token_source = "FACEBOOK_PAGE_ACCESS_TOKEN";
        }
        existing.is_placeholder = request.is_placeholder;
        existing.is_active = true;
        existing.updated_at_utc = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();
        return Ok(existing);
    }

    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns()
    {
        var campaigns = await dbContext.social_campaigns
            .AsNoTracking()
            .OrderByDescending(c => c.created_at_utc)
            .ToListAsync();

        return Ok(campaigns);
    }

    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign([FromBody] SocialCampaignCreateDto request)
    {
        if (request.start_utc == default)
        {
            return BadRequest("start_utc is required.");
        }

        var campaign = new SocialCampaign
        {
            campaign_name = request.campaign_name.Trim(),
            platform = request.platform.Trim(),
            objective = request.objective.Trim(),
            start_utc = request.start_utc,
            end_utc = request.end_utc,
            status = "scheduled",
            created_at_utc = DateTime.UtcNow
        };

        dbContext.social_campaigns.Add(campaign);
        await dbContext.SaveChangesAsync();
        return Ok(campaign);
    }

    [HttpGet("scheduled-posts")]
    public async Task<IActionResult> GetScheduledPosts([FromQuery] int? campaign_id)
    {
        var query = dbContext.scheduled_social_posts.AsNoTracking().AsQueryable();
        if (campaign_id.HasValue)
        {
            query = query.Where(p => p.campaign_id == campaign_id.Value);
        }

        var posts = await query
            .OrderByDescending(p => p.scheduled_for_utc)
            .Take(250)
            .ToListAsync();

        return Ok(posts);
    }

    [HttpPost("scheduled-posts")]
    public async Task<IActionResult> CreateScheduledPost([FromBody] ScheduledSocialPostCreateDto request)
    {
        if (request.scheduled_for_utc == default)
        {
            return BadRequest("scheduled_for_utc is required.");
        }

        if (request.campaign_id.HasValue)
        {
            var campaignExists = await dbContext.social_campaigns
                .AsNoTracking()
                .AnyAsync(c => c.campaign_id == request.campaign_id.Value);
            if (!campaignExists)
            {
                return BadRequest("campaign_id does not exist.");
            }
        }

        var scheduledPost = new ScheduledSocialPost
        {
            campaign_id = request.campaign_id,
            platform = request.platform.Trim(),
            scheduled_for_utc = request.scheduled_for_utc,
            caption = request.caption.Trim(),
            media_url = string.IsNullOrWhiteSpace(request.media_url) ? null : request.media_url.Trim(),
            status = "scheduled",
            attempt_count = 0,
            created_at_utc = DateTime.UtcNow
        };

        dbContext.scheduled_social_posts.Add(scheduledPost);
        await dbContext.SaveChangesAsync();
        return Ok(scheduledPost);
    }

    [HttpGet("diagnostics/{platform}")]
    public async Task<IActionResult> GetPlatformDiagnostics(string platform, CancellationToken cancellationToken)
    {
        var resolved = await connectionSecretResolver.ResolveByPlatformAsync(platform, cancellationToken);
        if (resolved.connection is null || string.IsNullOrWhiteSpace(resolved.accessToken))
        {
            return BadRequest(new
            {
                platform,
                ok = false,
                reason = resolved.errorMessage ?? "Connection/token resolution failed."
            });
        }

        var lower = platform.Trim().ToLowerInvariant();
        var path = lower == "instagram"
            ? $"{resolved.connection.page_id}?fields=id,name,instagram_business_account{{id,username}}"
            : $"{resolved.connection.page_id}?fields=id,name";

        var url = $"https://graph.facebook.com/v25.0/{path}&access_token={Uri.EscapeDataString(resolved.accessToken)}";
        var client = httpClientFactory.CreateClient();
        var response = await client.GetAsync(url, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);

        return Ok(new
        {
            platform = lower,
            ok = response.IsSuccessStatusCode,
            status_code = (int)response.StatusCode,
            connection = new
            {
                resolved.connection.platform,
                resolved.connection.account_label,
                resolved.connection.page_id,
                resolved.connection.instagram_business_account_id,
                resolved.connection.token_source
            },
            graph = TryParseJson(body)
        });
    }

    [HttpGet("diagnostics/facebook-pages")]
    public async Task<IActionResult> GetFacebookPagesFromToken(CancellationToken cancellationToken)
    {
        var resolved = await connectionSecretResolver.ResolveByPlatformAsync("facebook", cancellationToken);
        if (resolved.connection is null || string.IsNullOrWhiteSpace(resolved.accessToken))
        {
            return BadRequest(new
            {
                ok = false,
                reason = resolved.errorMessage ?? "Facebook connection/token resolution failed."
            });
        }

        var url =
            $"https://graph.facebook.com/v25.0/me/accounts?fields=id,name,category,tasks&access_token={Uri.EscapeDataString(resolved.accessToken)}";
        var client = httpClientFactory.CreateClient();
        var meAccountsResponse = await client.GetAsync(url, cancellationToken);
        var meAccountsBody = await meAccountsResponse.Content.ReadAsStringAsync(cancellationToken);

        var pageInspectUrl =
            $"https://graph.facebook.com/v25.0/{resolved.connection.page_id}?fields=id,name,tasks&access_token={Uri.EscapeDataString(resolved.accessToken)}";
        var pageInspectResponse = await client.GetAsync(pageInspectUrl, cancellationToken);
        var pageInspectBody = await pageInspectResponse.Content.ReadAsStringAsync(cancellationToken);

        var meAccountsHasRows = TryReadArrayCount(meAccountsBody, "data") > 0;
        var pageInspectOk = pageInspectResponse.IsSuccessStatusCode;
        var recommendation = BuildFacebookTokenRecommendation(meAccountsHasRows, pageInspectOk, meAccountsBody, pageInspectBody);

        return Ok(new
        {
            ok = meAccountsResponse.IsSuccessStatusCode || pageInspectOk,
            configured_page_id = resolved.connection.page_id,
            token_source = resolved.connection.token_source,
            recommendation,
            me_accounts = new
            {
                ok = meAccountsResponse.IsSuccessStatusCode,
                status_code = (int)meAccountsResponse.StatusCode,
                graph = TryParseJson(meAccountsBody),
            },
            configured_page_check = new
            {
                ok = pageInspectOk,
                status_code = (int)pageInspectResponse.StatusCode,
                graph = TryParseJson(pageInspectBody),
            }
        });
    }

    private static object TryParseJson(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }
        catch
        {
            return new { raw = json };
        }
    }

    private static int TryReadArrayCount(string json, string arrayName)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty(arrayName, out var array) && array.ValueKind == JsonValueKind.Array)
            {
                return array.GetArrayLength();
            }
        }
        catch
        {
            // Ignore parse errors.
        }

        return 0;
    }

    private static string BuildFacebookTokenRecommendation(
        bool meAccountsHasRows,
        bool pageInspectOk,
        string meAccountsBody,
        string pageInspectBody)
    {
        if (pageInspectOk)
        {
            return "Configured page ID is reachable with this token. Use this token for publishing.";
        }

        if (meAccountsHasRows)
        {
            return "Token can list pages via /me/accounts but cannot access configured page_id. Update the saved page_id to a page from /me/accounts or regenerate token for that page.";
        }

        var meAccountsError = TryExtractGraphErrorMessage(meAccountsBody);
        var pageError = TryExtractGraphErrorMessage(pageInspectBody);
        return $"Token cannot access /me/accounts or configured page. Most likely wrong token type or missing page asset assignment in Business settings. me/accounts error: {meAccountsError}; page error: {pageError}";
    }

    private static string TryExtractGraphErrorMessage(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("error", out var error) &&
                error.TryGetProperty("message", out var messageElement) &&
                messageElement.ValueKind == JsonValueKind.String)
            {
                return messageElement.GetString() ?? "Unknown graph error";
            }
        }
        catch
        {
            // Ignore parse errors.
        }

        return "Unknown graph error";
    }
}

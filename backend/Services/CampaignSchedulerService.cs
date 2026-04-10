using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using Panahgah.Api.Contracts;
using Panahgah.Api.Data;
using Panahgah.Api.Models;

namespace Panahgah.Api.Services;

public interface ICampaignSchedulerService
{
    Task<IReadOnlyList<ScheduledSocialPost>> GenerateCampaignAsync(
        CampaignGenerateRequestDto request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScheduledSocialPost>> GenerateSingleDraftAsync(
        SinglePostGenerateRequestDto request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ScheduledSocialPost>> RegenerateDraftPostsAsync(
        DraftRegenerateRequestDto request,
        CancellationToken cancellationToken = default);
}

public sealed class CampaignSchedulerService(
    ApplicationDbContext dbContext,
    IWebHostEnvironment environment,
    IConfiguration configuration,
    IMemoryCache memoryCache,
    IMediaAssetSelector mediaAssetSelector,
    ISocialPostGenerator socialPostGenerator) : ICampaignSchedulerService
{
    private const string InsightsCacheKey = "model5_scored_insights_v1";

    public async Task<IReadOnlyList<ScheduledSocialPost>> GenerateCampaignAsync(
        CampaignGenerateRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var platforms = ResolvePlatforms(request.post_to_facebook, request.post_to_instagram);

        var insights = await ScoreInsightsAsync(cancellationToken);
        var slots = BuildSlots(insights, request.start_utc, request.end_utc, request.posts_per_week);
        if (slots.Count == 0)
        {
            return [];
        }
        var maxSlots = ResolveMaxDraftSlotsPerRequest();
        if (slots.Count > maxSlots)
        {
            throw new InvalidOperationException(
                $"This range would generate {slots.Count} posts, which can time out in deployment. " +
                $"Limit the date range or posts/week to {maxSlots} posts or fewer per request.");
        }

        var campaign = new SocialCampaign
        {
            campaign_name = request.campaign_name.Trim(),
            platform = string.Join("+", platforms),
            objective = request.campaign_goal.Trim(),
            start_utc = request.start_utc,
            end_utc = request.end_utc,
            status = "draft",
            created_at_utc = DateTime.UtcNow
        };
        dbContext.social_campaigns.Add(campaign);
        await dbContext.SaveChangesAsync(cancellationToken);

        var created = await BuildDraftsForSlotsAsync(
            slots,
            campaign.campaign_id,
            request.post_topic,
            request.campaign_goal,
            request.tone,
            request.include_resident_story,
            request.media_category,
            request.post_type,
            platforms,
            insights,
            request.campaign_name.Trim(),
            cancellationToken);

        await dbContext.SaveChangesAsync(cancellationToken);
        return created;
    }

    public async Task<IReadOnlyList<ScheduledSocialPost>> GenerateSingleDraftAsync(
        SinglePostGenerateRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var platforms = ResolvePlatforms(request.post_to_facebook, request.post_to_instagram);
        var insights = await ScoreInsightsAsync(cancellationToken);
        var slots = new List<DateTime> { request.scheduled_for_utc };
        var created = await BuildDraftsForSlotsAsync(
            slots,
            null,
            request.post_topic,
            request.goal,
            request.tone,
            request.include_resident_story,
            request.media_category,
            request.post_type,
            platforms,
            insights,
            request.post_topic.Trim(),
            cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
        return created;
    }

    public async Task<IReadOnlyList<ScheduledSocialPost>> RegenerateDraftPostsAsync(
        DraftRegenerateRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var ids = request.scheduled_post_ids.Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0)
        {
            throw new InvalidOperationException("scheduled_post_ids is required.");
        }

        var posts = await dbContext.scheduled_social_posts
            .Where(p => ids.Contains(p.scheduled_post_id))
            .ToListAsync(cancellationToken);
        if (posts.Count != ids.Count)
        {
            throw new InvalidOperationException("One or more scheduled posts were not found.");
        }

        if (posts.Any(p => !string.Equals(p.status, "draft", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException("Regenerate is only allowed for draft posts.");
        }

        var insights = await ScoreInsightsAsync(cancellationToken);
        var platforms = posts
            .Select(p => p.platform.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(p => string.Equals(p, "Facebook", StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ToList();
        var primaryPlatform = platforms[0];

        var avoidUrls = posts
            .Select(p => p.media_url?.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var asset = await SelectAssetAvoidingUrlsAsync(
            request.media_category,
            primaryPlatform,
            avoidUrls,
            cancellationToken);
        if (asset is null || string.IsNullOrWhiteSpace(asset.url))
        {
            throw new InvalidOperationException("Could not pick a new image. Try another media category.");
        }

        var normalizedPrimaryPlatform = primaryPlatform.ToLowerInvariant();
        var bestPostType = insights.best_post_type_by_platform
                .FirstOrDefault(x => x.platform.Equals(primaryPlatform, StringComparison.OrdinalIgnoreCase))
                ?.post_type
            ?? await ResolveFallbackPostTypeAsync(normalizedPrimaryPlatform, cancellationToken)
            ?? "photo";
        if (!string.IsNullOrWhiteSpace(request.post_type))
        {
            bestPostType = request.post_type.Trim();
        }

        var effectiveCategory = asset.category;
        var imageContext = BuildImageContext(asset, effectiveCategory);
        var generated = await socialPostGenerator.GenerateAsync(new SocialPostGenerateRequestDto
        {
            platform = primaryPlatform,
            goal = request.goal.Trim(),
            post_type = bestPostType,
            post_topic = request.post_topic.Trim(),
            tone = request.tone.Trim(),
            include_resident_story = request.include_resident_story,
            key_details = imageContext
        }, insights, cancellationToken);

        var rawCaption = generated.generated_posts.FirstOrDefault()?.caption;
        var normalizedCaption = SocialCaptionFormatting.NormalizeAiCaption(rawCaption);
        var captionBody = string.IsNullOrEmpty(normalizedCaption)
            ? $"Support {request.goal.Trim()} for Panahgah Refuge."
            : normalizedCaption;
        var caption = SocialCaptionFormatting.EnsurePanahgahHashtag(captionBody);

        foreach (var p in posts)
        {
            p.caption = caption;
            p.media_url = asset.url;
            p.error_message = null;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return posts;
    }

    private async Task<SelectedMediaAsset?> SelectAssetAvoidingUrlsAsync(
        string requestedCategory,
        string primaryPlatform,
        IReadOnlySet<string> avoidUrls,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 16;
        for (var attempt = 0; attempt < maxAttempts; attempt += 1)
        {
            SelectedMediaAsset? asset;
            var useRandom = string.IsNullOrWhiteSpace(requestedCategory) ||
                            requestedCategory.Equals("random", StringComparison.OrdinalIgnoreCase);
            if (useRandom)
            {
                var categories = await mediaAssetSelector.ListCategoriesAsync(cancellationToken);
                if (categories.Count == 0)
                {
                    return null;
                }

                var cat = categories[Random.Shared.Next(categories.Count)];
                asset = await mediaAssetSelector.SelectAsync(cat, primaryPlatform, cancellationToken);
            }
            else
            {
                asset = await mediaAssetSelector.SelectAsync(requestedCategory.Trim(), primaryPlatform, cancellationToken);
            }

            if (asset is null || string.IsNullOrWhiteSpace(asset.url))
            {
                continue;
            }

            if (!avoidUrls.Contains(asset.url.Trim()))
            {
                return asset;
            }
        }

        var fallbackCategories = await mediaAssetSelector.ListCategoriesAsync(cancellationToken);
        for (var i = 0; i < 8; i += 1)
        {
            if (fallbackCategories.Count == 0)
            {
                break;
            }

            var cat = fallbackCategories[Random.Shared.Next(fallbackCategories.Count)];
            var fallback = await mediaAssetSelector.SelectAsync(cat, primaryPlatform, cancellationToken);
            if (fallback is not null && !string.IsNullOrWhiteSpace(fallback.url))
            {
                return fallback;
            }
        }

        return null;
    }

    private async Task<List<ScheduledSocialPost>> BuildDraftsForSlotsAsync(
        IReadOnlyList<DateTime> slots,
        int? campaignId,
        string postTopic,
        string goal,
        string tone,
        bool includeResidentStory,
        string requestedCategory,
        string? requestedPostType,
        IReadOnlyList<string> platforms,
        Model5InsightsResponseDto insights,
        string? campaignTitle,
        CancellationToken cancellationToken)
    {
        var created = new List<ScheduledSocialPost>();
        var allCategories = await mediaAssetSelector.ListCategoriesAsync(cancellationToken);
        var useRandomCategoryEachSlot = string.IsNullOrWhiteSpace(requestedCategory) ||
                                        requestedCategory.Equals("random", StringComparison.OrdinalIgnoreCase);
        if (useRandomCategoryEachSlot && allCategories.Count == 0)
        {
            throw new InvalidOperationException(
                "No campaign media categories available. Add images under frontend/public/campaign-media/<category>/ or configure Social:MediaRootPath / fallback list in MediaAssetSelector.");
        }

        var usedMediaUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var plans = new List<(DateTime slot, SelectedMediaAsset asset, string primaryPlatform, string bestPostType, string imageContext)>();
        foreach (var slot in slots)
        {
            var primaryPlatform = platforms[0];
            var normalizedPrimaryPlatform = primaryPlatform.Trim().ToLowerInvariant();
            var bestPostType = insights.best_post_type_by_platform
                .FirstOrDefault(x => x.platform.Equals(primaryPlatform, StringComparison.OrdinalIgnoreCase))
                ?.post_type
                ?? await ResolveFallbackPostTypeAsync(normalizedPrimaryPlatform, cancellationToken)
                ?? "photo";
            if (!string.IsNullOrWhiteSpace(requestedPostType))
            {
                bestPostType = requestedPostType.Trim();
            }

            var asset = await PickDistinctCampaignAssetAsync(
                useRandomCategoryEachSlot,
                useRandomCategoryEachSlot ? string.Empty : requestedCategory.Trim(),
                allCategories,
                primaryPlatform,
                usedMediaUrls,
                cancellationToken);
            usedMediaUrls.Add(asset.url.Trim());

            var imageContext = BuildImageContext(asset, asset.category);
            plans.Add((slot, asset, primaryPlatform, bestPostType, imageContext));
        }

        // Captions are the slow part (LLM). Run slot generations concurrently with a small cap so
        // 3 posts doesn't have to wait for 3 sequential LLM calls.
        var configuredConcurrency = configuration["Social:CampaignGenerateCaptionConcurrency"];
        var maxConcurrency = int.TryParse(configuredConcurrency, out var c) ? Math.Clamp(c, 1, 4) : 2;
        using var semaphore = new SemaphoreSlim(maxConcurrency, maxConcurrency);

        var aiPlansCount = ResolveMaxAiCaptionCallsPerCampaign(plans.Count);
        var aiPlans = plans.Take(aiPlansCount).ToList();
        var captionTasks = aiPlans.Select(async plan =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                var generated = await socialPostGenerator.GenerateAsync(new SocialPostGenerateRequestDto
                {
                    platform = plan.primaryPlatform,
                    goal = goal.Trim(),
                    post_type = plan.bestPostType,
                    post_topic = postTopic.Trim(),
                    tone = tone.Trim(),
                    include_resident_story = includeResidentStory,
                    key_details = plan.imageContext
                }, insights, cancellationToken);

                var rawCaption = generated.generated_posts.FirstOrDefault()?.caption;
                var normalizedCaption = SocialCaptionFormatting.NormalizeAiCaption(rawCaption);
                var captionBody = string.IsNullOrEmpty(normalizedCaption)
                    ? $"Support {goal.Trim()} for Panahgah Refuge."
                    : normalizedCaption;
                var caption = SocialCaptionFormatting.EnsurePanahgahHashtag(captionBody);
                return (plan.slot, plan.asset, caption);
            }
            finally
            {
                semaphore.Release();
            }
        }).ToList();

        var aiCaptions = await Task.WhenAll(captionTasks);
        var rowsWithCaptions = new List<(DateTime slot, SelectedMediaAsset asset, string caption)>(plans.Count);
        for (var i = 0; i < plans.Count; i += 1)
        {
            var plan = plans[i];
            var chosenCaption = aiCaptions[i % aiCaptions.Length].caption;
            rowsWithCaptions.Add((plan.slot, plan.asset, chosenCaption));
        }

        foreach (var row in rowsWithCaptions)
        {
            foreach (var platform in platforms)
            {
                var scheduledPost = new ScheduledSocialPost
                {
                    campaign_id = campaignId,
                    campaign_title = string.IsNullOrWhiteSpace(campaignTitle) ? null : campaignTitle.Trim(),
                    platform = platform,
                    scheduled_for_utc = row.slot,
                    caption = row.caption,
                    media_url = row.asset.url,
                    status = "draft",
                    attempt_count = 0,
                    created_at_utc = DateTime.UtcNow
                };

                dbContext.scheduled_social_posts.Add(scheduledPost);
                created.Add(scheduledPost);
            }
        }

        return created;
    }

    /// <summary>
    /// Prefer a different image URL per campaign slot when the library has enough files; avoids every draft
    /// pointing at the same random pick (which made live posts look identical to each other).
    /// </summary>
    private async Task<SelectedMediaAsset> PickDistinctCampaignAssetAsync(
        bool useRandomCategoryEachSlot,
        string effectiveCategoryForFixed,
        IReadOnlyList<string> allCategories,
        string primaryPlatform,
        HashSet<string> usedUrls,
        CancellationToken cancellationToken)
    {
        const int maxDistinctAttempts = 48;
        for (var attempt = 0; attempt < maxDistinctAttempts; attempt++)
        {
            string cat;
            if (useRandomCategoryEachSlot)
            {
                if (allCategories.Count == 0)
                {
                    throw new InvalidOperationException("No campaign-media categories.");
                }

                cat = allCategories[Random.Shared.Next(allCategories.Count)];
            }
            else
            {
                cat = string.IsNullOrWhiteSpace(effectiveCategoryForFixed)
                    ? throw new InvalidOperationException("Media category is required.")
                    : effectiveCategoryForFixed.Trim();
            }

            var asset = await mediaAssetSelector.SelectAsync(cat, primaryPlatform, cancellationToken);
            if (asset is null || string.IsNullOrWhiteSpace(asset.url))
            {
                continue;
            }

            var url = asset.url.Trim();
            if (!usedUrls.Contains(url))
            {
                return asset;
            }
        }

        const int fallbackAttempts = 24;
        for (var attempt = 0; attempt < fallbackAttempts; attempt++)
        {
            string cat;
            if (useRandomCategoryEachSlot)
            {
                cat = allCategories[Random.Shared.Next(allCategories.Count)];
            }
            else
            {
                cat = effectiveCategoryForFixed.Trim();
            }

            var asset = await mediaAssetSelector.SelectAsync(cat, primaryPlatform, cancellationToken);
            if (asset is not null && !string.IsNullOrWhiteSpace(asset.url))
            {
                return asset;
            }
        }

        throw new InvalidOperationException(
            "Could not pick a campaign image. Add PNG/JPG files under frontend/public/campaign-media/<category>/.");
    }

    private static List<string> ResolvePlatforms(bool postToFacebook, bool postToInstagram)
    {
        var platforms = new List<string>();
        if (postToFacebook) platforms.Add("Facebook");
        if (postToInstagram) platforms.Add("Instagram");
        if (platforms.Count == 0)
        {
            throw new InvalidOperationException("At least one platform must be selected.");
        }

        return platforms;
    }

    private static string BuildImageContext(SelectedMediaAsset? asset, string category)
    {
        if (asset is null)
        {
            return $"Image category: {category.Trim()}.";
        }

        var details = new List<string> { $"Image category: {asset.category}" };
        if (!string.IsNullOrWhiteSpace(asset.alt_text))
        {
            details.Add($"Image description: {asset.alt_text.Trim()}");
        }
        if (!string.IsNullOrWhiteSpace(asset.tags))
        {
            details.Add($"Image tags: {asset.tags.Trim()}");
        }
        return string.Join(". ", details);
    }

    private async Task<string?> ResolveFallbackPostTypeAsync(string normalizedPlatform, CancellationToken cancellationToken)
    {
        return await dbContext.social_media_posts
            .AsNoTracking()
            .Where(p => p.platform.ToLower() == normalizedPlatform)
            .OrderByDescending(p => p.donation_referrals)
            .Select(p => p.post_type)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private List<DateTime> BuildSlots(Model5InsightsResponseDto insights, DateTime startUtc, DateTime endUtc, int postsPerWeek)
    {
        if (endUtc <= startUtc)
        {
            return [];
        }

        var postsPerWeekSafe = Math.Max(1, Math.Min(14, postsPerWeek));
        var maxSlots = Math.Max(1, (int)Math.Ceiling((endUtc - startUtc).TotalDays / 7d) * postsPerWeekSafe);
        var templates = insights.best_windows
            .OrderByDescending(w => w.uplift_pct)
            .Take(postsPerWeekSafe)
            .ToList();
        if (templates.Count == 0)
        {
            templates.Add(new Model5PostingWindowDto { day_of_week = "Wednesday", post_hour = 16, uplift_pct = 0 });
        }

        // ML post_hour + day_of_week are interpreted in India time (configurable) so draft clock times match insight rows.
        var insightsTz = ResolveInsightsScheduleTimeZone();
        var startUtcNorm = NormalizeUtc(startUtc);
        var endUtcNorm = NormalizeUtc(endUtc);

        // Preserve ML rank order (#1 = strongest window) so draft i aligns with insight row i, not calendar sort.
        var generated = new List<DateTime>();
        var used = new HashSet<long>();
        for (var i = 0; i < postsPerWeekSafe && generated.Count < maxSlots; i += 1)
        {
            var w = templates[i % templates.Count];
            var weekOffset = i / templates.Count;
            var slot = FindNthOccurrenceInRange(startUtcNorm, endUtcNorm, w, weekOffset, insightsTz);
            if (!slot.HasValue)
            {
                continue;
            }

            var key = slot.Value.Ticks;
            if (used.Add(key))
            {
                generated.Add(slot.Value);
            }
        }

        if (generated.Count == 0)
        {
            var desiredCount = Math.Max(1, Math.Min(postsPerWeekSafe, maxSlots));
            var totalWindow = endUtcNorm - startUtcNorm;
            var secondsStep = Math.Max(1, totalWindow.TotalSeconds / desiredCount);

            for (var i = 0; i < desiredCount; i += 1)
            {
                var offsetSeconds = (int)Math.Round(secondsStep * i);
                var candidate = startUtcNorm.AddSeconds(offsetSeconds);
                if (candidate > endUtcNorm)
                {
                    candidate = endUtcNorm;
                }

                if (candidate >= startUtcNorm && candidate <= endUtcNorm)
                {
                    generated.Add(candidate);
                }
            }
        }

        return generated;
    }

    private TimeZoneInfo ResolveInsightsScheduleTimeZone()
    {
        var id = configuration["Social:InsightsScheduleTimeZoneId"];
        if (string.IsNullOrWhiteSpace(id))
        {
            id = "Asia/Kolkata";
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch
        {
            return TimeZoneInfo.Utc;
        }
    }

    private static DateTime NormalizeUtc(DateTime dt) =>
        dt.Kind switch
        {
            DateTimeKind.Utc => dt,
            DateTimeKind.Local => dt.ToUniversalTime(),
            _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
        };

    private static DateTime? FindNthOccurrenceInRange(
        DateTime startUtc,
        DateTime endUtc,
        Model5PostingWindowDto w,
        int weekSkip,
        TimeZoneInfo insightsTz)
    {
        var first = FindFirstSlotInRange(startUtc, endUtc, w, insightsTz);
        if (!first.HasValue)
        {
            return null;
        }

        var candidate = first.Value.AddDays(7 * weekSkip);
        if (candidate > endUtc || candidate < startUtc)
        {
            return null;
        }

        return candidate;
    }

    /// <summary>
    /// Places <paramref name="w"/>.post_hour on <paramref name="w"/>.day_of_week in <paramref name="insightsTz"/>, then returns UTC.
    /// </summary>
    private static DateTime? FindFirstSlotInRange(
        DateTime startUtc,
        DateTime endUtc,
        Model5PostingWindowDto w,
        TimeZoneInfo insightsTz)
    {
        var dow = ParseDayOfWeek(w.day_of_week);
        var hour = w.post_hour ?? 16;

        if (insightsTz.Equals(TimeZoneInfo.Utc))
        {
            var candidateUtc = startUtc.Date;
            var deltaUtc = ((int)dow - (int)candidateUtc.DayOfWeek + 7) % 7;
            candidateUtc = candidateUtc.AddDays(deltaUtc).AddHours(hour);
            while (candidateUtc < startUtc)
            {
                candidateUtc = candidateUtc.AddDays(7);
            }

            return candidateUtc > endUtc ? null : candidateUtc;
        }

        var startInTz = TimeZoneInfo.ConvertTimeFromUtc(startUtc, insightsTz);
        var localCalStart = startInTz.Date;
        var delta = ((int)dow - (int)localCalStart.DayOfWeek + 7) % 7;
        var targetLocalDate = localCalStart.AddDays(delta);
        var localComposite = new DateTime(
            targetLocalDate.Year,
            targetLocalDate.Month,
            targetLocalDate.Day,
            hour,
            0,
            0,
            DateTimeKind.Unspecified);
        var utc = TimeZoneInfo.ConvertTimeToUtc(localComposite, insightsTz);

        while (utc < startUtc)
        {
            targetLocalDate = targetLocalDate.AddDays(7);
            localComposite = new DateTime(
                targetLocalDate.Year,
                targetLocalDate.Month,
                targetLocalDate.Day,
                hour,
                0,
                0,
                DateTimeKind.Unspecified);
            utc = TimeZoneInfo.ConvertTimeToUtc(localComposite, insightsTz);
        }

        if (utc > endUtc)
        {
            return null;
        }

        return utc;
    }

    private static DayOfWeek ParseDayOfWeek(string dayName)
    {
        return Enum.TryParse<DayOfWeek>(dayName, true, out var day) ? day : DayOfWeek.Wednesday;
    }

    private int ResolveMaxDraftSlotsPerRequest()
    {
        var configured = configuration["Social:CampaignGenerateMaxSlots"];
        return int.TryParse(configured, out var n) && n > 0
            ? Math.Min(n, 50)
            : 24;
    }

    private int ResolveMaxAiCaptionCallsPerCampaign(int slotCount)
    {
        var configured = configuration["Social:CampaignGenerateMaxAiCalls"];
        var maxCalls = int.TryParse(configured, out var n) && n > 0
            ? Math.Min(n, 8)
            : 2;
        return Math.Min(Math.Max(1, maxCalls), Math.Max(1, slotCount));
    }

    private async Task<Model5InsightsResponseDto> ScoreInsightsAsync(CancellationToken cancellationToken)
    {
        // Avoid rerunning Python scoring on every request; it can take tens of seconds.
        // This helps both campaign generation and single-post drafts.
        var cacheMinutesRaw = configuration["Ml:Model5InsightsCacheMinutes"];
        var cacheMinutes = int.TryParse(cacheMinutesRaw, out var m) ? Math.Clamp(m, 0, 60) : 5;
        if (cacheMinutes > 0 && memoryCache.TryGetValue<Model5InsightsResponseDto>(InsightsCacheKey, out var cached) && cached is not null)
        {
            return cached;
        }

        var posts = await dbContext.social_media_posts
            .AsNoTracking()
            .Select(p => new
            {
                p.platform,
                p.day_of_week,
                p.post_hour,
                p.post_type,
                p.media_type,
                p.num_hashtags,
                p.mentions_count,
                p.has_call_to_action,
                p.call_to_action_type,
                p.content_topic,
                p.sentiment_tone,
                p.caption_length,
                p.features_resident_story,
                p.campaign_name,
                p.is_boosted,
                p.boost_budget_php
            })
            .ToListAsync(cancellationToken);

        if (posts.Count == 0)
        {
            return new Model5InsightsResponseDto();
        }

        var contentRoot = environment.ContentRootPath;
        var defaultScriptPath = Path.Combine(contentRoot, "ML", "model_5_score.py");
        var defaultModelPath = Path.Combine(contentRoot, "ML", "artifacts", "model5_predictive.joblib");
        var scriptPath = configuration["Ml:Model5ScriptPath"] ?? defaultScriptPath;
        var modelPath = configuration["Ml:Model5ModelPath"] ?? defaultModelPath;
        var pythonExecutable = ResolvePythonExecutable();

        if (!File.Exists(scriptPath) || !File.Exists(modelPath))
        {
            return new Model5InsightsResponseDto();
        }

        var inputJson = JsonSerializer.Serialize(new { posts });
        var startInfo = new ProcessStartInfo
        {
            FileName = pythonExecutable,
            Arguments = $"\"{scriptPath}\" --model-path \"{modelPath}\"",
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = new Process { StartInfo = startInfo };
        process.Start();
        await process.StandardInput.WriteAsync(inputJson);
        process.StandardInput.Close();

        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync(cancellationToken);
        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException($"Model 5 scoring failed: {stderr}");
        }

        var parsed = JsonSerializer.Deserialize<Model5InsightsResponseDto>(stdout);
        var result = parsed ?? new Model5InsightsResponseDto();
        if (cacheMinutes > 0)
        {
            memoryCache.Set(InsightsCacheKey, result, TimeSpan.FromMinutes(cacheMinutes));
        }
        return result;
    }

    private string ResolvePythonExecutable()
    {
        var configured = configuration["Ml:PythonExecutable"];
        if (!string.IsNullOrWhiteSpace(configured))
        {
            return configured;
        }

        return OperatingSystem.IsWindows() ? "python" : "/opt/venv/bin/python";
    }
}

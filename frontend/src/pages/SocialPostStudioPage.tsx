import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type {
  CampaignGeneratePayload,
  DraftRegeneratePayload,
  Model5InsightsResponse,
  Model5PostingWindow,
  Model5PostTypeByPlatform,
  ScheduledSocialPost,
  ScheduledSocialPostBulkActionPayload,
  ScheduledSocialPostUpdatePayload,
  SinglePostGeneratePayload,
  SocialPostGenerateRequest,
} from '../api/types';

const norm = (s: string) => s.trim().toLowerCase();

function pickBestWindow(windows: Model5PostingWindow[]): Model5PostingWindow | undefined {
  if (!windows?.length) {
    return undefined;
  }
  return [...windows].sort((a, b) => (b.uplift_pct ?? 0) - (a.uplift_pct ?? 0))[0];
}

function pickPostTypeRow(rows: Model5PostTypeByPlatform[], platform: string): Model5PostTypeByPlatform | undefined {
  if (!rows?.length) {
    return undefined;
  }
  const p = norm(platform);
  const match = rows.find((r) => norm(r.platform) === p);
  if (match) {
    return match;
  }
  return [...rows].sort((a, b) => (b.uplift_pct ?? 0) - (a.uplift_pct ?? 0))[0];
}

function resolvePostType(suggested: string, options: string[]): string {
  if (!suggested) {
    return options[0] ?? '';
  }
  if (options.length === 0) {
    return suggested;
  }
  const low = suggested.trim().toLowerCase();
  const exact = options.find((o) => o.trim().toLowerCase() === low);
  if (exact) {
    return exact;
  }
  const partial = options.find((o) => o.toLowerCase().includes(low) || low.includes(o.toLowerCase()));
  return partial ?? options[0] ?? suggested;
}

function storyFromInsights(storyEffect: Model5InsightsResponse['story_effect']): boolean | null {
  if (!storyEffect) {
    return null;
  }
  if (storyEffect.with_story_count === 0 && storyEffect.without_story_count === 0) {
    return null;
  }
  return storyEffect.with_story_avg >= storyEffect.without_story_avg;
}

/** Next local datetime matching ML window (for datetime-local inputs). */
function nextDatetimeLocalForWindow(dayName: string, hour: number | null): string {
  const hourSafe = Math.min(23, Math.max(0, hour ?? 18));
  const map: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const targetDow = map[norm(dayName)];
  if (targetDow === undefined) {
    return '';
  }
  const now = new Date();
  for (let add = 0; add < 14; add += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() + add);
    if (d.getDay() !== targetDow) {
      continue;
    }
    d.setHours(hourSafe, 0, 0, 0);
    if (d > now) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day}T${h}:${min}`;
    }
  }
  return '';
}

function hasInsightsData(ins: Model5InsightsResponse): boolean {
  return (
    (ins.best_post_type_by_platform?.length ?? 0) > 0 ||
    (ins.best_windows?.length ?? 0) > 0 ||
    (ins.story_effect &&
      (ins.story_effect.with_story_count > 0 || ins.story_effect.without_story_count > 0))
  );
}

function toDateTimeLocalValue(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function resolvePreviewMediaUrl(mediaUrl: string | null): string | null {
  if (!mediaUrl) return null;
  const marker = '/campaign-media/';
  const idx = mediaUrl.toLowerCase().indexOf(marker);
  if (idx >= 0) {
    return mediaUrl.substring(idx);
  }
  return mediaUrl;
}

const defaultPayload: SocialPostGenerateRequest = {
  platform: 'Instagram',
  goal: 'Donations',
  post_type: '',
  post_topic: '',
  include_resident_story: true,
  tone: 'Empathetic and hopeful',
  key_details: null,
};

const toneOptions = [
  'Empathetic and hopeful',
  'Empathetic and urgent',
  'Warm and grateful',
  'Professional and informative',
  'Inspirational and uplifting',
  'Advocacy-focused and bold',
  'Community-centered and inclusive',
  'Celebratory and positive',
];

export function SocialPostStudioPage() {
  const [payload, setPayload] = useState<SocialPostGenerateRequest>(defaultPayload);
  const [postTypeOptions, setPostTypeOptions] = useState<string[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledSocialPost[]>([]);
  const [mediaCategories, setMediaCategories] = useState<string[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [generateCampaignMessage, setGenerateCampaignMessage] = useState<string | null>(null);
  const [generateCampaignError, setGenerateCampaignError] = useState<string | null>(null);
  const [campaignGeneratePayload, setCampaignGeneratePayload] = useState<CampaignGeneratePayload>({
    campaign_name: '',
    campaign_goal: 'Donations',
    post_topic: '',
    media_category: 'random',
    tone: 'Empathetic and hopeful',
    post_type: '',
    start_utc: '',
    end_utc: '',
    posts_per_week: 3,
    include_resident_story: true,
    post_to_facebook: true,
    post_to_instagram: true,
  });
  const [postTypesReady, setPostTypesReady] = useState(false);
  const insightsAppliedOnce = useRef(false);
  const payloadRef = useRef<SocialPostGenerateRequest>(defaultPayload);
  payloadRef.current = payload;
  const [activeTab] = useState<'schedule'>('schedule');
  const [scheduleSubTab, setScheduleSubTab] = useState<'drafts' | 'queue'>('drafts');
  const [selectedDraftIds, setSelectedDraftIds] = useState<number[]>([]);
  const [queueFilter, setQueueFilter] = useState<'all' | 'scheduled' | 'publishing' | 'published' | 'failed'>('all');
  const [scheduleInsights, setScheduleInsights] = useState<Model5InsightsResponse | null>(null);
  const [isGeneratingSinglePost, setIsGeneratingSinglePost] = useState(false);
  const [regeneratingDraftKey, setRegeneratingDraftKey] = useState<string | null>(null);
  const [queueEditKey, setQueueEditKey] = useState<string | null>(null);
  const [singlePostPayload, setSinglePostPayload] = useState<SinglePostGeneratePayload>({
    post_topic: '',
    goal: 'Donations',
    tone: 'Empathetic and hopeful',
    post_type: '',
    media_category: 'random',
    include_resident_story: true,
    scheduled_for_utc: '',
    post_to_facebook: true,
    post_to_instagram: true,
  });

  const applyInsightsToForms = (
    ins: Model5InsightsResponse,
    postTypes: string[],
    base: SocialPostGenerateRequest,
  ) => {
    const row = pickPostTypeRow(ins.best_post_type_by_platform ?? [], base.platform);
    const windowPick = pickBestWindow(ins.best_windows ?? []);
    const story = storyFromInsights(ins.story_effect);

    let nextPlatform = base.platform;
    let nextPostType = base.post_type;
    if (row) {
      nextPlatform = row.platform?.trim() || nextPlatform;
      nextPostType = resolvePostType(row.post_type, postTypes);
    } else if (postTypes.length > 0 && !nextPostType) {
      nextPostType = postTypes[0];
    }

    setPayload({
      ...base,
      platform: nextPlatform,
      post_type: postTypes.length > 0 ? resolvePostType(nextPostType, postTypes) : nextPostType,
      include_resident_story: story !== null ? story : base.include_resident_story,
    });

    const scheduleLocal = windowPick
      ? nextDatetimeLocalForWindow(windowPick.day_of_week, windowPick.post_hour)
      : '';

    setCampaignGeneratePayload((curr) => ({
      ...curr,
      start_utc: scheduleLocal || curr.start_utc,
    }));
    setSinglePostPayload((curr) => ({
      ...curr,
      scheduled_for_utc: scheduleLocal || curr.scheduled_for_utc,
    }));

  };

  useEffect(() => {
    const loadPostTypes = async () => {
      try {
        const postTypes = await apiFetch<string[]>('/api/social-media-posts/post-types');
        setPostTypeOptions(postTypes);
        if (postTypes.length > 0) {
          setPayload((curr) => ({ ...curr, post_type: curr.post_type || postTypes[0] }));
        }
      } catch {
        setPostTypeOptions([]);
      } finally {
        setPostTypesReady(true);
      }
    };

    void loadPostTypes();
  }, []);

  useEffect(() => {
    if (!postTypesReady || insightsAppliedOnce.current) {
      return;
    }
    void (async () => {
      try {
        const ins = await apiFetch<Model5InsightsResponse>('/api/ml/model5/insights');
        if (!hasInsightsData(ins)) {
          return;
        }
        insightsAppliedOnce.current = true;
        applyInsightsToForms(ins, postTypeOptions, payloadRef.current);
      } catch {
        // No insights / not trained yet — keep defaults
      }
    })();
  }, [postTypesReady, postTypeOptions]);


  const loadSchedulingData = useCallback(async () => {
    try {
      const [postData, mediaCategoryData] = await Promise.all([
        apiFetch<ScheduledSocialPost[]>('/api/social-post-scheduler/scheduled-posts'),
        apiFetch<string[]>('/api/social-post-scheduler/media-categories'),
      ]);
      setScheduledPosts(postData);
      setMediaCategories(mediaCategoryData);
      setSelectedDraftIds([]);
      try {
        const ins = await apiFetch<Model5InsightsResponse>('/api/ml/model5/insights');
        setScheduleInsights(ins);
      } catch {
        setScheduleInsights(null);
      }
    } catch {
      setScheduleError('Unable to load campaign scheduler data.');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'schedule') {
      void loadSchedulingData();
    }
  }, [activeTab, loadSchedulingData]);

  const handleGenerateCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScheduleError(null);
    setGenerateCampaignError(null);
    setGenerateCampaignMessage('Generating draft posts... this can take up to 1-2 minutes.');
    setIsGeneratingCampaign(true);
    try {
      const created = await apiFetch<ScheduledSocialPost[]>('/api/social-post-scheduler/campaigns/generate', {
        method: 'POST',
        jsonBody: {
          ...campaignGeneratePayload,
          start_utc: new Date(campaignGeneratePayload.start_utc).toISOString(),
          end_utc: new Date(campaignGeneratePayload.end_utc).toISOString(),
          posts_per_week: Math.max(1, Number(campaignGeneratePayload.posts_per_week) || 1),
        },
      });
      setCampaignGeneratePayload((curr) => ({
        ...curr,
        campaign_name: '',
        post_topic: '',
        start_utc: '',
        end_utc: '',
      }));
      await loadSchedulingData();
      setGenerateCampaignMessage(`Success: generated ${created.length} draft post${created.length === 1 ? '' : 's'}. Review and confirm below.`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to auto-generate campaign posts.';
      setGenerateCampaignError(message);
      setScheduleError(message);
      setGenerateCampaignMessage(null);
    } finally {
      setIsGeneratingCampaign(false);
    }
  };


  const handleGenerateSinglePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScheduleError(null);
    setIsGeneratingSinglePost(true);
    try {
      await apiFetch<ScheduledSocialPost[]>('/api/social-post-scheduler/scheduled-posts/generate-single', {
        method: 'POST',
        jsonBody: {
          ...singlePostPayload,
          scheduled_for_utc: new Date(singlePostPayload.scheduled_for_utc).toISOString(),
        },
      });
      setSinglePostPayload((curr) => ({
        ...curr,
        post_topic: '',
        scheduled_for_utc: '',
      }));
      await loadSchedulingData();
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to generate single post draft.');
    } finally {
      setIsGeneratingSinglePost(false);
    }
  };

  const handleUpdateDraft = async (post: ScheduledSocialPost) => {
    setScheduleError(null);
    try {
      const updatePayload: ScheduledSocialPostUpdatePayload = {
        caption: post.caption,
        media_url: post.media_url ?? null,
        scheduled_for_utc: new Date(post.scheduled_for_utc).toISOString(),
      };
      const updated = await apiFetch<ScheduledSocialPost>(`/api/social-post-scheduler/scheduled-posts/${post.scheduled_post_id}`, {
        method: 'PATCH',
        jsonBody: updatePayload,
      });
      setScheduledPosts((curr) => curr.map((p) => (p.scheduled_post_id === updated.scheduled_post_id ? updated : p)));
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to update draft.');
    }
  };

  const handleConfirmSelectedDrafts = async () => {
    setScheduleError(null);
    try {
      const payloadBulk: ScheduledSocialPostBulkActionPayload = { scheduled_post_ids: selectedDraftIds };
      await apiFetch<ScheduledSocialPost[]>('/api/social-post-scheduler/scheduled-posts/confirm', {
        method: 'POST',
        jsonBody: payloadBulk,
      });
      await loadSchedulingData();
      setScheduleSubTab('queue');
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to confirm drafts.');
    }
  };

  const handleDeletePastQueueRecords = async () => {
    const pastIds = scheduledPosts
      .filter((p) => ['published', 'failed'].includes(norm(p.status)) || new Date(p.scheduled_for_utc) < new Date())
      .map((p) => p.scheduled_post_id);
    if (pastIds.length === 0) return;

    setScheduleError(null);
    try {
      const payloadBulk: ScheduledSocialPostBulkActionPayload = { scheduled_post_ids: pastIds };
      await apiFetch<void>('/api/social-post-scheduler/scheduled-posts/delete', {
        method: 'POST',
        jsonBody: payloadBulk,
      });
      await loadSchedulingData();
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to delete past queue records.');
    }
  };

  const handleDeleteQueueGroup = async (posts: ScheduledSocialPost[]) => {
    const ids = posts.map((p) => p.scheduled_post_id);
    if (ids.length === 0) return;

    setScheduleError(null);
    try {
      const payloadBulk: ScheduledSocialPostBulkActionPayload = { scheduled_post_ids: ids };
      await apiFetch<void>('/api/social-post-scheduler/scheduled-posts/delete', {
        method: 'POST',
        jsonBody: payloadBulk,
      });
      setScheduledPosts((curr) => curr.filter((p) => !ids.includes(p.scheduled_post_id)));
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to delete queue entry.');
    }
  };

  const drafts = scheduledPosts.filter((p) => norm(p.status) === 'draft');
  const queued = scheduledPosts.filter((p) => norm(p.status) !== 'draft');
  const queuedGroups = Object.values(
    queued.reduce<Record<string, ScheduledSocialPost[]>>((acc, post) => {
      const key = `${norm(post.status)}|${post.scheduled_for_utc}|${post.caption.trim()}|${post.media_url ?? ''}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(post);
      return acc;
    }, {}),
  );
  const filteredQueueGroups = queuedGroups.filter((group) => {
    if (queueFilter === 'all') return true;
    const status = norm(group[0]?.status ?? '');
    return status === queueFilter;
  });
  const queueCounts = {
    all: queuedGroups.length,
    scheduled: queuedGroups.filter((g) => norm(g[0]?.status ?? '') === 'scheduled').length,
    publishing: queuedGroups.filter((g) => norm(g[0]?.status ?? '') === 'publishing').length,
    published: queuedGroups.filter((g) => norm(g[0]?.status ?? '') === 'published').length,
    failed: queuedGroups.filter((g) => norm(g[0]?.status ?? '') === 'failed').length,
  };
  const topWindows = (scheduleInsights?.best_windows ?? [])
    .slice()
    .sort((a, b) => (b.uplift_pct ?? 0) - (a.uplift_pct ?? 0))
    .slice(0, 3);
  const bestPostTypeFb = (scheduleInsights?.best_post_type_by_platform ?? []).find((x) => norm(x.platform) === 'facebook');
  const bestPostTypeIg = (scheduleInsights?.best_post_type_by_platform ?? []).find((x) => norm(x.platform) === 'instagram');
  const draftGroups = Object.values(
    drafts.reduce<Record<string, ScheduledSocialPost[]>>((acc, post) => {
      const key = `${post.scheduled_for_utc}|${post.caption.trim()}|${post.media_url ?? ''}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(post);
      return acc;
    }, {}),
  );

  const handleUpdateDraftGroup = async (posts: ScheduledSocialPost[]) => {
    for (const post of posts) {
      // Keep paired platform drafts synchronized by saving the same edited values to each row.
      // eslint-disable-next-line no-await-in-loop
      await handleUpdateDraft(post);
    }
  };

  const handleSaveQueueGroupByIds = async (groupIds: number[]) => {
    const posts = scheduledPosts.filter((p) => groupIds.includes(p.scheduled_post_id));
    await handleUpdateDraftGroup(posts);
    setQueueEditKey(null);
  };

  const handleRegenerateDraftGroup = async (group: ScheduledSocialPost[]) => {
    const groupIds = group.map((p) => p.scheduled_post_id);
    const key = groupIds.join('-');
    setScheduleError(null);
    setRegeneratingDraftKey(key);
    try {
      const body: DraftRegeneratePayload = {
        scheduled_post_ids: groupIds,
        post_topic: campaignGeneratePayload.post_topic.trim() || 'Panahgah Refuge update',
        goal: campaignGeneratePayload.campaign_goal.trim() || 'Donations',
        tone: campaignGeneratePayload.tone.trim() || 'Empathetic and hopeful',
        post_type: campaignGeneratePayload.post_type.trim(),
        media_category: campaignGeneratePayload.media_category || 'random',
        include_resident_story: campaignGeneratePayload.include_resident_story,
      };
      const updated = await apiFetch<ScheduledSocialPost[]>('/api/social-post-scheduler/scheduled-posts/regenerate-drafts', {
        method: 'POST',
        jsonBody: body,
      });
      setScheduledPosts((curr) =>
        curr.map((p) => updated.find((u) => u.scheduled_post_id === p.scheduled_post_id) ?? p),
      );
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to regenerate draft.');
    } finally {
      setRegeneratingDraftKey(null);
    }
  };

  const handleDeleteDraftGroup = async (posts: ScheduledSocialPost[]) => {
    const ids = posts.map((p) => p.scheduled_post_id);
    setScheduleError(null);
    try {
      const payloadBulk: ScheduledSocialPostBulkActionPayload = { scheduled_post_ids: ids };
      await apiFetch<void>('/api/social-post-scheduler/scheduled-posts/delete', {
        method: 'POST',
        jsonBody: payloadBulk,
      });
      setScheduledPosts((curr) => curr.filter((p) => !ids.includes(p.scheduled_post_id)));
      setSelectedDraftIds((curr) => curr.filter((id) => !ids.includes(id)));
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to delete draft group.');
    }
  };

  return (
    <section>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Social post studio
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Social post studio</h1>
      <p className="text-body-secondary mb-3">
        Generate campaign drafts and single scheduled posts with category images and AI captions.
      </p>

      <div className="pt-3">
        {(
          <div id="studio-panel-schedule" role="tabpanel" aria-labelledby="studio-tab-schedule">
                <p className="text-body-secondary small mb-3">
                  Generate campaign drafts or a single scheduled post using your local image categories + AI captions, then
                  review and confirm before publishing. <strong>Retry draft</strong> uses the Campaign posts form (topic,
                  goal, tone, media category) to pick a new image and caption.
                </p>
            <div className="row g-4">
        <div className="col-12 col-xl-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="h6 mb-3">Campaign posts</h3>
              {generateCampaignMessage ? <div className="alert alert-info py-2 small">{generateCampaignMessage}</div> : null}
              {generateCampaignError ? <div className="alert alert-danger py-2 small">{generateCampaignError}</div> : null}
              <form onSubmit={handleGenerateCampaign} className="d-grid gap-2 mb-4">
                <input
                  className="form-control"
                  placeholder="Campaign name"
                  value={campaignGeneratePayload.campaign_name}
                  onChange={(e) => setCampaignGeneratePayload((curr) => ({ ...curr, campaign_name: e.target.value }))}
                  required
                />
                <input
                  className="form-control"
                  placeholder="Campaign goal (example: Donations)"
                  value={campaignGeneratePayload.campaign_goal}
                  onChange={(e) => setCampaignGeneratePayload((curr) => ({ ...curr, campaign_goal: e.target.value }))}
                  required
                />
                <input
                  className="form-control"
                  placeholder="Post topic"
                  value={campaignGeneratePayload.post_topic}
                  onChange={(e) => setCampaignGeneratePayload((curr) => ({ ...curr, post_topic: e.target.value }))}
                  required
                />
                <select
                  className="form-select"
                  value={campaignGeneratePayload.post_type}
                  onChange={(e) => setCampaignGeneratePayload((curr) => ({ ...curr, post_type: e.target.value }))}
                >
                  <option value="">Auto best post type</option>
                  {postTypeOptions.map((postType) => (
                    <option key={postType} value={postType}>
                      {postType}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  value={campaignGeneratePayload.media_category}
                  onChange={(e) => setCampaignGeneratePayload((curr) => ({ ...curr, media_category: e.target.value }))}
                >
                  <option value="random">random (auto-pick)</option>
                  {mediaCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="form-check">
                  <input
                    id="auto-post-facebook"
                    className="form-check-input"
                    type="checkbox"
                    checked={campaignGeneratePayload.post_to_facebook}
                    onChange={(e) => setCampaignGeneratePayload((curr) => ({ ...curr, post_to_facebook: e.target.checked }))}
                  />
                  <label htmlFor="auto-post-facebook" className="form-check-label">Create Facebook drafts</label>
                </div>
                <div className="form-check">
                  <input
                    id="auto-post-instagram"
                    className="form-check-input"
                    type="checkbox"
                    checked={campaignGeneratePayload.post_to_instagram}
                    onChange={(e) => setCampaignGeneratePayload((curr) => ({ ...curr, post_to_instagram: e.target.checked }))}
                  />
                  <label htmlFor="auto-post-instagram" className="form-check-label">Create Instagram drafts</label>
                </div>
                <label className="form-label mb-0 small text-body-secondary">Start date/time (local)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={campaignGeneratePayload.start_utc}
                  onChange={(e) => setCampaignGeneratePayload((curr) => ({ ...curr, start_utc: e.target.value }))}
                  required
                />
                <label className="form-label mb-0 small text-body-secondary">End date/time (local)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={campaignGeneratePayload.end_utc}
                  onChange={(e) => setCampaignGeneratePayload((curr) => ({ ...curr, end_utc: e.target.value }))}
                  required
                />
                <input
                  type="number"
                  min={1}
                  max={14}
                  className="form-control"
                  value={campaignGeneratePayload.posts_per_week}
                  onChange={(e) =>
                    setCampaignGeneratePayload((curr) => ({ ...curr, posts_per_week: Number(e.target.value) || 1 }))
                  }
                />
                <button type="submit" className="btn btn-primary" disabled={isGeneratingCampaign}>
                  {isGeneratingCampaign ? 'Generating draft posts... please wait' : 'Generate campaign posts'}
                </button>
              </form>
            </div>
          </div>

          <div className="card shadow-sm mt-3">
            <div className="card-body">
              <h3 className="h6 mb-3">Single post scheduler</h3>
              <form onSubmit={handleGenerateSinglePost} className="d-grid gap-2">
                <input
                  className="form-control"
                  placeholder="Post topic"
                  value={singlePostPayload.post_topic}
                  onChange={(e) => setSinglePostPayload((curr) => ({ ...curr, post_topic: e.target.value }))}
                  required
                />
                <input
                  className="form-control"
                  placeholder="Goal (example: Donations)"
                  value={singlePostPayload.goal}
                  onChange={(e) => setSinglePostPayload((curr) => ({ ...curr, goal: e.target.value }))}
                  required
                />
                <select
                  className="form-select"
                  value={singlePostPayload.media_category}
                  onChange={(e) => setSinglePostPayload((curr) => ({ ...curr, media_category: e.target.value }))}
                >
                  <option value="random">random (auto-pick)</option>
                  {mediaCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  value={singlePostPayload.tone}
                  onChange={(e) => setSinglePostPayload((curr) => ({ ...curr, tone: e.target.value }))}
                >
                  {toneOptions.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  value={singlePostPayload.post_type}
                  onChange={(e) => setSinglePostPayload((curr) => ({ ...curr, post_type: e.target.value }))}
                >
                  <option value="">Auto best post type</option>
                  {postTypeOptions.map((postType) => (
                    <option key={postType} value={postType}>
                      {postType}
                    </option>
                  ))}
                </select>
                <div className="form-check">
                  <input
                    id="single-post-facebook"
                    className="form-check-input"
                    type="checkbox"
                    checked={singlePostPayload.post_to_facebook}
                    onChange={(e) => setSinglePostPayload((curr) => ({ ...curr, post_to_facebook: e.target.checked }))}
                  />
                  <label htmlFor="single-post-facebook" className="form-check-label">Post to Facebook</label>
                </div>
                <div className="form-check">
                  <input
                    id="single-post-instagram"
                    className="form-check-input"
                    type="checkbox"
                    checked={singlePostPayload.post_to_instagram}
                    onChange={(e) => setSinglePostPayload((curr) => ({ ...curr, post_to_instagram: e.target.checked }))}
                  />
                  <label htmlFor="single-post-instagram" className="form-check-label">Post to Instagram</label>
                </div>
                <label className="form-label mb-0 small text-body-secondary">Publish at (local)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={singlePostPayload.scheduled_for_utc}
                  onChange={(e) => setSinglePostPayload((curr) => ({ ...curr, scheduled_for_utc: e.target.value }))}
                  required
                />
                <button type="submit" className="btn btn-success" disabled={isGeneratingSinglePost}>
                  {isGeneratingSinglePost ? 'Generating single draft...' : 'Generate single post draft'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-7">
          {scheduleError ? <div className="alert alert-danger">{scheduleError}</div> : null}
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">Review and confirm</h2>
                <div className="d-flex gap-2">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void loadSchedulingData()}>
                    Refresh
                  </button>
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => void handleDeletePastQueueRecords()}>
                    Delete past records
                  </button>
                </div>
              </div>
              <ul className="nav nav-pills mb-3">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${scheduleSubTab === 'drafts' ? 'active' : ''}`}
                    onClick={() => setScheduleSubTab('drafts')}
                  >
                    Drafts ({draftGroups.length})
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${scheduleSubTab === 'queue' ? 'active' : ''}`}
                    onClick={() => setScheduleSubTab('queue')}
                  >
                    Queue ({queued.length})
                  </button>
                </li>
              </ul>
              <div className="alert alert-secondary small py-2">
                <strong>Queue status guide:</strong> <span className="ms-1"><strong>scheduled</strong> = confirmed and waiting,
                <strong className="ms-2">publishing</strong> = currently posting,
                <strong className="ms-2">published</strong> = posted successfully,
                <strong className="ms-2">failed</strong> = posting failed (check error column).</span>
              </div>
              {topWindows.length > 0 ? (
                <div className="alert alert-info small py-2">
                  <div><strong>Model 5 posting insights</strong></div>
                  <div className="mt-1">
                    {topWindows.map((w, idx) => (
                      <div key={`${w.day_of_week}-${w.post_hour}-${idx}`}>
                        #{idx + 1}: <strong>{w.day_of_week}</strong> around <strong>{w.post_hour ?? 16}:00 IST</strong>
                        {' '}({(w.uplift_pct ?? 0).toFixed(1)}% uplift)
                      </div>
                    ))}
                  </div>
                  <div className="mt-1">
                    {bestPostTypeFb ? <>Facebook best post type: <strong>{bestPostTypeFb.post_type}</strong>. </> : null}
                    {bestPostTypeIg ? <>Instagram best post type: <strong>{bestPostTypeIg.post_type}</strong>.</> : null}
                  </div>
                  <div className="mt-1">
                    Tip: use posts/week to match how many ranked rows you want (e.g. 3 posts uses #1–#3 below).
                  </div>
                  <div className="mt-1 text-body-secondary">
                    Drafts are created in this order: post 1 = #1, post 2 = #2, post 3 = #3 (not re-sorted by
                    calendar). Day/hour for each row use <strong>India Standard Time (IST)</strong> for the model hour,
                    then store as UTC—your browser shows local time.
                  </div>
                </div>
              ) : null}

              {scheduleSubTab === 'drafts' ? (
                draftGroups.length === 0 ? (
                  <p className="text-body-secondary mb-0">No drafts yet. Generate campaign posts first.</p>
                ) : (
                  <div className="d-grid gap-3">
                    {draftGroups.map((group) => {
                      const first = group[0];
                      const groupIds = group.map((p) => p.scheduled_post_id);
                      const isSelected = groupIds.every((id) => selectedDraftIds.includes(id));
                      const groupPlatforms = Array.from(new Set(group.map((p) => p.platform))).join(' + ');
                      return (
                      <div key={groupIds.join('-')} className="border rounded p-3">
                        <div className="d-flex justify-content-between align-items-start gap-3">
                          <div>
                            <div className="small text-body-secondary">{groupPlatforms} draft pair</div>
                            <div className="small">Scheduled: {new Date(first.scheduled_for_utc).toLocaleString()}</div>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelectedDraftIds((curr) =>
                                  e.target.checked
                                    ? Array.from(new Set([...curr, ...groupIds]))
                                    : curr.filter((id) => !groupIds.includes(id)),
                                )
                              }
                            />
                            <label className="form-check-label">Confirm</label>
                          </div>
                        </div>

                        {resolvePreviewMediaUrl(first.media_url) ? (
                          <img
                            src={resolvePreviewMediaUrl(first.media_url) ?? ''}
                            alt="Draft media preview"
                            className="img-fluid rounded mt-2"
                            style={{ maxHeight: '180px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="alert alert-warning py-2 mt-2 mb-0">Missing image URL (must fix before confirm).</div>
                        )}

                        <textarea
                          className="form-control mt-2"
                          rows={3}
                          value={first.caption}
                          onChange={(e) =>
                            setScheduledPosts((curr) =>
                              curr.map((p) => (groupIds.includes(p.scheduled_post_id) ? { ...p, caption: e.target.value } : p)),
                            )
                          }
                        />
                        <input
                          className="form-control mt-2"
                          value={first.media_url ?? ''}
                          placeholder="Image URL"
                          onChange={(e) =>
                            setScheduledPosts((curr) =>
                              curr.map((p) =>
                                groupIds.includes(p.scheduled_post_id) ? { ...p, media_url: e.target.value.trim() || null } : p,
                              ),
                            )
                          }
                        />
                        <input
                          type="datetime-local"
                          className="form-control mt-2"
                          value={toDateTimeLocalValue(first.scheduled_for_utc)}
                          onChange={(e) =>
                            setScheduledPosts((curr) =>
                              curr.map((p) =>
                                groupIds.includes(p.scheduled_post_id)
                                  ? { ...p, scheduled_for_utc: new Date(e.target.value).toISOString() }
                                  : p,
                              ),
                            )
                          }
                        />
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => void handleUpdateDraftGroup(group)}>
                            Save edits
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            disabled={regeneratingDraftKey === groupIds.join('-')}
                            onClick={() => void handleRegenerateDraftGroup(group)}
                          >
                            {regeneratingDraftKey === groupIds.join('-') ? 'Regenerating…' : 'Retry (new image + caption)'}
                          </button>
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => void handleDeleteDraftGroup(group)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )})}
                    <button
                      type="button"
                      className="btn btn-outline-success"
                      onClick={() => setSelectedDraftIds(Array.from(new Set(draftGroups.flatMap((g) => g.map((p) => p.scheduled_post_id)))))}
                    >
                      Confirm all drafts
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={selectedDraftIds.length === 0}
                      onClick={() => void handleConfirmSelectedDrafts()}
                    >
                      Confirm selected drafts ({selectedDraftIds.length} platform posts)
                    </button>
                  </div>
                )
              ) : queuedGroups.length === 0 ? (
                <p className="text-body-secondary mb-0">Queue is empty.</p>
              ) : (
                <div>
                  <ul className="nav nav-pills mb-3">
                    <li className="nav-item"><button type="button" className={`nav-link ${queueFilter === 'all' ? 'active' : ''}`} onClick={() => setQueueFilter('all')}>All ({queueCounts.all})</button></li>
                    <li className="nav-item"><button type="button" className={`nav-link ${queueFilter === 'scheduled' ? 'active' : ''}`} onClick={() => setQueueFilter('scheduled')}>Scheduled ({queueCounts.scheduled})</button></li>
                    <li className="nav-item"><button type="button" className={`nav-link ${queueFilter === 'publishing' ? 'active' : ''}`} onClick={() => setQueueFilter('publishing')}>Publishing ({queueCounts.publishing})</button></li>
                    <li className="nav-item"><button type="button" className={`nav-link ${queueFilter === 'published' ? 'active' : ''}`} onClick={() => setQueueFilter('published')}>Published ({queueCounts.published})</button></li>
                    <li className="nav-item"><button type="button" className={`nav-link ${queueFilter === 'failed' ? 'active' : ''}`} onClick={() => setQueueFilter('failed')}>Failed ({queueCounts.failed})</button></li>
                  </ul>
                  {filteredQueueGroups.length === 0 ? (
                    <p className="text-body-secondary mb-0">No posts in this status.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th>Platforms</th>
                            <th>Scheduled</th>
                            <th>Status</th>
                            <th>Attempts</th>
                            <th>Error</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredQueueGroups.map((group) => {
                            const rowKey = group.map((p) => p.scheduled_post_id).join('-');
                            const groupIds = group.map((p) => p.scheduled_post_id);
                            const fresh = groupIds
                              .map((id) => scheduledPosts.find((p) => p.scheduled_post_id === id))
                              .filter((p): p is ScheduledSocialPost => !!p);
                            const first = fresh[0] ?? group[0];
                            const platforms = Array.from(new Set(fresh.map((p) => p.platform))).join(' + ');
                            const attempts = Math.max(...fresh.map((p) => p.attempt_count));
                            const error = fresh.map((p) => p.error_message).find((e) => !!e) ?? '';
                            const st = norm(first.status);
                            const canEditQueue = st === 'scheduled' || st === 'failed';
                            const isEditing = queueEditKey === rowKey;
                            return (
                              <Fragment key={rowKey}>
                                <tr>
                                  <td>{platforms}</td>
                                  <td>{new Date(first.scheduled_for_utc).toLocaleString()}</td>
                                  <td>{first.status}</td>
                                  <td>{attempts}</td>
                                  <td className="small text-danger">{error}</td>
                                  <td className="d-flex flex-wrap gap-1">
                                    {canEditQueue ? (
                                      <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => setQueueEditKey(isEditing ? null : rowKey)}
                                      >
                                        {isEditing ? 'Close' : 'Edit'}
                                      </button>
                                    ) : (
                                      <span className="small text-body-secondary">—</span>
                                    )}
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger btn-sm"
                                      onClick={() => void handleDeleteQueueGroup(fresh.length > 0 ? fresh : group)}
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                                {isEditing && canEditQueue ? (
                                  <tr className="table-light">
                                    <td colSpan={6}>
                                      <div className="small text-body-secondary mb-2">
                                        {st === 'failed'
                                          ? 'Saving moves this group back to scheduled so the worker can try again.'
                                          : 'Changes apply to all platforms in this group.'}
                                      </div>
                                      {resolvePreviewMediaUrl(first.media_url) ? (
                                        <img
                                          src={resolvePreviewMediaUrl(first.media_url) ?? ''}
                                          alt=""
                                          className="img-fluid rounded mb-2"
                                          style={{ maxHeight: '120px', objectFit: 'cover' }}
                                        />
                                      ) : null}
                                      <textarea
                                        className="form-control form-control-sm mb-2"
                                        rows={3}
                                        value={first.caption}
                                        onChange={(e) =>
                                          setScheduledPosts((curr) =>
                                            curr.map((p) =>
                                              groupIds.includes(p.scheduled_post_id) ? { ...p, caption: e.target.value } : p,
                                            ),
                                          )
                                        }
                                      />
                                      <input
                                        className="form-control form-control-sm mb-2"
                                        value={first.media_url ?? ''}
                                        onChange={(e) =>
                                          setScheduledPosts((curr) =>
                                            curr.map((p) =>
                                              groupIds.includes(p.scheduled_post_id)
                                                ? { ...p, media_url: e.target.value.trim() || null }
                                                : p,
                                            ),
                                          )
                                        }
                                      />
                                      <input
                                        type="datetime-local"
                                        className="form-control form-control-sm mb-2"
                                        value={toDateTimeLocalValue(first.scheduled_for_utc)}
                                        onChange={(e) =>
                                          setScheduledPosts((curr) =>
                                            curr.map((p) =>
                                              groupIds.includes(p.scheduled_post_id)
                                                ? { ...p, scheduled_for_utc: new Date(e.target.value).toISOString() }
                                                : p,
                                            ),
                                          )
                                        }
                                      />
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => void handleSaveQueueGroupByIds(groupIds)}
                                      >
                                        Save changes
                                      </button>
                                    </td>
                                  </tr>
                                ) : null}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

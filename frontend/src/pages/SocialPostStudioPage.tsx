import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type {
  Model5InsightsResponse,
  Model5PostingWindow,
  Model5PostTypeByPlatform,
  ScheduledSocialPost,
  ScheduledSocialPostCreatePayload,
  SocialCampaign,
  SocialCampaignCreatePayload,
  SocialPlatformConnection,
  SocialPlatformConnectionUpsertPayload,
  SocialPostGenerateRequest,
  SocialPostGenerateResponse,
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
  const [campaigns, setCampaigns] = useState<SocialCampaign[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledSocialPost[]>([]);
  const [connections, setConnections] = useState<SocialPlatformConnection[]>([]);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isSavingConnection, setIsSavingConnection] = useState(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [isSavingScheduledPost, setIsSavingScheduledPost] = useState(false);
  const [campaignPayload, setCampaignPayload] = useState<SocialCampaignCreatePayload>({
    campaign_name: '',
    platform: 'Instagram',
    objective: 'Donations',
    start_utc: '',
    end_utc: null,
  });
  const [scheduledPostPayload, setScheduledPostPayload] = useState<ScheduledSocialPostCreatePayload>({
    campaign_id: null,
    platform: 'Instagram',
    scheduled_for_utc: '',
    caption: '',
    media_url: null,
  });
  const [connectionPayload, setConnectionPayload] = useState<SocialPlatformConnectionUpsertPayload>({
    platform: 'Facebook',
    account_label: '',
    page_id: '',
    instagram_business_account_id: null,
    is_placeholder: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SocialPostGenerateResponse | null>(null);
  const [postTypesReady, setPostTypesReady] = useState(false);
  const [insightsMessage, setInsightsMessage] = useState<string | null>(null);
  const [isLoadingInsightsApply, setIsLoadingInsightsApply] = useState(false);
  const insightsAppliedOnce = useRef(false);
  const payloadRef = useRef<SocialPostGenerateRequest>(defaultPayload);
  payloadRef.current = payload;
  const [activeTab, setActiveTab] = useState<'captions' | 'schedule'>('captions');

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

    setScheduledPostPayload((curr) => ({
      ...curr,
      platform: nextPlatform,
      scheduled_for_utc: scheduleLocal || curr.scheduled_for_utc,
    }));

    setCampaignPayload((curr) => ({
      ...curr,
      platform: nextPlatform,
    }));

    setConnectionPayload((curr) => {
      const p = norm(nextPlatform);
      if (p !== 'instagram' && p !== 'facebook') {
        return curr;
      }
      return { ...curr, platform: p === 'instagram' ? 'Instagram' : 'Facebook' };
    });

    const parts: string[] = [];
    if (row) {
      parts.push(`platform ${nextPlatform}, post type ${nextPostType}`);
    }
    if (story !== null) {
      parts.push(story ? 'resident story on (data-backed)' : 'resident story off (data-backed)');
    }
    if (windowPick && scheduleLocal) {
      parts.push(`suggested schedule ${windowPick.day_of_week} ~${windowPick.post_hour ?? 18}:00 (local)`);
    }
    setInsightsMessage(
      parts.length > 0
        ? `Form fields updated from Model 5: ${parts.join('; ')}.`
        : 'Insights loaded; no strong recommendations to apply.',
    );
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

  const handleReapplyInsights = async () => {
    setIsLoadingInsightsApply(true);
    setInsightsMessage(null);
    try {
      const ins = await apiFetch<Model5InsightsResponse>('/api/ml/model5/insights');
      if (!hasInsightsData(ins)) {
        setInsightsMessage('No Model 5 insights yet. Add social posts and train the model from Social media insights.');
        return;
      }
      applyInsightsToForms(ins, postTypeOptions, payload);
    } catch {
      setInsightsMessage('Could not load Model 5 insights. Ensure you are logged in as admin and the model has been trained.');
    } finally {
      setIsLoadingInsightsApply(false);
    }
  };

  const loadSchedulingData = useCallback(async () => {
    try {
      const [campaignData, postData, connectionData] = await Promise.all([
        apiFetch<SocialCampaign[]>('/api/social-post-scheduler/campaigns'),
        apiFetch<ScheduledSocialPost[]>('/api/social-post-scheduler/scheduled-posts'),
        apiFetch<SocialPlatformConnection[]>('/api/social-post-scheduler/connections'),
      ]);
      setCampaigns(campaignData);
      setScheduledPosts(postData);
      setConnections(connectionData);
    } catch {
      setScheduleError('Unable to load campaign scheduler data.');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'schedule') {
      void loadSchedulingData();
    }
  }, [activeTab, loadSchedulingData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiFetch<SocialPostGenerateResponse>('/api/ml/model5/generate-post', {
        method: 'POST',
        jsonBody: payload,
      });
      setResult(data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to generate social post drafts.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScheduleError(null);
    setIsSavingCampaign(true);
    try {
      const startUtcIso = new Date(campaignPayload.start_utc).toISOString();
      const endUtcIso = campaignPayload.end_utc ? new Date(campaignPayload.end_utc).toISOString() : null;
      const created = await apiFetch<SocialCampaign>('/api/social-post-scheduler/campaigns', {
        method: 'POST',
        jsonBody: {
          ...campaignPayload,
          start_utc: startUtcIso,
          end_utc: endUtcIso,
        },
      });
      setCampaigns((curr) => [created, ...curr]);
      setCampaignPayload((curr) => ({ ...curr, campaign_name: '', start_utc: '', end_utc: null }));
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to create campaign.');
    } finally {
      setIsSavingCampaign(false);
    }
  };

  const handleCreateScheduledPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScheduleError(null);
    setIsSavingScheduledPost(true);
    try {
      const scheduledForUtcIso = new Date(scheduledPostPayload.scheduled_for_utc).toISOString();
      const created = await apiFetch<ScheduledSocialPost>('/api/social-post-scheduler/scheduled-posts', {
        method: 'POST',
        jsonBody: {
          ...scheduledPostPayload,
          scheduled_for_utc: scheduledForUtcIso,
          campaign_id: scheduledPostPayload.campaign_id ?? null,
          media_url: scheduledPostPayload.media_url || null,
        },
      });
      setScheduledPosts((curr) => [created, ...curr]);
      setScheduledPostPayload((curr) => ({ ...curr, scheduled_for_utc: '', caption: '', media_url: null }));
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to schedule post.');
    } finally {
      setIsSavingScheduledPost(false);
    }
  };

  const handleSaveConnection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setScheduleError(null);
    setIsSavingConnection(true);
    try {
      const saved = await apiFetch<SocialPlatformConnection>('/api/social-post-scheduler/connections', {
        method: 'POST',
        jsonBody: {
          ...connectionPayload,
          instagram_business_account_id: connectionPayload.instagram_business_account_id || null,
        },
      });
      setConnections((curr) => [saved, ...curr.filter((c) => c.connection_id !== saved.connection_id)]);
      setConnectionPayload((curr) => ({ ...curr, account_label: '', page_id: '', instagram_business_account_id: null }));
    } catch (saveError) {
      setScheduleError(saveError instanceof Error ? saveError.message : 'Unable to save platform connection.');
    } finally {
      setIsSavingConnection(false);
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
        Draft AI captions from your data, or switch to scheduling when you are ready to queue campaigns.
      </p>

      <ul className="nav nav-tabs" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link ${activeTab === 'captions' ? 'active' : ''}`}
            id="studio-tab-captions"
            aria-selected={activeTab === 'captions'}
            aria-controls="studio-panel-captions"
            onClick={() => setActiveTab('captions')}
          >
            Create captions
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            role="tab"
            className={`nav-link ${activeTab === 'schedule' ? 'active' : ''}`}
            id="studio-tab-schedule"
            aria-selected={activeTab === 'schedule'}
            aria-controls="studio-panel-schedule"
            onClick={() => setActiveTab('schedule')}
          >
            Schedule campaign
          </button>
        </li>
      </ul>

      <div className="pt-3">
        {activeTab === 'captions' ? (
          <div id="studio-panel-captions" role="tabpanel" aria-labelledby="studio-tab-captions">
            <p className="text-body-secondary small mb-3">
              Model 5 insights pre-fill platform, post type, and timing where possible. Adjust the brief, then generate
              drafts.
            </p>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => void handleReapplyInsights()}
                disabled={isLoadingInsightsApply}
              >
                {isLoadingInsightsApply ? 'Loading insights…' : 'Apply latest Model 5 insights to forms'}
              </button>
              <Link className="small" to="/admin/social-insights">
                Open insights dashboard
              </Link>
            </div>
            {insightsMessage ? <div className="alert alert-info py-2 small mb-3">{insightsMessage}</div> : null}

            <div className="row g-4">
        <div className="col-12 col-lg-5">
          <form onSubmit={handleSubmit} className="card shadow-sm">
            <div className="card-body d-grid gap-3">
              <div>
                <label htmlFor="platform" className="form-label">
                  Platform
                </label>
                <select
                  id="platform"
                  className="form-select"
                  value={payload.platform}
                  onChange={(e) => setPayload((curr) => ({ ...curr, platform: e.target.value }))}
                >
                  {['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'Twitter', 'WhatsApp'].map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="postType" className="form-label">
                  Post type
                </label>
                <select
                  id="postType"
                  className="form-select"
                  value={payload.post_type}
                  onChange={(e) => setPayload((curr) => ({ ...curr, post_type: e.target.value }))}
                  required
                  disabled={postTypeOptions.length === 0}
                >
                  {postTypeOptions.length === 0 ? (
                    <option value="">No post_type values found</option>
                  ) : (
                    postTypeOptions.map((postType) => (
                      <option key={postType} value={postType}>
                        {postType}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="goal" className="form-label">
                  Goal
                </label>
                <select
                  id="goal"
                  className="form-select"
                  value={payload.goal}
                  onChange={(e) => setPayload((curr) => ({ ...curr, goal: e.target.value }))}
                >
                  {['Donations', 'Awareness', 'Volunteer signup', 'Event attendance', 'Thank you / retention'].map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="postTopic" className="form-label">
                  Post topic
                </label>
                <input
                  id="postTopic"
                  className="form-control"
                  value={payload.post_topic}
                  onChange={(e) => setPayload((curr) => ({ ...curr, post_topic: e.target.value }))}
                  placeholder="Example: school kits campaign kickoff"
                  required
                />
              </div>

              <div>
                <label htmlFor="tone" className="form-label">
                  Tone
                </label>
                <select
                  id="tone"
                  className="form-select"
                  value={payload.tone}
                  onChange={(e) => setPayload((curr) => ({ ...curr, tone: e.target.value }))}
                  required
                >
                  {toneOptions.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="keyDetails" className="form-label">
                  Key details (optional)
                </label>
                <textarea
                  id="keyDetails"
                  className="form-control"
                  rows={4}
                  value={payload.key_details ?? ''}
                  onChange={(e) => setPayload((curr) => ({ ...curr, key_details: e.target.value.trim() || null }))}
                  placeholder="Any must-include facts, event date, location, amounts, etc."
                />
              </div>

              <div className="form-check">
                <input
                  id="residentStory"
                  type="checkbox"
                  className="form-check-input"
                  checked={payload.include_resident_story}
                  onChange={(e) => setPayload((curr) => ({ ...curr, include_resident_story: e.target.checked }))}
                />
                <label htmlFor="residentStory" className="form-check-label">
                  Include resident-story framing
                </label>
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? 'Generating drafts...' : 'Generate post drafts'}
              </button>
            </div>
          </form>
        </div>

        <div className="col-12 col-lg-7">
          {error ? <div className="alert alert-danger">{error}</div> : null}
          {!result && !error ? (
            <div className="card border-dashed">
              <div className="card-body text-body-secondary">
                Your generated post recommendations will appear here.
              </div>
            </div>
          ) : null}

          {result ? (
            <div className="d-grid gap-3">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h2 className="h5">Model-backed recommendation</h2>
                  <p className="mb-1">
                    <strong>Best slot:</strong> {result.recommended_day_of_week} @{' '}
                    {result.recommended_post_hour ?? 'N/A'}:00
                  </p>
                  <p className="mb-1">
                    <strong>Best post type:</strong> {result.recommended_post_type}
                  </p>
                  <p className="small text-body-secondary mb-0">{result.rationale}</p>
                </div>
              </div>

              {result.generated_posts.map((post, index) => (
                <div className="card shadow-sm" key={`${post.variant_name}-${index}`}>
                  <div className="card-body">
                    <h3 className="h6 text-body-secondary">{post.variant_name}</h3>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{post.caption}</p>
                    <p className="small mb-0">{post.hashtags.join(' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
          </div>
        ) : (
          <div id="studio-panel-schedule" role="tabpanel" aria-labelledby="studio-tab-schedule">
            <p className="text-body-secondary small mb-3">
              Connect placeholder accounts, create campaigns, schedule posts, and watch the queue. Use{' '}
              <strong>Create captions</strong> and &quot;Apply latest Model 5 insights&quot; to align platform and timing
              with your data.
            </p>
            <div className="row g-4">
        <div className="col-12 col-xl-5">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h2 className="h5 mb-3">Connected accounts (placeholder)</h2>
              <form onSubmit={handleSaveConnection} className="d-grid gap-2">
                <select
                  className="form-select"
                  value={connectionPayload.platform}
                  onChange={(e) => setConnectionPayload((curr) => ({ ...curr, platform: e.target.value }))}
                >
                  {['Facebook', 'Instagram'].map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
                <input
                  className="form-control"
                  placeholder="Account label (example: Panahgah Main)"
                  value={connectionPayload.account_label}
                  onChange={(e) => setConnectionPayload((curr) => ({ ...curr, account_label: e.target.value }))}
                  required
                />
                <input
                  className="form-control"
                  placeholder="Page ID (placeholder for now)"
                  value={connectionPayload.page_id}
                  onChange={(e) => setConnectionPayload((curr) => ({ ...curr, page_id: e.target.value }))}
                  required
                />
                <input
                  className="form-control"
                  placeholder="Instagram business account ID (optional)"
                  value={connectionPayload.instagram_business_account_id ?? ''}
                  onChange={(e) =>
                    setConnectionPayload((curr) => ({
                      ...curr,
                      instagram_business_account_id: e.target.value.trim() || null,
                    }))
                  }
                />
                <button type="submit" className="btn btn-outline-primary" disabled={isSavingConnection}>
                  {isSavingConnection ? 'Saving connection...' : 'Save placeholder connection'}
                </button>
              </form>

              <div className="mt-3">
                {connections.length === 0 ? (
                  <p className="small text-body-secondary mb-0">No platform connections yet.</p>
                ) : (
                  <ul className="small mb-0 ps-3">
                    {connections.slice(0, 5).map((connection) => (
                      <li key={connection.connection_id}>
                        {connection.platform}: {connection.account_label} ({connection.is_placeholder ? 'placeholder' : 'live'})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 mb-3">Campaign scheduler</h2>
              <form onSubmit={handleCreateCampaign} className="d-grid gap-2">
                <input
                  className="form-control"
                  placeholder="Campaign name"
                  value={campaignPayload.campaign_name}
                  onChange={(e) => setCampaignPayload((curr) => ({ ...curr, campaign_name: e.target.value }))}
                  required
                />
                <select
                  className="form-select"
                  value={campaignPayload.platform}
                  onChange={(e) => setCampaignPayload((curr) => ({ ...curr, platform: e.target.value }))}
                >
                  {['Instagram', 'Facebook'].map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
                <input
                  className="form-control"
                  placeholder="Objective"
                  value={campaignPayload.objective}
                  onChange={(e) => setCampaignPayload((curr) => ({ ...curr, objective: e.target.value }))}
                  required
                />
                <label className="form-label mb-0 small text-body-secondary">Start date/time (UTC)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={campaignPayload.start_utc}
                  onChange={(e) => setCampaignPayload((curr) => ({ ...curr, start_utc: e.target.value }))}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={isSavingCampaign}>
                  {isSavingCampaign ? 'Saving...' : 'Create campaign'}
                </button>
              </form>
            </div>
          </div>

          <div className="card shadow-sm mt-3">
            <div className="card-body">
              <h3 className="h6 mb-3">Schedule post</h3>
              <form onSubmit={handleCreateScheduledPost} className="d-grid gap-2">
                <select
                  className="form-select"
                  value={scheduledPostPayload.campaign_id ?? ''}
                  onChange={(e) =>
                    setScheduledPostPayload((curr) => ({
                      ...curr,
                      campaign_id: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                >
                  <option value="">No campaign (quick schedule)</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.campaign_id} value={campaign.campaign_id}>
                      {campaign.campaign_name}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  value={scheduledPostPayload.platform}
                  onChange={(e) => setScheduledPostPayload((curr) => ({ ...curr, platform: e.target.value }))}
                >
                  {['Instagram', 'Facebook'].map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
                <label className="form-label mb-0 small text-body-secondary">Publish at (UTC)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={scheduledPostPayload.scheduled_for_utc}
                  onChange={(e) =>
                    setScheduledPostPayload((curr) => ({ ...curr, scheduled_for_utc: e.target.value }))
                  }
                  required
                />
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Caption to publish"
                  value={scheduledPostPayload.caption}
                  onChange={(e) => setScheduledPostPayload((curr) => ({ ...curr, caption: e.target.value }))}
                  required
                />
                <input
                  className="form-control"
                  placeholder="Media URL (optional)"
                  value={scheduledPostPayload.media_url ?? ''}
                  onChange={(e) =>
                    setScheduledPostPayload((curr) => ({ ...curr, media_url: e.target.value.trim() || null }))
                  }
                />
                <button type="submit" className="btn btn-success" disabled={isSavingScheduledPost}>
                  {isSavingScheduledPost ? 'Scheduling...' : 'Schedule post'}
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
                <h2 className="h5 mb-0">Queue preview</h2>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => void loadSchedulingData()}>
                  Refresh
                </button>
              </div>
              {scheduledPosts.length === 0 ? (
                <p className="text-body-secondary mb-0">No scheduled posts yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Platform</th>
                        <th>Scheduled (UTC)</th>
                        <th>Status</th>
                        <th>Attempts</th>
                        <th>Last error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledPosts.map((post) => (
                        <tr key={post.scheduled_post_id}>
                          <td>{post.platform}</td>
                          <td>{new Date(post.scheduled_for_utc).toLocaleString()}</td>
                          <td>{post.status}</td>
                          <td>{post.attempt_count}</td>
                          <td className="small text-danger">{post.error_message ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

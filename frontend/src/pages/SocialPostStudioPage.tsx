import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { SocialPostGenerateRequest, SocialPostGenerateResponse } from '../api/types';

const defaultPayload: SocialPostGenerateRequest = {
  platform: 'Instagram',
  goal: 'Donations',
  post_type: '',
  post_topic: '',
  include_resident_story: true,
  tone: 'Empathetic and hopeful',
  key_details: null,
};

export function SocialPostStudioPage() {
  const [payload, setPayload] = useState<SocialPostGenerateRequest>(defaultPayload);
  const [postTypeOptions, setPostTypeOptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SocialPostGenerateResponse | null>(null);

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
      }
    };

    void loadPostTypes();
  }, []);

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
      <p className="text-body-secondary">
        Generate platform-ready post drafts using your Model 5 ranking insights and campaign brief.
      </p>

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
                <input
                  id="tone"
                  className="form-control"
                  value={payload.tone}
                  onChange={(e) => setPayload((curr) => ({ ...curr, tone: e.target.value }))}
                  placeholder="Empathetic and urgent"
                  required
                />
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
    </section>
  );
}

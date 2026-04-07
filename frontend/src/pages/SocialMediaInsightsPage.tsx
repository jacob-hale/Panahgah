import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
 
type WindowInsight = { day_of_week: string; post_hour: number | null; avg_referrals: number; uplift_pct: number };
type PlatformPostTypeInsight = { platform: string; post_type: string; avg_referrals: number; uplift_pct: number };
type StoryEffect = { with_story_avg: number; without_story_avg: number; with_story_count: number; without_story_count: number };
type Model5InsightsResponse = {
  baseline_expected_referrals: number;
  best_windows: WindowInsight[];
  best_post_type_by_platform: PlatformPostTypeInsight[];
  story_effect: StoryEffect;
};

export function SocialMediaInsightsPage() {
  const [insights, setInsights] = useState<Model5InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<Model5InsightsResponse>('/api/ml/model5/insights');
        setInsights(data);
      } catch {
        setError('Unable to run Model 5 scoring. Ensure Python, model artifact, and admin access are configured.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const baseline = insights?.baseline_expected_referrals ?? 0;
  const bestWindows = insights?.best_windows ?? [];
  const bestPostTypeByPlatform = insights?.best_post_type_by_platform ?? [];
  const storyEffect = insights?.story_effect ?? {
    with_story_avg: 0,
    without_story_avg: 0,
    with_story_count: 0,
    without_story_count: 0,
  };

  return (
    <section>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Social media insights
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Social media insights (Model 5 dashboard)</h1>
      <p className="text-body-secondary">
        Mirrors the Model 5 final output blocks: baseline referrals, best posting windows, best post type per
        platform, and resident-story effect.
      </p>

      {loading ? <p>Loading insights...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!loading && !error ? (
        <div className="d-grid gap-4">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="h6 text-body-secondary">Baseline referrals / post</h2>
                  <p className="display-6 mb-0">{baseline.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="h6 text-body-secondary">Posts analyzed</h2>
                  <p className="display-6 mb-0">
                    {storyEffect.with_story_count + storyEffect.without_story_count}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="h6 text-body-secondary">Top posting slot</h2>
                  <p className="mb-1 fw-semibold">
                    {bestWindows[0]
                      ? `${bestWindows[0].day_of_week} @ ${bestWindows[0].post_hour ?? 'N/A'}:00`
                      : 'No data'}
                  </p>
                  <p className="small text-body-secondary mb-0">
                    {bestWindows[0] ? `${bestWindows[0].uplift_pct.toFixed(1)}% vs baseline` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5">Best 5 posting windows</h2>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Hour</th>
                      <th>Avg referrals</th>
                      <th>Uplift vs baseline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestWindows.map((w) => (
                      <tr key={`${w.day_of_week}-${w.post_hour}`}>
                        <td>{w.day_of_week}</td>
                        <td>{w.post_hour ?? 'N/A'}:00</td>
                        <td>{w.avg_referrals.toFixed(2)}</td>
                        <td>{w.uplift_pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5">Best post type by platform</h2>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Platform</th>
                      <th>Best post type</th>
                      <th>Avg referrals</th>
                      <th>Uplift vs baseline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestPostTypeByPlatform.map((row) => (
                      <tr key={`${row.platform}-${row.post_type}`}>
                        <td>{row.platform}</td>
                        <td>{row.post_type}</td>
                        <td>{row.avg_referrals.toFixed(2)}</td>
                        <td>{row.uplift_pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5">Resident story effect</h2>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h3 className="h6 text-body-secondary">Posts featuring resident stories</h3>
                    <p className="display-6 mb-1">{storyEffect.with_story_avg.toFixed(2)}</p>
                    <p className="small text-body-secondary mb-0">{storyEffect.with_story_count} posts</p>
                  </div>
                </div>
                <div className="col-12 col-md-6">
                  <div className="border rounded p-3 h-100">
                    <h3 className="h6 text-body-secondary">Posts without resident stories</h3>
                    <p className="display-6 mb-1">{storyEffect.without_story_avg.toFixed(2)}</p>
                    <p className="small text-body-secondary mb-0">{storyEffect.without_story_count} posts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

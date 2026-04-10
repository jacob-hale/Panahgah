import type { Model5StoryEffect, SocialMediaMonthlyTimeseriesPoint } from '../api/types';

function formatMonthLabel(period: string): string {
  const d = new Date(`${period}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return period;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function MonthlyBars({
  points,
  getValue,
  formatValue,
  emptyHint,
}: {
  points: SocialMediaMonthlyTimeseriesPoint[];
  getValue: (p: SocialMediaMonthlyTimeseriesPoint) => number;
  formatValue: (n: number) => string;
  emptyHint: string;
}) {
  if (points.length === 0) {
    return <p className="small text-body-secondary mb-0">{emptyHint}</p>;
  }

  const max = Math.max(1, ...points.map((p) => getValue(p)));

  return (
    <div className="d-flex align-items-stretch gap-1 gap-md-2" style={{ height: 168 }}>
      {points.map((p) => {
        const v = getValue(p);
        const pct = max > 0 ? (v / max) * 100 : 0;
        const barPct = v > 0 ? Math.max(pct, 6) : 0;
        return (
          <div
            key={p.period}
            className="d-flex flex-column align-items-center flex-grow-1"
            style={{ minWidth: 0 }}
          >
            <div className="flex-grow-1 w-100 d-flex flex-column justify-content-end" style={{ minHeight: 120 }}>
              <div
                className="rounded-top bg-primary mx-auto"
                role="img"
                aria-label={`${formatMonthLabel(p.period)}: ${formatValue(v)}`}
                style={{
                  width: '72%',
                  height: `${barPct}%`,
                  minHeight: v > 0 ? 6 : 0,
                }}
                title={`${formatMonthLabel(p.period)}: ${formatValue(v)} (${p.post_count} posts)`}
              />
            </div>
            <div
              className="text-body-secondary text-center mt-1 text-truncate w-100"
              style={{ fontSize: '0.65rem' }}
            >
              {formatMonthLabel(p.period)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SocialTrendsFromPosts({
  points,
  loading,
  error,
}: {
  points: SocialMediaMonthlyTimeseriesPoint[] | null;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h2 className="h5">Trends from post records</h2>
        <p className="small text-body-secondary mb-3">
          Rolled up by calendar month from <code>social_media_posts</code>. Engagement is likes + comments + shares +
          saves. Donation figures are whatever is stored per post (attributed referrals / estimated value)—not live bank
          data.
        </p>
        {loading ? <p className="small text-body-secondary mb-0">Loading trends…</p> : null}
        {error ? <div className="alert alert-warning py-2 small mb-0">{error}</div> : null}
        {!loading && !error && points ? (
          points.length === 0 ? (
            <p className="small text-body-secondary mb-0">
              No rows in social media posts yet—import or sync data to see charts.
            </p>
          ) : (
            <div className="row g-4">
              <div className="col-12 col-lg-6">
                <h3 className="h6 text-body-secondary">Engagement over time</h3>
                <MonthlyBars
                  points={points}
                  getValue={(p) => p.total_engagement}
                  formatValue={(n) => n.toLocaleString() + ' interactions'}
                  emptyHint="No data."
                />
              </div>
              <div className="col-12 col-lg-6">
                <h3 className="h6 text-body-secondary">Attributed donation referrals over time</h3>
                <MonthlyBars
                  points={points}
                  getValue={(p) => p.total_donation_referrals}
                  formatValue={(n) => n.toLocaleString() + ' referrals'}
                  emptyHint="No data."
                />
              </div>
              <div className="col-12">
                <h3 className="h6 text-body-secondary">Estimated donation value on posts (PHP)</h3>
                <MonthlyBars
                  points={points}
                  getValue={(p) => p.total_estimated_donation_value_php}
                  formatValue={(n) => '₱' + n.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  emptyHint="No data."
                />
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

export function ResidentStoryBarComparison({ story }: { story: Model5StoryEffect }) {
  const withAvg = story.with_story_avg;
  const withoutAvg = story.without_story_avg;
  const max = Math.max(0.0001, withAvg, withoutAvg);

  return (
    <div className="mt-3 pt-3 border-top">
      <h3 className="h6 text-body-secondary mb-2">Avg referrals: story vs no story</h3>
      <div className="mb-3">
        <div className="d-flex justify-content-between small mb-1">
          <span>With resident story</span>
          <span className="fw-semibold">{withAvg.toFixed(2)}</span>
        </div>
        <div className="progress" style={{ height: 22 }}>
          <div
            className="progress-bar bg-primary"
            role="progressbar"
            style={{ width: `${(withAvg / max) * 100}%` }}
            aria-valuenow={withAvg}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        </div>
        <div className="small text-body-secondary mt-1">{story.with_story_count} posts</div>
      </div>
      <div>
        <div className="d-flex justify-content-between small mb-1">
          <span>Without resident story</span>
          <span className="fw-semibold">{withoutAvg.toFixed(2)}</span>
        </div>
        <div className="progress" style={{ height: 22 }}>
          <div
            className="progress-bar bg-secondary"
            role="progressbar"
            style={{ width: `${(withoutAvg / max) * 100}%` }}
            aria-valuenow={withoutAvg}
            aria-valuemin={0}
            aria-valuemax={max}
          />
        </div>
        <div className="small text-body-secondary mt-1">{story.without_story_count} posts</div>
      </div>
    </div>
  );
}

import type { Model5StoryEffect, SocialMediaMonthlyTimeseriesPoint } from '../api/types';

function formatMonthLabel(period: string): string {
  const d = new Date(`${period}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return period;
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

function niceAxisMax(rawMax: number): number {
  // Round up to a human-friendly axis max: 1/2/5 * 10^k
  if (!Number.isFinite(rawMax) || rawMax <= 0) return 1;
  const exp = Math.floor(Math.log10(rawMax));
  const base = Math.pow(10, exp);
  const scaled = rawMax / base;
  const rounded = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return rounded * base;
}

function formatTick(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${Math.round(n / 1000)}k`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function MonthlyBars({
  points,
  getValue,
  formatValue,
  emptyHint,
  barClassName,
}: {
  points: SocialMediaMonthlyTimeseriesPoint[];
  getValue: (p: SocialMediaMonthlyTimeseriesPoint) => number;
  formatValue: (n: number) => string;
  emptyHint: string;
  barClassName?: string;
}) {
  if (points.length === 0) {
    return <p className="small text-body-secondary mb-0">{emptyHint}</p>;
  }

  const rawMax = Math.max(0, ...points.map((p) => getValue(p)));
  const axisMax = niceAxisMax(rawMax);
  const barColor = barClassName ?? 'bg-primary';
  const ticks = [axisMax, axisMax * (2 / 3), axisMax * (1 / 3), 0];

  return (
    <div className="d-flex align-items-stretch gap-2" style={{ height: 220 }}>
      <div
        className="d-flex flex-column justify-content-between text-body-secondary"
        style={{ width: 46, fontSize: '0.72rem' }}
        aria-hidden="true"
      >
        {ticks.map((t, idx) => (
          <div key={idx} className="text-end">
            {formatTick(t)}
          </div>
        ))}
      </div>

      <div className="position-relative flex-grow-1">
        {/* Grid lines (top, 2/3, 1/3, bottom) */}
        {[
          { top: 0 },
          { top: '33.333%' },
          { top: '66.666%' },
          { top: '100%' },
        ].map((g, idx) => (
          <div
            key={idx}
            className="position-absolute start-0 end-0 border-top"
            style={{ top: g.top, opacity: idx === 3 ? 0.5 : 0.25 }}
            aria-hidden="true"
          />
        ))}

        <div className="d-flex align-items-stretch gap-2 h-100">
          {points.map((p) => {
            const v = getValue(p);
            const pct = axisMax > 0 ? (v / axisMax) * 100 : 0;
            const barPct = v > 0 ? Math.max(pct, 4) : 0;
            return (
              <div
                key={p.period}
                className="d-flex flex-column align-items-center flex-grow-1"
                style={{ minWidth: 0, maxWidth: 56 }}
              >
                <div className="flex-grow-1 w-100 d-flex flex-column justify-content-end" style={{ minHeight: 140 }}>
                  <div
                    className={`rounded-top mx-auto ${barColor}`}
                    role="img"
                    aria-label={`${formatMonthLabel(p.period)}: ${formatValue(v)}`}
                    style={{
                      width: '80%',
                      height: `${barPct}%`,
                      minHeight: v > 0 ? 8 : 0,
                    }}
                    title={`${formatMonthLabel(p.period)}: ${formatValue(v)} (${p.post_count} posts)`}
                  />
                </div>
                <div
                  className="text-body-secondary text-center mt-2 text-truncate w-100 small"
                  style={{ fontSize: '0.7rem', lineHeight: 1.2 }}
                >
                  {formatMonthLabel(p.period)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SocialTrendsFromPosts({
  points,
  loading,
  error,
  months,
  onMonthsChange,
}: {
  points: SocialMediaMonthlyTimeseriesPoint[] | null;
  loading: boolean;
  error: string | null;
  months: 6 | 12;
  onMonthsChange: (m: 6 | 12) => void;
}) {
  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <h2 className="h5 mb-0">Trends from post records</h2>
          <div className="btn-group btn-group-sm" role="group" aria-label="Time range">
            <button
              type="button"
              className={`btn ${months === 6 ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => onMonthsChange(6)}
            >
              6 months
            </button>
            <button
              type="button"
              className={`btn ${months === 12 ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => onMonthsChange(12)}
            >
              12 months
            </button>
          </div>
        </div>
        <p className="small text-body-secondary mb-3">
          Last <strong>{months}</strong> calendar months from <code>social_media_posts</code> (UTC). Engagement = likes
          + comments + shares + saves. Dollar amounts show the same stored values as before, prefixed with{' '}
          <strong>$</strong> for display only.
        </p>
        {loading ? <p className="small text-body-secondary mb-0">Loading trends…</p> : null}
        {error ? <div className="alert alert-warning py-2 small mb-0">{error}</div> : null}
        {!loading && !error && points ? (
          points.length === 0 ? (
            <p className="small text-body-secondary mb-0">
              No months in range—import or sync post data to see charts.
            </p>
          ) : (
            <div className="row g-4">
              <div className="col-12 col-lg-6">
                <h3 className="h6 text-body-secondary mb-3">Engagement over time</h3>
                <MonthlyBars
                  points={points}
                  getValue={(p) => p.total_engagement}
                  formatValue={(n) => `${n.toLocaleString()} interactions`}
                  emptyHint="No data."
                  barClassName="bg-primary"
                />
              </div>
              <div className="col-12 col-lg-6">
                <h3 className="h6 text-body-secondary mb-3">Estimated donation value on posts</h3>
                <MonthlyBars
                  points={points}
                  getValue={(p) => p.total_estimated_donation_value_php}
                  formatValue={(n) =>
                    '$' +
                    n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                  }
                  emptyHint="No data."
                  barClassName="bg-info"
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

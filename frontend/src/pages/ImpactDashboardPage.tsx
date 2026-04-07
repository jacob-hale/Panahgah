import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

type PublicImpactDashboard = {
  hero: {
    safehouse_count: number;
    resident_count: number;
    progress_rate: number; // 0..1
    successful_reintegration_count: number;
  };
  outcomes: {
    avg_health_score: number; // 0..5
    avg_education_progress_percent: number; // 0..100
  };
  safety: {
    incident_count_total: number;
    incident_resolved_rate: number; // 0..1
    high_severity_incident_count: number;
    referrals_made_count: number;
  };
  donor_impact: {
    donations_total_amount_php: number;
    donations_total_estimated_php: number;
    allocations_by_program_area: Array<{ program_area: string; amount_allocated: number }>;
  };
  trends: Array<{
    month_start: string; // DateOnly -> ISO string
    avg_health_score: number;
    avg_education_progress: number;
    sessions_count: number;
  }>;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatCurrencyPHP(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

function useCountUp(target: number, opts?: { durationMs?: number; decimals?: number }) {
  const durationMs = opts?.durationMs ?? 900;
  const decimals = opts?.decimals ?? 0;
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = 0;
    const to = Number.isFinite(target) ? target : 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;
      const rounded = Number(next.toFixed(decimals));
      setValue(rounded);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, decimals]);

  return value;
}

function StatCard(props: {
  title: string;
  value: React.ReactNode;
  subtext?: string;
  icon: React.ReactNode;
  accentClassName?: string;
}) {
  return (
    <div className="card h-100 shadow-sm">
      <div className="card-body d-flex gap-3">
        <div
          className={`rounded-3 d-inline-flex align-items-center justify-content-center ${props.accentClassName ?? 'bg-primary-subtle'}`}
          style={{ width: 48, height: 48, flex: '0 0 auto' }}
          aria-hidden="true"
        >
          {props.icon}
        </div>
        <div className="flex-grow-1">
          <div className="text-body-secondary small">{props.title}</div>
          <div className="d-flex align-items-baseline gap-2">
            <div className="display-6 mb-0" style={{ letterSpacing: '-0.02em' }}>
              {props.value}
            </div>
          </div>
          {props.subtext ? <div className="small text-body-secondary mt-1">{props.subtext}</div> : null}
        </div>
      </div>
    </div>
  );
}

function ProgressBar(props: { value01: number; label: string; rightLabel?: string }) {
  const pct = clamp01(props.value01) * 100;
  return (
    <div>
      <div className="d-flex justify-content-between align-items-baseline">
        <div className="small text-body-secondary">{props.label}</div>
        {props.rightLabel ? <div className="small text-body-secondary">{props.rightLabel}</div> : null}
      </div>
      <div className="progress mt-1" role="progressbar" aria-label={props.label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SimpleLineChart(props: {
  points: Array<{ xLabel: string; y: number }>;
  height?: number;
  strokeClassName?: string;
  yMin?: number;
  yMax?: number;
}) {
  const height = props.height ?? 96;
  const width = 560;
  const padX = 10;
  const padY = 10;

  const ys = props.points.map(p => p.y).filter(y => Number.isFinite(y));
  const autoMin = ys.length ? Math.min(...ys) : 0;
  const autoMax = ys.length ? Math.max(...ys) : 1;
  const yMin = props.yMin ?? autoMin;
  const yMax = props.yMax ?? autoMax;
  const span = yMax - yMin || 1;

  const path = props.points
    .map((p, i) => {
      const x = padX + (i * (width - padX * 2)) / Math.max(1, props.points.length - 1);
      const yNorm = (p.y - yMin) / span;
      const y = padY + (1 - clamp01(yNorm)) * (height - padY * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const stroke = props.strokeClassName ?? 'text-primary';
  const last = props.points[props.points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Trend line chart">
        <path d={path} fill="none" className={stroke} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        {last ? (
          <circle
            cx={padX + ((props.points.length - 1) * (width - padX * 2)) / Math.max(1, props.points.length - 1)}
            cy={padY + (1 - clamp01((last.y - yMin) / span)) * (height - padY * 2)}
            r="5"
            className={stroke}
            fill="currentColor"
          />
        ) : null}
      </svg>
      <div className="d-flex justify-content-between small text-body-secondary">
        <span>{props.points[0]?.xLabel ?? ''}</span>
        <span>{props.points[props.points.length - 1]?.xLabel ?? ''}</span>
      </div>
    </div>
  );
}

function IconHeart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-7-4.35-9.5-8.2C.9 9.9 2.1 6.7 5.3 5.6c2-.7 4.2.1 5.5 1.8 1.3-1.7 3.5-2.5 5.5-1.8 3.2 1.1 4.4 4.3 2.8 7.2C19 16.65 12 21 12 21Z"
        className="text-danger"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className="text-primary"
      />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3 20 7v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V7l8-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        className="text-secondary"
      />
    </svg>
  );
}

export function ImpactDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicImpactDashboard | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const dashboard = await apiFetch<PublicImpactDashboard>('/api/public-impact/dashboard');
        setData(dashboard);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const heroSafehouses = useCountUp(data?.hero.safehouse_count ?? 0);
  const heroResidents = useCountUp(data?.hero.resident_count ?? 0);
  const heroProgressPct = useCountUp(((data?.hero.progress_rate ?? 0) * 100) || 0, { decimals: 0 });
  const heroReintegration = useCountUp(data?.hero.successful_reintegration_count ?? 0);

  const allocationsTotal = useMemo(() => {
    const list = data?.donor_impact.allocations_by_program_area ?? [];
    return list.reduce((sum, x) => sum + (Number.isFinite(x.amount_allocated) ? x.amount_allocated : 0), 0);
  }, [data]);

  const allocationSegments = useMemo(() => {
    const list = (data?.donor_impact.allocations_by_program_area ?? []).slice(0, 6);
    const total = allocationsTotal || 1;
    const palette = ['bg-primary', 'bg-success', 'bg-warning', 'bg-danger', 'bg-info', 'bg-secondary'];
    return list.map((x, idx) => ({
      program_area: x.program_area,
      amount: x.amount_allocated,
      widthPct: clamp01(x.amount_allocated / total) * 100,
      className: palette[idx % palette.length],
    }));
  }, [data, allocationsTotal]);

  const trends = data?.trends ?? [];
  const last12 = trends.slice(Math.max(0, trends.length - 12));
  const trendLabels = last12.map(t => {
    // YYYY-MM-DD -> YYYY-MM
    const month = t.month_start?.slice(0, 7) ?? '';
    return month;
  });

  const healthTrendPoints = last12.map((t, i) => ({ xLabel: trendLabels[i] ?? '', y: t.avg_health_score }));
  const eduTrendPoints = last12.map((t, i) => ({ xLabel: trendLabels[i] ?? '', y: t.avg_education_progress }));
  const sessionsTrendPoints = last12.map((t, i) => ({ xLabel: trendLabels[i] ?? '', y: t.sessions_count }));

  return (
    <section className="pb-4">
      <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-end justify-content-between gap-3 mb-4">
        <div>
          <h1 className="display-6 mb-1" style={{ letterSpacing: '-0.03em' }}>
            Impact Dashboard
          </h1>
          <p className="text-body-secondary mb-0" style={{ maxWidth: 760 }}>
            Panahgah exists to provide refuge, healing, and a path forward for young women. These numbers are anonymized and aggregated
            to protect the people we serve.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/" className="btn btn-outline-secondary">
            Learn more
          </Link>
          <a href="#donor-impact" className="btn btn-primary">
            Support this work
          </a>
        </div>
      </div>

      {loading ? (
        <div className="row g-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div className="col-12 col-md-6 col-lg-3" key={idx}>
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="placeholder-glow">
                    <span className="placeholder col-6" />
                    <div className="mt-2">
                      <span className="placeholder col-8" style={{ height: 28, display: 'block' }} />
                    </div>
                    <div className="mt-2">
                      <span className="placeholder col-7" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!loading && !error && data ? (
        <>
          {/* SECTION 1: HERO METRICS */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard title="Safehouses" value={formatCompactNumber(heroSafehouses)} subtext="Places of refuge currently operating" icon={<IconHome />} />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Residents supported"
                value={formatCompactNumber(heroResidents)}
                subtext="Young women receiving safety and care"
                icon={<IconHeart />}
                accentClassName="bg-danger-subtle"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Progress rate"
                value={`${heroProgressPct.toFixed(0)}%`}
                subtext="Sessions where progress was recorded"
                icon={<IconCheck />}
                accentClassName="bg-success-subtle"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Successful reintegration"
                value={formatCompactNumber(heroReintegration)}
                subtext="Residents who completed reintegration"
                icon={<IconShield />}
              />
            </div>
          </div>

          {/* SECTION 2: OUTCOMES */}
          <div className="row g-3 mb-4">
            <div className="col-12">
              <div className="d-flex align-items-baseline justify-content-between">
                <h2 className="h4 mb-1">Outcomes: lives changed</h2>
                <span className="small text-body-secondary">Aggregate averages</span>
              </div>
              <p className="text-body-secondary mb-3" style={{ maxWidth: 820 }}>
                Healing isn’t linear. We track indicators over time so we can improve support and keep residents safe.
              </p>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <div className="fw-semibold">Average health score</div>
                      <div className="small text-body-secondary">Across wellbeing check-ins (0–5 scale)</div>
                    </div>
                    <div className="fs-4 fw-semibold">{data.outcomes.avg_health_score.toFixed(2)}</div>
                  </div>
                  <ProgressBar value01={clamp01(data.outcomes.avg_health_score / 5)} label="Health progress" rightLabel={`${Math.round((data.outcomes.avg_health_score / 5) * 100)}%`} />
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <div className="fw-semibold">Education progress</div>
                      <div className="small text-body-secondary">Average completion progress across education records</div>
                    </div>
                    <div className="fs-4 fw-semibold">{data.outcomes.avg_education_progress_percent.toFixed(1)}%</div>
                  </div>
                  <ProgressBar value01={clamp01(data.outcomes.avg_education_progress_percent / 100)} label="Learning milestones" rightLabel={`${Math.round(data.outcomes.avg_education_progress_percent)}%`} />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: SAFETY & PROTECTION */}
          <div className="row g-3 mb-4">
            <div className="col-12">
              <h2 className="h4 mb-1">Safety & protection</h2>
              <p className="text-body-secondary mb-3" style={{ maxWidth: 820 }}>
                Safety is non-negotiable. We document incidents, follow up quickly, and escalate risks to protect every resident.
              </p>
            </div>

            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Incidents reported"
                value={formatCompactNumber(useCountUp(data.safety.incident_count_total))}
                subtext="All categories, anonymized"
                icon={<IconShield />}
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Resolved"
                value={`${useCountUp((data.safety.incident_resolved_rate ?? 0) * 100, { decimals: 0 })}%`}
                subtext="Incidents marked resolved"
                icon={<IconCheck />}
                accentClassName="bg-success-subtle"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="High-severity cases"
                value={formatCompactNumber(useCountUp(data.safety.high_severity_incident_count))}
                subtext="Incidents labeled “High” severity"
                icon={<IconShield />}
                accentClassName="bg-warning-subtle"
              />
            </div>
            <div className="col-12 col-md-6 col-lg-3">
              <StatCard
                title="Referrals made"
                value={formatCompactNumber(useCountUp(data.safety.referrals_made_count))}
                subtext="Sessions resulting in referrals"
                icon={<IconHeart />}
                accentClassName="bg-info-subtle"
              />
            </div>
          </div>

          {/* SECTION 4: DONOR IMPACT */}
          <div className="row g-3 mb-4" id="donor-impact">
            <div className="col-12">
              <h2 className="h4 mb-1">Donor impact</h2>
              <p className="text-body-secondary mb-3" style={{ maxWidth: 820 }}>
                Donations support safe housing, education, wellbeing, and operations. We report totals and allocations in aggregate.
              </p>
            </div>

            <div className="col-12 col-lg-5">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold mb-2">Total support received</div>
                  <div className="d-flex flex-column gap-2">
                    <div className="d-flex justify-content-between">
                      <span className="text-body-secondary">Monetary (PHP)</span>
                      <span className="fw-semibold">{formatCurrencyPHP(data.donor_impact.donations_total_amount_php)}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-body-secondary">Estimated total value (PHP)</span>
                      <span className="fw-semibold">{formatCurrencyPHP(data.donor_impact.donations_total_estimated_php)}</span>
                    </div>
                  </div>
                  <div className="alert alert-primary mt-3 mb-0">
                    <div className="fw-semibold">Giving guide</div>
                    <div className="small">
                      <span className="fw-semibold">$50</span> supports one resident for one week. (Placeholder — we can calibrate with real program costs.)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-7">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-baseline">
                    <div className="fw-semibold">Allocation by program area</div>
                    <div className="small text-body-secondary">{allocationsTotal ? formatCurrencyPHP(allocationsTotal) : '—'}</div>
                  </div>
                  <div className="mt-3">
                    <div className="progress" style={{ height: 14 }}>
                      {allocationSegments.length ? (
                        allocationSegments.map(seg => (
                          <div
                            key={seg.program_area}
                            className={`progress-bar ${seg.className}`}
                            style={{ width: `${seg.widthPct}%` }}
                            aria-label={seg.program_area}
                          />
                        ))
                      ) : (
                        <div className="progress-bar bg-secondary" style={{ width: '100%' }} />
                      )}
                    </div>
                    <div className="row mt-3 g-2">
                      {allocationSegments.map(seg => (
                        <div className="col-12 col-md-6" key={seg.program_area}>
                          <div className="d-flex align-items-center justify-content-between gap-2">
                            <div className="d-flex align-items-center gap-2">
                              <span className={`rounded-2 ${seg.className}`} style={{ width: 12, height: 12, display: 'inline-block' }} />
                              <span className="small">{seg.program_area}</span>
                            </div>
                            <span className="small text-body-secondary">{formatCurrencyPHP(seg.amount)}</span>
                          </div>
                        </div>
                      ))}
                      {!allocationSegments.length ? (
                        <div className="col-12">
                          <div className="small text-body-secondary">No allocation data available yet.</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: TRENDS OVER TIME */}
          <div className="row g-3">
            <div className="col-12">
              <h2 className="h4 mb-1">Trends over time</h2>
              <p className="text-body-secondary mb-3" style={{ maxWidth: 820 }}>
                Tracking trends helps us learn what’s working and where we need to invest more support.
              </p>
            </div>

            <div className="col-12 col-lg-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold mb-2">Monthly average health</div>
                  {healthTrendPoints.length ? <SimpleLineChart points={healthTrendPoints} yMin={0} yMax={5} /> : <div className="text-body-secondary small">Not enough data yet.</div>}
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold mb-2">Monthly education progress</div>
                  {eduTrendPoints.length ? <SimpleLineChart points={eduTrendPoints} yMin={0} yMax={100} strokeClassName="text-success" /> : <div className="text-body-secondary small">Not enough data yet.</div>}
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="fw-semibold mb-2">Sessions per month</div>
                  {sessionsTrendPoints.length ? <SimpleLineChart points={sessionsTrendPoints} strokeClassName="text-warning" /> : <div className="text-body-secondary small">Not enough data yet.</div>}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

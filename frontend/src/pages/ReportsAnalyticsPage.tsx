import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { AdminReportsAnalytics } from '../api/types';

function formatMonthLabel(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length < 2) return isoDate;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return isoDate;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function formatPct(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

function DonationBars(props: { points: AdminReportsAnalytics['donation_trend_monthly'] }) {
  const { points } = props;
  const moneyFmt = useMemo(
    () => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 0 }),
    [],
  );
  const monthLabels = useMemo(() => points.map((p) => formatMonthLabel(p.month_start)), [points]);
  const maxVal = useMemo(() => {
    let m = 0;
    for (const p of points) {
      m = Math.max(m, p.estimated_value_sum, p.amount_sum ?? 0);
    }
    return m > 0 ? m : 1;
  }, [points]);

  const w = 640;
  const h = 200;
  const padL = 54;
  const padR = 16;
  const padT = 12;
  const padB = 34;
  const barW = (w - padL - padR) / Math.max(points.length, 1);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="d-block" role="img" aria-label="Donation trend by month">
      <title>Donation trend (estimated value per month)</title>
      {/* axes */}
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} stroke="currentColor" opacity={0.25} />
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="currentColor" opacity={0.25} />
      {[0, 0.5, 1].map((t) => {
        const y = padT + (h - padT - padB) * (1 - t);
        const v = maxVal * t;
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="currentColor" opacity={0.08} />
            <text x={padL - 8} y={y + 4} textAnchor="end" className="small" fill="currentColor" opacity={0.75}>
              {moneyFmt.format(v)}
            </text>
          </g>
        );
      })}
      {points.map((p, i) => {
        const v = p.estimated_value_sum;
        const bh = ((h - padT - padB) * v) / maxVal;
        const x = padL + i * barW + barW * 0.15;
        const bw = barW * 0.7;
        const y = h - padB - bh;
        return (
          <g key={p.month_start}>
            <rect x={x} y={y} width={bw} height={Math.max(bh, 0)} fill="var(--bs-primary)" opacity={0.85} />
            {/* show every other month label to avoid crowding */}
            {i % 2 === 0 ? (
              <text x={x + bw / 2} y={h - 12} textAnchor="middle" className="small" fill="currentColor" opacity={0.75}>
                {monthLabels[i]}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={padL} y={10} className="small" fill="currentColor" opacity={0.75}>
        Estimated value (USD)
      </text>
    </svg>
  );
}

export function ReportsAnalyticsPage() {
  const [data, setData] = useState<AdminReportsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<AdminReportsAnalytics>('/api/admin/reports/analytics');
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load reports.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Reports &amp; Analytics
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-2">Reports &amp; Analytics</h1>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : data ? (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <div className="card h-100 shadow-sm border-primary-subtle">
                <div className="card-body">
                  <h2 className="h6 text-primary">Caring (reach &amp; services)</h2>
                  <ul className="list-unstyled small mb-0">
                    <li>
                      <strong>{data.beneficiaries.residents_total}</strong> residents
                    </li>
                    <li>
                      <strong>{data.beneficiaries.residents_active}</strong> active cases
                    </li>
                    <li>
                      <strong>{data.total_process_recordings}</strong> process recordings
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card h-100 shadow-sm border-success-subtle">
                <div className="card-body">
                  <h2 className="h6 text-success">Healing (wellbeing)</h2>
                  <p className="small text-body-secondary mb-2">Average general health score (out of 5).</p>
                  <p className="display-6 mb-0">{data.outcomes.avg_health_score.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="card h-100 shadow-sm border-info-subtle">
                <div className="card-body">
                  <h2 className="h6 text-info-emphasis">Teaching (education)</h2>
                  <p className="small text-body-secondary mb-2">Average education progress percent.</p>
                  <p className="display-6 mb-0">{data.outcomes.avg_education_progress_percent.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h5 mb-3">Donation trends</h2>
              <p className="small text-body-secondary mb-3">Last 12 months (monthly estimated value and monetary amount sums).</p>
              <DonationBars points={data.donation_trend_monthly} />
              <div className="table-responsive mt-3">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="text-end">Amount sum</th>
                      <th className="text-end">Estimated value sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.donation_trend_monthly.map((p) => (
                      <tr key={p.month_start}>
                        <td>{formatMonthLabel(p.month_start)}</td>
                        <td className="text-end">{p.amount_sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="text-end">{p.estimated_value_sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h5 mb-3">Reintegration</h2>
              <p className="small text-body-secondary mb-2">
                Completion rate among residents with a recorded reintegration status.
              </p>
              <p className="mb-1">
                <strong>{data.reintegration.completed_count}</strong> completed /{' '}
                <strong>{data.reintegration.with_status_count}</strong> with status recorded
              </p>
              <p className="mb-0">
                Rate: <strong>{formatPct(data.reintegration.completion_rate)}</strong>
              </p>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h5 mb-3">Safehouse occupancy (latest month on file)</h2>
              {data.safehouse_occupancy.length === 0 ? (
                <p className="text-body-secondary small mb-0">No safehouse monthly metrics yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Safehouse</th>
                        <th>Month</th>
                        <th className="text-end">Active residents</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.safehouse_occupancy.map((s) => (
                        <tr key={s.safehouse_id}>
                          <td>{s.safehouse_name}</td>
                          <td>{formatMonthLabel(s.metric_month)}</td>
                          <td className="text-end">{s.active_residents}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

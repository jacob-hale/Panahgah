import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

type AdminDashboardMetrics = {
  kpis: {
    active_residents_total: number;
    safehouse_count: number;
    recent_donations_count: number;
    recent_donations_estimated_total: number;
    progress_noted_rate_percent: number;
  };
  safehouse_resident_breakdown: {
    safehouse_id: number;
    safehouse_name: string;
    active_residents_count: number;
  }[];
  recent_donations: {
    donation_id: number;
    donation_date: string;
    estimated_value: number;
    donation_type: string;
    supporter_name: string;
  }[];
  upcoming_case_conferences: {
    plan_id: number;
    case_conference_date: string;
    resident_id: number;
    resident_case_code: string;
    safehouse_id: number;
    safehouse_name: string;
    plan_status: string;
  }[];
  progress_summary: {
    total_sessions: number;
    progress_noted_count: number;
    concerns_flagged_count: number;
  };
};

function formatDateOnly(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 3) {
    return value;
  }

  const [yearText, monthText, dayText] = parts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString();
}

export function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch<AdminDashboardMetrics>('/api/admin/dashboard-metrics');
        setMetrics(response);
      } catch {
        setError('Unable to load admin metrics. Ensure you are logged in with the required role.');
      } finally {
        setLoading(false);
      }
    };

    void loadMetrics();
  }, []);

  const safehousePreview = metrics?.safehouse_resident_breakdown.slice(0, 3) ?? [];
  const upcomingConferenceCount = metrics?.upcoming_case_conferences.length ?? 0;

  return (
    <div>
      <header className="mb-4">
        <h1 className="h3 mb-1">Admin dashboard</h1>
        <p className="text-body-secondary mb-0">Command center for daily operations and case management.</p>
      </header>

      {loading ? <p>Loading dashboard metrics...</p> : null}
      {error ? <div className="alert alert-danger">{error}</div> : null}

      {!loading && !error && metrics ? (
      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3 mb-4">
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h2 className="h6 text-body-secondary">Caseload snapshot</h2>
              <p className="display-6 mb-2">{metrics.kpis.active_residents_total}</p>
              <p className="small text-body-secondary mb-3 flex-grow-1">
                Active residents based on open/active case statuses.
              </p>
              <Link className="btn btn-outline-primary btn-sm align-self-start" to="/admin/caseload">
                Open caseload inventory
              </Link>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h2 className="h6 text-body-secondary">Sessions & process</h2>
              <p className="display-6 mb-2">{metrics.progress_summary.total_sessions}</p>
              <p className="small text-body-secondary mb-3 flex-grow-1">
                {metrics.kpis.progress_noted_rate_percent.toFixed(1)}% sessions with progress noted.
              </p>
              <Link className="btn btn-outline-primary btn-sm align-self-start" to="/admin/process-recordings">
                Open process recordings
              </Link>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h2 className="h6 text-body-secondary">Safehouses & capacity</h2>
              <p className="display-6 mb-2">{metrics.kpis.safehouse_count}</p>
              <p className="small text-body-secondary mb-3 flex-grow-1">Active residents by safehouse:</p>
              {safehousePreview.length > 0 ? (
                <ul className="small ps-3 mb-0">
                  {safehousePreview.map((item) => (
                    <li key={item.safehouse_id}>
                      {item.safehouse_name}: {item.active_residents_count}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="small text-body-secondary">No safehouse data available.</span>
              )}
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-body-secondary">Donations pipeline</h2>
              <p className="display-6 mb-2">{metrics.kpis.recent_donations_count}</p>
              <p className="small text-body-secondary mb-0">
                Recent donations total PHP {metrics.kpis.recent_donations_estimated_total.toLocaleString()}.
              </p>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-body-secondary">Upcoming case conferences</h2>
              <p className="display-6 mb-2">{upcomingConferenceCount}</p>
              <p className="small text-body-secondary mb-0">Scheduled in the next 7 days.</p>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-body-secondary">Progress concerns</h2>
              <p className="display-6 mb-2">{metrics.progress_summary.concerns_flagged_count}</p>
              <p className="small text-body-secondary mb-0">Sessions currently flagged for concerns.</p>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {!loading && !error && metrics ? (
      <section className="card">
        <div className="card-body">
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <h2 className="h6 mb-2">Recent donations</h2>
              {metrics.recent_donations.length === 0 ? (
                <p className="small text-body-secondary mb-0">No recent donations found.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Supporter</th>
                        <th>Type</th>
                        <th className="text-end">Estimated value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.recent_donations.map((donation) => (
                        <tr key={donation.donation_id}>
                          <td>{formatDateOnly(donation.donation_date)}</td>
                          <td>{donation.supporter_name}</td>
                          <td>{donation.donation_type}</td>
                          <td className="text-end">{donation.estimated_value.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="col-12 col-lg-6">
              <h2 className="h6 mb-2">Upcoming case conferences (next 7 days)</h2>
              {metrics.upcoming_case_conferences.length === 0 ? (
                <p className="small text-body-secondary mb-0">No upcoming case conferences in the selected window.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Resident</th>
                        <th>Safehouse</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.upcoming_case_conferences.map((conference) => (
                        <tr key={conference.plan_id}>
                          <td>{formatDateOnly(conference.case_conference_date)}</td>
                          <td>{conference.resident_case_code}</td>
                          <td>{conference.safehouse_name}</td>
                          <td>{conference.plan_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}

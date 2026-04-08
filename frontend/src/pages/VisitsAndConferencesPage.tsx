import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { HomeVisitationListItem } from '../api/types';

function formatDateOnly(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  const [yy, mm, dd] = parts.map((p) => Number(p));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return value;
  return new Date(yy, mm - 1, dd).toLocaleDateString();
}

export function VisitsAndConferencesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<HomeVisitationListItem[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<HomeVisitationListItem[]>('/api/home-visitations?take=200');
        setItems(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load visitations.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Home visitations &amp; case conferences
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-3 mb-3">
        <div>
          <h1 className="h3 mb-1">Home visitations &amp; case conferences</h1>
          <p className="text-body-secondary mb-0">
            MVP: read-only visitation log. We’ll add visit entry and case conference views next.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex align-items-baseline justify-content-between gap-3 mb-2">
              <h2 className="h5 mb-0">Recent visitations</h2>
              <span className="small text-body-secondary">{items.length} records</span>
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Resident</th>
                    <th scope="col">Type</th>
                    <th scope="col">Location</th>
                    <th scope="col">Family cooperation</th>
                    <th scope="col">Safety concerns</th>
                    <th scope="col">Follow-up</th>
                    <th scope="col">Outcome</th>
                    <th scope="col">Social worker</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-body-secondary small">
                        No visitations yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((v) => (
                      <tr key={v.visitation_id}>
                        <td>{formatDateOnly(v.visit_date)}</td>
                        <td>
                          <div className="fw-semibold">{v.resident_case_control_no}</div>
                          <div className="small text-body-secondary">{v.resident_internal_code}</div>
                        </td>
                        <td>{v.visit_type}</td>
                        <td>{v.location_visited}</td>
                        <td>{v.family_cooperation_level}</td>
                        <td>
                          {v.safety_concerns_noted ? (
                            <span className="badge text-bg-warning">Yes</span>
                          ) : (
                            <span className="badge text-bg-light border">No</span>
                          )}
                        </td>
                        <td>
                          {v.follow_up_needed ? (
                            <span className="badge text-bg-info">Yes</span>
                          ) : (
                            <span className="badge text-bg-light border">No</span>
                          )}
                        </td>
                        <td>{v.visit_outcome}</td>
                        <td>{v.social_worker}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


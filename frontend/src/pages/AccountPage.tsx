import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type DonationAllocation = {
  allocation_id: number;
  donation_id: number;
  safehouse_id: number;
  program_area: string;
  amount_allocated: number;
  allocation_date: string;
  allocation_notes: string;
};

type DonationRow = {
  donation_id: number;
  supporter_id: number;
  donation_type: string;
  donation_date: string;
  channel_source: string;
  currency_code: string | null;
  amount: number | null;
  estimated_value: number;
  impact_unit: string;
  is_recurring: boolean;
  campaign_name: string | null;
  notes: string;
  donation_allocations: DonationAllocation[];
};

export function AccountPage() {
  const { isAuthenticated, isLoading, authSession } = useAuth();
  const [donations, setDonations] = useState<DonationRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isDonor = authSession?.roles.includes('Donor');

  const loadDonations = useCallback(async () => {
    if (!isDonor) return;
    setLoadError(null);
    try {
      const rows = await apiFetch<DonationRow[]>('/api/donations/mine');
      setDonations(rows);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load donations.');
      setDonations([]);
    }
  }, [isDonor]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && isDonor) {
      void loadDonations();
    }
  }, [isAuthenticated, isDonor, isLoading, loadDonations]);

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isLoading && isAuthenticated && !isDonor) {
    return <Navigate to="/" replace />;
  }

  const profile = authSession?.supporterProfile;
  const totalAmount =
    donations?.reduce((sum, d) => sum + (d.amount != null ? Number(d.amount) : Number(d.estimated_value) || 0), 0) ?? 0;

  return (
    <section>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/">Home</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            My account
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-4">My account</h1>

      {profile ? (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h5 card-title">Profile</h2>
            <dl className="row mb-0 small">
              <dt className="col-sm-3">Name</dt>
              <dd className="col-sm-9">{profile.display_name}</dd>
              <dt className="col-sm-3">Email</dt>
              <dd className="col-sm-9">{profile.email}</dd>
              <dt className="col-sm-3">Status</dt>
              <dd className="col-sm-9">{profile.status}</dd>
              <dt className="col-sm-3">Supporter type</dt>
              <dd className="col-sm-9">{profile.supporter_type}</dd>
              {profile.phone ? (
                <>
                  <dt className="col-sm-3">Phone</dt>
                  <dd className="col-sm-9">{profile.phone}</dd>
                </>
              ) : null}
              {(profile.region || profile.country) && (
                <>
                  <dt className="col-sm-3">Location</dt>
                  <dd className="col-sm-9">
                    {[profile.region, profile.country].filter(Boolean).join(', ')}
                  </dd>
                </>
              )}
              {profile.contribution_interests && profile.contribution_interests.length > 0 ? (
                <>
                  <dt className="col-sm-3">Interests</dt>
                  <dd className="col-sm-9">{profile.contribution_interests.join(', ')}</dd>
                </>
              ) : null}
            </dl>
          </div>
        </div>
      ) : (
        <div className="alert alert-info">No supporter profile is linked to this login yet.</div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h2 className="h5 card-title mb-0">Recorded contributions</h2>
            {donations && donations.length > 0 ? (
              <span className="text-body-secondary small">
                Combined recorded value (amount or estimated):{' '}
                <strong>{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
              </span>
            ) : null}
          </div>
          {loadError && <div className="alert alert-warning">{loadError}</div>}
          {donations === null ? (
            <p className="text-body-secondary mb-0">Loading…</p>
          ) : donations.length === 0 ? (
            <p className="text-body-secondary mb-0">
              No donations have been recorded yet. When staff logs activity, it will appear here.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount / value</th>
                    <th>Allocations</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.donation_id}>
                      <td>{d.donation_date}</td>
                      <td>{d.donation_type}</td>
                      <td>
                        {d.amount != null
                          ? `${d.currency_code ?? ''} ${Number(d.amount).toLocaleString()}`.trim()
                          : d.estimated_value != null
                            ? `${Number(d.estimated_value).toLocaleString()} (${d.impact_unit})`
                            : '—'}
                      </td>
                      <td>
                        {d.donation_allocations?.length ? (
                          <ul className="mb-0 ps-3">
                            {d.donation_allocations.map((a) => (
                              <li key={a.allocation_id}>
                                {a.program_area}: {Number(a.amount_allocated).toLocaleString()} (safehouse #{a.safehouse_id})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

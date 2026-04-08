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

const CONTRIBUTION_OPTIONS = [
  { key: 'monetary', label: 'Monetary donor' },
  { key: 'volunteer', label: 'Volunteer' },
  { key: 'skills', label: 'Skills contributor' },
  { key: 'in_kind', label: 'In-kind (goods)' },
  { key: 'time', label: 'Time / mentoring' },
  { key: 'social_media', label: 'Social media / advocacy' },
] as const;

const PRIMARY_TYPES = ['individual', 'organization', 'faith_group', 'corporate'] as const;

export function AccountPage() {
  const { isAuthenticated, isLoading, authSession, refreshSession } = useAuth();
  const [donations, setDonations] = useState<DonationRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [supporterType, setSupporterType] = useState<string>('individual');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [interests, setInterests] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setFirstName('');
    setLastName('');
    setPhone(profile.phone ?? '');
    setSupporterType(profile.supporter_type ?? 'individual');
    setRegion(profile.region ?? '');
    setCountry(profile.country ?? '');
    const mapped: Record<string, boolean> = {};
    (profile.contribution_interests ?? []).forEach((k) => {
      mapped[k] = true;
    });
    setInterests(mapped);
  }, [profile]);

  const toggleInterest = (key: string) => {
    setInterests((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      const contribution_interests = CONTRIBUTION_OPTIONS.filter((o) => interests[o.key]).map((o) => o.key);
      await apiFetch('/api/supporters/me', {
        method: 'PUT',
        jsonBody: {
          display_name: displayName.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
          supporter_type: supporterType.trim(),
          region: region.trim() || null,
          country: country.trim() || null,
          contribution_interests,
        },
      });
      await refreshSession();
      setEditing(false);
      setSaveSuccess('Profile updated.');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };
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

      {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
      {profile ? (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 card-title mb-0">Profile</h2>
              {!editing ? (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setEditing(true)}>
                  Edit profile
                </button>
              ) : null}
            </div>
            {editing ? (
              <form onSubmit={handleSave} className="d-grid gap-3">
                {saveError && <div className="alert alert-danger mb-0">{saveError}</div>}
                <div>
                  <label className="form-label">Display name</label>
                  <input
                    className="form-control"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">First name (optional)</label>
                    <input
                      className="form-control"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Last name (optional)</label>
                    <input className="form-control" value={lastName} onChange={(event) => setLastName(event.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Phone (optional)</label>
                  <input className="form-control" value={phone} onChange={(event) => setPhone(event.target.value)} />
                </div>
                <div>
                  <label className="form-label">Supporter type</label>
                  <select className="form-select" value={supporterType} onChange={(event) => setSupporterType(event.target.value)}>
                    {PRIMARY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Region (optional)</label>
                    <input className="form-control" value={region} onChange={(event) => setRegion(event.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Country (optional)</label>
                    <input className="form-control" value={country} onChange={(event) => setCountry(event.target.value)} />
                  </div>
                </div>
                <fieldset>
                  <legend className="form-label mb-2">Contribution interests</legend>
                  <div className="d-flex flex-column gap-2">
                    {CONTRIBUTION_OPTIONS.map((o) => (
                      <div key={o.key} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`acc-int-${o.key}`}
                          checked={!!interests[o.key]}
                          onChange={() => toggleInterest(o.key)}
                        />
                        <label className="form-check-label" htmlFor={`acc-int-${o.key}`}>
                          {o.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setEditing(false);
                      setSaveError(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
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
            )}
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

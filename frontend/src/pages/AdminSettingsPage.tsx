import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const PRIMARY_TYPES = ['individual', 'organization', 'faith_group', 'corporate'] as const;

type SupporterMe = {
  supporter_id: number;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  supporter_type: string;
  region: string;
  country: string;
  email: string;
  phone: string;
};

export function AdminSettingsPage() {
  const { isAuthenticated, isLoading, authSession, refreshSession } = useAuth();
  const [profile, setProfile] = useState<SupporterMe | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: '',
    first_name: '',
    last_name: '',
    phone: '',
    supporter_type: 'individual',
    region: '',
    country: '',
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = authSession?.roles.includes('Admin');

  useEffect(() => {
    const load = async () => {
      if (!isAdmin) return;
      setLoadingProfile(true);
      setError(null);
      try {
        const me = await apiFetch<SupporterMe>('/api/supporters/me');
        setProfile(me);
        setIsEditing(false);
        setForm({
          display_name: me.display_name ?? '',
          first_name: me.first_name ?? '',
          last_name: me.last_name ?? '',
          phone: me.phone ?? '',
          supporter_type: me.supporter_type ?? 'individual',
          region: me.region ?? '',
          country: me.country ?? '',
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load admin profile settings.');
      } finally {
        setLoadingProfile(false);
      }
    };
    if (!isLoading && isAuthenticated && isAdmin) {
      void load();
    }
  }, [isAdmin, isAuthenticated, isLoading]);

  if (!isLoading && !isAuthenticated) return <Navigate to="/login" replace />;
  if (!isLoading && isAuthenticated && !isAdmin) return <Navigate to="/" replace />;

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiFetch<SupporterMe>('/api/supporters/me', {
        method: 'PUT',
        jsonBody: {
          ...form,
          contribution_interests: [],
        },
      });
      setProfile(updated);
      setIsEditing(false);
      await refreshSession();
      setSuccess('Settings updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/">Home</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Admin settings
          </li>
        </ol>
      </nav>
      <h1 className="h3 mb-4">Admin settings</h1>
      {loadingProfile ? (
        <p className="text-body-secondary">Loading…</p>
      ) : !profile ? (
        <div className="alert alert-info">No supporter profile is linked to this admin login yet.</div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="mb-4 p-3 rounded border bg-light-subtle">
              <h2 className="h6 mb-3">Profile identification</h2>
              <div className="row g-2 small">
                <div className="col-md-6">
                  <span className="text-body-secondary">Name:</span>{' '}
                  <span className="fw-medium">{profile.display_name || 'Not set'}</span>
                </div>
                <div className="col-md-6">
                  <span className="text-body-secondary">Email:</span>{' '}
                  <span className="fw-medium">{profile.email || 'Not set'}</span>
                </div>
                <div className="col-md-6">
                  <span className="text-body-secondary">Role:</span>{' '}
                  <span className="fw-medium">{authSession?.roles.join(', ') || 'Admin'}</span>
                </div>
                <div className="col-md-6">
                  <span className="text-body-secondary">Phone:</span>{' '}
                  <span className="fw-medium">{profile.phone || 'Not set'}</span>
                </div>
                <div className="col-md-6">
                  <span className="text-body-secondary">Region:</span>{' '}
                  <span className="fw-medium">{profile.region || 'Not set'}</span>
                </div>
                <div className="col-md-6">
                  <span className="text-body-secondary">Country:</span>{' '}
                  <span className="fw-medium">{profile.country || 'Not set'}</span>
                </div>
              </div>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            {!isEditing ? (
              <button className="btn btn-outline-primary" type="button" onClick={() => setIsEditing(true)}>
                Edit admin profile
              </button>
            ) : (
              <form className="d-grid gap-3" onSubmit={handleSave}>
                <div>
                  <label className="form-label">Display name</label>
                  <input
                    className="form-control"
                    value={form.display_name}
                    onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">First name</label>
                    <input
                      className="form-control"
                      value={form.first_name}
                      onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Last name</label>
                    <input
                      className="form-control"
                      value={form.last_name}
                      onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Supporter type</label>
                  <select
                    className="form-select"
                    value={form.supporter_type}
                    onChange={(e) => setForm((p) => ({ ...p, supporter_type: e.target.value }))}
                  >
                    {PRIMARY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Region</label>
                    <input
                      className="form-control"
                      value={form.region}
                      onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Country</label>
                    <input
                      className="form-control"
                      value={form.country}
                      onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-primary" type="submit" disabled={saving}>
                    {saving ? 'Saving…' : 'Save settings'}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setForm({
                        display_name: profile.display_name ?? '',
                        first_name: profile.first_name ?? '',
                        last_name: profile.last_name ?? '',
                        phone: profile.phone ?? '',
                        supporter_type: profile.supporter_type ?? 'individual',
                        region: profile.region ?? '',
                        country: profile.country ?? '',
                      });
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

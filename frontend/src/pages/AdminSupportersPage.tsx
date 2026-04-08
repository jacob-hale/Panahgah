import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';

type SupporterRow = {
  supporter_id: number;
  identity_user_id: string | null;
  supporter_type: string;
  display_name: string;
  organization_name: string | null;
  first_name: string | null;
  last_name: string | null;
  relationship_type: string;
  region: string;
  country: string;
  email: string;
  phone: string;
  status: string;
  acquisition_channel: string;
  contribution_interests: string | null;
  created_at: string;
};

const emptyForm = {
  supporter_type: 'individual',
  display_name: '',
  organization_name: '',
  first_name: '',
  last_name: '',
  relationship_type: 'supporter',
  region: '',
  country: '',
  email: '',
  phone: '',
  status: 'active',
  acquisition_channel: 'staff_created',
  contribution_interests: '',
};

export function AdminSupportersPage() {
  const [rows, setRows] = useState<SupporterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await apiFetch<SupporterRow[]>('/api/supporters');
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load supporters.');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setModal('create');
  };

  const openEdit = (r: SupporterRow) => {
    setEditingId(r.supporter_id);
    setForm({
      supporter_type: r.supporter_type,
      display_name: r.display_name,
      organization_name: r.organization_name ?? '',
      first_name: r.first_name ?? '',
      last_name: r.last_name ?? '',
      relationship_type: r.relationship_type,
      region: r.region,
      country: r.country,
      email: r.email,
      phone: r.phone,
      status: r.status,
      acquisition_channel: r.acquisition_channel,
      contribution_interests: r.contribution_interests ?? '',
    });
    setModal('edit');
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        supporter_type: form.supporter_type.trim(),
        display_name: form.display_name.trim(),
        organization_name: form.organization_name.trim() || null,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        relationship_type: form.relationship_type.trim(),
        region: form.region.trim(),
        country: form.country.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status: form.status.trim(),
        acquisition_channel: form.acquisition_channel.trim(),
        contribution_interests: form.contribution_interests.trim() || null,
      };
      if (modal === 'create') {
        await apiFetch('/api/supporters', { method: 'POST', jsonBody: payload });
      } else if (modal === 'edit' && editingId != null) {
        await apiFetch(`/api/supporters/${editingId}`, { method: 'PUT', jsonBody: payload });
      }
      setModal(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this supporter and related donations (cascade)?')) return;
    setError(null);
    try {
      await apiFetch(`/api/supporters/${id}`, {
        method: 'DELETE',
        jsonBody: { confirmDelete: true },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  return (
    <section>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <nav aria-label="breadcrumb" className="mb-2">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/admin">Admin</Link>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                Supporters
              </li>
            </ol>
          </nav>
          <h1 className="h3 mb-0">Supporters</h1>
          <p className="text-body-secondary small mb-0">
            View and manage supporter profiles, types, and status. Use a profile to record donations and allocations.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Add supporter
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {rows === null ? (
        <p className="text-body-secondary">Loadingâ€¦</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-striped align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Email</th>
                <th>Channel</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.supporter_id}>
                  <td>{r.display_name}</td>
                  <td>{r.supporter_type}</td>
                  <td>{r.status}</td>
                  <td>{r.email}</td>
                  <td>{r.acquisition_channel}</td>
                  <td className="text-end text-nowrap">
                    <Link className="btn btn-outline-secondary btn-sm me-1" to={`/admin/supporters/${r.supporter_id}`}>
                      Donations
                    </Link>
                    <button type="button" className="btn btn-outline-secondary btn-sm me-1" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(r.supporter_id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5">{modal === 'create' ? 'Add supporter' : 'Edit supporter'}</h2>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Display name</label>
                    <input
                      className="form-control"
                      value={form.display_name}
                      onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Supporter type</label>
                    <input
                      className="form-control"
                      value={form.supporter_type}
                      onChange={(e) => setForm((f) => ({ ...f, supporter_type: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Relationship type</label>
                    <input
                      className="form-control"
                      value={form.relationship_type}
                      onChange={(e) => setForm((f) => ({ ...f, relationship_type: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone</label>
                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">First name</label>
                    <input
                      className="form-control"
                      value={form.first_name}
                      onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Last name</label>
                    <input
                      className="form-control"
                      value={form.last_name}
                      onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Organization</label>
                    <input
                      className="form-control"
                      value={form.organization_name}
                      onChange={(e) => setForm((f) => ({ ...f, organization_name: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Region</label>
                    <input
                      className="form-control"
                      value={form.region}
                      onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Country</label>
                    <input
                      className="form-control"
                      value={form.country}
                      onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Acquisition channel</label>
                    <input
                      className="form-control"
                      value={form.acquisition_channel}
                      onChange={(e) => setForm((f) => ({ ...f, acquisition_channel: e.target.value }))}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Contribution interests (JSON array text, optional)</label>
                    <input
                      className="form-control font-monospace small"
                      placeholder='["monetary","volunteer"]'
                      value={form.contribution_interests}
                      onChange={(e) => setForm((f) => ({ ...f, contribution_interests: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setModal(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void save()}>
                  {saving ? 'Savingâ€¦' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}




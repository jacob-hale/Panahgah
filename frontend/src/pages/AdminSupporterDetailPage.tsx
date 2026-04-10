import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';

type SupporterRow = {
  supporter_id: number;
  display_name: string;
  email: string;
  supporter_type: string;
  status: string;
  phone: string;
  region: string;
  country: string;
};

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

type SafehouseRow = {
  safehouse_id: number;
  name: string;
  safehouse_code: string;
};

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AdminSupporterDetailPage() {
  const { supporterId } = useParams<{ supporterId: string }>();
  const id = Number(supporterId);

  const [supporter, setSupporter] = useState<SupporterRow | null>(null);
  const [donations, setDonations] = useState<DonationRow[] | null>(null);
  const [safehouses, setSafehouses] = useState<SafehouseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [donationForm, setDonationForm] = useState({
    donation_type: 'monetary',
    donation_date: todayIsoDate(),
    channel_source: 'staff_recorded',
    currency_code: 'PHP',
    amount: '' as string | number,
    estimated_value: '0',
    impact_unit: 'PHP',
    is_recurring: false,
    campaign_name: '',
    notes: 'Recorded by staff.',
  });

  const [allocModal, setAllocModal] = useState<{ donationId: number } | null>(null);
  const [allocForm, setAllocForm] = useState({
    safehouse_id: '' as string | number,
    program_area: '',
    amount_allocated: '',
    allocation_date: todayIsoDate(),
    allocation_notes: '',
  });

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) return;
    setError(null);
    try {
      const [s, allDonations, sh] = await Promise.all([
        apiFetch<SupporterRow>(`/api/supporters/${id}`),
        apiFetch<DonationRow[]>('/api/donations'),
        apiFetch<SafehouseRow[]>('/api/safehouses'),
      ]);
      setSupporter(s);
      setDonations(allDonations.filter((d) => d.supporter_id === id));
      setSafehouses(sh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
      setSupporter(null);
      setDonations([]);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalRecorded = useMemo(() => {
    if (!donations) return 0;
    return donations.reduce(
      (sum, d) => sum + (d.amount != null ? Number(d.amount) : Number(d.estimated_value) || 0),
      0,
    );
  }, [donations]);

  const addDonation = async () => {
    setError(null);
    try {
      const amountVal = donationForm.amount === '' ? null : Number(donationForm.amount);
      await apiFetch('/api/donations', {
        method: 'POST',
        jsonBody: {
          supporter_id: id,
          donation_type: donationForm.donation_type.trim(),
          donation_date: donationForm.donation_date,
          channel_source: donationForm.channel_source.trim(),
          currency_code: donationForm.currency_code.trim() || null,
          amount: amountVal,
          estimated_value: Number(donationForm.estimated_value) || 0,
          impact_unit: donationForm.impact_unit.trim(),
          is_recurring: donationForm.is_recurring,
          campaign_name: donationForm.campaign_name.trim() || null,
          notes: donationForm.notes.trim(),
          created_by_partner_id: null,
          referral_post_id: null,
        },
      });
      setDonationForm((f) => ({ ...f, notes: 'Recorded by staff.', amount: '' }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save donation.');
    }
  };

  const deleteDonation = async (donationId: number) => {
    if (!window.confirm('Delete this donation (and its allocations)?')) return;
    setError(null);
    try {
      await apiFetch(`/api/donations/${donationId}`, {
        method: 'DELETE',
        jsonBody: { confirmDelete: true },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  const openAlloc = (donationId: number) => {
    if (!safehouses?.length) {
      window.alert('Add safehouses in the database before recording allocations.');
      return;
    }
    setAllocModal({ donationId });
    setAllocForm({
      safehouse_id: safehouses[0].safehouse_id,
      program_area: '',
      amount_allocated: '',
      allocation_date: todayIsoDate(),
      allocation_notes: '',
    });
  };

  const saveAlloc = async () => {
    if (!allocModal) return;
    setError(null);
    try {
      await apiFetch('/api/donation-allocations', {
        method: 'POST',
        jsonBody: {
          donation_id: allocModal.donationId,
          safehouse_id: Number(allocForm.safehouse_id),
          program_area: allocForm.program_area.trim(),
          amount_allocated: Number(allocForm.amount_allocated),
          allocation_date: allocForm.allocation_date,
          allocation_notes: allocForm.allocation_notes.trim(),
        },
      });
      setAllocModal(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save allocation.');
    }
  };

  const deleteAlloc = async (allocationId: number) => {
    if (!window.confirm('Delete this allocation?')) return;
    setError(null);
    try {
      await apiFetch(`/api/donation-allocations/${allocationId}`, {
        method: 'DELETE',
        jsonBody: { confirmDelete: true },
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  if (!Number.isFinite(id)) {
    return <p className="text-danger">Invalid supporter.</p>;
  }

  return (
    <section>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/admin/supporters">Supporters</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            #{id}
          </li>
        </ol>
      </nav>

      {error && <div className="alert alert-danger">{error}</div>}

      {supporter === null && !error ? (
        <p className="text-body-secondary">Loading...</p>
      ) : supporter ? (
        <>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
            <div>
              <h1 className="h3 mb-1">{supporter.display_name}</h1>
              <p className="text-body-secondary small mb-0">
                {supporter.email} - {supporter.supporter_type} - {supporter.status}
                {supporter.phone ? ` - ${supporter.phone}` : ''}
              </p>
            </div>
            <div className="text-end small">
              <div>
                Total recorded value: <strong>{totalRecorded.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h6">Record a contribution</h2>
              <p className="small text-body-secondary">
                Staff-entered activity (monetary, in-kind, time, skills, social, etc.). Allocations can be split across
                safehouses and program areas below each donation.
              </p>
              <div className="row g-2 align-items-end">
                <div className="col-md-3">
                  <label className="form-label small">Type</label>
                  <input
                    className="form-control form-control-sm"
                    value={donationForm.donation_type}
                    onChange={(e) => setDonationForm((f) => ({ ...f, donation_type: e.target.value }))}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small">Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={donationForm.donation_date}
                    onChange={(e) => setDonationForm((f) => ({ ...f, donation_date: e.target.value }))}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Amount (optional)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={donationForm.amount}
                    onChange={(e) => setDonationForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Currency</label>
                  <input
                    className="form-control form-control-sm"
                    value={donationForm.currency_code}
                    onChange={(e) => setDonationForm((f) => ({ ...f, currency_code: e.target.value }))}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small">Est. value</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={donationForm.estimated_value}
                    onChange={(e) => setDonationForm((f) => ({ ...f, estimated_value: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small">Notes</label>
                  <input
                    className="form-control form-control-sm"
                    value={donationForm.notes}
                    onChange={(e) => setDonationForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => void addDonation()}>
                    Add donation
                  </button>
                </div>
              </div>
            </div>
          </div>

          <h2 className="h5 mb-3">Donations &amp; allocations</h2>
          {donations === null ? (
            <p className="text-body-secondary">Loading...</p>
          ) : donations.length === 0 ? (
            <p className="text-body-secondary">No donations recorded for this supporter yet.</p>
          ) : (
            donations.map((d) => (
              <div key={d.donation_id} className="card shadow-sm mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between flex-wrap gap-2">
                    <div>
                      <strong>{d.donation_type}</strong> - {d.donation_date}
                      <div className="small text-body-secondary">
                        {d.amount != null
                          ? `${d.currency_code ?? ''} ${Number(d.amount).toLocaleString()}`.trim()
                          : `Est. ${Number(d.estimated_value).toLocaleString()} (${d.impact_unit})`}
                        {' - '}
                        {d.channel_source}
                      </div>
                      {d.notes ? <div className="small mt-1">{d.notes}</div> : null}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => void deleteDonation(d.donation_id)}
                    >
                      Delete donation
                    </button>
                  </div>
                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small fw-semibold">Allocations</span>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => openAlloc(d.donation_id)}>
                        Add allocation
                      </button>
                    </div>
                    {d.donation_allocations?.length ? (
                      <ul className="list-group list-group-flush">
                        {d.donation_allocations.map((a) => (
                          <li key={a.allocation_id} className="list-group-item d-flex justify-content-between align-items-start">
                            <div>
                              <strong>{a.program_area}</strong> - safehouse #{a.safehouse_id} -{' '}
                              {Number(a.amount_allocated).toLocaleString()} on {a.allocation_date}
                              {a.allocation_notes ? <div className="small text-body-secondary">{a.allocation_notes}</div> : null}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger"
                              onClick={() => void deleteAlloc(a.allocation_id)}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="small text-body-secondary mb-0">No allocations yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      ) : null}

      {allocModal && safehouses && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5">Add allocation</h2>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setAllocModal(null)} />
              </div>
              <div className="modal-body">
                <div className="mb-2">
                  <label className="form-label">Safehouse</label>
                  <select
                    className="form-select"
                    value={allocForm.safehouse_id}
                    onChange={(e) => setAllocForm((f) => ({ ...f, safehouse_id: e.target.value }))}
                  >
                    {safehouses.map((s) => (
                      <option key={s.safehouse_id} value={s.safehouse_id}>
                        {s.safehouse_code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Program area</label>
                  <input
                    className="form-control"
                    value={allocForm.program_area}
                    onChange={(e) => setAllocForm((f) => ({ ...f, program_area: e.target.value }))}
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Amount allocated</label>
                  <input
                    type="number"
                    className="form-control"
                    value={allocForm.amount_allocated}
                    onChange={(e) => setAllocForm((f) => ({ ...f, amount_allocated: e.target.value }))}
                    required
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Allocation date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={allocForm.allocation_date}
                    onChange={(e) => setAllocForm((f) => ({ ...f, allocation_date: e.target.value }))}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label">Notes</label>
                  <input
                    className="form-control"
                    value={allocForm.allocation_notes}
                    onChange={(e) => setAllocForm((f) => ({ ...f, allocation_notes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setAllocModal(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={() => void saveAlloc()}>
                  Save allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}




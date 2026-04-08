import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type {
  HomeVisitationListItem,
  HomeVisitationUpsertPayload,
  PagedResponse,
  Resident,
  UpcomingCaseConferenceListItem,
} from '../api/types';

function formatDateOnly(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  const [yy, mm, dd] = parts.map((p) => Number(p));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return value;
  return new Date(yy, mm - 1, dd).toLocaleDateString();
}

const allowedVisitTypes = [
  'Initial assessment',
  'Routine follow-up',
  'Reintegration assessment',
  'Post-placement monitoring',
  'Emergency',
] as const;

export function VisitsAndConferencesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<HomeVisitationListItem[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<'10' | '20' | '50' | 'Max'>('20');
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [residentOptions, setResidentOptions] = useState<Resident[]>([]);
  const [residentLookupLoading, setResidentLookupLoading] = useState(true);
  const [residentLookupError, setResidentLookupError] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<number | ''>('');

  const [residentModalId, setResidentModalId] = useState<number | null>(null);
  const [residentModal, setResidentModal] = useState<Resident | null>(null);
  const [residentModalLoading, setResidentModalLoading] = useState(false);
  const [residentModalError, setResidentModalError] = useState<string | null>(null);

  const [conferenceLoading, setConferenceLoading] = useState(false);
  const [conferenceError, setConferenceError] = useState<string | null>(null);
  const [conferences, setConferences] = useState<UpcomingCaseConferenceListItem[]>([]);

  const [residentVisitsLoading, setResidentVisitsLoading] = useState(false);
  const [residentVisitsError, setResidentVisitsError] = useState<string | null>(null);
  const [residentVisits, setResidentVisits] = useState<HomeVisitationListItem[]>([]);
  const [residentVisitsPage, setResidentVisitsPage] = useState(1);
  const [residentVisitsTotalPages, setResidentVisitsTotalPages] = useState(1);

  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [createForm, setCreateForm] = useState<HomeVisitationUpsertPayload>(() => ({
    resident_id: 0,
    visit_date: new Date().toISOString().slice(0, 10),
    social_worker: '',
    visit_type: allowedVisitTypes[1],
    location_visited: '',
    family_members_present: '',
    purpose: '',
    observations: '',
    family_cooperation_level: '',
    safety_concerns_noted: false,
    follow_up_needed: false,
    follow_up_notes: '',
    visit_outcome: '',
  }));
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canPaginate = useMemo(() => pageSize !== 'Max' && totalPages > 1, [pageSize, totalPages]);

  const paginationModel = useMemo(() => {
    if (!canPaginate) {
      return { pages: [] as number[], showLeftEllipsis: false, showRightEllipsis: false };
    }

    const neighbors = 2;
    const start = Math.max(1, page - neighbors);
    const end = Math.min(totalPages, page + neighbors);
    const pages: number[] = [];
    for (let p = start; p <= end; p += 1) pages.push(p);
    return { pages, showLeftEllipsis: start > 1, showRightEllipsis: end < totalPages };
  }, [canPaginate, page, totalPages]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize === 'Max' ? 0 : Number.parseInt(pageSize, 10)));
      params.set('sort_order', 'desc');
      const res = await apiFetch<PagedResponse<HomeVisitationListItem>>(`/api/home-visitations?${params.toString()}`);
      setItems(res.items);
      setTotalRecords(res.total_records);
      setTotalPages(res.total_pages);
      setPage(res.current_page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load visitations.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadResidentOptions = useCallback(async () => {
    setResidentLookupLoading(true);
    setResidentLookupError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', '0');
      params.set('sort_field', 'case_control_no');
      params.set('sort_direction', 'asc');
      const res = await apiFetch<PagedResponse<Resident>>(`/api/residents?${params.toString()}`);
      setResidentOptions(res.items);
    } catch {
      setResidentLookupError('Could not load residents for lookup.');
      setResidentOptions([]);
    } finally {
      setResidentLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResidentOptions();
  }, [loadResidentOptions]);

  const closeResidentModal = () => {
    setResidentModalId(null);
    setResidentModal(null);
    setResidentModalError(null);
    setConferences([]);
    setConferenceError(null);
    setResidentVisits([]);
    setResidentVisitsError(null);
    setResidentVisitsPage(1);
    setResidentVisitsTotalPages(1);
    setCreateFormOpen(false);
    setCreateSubmitting(false);
    setCreateError(null);
  };

  const openResidentModal = async (residentId: number) => {
    setResidentModalId(residentId);
    setResidentModal(null);
    setResidentModalLoading(true);
    setResidentModalError(null);
    setConferences([]);
    setConferenceError(null);
    setResidentVisits([]);
    setResidentVisitsError(null);
    setResidentVisitsPage(1);
    setResidentVisitsTotalPages(1);
    setCreateFormOpen(false);
    setCreateError(null);

    try {
      const resident = await apiFetch<Resident>(`/api/residents/${residentId}`);
      setResidentModal(resident);
      setCreateForm((f) => ({ ...f, resident_id: resident.resident_id }));
    } catch (e) {
      setResidentModalError(e instanceof Error ? e.message : 'Could not load resident.');
    } finally {
      setResidentModalLoading(false);
    }
  };

  const loadResidentVisits = useCallback(
    async (residentId: number, pageNum: number) => {
      setResidentVisitsLoading(true);
      setResidentVisitsError(null);
      try {
        const params = new URLSearchParams();
        params.set('resident_id', String(residentId));
        params.set('page', String(pageNum));
        params.set('page_size', '10');
        params.set('sort_order', 'desc');
        const res = await apiFetch<PagedResponse<HomeVisitationListItem>>(`/api/home-visitations?${params.toString()}`);
        setResidentVisits(res.items);
        setResidentVisitsPage(res.current_page);
        setResidentVisitsTotalPages(res.total_pages);
      } catch (e) {
        setResidentVisitsError(e instanceof Error ? e.message : 'Could not load resident visitations.');
        setResidentVisits([]);
      } finally {
        setResidentVisitsLoading(false);
      }
    },
    [],
  );

  const loadConferences = useCallback(async (residentId: number) => {
    setConferenceLoading(true);
    setConferenceError(null);
    try {
      const res = await apiFetch<UpcomingCaseConferenceListItem[]>(
        `/api/case-conferences/upcoming?resident_id=${residentId}&days=60&take=25`,
      );
      setConferences(res);
    } catch (e) {
      setConferenceError(e instanceof Error ? e.message : 'Could not load case conferences.');
      setConferences([]);
    } finally {
      setConferenceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (residentModalId == null) return;
    void loadResidentVisits(residentModalId, 1);
    void loadConferences(residentModalId);
  }, [residentModalId, loadResidentVisits, loadConferences]);

  const submitVisitation = async () => {
    if (!residentModal) return;
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const payload = {
        ...createForm,
        social_worker: createForm.social_worker.trim(),
        visit_type: createForm.visit_type.trim(),
        location_visited: createForm.location_visited.trim(),
        family_members_present: createForm.family_members_present.trim(),
        purpose: createForm.purpose.trim(),
        observations: createForm.observations.trim(),
        family_cooperation_level: createForm.family_cooperation_level.trim(),
        follow_up_notes: createForm.follow_up_notes.trim(),
        visit_outcome: createForm.visit_outcome.trim(),
      };
      await apiFetch('/api/home-visitations', { method: 'POST', jsonBody: payload });
      setCreateFormOpen(false);
      await loadResidentVisits(residentModal.resident_id, 1);
      await loadList();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Create failed.');
    } finally {
      setCreateSubmitting(false);
    }
  };

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
            View and log home/field visits, and review upcoming case conferences for a resident.
          </p>
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-lg-8">
              <label className="form-label" htmlFor="resident_lookup">
                Open resident details
              </label>
              <select
                id="resident_lookup"
                className="form-select"
                value={selectedResidentId}
                onChange={(e) => setSelectedResidentId(e.target.value ? Number(e.target.value) : '')}
                disabled={residentLookupLoading}
              >
                <option value="">{residentLookupLoading ? 'Loading residents…' : 'Select a resident'}</option>
                {residentOptions.map((r) => (
                  <option key={r.resident_id} value={r.resident_id}>
                    {r.case_control_no} · {r.internal_code}
                  </option>
                ))}
              </select>
              {residentLookupError ? <div className="small text-danger mt-1">{residentLookupError}</div> : null}
            </div>
            <div className="col-12 col-lg-4 d-grid">
              <button
                type="button"
                className="btn btn-primary"
                disabled={selectedResidentId === '' || residentLookupLoading}
                onClick={() => {
                  if (selectedResidentId !== '') void openResidentModal(selectedResidentId);
                }}
              >
                Open
              </button>
            </div>
          </div>
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
              <div className="d-flex align-items-center gap-2">
                <label className="small text-body-secondary" htmlFor="hv_rpp">
                  Records
                </label>
                <select
                  id="hv_rpp"
                  className="form-select form-select-sm"
                  style={{ width: 110 }}
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(e.target.value as typeof pageSize);
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="Max">Max</option>
                </select>
              </div>
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
                          <button
                            type="button"
                            className="btn btn-link p-0 text-decoration-none"
                            onClick={() => void openResidentModal(v.resident_id)}
                          >
                            <div className="fw-semibold">{v.resident_case_control_no}</div>
                            <div className="small text-body-secondary">{v.resident_internal_code}</div>
                          </button>
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

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-3">
              <nav aria-label="Home visitation pagination">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${!canPaginate || page <= 1 ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPaginate || page <= 1}>
                      Prev
                    </button>
                  </li>

                  {paginationModel.showLeftEllipsis && (
                    <li className="page-item disabled" aria-hidden="true">
                      <span className="page-link">…</span>
                    </li>
                  )}

                  {paginationModel.pages.map((p) => (
                    <li key={p} className={`page-item ${p === page ? 'active' : ''}`} aria-current={p === page ? 'page' : undefined}>
                      {p === page ? (
                        <span className="page-link">{p}</span>
                      ) : (
                        <button type="button" className="page-link" onClick={() => setPage(p)} disabled={!canPaginate}>
                          {p}
                        </button>
                      )}
                    </li>
                  ))}

                  {paginationModel.showRightEllipsis && (
                    <li className="page-item disabled" aria-hidden="true">
                      <span className="page-link">…</span>
                    </li>
                  )}

                  <li className={`page-item ${!canPaginate || page >= totalPages ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={!canPaginate || page >= totalPages}>
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
              <span className="small text-body-secondary">
                Page {page} of {totalPages} ({totalRecords} total)
              </span>
            </div>
          </div>
        </div>
      )}

      {residentModalId !== null && (
        <>
          <div
            className="modal fade show d-block"
            role="dialog"
            aria-modal="true"
            aria-label="Resident details and visitations"
            tabIndex={-1}
          >
            <div className="modal-dialog modal-dialog-scrollable modal-xl modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title h5 mb-0">
                      {residentModal ? `${residentModal.case_control_no} · ${residentModal.internal_code}` : 'Resident'}
                    </h2>
                    <div className="small text-body-secondary">Home visitations &amp; upcoming case conferences</div>
                  </div>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeResidentModal} />
                </div>

                <div className="modal-body">
                  {residentModalLoading ? (
                    <div className="d-flex justify-content-center py-4">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading…</span>
                      </div>
                    </div>
                  ) : residentModalError ? (
                    <div className="alert alert-danger">{residentModalError}</div>
                  ) : residentModal ? (
                    <div className="row g-3">
                      <div className="col-12 col-lg-5">
                        <div className="card shadow-sm mb-3">
                          <div className="card-body">
                            <h3 className="h6 mb-2">Upcoming case conferences</h3>
                            {conferenceLoading ? (
                              <div className="text-body-secondary small">Loading…</div>
                            ) : conferenceError ? (
                              <div className="text-danger small">{conferenceError}</div>
                            ) : conferences.length === 0 ? (
                              <div className="text-body-secondary small">None scheduled in the next 60 days.</div>
                            ) : (
                              <ul className="list-group list-group-flush">
                                {conferences.map((c) => (
                                  <li className="list-group-item px-0" key={c.plan_id}>
                                    <div className="d-flex justify-content-between">
                                      <span className="fw-semibold">{formatDateOnly(c.case_conference_date)}</span>
                                      <span className="small text-body-secondary">{c.plan_status ?? ''}</span>
                                    </div>
                                    <div className="small text-body-secondary">Plan #{c.plan_id}</div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        <div className="card shadow-sm">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                              <h3 className="h6 mb-0">Log a visitation</h3>
                              <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => setCreateFormOpen((v) => !v)}>
                                {createFormOpen ? 'Close' : 'Add'}
                              </button>
                            </div>
                            {createFormOpen ? (
                              <div className="mt-3">
                                {createError ? <div className="alert alert-danger py-2 mb-2">{createError}</div> : null}
                                <div className="row g-2">
                                  <div className="col-12 col-md-6">
                                    <label className="form-label" htmlFor="hv_date">
                                      Visit date
                                    </label>
                                    <input
                                      id="hv_date"
                                      type="date"
                                      className="form-control"
                                      value={createForm.visit_date}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, visit_date: e.target.value }))}
                                    />
                                  </div>
                                  <div className="col-12 col-md-6">
                                    <label className="form-label" htmlFor="hv_sw">
                                      Social worker
                                    </label>
                                    <input
                                      id="hv_sw"
                                      className="form-control"
                                      value={createForm.social_worker}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, social_worker: e.target.value }))}
                                      placeholder="e.g., SW-04"
                                    />
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label" htmlFor="hv_type">
                                      Visit type
                                    </label>
                                    <select
                                      id="hv_type"
                                      className="form-select"
                                      value={createForm.visit_type}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, visit_type: e.target.value }))}
                                    >
                                      {allowedVisitTypes.map((t) => (
                                        <option key={t} value={t}>
                                          {t}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label" htmlFor="hv_loc">
                                      Location visited
                                    </label>
                                    <input
                                      id="hv_loc"
                                      className="form-control"
                                      value={createForm.location_visited}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, location_visited: e.target.value }))}
                                    />
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label" htmlFor="hv_fam">
                                      Family members present
                                    </label>
                                    <input
                                      id="hv_fam"
                                      className="form-control"
                                      value={createForm.family_members_present}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, family_members_present: e.target.value }))}
                                      placeholder="Names/relationship (optional)"
                                    />
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label" htmlFor="hv_coop">
                                      Family cooperation level
                                    </label>
                                    <input
                                      id="hv_coop"
                                      className="form-control"
                                      value={createForm.family_cooperation_level}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, family_cooperation_level: e.target.value }))}
                                      placeholder="e.g., Cooperative / Neutral / Uncooperative"
                                    />
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label" htmlFor="hv_purpose">
                                      Purpose
                                    </label>
                                    <input
                                      id="hv_purpose"
                                      className="form-control"
                                      value={createForm.purpose}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, purpose: e.target.value }))}
                                    />
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label" htmlFor="hv_obs">
                                      Observations
                                    </label>
                                    <textarea
                                      id="hv_obs"
                                      className="form-control"
                                      rows={4}
                                      value={createForm.observations}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, observations: e.target.value }))}
                                    />
                                  </div>
                                  <div className="col-12 col-md-6">
                                    <div className="form-check mt-2">
                                      <input
                                        id="hv_safety"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={createForm.safety_concerns_noted}
                                        onChange={(e) => setCreateForm((f) => ({ ...f, safety_concerns_noted: e.target.checked }))}
                                      />
                                      <label className="form-check-label" htmlFor="hv_safety">
                                        Safety concerns noted
                                      </label>
                                    </div>
                                  </div>
                                  <div className="col-12 col-md-6">
                                    <div className="form-check mt-2">
                                      <input
                                        id="hv_follow"
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={createForm.follow_up_needed}
                                        onChange={(e) => setCreateForm((f) => ({ ...f, follow_up_needed: e.target.checked }))}
                                      />
                                      <label className="form-check-label" htmlFor="hv_follow">
                                        Follow-up needed
                                      </label>
                                    </div>
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label" htmlFor="hv_follow_notes">
                                      Follow-up actions / notes
                                    </label>
                                    <textarea
                                      id="hv_follow_notes"
                                      className="form-control"
                                      rows={3}
                                      value={createForm.follow_up_notes}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, follow_up_notes: e.target.value }))}
                                      disabled={!createForm.follow_up_needed}
                                    />
                                  </div>
                                  <div className="col-12">
                                    <label className="form-label" htmlFor="hv_outcome">
                                      Outcome
                                    </label>
                                    <input
                                      id="hv_outcome"
                                      className="form-control"
                                      value={createForm.visit_outcome}
                                      onChange={(e) => setCreateForm((f) => ({ ...f, visit_outcome: e.target.value }))}
                                      placeholder="e.g., Favorable"
                                    />
                                  </div>
                                </div>

                                <div className="d-grid mt-3">
                                  <button type="button" className="btn btn-primary" onClick={submitVisitation} disabled={createSubmitting}>
                                    {createSubmitting ? 'Saving…' : 'Save visitation'}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-lg-7">
                        <div className="card shadow-sm">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-baseline">
                              <h3 className="h6 mb-0">Visitations for this resident</h3>
                              <span className="small text-body-secondary">
                                Page {residentVisitsPage} of {residentVisitsTotalPages}
                              </span>
                            </div>

                            {residentVisitsLoading ? (
                              <div className="text-body-secondary small mt-2">Loading…</div>
                            ) : residentVisitsError ? (
                              <div className="text-danger small mt-2">{residentVisitsError}</div>
                            ) : residentVisits.length === 0 ? (
                              <div className="text-body-secondary small mt-2">No visitations for this resident yet.</div>
                            ) : (
                              <div className="table-responsive mt-2">
                                <table className="table table-sm table-striped align-middle mb-0">
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Type</th>
                                      <th>Location</th>
                                      <th>Safety</th>
                                      <th>Follow-up</th>
                                      <th>Outcome</th>
                                      <th>SW</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {residentVisits.map((v) => (
                                      <tr key={v.visitation_id}>
                                        <td>{formatDateOnly(v.visit_date)}</td>
                                        <td>{v.visit_type}</td>
                                        <td>{v.location_visited}</td>
                                        <td>{v.safety_concerns_noted ? 'Yes' : 'No'}</td>
                                        <td>{v.follow_up_needed ? 'Yes' : 'No'}</td>
                                        <td>{v.visit_outcome}</td>
                                        <td>{v.social_worker}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            <div className="d-flex justify-content-between mt-3">
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={residentModalId == null || residentVisitsPage <= 1 || residentVisitsLoading}
                                onClick={() => {
                                  if (residentModalId == null) return;
                                  void loadResidentVisits(residentModalId, Math.max(1, residentVisitsPage - 1));
                                }}
                              >
                                Prev
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                disabled={residentModalId == null || residentVisitsPage >= residentVisitsTotalPages || residentVisitsLoading}
                                onClick={() => {
                                  if (residentModalId == null) return;
                                  void loadResidentVisits(residentModalId, Math.min(residentVisitsTotalPages, residentVisitsPage + 1));
                                }}
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeResidentModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" aria-hidden="true" onClick={closeResidentModal} />
        </>
      )}
    </div>
  );
}


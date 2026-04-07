import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { PagedResponse, ProcessRecording, ProcessRecordingUpsertPayload, Resident } from '../api/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateOnly(v: string): string {
  return v.slice(0, 10);
}

function highlightColor(rec: ProcessRecording): string {
  // Precedence matters: red is a strict subset of yellow per spec.
  if (!rec.progress_noted && rec.concerns_flagged) {
    return '#dc3545'; // Bootstrap danger
  }
  if (rec.progress_noted && !rec.concerns_flagged) {
    return '#198754'; // Bootstrap success
  }
  if (!rec.progress_noted || rec.concerns_flagged) {
    return '#ffc107'; // Bootstrap warning
  }
  return 'transparent';
}

function emptyRecordingPayload(residentId: number): ProcessRecordingUpsertPayload {
  const t = todayIsoDate();
  return {
    resident_id: residentId,
    session_date: t,
    social_worker: '',
    session_type: '',
    session_duration_minutes: 60,
    emotional_state_observed: '',
    emotional_state_end: '',
    session_narrative: '',
    interventions_applied: '',
    follow_up_actions: '',
    progress_noted: false,
    concerns_flagged: false,
    referral_made: false,
    notes_restricted: '',
  };
}

function trimPayload(p: ProcessRecordingUpsertPayload): ProcessRecordingUpsertPayload {
  return {
    ...p,
    social_worker: p.social_worker.trim(),
    session_type: p.session_type.trim(),
    emotional_state_observed: p.emotional_state_observed.trim(),
    emotional_state_end: p.emotional_state_end.trim(),
    session_narrative: p.session_narrative.trim(),
    interventions_applied: p.interventions_applied.trim(),
    follow_up_actions: p.follow_up_actions.trim(),
    notes_restricted: p.notes_restricted.trim(),
  };
}

export function ProcessRecordingPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedResidentId, setSelectedResidentId] = useState<number | ''>('');
  const [sessionForm, setSessionForm] = useState<ProcessRecordingUpsertPayload>(() =>
    emptyRecordingPayload(0),
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecordingId, setEditingRecordingId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<'5' | '10' | '20' | 'Max'>('10');
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState(() => ({
    typeIndividual: false,
    typeGroup: false,
    progressNoted: false,
    concernsFlagged: false,
    referralMade: false,
    fromDate: '',
    toDate: '',
  }));

  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ProcessRecording | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadResidents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await apiFetch<Resident[]>('/api/residents');
      setResidents(r);
    } catch {
      setLoadError('Could not load data. Check login and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResidents();
  }, [loadResidents]);

  const loadRecordings = useCallback(async () => {
    if (selectedResidentId === '') {
      setRecordings([]);
      setTotalRecords(0);
      setTotalPages(1);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      params.set('resident_id', String(selectedResidentId));
      params.set('sort_order', 'desc');
      params.set('page', String(page));

      const apiPageSize = pageSize === 'Max' ? 0 : Number.parseInt(pageSize, 10);
      params.set('page_size', String(apiPageSize));

      const sessionTypes: string[] = [];
      if (filters.typeIndividual) {
        sessionTypes.push('Individual');
      }
      if (filters.typeGroup) {
        sessionTypes.push('Group');
      }
      for (const t of sessionTypes) {
        params.append('session_type', t);
      }

      if (filters.progressNoted) {
        params.set('progress_noted', 'true');
      }
      if (filters.concernsFlagged) {
        params.set('concerns_flagged', 'true');
      }
      if (filters.referralMade) {
        params.set('referral_made', 'true');
      }
      if (filters.fromDate) {
        params.set('from_date', filters.fromDate);
      }
      if (filters.toDate) {
        params.set('to_date', filters.toDate);
      }

      const res = await apiFetch<PagedResponse<ProcessRecording>>(`/api/process-recordings?${params.toString()}`);
      setRecordings(res.items);
      setTotalRecords(res.total_records);
      setTotalPages(res.total_pages);
      // Keep UI page in sync with what server returned (clamped)
      setPage(res.current_page);
    } catch {
      setLoadError('Could not load data. Check login and try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, selectedResidentId]);

  useEffect(() => {
    void loadRecordings();
  }, [loadRecordings]);

  useEffect(() => {
    if (selectedResidentId === '') {
      return;
    }
    setSessionForm(emptyRecordingPayload(selectedResidentId));
    setPage(1);
    setEditingRecordingId(null);
    setIsFormOpen(false);
  }, [selectedResidentId]);

  const FiltersForm = ({ idPrefix }: { idPrefix: string }) => {
    return (
      <form className="d-grid gap-3" onSubmit={(e) => e.preventDefault()}>
        <div>
          <h3 className="h6 mb-2 panahgah-heading">Session type</h3>
          <div className="d-grid gap-2">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id={`${idPrefix}-type-individual`}
                checked={filters.typeIndividual}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, typeIndividual: e.target.checked }));
                }}
              />
              <label className="form-check-label" htmlFor={`${idPrefix}-type-individual`}>
                Individual
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id={`${idPrefix}-type-group`}
                checked={filters.typeGroup}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, typeGroup: e.target.checked }));
                }}
              />
              <label className="form-check-label" htmlFor={`${idPrefix}-type-group`}>
                Group
              </label>
            </div>
          </div>
        </div>

        <div>
          <h3 className="h6 mb-2 panahgah-heading">Status flags</h3>
          <div className="d-grid gap-2">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id={`${idPrefix}-flag-progress`}
                checked={filters.progressNoted}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, progressNoted: e.target.checked }));
                }}
              />
              <label className="form-check-label" htmlFor={`${idPrefix}-flag-progress`}>
                Progress noted
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id={`${idPrefix}-flag-concerns`}
                checked={filters.concernsFlagged}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, concernsFlagged: e.target.checked }));
                }}
              />
              <label className="form-check-label" htmlFor={`${idPrefix}-flag-concerns`}>
                Concerns flagged
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id={`${idPrefix}-flag-referral`}
                checked={filters.referralMade}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, referralMade: e.target.checked }));
                }}
              />
              <label className="form-check-label" htmlFor={`${idPrefix}-flag-referral`}>
                Referral made
              </label>
            </div>
          </div>
        </div>

        <div>
          <h3 className="h6 mb-2 panahgah-heading">Date range</h3>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label" htmlFor={`${idPrefix}-date-from`}>
                From
              </label>
              <input
                id={`${idPrefix}-date-from`}
                type="date"
                className="form-control"
                value={filters.fromDate}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, fromDate: e.target.value }));
                }}
              />
            </div>
            <div className="col-6">
              <label className="form-label" htmlFor={`${idPrefix}-date-to`}>
                To
              </label>
              <input
                id={`${idPrefix}-date-to`}
                type="date"
                className="form-control"
                value={filters.toDate}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, toDate: e.target.value }));
                }}
              />
            </div>
          </div>
        </div>
      </form>
    );
  };

  const canPaginate = useMemo(() => pageSize !== 'Max' && totalPages > 1, [pageSize, totalPages]);

  const paginationModel = useMemo(() => {
    if (!canPaginate) {
      return { pages: [] as number[], showLeftEllipsis: false, showRightEllipsis: false };
    }

    const neighbors = 3;
    const start = Math.max(1, page - neighbors);
    const end = Math.min(totalPages, page + neighbors);

    const pages: number[] = [];
    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }

    return {
      pages,
      showLeftEllipsis: start > 1,
      showRightEllipsis: end < totalPages,
    };
  }, [canPaginate, page, totalPages]);

  const handleUpsertSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedResidentId === '') {
      return;
    }
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      if (editingRecordingId !== null) {
        await apiFetch<ProcessRecording>(`/api/process-recordings/${editingRecordingId}`, {
          method: 'PUT',
          jsonBody: trimPayload({ ...sessionForm, resident_id: selectedResidentId }),
        });
        // Keep filters + pagination; just refresh the current view.
        await loadRecordings();
        setEditingRecordingId(null);
        setIsFormOpen(false);
      } else {
        await apiFetch<ProcessRecording>('/api/process-recordings', {
          method: 'POST',
          jsonBody: trimPayload({ ...sessionForm, resident_id: selectedResidentId }),
        });
        setSessionForm(emptyRecordingPayload(selectedResidentId));
        // Newest-first: take user to first page to see it.
        setPage(1);
        await loadRecordings();
        setIsFormOpen(false);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not create session.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDeleteRecording = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      await apiFetch<unknown>(`/api/process-recordings/${deleteTarget.recording_id}`, {
        method: 'DELETE',
        jsonBody: { confirmDelete: true },
      });
      setDeleteTarget(null);

      // If we deleted the last item on the current page, move back one page (if possible).
      if (pageSize !== 'Max' && page > 1 && recordings.length <= 1) {
        setPage((p) => Math.max(1, p - 1));
        return;
      }

      await loadRecordings();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeleteSubmitting(false);
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
            Process recordings
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-4 panahgah-heading">Process recordings</h1>

      {loading ? (
        <div className="d-flex justify-content-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      ) : loadError ? (
        <div className="alert alert-danger">{loadError}</div>
      ) : (
        <>
          {/* Mobile filters trigger + offcanvas (UI only) */}
          <div className="d-lg-none mb-3">
            <button
              type="button"
              className="btn btn-outline-secondary w-100"
              data-bs-toggle="offcanvas"
              data-bs-target="#processRecordingFilters"
              aria-controls="processRecordingFilters"
            >
              Filters
            </button>
          </div>
          <div
            className="offcanvas offcanvas-end"
            tabIndex={-1}
            id="processRecordingFilters"
            aria-labelledby="processRecordingFiltersLabel"
          >
            <div className="offcanvas-header">
              <h2 className="h5 mb-0 panahgah-heading" id="processRecordingFiltersLabel">
                Filters
              </h2>
              <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close" />
            </div>
            <div className="offcanvas-body">
              <FiltersForm idPrefix="offcanvas" />
            </div>
          </div>

          <div className="row g-4">
            {/* Left column: resident + log new session accordion */}
            <div className="col-12 col-lg-3 order-1 order-lg-1">
              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h2 className="h6 card-title panahgah-heading">Resident</h2>
                  <label htmlFor="residentPick" className="form-label">
                    Select caseload member
                  </label>
                  <select
                    id="residentPick"
                    className="form-select"
                    value={selectedResidentId === '' ? '' : String(selectedResidentId)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedResidentId(v === '' ? '' : Number.parseInt(v, 10));
                    }}
                  >
                    <option value="">Choose a resident…</option>
                    {residents.map((r) => (
                      <option key={r.resident_id} value={r.resident_id}>
                        {r.case_control_no} — {r.internal_code}
                      </option>
                    ))}
                  </select>
                  <p className="small text-body-secondary mt-2 mb-0">
                    Timeline and new sessions are scoped to this resident.
                  </p>
                </div>
              </div>

              <div className="accordion" id="logSessionAccordion">
                <div className="accordion-item">
                  <h2 className="accordion-header" id="logSessionHeading">
                    <button
                      className={`accordion-button panahgah-heading ${isFormOpen ? '' : 'collapsed'}`}
                      type="button"
                      aria-expanded={isFormOpen}
                      aria-controls="logSessionCollapse"
                      onClick={() => setIsFormOpen((v) => !v)}
                    >
                      {editingRecordingId !== null ? 'Edit Session' : 'Log New Session'}
                    </button>
                  </h2>
                  <div
                    id="logSessionCollapse"
                    className={`accordion-collapse collapse ${isFormOpen ? 'show' : ''}`}
                    aria-labelledby="logSessionHeading"
                  >
                    <div className="accordion-body">
                      {selectedResidentId === '' ? (
                        <p className="text-body-secondary small mb-0">
                          Select a resident before logging a session.
                        </p>
                      ) : (
                        <>
                          {createError && <div className="alert alert-danger py-2 small">{createError}</div>}
                          <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
                            <div className="small text-body-secondary">
                              {editingRecordingId !== null
                                ? `Editing recording #${editingRecordingId}.`
                                : 'Create a new process recording entry.'}
                            </div>
                            {editingRecordingId !== null && (
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => {
                                  setEditingRecordingId(null);
                                  setSessionForm(emptyRecordingPayload(selectedResidentId));
                                }}
                                disabled={createSubmitting}
                              >
                                Cancel edit
                              </button>
                            )}
                          </div>
                          <form onSubmit={handleUpsertSession} className="d-grid gap-3">
                            <div className="row g-3">
                              <div className="col-12">
                                <label className="form-label" htmlFor="sdate">
                                  Session date *
                                </label>
                                <input
                                  id="sdate"
                                  type="date"
                                  className="form-control"
                                  required
                                  value={sessionForm.session_date}
                                  onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="stype">
                                  Session type *
                                </label>
                                <input
                                  id="stype"
                                  className="form-control"
                                  required
                                  maxLength={64}
                                  value={sessionForm.session_type}
                                  onChange={(e) => setSessionForm({ ...sessionForm, session_type: e.target.value })}
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="dur">
                                  Duration (minutes) *
                                </label>
                                <input
                                  id="dur"
                                  type="number"
                                  className="form-control"
                                  required
                                  min={1}
                                  max={1440}
                                  value={sessionForm.session_duration_minutes}
                                  onChange={(e) =>
                                    setSessionForm({
                                      ...sessionForm,
                                      session_duration_minutes: Number.parseInt(e.target.value, 10) || 1,
                                    })
                                  }
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="sw">
                                  Social worker *
                                </label>
                                <input
                                  id="sw"
                                  className="form-control"
                                  required
                                  maxLength={256}
                                  value={sessionForm.social_worker}
                                  onChange={(e) => setSessionForm({ ...sessionForm, social_worker: e.target.value })}
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="emo1">
                                  Emotional state (start) *
                                </label>
                                <input
                                  id="emo1"
                                  className="form-control"
                                  required
                                  maxLength={64}
                                  value={sessionForm.emotional_state_observed}
                                  onChange={(e) =>
                                    setSessionForm({ ...sessionForm, emotional_state_observed: e.target.value })
                                  }
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="emo2">
                                  Emotional state (end) *
                                </label>
                                <input
                                  id="emo2"
                                  className="form-control"
                                  required
                                  maxLength={64}
                                  value={sessionForm.emotional_state_end}
                                  onChange={(e) =>
                                    setSessionForm({ ...sessionForm, emotional_state_end: e.target.value })
                                  }
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="nar">
                                  Session narrative *
                                </label>
                                <textarea
                                  id="nar"
                                  className="form-control"
                                  required
                                  maxLength={4000}
                                  rows={4}
                                  value={sessionForm.session_narrative}
                                  onChange={(e) =>
                                    setSessionForm({ ...sessionForm, session_narrative: e.target.value })
                                  }
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="intv">
                                  Interventions applied *
                                </label>
                                <textarea
                                  id="intv"
                                  className="form-control"
                                  required
                                  maxLength={2000}
                                  rows={3}
                                  value={sessionForm.interventions_applied}
                                  onChange={(e) =>
                                    setSessionForm({ ...sessionForm, interventions_applied: e.target.value })
                                  }
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="fu">
                                  Follow-up actions *
                                </label>
                                <textarea
                                  id="fu"
                                  className="form-control"
                                  required
                                  maxLength={2000}
                                  rows={3}
                                  value={sessionForm.follow_up_actions}
                                  onChange={(e) =>
                                    setSessionForm({ ...sessionForm, follow_up_actions: e.target.value })
                                  }
                                />
                              </div>
                              <div className="col-12">
                                <label className="form-label" htmlFor="nr">
                                  Restricted notes
                                </label>
                                <textarea
                                  id="nr"
                                  className="form-control"
                                  maxLength={4000}
                                  rows={3}
                                  value={sessionForm.notes_restricted}
                                  onChange={(e) =>
                                    setSessionForm({ ...sessionForm, notes_restricted: e.target.value })
                                  }
                                />
                              </div>
                              <div className="col-12 d-flex flex-wrap gap-3">
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="pn"
                                    checked={sessionForm.progress_noted}
                                    onChange={(e) =>
                                      setSessionForm({ ...sessionForm, progress_noted: e.target.checked })
                                    }
                                  />
                                  <label className="form-check-label" htmlFor="pn">
                                    Progress noted
                                  </label>
                                </div>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="cf"
                                    checked={sessionForm.concerns_flagged}
                                    onChange={(e) =>
                                      setSessionForm({ ...sessionForm, concerns_flagged: e.target.checked })
                                    }
                                  />
                                  <label className="form-check-label" htmlFor="cf">
                                    Concerns flagged
                                  </label>
                                </div>
                                <div className="form-check">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="rm"
                                    checked={sessionForm.referral_made}
                                    onChange={(e) =>
                                      setSessionForm({ ...sessionForm, referral_made: e.target.checked })
                                    }
                                  />
                                  <label className="form-check-label" htmlFor="rm">
                                    Referral made
                                  </label>
                                </div>
                              </div>
                            </div>
                            <div className="d-flex justify-content-end">
                              <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
                                {createSubmitting
                                  ? 'Saving…'
                                  : editingRecordingId !== null
                                    ? 'Update session'
                                    : 'Log session'}
                              </button>
                            </div>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters panel (desktop only) */}
            <div className="col-12 col-lg-3 order-2 order-lg-3">
              <div className="card shadow-sm d-none d-lg-block">
                <div className="card-body">
                  <h2 className="h6 card-title panahgah-heading">Filters</h2>
                  <p className="small text-body-secondary mb-3">Applies to the selected resident.</p>
                  <FiltersForm idPrefix="desktop" />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="col-12 col-lg-6 order-3 order-lg-2">
              <div className="d-flex align-items-baseline justify-content-between mb-3 gap-3">
                <h2 className="h5 mb-0 panahgah-heading">Session timeline</h2>
                <div className="d-flex align-items-center gap-2">
                  <label className="small text-body-secondary" htmlFor="pageSize">
                    Page size
                  </label>
                  <select
                    id="pageSize"
                    className="form-select form-select-sm"
                    style={{ width: 110 }}
                    value={pageSize}
                    onChange={(e) => {
                      setPage(1);
                      setPageSize(e.target.value as typeof pageSize);
                    }}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="Max">Max</option>
                  </select>
                </div>
              </div>

              {selectedResidentId === '' ? (
                <div className="card shadow-sm">
                  <div className="card-body">
                    <p className="text-body-secondary small mb-0">Select a resident to view sessions.</p>
                  </div>
                </div>
              ) : recordings.length === 0 ? (
                <div className="card shadow-sm">
                  <div className="card-body">
                    <p className="text-body-secondary small mb-0">No sessions logged yet for this resident.</p>
                  </div>
                </div>
              ) : (
                <div className="d-grid gap-3">
                  <div className="small text-body-secondary">
                    Showing page {page} of {totalPages} ({totalRecords} total).
                  </div>

                  {recordings.map((rec) => (
                    <div key={rec.recording_id} className="card shadow-sm">
                      <div className="card-body">
                        <div className="ps-3" style={{ borderLeft: `4px solid ${highlightColor(rec)}` }}>
                          <div className="d-flex align-items-start justify-content-between gap-3">
                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                              <div className="d-flex flex-wrap align-items-baseline gap-2">
                                <span className="h6 mb-0 panahgah-heading">{dateOnly(rec.session_date)}</span>
                                <span className="badge text-bg-secondary">{rec.session_type}</span>
                              </div>
                              <div className="d-flex flex-wrap gap-3 mt-1 small text-body-secondary">
                                <span>
                                  <span className="text-body-secondary">Social worker: </span>
                                  <span className="text-body">{rec.social_worker}</span>
                                </span>
                                <span>
                                  <span className="text-body-secondary">Duration: </span>
                                  <span className="text-body">{rec.session_duration_minutes} min</span>
                                </span>
                              </div>
                            </div>

                            <div className="dropdown">
                              <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                aria-label="Actions menu"
                              >
                                ⋮
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                <li>
                                  <button
                                    className="dropdown-item"
                                    type="button"
                                    onClick={() => {
                                      setCreateError(null);
                                      setEditingRecordingId(rec.recording_id);
                                      setSessionForm({
                                        resident_id: rec.resident_id,
                                        session_date: dateOnly(rec.session_date),
                                        social_worker: rec.social_worker,
                                        session_type: rec.session_type,
                                        session_duration_minutes: rec.session_duration_minutes,
                                        emotional_state_observed: rec.emotional_state_observed,
                                        emotional_state_end: rec.emotional_state_end,
                                        session_narrative: rec.session_narrative,
                                        interventions_applied: rec.interventions_applied,
                                        follow_up_actions: rec.follow_up_actions,
                                        progress_noted: rec.progress_noted,
                                        concerns_flagged: rec.concerns_flagged,
                                        referral_made: rec.referral_made,
                                        notes_restricted: rec.notes_restricted ?? '',
                                      });
                                      setIsFormOpen(true);
                                      document
                                        .getElementById('logSessionAccordion')
                                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                  >
                                    Edit
                                  </button>
                                </li>
                                <li>
                                  <button
                                    className="dropdown-item text-danger"
                                    type="button"
                                    onClick={() => {
                                      setDeleteError(null);
                                      setDeleteTarget(rec);
                                    }}
                                  >
                                    Delete
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </div>

                          <div className="d-flex flex-wrap gap-2 mt-3">
                            {rec.progress_noted && (
                              <span className="badge text-bg-light border text-body-secondary">Progress noted</span>
                            )}
                            {rec.concerns_flagged && (
                              <span className="badge text-bg-light border text-body-secondary">Concerns flagged</span>
                            )}
                            {rec.referral_made && (
                              <span className="badge text-bg-light border text-body-secondary">Referral made</span>
                            )}
                          </div>

                          <div className="border rounded p-2 mt-3 bg-body-tertiary">
                            <div className="small text-body-secondary">Affect Progression</div>
                            <div className="small fw-semibold text-break">
                              <span className="text-body-secondary">Observed: </span>
                              {rec.emotional_state_observed}
                              <span className="text-body-secondary"> → End: </span>
                              {rec.emotional_state_end}
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="small text-body-secondary mb-1">Session Narrative (summary)</div>
                            <div className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                              {rec.session_narrative}
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="small text-body-secondary mb-1">Interventions Applied</div>
                            <div className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                              {rec.interventions_applied}
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="small text-body-secondary mb-1">Follow-up Actions</div>
                            <div className="text-break" style={{ whiteSpace: 'pre-wrap' }}>
                              {rec.follow_up_actions}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination UI only */}
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2">
                    <nav aria-label="Timeline pagination">
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${!canPaginate || page <= 1 ? 'disabled' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={!canPaginate || page <= 1}
                          >
                            Prev
                          </button>
                        </li>

                        {paginationModel.showLeftEllipsis && (
                          <li className="page-item disabled" aria-hidden="true">
                            <span className="page-link">…</span>
                          </li>
                        )}

                        {paginationModel.pages.map((p) => (
                          <li
                            key={p}
                            className={`page-item ${p === page ? 'active' : ''}`}
                            aria-current={p === page ? 'page' : undefined}
                          >
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

                        <li className={`page-item ${!canPaginate || page + 1 > totalPages ? 'disabled' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={!canPaginate || page + 1 > totalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                    <span className="small text-body-secondary">
                      {pageSize === 'Max' ? 'Max returns all filtered records.' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteModal
        show={deleteTarget !== null}
        title="Delete process recording"
        description="This removes the session record permanently."
        itemLabel={
          deleteTarget
            ? `#${deleteTarget.recording_id} — ${dateOnly(deleteTarget.session_date)} (${deleteTarget.session_type})`
            : ''
        }
        isSubmitting={deleteSubmitting}
        error={deleteError}
        onClose={() => {
          if (!deleteSubmitting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        onDelete={handleDeleteRecording}
      />
    </div>
  );
}

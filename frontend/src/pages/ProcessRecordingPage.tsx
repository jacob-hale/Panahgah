import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { ProcessRecording, ProcessRecordingUpsertPayload, Resident } from '../api/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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

  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ProcessRecording | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [r, rec] = await Promise.all([
        apiFetch<Resident[]>('/api/residents'),
        apiFetch<ProcessRecording[]>('/api/process-recordings'),
      ]);
      setResidents(r);
      setRecordings(rec);
    } catch {
      setLoadError('Could not load data. Check login and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedResidentId === '') {
      return;
    }
    setSessionForm(emptyRecordingPayload(selectedResidentId));
  }, [selectedResidentId]);

  const residentLabel = useMemo(() => {
    const m = new Map<number, string>();
    for (const res of residents) {
      m.set(res.resident_id, `${res.case_control_no} · ${res.internal_code}`);
    }
    return m;
  }, [residents]);

  const timeline = useMemo(() => {
    if (selectedResidentId === '') {
      return [];
    }
    return recordings
      .filter((p) => p.resident_id === selectedResidentId)
      .sort((a, b) => {
        const d = b.session_date.localeCompare(a.session_date);
        if (d !== 0) {
          return d;
        }
        return b.recording_id - a.recording_id;
      });
  }, [recordings, selectedResidentId]);

  const handleCreateSession = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedResidentId === '') {
      return;
    }
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      await apiFetch<ProcessRecording>('/api/process-recordings', {
        method: 'POST',
        jsonBody: trimPayload({ ...sessionForm, resident_id: selectedResidentId }),
      });
      setSessionForm(emptyRecordingPayload(selectedResidentId));
      await loadData();
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
      await loadData();
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

      <h1 className="h3 mb-4">Process recordings</h1>

      {loading ? (
        <div className="d-flex justify-content-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      ) : loadError ? (
        <div className="alert alert-danger">{loadError}</div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h2 className="h6 card-title">Resident</h2>
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
          </div>

          <div className="col-lg-8">
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h2 className="h6 card-title">Session timeline</h2>
                {selectedResidentId === '' ? (
                  <p className="text-body-secondary small mb-0">Select a resident to view sessions.</p>
                ) : timeline.length === 0 ? (
                  <p className="text-body-secondary small mb-0">No sessions logged yet for this resident.</p>
                ) : (
                  <ul className="list-group list-group-flush border rounded">
                    {timeline.map((rec) => (
                      <li
                        key={rec.recording_id}
                        className="list-group-item d-flex flex-column flex-md-row gap-3 align-items-md-start"
                      >
                        <div
                          className="border-start border-4 border-primary ps-3 flex-grow-1"
                          style={{ minWidth: 0 }}
                        >
                          <div className="d-flex flex-wrap gap-2 align-items-baseline">
                            <span className="fw-semibold">{rec.session_date}</span>
                            <span className="badge text-bg-secondary">{rec.session_type}</span>
                            <span className="small text-body-secondary">
                              {rec.session_duration_minutes} min · {rec.social_worker}
                            </span>
                          </div>
                          <p className="small mb-1 mt-2">
                            <span className="text-body-secondary">Start / end affect: </span>
                            {rec.emotional_state_observed} → {rec.emotional_state_end}
                          </p>
                          <p className="small mb-0 text-break">{rec.session_narrative}</p>
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {rec.progress_noted && <span className="badge text-bg-success">Progress</span>}
                            {rec.concerns_flagged && <span className="badge text-bg-warning text-dark">Concerns</span>}
                            {rec.referral_made && <span className="badge text-bg-info text-dark">Referral</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm align-self-md-center"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(rec);
                          }}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-body">
                <h2 className="h6 card-title">Log new session</h2>
                {selectedResidentId === '' ? (
                  <p className="text-body-secondary small mb-0">Select a resident before logging a session.</p>
                ) : (
                  <>
                    {createError && (
                      <div className="alert alert-danger py-2 small">{createError}</div>
                    )}
                    <form onSubmit={handleCreateSession} className="d-grid gap-3">
                      <div className="row g-3">
                        <div className="col-md-4">
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
                        <div className="col-md-4">
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
                        <div className="col-md-4">
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
                        <div className="col-md-6">
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
                        <div className="col-md-3">
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
                        <div className="col-md-3">
                          <label className="form-label" htmlFor="emo2">
                            Emotional state (end) *
                          </label>
                          <input
                            id="emo2"
                            className="form-control"
                            required
                            maxLength={64}
                            value={sessionForm.emotional_state_end}
                            onChange={(e) => setSessionForm({ ...sessionForm, emotional_state_end: e.target.value })}
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
                            onChange={(e) => setSessionForm({ ...sessionForm, session_narrative: e.target.value })}
                          />
                        </div>
                        <div className="col-12 col-md-6">
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
                        <div className="col-12 col-md-6">
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
                            onChange={(e) => setSessionForm({ ...sessionForm, follow_up_actions: e.target.value })}
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label" htmlFor="nr">
                            Restricted notes *
                          </label>
                          <textarea
                            id="nr"
                            className="form-control"
                            required
                            maxLength={4000}
                            rows={3}
                            value={sessionForm.notes_restricted}
                            onChange={(e) => setSessionForm({ ...sessionForm, notes_restricted: e.target.value })}
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
                              onChange={(e) => setSessionForm({ ...sessionForm, referral_made: e.target.checked })}
                            />
                            <label className="form-check-label" htmlFor="rm">
                              Referral made
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-end">
                        <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
                          {createSubmitting ? 'Saving…' : 'Log session'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        show={deleteTarget !== null}
        title="Delete process recording"
        description="This removes the session record permanently."
        itemLabel={
          deleteTarget
            ? `${residentLabel.get(deleteTarget.resident_id) ?? 'Resident'} — ${deleteTarget.session_date} (#${deleteTarget.recording_id})`
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

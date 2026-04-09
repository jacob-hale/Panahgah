import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { HomeVisitationListItem, HomeVisitationLogPayload, PagedResponse, Resident, UpcomingCaseConferenceListItem } from '../api/types';

function formatDateOnly(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  const [yy, mm, dd] = parts.map((p) => Number(p));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return value;
  return new Date(yy, mm - 1, dd).toLocaleDateString();
}

/**
 * Visit types: match backend HomeVisitationCatalog (same as your original product spec).
 * Home environment, family cooperation, follow-up: same catalog — chosen for consistent data entry,
 * not auto-mined from existing DB rows. To align with legacy data, compare against DB distinct values
 * and update backend HomeVisitationCatalog + these arrays together.
 */
const visitTypes = [
  'Initial assessment',
  'Routine follow-up',
  'Reintegration assessment',
  'Post-placement monitoring',
  'Emergency',
] as const;

const homeEnvironmentObservations = [
  'Stable, clean, and supportive',
  'Adequate with minor concerns',
  'Concerning conditions observed',
  'Unsafe or unsuitable',
  'Other (describe below)',
] as const;

const familyCooperationLevels = [
  'Cooperative',
  'Highly Cooperative',
  'Neutral',
  'Uncooperative',
] as const;

const homeOtherLabel = 'Other (describe below)';

export function VisitsAndConferencesPage() {
  const [residentOptions, setResidentOptions] = useState<Resident[]>([]);
  const [residentLookupLoading, setResidentLookupLoading] = useState(true);
  const [residentLookupError, setResidentLookupError] = useState<string | null>(null);

  const [logFormOpen, setLogFormOpen] = useState(false);

  const [residentId, setResidentId] = useState<number | ''>('');
  const [visitType, setVisitType] = useState('');
  const [homeEnv, setHomeEnv] = useState('');
  const [homeEnvOther, setHomeEnvOther] = useState('');
  const [observationsAdditional, setObservationsAdditional] = useState('');
  const [familyCoop, setFamilyCoop] = useState('');
  /** Empty until the user chooses; maps to safety_concerns_noted on submit. */
  const [safetySelection, setSafetySelection] = useState<'yes' | 'no' | ''>('');
  /** Empty until the user chooses; maps to follow_up_needed on submit. */
  const [followUpNeededSelection, setFollowUpNeededSelection] = useState<'yes' | 'no' | ''>('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [conferenceResidentId, setConferenceResidentId] = useState<number | ''>('');
  const [conferenceLoading, setConferenceLoading] = useState(false);
  const [conferenceError, setConferenceError] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingCaseConferenceListItem[]>([]);
  const [history, setHistory] = useState<UpcomingCaseConferenceListItem[]>([]);

  const [visitsResidentId, setVisitsResidentId] = useState<number | ''>('');
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsError, setVisitsError] = useState<string | null>(null);
  const [visits, setVisits] = useState<HomeVisitationListItem[]>([]);

  const resetForm = useCallback(() => {
    setResidentId('');
    setVisitType('');
    setHomeEnv('');
    setHomeEnvOther('');
    setObservationsAdditional('');
    setFamilyCoop('');
    setSafetySelection('');
    setFollowUpNeededSelection('');
  }, []);

  const closeLogForm = useCallback(() => {
    setLogFormOpen(false);
    setSubmitError(null);
    resetForm();
  }, [resetForm]);

  const openLogForm = useCallback(() => {
    setSubmitError(null);
    setLogFormOpen(true);
  }, []);

  useEffect(() => {
    if (!logFormOpen) return;
    document.body.classList.add('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [logFormOpen]);

  useEffect(() => {
    if (!logFormOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLogForm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [logFormOpen, closeLogForm]);

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
      setResidentLookupError('Could not load residents.');
      setResidentOptions([]);
    } finally {
      setResidentLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResidentOptions();
  }, [loadResidentOptions]);

  const loadConferences = useCallback(async (rid: number) => {
    setConferenceLoading(true);
    setConferenceError(null);
    try {
      const [up, hist] = await Promise.all([
        apiFetch<UpcomingCaseConferenceListItem[]>(
          `/api/case-conferences/upcoming?resident_id=${rid}&days=60&take=25`,
        ),
        apiFetch<UpcomingCaseConferenceListItem[]>(`/api/case-conferences/history?resident_id=${rid}&take=50`),
      ]);
      setUpcoming(up);
      setHistory(hist);
    } catch (e) {
      setConferenceError(e instanceof Error ? e.message : 'Could not load case conferences.');
      setUpcoming([]);
      setHistory([]);
    } finally {
      setConferenceLoading(false);
    }
  }, []);

  const loadVisitationsForResident = useCallback(async (rid: number) => {
    setVisitsLoading(true);
    setVisitsError(null);
    try {
      const params = new URLSearchParams();
      params.set('resident_id', String(rid));
      params.set('page', '1');
      params.set('page_size', '50');
      params.set('sort_order', 'desc');
      const res = await apiFetch<PagedResponse<HomeVisitationListItem>>(`/api/home-visitations?${params.toString()}`);
      setVisits(res.items);
    } catch (e) {
      setVisitsError(e instanceof Error ? e.message : 'Could not load visitations.');
      setVisits([]);
    } finally {
      setVisitsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (conferenceResidentId === '') {
      setUpcoming([]);
      setHistory([]);
      setConferenceError(null);
      return;
    }
    void loadConferences(conferenceResidentId);
  }, [conferenceResidentId, loadConferences]);

  useEffect(() => {
    if (visitsResidentId === '') {
      setVisits([]);
      setVisitsError(null);
      return;
    }
    void loadVisitationsForResident(visitsResidentId);
  }, [visitsResidentId, loadVisitationsForResident]);

  const submitVisitation = async () => {
    setSubmitError(null);

    if (residentId === '') {
      setSubmitError('Select a resident for this visit.');
      return;
    }

    if (!visitType) {
      setSubmitError('Select a visit type.');
      return;
    }

    if (!homeEnv) {
      setSubmitError('Select observations about the home environment.');
      return;
    }

    if (!familyCoop) {
      setSubmitError('Select a family cooperation level.');
      return;
    }

    if (!safetySelection) {
      setSubmitError('Select a safety concerns option.');
      return;
    }

    if (!followUpNeededSelection) {
      setSubmitError('Select whether follow-up is needed.');
      return;
    }

    if (homeEnv === homeOtherLabel && homeEnvOther.trim().length < 3) {
      setSubmitError('Describe the home environment when you select “Other”.');
      return;
    }

    const payload: HomeVisitationLogPayload = {
      resident_id: residentId,
      visit_type: visitType,
      home_environment_observation: homeEnv,
      family_cooperation_level: familyCoop,
      safety_concerns_noted: safetySelection === 'yes',
      follow_up_needed: followUpNeededSelection === 'yes',
    };

    if (homeEnv === homeOtherLabel) {
      payload.home_environment_other = homeEnvOther.trim();
    }
    const addl = observationsAdditional.trim();
    if (addl.length > 0) {
      payload.observations_additional = addl;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/home-visitations', { method: 'POST', jsonBody: payload });
      setSubmitSuccess('Visitation logged.');
      closeLogForm();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save visitation.');
    } finally {
      setSubmitting(false);
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
            Visitations and Conferences
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-4">Visitations and Conferences</h1>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Visitation log</h2>

          {submitSuccess ? (
            <div className="alert alert-success alert-dismissible py-2 mb-3" role="status">
              {submitSuccess}
              <button
                type="button"
                className="btn-close"
                aria-label="Dismiss"
                onClick={() => setSubmitSuccess(null)}
              />
            </div>
          ) : null}

          <button type="button" className="btn btn-primary btn-lg" onClick={openLogForm}>
            Log new visitation
          </button>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h5 mb-3">Existing visitations</h2>

          <div className="mb-3">
            <label className="form-label" htmlFor="hv_existing_resident">
              Resident
            </label>
            <select
              id="hv_existing_resident"
              className="form-select"
              value={visitsResidentId}
              onChange={(e) => setVisitsResidentId(e.target.value ? Number(e.target.value) : '')}
              disabled={residentLookupLoading}
            >
              <option value="">Select a resident</option>
              {residentOptions.map((r) => (
                <option key={r.resident_id} value={r.resident_id}>
                  {r.case_control_no} · {r.internal_code}
                </option>
              ))}
            </select>
          </div>

          {visitsResidentId === '' ? (
            <div className="text-body-secondary small">Choose a resident to view their visitations.</div>
          ) : visitsLoading ? (
            <div className="d-flex justify-content-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading…</span>
              </div>
            </div>
          ) : visitsError ? (
            <div className="alert alert-danger py-2">{visitsError}</div>
          ) : visits.length === 0 ? (
            <div className="text-body-secondary small">No visitations found for this resident.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Visit type</th>
                    <th scope="col">Home environment / notes</th>
                    <th scope="col">Family cooperation</th>
                    <th scope="col">Safety concerns</th>
                    <th scope="col">Follow-up needed</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.visitation_id}>
                      <td className="text-nowrap">{formatDateOnly(v.visit_date)}</td>
                      <td>{v.visit_type}</td>
                      <td style={{ minWidth: 260, whiteSpace: 'pre-wrap' }}>{v.observations}</td>
                      <td>{v.family_cooperation_level}</td>
                      <td>{v.safety_concerns_noted ? 'Yes' : 'No'}</td>
                      <td>{v.follow_up_needed ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5 mb-3">Case conferences by resident</h2>
          <p className="text-body-secondary small mb-3">
            Select a resident to see upcoming conferences (next 60 days) and past conference dates from intervention
            plans.
          </p>

          <div className="mb-3">
            <label className="form-label" htmlFor="cc_resident">
              Resident
            </label>
            <select
              id="cc_resident"
              className="form-select"
              value={conferenceResidentId}
              onChange={(e) => setConferenceResidentId(e.target.value ? Number(e.target.value) : '')}
              disabled={residentLookupLoading}
            >
              <option value="">Select a resident</option>
              {residentOptions.map((r) => (
                <option key={r.resident_id} value={r.resident_id}>
                  {r.case_control_no} · {r.internal_code}
                </option>
              ))}
            </select>
          </div>

          {conferenceResidentId === '' ? (
            <div className="text-body-secondary small">Choose a resident to load conferences.</div>
          ) : conferenceLoading ? (
            <div className="d-flex justify-content-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading…</span>
              </div>
            </div>
          ) : conferenceError ? (
            <div className="alert alert-danger py-2">{conferenceError}</div>
          ) : (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <h3 className="h6">Upcoming</h3>
                {upcoming.length === 0 ? (
                  <div className="text-body-secondary small">None scheduled in the next 60 days.</div>
                ) : (
                  <ul className="list-group list-group-flush border rounded">
                    {upcoming.map((c) => (
                      <li className="list-group-item" key={`u-${c.plan_id}`}>
                        <div className="d-flex justify-content-between gap-2">
                          <span className="fw-semibold">{formatDateOnly(c.case_conference_date)}</span>
                          <span className="small text-body-secondary">{c.plan_status ?? ''}</span>
                        </div>
                        <div className="small text-body-secondary">Plan #{c.plan_id}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="col-12 col-md-6">
                <h3 className="h6">History</h3>
                {history.length === 0 ? (
                  <div className="text-body-secondary small">No past conference dates on file.</div>
                ) : (
                  <ul className="list-group list-group-flush border rounded">
                    {history.map((c) => (
                      <li className="list-group-item" key={`h-${c.plan_id}`}>
                        <div className="d-flex justify-content-between gap-2">
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
          )}
        </div>
      </div>

      {logFormOpen ? (
        <>
          <div
            className="modal fade show d-block"
            id="log-visitation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-visitation-title"
            tabIndex={-1}
          >
            <div className="modal-dialog modal-fullscreen modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header border-bottom">
                  <h2 className="modal-title h5 mb-0" id="log-visitation-title">
                    Log new visitation
                  </h2>
                  <button type="button" className="btn-close" aria-label="Cancel" onClick={closeLogForm} />
                </div>

                <div className="modal-body">
                  {submitError ? <div className="alert alert-danger py-2 mb-3">{submitError}</div> : null}

                  <div className="mb-3">
                    <label className="form-label" htmlFor="hv_resident">
                      Resident <span className="text-danger">*</span>
                    </label>
                    <select
                      id="hv_resident"
                      className="form-select"
                      value={residentId}
                      onChange={(e) => setResidentId(e.target.value ? Number(e.target.value) : '')}
                      disabled={residentLookupLoading}
                    >
                      <option value="">{residentLookupLoading ? 'Loading residents…' : 'Select resident (case / internal code)'}</option>
                      {residentOptions.map((r) => (
                        <option key={r.resident_id} value={r.resident_id}>
                          {r.case_control_no} · {r.internal_code}
                        </option>
                      ))}
                    </select>
                    {residentLookupError ? <div className="small text-danger mt-1">{residentLookupError}</div> : null}
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="hv_visit_type">
                      Visit type
                    </label>
                    <select
                      id="hv_visit_type"
                      className="form-select"
                      value={visitType}
                      onChange={(e) => setVisitType(e.target.value)}
                    >
                      <option value="">Select visit type</option>
                      {visitTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="hv_home_env">
                      Observations about the home environment
                    </label>
                    <select
                      id="hv_home_env"
                      className="form-select"
                      value={homeEnv}
                      onChange={(e) => setHomeEnv(e.target.value)}
                    >
                      <option value="">Select an option</option>
                      {homeEnvironmentObservations.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    {homeEnv === homeOtherLabel ? (
                      <div className="mt-2">
                        <label className="form-label small" htmlFor="home_env_other">
                          Describe (required for “Other”)
                        </label>
                        <textarea
                          id="home_env_other"
                          className="form-control"
                          rows={3}
                          value={homeEnvOther}
                          onChange={(e) => setHomeEnvOther(e.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="hv_family_coop">
                      Family cooperation level
                    </label>
                    <select
                      id="hv_family_coop"
                      className="form-select"
                      value={familyCoop}
                      onChange={(e) => setFamilyCoop(e.target.value)}
                    >
                      <option value="">Select family cooperation level</option>
                      {familyCooperationLevels.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="hv_safety">
                      Safety concerns
                    </label>
                    <select
                      id="hv_safety"
                      className="form-select"
                      value={safetySelection}
                      onChange={(e) => setSafetySelection(e.target.value as '' | 'yes' | 'no')}
                    >
                      <option value="">Select safety status</option>
                      <option value="no">No safety concerns noted</option>
                      <option value="yes">Safety concerns noted</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="hv_follow_up_needed">
                      Follow-up needed
                    </label>
                    <select
                      id="hv_follow_up_needed"
                      className="form-select"
                      value={followUpNeededSelection}
                      onChange={(e) => setFollowUpNeededSelection(e.target.value as '' | 'yes' | 'no')}
                    >
                      <option value="">Select follow-up status</option>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="obs_addl">
                      Additional observation notes <span className="text-body-secondary fw-normal">(optional)</span>
                    </label>
                    <textarea
                      id="obs_addl"
                      className="form-control"
                      rows={3}
                      value={observationsAdditional}
                      onChange={(e) => setObservationsAdditional(e.target.value)}
                    />
                  </div>

                  <p className="small text-body-secondary mt-2 mb-0">
                    Visit date is set automatically to today (UTC). Other database fields not shown here are filled with
                    standard placeholders so the record saves cleanly.
                  </p>
                </div>

                <div className="modal-footer border-top flex-wrap gap-2">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeLogForm} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={submitVisitation} disabled={submitting}>
                    {submitting ? 'Saving…' : 'Log visitation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" aria-hidden="true" onClick={closeLogForm} />
        </>
      ) : null}
    </div>
  );
}

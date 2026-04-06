import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { Resident, ResidentUpsertPayload, Safehouse } from '../api/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyResidentForm(safehouseId: number): ResidentUpsertPayload {
  const t = todayIsoDate();
  return {
    case_control_no: '',
    internal_code: '',
    safehouse_id: safehouseId,
    case_status: '',
    sex: '',
    date_of_birth: t,
    birth_status: '',
    place_of_birth: '',
    religion: '',
    case_category: '',
    sub_cat_orphaned: false,
    sub_cat_trafficked: false,
    sub_cat_child_labor: false,
    sub_cat_physical_abuse: false,
    sub_cat_sexual_abuse: false,
    sub_cat_osaec: false,
    sub_cat_cicl: false,
    sub_cat_at_risk: false,
    sub_cat_street_child: false,
    sub_cat_child_with_hiv: false,
    is_pwd: false,
    pwd_type: null,
    has_special_needs: false,
    special_needs_diagnosis: null,
    family_is_4ps: false,
    family_solo_parent: false,
    family_indigenous: false,
    family_parent_pwd: false,
    family_informal_settler: false,
    date_of_admission: t,
    age_upon_admission: '',
    present_age: '',
    length_of_stay: '',
    referral_source: '',
    referring_agency_person: '',
    date_colb_registered: null,
    date_colb_obtained: null,
    assigned_social_worker: '',
    initial_case_assessment: '',
    date_case_study_prepared: null,
    reintegration_type: null,
    reintegration_status: null,
    initial_risk_level: '',
    current_risk_level: '',
    date_enrolled: t,
    date_closed: null,
    notes_restricted: '',
  };
}

function toPayload(form: ResidentUpsertPayload): ResidentUpsertPayload {
  const trim = (s: string) => s.trim();
  return {
    ...form,
    case_control_no: trim(form.case_control_no),
    internal_code: trim(form.internal_code),
    case_status: trim(form.case_status),
    sex: trim(form.sex),
    birth_status: trim(form.birth_status),
    place_of_birth: trim(form.place_of_birth),
    religion: trim(form.religion),
    case_category: trim(form.case_category),
    pwd_type: form.pwd_type?.trim() || null,
    special_needs_diagnosis: form.special_needs_diagnosis?.trim() || null,
    age_upon_admission: trim(form.age_upon_admission),
    present_age: trim(form.present_age),
    length_of_stay: trim(form.length_of_stay),
    referral_source: trim(form.referral_source),
    referring_agency_person: trim(form.referring_agency_person),
    assigned_social_worker: trim(form.assigned_social_worker),
    initial_case_assessment: trim(form.initial_case_assessment),
    reintegration_type: form.reintegration_type?.trim() || null,
    reintegration_status: form.reintegration_status?.trim() || null,
    initial_risk_level: trim(form.initial_risk_level),
    current_risk_level: trim(form.current_risk_level),
    notes_restricted: trim(form.notes_restricted),
  };
}

type OptionalDateFields = Pick<
  ResidentUpsertPayload,
  | 'date_colb_registered'
  | 'date_colb_obtained'
  | 'date_case_study_prepared'
  | 'date_closed'
>;

function optionalDateString(value: string | null | undefined): string {
  return value ?? '';
}

export function CaseloadInventoryPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const [form, setForm] = useState<ResidentUpsertPayload>(() => emptyResidentForm(0));
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const [r, s] = await Promise.all([
        apiFetch<Resident[]>('/api/residents'),
        apiFetch<Safehouse[]>('/api/safehouses'),
      ]);
      setResidents(r);
      setSafehouses(s);
    } catch {
      setListError('Could not load residents or safehouses. Ensure you are signed in as Admin or Donor for reads.');
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (safehouses.length > 0 && form.safehouse_id === 0) {
      setForm((f) => ({ ...f, safehouse_id: safehouses[0].safehouse_id }));
    }
  }, [safehouses, form.safehouse_id]);

  const safehouseNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const sh of safehouses) {
      m.set(sh.safehouse_id, sh.name);
    }
    return m;
  }, [safehouses]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    if (!form.safehouse_id) {
      setCreateError('Select a safehouse (add a safehouse in the database if none appear).');
      return;
    }
    setCreateSubmitting(true);
    try {
      const payload = toPayload(form);
      await apiFetch<Resident>('/api/residents', {
        method: 'POST',
        jsonBody: payload,
      });
      setForm(emptyResidentForm(safehouses[0]?.safehouse_id ?? 0));
      await loadData();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Create failed.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      await apiFetch<unknown>(`/api/residents/${deleteTarget.resident_id}`, {
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

  const setOptionalDate = (key: keyof OptionalDateFields, value: string) => {
    setForm((f) => ({ ...f, [key]: value === '' ? null : value }));
  };

  return (
    <div>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Caseload inventory
          </li>
        </ol>
      </nav>

      <h1 className="h3 mb-4">Caseload inventory</h1>

      {listLoading ? (
        <div className="d-flex justify-content-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      ) : listError ? (
        <div className="alert alert-danger">{listError}</div>
      ) : (
        <>
          <section className="card shadow-sm mb-4">
            <div className="card-body">
              <h2 className="h5 card-title">Residents</h2>
              <div className="table-responsive">
                <table className="table table-sm table-striped align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Case control</th>
                      <th scope="col">Internal code</th>
                      <th scope="col">Status</th>
                      <th scope="col">Sex</th>
                      <th scope="col">DOB</th>
                      <th scope="col">Safehouse</th>
                      <th scope="col">Social worker</th>
                      <th scope="col" className="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-body-secondary small">
                          No residents yet. Create one using the form below.
                        </td>
                      </tr>
                    ) : (
                      residents.map((r) => (
                        <tr key={r.resident_id}>
                          <td>{r.resident_id}</td>
                          <td>{r.case_control_no}</td>
                          <td>{r.internal_code}</td>
                          <td>{r.case_status}</td>
                          <td>{r.sex}</td>
                          <td>{r.date_of_birth}</td>
                          <td>{safehouseNameById.get(r.safehouse_id) ?? r.safehouse_id}</td>
                          <td>{r.assigned_social_worker}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(r);
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="card shadow-sm">
            <div className="card-body">
              <h2 className="h5 card-title">Create resident</h2>
              <p className="small text-body-secondary">
                All fields mirror the API contract. Restricted notes belong in the dedicated field only.
              </p>

              {createError && <div className="alert alert-danger py-2 small">{createError}</div>}

              <form onSubmit={handleCreate} className="d-grid gap-4">
                <fieldset className="border rounded-3 p-3">
                  <legend className="float-none w-auto px-2 fs-6 fw-semibold">Case identification</legend>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="ccn">
                        Case control no. *
                      </label>
                      <input
                        id="ccn"
                        className="form-control"
                        required
                        maxLength={64}
                        value={form.case_control_no}
                        onChange={(e) => setForm({ ...form, case_control_no: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="internal">
                        Internal code *
                      </label>
                      <input
                        id="internal"
                        className="form-control"
                        required
                        maxLength={64}
                        value={form.internal_code}
                        onChange={(e) => setForm({ ...form, internal_code: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="sh">
                        Safehouse *
                      </label>
                      <select
                        id="sh"
                        className="form-select"
                        required
                        value={form.safehouse_id || ''}
                        onChange={(e) =>
                          setForm({ ...form, safehouse_id: Number.parseInt(e.target.value, 10) })
                        }
                        disabled={safehouses.length === 0}
                      >
                        {safehouses.length === 0 ? (
                          <option value="">No safehouses — add one via API or seed data</option>
                        ) : (
                          safehouses.map((sh) => (
                            <option key={sh.safehouse_id} value={sh.safehouse_id}>
                              {sh.name} ({sh.safehouse_code})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="cstatus">
                        Case status *
                      </label>
                      <input
                        id="cstatus"
                        className="form-control"
                        required
                        maxLength={64}
                        value={form.case_status}
                        onChange={(e) => setForm({ ...form, case_status: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="ccat">
                        Case category *
                      </label>
                      <input
                        id="ccat"
                        className="form-control"
                        required
                        maxLength={64}
                        value={form.case_category}
                        onChange={(e) => setForm({ ...form, case_category: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="small text-body-secondary mt-3 mb-2">Subcategories</p>
                  <div className="row row-cols-2 row-cols-md-3 g-2">
                    {(
                      [
                        ['sub_cat_orphaned', 'Orphaned'],
                        ['sub_cat_trafficked', 'Trafficked'],
                        ['sub_cat_child_labor', 'Child labor'],
                        ['sub_cat_physical_abuse', 'Physical abuse'],
                        ['sub_cat_sexual_abuse', 'Sexual abuse'],
                        ['sub_cat_osaec', 'OSAEC'],
                        ['sub_cat_cicl', 'CICL'],
                        ['sub_cat_at_risk', 'At risk'],
                        ['sub_cat_street_child', 'Street child'],
                        ['sub_cat_child_with_hiv', 'Child with HIV'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="col">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={key}
                            checked={form[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                          />
                          <label className="form-check-label" htmlFor={key}>
                            {label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="border rounded-3 p-3">
                  <legend className="float-none w-auto px-2 fs-6 fw-semibold">Demographics</legend>
                  <div className="row g-3">
                    <div className="col-md-3">
                      <label className="form-label" htmlFor="sex">
                        Sex *
                      </label>
                      <input
                        id="sex"
                        className="form-control"
                        required
                        maxLength={16}
                        value={form.sex}
                        onChange={(e) => setForm({ ...form, sex: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label" htmlFor="dob">
                        Date of birth *
                      </label>
                      <input
                        id="dob"
                        type="date"
                        className="form-control"
                        required
                        value={form.date_of_birth}
                        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label" htmlFor="bstatus">
                        Birth status *
                      </label>
                      <input
                        id="bstatus"
                        className="form-control"
                        required
                        maxLength={64}
                        value={form.birth_status}
                        onChange={(e) => setForm({ ...form, birth_status: e.target.value })}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label" htmlFor="pob">
                        Place of birth *
                      </label>
                      <input
                        id="pob"
                        className="form-control"
                        required
                        maxLength={256}
                        value={form.place_of_birth}
                        onChange={(e) => setForm({ ...form, place_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="religion">
                        Religion *
                      </label>
                      <input
                        id="religion"
                        className="form-control"
                        required
                        maxLength={128}
                        value={form.religion}
                        onChange={(e) => setForm({ ...form, religion: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <div className="form-check mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="is_pwd"
                          checked={form.is_pwd}
                          onChange={(e) => setForm({ ...form, is_pwd: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="is_pwd">
                          Person with disability
                        </label>
                      </div>
                      <input
                        className="form-control mt-2"
                        maxLength={256}
                        placeholder="PWD type (optional)"
                        value={form.pwd_type ?? ''}
                        onChange={(e) => setForm({ ...form, pwd_type: e.target.value || null })}
                        disabled={!form.is_pwd}
                      />
                    </div>
                    <div className="col-md-4">
                      <div className="form-check gap-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="has_sn"
                          checked={form.has_special_needs}
                          onChange={(e) => setForm({ ...form, has_special_needs: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="has_sn">
                          Special needs
                        </label>
                      </div>
                      <textarea
                        className="form-control mt-2"
                        rows={2}
                        maxLength={512}
                        placeholder="Diagnosis (optional)"
                        value={form.special_needs_diagnosis ?? ''}
                        onChange={(e) => setForm({ ...form, special_needs_diagnosis: e.target.value || null })}
                        disabled={!form.has_special_needs}
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="border rounded-3 p-3">
                  <legend className="float-none w-auto px-2 fs-6 fw-semibold">Family & admission</legend>
                  <div className="row g-3">
                    {(
                      [
                        ['family_is_4ps', '4Ps'],
                        ['family_solo_parent', 'Solo parent'],
                        ['family_indigenous', 'Indigenous'],
                        ['family_parent_pwd', 'Parent PWD'],
                        ['family_informal_settler', 'Informal settler'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="col-6 col-md-4">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={key}
                            checked={form[key]}
                            onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                          />
                          <label className="form-check-label" htmlFor={key}>
                            {label}
                          </label>
                        </div>
                      </div>
                    ))}
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="doa">
                        Date of admission *
                      </label>
                      <input
                        id="doa"
                        type="date"
                        className="form-control"
                        required
                        value={form.date_of_admission}
                        onChange={(e) => setForm({ ...form, date_of_admission: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="aau">
                        Age upon admission *
                      </label>
                      <input
                        id="aau"
                        className="form-control"
                        required
                        maxLength={128}
                        value={form.age_upon_admission}
                        onChange={(e) => setForm({ ...form, age_upon_admission: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="page">
                        Present age *
                      </label>
                      <input
                        id="page"
                        className="form-control"
                        required
                        maxLength={128}
                        value={form.present_age}
                        onChange={(e) => setForm({ ...form, present_age: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="los">
                        Length of stay *
                      </label>
                      <input
                        id="los"
                        className="form-control"
                        required
                        maxLength={128}
                        value={form.length_of_stay}
                        onChange={(e) => setForm({ ...form, length_of_stay: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="refsrc">
                        Referral source *
                      </label>
                      <input
                        id="refsrc"
                        className="form-control"
                        required
                        maxLength={128}
                        value={form.referral_source}
                        onChange={(e) => setForm({ ...form, referral_source: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="refper">
                        Referring agency / person *
                      </label>
                      <input
                        id="refper"
                        className="form-control"
                        required
                        maxLength={256}
                        value={form.referring_agency_person}
                        onChange={(e) => setForm({ ...form, referring_agency_person: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="dcr">
                        COLB registered
                      </label>
                      <input
                        id="dcr"
                        type="date"
                        className="form-control"
                        value={optionalDateString(form.date_colb_registered)}
                        onChange={(e) => setOptionalDate('date_colb_registered', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="dco">
                        COLB obtained
                      </label>
                      <input
                        id="dco"
                        type="date"
                        className="form-control"
                        value={optionalDateString(form.date_colb_obtained)}
                        onChange={(e) => setOptionalDate('date_colb_obtained', e.target.value)}
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="border rounded-3 p-3">
                  <legend className="float-none w-auto px-2 fs-6 fw-semibold">Assessment & case closure</legend>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label" htmlFor="asw">
                        Assigned social worker *
                      </label>
                      <input
                        id="asw"
                        className="form-control"
                        required
                        maxLength={256}
                        value={form.assigned_social_worker}
                        onChange={(e) => setForm({ ...form, assigned_social_worker: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="ica">
                        Initial case assessment *
                      </label>
                      <textarea
                        id="ica"
                        className="form-control"
                        required
                        maxLength={2000}
                        rows={4}
                        value={form.initial_case_assessment}
                        onChange={(e) => setForm({ ...form, initial_case_assessment: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="dcsp">
                        Date case study prepared
                      </label>
                      <input
                        id="dcsp"
                        type="date"
                        className="form-control"
                        value={optionalDateString(form.date_case_study_prepared)}
                        onChange={(e) => setOptionalDate('date_case_study_prepared', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="rint">
                        Reintegration type
                      </label>
                      <input
                        id="rint"
                        className="form-control"
                        maxLength={128}
                        value={form.reintegration_type ?? ''}
                        onChange={(e) => setForm({ ...form, reintegration_type: e.target.value || null })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="rins">
                        Reintegration status
                      </label>
                      <input
                        id="rins"
                        className="form-control"
                        maxLength={128}
                        value={form.reintegration_status ?? ''}
                        onChange={(e) => setForm({ ...form, reintegration_status: e.target.value || null })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="irl">
                        Initial risk level *
                      </label>
                      <input
                        id="irl"
                        className="form-control"
                        required
                        maxLength={64}
                        value={form.initial_risk_level}
                        onChange={(e) => setForm({ ...form, initial_risk_level: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="crl">
                        Current risk level *
                      </label>
                      <input
                        id="crl"
                        className="form-control"
                        required
                        maxLength={64}
                        value={form.current_risk_level}
                        onChange={(e) => setForm({ ...form, current_risk_level: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="denr">
                        Date enrolled *
                      </label>
                      <input
                        id="denr"
                        type="date"
                        className="form-control"
                        required
                        value={form.date_enrolled}
                        onChange={(e) => setForm({ ...form, date_enrolled: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label" htmlFor="dcl">
                        Date closed
                      </label>
                      <input
                        id="dcl"
                        type="date"
                        className="form-control"
                        value={optionalDateString(form.date_closed)}
                        onChange={(e) => setOptionalDate('date_closed', e.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label" htmlFor="notes">
                        Restricted notes *
                      </label>
                      <textarea
                        id="notes"
                        className="form-control"
                        required
                        maxLength={4000}
                        rows={4}
                        value={form.notes_restricted}
                        onChange={(e) => setForm({ ...form, notes_restricted: e.target.value })}
                      />
                    </div>
                  </div>
                </fieldset>

                <div className="d-flex gap-2 justify-content-end">
                  <button type="submit" className="btn btn-primary" disabled={createSubmitting || !safehouses.length}>
                    {createSubmitting ? 'Creating…' : 'Create resident'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </>
      )}

      <ConfirmDeleteModal
        show={deleteTarget !== null}
        title="Delete resident"
        description="This permanently removes the resident record from the caseload. This cannot be undone."
        itemLabel={
          deleteTarget
            ? `${deleteTarget.case_control_no} (ID ${deleteTarget.resident_id})`
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
        onDelete={handleDelete}
      />
    </div>
  );
}

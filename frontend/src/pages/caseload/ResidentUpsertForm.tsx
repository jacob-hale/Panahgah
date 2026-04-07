import { useCallback } from 'react';
import type { ResidentUpsertPayload, Safehouse } from '../../api/types';
import type { OptionalDateFields } from './residentFormUtils';
import { optionalDateString } from './residentFormUtils';

type Props = {
  form: ResidentUpsertPayload;
  setForm: React.Dispatch<React.SetStateAction<ResidentUpsertPayload>>;
  safehouses: Safehouse[];
  isEdit: boolean;
  submitting: boolean;
  onSubmit: (event: React.FormEvent) => void;
};

export function ResidentUpsertForm({ form, setForm, safehouses, isEdit, submitting, onSubmit }: Props) {
  const setOptionalDate = useCallback((key: keyof OptionalDateFields, value: string) => {
    setForm((f) => ({ ...f, [key]: value === '' ? null : value }));
  }, [setForm]);

  return (
    <form onSubmit={onSubmit} className="d-grid gap-4">
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
              onChange={(e) => setForm({ ...form, safehouse_id: Number.parseInt(e.target.value, 10) })}
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

      <div className="d-flex flex-wrap gap-2 justify-content-end">
        <button type="submit" className="btn btn-primary" disabled={submitting || !safehouses.length}>
          {submitting ? 'Saving…' : isEdit ? 'Update resident' : 'Create resident'}
        </button>
      </div>
    </form>
  );
}

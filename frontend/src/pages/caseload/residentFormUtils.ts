import type { Resident, ResidentUpsertPayload } from '../../api/types';

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function emptyResidentForm(safehouseId: number): ResidentUpsertPayload {
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

export function toPayload(form: ResidentUpsertPayload): ResidentUpsertPayload {
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

export type OptionalDateFields = Pick<
  ResidentUpsertPayload,
  'date_colb_registered' | 'date_colb_obtained' | 'date_case_study_prepared' | 'date_closed'
>;

export function optionalDateString(value: string | null | undefined): string {
  return value ?? '';
}

export function residentToUpsertPayload(r: Resident): ResidentUpsertPayload {
  return {
    case_control_no: r.case_control_no,
    internal_code: r.internal_code,
    safehouse_id: r.safehouse_id,
    case_status: r.case_status,
    sex: r.sex,
    date_of_birth: r.date_of_birth,
    birth_status: r.birth_status,
    place_of_birth: r.place_of_birth,
    religion: r.religion,
    case_category: r.case_category,
    sub_cat_orphaned: r.sub_cat_orphaned,
    sub_cat_trafficked: r.sub_cat_trafficked,
    sub_cat_child_labor: r.sub_cat_child_labor,
    sub_cat_physical_abuse: r.sub_cat_physical_abuse,
    sub_cat_sexual_abuse: r.sub_cat_sexual_abuse,
    sub_cat_osaec: r.sub_cat_osaec,
    sub_cat_cicl: r.sub_cat_cicl,
    sub_cat_at_risk: r.sub_cat_at_risk,
    sub_cat_street_child: r.sub_cat_street_child,
    sub_cat_child_with_hiv: r.sub_cat_child_with_hiv,
    is_pwd: r.is_pwd,
    pwd_type: r.pwd_type,
    has_special_needs: r.has_special_needs,
    special_needs_diagnosis: r.special_needs_diagnosis,
    family_is_4ps: r.family_is_4ps,
    family_solo_parent: r.family_solo_parent,
    family_indigenous: r.family_indigenous,
    family_parent_pwd: r.family_parent_pwd,
    family_informal_settler: r.family_informal_settler,
    date_of_admission: r.date_of_admission,
    age_upon_admission: r.age_upon_admission,
    present_age: r.present_age,
    length_of_stay: r.length_of_stay,
    referral_source: r.referral_source,
    referring_agency_person: r.referring_agency_person,
    date_colb_registered: r.date_colb_registered,
    date_colb_obtained: r.date_colb_obtained,
    assigned_social_worker: r.assigned_social_worker,
    initial_case_assessment: r.initial_case_assessment,
    date_case_study_prepared: r.date_case_study_prepared,
    reintegration_type: r.reintegration_type,
    reintegration_status: r.reintegration_status,
    initial_risk_level: r.initial_risk_level,
    current_risk_level: r.current_risk_level,
    date_enrolled: r.date_enrolled,
    date_closed: r.date_closed,
    notes_restricted: r.notes_restricted,
  };
}

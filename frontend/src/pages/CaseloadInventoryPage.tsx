import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { PagedResponse, Resident, ResidentUpsertPayload, Safehouse } from '../api/types';
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

function residentToUpsertPayload(r: Resident): ResidentUpsertPayload {
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

export function CaseloadInventoryPage() {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const [form, setForm] = useState<ResidentUpsertPayload>(() => emptyResidentForm(0));
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [editingResidentId, setEditingResidentId] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [selectedResidentForDetails, setSelectedResidentForDetails] = useState<Resident | null>(null);
  const [isResidentFormOpen, setIsResidentFormOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<'5' | '10' | '20' | '50' | 'Max'>('10');
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState(() => ({
    search: '',
    case_status: '',
    safehouse_id: '',
    case_category: '',
    assigned_social_worker: '',
    reintegration_status: '',
    current_risk_level: '',
    referral_source: '',
    date_of_admission_from: '',
    date_of_admission_to: '',
  }));

  const loadData = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const s = await apiFetch<Safehouse[]>('/api/safehouses');
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

  const loadResidents = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize === 'Max' ? 0 : Number.parseInt(pageSize, 10)));
      params.set('sort_field', 'case_control_no');
      params.set('sort_direction', 'asc');

      if (filters.search.trim()) params.set('search', filters.search.trim());
      if (filters.case_status.trim()) params.set('case_status', filters.case_status.trim());
      if (filters.safehouse_id) params.set('safehouse_id', filters.safehouse_id);
      if (filters.case_category.trim()) params.set('case_category', filters.case_category.trim());
      if (filters.assigned_social_worker.trim()) params.set('assigned_social_worker', filters.assigned_social_worker.trim());
      if (filters.reintegration_status.trim()) params.set('reintegration_status', filters.reintegration_status.trim());
      if (filters.current_risk_level.trim()) params.set('current_risk_level', filters.current_risk_level.trim());
      if (filters.referral_source.trim()) params.set('referral_source', filters.referral_source.trim());
      if (filters.date_of_admission_from) params.set('date_of_admission_from', filters.date_of_admission_from);
      if (filters.date_of_admission_to) params.set('date_of_admission_to', filters.date_of_admission_to);

      const res = await apiFetch<PagedResponse<Resident>>(`/api/residents?${params.toString()}`);
      setResidents(res.items);
      setTotalRecords(res.total_records);
      setTotalPages(res.total_pages);
      setPage(res.current_page);
      setSelectedResidentForDetails(null);
    } catch {
      setListError('Could not load residents. Ensure you are signed in as Admin or Donor for reads.');
    } finally {
      setListLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void loadResidents();
  }, [loadResidents]);

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
      if (editingResidentId !== null) {
        await apiFetch<Resident>(`/api/residents/${editingResidentId}`, {
          method: 'PUT',
          jsonBody: payload,
        });
        await loadResidents();
        setEditingResidentId(null);
        setIsResidentFormOpen(false);
      } else {
        await apiFetch<Resident>('/api/residents', {
          method: 'POST',
          jsonBody: payload,
        });
        setForm(emptyResidentForm(safehouses[0]?.safehouse_id ?? 0));
        setPage(1);
        await loadResidents();
        setIsResidentFormOpen(false);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : editingResidentId !== null ? 'Update failed.' : 'Create failed.');
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

      // If we removed the last item on the current page, step back a page if possible.
      if (pageSize !== 'Max' && page > 1 && residents.length <= 1) {
        setPage((p) => Math.max(1, p - 1));
        return;
      }

      await loadResidents();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const setOptionalDate = (key: keyof OptionalDateFields, value: string) => {
    setForm((f) => ({ ...f, [key]: value === '' ? null : value }));
  };

  const closeDetails = () => {
    setSelectedResidentForDetails(null);
  };

  const closeResidentForm = () => {
    if (createSubmitting) {
      return;
    }
    setIsResidentFormOpen(false);
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
          {/* Full-width table focus + top action bar */}
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div className="small text-body-secondary">
              {totalRecords} resident{totalRecords === 1 ? '' : 's'}
            </div>
            <div className="d-flex align-items-center gap-2 ms-auto">
              <div className="dropdown">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Filters
                </button>
                <div className="dropdown-menu dropdown-menu-end p-3" style={{ width: 320 }}>
                  <div className="d-grid gap-3">
                    <div>
                      <label className="form-label" htmlFor="search">
                        Search
                      </label>
                      <input
                        id="search"
                        className="form-control"
                        placeholder="case control, internal code, social worker…"
                        value={filters.search}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((f) => ({ ...f, search: e.target.value }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="f_case_status">
                        Case status
                      </label>
                      <input
                        id="f_case_status"
                        className="form-control"
                        placeholder="e.g., Active"
                        value={filters.case_status}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((f) => ({ ...f, case_status: e.target.value }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="f_safehouse">
                        Safehouse
                      </label>
                      <select
                        id="f_safehouse"
                        className="form-select"
                        value={filters.safehouse_id}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((f) => ({ ...f, safehouse_id: e.target.value }));
                        }}
                      >
                        <option value="">All safehouses</option>
                        {safehouses.map((sh) => (
                          <option key={sh.safehouse_id} value={sh.safehouse_id}>
                            {sh.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="f_case_category">
                        Case category
                      </label>
                      <input
                        id="f_case_category"
                        className="form-control"
                        placeholder="e.g., Trafficked"
                        value={filters.case_category}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((f) => ({ ...f, case_category: e.target.value }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="f_sw">
                        Assigned social worker
                      </label>
                      <input
                        id="f_sw"
                        className="form-control"
                        placeholder="e.g., SW-01"
                        value={filters.assigned_social_worker}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((f) => ({ ...f, assigned_social_worker: e.target.value }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="f_reintegration">
                        Reintegration status
                      </label>
                      <input
                        id="f_reintegration"
                        className="form-control"
                        placeholder="e.g., In progress"
                        value={filters.reintegration_status}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((f) => ({ ...f, reintegration_status: e.target.value }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="f_risk">
                        Risk level
                      </label>
                      <input
                        id="f_risk"
                        className="form-control"
                        placeholder="initial or current"
                        value={filters.current_risk_level}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((f) => ({ ...f, current_risk_level: e.target.value }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="f_referral">
                        Referral source
                      </label>
                      <input
                        id="f_referral"
                        className="form-control"
                        placeholder="e.g., Agency"
                        value={filters.referral_source}
                        onChange={(e) => {
                          setPage(1);
                          setFilters((f) => ({ ...f, referral_source: e.target.value }));
                        }}
                      />
                    </div>
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label" htmlFor="f_doa_from">
                          Admission from
                        </label>
                        <input
                          id="f_doa_from"
                          type="date"
                          className="form-control"
                          value={filters.date_of_admission_from}
                          onChange={(e) => {
                            setPage(1);
                            setFilters((f) => ({ ...f, date_of_admission_from: e.target.value }));
                          }}
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label" htmlFor="f_doa_to">
                          Admission to
                        </label>
                        <input
                          id="f_doa_to"
                          type="date"
                          className="form-control"
                          value={filters.date_of_admission_to}
                          onChange={(e) => {
                            setPage(1);
                            setFilters((f) => ({ ...f, date_of_admission_to: e.target.value }));
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => {
                        setPage(1);
                        setFilters({
                          search: '',
                          case_status: '',
                          safehouse_id: '',
                          case_category: '',
                          assigned_social_worker: '',
                          reintegration_status: '',
                          current_risk_level: '',
                          referral_source: '',
                          date_of_admission_from: '',
                          date_of_admission_to: '',
                        });
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setCreateError(null);
                  setEditingResidentId(null);
                  setForm(emptyResidentForm(safehouses[0]?.safehouse_id ?? 0));
                  setIsResidentFormOpen(true);
                }}
              >
                Add New Resident
              </button>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-baseline justify-content-between gap-3 mb-2">
                <h2 className="h5 card-title mb-0 panahgah-heading">Residents</h2>
                <div className="d-flex align-items-center gap-2">
                  <label className="small text-body-secondary" htmlFor="rpp">
                    Records
                  </label>
                  <select
                    id="rpp"
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
                    <option value="50">50</option>
                    <option value="Max">Max</option>
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-sm table-striped align-middle mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Case control</th>
                      <th scope="col">Internal code</th>
                      <th scope="col">Status</th>
                      <th scope="col">Case category</th>
                      <th scope="col">Safehouse</th>
                      <th scope="col">Social worker</th>
                      <th scope="col">Admission</th>
                      <th scope="col">Reintegration</th>
                      <th scope="col" className="text-end">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-body-secondary small">
                          No residents found for the current filters.
                        </td>
                      </tr>
                    ) : (
                      residents.map((r) => {
                        return (
                          <tr key={r.resident_id}>
                            <td>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-decoration-none"
                                onClick={() => setSelectedResidentForDetails(r)}
                              >
                                {r.case_control_no}
                              </button>
                            </td>
                            <td>{r.internal_code}</td>
                            <td>{r.case_status}</td>
                            <td>{r.case_category}</td>
                            <td>{safehouseNameById.get(r.safehouse_id) ?? r.safehouse_id}</td>
                            <td>{r.assigned_social_worker}</td>
                            <td>{r.date_of_admission}</td>
                            <td>{r.reintegration_status ?? ''}</td>
                            <td className="text-end">
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
                                        setEditingResidentId(r.resident_id);
                                        setForm(residentToUpsertPayload(r));
                                        setIsResidentFormOpen(true);
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
                                        setDeleteTarget(r);
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-3">
                <nav aria-label="Caseload pagination">
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

                    <li className={`page-item ${!canPaginate || page >= totalPages ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={!canPaginate || page >= totalPages}
                      >
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
                    {createSubmitting ? 'Saving…' : editingResidentId !== null ? 'Update resident' : 'Create resident'}
                  </button>
                </div>
                      </form>
                    </div>
                  </div>
                </div>

                <div className="accordion-item">
                  <h2 className="accordion-header" id="filtersHeading">
                    <button
                      className={`accordion-button panahgah-heading ${isFiltersOpen ? '' : 'collapsed'}`}
                      type="button"
                      aria-expanded={isFiltersOpen}
                      aria-controls="filtersCollapse"
                      onClick={() => setIsFiltersOpen((v) => !v)}
                    >
                      Filters
                    </button>
                  </h2>
                  <div
                    id="filtersCollapse"
                    className={`accordion-collapse collapse ${isFiltersOpen ? 'show' : ''}`}
                    aria-labelledby="filtersHeading"
                  >
                    <div className="accordion-body">
                      <div className="d-grid gap-3">
                        <div>
                          <label className="form-label" htmlFor="search">
                            Search
                          </label>
                          <input
                            id="search"
                            className="form-control"
                            placeholder="case control, internal code, social worker…"
                            value={filters.search}
                            onChange={(e) => {
                              setPage(1);
                              setFilters((f) => ({ ...f, search: e.target.value }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor="f_case_status">
                            Case status
                          </label>
                          <input
                            id="f_case_status"
                            className="form-control"
                            placeholder="e.g., Active"
                            value={filters.case_status}
                            onChange={(e) => {
                              setPage(1);
                              setFilters((f) => ({ ...f, case_status: e.target.value }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor="f_safehouse">
                            Safehouse
                          </label>
                          <select
                            id="f_safehouse"
                            className="form-select"
                            value={filters.safehouse_id}
                            onChange={(e) => {
                              setPage(1);
                              setFilters((f) => ({ ...f, safehouse_id: e.target.value }));
                            }}
                          >
                            <option value="">All safehouses</option>
                            {safehouses.map((sh) => (
                              <option key={sh.safehouse_id} value={sh.safehouse_id}>
                                {sh.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="form-label" htmlFor="f_case_category">
                            Case category
                          </label>
                          <input
                            id="f_case_category"
                            className="form-control"
                            placeholder="e.g., Trafficked"
                            value={filters.case_category}
                            onChange={(e) => {
                              setPage(1);
                              setFilters((f) => ({ ...f, case_category: e.target.value }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor="f_sw">
                            Assigned social worker
                          </label>
                          <input
                            id="f_sw"
                            className="form-control"
                            placeholder="e.g., SW-01"
                            value={filters.assigned_social_worker}
                            onChange={(e) => {
                              setPage(1);
                              setFilters((f) => ({ ...f, assigned_social_worker: e.target.value }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor="f_reintegration">
                            Reintegration status
                          </label>
                          <input
                            id="f_reintegration"
                            className="form-control"
                            placeholder="e.g., In progress"
                            value={filters.reintegration_status}
                            onChange={(e) => {
                              setPage(1);
                              setFilters((f) => ({ ...f, reintegration_status: e.target.value }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor="f_risk">
                            Risk level
                          </label>
                          <input
                            id="f_risk"
                            className="form-control"
                            placeholder="initial or current"
                            value={filters.current_risk_level}
                            onChange={(e) => {
                              setPage(1);
                              setFilters((f) => ({ ...f, current_risk_level: e.target.value }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label" htmlFor="f_referral">
                            Referral source
                          </label>
                          <input
                            id="f_referral"
                            className="form-control"
                            placeholder="e.g., Agency"
                            value={filters.referral_source}
                            onChange={(e) => {
                              setPage(1);
                              setFilters((f) => ({ ...f, referral_source: e.target.value }));
                            }}
                          />
                        </div>
                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label" htmlFor="f_doa_from">
                              Admission from
                            </label>
                            <input
                              id="f_doa_from"
                              type="date"
                              className="form-control"
                              value={filters.date_of_admission_from}
                              onChange={(e) => {
                                setPage(1);
                                setFilters((f) => ({ ...f, date_of_admission_from: e.target.value }));
                              }}
                            />
                          </div>
                          <div className="col-6">
                            <label className="form-label" htmlFor="f_doa_to">
                              Admission to
                            </label>
                            <input
                              id="f_doa_to"
                              type="date"
                              className="form-control"
                              value={filters.date_of_admission_to}
                              onChange={(e) => {
                                setPage(1);
                                setFilters((f) => ({ ...f, date_of_admission_to: e.target.value }));
                              }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            setPage(1);
                            setFilters({
                              search: '',
                              case_status: '',
                              safehouse_id: '',
                              case_category: '',
                              assigned_social_worker: '',
                              reintegration_status: '',
                              current_risk_level: '',
                              referral_source: '',
                              date_of_admission_from: '',
                              date_of_admission_to: '',
                            });
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Center column: residents table */}
            <div className="col-12 col-lg-9 order-3 order-lg-2">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-baseline justify-content-between gap-3 mb-2">
                    <h2 className="h5 card-title mb-0 panahgah-heading">Residents</h2>
                    <div className="d-flex align-items-center gap-2">
                      <label className="small text-body-secondary" htmlFor="rpp">
                        Records
                      </label>
                      <select
                        id="rpp"
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
                        <option value="50">50</option>
                        <option value="Max">Max</option>
                      </select>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-sm table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th scope="col">Case control</th>
                          <th scope="col">Internal code</th>
                          <th scope="col">Status</th>
                          <th scope="col">Case category</th>
                          <th scope="col">Safehouse</th>
                          <th scope="col">Social worker</th>
                          <th scope="col">Admission</th>
                          <th scope="col">Reintegration</th>
                          <th scope="col" className="text-end">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {residents.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-body-secondary small">
                              No residents yet. Use “Add New Resident” to create one.
                            </td>
                          </tr>
                        ) : (
                          residents.map((r) => {
                            return (
                              <tr key={r.resident_id}>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-link p-0 text-decoration-none"
                                    onClick={() => setSelectedResidentForDetails(r)}
                                  >
                                    {r.case_control_no}
                                  </button>
                                </td>
                                <td>{r.internal_code}</td>
                                <td>{r.case_status}</td>
                                <td>{r.case_category}</td>
                                <td>{safehouseNameById.get(r.safehouse_id) ?? r.safehouse_id}</td>
                                <td>{r.assigned_social_worker}</td>
                                <td>{r.date_of_admission}</td>
                                <td>{r.reintegration_status ?? ''}</td>
                                <td className="text-end">
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
                                            setEditingResidentId(r.resident_id);
                                            setForm(residentToUpsertPayload(r));
                                            setIsAddOpen(true);
                                            document.getElementById('caseloadAccordion')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                                            setDeleteTarget(r);
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-3">
                    <nav aria-label="Caseload pagination">
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

                        <li className={`page-item ${!canPaginate || page >= totalPages ? 'disabled' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={!canPaginate || page >= totalPages}
                          >
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
            </div>
          </div>
        </>
      )}

      {selectedResidentForDetails && (
        <>
          <div
            className="modal fade show d-block"
            role="dialog"
            aria-modal="true"
            aria-label="Resident details"
            tabIndex={-1}
          >
            <div className="modal-dialog modal-dialog-scrollable modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title h5 panahgah-heading mb-0">
                    {selectedResidentForDetails.case_control_no} · {selectedResidentForDetails.internal_code}
                  </h2>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeDetails} />
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <h3 className="h6 panahgah-heading mb-2">Demographics</h3>
                      <div className="row g-2 small">
                        <div className="col-6 text-body-secondary">Sex</div>
                        <div className="col-6">{selectedResidentForDetails.sex}</div>
                        <div className="col-6 text-body-secondary">Date of birth</div>
                        <div className="col-6">{selectedResidentForDetails.date_of_birth}</div>
                        <div className="col-6 text-body-secondary">Birth status</div>
                        <div className="col-6">{selectedResidentForDetails.birth_status}</div>
                        <div className="col-6 text-body-secondary">Place of birth</div>
                        <div className="col-6">{selectedResidentForDetails.place_of_birth}</div>
                        <div className="col-6 text-body-secondary">Religion</div>
                        <div className="col-6">{selectedResidentForDetails.religion}</div>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <h3 className="h6 panahgah-heading mb-2">Case category & sub-categories</h3>
                      <div className="small text-body-secondary mb-2">{selectedResidentForDetails.case_category}</div>
                      <div className="d-flex flex-wrap gap-2">
                        {selectedResidentForDetails.sub_cat_orphaned && (
                          <span className="badge text-bg-light border">Orphaned</span>
                        )}
                        {selectedResidentForDetails.sub_cat_trafficked && (
                          <span className="badge text-bg-light border">Trafficked</span>
                        )}
                        {selectedResidentForDetails.sub_cat_child_labor && (
                          <span className="badge text-bg-light border">Child labor</span>
                        )}
                        {selectedResidentForDetails.sub_cat_physical_abuse && (
                          <span className="badge text-bg-light border">Physical abuse</span>
                        )}
                        {selectedResidentForDetails.sub_cat_sexual_abuse && (
                          <span className="badge text-bg-light border">Sexual abuse</span>
                        )}
                        {selectedResidentForDetails.sub_cat_osaec && (
                          <span className="badge text-bg-light border">OSAEC</span>
                        )}
                        {selectedResidentForDetails.sub_cat_cicl && (
                          <span className="badge text-bg-light border">CICL</span>
                        )}
                        {selectedResidentForDetails.sub_cat_at_risk && (
                          <span className="badge text-bg-light border">At risk</span>
                        )}
                        {selectedResidentForDetails.sub_cat_street_child && (
                          <span className="badge text-bg-light border">Street child</span>
                        )}
                        {selectedResidentForDetails.sub_cat_child_with_hiv && (
                          <span className="badge text-bg-light border">Child with HIV</span>
                        )}
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <h3 className="h6 panahgah-heading mb-2">Disability / special needs</h3>
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        <span className={`badge ${selectedResidentForDetails.is_pwd ? 'text-bg-info' : 'text-bg-light border'}`}>
                          PWD: {selectedResidentForDetails.is_pwd ? 'Yes' : 'No'}
                        </span>
                        <span
                          className={`badge ${selectedResidentForDetails.has_special_needs ? 'text-bg-info' : 'text-bg-light border'}`}
                        >
                          Special needs: {selectedResidentForDetails.has_special_needs ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="row g-2 small">
                        <div className="col-6 text-body-secondary">PWD type</div>
                        <div className="col-6">{selectedResidentForDetails.pwd_type ?? ''}</div>
                        <div className="col-6 text-body-secondary">Diagnosis</div>
                        <div className="col-6">{selectedResidentForDetails.special_needs_diagnosis ?? ''}</div>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <h3 className="h6 panahgah-heading mb-2">Family socio-demographic profile</h3>
                      <div className="d-flex flex-wrap gap-2">
                        {selectedResidentForDetails.family_is_4ps && <span className="badge text-bg-light border">4Ps</span>}
                        {selectedResidentForDetails.family_solo_parent && (
                          <span className="badge text-bg-light border">Solo parent</span>
                        )}
                        {selectedResidentForDetails.family_indigenous && (
                          <span className="badge text-bg-light border">Indigenous</span>
                        )}
                        {selectedResidentForDetails.family_parent_pwd && (
                          <span className="badge text-bg-light border">Parent PWD</span>
                        )}
                        {selectedResidentForDetails.family_informal_settler && (
                          <span className="badge text-bg-light border">Informal settler</span>
                        )}
                        {!selectedResidentForDetails.family_is_4ps &&
                          !selectedResidentForDetails.family_solo_parent &&
                          !selectedResidentForDetails.family_indigenous &&
                          !selectedResidentForDetails.family_parent_pwd &&
                          !selectedResidentForDetails.family_informal_settler && (
                            <span className="small text-body-secondary">No flags recorded.</span>
                          )}
                      </div>
                    </div>

                    <div className="col-12">
                      <h3 className="h6 panahgah-heading mb-2">Admission and referral details</h3>
                      <div className="row g-2 small">
                        <div className="col-12 col-md-3 text-body-secondary">Date of admission</div>
                        <div className="col-12 col-md-3">{selectedResidentForDetails.date_of_admission}</div>
                        <div className="col-12 col-md-3 text-body-secondary">Referral source</div>
                        <div className="col-12 col-md-3">{selectedResidentForDetails.referral_source}</div>
                        <div className="col-12 col-md-3 text-body-secondary">Referring agency/person</div>
                        <div className="col-12 col-md-9">{selectedResidentForDetails.referring_agency_person}</div>
                        <div className="col-12 col-md-3 text-body-secondary">Initial assessment</div>
                        <div className="col-12 col-md-9">{selectedResidentForDetails.initial_case_assessment}</div>
                        <div className="col-12 col-md-3 text-body-secondary">Initial risk</div>
                        <div className="col-12 col-md-3">{selectedResidentForDetails.initial_risk_level}</div>
                        <div className="col-12 col-md-3 text-body-secondary">Current risk</div>
                        <div className="col-12 col-md-3">{selectedResidentForDetails.current_risk_level}</div>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <h3 className="h6 panahgah-heading mb-2">Social worker and case tracking</h3>
                      <div className="row g-2 small">
                        <div className="col-6 text-body-secondary">Assigned social worker</div>
                        <div className="col-6">{selectedResidentForDetails.assigned_social_worker}</div>
                        <div className="col-6 text-body-secondary">Case study prepared</div>
                        <div className="col-6">{selectedResidentForDetails.date_case_study_prepared ?? ''}</div>
                        <div className="col-6 text-body-secondary">Case status</div>
                        <div className="col-6">{selectedResidentForDetails.case_status}</div>
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <h3 className="h6 panahgah-heading mb-2">Reintegration tracking</h3>
                      <div className="row g-2 small">
                        <div className="col-6 text-body-secondary">Type</div>
                        <div className="col-6">{selectedResidentForDetails.reintegration_type ?? ''}</div>
                        <div className="col-6 text-body-secondary">Status</div>
                        <div className="col-6">{selectedResidentForDetails.reintegration_status ?? ''}</div>
                        <div className="col-6 text-body-secondary">Date closed</div>
                        <div className="col-6">{selectedResidentForDetails.date_closed ?? ''}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeDetails}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" aria-hidden="true" onClick={closeDetails} />
        </>
      )}

      <ConfirmDeleteModal
        show={deleteTarget !== null}
        title="Delete resident"
        description="This permanently removes the resident record from the caseload. This cannot be undone."
        itemLabel={
          deleteTarget
            ? `${deleteTarget.case_control_no} · ${deleteTarget.internal_code} (ID ${deleteTarget.resident_id})`
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

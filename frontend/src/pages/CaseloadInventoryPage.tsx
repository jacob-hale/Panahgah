import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { PagedResponse, Resident, Safehouse } from '../api/types';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

export function CaseloadInventoryPage() {
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<Resident | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedResidentForDetails, setSelectedResidentForDetails] = useState<Resident | null>(null);

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

  const safehouseNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const sh of safehouses) {
      m.set(sh.safehouse_id, sh.name);
    }
    return m;
  }, [safehouses]);

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

  const closeDetails = () => {
    setSelectedResidentForDetails(null);
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

  const handleResidentRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>, r: Resident) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedResidentForDetails(r);
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
            Caseload inventory
          </li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="h3 mb-0">Caseload inventory</h1>
        {!listLoading && !listError && (
          <div className="d-flex align-items-center gap-2 ms-auto">
            <Link to="/admin/caseload/new" className="btn btn-primary">
              Add resident
            </Link>
            <button
              type="button"
              className="btn btn-outline-secondary"
              aria-expanded={isFiltersOpen}
              aria-controls="caseload-filters-collapse"
              onClick={() => setIsFiltersOpen((v) => !v)}
            >
              Filters
            </button>
          </div>
        )}
      </div>

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
          <div
            id="caseload-filters-collapse"
            className={`collapse ${isFiltersOpen ? 'show' : ''}`}
          >
            <div className="card border shadow-sm mb-3">
              <div className="card-body">
                <h2 className="h6 panahgah-heading mb-3">Filter residents</h2>
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

          <div className="col-12">
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

                  <div className="table-responsive" style={{ minHeight: '55vh' }}>
                    <table className="table table-sm table-striped table-hover align-middle mb-0">
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
                              No residents yet.{' '}
                              <Link to="/admin/caseload/new">Add a resident</Link> to create one.
                            </td>
                          </tr>
                        ) : (
                          residents.map((r) => {
                            return (
                              <tr
                                key={r.resident_id}
                                role="button"
                                tabIndex={0}
                                className="cursor-pointer"
                                onClick={() => setSelectedResidentForDetails(r)}
                                onKeyDown={(e) => handleResidentRowKeyDown(e, r)}
                                aria-label={`View details for ${r.case_control_no}`}
                              >
                                <td>{r.case_control_no}</td>
                                <td>{r.internal_code}</td>
                                <td>{r.case_status}</td>
                                <td>{r.case_category}</td>
                                <td>{safehouseNameById.get(r.safehouse_id) ?? r.safehouse_id}</td>
                                <td>{r.assigned_social_worker}</td>
                                <td>{r.date_of_admission}</td>
                                <td>{r.reintegration_status ?? ''}</td>
                                <td className="text-end" onClick={(e) => e.stopPropagation()}>
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
                                          onClick={() => navigate(`/admin/caseload/${r.resident_id}/edit`)}
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

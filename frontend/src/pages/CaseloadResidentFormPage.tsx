import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import type { Resident, ResidentUpsertPayload, Safehouse } from '../api/types';
import { ResidentUpsertForm } from './caseload/ResidentUpsertForm';
import {
  emptyResidentForm,
  residentToUpsertPayload,
  toPayload,
} from './caseload/residentFormUtils';

export function CaseloadResidentFormPage() {
  const { residentId } = useParams<{ residentId?: string }>();
  const navigate = useNavigate();
  const isEdit = residentId !== undefined;
  const idNum = residentId ? Number.parseInt(residentId, 10) : NaN;

  const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
  const [form, setForm] = useState<ResidentUpsertPayload>(() => emptyResidentForm(0));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPage = useCallback(async () => {
    setPageLoading(true);
    setLoadError(null);
    try {
      const s = await apiFetch<Safehouse[]>('/api/safehouses');
      setSafehouses(s);

      if (isEdit) {
        if (Number.isNaN(idNum) || idNum < 1) {
          setLoadError('Invalid resident id.');
          return;
        }
        const r = await apiFetch<Resident>(`/api/residents/${idNum}`);
        setForm(residentToUpsertPayload(r));
      } else {
        setForm(emptyResidentForm(s[0]?.safehouse_id ?? 0));
      }
    } catch {
      setLoadError(
        isEdit
          ? 'Could not load resident. They may have been removed, or you may need to sign in again.'
          : 'Could not load safehouses. Check login and try again.',
      );
    } finally {
      setPageLoading(false);
    }
  }, [isEdit, idNum]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (isEdit) {
      return;
    }
    if (safehouses.length > 0 && form.safehouse_id === 0) {
      setForm((f) => ({ ...f, safehouse_id: safehouses[0].safehouse_id }));
    }
  }, [safehouses, form.safehouse_id, isEdit]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    if (!form.safehouse_id) {
      setSubmitError('Select a safehouse (add a safehouse in the database if none appear).');
      return;
    }
    setSubmitting(true);
    try {
      const payload = toPayload(form);
      if (isEdit) {
        await apiFetch<Resident>(`/api/residents/${idNum}`, {
          method: 'PUT',
          jsonBody: payload,
        });
      } else {
        await apiFetch<Resident>('/api/residents', {
          method: 'POST',
          jsonBody: payload,
        });
      }
      navigate('/admin/caseload');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : isEdit ? 'Update failed.' : 'Create failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const title = isEdit ? 'Edit resident' : 'New resident';

  return (
    <div>
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/admin/caseload">Caseload inventory</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <h1 className="h3 mb-0 panahgah-heading">{title}</h1>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/admin/caseload')}>
            Cancel
          </button>
        </div>
      </div>

      {pageLoading ? (
        <div className="d-flex justify-content-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
        </div>
      ) : loadError ? (
        <div className="alert alert-danger">
          {loadError}{' '}
          <Link to="/admin/caseload" className="alert-link">
            Back to caseload inventory
          </Link>
        </div>
      ) : (
        <>
          {submitError && <div className="alert alert-danger">{submitError}</div>}
          <ResidentUpsertForm
            form={form}
            setForm={setForm}
            safehouses={safehouses}
            isEdit={isEdit}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </div>
  );
}

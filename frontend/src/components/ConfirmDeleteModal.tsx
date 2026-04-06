import { useEffect, useId, useState } from 'react';

const REQUIRED_PHRASE = 'CONFIRM';

type ConfirmDeleteModalProps = {
  show: boolean;
  title: string;
  description: string;
  itemLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onDelete: () => void | Promise<void>;
};

export function ConfirmDeleteModal({
  show,
  title,
  description,
  itemLabel,
  isSubmitting,
  error,
  onClose,
  onDelete,
}: ConfirmDeleteModalProps) {
  const labelId = useId();
  const [phrase, setPhrase] = useState('');

  useEffect(() => {
    if (!show) {
      setPhrase('');
    }
  }, [show]);

  useEffect(() => {
    if (!show) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) {
    return null;
  }

  const canDelete = phrase === REQUIRED_PHRASE && !isSubmitting;

  const handleDelete = () => {
    if (!canDelete) {
      return;
    }
    void onDelete();
  };

  return (
    <>
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id={labelId}>
                {title}
              </h2>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} disabled={isSubmitting} />
            </div>
            <div className="modal-body">
              <p className="mb-2">{description}</p>
              <p className="small text-body-secondary mb-3">
                Target: <strong>{itemLabel}</strong>
              </p>
              <p className="small mb-2">
                Type <code className="user-select-all">{REQUIRED_PHRASE}</code> to enable delete.
              </p>
              <label htmlFor="confirm-delete-input" className="form-label">
                Confirmation
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                className="form-control"
                autoComplete="off"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                disabled={isSubmitting}
                placeholder={REQUIRED_PHRASE}
              />
              {error && <div className="alert alert-danger mt-3 mb-0 py-2 small">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={!canDelete}
              >
                {isSubmitting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" aria-hidden="true" />
    </>
  );
}

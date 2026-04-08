import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export function DonateCheckoutPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = useMemo(() => Number(params.get('amount') ?? '0'), [params]);
  const monthly = useMemo(() => params.get('monthly') === '1', [params]);
  const hasValidAmount = Number.isFinite(amount) && amount > 0;

  const handleSubmit = async () => {
    if (!hasValidAmount) {
      setError('Please choose a valid donation amount before checkout.');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/donations/mine', {
        method: 'POST',
        jsonBody: {
          amount,
          is_recurring: monthly,
          campaign_name: monthly ? 'monthly_support' : 'one_time_gift',
        },
      });
      navigate('/account');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit donation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="row justify-content-center">
      <div className="col-lg-8">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h4 mb-2">Simulated checkout</h1>
            <p className="text-body-secondary mb-3">
              Payment information will be added here once Panahgah validates its payment backend integration. For now,
              this flow records your donation as a simulated successful submission.
            </p>
            <p className="mb-2">
              <strong>Amount:</strong> ${hasValidAmount ? amount.toFixed(2) : '0.00'}
            </p>
            <p className="mb-4">
              <strong>Type:</strong> {monthly ? 'Monthly recurring donation' : 'One-time donation'}
            </p>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !hasValidAmount}
              >
                {submitting ? 'Submitting…' : 'Submit payment (simulated)'}
              </button>
              <Link className="btn btn-outline-secondary" to="/donate">
                Back to donation options
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DonatePage.css';
import { useAuth } from '../contexts/AuthContext';

const oneTimeAmounts = [25, 50, 100, 250];

export function DonatePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [monthlyAmount, setMonthlyAmount] = useState<number>(25);

  const checkoutPath = useMemo(
    () => `/donate/checkout?amount=${selectedAmount}&monthly=0`,
    [selectedAmount],
  );
  const monthlyCheckoutPath = useMemo(
    () => `/donate/checkout?amount=${monthlyAmount}&monthly=1`,
    [monthlyAmount],
  );

  return (
    <div className="pg-donate-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-10 col-xl-8">
            <h1 className="display-6 fw-semibold mb-2">Choose your donation</h1>
            <p className="text-body-secondary mb-4">
              Your support helps provide safe shelter, education, counseling, and recovery support for residents at
              Panahgah safehouses.
            </p>

            <section className="pg-donate-panel mb-4">
              <h2 className="h5 fw-semibold mb-3">One-time gift</h2>
              <div className="row g-2">
                {oneTimeAmounts.map((amount) => (
                  <div className="col-6 col-md-3" key={String(amount)}>
                    <button
                      type="button"
                      className={`btn w-100 pg-amount-btn ${selectedAmount === amount ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setSelectedAmount(amount)}
                    >
                      ${amount}
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary btn-lg mt-3" onClick={() => navigate(checkoutPath)}>
                Continue with one-time donation
              </button>
            </section>

            <section className="pg-donate-panel mb-4">
              <h2 className="h5 fw-semibold mb-2">Monthly giving</h2>
              <p className="text-body-secondary mb-3">
                Become a consistent donor to provide steady monthly care and support.
              </p>
              <div className="mb-3">
                <label className="form-label">Monthly amount</label>
                <select
                  className="form-select"
                  value={monthlyAmount}
                  onChange={(event) => setMonthlyAmount(Number(event.target.value))}
                >
                  {oneTimeAmounts.map((amount) => (
                    <option key={`monthly-${amount}`} value={amount}>
                      ${amount} per month
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate(monthlyCheckoutPath)}>
                Start monthly donation
              </button>
            </section>

            {!isAuthenticated ? (
              <section className="pg-donor-signin">
                <h2 className="h6 fw-semibold mb-2">Already a recurring donor?</h2>
                <p className="text-body-secondary mb-2">
                  Sign in to connect donations to your account and view your giving history.
                </p>
                <Link className="btn btn-link p-0" to="/login">
                  Donor sign in
                </Link>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

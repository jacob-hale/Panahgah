import { Link } from 'react-router-dom';
import './DonatePage.css';

const oneTimeAmounts = ['$25', '$50', '$100', '$250'];

export function DonatePage() {
  return (
    <div className="pg-donate-page py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-10 col-xl-8">
            <h1 className="display-6 fw-semibold mb-2">Choose your donation</h1>
            <p className="text-body-secondary mb-4">
              Your support helps provide safe shelter, education, counseling, and recovery support for girls at
              Panahgah safehouses.
            </p>

            <section className="pg-donate-panel mb-4">
              <h2 className="h5 fw-semibold mb-3">One-time gift</h2>
              <div className="row g-2">
                {oneTimeAmounts.map((amount) => (
                  <div className="col-6 col-md-3" key={amount}>
                    <button type="button" className="btn btn-outline-secondary w-100 pg-amount-btn">
                      {amount}
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary btn-lg mt-3">
                Continue with one-time donation
              </button>
            </section>

            <section className="pg-donate-panel mb-4">
              <h2 className="h5 fw-semibold mb-2">Monthly giving</h2>
              <p className="text-body-secondary mb-3">
                Become a consistent donor to provide steady monthly care and support.
              </p>
              <button type="button" className="btn btn-primary btn-lg">
                Start monthly donation
              </button>
            </section>

            <section className="pg-donor-signin">
              <h2 className="h6 fw-semibold mb-2">Already a recurring donor?</h2>
              <p className="text-body-secondary mb-2">
                Sign in to connect donations to your account and view your giving history.
              </p>
              <Link className="btn btn-link p-0" to="/login">
                Donor sign in
              </Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

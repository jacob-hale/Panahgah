import { Link } from 'react-router-dom';
import './HomePage.css';

export function HomePage() {
  return (
    <div className="pg-home">
      <header className="pg-home__hero pg-fullbleed">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8">
              <div className="d-inline-flex align-items-center gap-2 pg-pill mb-3">
                <span className="pg-pill__dot" aria-hidden="true" />
                <span className="small fw-semibold">Panahgah nonprofit</span>
              </div>

              <h1 className="display-4 fw-semibold mb-3 pg-home__headline">
                A safe place to heal, rebuild, and move forward.
              </h1>

              <p className="lead text-body-secondary mb-3">
                Panahgah is a nonprofit helping sexually abused girls in India find safety, dignity, and steady support
                through trusted safehouses.
              </p>

              <div className="pg-definition mb-4">
                <div className="pg-definition__term">Panahgah</div>
                <div className="pg-definition__text">
                  Hindi noun: a place of refuge, sanctuary, or shelter.
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 pg-hero-ctas">
                <a className="btn btn-primary btn-lg" href="#donate">
                  Donate now
                </a>
                <a className="btn btn-primary btn-lg" href="#impact">
                  See what your gift does
                </a>
                <Link className="btn btn-primary btn-lg" to="/impact-dashboard">
                  View impact dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="donate" className="pg-fullbleed pg-donate-band py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8">
              <h2 className="h2 fw-semibold mb-2">Help fund safe, steady care.</h2>
              <p className="text-body-secondary mb-4">
                Your donation helps support safehousing, essentials, counseling, and recovery services for girls who are
                rebuilding their lives.
              </p>
              <a className="btn btn-primary btn-lg" href="#donate">
                Donate now
              </a>
              <p className="small text-body-secondary mt-3 mb-0">
                Every contribution helps keep safe places open and staffed.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="impact" className="py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8">
              <h2 className="h2 fw-semibold mb-2">See the impact your support creates.</h2>
              <p className="text-body-secondary mb-4">
                Explore our impact dashboard to view updates, outcomes, and the story your support helps write.
              </p>
              <Link className="btn btn-outline-secondary btn-lg" to="/impact-dashboard">
                Open impact dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="pg-fullbleed pg-cta py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8">
              <div className="d-flex flex-wrap gap-2">
                <a className="btn btn-primary btn-lg" href="#donate">
                  Donate now
                </a>
                <a className="btn btn-primary btn-lg" href="#impact">
                  See what your gift does
                </a>
                <Link className="btn btn-primary btn-lg" to="/impact-dashboard">
                  View impact dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
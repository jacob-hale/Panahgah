// recovery

import { Link } from 'react-router-dom';
import './HomePage.css';

export function HomePage() {
  return (
    <div className="pg-home">
      <header className="pg-home__hero pg-fullbleed">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-9">
              <div className="d-inline-flex align-items-center gap-2 pg-pill">
                <span className="pg-pill__dot" aria-hidden="true" />
                <span className="small fw-semibold">Creating safer spaces for healing</span>
              </div>

              <h1 className="display-4 fw-semibold mt-3 mb-3 pg-home__headline">
                Every girl deserves a <span className="pg-gradient-text">safe place</span> to heal.
              </h1>

              <p className="lead text-body-secondary mb-4">
                Help fund safe, steady care. Your donation supports safehouses where survivors of abuse and trafficking
                find safety, dignity, and a path forward.
              </p>

              <div className="d-flex flex-wrap gap-2">
                <a className="btn btn-primary btn-lg pg-btn-donate" href="#donate">
                  Donate now
                </a>
                <a className="btn btn-outline-primary btn-lg pg-btn-outline" href="#impact">
                  See what your gift does
                </a>
                <Link className="btn btn-light btn-lg pg-btn-soft" to="/impact-dashboard">
                  View impact dashboard
                </Link>
              </div>

              <div className="mt-4 d-flex flex-wrap gap-3 pg-trust">
                <div className="pg-trust__item">
                  <div className="pg-trust__kpi">Secure</div>
                  <div className="text-body-secondary small">Role-based access</div>
                </div>
                <div className="pg-trust__item">
                  <div className="pg-trust__kpi">Transparent</div>
                  <div className="text-body-secondary small">Impact reporting</div>
                </div>
                <div className="pg-trust__item">
                  <div className="pg-trust__kpi">Practical</div>
                  <div className="text-body-secondary small">Designed for teams</div>
                </div>
              </div>
            </div>
          </div>

          <div className="row justify-content-center mt-4 mt-lg-5">
            <div className="col-lg-10 col-xl-9">
              <div className="pg-hero-visual pg-hero-visual--uniform" aria-hidden="true">
                <div className="pg-hero-visual__inner">
                  <div className="pg-hero-visual__orb pg-orb--one" />
                  <div className="pg-hero-visual__orb pg-orb--two" />
                  <div className="pg-hero-visual__orb pg-orb--three" />

                  <div className="pg-hero-tiles">
                    <div className="pg-hero-tile pg-hero-tile--primary">
                      <div className="pg-hero-tile__kpi">Donate</div>
                      <div className="pg-hero-tile__label">Support safe housing & essentials</div>
                    </div>
                    <div className="pg-hero-tile">
                      <div className="pg-hero-tile__kpi">Care</div>
                      <div className="pg-hero-tile__label">Help fund services that heal</div>
                    </div>
                    <div className="pg-hero-tile">
                      <div className="pg-hero-tile__kpi">Trust</div>
                      <div className="pg-hero-tile__label">Transparent impact reporting</div>
                    </div>
                    <div className="pg-hero-tile">
                      <div className="pg-hero-tile__kpi">Safety</div>
                      <div className="pg-hero-tile__label">Privacy-first workflows</div>
                    </div>
                  </div>

                  <div className="pg-hero-visual__caption">
                    <div className="fw-semibold">A calm, professional experience.</div>
                    <div className="text-body-secondary small">
                      Soft color, clear hierarchy, and a strong donate-first path.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section id="impact" className="py-5">
        <div className="container">
          <div className="row align-items-end g-3 mb-4">
            <div className="col-lg-7">
              <h2 className="h1 fw-semibold mb-2">What your donation makes possible.</h2>
              <p className="text-body-secondary mb-0">
                Your gift supports safety, stability, and services that help survivors move forward.
              </p>
            </div>
            <div className="col-lg-5 text-lg-end">
              <Link className="btn btn-outline-secondary" to="/impact-dashboard">
                Open impact dashboard
              </Link>
            </div>
          </div>

          <div className="row g-3 g-lg-4">
            <div className="col-md-6 col-lg-3">
              <div className="pg-stat-card h-100">
                <div className="pg-stat-card__icon pg-icon--blue" aria-hidden="true" />
                <div className="pg-stat-card__value">98%</div>
                <div className="pg-stat-card__label text-body-secondary">On-time reporting</div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="pg-stat-card h-100">
                <div className="pg-stat-card__icon pg-icon--pink" aria-hidden="true" />
                <div className="pg-stat-card__value">24h</div>
                <div className="pg-stat-card__label text-body-secondary">Faster donor updates</div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="pg-stat-card h-100">
                <div className="pg-stat-card__icon pg-icon--gold" aria-hidden="true" />
                <div className="pg-stat-card__value">3.2×</div>
                <div className="pg-stat-card__label text-body-secondary">Clearer insights</div>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="pg-stat-card h-100">
                <div className="pg-stat-card__icon pg-icon--navy" aria-hidden="true" />
                <div className="pg-stat-card__value">RBAC</div>
                <div className="pg-stat-card__label text-body-secondary">Built-in permissions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="donate" className="pg-fullbleed pg-donate-band py-5">
        <div className="container">
          <div className="row align-items-end g-3 mb-4">
            <div className="col-lg-7">
              <h2 className="h1 fw-semibold mb-2">Donate in seconds.</h2>
              <p className="text-body-secondary mb-0">
                Choose an amount below — your gift helps fund safe housing, essentials, and recovery support.
              </p>
            </div>
            <div className="col-lg-5 text-lg-end">
              <span className="pg-badge">Most impactful</span>
            </div>
          </div>

          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8">
              <div className="pg-donate-card shadow-sm">
                <div className="pg-donate-card__amounts">
                  <button type="button" className="pg-amount">
                    <div className="pg-amount__value">$25</div>
                    <div className="pg-amount__label text-body-secondary">Supplies</div>
                  </button>
                  <button type="button" className="pg-amount pg-amount--active">
                    <div className="pg-amount__value">$50</div>
                    <div className="pg-amount__label text-body-secondary">Meals</div>
                  </button>
                  <button type="button" className="pg-amount">
                    <div className="pg-amount__value">$100</div>
                    <div className="pg-amount__label text-body-secondary">Care</div>
                  </button>
                  <button type="button" className="pg-amount">
                    <div className="pg-amount__value">$250</div>
                    <div className="pg-amount__label text-body-secondary">Housing</div>
                  </button>
                </div>

                <div className="pg-donate-card__cta">
                  <a className="btn btn-primary btn-lg w-100 pg-btn-donate" href="#donate">
                    Donate now
                  </a>
                  <div className="d-flex justify-content-between align-items-center mt-2 small text-body-secondary">
                    <span>Secure checkout</span>
                    <span>Transparent reporting</span>
                  </div>
                </div>

                <div className="pg-donate-card__footer">
                  <div className="pg-donate-note">
                    <div className="pg-donate-note__dot" aria-hidden="true" />
                    <div className="small">
                      Donations help keep safehouses running — and help residents rebuild.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="pg-fullbleed pg-band py-5">
        <div className="container">
          <div className="row g-4 align-items-center mb-4">
            <div className="col-lg-7">
              <h2 className="h1 fw-semibold mb-2">Where your support goes.</h2>
              <p className="text-body-secondary mb-0">
                Safe, practical funding that helps with day-to-day operations and long-term stability.
              </p>
            </div>
            <div className="col-lg-5">
              <div className="pg-highlight p-3 p-md-4">
                <div className="fw-semibold mb-1">Transparent by design</div>
                <div className="text-body-secondary small">
                  Donations tracking and impact reporting help ensure your support is understood and accounted for.
                </div>
              </div>
            </div>
          </div>

          <div className="row g-3 g-lg-4">
            <div className="col-md-4">
              <div className="pg-feature h-100">
                <div className="pg-feature__step">01</div>
                <h3 className="h5 fw-semibold">Safe housing & essentials</h3>
                <p className="text-body-secondary mb-0">
                  Support beds, supplies, transportation, and the daily needs that make stability possible.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="pg-feature h-100">
                <div className="pg-feature__step">02</div>
                <h3 className="h5 fw-semibold">Care & recovery support</h3>
                <p className="text-body-secondary mb-0">
                  Help fund counseling, services, and casework that guide residents through recovery.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="pg-feature h-100">
                <div className="pg-feature__step">03</div>
                <h3 className="h5 fw-semibold">Skills & long-term independence</h3>
                <p className="text-body-secondary mb-0">
                  Empower education, job readiness, and the resources needed to rebuild a future.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row g-4 align-items-stretch">
            <div className="col-lg-6">
              <div className="pg-callout h-100">
                <h2 className="h3 fw-semibold mb-2">Designed to feel calm and professional.</h2>
                <p className="text-body-secondary mb-4">
                  A modern interface with thoughtful spacing, gentle color, and clear hierarchy — so users can move
                  quickly without feeling overwhelmed.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <Link className="btn btn-primary pg-btn-primary" to="/impact-dashboard">
                    Explore the dashboard
                  </Link>
                  <Link className="btn btn-outline-secondary" to="/privacy">
                    Read privacy policy
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="pg-testimonials h-100">
                <div className="pg-quote">
                  <p className="mb-2">
                    “The clearest reporting we’ve ever had — without sacrificing privacy.”
                  </p>
                  <div className="text-body-secondary small">Program coordinator</div>
                </div>
                <div className="pg-quote">
                  <p className="mb-2">“Simple workflow. Beautiful dashboards. Faster decisions.”</p>
                  <div className="text-body-secondary small">Operations lead</div>
                </div>
                <div className="pg-quote">
                  <p className="mb-2">“Finally, a system that feels modern and trustworthy.”</p>
                  <div className="text-body-secondary small">Partner organization</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pg-fullbleed pg-cta py-5">
        <div className="container">
          <div className="row align-items-center g-3">
            <div className="col-lg-8">
              <h2 className="h2 fw-semibold mb-2">Make your impact today.</h2>
              <p className="text-body-secondary mb-0">
                Donate in seconds, then see the story your support helps create.
              </p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <div className="d-flex flex-wrap gap-2 justify-content-lg-end">
                <a className="btn btn-primary btn-lg pg-btn-donate" href="#donate">
                  Donate now
                </a>
                <Link className="btn btn-outline-primary btn-lg pg-btn-outline" to="/impact-dashboard">
                  View impact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

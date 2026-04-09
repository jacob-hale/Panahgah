import { Link } from 'react-router-dom';
import './HomePage.css';

export function HomePage() {
  return (
    <div className="pg-home">
      <header className="pg-home__hero pg-fullbleed">
        <div className="pg-home__hero-layout">
          <div className="pg-home__hero-content">
            <div className="pg-home__hero-text">
              <h1 className="display-4 fw-semibold mb-3 pg-home__headline">
                Every girl deserves a place where she is safe, seen, and given a future.
              </h1>

              <p className="lead mb-4 pg-home__hero-lead">
                Panahgah provides refuge, healing, and hope for girls who have experienced abuse—offering not just
                safety, but a path forward.
              </p>

              <div className="d-flex flex-wrap gap-2 pg-hero-ctas">
                <Link className="btn btn-primary btn-lg" to="/donate">
                  Support a Life
                </Link>
                <Link className="btn btn-outline-primary btn-lg" to="/impact-dashboard">
                  See the Impact
                </Link>
              </div>
            </div>
          </div>
          <div className="pg-home__hero-media">
            <div className="pg-home__hero-image-wrap">
              <img
                className="pg-home__hero-img"
                src="/img/floating-diya-dusk-river.png"
                alt="A small oil lamp floats on still water at dusk; warm light reflects gently on the surface."
                width={1536}
                height={1024}
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8">
              <h2 className="h2 fw-semibold mb-3">What we do</h2>
              <p className="text-body-secondary mb-3">
                Panahgah exists to protect and restore the lives of girls who have experienced abuse, exploitation, and
                trafficking.
              </p>
              <p className="text-body-secondary mb-3">We partner with local communities to provide:</p>
              <ul className="text-body-secondary mb-3 ps-3">
                <li className="mb-2">Safe housing and protection</li>
                <li className="mb-2">Trauma-informed counseling and care</li>
                <li className="mb-2">Education and life skills development</li>
                <li className="mb-2">Reintegration support for a stable future</li>
              </ul>
              <p className="text-body-secondary mb-0">
                Every step is carefully tracked and supported—so no girl falls through the cracks.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pg-fullbleed pg-donate-band py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8">
              <p className="text-body-secondary mb-3 fw-semibold">Your support is not just a donation.</p>
              <p className="text-body-secondary mb-3">
                It is a safe place to sleep. A counseling session. A meal. A moment of hope.
              </p>
              <p className="text-body-secondary mb-3">Behind every number is a life being rebuilt.</p>
              <p className="text-body-secondary mb-4">
                You can trust your contribution becomes connected to a real life.
              </p>
              <Link className="btn btn-primary btn-lg" to="/donate">
                Donate now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="impact" className="py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8">
              <h2 className="h2 fw-semibold mb-2">How your gift shows up in real life</h2>
              <p className="text-body-secondary mb-4">
                These are the kinds of care your generosity helps make possible—transparently tracked so you can trust
                the difference you make.
              </p>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <div className="pg-impact-item h-100">
                    Safe shelter, meals, and essential supplies.
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="pg-impact-item h-100">
                    Education support, school access, and learning resources.
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="pg-impact-item h-100">
                    Counseling, trauma-informed care, and emotional healing support.
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="pg-impact-item h-100">
                    Life-skills training and pathways to long-term independence.
                  </div>
                </div>
              </div>
              <Link className="btn btn-outline-secondary btn-lg" to="/impact-dashboard">
                Open impact dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-10 col-xl-8 text-center">
              <p className="text-body-secondary mb-2">Healing is possible.</p>
              <p className="text-body-secondary mb-2">Safety is possible.</p>
              <p className="text-body-secondary mb-4">A future is possible.</p>
              <p className="text-body-secondary mb-4">And it starts with people who choose to care.</p>
              <div className="d-flex flex-wrap gap-2 justify-content-center pg-hero-ctas">
                <Link className="btn btn-primary btn-lg" to="/donate">
                  Help Protect a Life
                </Link>
                <Link className="btn btn-outline-primary btn-lg" to="/impact-dashboard">
                  Become Part of the Story
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
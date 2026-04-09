import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CookieConsentBanner } from './CookieConsentBanner';

export function AppLayout() {
  const { isAuthenticated, authSession, isLoading, logout } = useAuth();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const profileName = authSession?.supporterProfile?.display_name?.trim();
  const sessionIdentity = profileName || authSession?.email || 'Signed in';

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm">
        <div className="container">
          <Link className="navbar-brand d-inline-flex align-items-center gap-3" to="/">
            <img
              src="/panahgah-logo.png"
              alt="Panahgah"
              width={104}
              height={104}
              style={{ borderRadius: 16, objectFit: 'contain', display: 'block' }}
              loading="eager"
              decoding="async"
            />
            <span className="brand-name">Panahgah</span>
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNav"
            aria-controls="mainNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink className="nav-link" to="/">
                  Home
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/impact-dashboard">
                  Impact Dashboard
                </NavLink>
              </li>
              {!isLoading && authSession?.roles.includes('Admin') && (
                <>
                  <li className="nav-item dropdown">
                    <button
                      type="button"
                      className="nav-link dropdown-toggle"
                      id="adminOpsDropdown"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      Operations
                    </button>
                    <ul className="dropdown-menu" aria-labelledby="adminOpsDropdown">
                      <li>
                        <NavLink end className="dropdown-item staff-portal-dropdown-item" to="/admin">
                          Admin dashboard
                        </NavLink>
                      </li>
                      <li>
                        <NavLink className="dropdown-item staff-portal-dropdown-item" to="/admin/caseload">
                          Caseload inventory
                        </NavLink>
                      </li>
                      <li>
                        <NavLink className="dropdown-item staff-portal-dropdown-item" to="/admin/process-recordings">
                          Process recordings
                        </NavLink>
                      </li>
                      <li>
                        <NavLink className="dropdown-item staff-portal-dropdown-item" to="/admin/visits-and-conferences">
                          Visitations and Conferences
                        </NavLink>
                      </li>
                    </ul>
                  </li>
                  <li className="nav-item dropdown">
                    <button
                      type="button"
                      className="nav-link dropdown-toggle"
                      id="adminInsightsDropdown"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      Insights &amp; outreach
                    </button>
                    <ul className="dropdown-menu" aria-labelledby="adminInsightsDropdown">
                      <li>
                        <NavLink className="dropdown-item staff-portal-dropdown-item" to="/admin/social-insights">
                          Social media insights
                        </NavLink>
                      </li>
                      <li>
                        <NavLink className="dropdown-item staff-portal-dropdown-item" to="/admin/social-post-studio">
                          Social post studio
                        </NavLink>
                      </li>
                      <li>
                        <NavLink className="dropdown-item staff-portal-dropdown-item" to="/admin/supporters">
                          Supporters &amp; donations
                        </NavLink>
                      </li>
                      <li>
                        <NavLink className="dropdown-item staff-portal-dropdown-item" to="/admin/girls-reintegration-insights">
                          Girls reintegration insights
                        </NavLink>
                      </li>
                      <li>
                        <NavLink className="dropdown-item staff-portal-dropdown-item" to="/admin/reports-analytics">
                          Reports &amp; Analytics
                        </NavLink>
                      </li>
                    </ul>
                  </li>
                </>
              )}
            </ul>

            <div className="d-flex align-items-center gap-2">
              {isLoading ? (
                <span className="text-body-secondary small">Checking session...</span>
              ) : isAuthenticated ? (
                <>
                  {authSession?.roles.includes('Donor') && (
                    <Link className="btn btn-outline-secondary btn-sm" to="/account">
                      My account
                    </Link>
                  )}
                  {authSession?.roles.includes('Admin') && (
                    <Link className="btn btn-outline-secondary btn-sm" to="/admin/settings">
                      Admin settings
                    </Link>
                  )}
                  <span className="text-body-secondary small d-none d-md-inline">
                    {sessionIdentity} ({authSession?.roles.join(', ') || 'No roles'})
                  </span>
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link className="btn btn-outline-primary btn-sm" to="/register">
                    Sign up
                  </Link>
                  <Link className="btn btn-primary btn-sm" to="/login">
                    Login
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main
        className={
          isHomePage ? 'flex-grow-1 min-w-0' : 'container py-4 flex-grow-1 min-w-0'
        }
      >
        <Outlet />
      </main>

      <footer className="border-top bg-white mt-auto">
        <div className="container py-4">
          <div className="row align-items-start g-4">
            <div className="col-12 col-md-4">
              <div className="d-flex align-items-center gap-2 mb-2">
                <img
                  src="/panahgah-logo.png"
                  alt="Panahgah"
                  width={32}
                  height={32}
                  style={{ borderRadius: 6, objectFit: 'contain' }}
                />
                <span className="fw-bold" style={{ color: 'var(--pg-color-ink)' }}>Panahgah</span>
              </div>
              <p className="small text-body-secondary mb-0">
                Protecting and empowering survivors through technology, data, and compassion.
              </p>
            </div>

            <div className="col-6 col-md-4">
              <p className="small fw-semibold text-uppercase text-body-secondary mb-2" style={{ letterSpacing: '0.08em' }}>Platform</p>
              <ul className="list-unstyled small mb-0">
                <li className="mb-1"><Link className="text-body-secondary text-decoration-none" to="/impact-dashboard">Impact Dashboard</Link></li>
                <li className="mb-1"><Link className="text-body-secondary text-decoration-none" to="/admin">Staff Portal</Link></li>
              </ul>
            </div>

            <div className="col-6 col-md-4">
              <p className="small fw-semibold text-uppercase text-body-secondary mb-2" style={{ letterSpacing: '0.08em' }}>Legal</p>
              <ul className="list-unstyled small mb-0">
                <li className="mb-1"><Link className="text-body-secondary text-decoration-none" to="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-top mt-4 pt-3">
            <span className="small text-body-secondary">© {new Date().getFullYear()} Panahgah. All rights reserved.</span>
          </div>
        </div>
      </footer>

      <CookieConsentBanner />
    </div>
  );
}


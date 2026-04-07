import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { CookieConsentBanner } from './CookieConsentBanner';

export function AppLayout() {
  const { isAuthenticated, authSession, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom">
        <div className="container">
          <Link className="navbar-brand fw-semibold d-inline-flex align-items-center gap-2" to="/">
            <img
              src="/panahgah-logo.png"
              alt="Panahgah"
              width={28}
              height={28}
              style={{ borderRadius: 8, objectFit: 'contain' }}
              loading="eager"
              decoding="async"
            />
            <span>Panahgah</span>
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
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
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
                <li className="nav-item dropdown">
                  <button
                    type="button"
                    className="nav-link dropdown-toggle"
                    id="adminNavDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    Staff portal
                  </button>
                  <ul className="dropdown-menu" aria-labelledby="adminNavDropdown">
                    <li>
                      <NavLink className="dropdown-item" to="/admin">
                        Admin dashboard
                      </NavLink>
                    </li>
                    <li>
                      <NavLink className="dropdown-item" to="/admin/caseload">
                        Caseload inventory
                      </NavLink>
                    </li>
                    <li>
                      <NavLink className="dropdown-item" to="/admin/process-recordings">
                        Process recordings
                      </NavLink>
                    </li>
                    <li>
                      <NavLink className="dropdown-item" to="/admin/social-insights">
                        Social media insights
                      </NavLink>
                    </li>
                  </ul>
                </li>
              )}
              <li className="nav-item">
                <NavLink className="nav-link" to="/privacy">
                  Privacy
                </NavLink>
              </li>
            </ul>

            <div className="d-flex align-items-center gap-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={toggleTheme}>
                Theme: {theme === 'light' ? 'Light' : 'Dark'}
              </button>
              {isLoading ? (
                <span className="text-body-secondary small">Checking session...</span>
              ) : isAuthenticated ? (
                <>
                  <span className="text-body-secondary small">
                    {authSession?.email} ({authSession?.roles.join(', ') || 'No roles'})
                  </span>
                  <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
                    Logout
                  </button>
                </>
              ) : (
                <Link className="btn btn-primary btn-sm" to="/login">
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="container py-4 flex-grow-1">
        <Outlet />
      </main>

      <footer className="border-top py-3 bg-body-tertiary">
        <div className="container d-flex justify-content-between align-items-center small">
          <span>Panahgah Frontend</span>
          <Link to="/privacy">Privacy Policy</Link>
        </div>
      </footer>

      <CookieConsentBanner />
    </div>
  );
}

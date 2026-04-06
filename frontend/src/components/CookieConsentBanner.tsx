import { Link } from 'react-router-dom';
import { useCookieConsent } from '../contexts/CookieConsentContext';

export function CookieConsentBanner() {
  const { hasAcknowledgedConsent, acknowledgeConsent } = useCookieConsent();

  if (hasAcknowledgedConsent) {
    return null;
  }

  return (
    <div className="cookie-banner bg-dark text-light py-3 border-top border-secondary">
      <div className="container d-flex flex-column flex-md-row gap-3 align-items-start align-items-md-center justify-content-between">
        <p className="mb-0">
          We use essential cookies for authentication and a preference cookie to remember your
          theme setting.
        </p>
        <div className="d-flex gap-2">
          <Link to="/privacy" className="btn btn-outline-light btn-sm">
            Privacy Policy
          </Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={acknowledgeConsent}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

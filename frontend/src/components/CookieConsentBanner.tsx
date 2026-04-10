import { Link } from 'react-router-dom';
import { useCookieConsent } from '../contexts/CookieConsentContext';

export function CookieConsentBanner() {
  const { hasAcknowledgedConsent, acknowledgeConsent } = useCookieConsent();

  if (hasAcknowledgedConsent) {
    return null;
  }

  return (
    <div className="cookie-consent-anchor px-3 px-sm-4 pb-4 pt-2">
      <div
        className="cookie-consent-card bg-dark text-light p-4 p-md-4"
        role="region"
        aria-labelledby="cookie-consent-heading"
        aria-describedby="cookie-consent-desc"
        aria-live="polite"
      >
        <h2 className="h6 text-white mb-2" id="cookie-consent-heading">
          Cookies &amp; privacy
        </h2>
        <p className="mb-3 text-white-50 small" id="cookie-consent-desc">
          We use essential cookies for authentication and a preference to remember your theme
          setting. You can read more in our privacy policy.
        </p>
        <div className="d-flex flex-column flex-sm-row gap-2 align-items-stretch align-items-sm-center justify-content-sm-end">
          <Link to="/privacy" className="btn btn-outline-light btn-sm order-sm-0 text-center">
            Privacy Policy
          </Link>
          <button
            type="button"
            className="btn btn-primary btn-sm order-sm-1"
            onClick={acknowledgeConsent}
          >
            I understand
          </button>
        </div>
      </div>
    </div>
  );
}

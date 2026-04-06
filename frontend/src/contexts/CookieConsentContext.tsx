import { createContext, useContext, useMemo, useState } from 'react';

const CONSENT_KEY = 'panahgah_cookie_consent_acknowledged';

type CookieConsentContextValue = {
  hasAcknowledgedConsent: boolean;
  acknowledgeConsent: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [hasAcknowledgedConsent, setHasAcknowledgedConsent] = useState(
    () => localStorage.getItem(CONSENT_KEY) === 'true',
  );

  const acknowledgeConsent = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setHasAcknowledgedConsent(true);
  };

  const value = useMemo(
    () => ({ hasAcknowledgedConsent, acknowledgeConsent }),
    [hasAcknowledgedConsent],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return context;
}

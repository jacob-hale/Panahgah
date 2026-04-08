import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, type AuthMeResponse, type SupporterProfileDto } from '../api/client';

export type DonorRegisterPayload = {
  email: string;
  password: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  primarySupporterType: string;
  region?: string;
  country?: string;
  contributionInterests: string[];
};

type AuthContextValue = {
  isAuthenticated: boolean;
  authSession: {
    email: string | null;
    roles: string[];
    supporterId: number | null;
    supporterProfile: SupporterProfileDto | null;
  } | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: DonorRegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AuthMeResponse | null>(null);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const me = await apiFetch<AuthMeResponse>('/api/auth/me');
      setSession(me);
    } catch {
      setSession({ isAuthenticated: false, email: null, roles: [], supporterId: null, supporterProfile: null });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      await apiFetch<unknown>('/api/auth/session/login', {
        method: 'POST',
        jsonBody: { email, password },
      });
      await refreshSession();
    },
    [refreshSession],
  );

  const register = useCallback(
    async (payload: DonorRegisterPayload) => {
      await apiFetch<unknown>('/api/auth/session/register', {
        method: 'POST',
        jsonBody: {
          email: payload.email.trim(),
          password: payload.password,
          displayName: payload.displayName.trim(),
          firstName: payload.firstName?.trim() || null,
          lastName: payload.lastName?.trim() || null,
          phone: payload.phone?.trim() || null,
          primarySupporterType: payload.primarySupporterType.trim(),
          region: payload.region?.trim() || null,
          country: payload.country?.trim() || null,
          contributionInterests: payload.contributionInterests,
        },
      });
      await refreshSession();
    },
    [refreshSession],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch<unknown>('/api/auth/session/logout', {
        method: 'POST',
      });
    } finally {
      await refreshSession();
    }
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: session?.isAuthenticated ?? false,
      authSession: session
        ? {
            email: session.email,
            roles: session.roles ?? [],
            supporterId: session.supporterId ?? null,
            supporterProfile: session.supporterProfile ?? null,
          }
        : null,
      isLoading,
      refreshSession,
      login,
      register,
      logout,
    }),
    [isLoading, login, logout, refreshSession, register, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

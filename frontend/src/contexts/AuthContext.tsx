import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, type AuthMeResponse } from '../api/client';

type AuthContextValue = {
  isAuthenticated: boolean;
  authSession: { email: string | null; roles: string[] } | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
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
      setSession({ isAuthenticated: false, email: null, roles: [] });
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
        ? { email: session.email, roles: session.roles ?? [] }
        : null,
      isLoading,
      refreshSession,
      login,
      logout,
    }),
    [isLoading, login, logout, refreshSession, session],
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

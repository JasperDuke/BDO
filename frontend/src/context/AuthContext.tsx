'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, setAuthFailureHandler } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/auth-storage';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  /** false hides the Records tab on the dashboard */
  showRecordsTab?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const publicPaths = new Set(['/login', '/register']);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      if (!publicPaths.has(pathname || '')) {
        router.replace('/login');
      }
    });
  }, [pathname, router]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get('/users/me');
        setUser({
          id: String(data._id ?? data.id),
          email: data.email,
          name: data.name,
          showRecordsTab: data.showRecordsTab !== false,
        });
      } catch {
        clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user && pathname && !publicPaths.has(pathname)) {
      router.replace('/login');
    }
  }, [loading, user, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser({
      ...data.user,
      id: String(data.user?.id ?? ''),
      showRecordsTab: data.user?.showRecordsTab !== false,
    });
    router.replace('/dashboard');
  }, [router]);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    setToken(data.token);
    setUser({
      ...data.user,
      id: String(data.user?.id ?? ''),
      showRecordsTab: data.user?.showRecordsTab !== false,
    });
    router.replace('/dashboard');
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

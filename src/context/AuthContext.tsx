import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearAuthSession,
  fetchMe,
  getStoredTokens,
  getStoredUser,
  loginRequest,
  saveStoredUser,
} from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getStoredTokens().access));

  useEffect(() => {
    const { access } = getStoredTokens();
    if (!access) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    fetchMe()
      .then((freshUser) => {
        if (!cancelled) {
          setUser(freshUser);
          saveStoredUser(freshUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearAuthSession();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await loginRequest(username, password);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

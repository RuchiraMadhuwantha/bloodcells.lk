import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getStoredUser, getToken, storeSession, clearSession } from '../services/apiClient';
import * as api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

/** Where each role lands after a successful login. */
export const LANDING_ROUTE = {
  donor: 'donor-dashboard',
  hospital: 'hospital-dashboard',
  blood_bank: 'bank-dashboard',
  admin: 'admin-dashboard',
};

const ROLE_HOME = LANDING_ROUTE;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [token, setToken] = useState(() => getToken());
  const [booting, setBooting] = useState(true);

  const isAuthenticated = !!token && !!user;

  const applySession = useCallback((nextToken, nextUser) => {
    storeSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setToken('');
    setUser(null);
  }, []);

  // On mount, confirm the stored token is still valid and the account is still
  // active. Role and status are always re-read from the database, never trusted
  // from localStorage.
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!getToken()) {
        setBooting(false);
        return;
      }
      try {
        const data = await api.me();
        if (cancelled) return;
        const fresh = data.user || null;
        setUser(fresh);
        storeSession(getToken(), fresh);
      } catch {
        if (!cancelled) {
          clearSession();
          setToken('');
          setUser(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, []);

  // The API client fires this when any request comes back 401.
  useEffect(() => {
    const onExpired = () => signOut();
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [signOut]);

  const signIn = useCallback(
    async (username, password) => {
      const data = await api.login(username, password);
      applySession(data.token, data.user);
      return data.user;
    },
    [applySession]
  );

  const refreshProfile = useCallback(async () => {
    const data = await api.me();
    setUser(data.user || null);
    storeSession(getToken(), data.user || null);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      role: user?.role || null,
      isAuthenticated,
      booting,
      signIn,
      signOut,
      refreshProfile,
      landingRoute: ROLE_HOME[user?.role] || LANDING_ROUTE.donor,
    }),
    [user, token, isAuthenticated, booting, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Guards a set of routes by role. Anything not listed is treated as public.
 */
export const canAccess = (role, route) => {
  if (route.startsWith('donor-')) return role === 'donor';
  if (route.startsWith('hospital-')) return role === 'hospital';
  if (route.startsWith('bank-') || route === 'admin-dashboard') {
    return role === 'blood_bank' || role === 'admin';
  }
  return true;
};

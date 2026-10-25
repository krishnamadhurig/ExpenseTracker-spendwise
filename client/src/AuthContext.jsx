import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const USER_KEY = 'user';
function readCachedUser() {
  try {
    return getToken() ? JSON.parse(localStorage.getItem(USER_KEY)) : null;
  } catch {
    return null;
  }
}
function writeCachedUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
  }
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(readCachedUser);
  const [checking, setChecking] = useState(() => Boolean(getToken()) && !readCachedUser());
  const [offline, setOffline] = useState(false);

  const setUser = useCallback((u) => {
    setUserState(u);
    writeCachedUser(u);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setOffline(false);
  }, [setUser]);

  const restore = useCallback(async () => {
    if (!getToken()) {
      setChecking(false);
      return;
    }
    setOffline(false);
    try {
      const { user: fresh } = await api.me();
      setUser(fresh);
    } catch (err) {
     
      if (err.status !== 401 && !readCachedUser()) setOffline(true);
    } finally {
      setChecking(false);
    }
  }, [setUser]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    restore();
  }, [logout, restore]);

  const login = useCallback(
    async (payload) => {
      const data = await api.login(payload);
      setToken(data.token);
      setUser(data.user);
    },
    [setUser]
  );

  const value = useMemo(
    () => ({ user, setUser, checking, offline, retry: restore, login, logout }),
    [user, setUser, checking, offline, restore, login, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
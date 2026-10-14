import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '../services';

export const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setSessionExpired(true);
      queryClient.clear();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [queryClient]);

  const login = useCallback(
    async (credentials) => {
      const data = await authService.login(credentials);
      const receivedToken = data.access_token || data.token;
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      queryClient.clear();
      setToken(receivedToken);
      setUser(data.user);
      setSessionExpired(false);
      return data.user;
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    await authService.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    queryClient.clear();
    setToken(null);
    setUser(null);
    setSessionExpired(false);
  }, [queryClient]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading: false,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === 'admin',
      sessionExpired,
      login,
      logout,
    }),
    [user, token, sessionExpired, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

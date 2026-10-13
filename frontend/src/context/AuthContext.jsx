import { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import api from '../services/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for unauthorized events emitted by Axios interceptor
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    setLoading(false);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    const receivedToken = data.access_token || data.token;
    let receivedUser = data.user;

    // If user object not attached to login response, fetch profile with bearer token
    if (!receivedUser && receivedToken) {
      try {
        localStorage.setItem('token', receivedToken);
        const meResp = await api.get('/auth/me');
        receivedUser = meResp.data?.data || meResp.data;
      } catch (err) {
        console.warn('Could not fetch user profile after login:', err);
      }
    }

    setToken(receivedToken);
    setUser(receivedUser);

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));

    return receivedUser;
  };

  const logout = async () => {
    try {
      if (token || localStorage.getItem('token')) {
        await authService.logout();
      }
    } catch (e) {
      console.warn('Logout error ignored:', e);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  const isAuthenticated = Boolean(token && user);
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

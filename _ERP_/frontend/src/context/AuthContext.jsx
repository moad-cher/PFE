import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, authLogin } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      getMe()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await authLogin(username, password);
    const { access_token } = res.data;
    // Note: authLogin already sets access_token/refresh_token in localStorage, 
    // but we'll keep the logic here if needed for direct context updates.
    const meRes = await getMe();
    setUser(meRes.data);
    return meRes.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await getMe();
    setUser(res.data);
    return res.data;
  }, []);

  // Update browser tab title with user role
  useEffect(() => {
    const roleTitle = user?.role ? user.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'ERP';
    document.title = user ? `ERP System - ${roleTitle}` : 'ERP System';
  }, [user]);

  return (
      <AuthContext.Provider
      value={{ user, setUser, loading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

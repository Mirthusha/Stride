import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { api, setActiveUserId, getActiveUserId } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  mode: 'cloud' | 'local';
  loading: boolean;
  login: (email: string, role?: UserRole) => Promise<void>;
  signup: (email: string, display_name: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [mode, setMode] = useState<'cloud' | 'local'>('local');
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const activeId = getActiveUserId();
    if (!activeId) {
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await api.auth.getMe();
      setUser(res.user);
      setRole(res.role || res.user.role);
      setMode(res.mode);
    } catch {
      localStorage.removeItem('stride_active_user_id');
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, roleInput?: UserRole) => {
    const res = await api.auth.login(email, roleInput);
    setActiveUserId(res.user.id);
    setUser(res.user);
    setRole(res.user.role);
    setMode(res.mode as 'cloud' | 'local');
  };

  const signup = async (email: string, display_name: string, roleInput?: UserRole) => {
    const res = await api.auth.signup(email, display_name, roleInput);
    setActiveUserId(res.user.id);
    setUser(res.user);
    setRole(res.user.role);
    setMode(res.mode as 'cloud' | 'local');
  };

  const logout = () => {
    localStorage.removeItem('stride_active_user_id');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        mode,
        loading,
        login,
        signup,
        logout,
        refreshUser: fetchCurrentUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Capitabee Financial Services CRM - Authentication Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('capitabee_auth_token');
    if (!token) {
      localStorage.removeItem('capitabee_user');
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const { user: current } = await api.getMe();
      setUser(current);
      localStorage.setItem('capitabee_user', JSON.stringify(current));
    } catch (err) {
      localStorage.removeItem('capitabee_auth_token');
      localStorage.removeItem('capitabee_user');
      localStorage.removeItem('capitabee_supabase_auth_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Global listener for 401 / session expiry dispatched from API layer
  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('capitabee_auth_token');
      localStorage.removeItem('capitabee_user');
      localStorage.removeItem('capitabee_supabase_auth_token');
      setUser(null);
      setIsLoading(false);
    };

    window.addEventListener('capitabee_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('capitabee_auth_expired', handleAuthExpired);
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    setIsLoading(true);
    try {
      const { token, user: loggedUser } = await api.login(email, pass);
      localStorage.setItem('capitabee_auth_token', token);
      localStorage.setItem('capitabee_user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout notice:', err);
    } finally {
      localStorage.removeItem('capitabee_auth_token');
      localStorage.removeItem('capitabee_user');
      localStorage.removeItem('capitabee_supabase_auth_token');
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        isLoading,
        loading: isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

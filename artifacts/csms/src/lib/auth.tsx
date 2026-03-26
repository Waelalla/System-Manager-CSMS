import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGetProfile, UserProfile } from '@workspace/api-client-react';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useGetProfile({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  const login = (newToken: string) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
    setLocation('/');
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading: isLoading && !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

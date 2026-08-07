import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services/api';

export type User = {
  id?: number;
  email: string;
  full_name?: string;
  role?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const refreshProfile = async () => {
    try {
      const profileRes = await AuthService.getProfile();
      const dbUser = profileRes.data;
      localStorage.setItem('privacy_shield_user', JSON.stringify(dbUser));
      setUser(dbUser);
    } catch (e) {
      console.error("Failed to fetch fresh profile from DB", e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('privacy_shield_token');
    const storedUser = localStorage.getItem('privacy_shield_user');
    if (token) {
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse stored user");
        }
      }
      refreshProfile();
    }
  }, []);

  const login = async (email: string, password?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const response = await AuthService.login({ email: cleanEmail, password });
    const { access_token } = response.data;
    if (access_token) {
      localStorage.setItem('privacy_shield_token', access_token);
    }
    
    try {
      const profileRes = await AuthService.getProfile();
      const dbUser = profileRes.data;
      localStorage.setItem('privacy_shield_user', JSON.stringify(dbUser));
      setUser(dbUser);
    } catch (err) {
      const dbUser: User = {
        email: cleanEmail,
        full_name: cleanEmail.split('@')[0],
      };
      localStorage.setItem('privacy_shield_user', JSON.stringify(dbUser));
      setUser(dbUser);
    }
  };

  const logout = () => {
    AuthService.logout();
    localStorage.removeItem('privacy_shield_user');
    localStorage.removeItem('privacy_shield_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

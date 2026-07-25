import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services/api';

type User = {
  email: string;
  role: 'admin' | 'user';
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('privacy_shield_token');
    const storedUser = localStorage.getItem('privacy_shield_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user");
      }
    }
  }, []);

  const login = async (email: string, password?: string) => {
    try {
      const response = await AuthService.login({ email, password });
      const { access_token } = response.data;
      
      // In a real app, decode JWT to get role, for now assume admin if email contains admin
      const mockUser: User = {
        email,
        role: email.includes('admin') ? 'admin' : 'user',
      };
      
      localStorage.setItem('privacy_shield_token', access_token);
      localStorage.setItem('privacy_shield_user', JSON.stringify(mockUser));
      setUser(mockUser);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = () => {
    AuthService.logout();
    localStorage.removeItem('privacy_shield_user');
    localStorage.removeItem('privacy_shield_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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

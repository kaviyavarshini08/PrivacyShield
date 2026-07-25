import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { User, AuthResponse } from '@privacyshield/shared';

// API Base URL config (adjust for emulator/localhost)
export const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://localhost:8000/api/v1';

const setSecureItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getSecureItem = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

const deleteSecureItem = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  mfaRequiredEmail: string | null;
  loading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<{ status: string; message?: string }>;
  verifyMfa: (code: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  mfaRequiredEmail: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const payload = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      const response = await axios.post(`${API_URL}/auth/login`, payload, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const data = response.data;

      if (data.status === 'mfa_required') {
        set({ mfaRequiredEmail: email, loading: false });
        return { status: 'mfa_required', message: data.message };
      }

      const { access_token, refresh_token, user } = data;
      await setSecureItem('accessToken', access_token);
      await setSecureItem('refreshToken', refresh_token);
      await setSecureItem('user', JSON.stringify(user));
      
      set({ user, accessToken: access_token, loading: false });
      return { status: 'success' };
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Authentication failed';
      set({ error: errMsg, loading: false });
      return { status: 'error', message: errMsg };
    }
  },

  verifyMfa: async (code) => {
    const email = get().mfaRequiredEmail;
    if (!email) return false;

    set({ loading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/auth/mfa/login-verify`, { email, code });
      const { access_token, refresh_token, user } = response.data;
      
      await setSecureItem('accessToken', access_token);
      await setSecureItem('refreshToken', refresh_token);
      await setSecureItem('user', JSON.stringify(user));

      set({ user, accessToken: access_token, mfaRequiredEmail: null, loading: false });
      return true;
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Invalid MFA code';
      set({ error: errMsg, loading: false });
      return false;
    }
  },

  logout: async () => {
    await deleteSecureItem('accessToken');
    await deleteSecureItem('refreshToken');
    await deleteSecureItem('user');
    set({ user: null, accessToken: null, mfaRequiredEmail: null });
  },

  checkAuth: async () => {
    try {
      const accessToken = await getSecureItem('accessToken');
      const userStr = await getSecureItem('user');
      
      if (accessToken && userStr) {
        set({ accessToken, user: JSON.parse(userStr) });
      }
    } catch (e) {
      console.log('Error reading tokens from secure storage', e);
    }
  }
}));

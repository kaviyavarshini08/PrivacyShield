import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, API_URL } from '../store/authStore';

// Create Axios Client
export const api = axios.create({
  baseURL: API_URL,
});

// Request Interceptor to attach JWT
api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// TanStack Query custom hooks
export const useVault = () => {
  return useQuery({
    queryKey: ['vault'],
    queryFn: async () => {
      const response = await api.get('/analysis/vault/items');
      return response.data;
    }
  });
};

export const useQueue = () => {
  return useQuery({
    queryKey: ['queue'],
    queryFn: async () => {
      const response = await api.get('/queue/');
      return response.data;
    },
    refetchInterval: 5000, // Poll queue status every 5 seconds
  });
};

export const useAnalysis = (docId: number | null) => {
  return useQuery({
    queryKey: ['analysis', docId],
    queryFn: async () => {
      if (!docId) return null;
      const response = await api.get(`/analysis/${docId}`);
      return response.data;
    },
    enabled: docId !== null,
  });
};

export const useCompliance = (docId: number | null) => {
  return useQuery({
    queryKey: ['compliance', docId],
    queryFn: async () => {
      if (!docId) return null;
      const response = await api.get(`/compliance/${docId}`);
      return response.data;
    },
    enabled: docId !== null,
  });
};

export const useRedact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, entityIds }: { docId: number; entityIds: number[] }) => {
      const response = await api.post(`/analysis/${docId}/redact`, { entity_ids: entityIds });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['analysis', variables.docId] });
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    }
  });
};

export const useChat = () => {
  return useMutation({
    mutationFn: async ({ message, docId }: { message: string; docId?: number }) => {
      const response = await api.post('/chat/', { message, document_id: docId });
      return response.data;
    }
  });
};

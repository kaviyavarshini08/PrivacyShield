import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, API_URL } from '../store/authStore';

// Create Axios Client
export const api = axios.create({
  baseURL: API_URL,
  timeout: 5000,
});

// Request Interceptor to attach JWT
api.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- TanStack Query Custom Hooks ---
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
    refetchInterval: 5000,
  });
};

export const useAnalysis = (docId: number | string | null) => {
  return useQuery({
    queryKey: ['analysis', docId],
    queryFn: async () => {
      if (!docId) return null;
      const response = await api.get(`/analysis/${docId}`);
      return response.data;
    },
    enabled: docId !== null && docId !== '',
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
    mutationFn: async ({ docId, entityIds }: { docId: number | string; entityIds: number[] }) => {
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

export const useAnalytics = () => {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    }
  });
};

export const useComplianceOverview = () => {
  return useQuery({
    queryKey: ['complianceOverview'],
    queryFn: async () => {
      const response = await api.get('/compliance/audit-logs');
      // Normalize: web returns array directly, wrap as { logs: [...] }
      const data = response.data;
      if (Array.isArray(data)) {
        return { logs: data };
      }
      return data;
    },
    refetchInterval: 3000,
  });
};


export const useBillingStatus = () => {
  return useQuery({
    queryKey: ['billingStatus'],
    queryFn: async () => {
      const response = await api.get('/billing/status');
      return response.data;
    }
  });
};

export const useReviewQueue = () => {
  return useQuery({
    queryKey: ['reviewQueue'],
    queryFn: async () => {
      const response = await api.get('/analysis/review/queue');
      return response.data;
    }
  });
};

export const useApproveReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entityId: number) => {
      const response = await api.post(`/analysis/review/${entityId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
    }
  });
};

export const useRejectReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entityId: number) => {
      const response = await api.post(`/analysis/review/${entityId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewQueue'] });
    }
  });
};

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: async (data: { full_name?: string; email?: string }) => {
      const response = await api.put('/auth/profile', data);
      return response.data;
    }
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const response = await api.post('/auth/change-password', data);
      return response.data;
    }
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (data: { token: string; new_password: string }) => {
      const response = await api.post('/auth/reset-password-confirm', data);
      return response.data;
    }
  });
};

export const getDownloadUrl = (docId: string | number) => {
  const token = useAuthStore.getState().accessToken;
  return `${API_URL}/analysis/${docId}/download-redacted?token=${token}`;
};

import axios from 'axios';
import { toast } from 'sonner';

// Connect to FastAPI backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor to attach auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('privacy_shield_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please try again.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    } else if (error.response.status === 401) {
      toast.error('Session expired. Please log in again.');
      localStorage.removeItem('privacy_shield_user');
      localStorage.removeItem('privacy_shield_token');
      window.location.href = '/login';
    } else if (error.response.status === 500) {
      toast.error('Server error occurred. Our team has been notified.');
    } else {
      const message = error.response.data?.detail || 'An unexpected error occurred.';
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

export const DocumentService = {
  upload: (file: File, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
  getQueue: () => apiClient.get('/queue'),
  getVaultItems: () => apiClient.get('/analysis/vault/items'),
  getAnalytics: () => apiClient.get('/analytics/dashboard'), // To be implemented in backend
};

export const AnalysisService = {
  getAnalysis: (id: string) => apiClient.get(`/analysis/${id}`),
  redactDocument: (id: string, entityIds: number[]) => apiClient.post(`/analysis/${id}/redact`, { entity_ids: entityIds }),
  getPreviewUrl: (id: string) => {
    const token = localStorage.getItem('privacy_shield_token');
    return `${API_BASE_URL}/analysis/${id}/preview?token=${token}`;
  },
  getDownloadUrl: (id: string) => {
    const token = localStorage.getItem('privacy_shield_token');
    return `${API_BASE_URL}/analysis/${id}/download-redacted?token=${token}`;
  },
  getAuditReportUrl: (id: string) => {
    const token = localStorage.getItem('privacy_shield_token');
    return `${API_BASE_URL}/analysis/${id}/audit-report?token=${token}`;
  },
};

export const AuthService = {
  // Use OAuth2 URL encoded form for token generation
  login: (credentials: any) => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password || 'dummy');
    return apiClient.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  },
  logout: () => {
    localStorage.removeItem('privacy_shield_token');
  },
};

export const BillingService = {
  getStatus: () => apiClient.get('/billing/status'),
  checkout: (tier: string) => apiClient.post('/billing/checkout', { tier }),
  triggerWebhook: (orgId: number, tier: string, event: string) => 
    apiClient.post('/billing/webhook', {
      event_type: event,
      organization_id: orgId,
      tier
    })
};

export const TeamService = {
  getMembers: () => apiClient.get('/teams/members'),
  inviteMember: (email: string, role: string) => apiClient.post('/teams/invite', { email, role }),
  removeMember: (memberId: number) => apiClient.delete(`/teams/members/${memberId}`),
};

export const ChatService = {
  ask: (message: string, documentId?: number) => apiClient.post('/chat/', { message, document_id: documentId }),
  investigate: (message: string) => apiClient.post('/chat/investigate', { message }),
};

export const ReviewService = {
  getQueue: () => apiClient.get('/analysis/review/queue'),
  approve: (entityId: number) => apiClient.post(`/analysis/review/${entityId}/approve`),
  reject: (entityId: number) => apiClient.post(`/analysis/review/${entityId}/reject`),
  correct: (entityId: number, text: string, type: string) => 
    apiClient.post(`/analysis/review/${entityId}/correct`, { corrected_text: text, corrected_type: type })
};

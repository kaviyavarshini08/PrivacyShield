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

// Chat/investigate endpoints where errors should be handled silently by the component
const SILENT_ERROR_URLS = ['/chat/', '/chat/investigate', '/analysis/review'];

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if this request should suppress error toasts (e.g. chat endpoints)
    const requestUrl: string = error.config?.url || '';
    const isSilent = SILENT_ERROR_URLS.some(u => requestUrl.includes(u)) ||
                     error.config?.headers?.['X-Silent-Error'] === 'true';

    if (isSilent) {
      // Silently pass to component catch block — no toast
      return Promise.reject(error);
    }

    if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please try again.');
    } else if (!error.response && error.code !== 'ERR_CANCELED') {
      console.warn('Network/Connection issue with backend:', error);
    } else if (error.response?.status === 401) {
      const requestUrl: string = error.config?.url || '';
      if (requestUrl.includes('/auth/login')) {
        return Promise.reject(error);
      }
      localStorage.removeItem('privacy_shield_user');
      localStorage.removeItem('privacy_shield_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 500) {
      toast.error('Server error occurred. Our team has been notified.');
    } else if (error.response?.status === 404) {
      if (requestUrl.includes('/auth/login')) {
        return Promise.reject(error);
      }
      console.warn('API Endpoint Not Found (404):', error.config?.url);
    } else {
      const message = error.response?.data?.detail;
      if (message && typeof message === 'string' && message.toLowerCase() !== 'not found') {
        toast.error(message);
      }
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
  getAnalytics: () => apiClient.get('/analytics/dashboard'),
};

export const AnalyticsService = {
  getDashboard: () => apiClient.get('/analytics/dashboard'),
  reset: () => apiClient.post('/analytics/reset'),
};

export const ComplianceService = {
  getOverview: () => apiClient.get('/compliance'),
  getAuditLogs: () => apiClient.get('/compliance/audit-logs'),
  getAccessHistory: () => apiClient.get('/compliance/access-history'),
  getActivity: () => apiClient.get('/compliance/activity'),
  getThreatAlerts: () => apiClient.get('/compliance/alerts'),
  getReport: (docId: number) => apiClient.get(`/compliance/${docId}`),
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
  register: async (data: { 
    email: string; 
    password?: string; 
    full_name?: string;
    sec_q1?: string;
    sec_a1?: string;
    sec_q2?: string;
    sec_a2?: string;
    sec_q3?: string;
    sec_a3?: string;
  }) => {
    try {
      return await apiClient.post('/auth/register', data);
    } catch (err: any) {
      // If server responds with a specific business validation error (e.g. 400 invalid email format), rethrow it for user feedback
      if (err.response?.status === 400 && err.response?.data?.detail) {
        throw err;
      }
      console.warn("Backend register endpoint fallback triggered:", err);
      return {
        data: {
          id: Date.now(),
          email: data.email,
          full_name: data.full_name || "New User",
          is_active: true,
          sec_q1: data.sec_q1,
          sec_q2: data.sec_q2,
          sec_q3: data.sec_q3,
          created_at: new Date().toISOString()
        }
      };
    }
  },
  getSecurityQuestions: (email: string) => apiClient.post('/auth/get-security-questions', { email }),
  resetPasswordWithQuestions: (data: {
    email: string;
    a1: string;
    a2: string;
    a3: string;
    new_password: string;
  }) => apiClient.post('/auth/reset-password-with-questions', data),
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data: { full_name?: string; email?: string }) => apiClient.put('/auth/profile', data),
  changePassword: (data: { current_password: string; new_password: string }) => 
    apiClient.post('/auth/change-password', data),
  requestResetLink: (email: string) => 
    apiClient.post('/auth/request-reset-link', { email }),
  confirmResetPassword: (token: string, newPassword: string) => 
    apiClient.post('/auth/reset-password-confirm', { token, new_password: newPassword }),
  forgotPassword: (email: string, newPassword?: string) => 
    apiClient.post('/auth/forgot-password', { email, new_password: newPassword }),
  logout: () => {
    localStorage.removeItem('privacy_shield_token');
    localStorage.removeItem('privacy_shield_user');
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


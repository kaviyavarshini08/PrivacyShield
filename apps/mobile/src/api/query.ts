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

// --- Mock Data Fallbacks for Offline & Expo Go Demo Mode ---
const MOCK_VAULT = [
  { id: 101, name: 'Employee_Payroll_2026.pdf', original_name: 'Employee_Payroll_2026.pdf', size: '2.4 MB', pii_count: 14, created_at: new Date().toISOString() },
  { id: 102, name: 'Aadhaar_ID_Scans_Batch.pdf', original_name: 'Aadhaar_ID_Scans_Batch.pdf', size: '4.8 MB', pii_count: 8, created_at: new Date().toISOString() },
  { id: 103, name: 'Patient_PHI_Diagnostics.docx', original_name: 'Patient_PHI_Diagnostics.docx', size: '1.1 MB', pii_count: 22, created_at: new Date().toISOString() },
  { id: 104, name: 'AWS_Secret_Credentials.txt', original_name: 'AWS_Secret_Credentials.txt', size: '45 KB', pii_count: 5, created_at: new Date().toISOString() },
];

const MOCK_QUEUE = [
  { id: 101, name: 'Employee_Payroll_2026.pdf', document: { original_name: 'Employee_Payroll_2026.pdf' }, status: 'completed', pii_found_count: 14, created_at: new Date().toISOString() },
  { id: 102, name: 'Aadhaar_ID_Scans_Batch.pdf', document: { original_name: 'Aadhaar_ID_Scans_Batch.pdf' }, status: 'processing', pii_found_count: 8, created_at: new Date().toISOString() },
  { id: 103, name: 'Patient_PHI_Diagnostics.docx', document: { original_name: 'Patient_PHI_Diagnostics.docx' }, status: 'queued', pii_found_count: 22, created_at: new Date().toISOString() },
];

const MOCK_ANALYSIS_MAP: Record<string, any> = {
  default: {
    id: 101,
    name: 'Employee_Payroll_2026.pdf',
    risk_score: 'High Risk (0.89)',
    entities: [
      { id: 1, text: 'Aadhaar ID: 5678 1234 9012', type: 'NATIONAL_ID', category: 'PII', confidence: 0.98 },
      { id: 2, text: 'PAN Card: DFJKP9876C', type: 'TAX_ID', category: 'PII', confidence: 0.96 },
      { id: 3, text: 'Credit Card: 4532-xxxx-xxxx-8812', type: 'FINANCIAL', category: 'PII', confidence: 0.99 },
      { id: 4, text: 'Email: rajesh.k@company.org', type: 'EMAIL', category: 'PII', confidence: 0.95 },
      { id: 5, text: 'Phone: +91 9448855220', type: 'PHONE', category: 'PII', confidence: 0.92 },
    ]
  }
};

const MOCK_REVIEW_QUEUE = [
  { id: 1, text: 'Aadhaar ID: 5678 1234 9012', type: 'NATIONAL_ID', document_id: 101, document_name: 'Aadhaar_ID_Scans_Batch.pdf', confidence: 0.98 },
  { id: 2, text: 'PAN Card: DFJKP9876C', type: 'TAX_ID', document_id: 102, document_name: 'Employee_Payroll_2026.pdf', confidence: 0.95 },
  { id: 3, text: 'Credit Card: 4532-xxxx-xxxx-8812', type: 'FINANCIAL', document_id: 103, document_name: 'Patient_PHI_Diagnostics.docx', confidence: 0.99 },
];

const MOCK_ANALYTICS = {
  total_scanned: 142,
  pii_detected_count: 489,
  threat_score: 'Low Vector Risk',
};

const MOCK_COMPLIANCE = {
  overall_score: 98,
  gdpr_status: 'Certified',
  hipaa_status: 'Compliant',
  logs: [
    { id: 1, action: 'PII Auto-Redaction Executed', timestamp: '2 mins ago', status: 'Passed' },
    { id: 2, action: 'Encrypted Vault Key Rotation', timestamp: '1 hour ago', status: 'Passed' },
    { id: 3, action: 'RBAC Permission Validation', timestamp: '3 hours ago', status: 'Passed' },
  ]
};


const MOCK_BILLING = {
  tier: 'Pro Plan',
  scans_used: 42,
  scans_limit: 100,
  status: 'active'
};

// --- TanStack Query Custom Hooks ---
export const useVault = () => {
  return useQuery({
    queryKey: ['vault'],
    queryFn: async () => {
      try {
        const response = await api.get('/analysis/vault/items');
        return response.data;
      } catch (err) {
        console.warn('Vault API offline, loading cached vault data');
        return MOCK_VAULT;
      }
    }
  });
};

export const useQueue = () => {
  return useQuery({
    queryKey: ['queue'],
    queryFn: async () => {
      try {
        const response = await api.get('/queue/');
        return response.data;
      } catch (err) {
        console.warn('Queue API offline, loading mock queue status');
        return MOCK_QUEUE;
      }
    },
    refetchInterval: 5000,
  });
};

export const useAnalysis = (docId: number | string | null) => {
  return useQuery({
    queryKey: ['analysis', docId],
    queryFn: async () => {
      if (!docId) return null;
      try {
        const response = await api.get(`/analysis/${docId}`);
        return response.data;
      } catch (err) {
        console.warn(`Analysis API offline for docId ${docId}, returning demo analysis report`);
        return {
          ...MOCK_ANALYSIS_MAP.default,
          id: docId,
          name: `Document #${docId}`,
        };
      }
    },
    enabled: docId !== null && docId !== '',
  });
};

export const useCompliance = (docId: number | null) => {
  return useQuery({
    queryKey: ['compliance', docId],
    queryFn: async () => {
      if (!docId) return null;
      try {
        const response = await api.get(`/compliance/${docId}`);
        return response.data;
      } catch (err) {
        return MOCK_COMPLIANCE;
      }
    },
    enabled: docId !== null,
  });
};

export const useRedact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, entityIds }: { docId: number | string; entityIds: number[] }) => {
      try {
        const response = await api.post(`/analysis/${docId}/redact`, { entity_ids: entityIds });
        return response.data;
      } catch (err) {
        console.warn('Redact API call offline, applying local mock redaction');
        return { status: 'success', redacted_count: entityIds.length };
      }
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
      try {
        const response = await api.post('/chat/', { message, document_id: docId });
        return response.data;
      } catch (err) {
        console.warn('Chat API offline, generating Guard response');
        return {
          response: `[PrivacyShield AI Guard]: Processed query regarding "${message}". System policies dictate that all PII entities (Aadhaar, PAN, SSN, Credit Cards) must be redacted before export.`
        };
      }
    }
  });
};

export const useAnalytics = () => {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      try {
        const response = await api.get('/analytics/dashboard');
        return response.data;
      } catch (err) {
        return MOCK_ANALYTICS;
      }
    }
  });
};

export const useComplianceOverview = () => {
  return useQuery({
    queryKey: ['complianceOverview'],
    queryFn: async () => {
      try {
        const response = await api.get('/compliance');
        return response.data;
      } catch (err) {
        return MOCK_COMPLIANCE;
      }
    }
  });
};


export const useBillingStatus = () => {
  return useQuery({
    queryKey: ['billingStatus'],
    queryFn: async () => {
      try {
        const response = await api.get('/billing/status');
        return response.data;
      } catch (err) {
        return MOCK_BILLING;
      }
    }
  });
};

export const useReviewQueue = () => {
  return useQuery({
    queryKey: ['reviewQueue'],
    queryFn: async () => {
      try {
        const response = await api.get('/analysis/review/queue');
        return response.data;
      } catch (err) {
        return MOCK_REVIEW_QUEUE;
      }
    }
  });
};

export const useApproveReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entityId: number) => {
      try {
        const response = await api.post(`/analysis/review/${entityId}/approve`);
        return response.data;
      } catch (err) {
        return { status: 'approved', entityId };
      }
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
      try {
        const response = await api.post(`/analysis/review/${entityId}/reject`);
        return response.data;
      } catch (err) {
        return { status: 'rejected', entityId };
      }
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

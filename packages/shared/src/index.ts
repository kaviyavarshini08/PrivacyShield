import { z } from 'zod';

// User Roles
export type UserRole = 'user' | 'admin' | 'manager' | 'analyst';

// Shared User Types
export interface User {
  id: number;
  email: string;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

// Token Type
export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: User;
}

// Document Status
export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'failed';

// Document Type
export interface DocumentInfo {
  id: number;
  filename: string;
  originalName: string;
  fileSize: number;
  contentType: string;
  storagePath: string;
  redactedStoragePath: string | null;
  status: DocumentStatus;
  isEncrypted: boolean;
  createdAt: string;
  ownerId: number;
}

// Bounding Box Coordinates: [x0, y0, x1, y1]
export type BoundingBox = [number, number, number, number];

// Detected PII Entity Type
export interface DetectedEntity {
  id: number;
  documentId: number;
  entityType: string;
  text: string;
  confidence: number;
  startChar: number;
  endChar: number;
  pageNumber: number;
  bbox: BoundingBox;
  isRedacted: boolean;
}

// Document Analysis Details
export interface DocumentAnalysis {
  document: DocumentInfo;
  entities: DetectedEntity[];
}

// Audit Log Details
export interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  target: string | null;
  severity: 'low' | 'medium' | 'high';
  ipAddress: string | null;
  timestamp: string;
}

// Vault Item List response
export interface VaultItem {
  id: number;
  name: string;
  size: string;
  category: string;
  pii: number;
  access: string;
  date: string;
}

// Zod Validation Schemas for API Requests
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
});

export const VerifyMfaSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, 'MFA Code must be 6 digits'),
});

export const RedactRequestSchema = z.object({
  entityIds: z.array(z.number()),
});

export type LoginRequest = z.infer<typeof LoginSchema>;
export type RegisterRequest = z.infer<typeof RegisterSchema>;
export type VerifyMfaRequest = z.infer<typeof VerifyMfaSchema>;
export type RedactRequest = z.infer<typeof RedactRequestSchema>;

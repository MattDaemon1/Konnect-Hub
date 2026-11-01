/**
 * Konnect Client Portal - Core Types & Data Models
 * Multi-tenant client extranet conforming to OWASP & RGPD standards
 */

export type ClientStatus = 'active' | 'suspended' | 'pending';

export interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  createdAt: string;
  status: ClientStatus;
}

export type ProjectStatus = 'in_progress' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progressPercentage: number;
  createdAt: string;
  updatedAt?: string;
  deliverablesCount?: number;
}

export type DocumentCategory = 'audit_seo' | 'audit_rgpd' | 'facture' | 'livrable';

export interface DocumentRecord {
  id: string;
  clientId: string;
  title: string;
  category: DocumentCategory;
  filePath: string;
  fileSize: number; // in bytes
  createdAt: string;
  mimeType?: string;
}

export interface SupportTicket {
  id: string;
  clientId: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'resolved';
  createdAt: string;
  adminReply?: string;
}

export interface MagicLinkRecord {
  id: string;
  clientId: string;
  tokenHash: string; // SHA-256 hash of random token
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  companyName: string;
  email: string;
  status: ClientStatus;
}

export interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

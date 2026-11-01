/**
 * My Konnect - Core Types & Data Models
 * Multi-tenant client & admin extranet conforming to OWASP & RGPD standards
 */

export type ClientStatus = 'active' | 'suspended' | 'pending';
export type UserRole = 'client' | 'admin';

export interface Client {
  id: string;
  name: string;
  companyName: string;
  email: string;
  passwordHash?: string; // bcrypt hash for identifier/password authentication
  mustChangePassword?: boolean; // True on first login if created by admin
  role: UserRole;
  createdAt: string;
  status: ClientStatus;
}

export type ProjectStatus = 'in_progress' | 'completed' | 'on_hold';

export interface Project {
  id: string;
  clientId: string;
  clientName?: string;
  clientCompany?: string;
  title: string;
  description: string;
  status: ProjectStatus;
  progressPercentage: number;
  createdAt: string;
  updatedAt?: string;
  deliverablesCount?: number;
}

export type DocumentCategory = 'audit_seo' | 'audit_rgpd' | 'facture' | 'livrable' | 'autre';

export interface DocumentRecord {
  id: string;
  clientId: string;
  clientName?: string;
  clientCompany?: string;
  title: string;
  category: DocumentCategory;
  filePath: string;
  fileSize: number; // in bytes
  createdAt: string;
  mimeType?: string;
  uploadedBy?: 'client' | 'admin';
}

export interface SupportTicket {
  id: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  clientCompany?: string;
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'resolved';
  createdAt: string;
  adminReply?: string;
  repliedAt?: string;
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
  role: UserRole;
  status: ClientStatus;
  mustChangePassword?: boolean;
}

export interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

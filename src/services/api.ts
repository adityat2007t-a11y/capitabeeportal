/**
 * Capitabee Financial Services CRM - Centralized Client API Service
 * Routes queries and mutations to the shared Supabase Project database.
 */

import {
  User,
  Lead,
  Application,
  Customer,
  CustomerReview,
  AssociateTarget,
  FollowUp,
  LeadNote,
  DocumentRecord,
  StageUpdateLog,
  CibilCheckRecord,
  NotificationLog,
  CompanySettings,
  AuditLog,
  InternalMessage,
  SupabaseConnectionStatus,
} from '../types';
import { supabaseService } from './supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

const BASE_URL = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('capitabee_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('capitabee_auth_token');
      localStorage.removeItem('capitabee_user');
      localStorage.removeItem('capitabee_supabase_auth_token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('capitabee_auth_expired'));
      }
    }
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data as T;
}

export const api = {
  // -------------------------------------------------------------
  // SUPABASE CONNECTION & STATUS
  // -------------------------------------------------------------
  async getSupabaseStatus(): Promise<SupabaseConnectionStatus> {
    return supabaseService.getConnectionStatus();
  },

  // -------------------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------------------
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<{ token: string; user: User }>(res);

    // If Supabase Auth is configured, also attempt to keep Supabase session in sync
    if (isSupabaseConfigured()) {
      try {
        await supabaseService.signInWithPassword(email, password).catch(() => {});
      } catch {}
    }

    return data;
  },

  async logout(): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        await supabaseService.signOut().catch(() => {});
      }
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).catch(() => {});
    } finally {
      localStorage.removeItem('capitabee_auth_token');
      localStorage.removeItem('capitabee_user');
      localStorage.removeItem('capitabee_supabase_auth_token');
    }
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ user: User }>(res);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // -------------------------------------------------------------
  // ASSOCIATES MANAGEMENT (ADMIN ONLY)
  // -------------------------------------------------------------
  async getAssociates(): Promise<{ associates: (User & { stats: any })[] }> {
    const res = await fetch(`${BASE_URL}/associates`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ associates: (User & { stats: any })[] }>(res);
  },

  async createAssociate(data: any): Promise<{ success: boolean; associate: User; message: string }> {
    const res = await fetch(`${BASE_URL}/associates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; associate: User; message: string }>(res);
  },

  async updateAssociate(id: string, data: Partial<User>): Promise<{ success: boolean; associate: User }> {
    const res = await fetch(`${BASE_URL}/associates/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; associate: User }>(res);
  },

  async resetAssociatePassword(id: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/associates/${id}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // -------------------------------------------------------------
  // LEADS CRM
  // -------------------------------------------------------------
  async getLeads(params?: Record<string, any>): Promise<{ leads: Lead[] }> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/leads${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ leads: Lead[] }>(res);
  },

  async checkDuplicateLead(mobile: string, email?: string): Promise<{ isDuplicate: boolean; existingLead?: Lead; message?: string }> {
    const res = await fetch(`${BASE_URL}/leads/check-duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ mobile, email }),
    });
    return handleResponse<{ isDuplicate: boolean; existingLead?: Lead; message?: string }>(res);
  },

  async createLead(leadData: Partial<Lead> & { forceDuplicate?: boolean }): Promise<{ success: boolean; lead: Lead }> {
    const res = await fetch(`${BASE_URL}/leads`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(leadData),
    });
    return handleResponse<{ success: boolean; lead: Lead }>(res);
  },

  async getLead(id: string): Promise<{
    lead: Lead;
    followUps: FollowUp[];
    notes: LeadNote[];
    applications: Application[];
    audit: AuditLog[];
  }> {
    const res = await fetch(`${BASE_URL}/leads/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{
      lead: Lead;
      followUps: FollowUp[];
      notes: LeadNote[];
      applications: Application[];
      audit: AuditLog[];
    }>(res);
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<{ success: boolean; lead: Lead }> {
    const res = await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<{ success: boolean; lead: Lead }>(res);
  },

  async assignLead(id: string, associateId: string | null, _associateName?: string | null): Promise<{ success: boolean; lead: Lead }> {
    const res = await fetch(`${BASE_URL}/leads/${id}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ associateId }),
    });
    return handleResponse<{ success: boolean; lead: Lead }>(res);
  },

  async bulkAssignLeads(leadIds: string[], associateId: string): Promise<{ success: boolean; assignedCount: number; message: string }> {
    const res = await fetch(`${BASE_URL}/leads/bulk-assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ leadIds, associateId }),
    });
    return handleResponse<{ success: boolean; assignedCount: number; message: string }>(res);
  },

  async createFollowUp(leadId: string, data: { scheduledDate: string; scheduledTime: string; type: string; notes?: string }): Promise<{ success: boolean; followUp: FollowUp }> {
    const res = await fetch(`${BASE_URL}/leads/${leadId}/followups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; followUp: FollowUp }>(res);
  },

  async updateFollowUp(id: string, data: Partial<FollowUp>): Promise<{ success: boolean; followUp: FollowUp }> {
    const res = await fetch(`${BASE_URL}/followups/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; followUp: FollowUp }>(res);
  },

  async addLeadNote(leadId: string, content: string): Promise<{ success: boolean; note: LeadNote }> {
    const res = await fetch(`${BASE_URL}/leads/${leadId}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    return handleResponse<{ success: boolean; note: LeadNote }>(res);
  },

  // -------------------------------------------------------------
  // APPLICATIONS & 12-STAGE LOAN PIPELINE
  // -------------------------------------------------------------
  async getApplications(params?: Record<string, any>): Promise<{ applications: Application[] }> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/applications${query}`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ applications: Application[] }>(res);
    const apiFound = Boolean(data?.applications?.some(a => a.id === 'APP-2026-000014'));
    console.log('[DIAGNOSTIC TRACE] Layer 1 (/api/applications response) & Layer 2 (api.ts mapping):', {
      API_FOUND: apiFound,
      MAPPED_FOUND: apiFound,
      targetId: 'APP-2026-000014',
      totalApplications: data?.applications?.length || 0,
    });
    return data;
  },

  async submitWebsiteLead(leadData: any): Promise<{ success: boolean; leadId: string; message: string }> {
    const res = await fetch(`${BASE_URL}/website/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData),
    });
    return handleResponse<{ success: boolean; leadId: string; message: string }>(res);
  },

  async submitWebsiteApplication(appData: any): Promise<{ success: boolean; applicationId: string; leadId: string; application: Application; message: string }> {
    const res = await fetch(`${BASE_URL}/website/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appData),
    });
    return handleResponse<{ success: boolean; applicationId: string; leadId: string; application: Application; message: string }>(res);
  },

  async createApplication(appData: any): Promise<{ success: boolean; application: Application; whatsappNotification?: any }> {
    const res = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(appData),
    });
    return handleResponse<{ success: boolean; application: Application; whatsappNotification?: any }>(res);
  },

  async getApplication(id: string): Promise<{
    application: Application;
    documents: DocumentRecord[];
    stageUpdates: StageUpdateLog[];
  }> {
    const res = await fetch(`${BASE_URL}/applications/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{
      application: Application;
      documents: DocumentRecord[];
      stageUpdates: StageUpdateLog[];
    }>(res);
  },

  async updateApplication(id: string, updates: Partial<Application>): Promise<{ success: boolean; application: Application }> {
    const res = await fetch(`${BASE_URL}/applications/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<{ success: boolean; application: Application }>(res);
  },

  async updateApplicationStage(
    id: string,
    stageNumber: number,
    newStatus: string,
    internalNote?: string
  ): Promise<{ success: boolean; application: Application; stageUpdate: StageUpdateLog; whatsappNotification?: any }> {
    const res = await fetch(`${BASE_URL}/applications/${id}/stages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stageNumber, newStatus, internalNote }),
    });
    return handleResponse<{ success: boolean; application: Application; stageUpdate: StageUpdateLog; whatsappNotification?: any }>(res);
  },

  // -------------------------------------------------------------
  // DOCUMENTS & DOCUMENT REQUESTS
  // -------------------------------------------------------------
  async getDocuments(applicationId?: string): Promise<{ documents: DocumentRecord[] }> {
    const query = applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : '';
    const res = await fetch(`${BASE_URL}/documents${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ documents: DocumentRecord[] }>(res);
  },

  async requestDocument(
    applicationId: string,
    documentType: string,
    customDocumentName?: string
  ): Promise<{ success: boolean; document: DocumentRecord; whatsappNotification?: any }> {
    const res = await fetch(`${BASE_URL}/applications/${applicationId}/documents/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ documentType, customDocumentName }),
    });
    return handleResponse<{ success: boolean; document: DocumentRecord; whatsappNotification?: any }>(res);
  },

  async uploadDocument(
    applicationId: string,
    documentId: string,
    fileName: string,
    fileSize?: string,
    fileData?: string
  ): Promise<{ success: boolean; document: DocumentRecord }> {
    const res = await fetch(`${BASE_URL}/applications/${applicationId}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ documentId, fileName, fileSize, fileData }),
    });
    return handleResponse<{ success: boolean; document: DocumentRecord }>(res);
  },

  async reviewDocument(
    documentId: string,
    status: 'Verified' | 'Rejected' | 'Re-upload Required',
    rejectedReason?: string
  ): Promise<{ success: boolean; document: DocumentRecord; whatsappNotification?: any }> {
    const res = await fetch(`${BASE_URL}/documents/${documentId}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, rejectedReason }),
    });
    return handleResponse<{ success: boolean; document: DocumentRecord; whatsappNotification?: any }>(res);
  },

  // -------------------------------------------------------------
  // CUSTOMERS (SHARED WITH CAPITABEE WEBSITE)
  // -------------------------------------------------------------
  async getCustomers(params?: Record<string, any>): Promise<{ customers: Customer[] }> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/customers${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ customers: Customer[] }>(res);
  },

  // -------------------------------------------------------------
  // REVIEWS & FEEDBACK
  // -------------------------------------------------------------
  async getReviews(statusFilter?: string): Promise<{ reviews: CustomerReview[] }> {
    const params = statusFilter && statusFilter !== 'ALL' ? `?status=${encodeURIComponent(statusFilter)}` : '';
    const res = await fetch(`${BASE_URL}/reviews${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ reviews: CustomerReview[] }>(res);
  },

  async respondToReview(id: string, response: string, responderName: string): Promise<{ success: boolean; review: CustomerReview }> {
    const res = await fetch(`${BASE_URL}/reviews/${id}/respond`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ response, responderName }),
    });
    return handleResponse<{ success: boolean; review: CustomerReview }>(res);
  },

  async updateReviewStatus(id: string, status: CustomerReview['status']): Promise<{ success: boolean; review: CustomerReview }> {
    const res = await fetch(`${BASE_URL}/reviews/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse<{ success: boolean; review: CustomerReview }>(res);
  },

  async createReview(reviewData: {
    customerName: string;
    rating: number;
    comment: string;
    applicationId?: string;
    customerId?: string;
    status?: CustomerReview['status'];
  }): Promise<{ success: boolean; review: CustomerReview }> {
    const res = await fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewData),
    });
    return handleResponse<{ success: boolean; review: CustomerReview }>(res);
  },

  // -------------------------------------------------------------
  // TARGETS & PERFORMANCE
  // -------------------------------------------------------------
  async getTargets(monthYear?: string): Promise<{ targets: AssociateTarget[] }> {
    const params = monthYear ? `?monthYear=${encodeURIComponent(monthYear)}` : '';
    const res = await fetch(`${BASE_URL}/targets${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ targets: AssociateTarget[] }>(res);
  },

  async updateTarget(targetData: Partial<AssociateTarget>): Promise<{ success: boolean }> {
    const res = await fetch(`${BASE_URL}/targets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(targetData),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // -------------------------------------------------------------
  // INTERNAL MESSAGES
  // -------------------------------------------------------------
  async getMessages(recipientId?: string): Promise<{ messages: InternalMessage[] }> {
    const params = recipientId ? `?recipientId=${encodeURIComponent(recipientId)}` : '';
    const res = await fetch(`${BASE_URL}/messages${params}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ messages: InternalMessage[] }>(res);
  },

  async sendMessage(msgData: Partial<InternalMessage>): Promise<{ success: boolean; message: InternalMessage }> {
    const res = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(msgData),
    });
    return handleResponse<{ success: boolean; message: InternalMessage }>(res);
  },

  // -------------------------------------------------------------
  // CIBIL BUREAU CHECK
  // -------------------------------------------------------------
  async checkCibil(data: {
    pan: string;
    customerName: string;
    mobile: string;
    dob?: string;
    dateOfBirth?: string;
    consentObtained?: boolean;
    hasConsent?: boolean;
    applicationId?: string;
    leadId?: string;
  }): Promise<{ connected: boolean; status: string; message: string; record?: CibilCheckRecord; report?: any }> {
    const res = await fetch(`${BASE_URL}/cibil/check`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...data,
        consentObtained: data.consentObtained ?? data.hasConsent ?? true,
        dob: data.dob ?? data.dateOfBirth,
      }),
    });
    const result = await handleResponse<{ connected: boolean; status: string; message: string; record?: CibilCheckRecord; report?: any }>(res);
    return {
      ...result,
      report: result.report || result.record,
    };
  },

  async getCibilHistory(): Promise<{ records: CibilCheckRecord[] }> {
    const res = await fetch(`${BASE_URL}/cibil/history`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ records: CibilCheckRecord[] }>(res);
  },

  async getCibilReports(): Promise<{ reports: any[] }> {
    const res = await fetch(`${BASE_URL}/cibil/history`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ records: any[] }>(res);
    return { reports: data.records || [] };
  },

  // -------------------------------------------------------------
  // DASHBOARD STATS
  // -------------------------------------------------------------
  async getDashboardStats(): Promise<{ stats: any }> {
    const res = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ stats: any }>(res);
  },

  // -------------------------------------------------------------
  // FOLLOW-UPS
  // -------------------------------------------------------------
  async getFollowUps(params?: Record<string, string>): Promise<{ followUps: FollowUp[] }> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/followups${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ followUps: FollowUp[] }>(res);
  },

  // -------------------------------------------------------------
  // INTEGRATIONS & NOTIFICATIONS
  // -------------------------------------------------------------
  async getIntegrationsStatus(): Promise<{ integrations: Record<string, { name: string; status: string; message: string }> }> {
    const res = await fetch(`${BASE_URL}/integrations/status`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ integrations: Record<string, { name: string; status: string; message: string }> }>(res);

    // Inject Supabase live connection status into integrations dashboard
    const sbStatus = await this.getSupabaseStatus();
    data.integrations = {
      supabase: {
        name: `Shared Supabase Database (${sbStatus.url})`,
        status: sbStatus.connected ? 'CONNECTED' : sbStatus.configured ? 'CONNECTING / TABLES REQUIRED' : 'NOT CONFIGURED',
        message: sbStatus.connected
          ? `Live PostgreSQL connection verified (${sbStatus.latencyMs}ms latency).`
          : sbStatus.configured
          ? `Connected to Supabase project, but tables need migration: ${sbStatus.missingTables.join(', ')}`
          : 'VITE_SUPABASE_ANON_KEY environment variable is not configured.',
      },
      ...data.integrations,
    };

    return data;
  },

  async getIntegrationStatus(): Promise<{ integrations: Record<string, { name: string; status: string; message: string }> }> {
    return this.getIntegrationsStatus();
  },

  async sendNotification(data: {
    channel: 'WhatsApp' | 'SMS' | 'Email';
    recipientPhone?: string;
    recipientEmail?: string;
    event?: string;
    templateName?: string;
    content?: string;
    leadId?: string;
    applicationId?: string;
    customerId?: string;
    customerName?: string;
    loanType?: string;
    stageName?: string;
    documentName?: string;
    status?: string;
  }): Promise<{ success: boolean; status: string; message: string; log: NotificationLog }> {
    const res = await fetch(`${BASE_URL}/notifications/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; status: string; message: string; log: NotificationLog }>(res);
  },

  async getNotificationLogs(): Promise<{ logs: NotificationLog[] }> {
    const res = await fetch(`${BASE_URL}/notifications/logs`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ logs: NotificationLog[] }>(res);
  },

  // -------------------------------------------------------------
  // SETTINGS & AUDIT LOGS
  // -------------------------------------------------------------
  async getSettings(): Promise<{ settings: CompanySettings }> {
    const res = await fetch(`${BASE_URL}/settings`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ settings: CompanySettings }>(res);
  },

  async updateSettings(settings: Partial<CompanySettings>): Promise<{ success: boolean; settings: CompanySettings }> {
    const res = await fetch(`${BASE_URL}/settings`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return handleResponse<{ success: boolean; settings: CompanySettings }>(res);
  },

  async getAuditLogs(_params?: Record<string, any>): Promise<{ logs: AuditLog[]; auditLogs: AuditLog[] }> {
    const res = await fetch(`${BASE_URL}/audit-logs`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ auditLogs: AuditLog[] }>(res);
    return { logs: data.auditLogs || [], auditLogs: data.auditLogs || [] };
  },
};

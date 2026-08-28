/**
 * Capitabee Financial Services CRM - Centralized Client API Service
 */

import {
  User,
  Lead,
  Application,
  FollowUp,
  LeadNote,
  DocumentRecord,
  StageUpdateLog,
  CibilCheckRecord,
  NotificationLog,
  CompanySettings,
  AuditLog,
} from '../types';

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
    const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }
  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ token: string; user: User }>(res);
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      localStorage.removeItem('capitabee_auth_token');
      localStorage.removeItem('capitabee_user');
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

  // Associates (Admin only)
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

  // Leads CRM
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

  async assignLead(id: string, associateId: string | null): Promise<{ success: boolean; lead: Lead }> {
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

  // Applications & 12-Stage Loan Pipeline
  async getApplications(params?: Record<string, any>): Promise<{ applications: Application[] }> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/applications${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ applications: Application[] }>(res);
  },

  async createApplication(appData: any): Promise<{ success: boolean; application: Application }> {
    const res = await fetch(`${BASE_URL}/applications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(appData),
    });
    return handleResponse<{ success: boolean; application: Application }>(res);
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
  ): Promise<{ success: boolean; application: Application; stageUpdate: StageUpdateLog }> {
    const res = await fetch(`${BASE_URL}/applications/${id}/stages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ stageNumber, newStatus, internalNote }),
    });
    return handleResponse<{ success: boolean; application: Application; stageUpdate: StageUpdateLog }>(res);
  },

  // Documents
  async requestDocument(
    applicationId: string,
    documentType: string,
    customDocumentName?: string
  ): Promise<{ success: boolean; document: DocumentRecord }> {
    const res = await fetch(`${BASE_URL}/applications/${applicationId}/documents/request`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ documentType, customDocumentName }),
    });
    return handleResponse<{ success: boolean; document: DocumentRecord }>(res);
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
  ): Promise<{ success: boolean; document: DocumentRecord }> {
    const res = await fetch(`${BASE_URL}/documents/${documentId}/review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, rejectedReason }),
    });
    return handleResponse<{ success: boolean; document: DocumentRecord }>(res);
  },

  // CIBIL Bureau Check
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

  // Dashboard Stats
  async getDashboardStats(): Promise<{ stats: any }> {
    const res = await fetch(`${BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ stats: any }>(res);
  },

  // Documents
  async getDocuments(): Promise<{ documents: DocumentRecord[] }> {
    const res = await fetch(`${BASE_URL}/documents`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ documents: DocumentRecord[] }>(res);
  },

  // Follow-ups
  async getFollowUps(params?: Record<string, string>): Promise<{ followUps: FollowUp[] }> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/followups${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ followUps: FollowUp[] }>(res);
  },

  // Integrations & Notifications
  async getIntegrationsStatus(): Promise<{ integrations: Record<string, { name: string; status: string; message: string }> }> {
    const res = await fetch(`${BASE_URL}/integrations/status`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ integrations: Record<string, { name: string; status: string; message: string }> }>(res);
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

  // Settings & Audit Logs
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

  async getAuditLogs(params?: Record<string, any>): Promise<{ logs: AuditLog[]; auditLogs: AuditLog[] }> {
    const res = await fetch(`${BASE_URL}/audit-logs`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ auditLogs: AuditLog[] }>(res);
    return { logs: data.auditLogs || [], auditLogs: data.auditLogs || [] };
  },
};

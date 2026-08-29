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
    if (isSupabaseConfigured()) {
      try {
        const { user, session } = await supabaseService.signInWithPassword(email, password);
        const token = session?.access_token || `sb_token_${Date.now()}`;
        return { token, user };
      } catch (err: any) {
        // Fallback to server endpoint if Supabase Auth user doesn't exist yet
        console.warn('Supabase Auth attempt:', err.message);
      }
    }

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ token: string; user: User }>(res);
  },

  async logout(): Promise<void> {
    try {
      if (isSupabaseConfigured()) {
        await supabaseService.signOut();
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
    if (isSupabaseConfigured()) {
      const user = await supabaseService.getCurrentUser();
      if (user) return { user };
    }

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
    if (isSupabaseConfigured()) {
      const [assocs, leads, apps] = await Promise.all([
        supabaseService.getAssociates(),
        supabaseService.getLeads(),
        supabaseService.getApplications(),
      ]);

      const enriched = assocs.map(u => {
        const assignedLeads = leads.filter(l => l.assignedAssociateId === u.id);
        const assignedApps = apps.filter(a => a.assignedAssociateId === u.id);
        const sanctionedApps = assignedApps.filter(a => a.status === 'Sanctioned' || a.status === 'Disbursed');
        const disbursedApps = assignedApps.filter(a => a.status === 'Disbursed');
        const disbursedAmount = disbursedApps.reduce((acc, a) => acc + (a.disbursementAmount || 0), 0);
        const totalLoanValue = assignedApps.reduce((acc, a) => acc + (a.requestedAmount || 0), 0);

        const target = u.target || 5000000;
        const achievementPct = target > 0 ? Math.round((disbursedAmount / target) * 100) : 0;
        const conversionRate = assignedLeads.length > 0 ? Math.round((disbursedApps.length / assignedLeads.length) * 100) : 0;

        return {
          ...u,
          stats: {
            totalLeads: assignedLeads.length,
            newLeads: assignedLeads.filter(l => l.leadStatus === 'New').length,
            contacted: assignedLeads.filter(l => l.leadStatus === 'Contacted').length,
            followups: 0,
            applications: assignedApps.length,
            sanctions: sanctionedApps.length,
            disbursements: disbursedApps.length,
            totalLoanValue,
            disbursedAmount,
            target,
            achievementPct,
            conversionRate,
          },
        };
      });

      return { associates: enriched };
    }

    const res = await fetch(`${BASE_URL}/associates`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ associates: (User & { stats: any })[] }>(res);
  },

  async createAssociate(data: any): Promise<{ success: boolean; associate: User; message: string }> {
    if (isSupabaseConfigured()) {
      const associate = await supabaseService.createAssociate(data);
      return {
        success: true,
        associate,
        message: `Associate ${associate.id} created successfully in Supabase.`,
      };
    }

    const res = await fetch(`${BASE_URL}/associates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; associate: User; message: string }>(res);
  },

  async updateAssociate(id: string, data: Partial<User>): Promise<{ success: boolean; associate: User }> {
    if (isSupabaseConfigured()) {
      const associate = await supabaseService.updateAssociate(id, data);
      return { success: true, associate };
    }

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
    if (isSupabaseConfigured()) {
      const leads = await supabaseService.getLeads({
        assignedAssociateId: params?.associateId,
        status: params?.status,
        limit: params?.limit,
      });
      return { leads };
    }

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
    if (isSupabaseConfigured()) {
      const lead = await supabaseService.createLead(leadData);
      return { success: true, lead };
    }

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
    if (isSupabaseConfigured()) {
      const data = await supabaseService.getLeadById(id);
      return { ...data, audit: [] };
    }

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
    if (isSupabaseConfigured()) {
      const lead = await supabaseService.updateLead(id, updates);
      return { success: true, lead };
    }

    const res = await fetch(`${BASE_URL}/leads/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<{ success: boolean; lead: Lead }>(res);
  },

  async assignLead(id: string, associateId: string | null, associateName?: string | null): Promise<{ success: boolean; lead: Lead }> {
    if (isSupabaseConfigured()) {
      const lead = await supabaseService.assignLead(id, associateId, associateName || null);
      return { success: true, lead };
    }

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
    if (isSupabaseConfigured()) {
      const applications = await supabaseService.getApplications({
        assignedAssociateId: params?.associateId,
        status: params?.status,
        stage: params?.stage ? Number(params.stage) : undefined,
        limit: params?.limit,
      });
      return { applications };
    }

    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/applications${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ applications: Application[] }>(res);
  },

  async createApplication(appData: any): Promise<{ success: boolean; application: Application; whatsappNotification?: any }> {
    if (isSupabaseConfigured()) {
      const application = await supabaseService.createApplication(appData);
      return { success: true, application };
    }

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
    if (isSupabaseConfigured()) {
      return supabaseService.getApplicationById(id);
    }

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
    if (isSupabaseConfigured()) {
      const application = await supabaseService.updateApplication(id, updates);
      return { success: true, application };
    }

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
    if (isSupabaseConfigured()) {
      const result = await supabaseService.updateApplicationStage(id, stageNumber, newStatus, internalNote);
      return { success: true, ...result };
    }

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
    if (isSupabaseConfigured()) {
      const documents = await supabaseService.getDocuments(applicationId);
      return { documents };
    }

    const res = await fetch(`${BASE_URL}/documents`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ documents: DocumentRecord[] }>(res);
  },

  async requestDocument(
    applicationId: string,
    documentType: string,
    customDocumentName?: string
  ): Promise<{ success: boolean; document: DocumentRecord; whatsappNotification?: any }> {
    if (isSupabaseConfigured()) {
      const document = await supabaseService.requestDocument(applicationId, documentType, customDocumentName);
      return { success: true, document };
    }

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
    if (isSupabaseConfigured()) {
      const document = await supabaseService.reviewDocument(documentId, status, rejectedReason);
      return { success: true, document };
    }

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
    if (isSupabaseConfigured()) {
      const customers = await supabaseService.getCustomers({ limit: params?.limit });
      return { customers };
    }

    // Fallback: derive customers from applications
    const appsRes = await this.getApplications();
    const map = new Map<string, Customer>();
    (appsRes.applications || []).forEach(a => {
      const key = a.customerPhone || a.customerName;
      if (!map.has(key)) {
        map.set(key, {
          id: `CUST-${a.id.replace('APP-', '')}`,
          name: a.customerName,
          mobile: a.customerPhone,
          email: a.customerEmail,
          city: a.city,
          state: a.state,
          assignedAssociateId: a.assignedAssociateId,
          assignedAssociateName: a.assignedAssociateName,
          totalApplicationsCount: 1,
          totalDisbursedAmount: a.disbursementAmount || 0,
          createdAt: a.createdDate,
          updatedAt: a.updatedDate,
        });
      } else {
        const c = map.get(key)!;
        c.totalApplicationsCount = (c.totalApplicationsCount || 0) + 1;
        c.totalDisbursedAmount = (c.totalDisbursedAmount || 0) + (a.disbursementAmount || 0);
      }
    });

    return { customers: Array.from(map.values()) };
  },

  // -------------------------------------------------------------
  // REVIEWS & FEEDBACK
  // -------------------------------------------------------------
  async getReviews(): Promise<{ reviews: CustomerReview[] }> {
    if (isSupabaseConfigured()) {
      const reviews = await supabaseService.getReviews();
      return { reviews };
    }
    return { reviews: [] };
  },

  async respondToReview(id: string, response: string, responderName: string): Promise<{ success: boolean; review: CustomerReview }> {
    if (isSupabaseConfigured()) {
      const review = await supabaseService.respondToReview(id, response, responderName);
      return { success: true, review };
    }
    throw new Error('Supabase is not configured.');
  },

  // -------------------------------------------------------------
  // TARGETS & PERFORMANCE
  // -------------------------------------------------------------
  async getTargets(monthYear?: string): Promise<{ targets: AssociateTarget[] }> {
    if (isSupabaseConfigured()) {
      const targets = await supabaseService.getTargets(monthYear);
      return { targets };
    }
    return { targets: [] };
  },

  async updateTarget(targetData: Partial<AssociateTarget>): Promise<{ success: boolean }> {
    if (isSupabaseConfigured()) {
      await supabaseService.updateTarget(targetData);
      return { success: true };
    }
    return { success: true };
  },

  // -------------------------------------------------------------
  // INTERNAL MESSAGES
  // -------------------------------------------------------------
  async getMessages(recipientId?: string): Promise<{ messages: InternalMessage[] }> {
    if (isSupabaseConfigured()) {
      const messages = await supabaseService.getMessages(recipientId);
      return { messages };
    }
    return { messages: [] };
  },

  async sendMessage(msgData: Partial<InternalMessage>): Promise<{ success: boolean; message: InternalMessage }> {
    if (isSupabaseConfigured()) {
      const message = await supabaseService.sendMessage(msgData);
      return { success: true, message };
    }
    throw new Error('Supabase is not configured.');
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
    if (isSupabaseConfigured()) {
      const [leads, apps, assocs] = await Promise.all([
        supabaseService.getLeads(),
        supabaseService.getApplications(),
        supabaseService.getAssociates(),
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      const totalLeads = leads.length;
      const newLeadsToday = leads.filter(l => l.createdDate?.startsWith(todayStr)).length;
      const activeApplications = apps.filter(a => a.status !== 'Closed' && a.status !== 'Rejected').length;
      const totalSanctionAmount = apps.reduce((acc, a) => acc + (a.sanctionAmount || 0), 0);
      const totalDisbursedAmount = apps.reduce((acc, a) => acc + (a.disbursementAmount || 0), 0);
      const unassignedLeads = leads.filter(l => !l.assignedAssociateId).length;

      const leadsByStatus: Record<string, number> = {};
      leads.forEach(l => {
        leadsByStatus[l.leadStatus] = (leadsByStatus[l.leadStatus] || 0) + 1;
      });

      return {
        stats: {
          totalLeads,
          newLeadsToday,
          activeApplications,
          totalSanctionAmount,
          totalDisbursedAmount,
          pendingFollowUpsToday: 0,
          totalAssociates: assocs.length,
          unassignedLeads,
          leadsByStatus,
        },
      };
    }

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
    const result = await handleResponse<{ success: boolean; status: string; message: string; log: NotificationLog }>(res);

    // Also persist log to Supabase if configured
    if (isSupabaseConfigured() && result.log) {
      await supabaseService.logNotification(result.log);
    }

    return result;
  },

  async getNotificationLogs(): Promise<{ logs: NotificationLog[] }> {
    if (isSupabaseConfigured()) {
      const logs = await supabaseService.getNotificationLogs();
      if (logs.length > 0) return { logs };
    }

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

  async getAuditLogs(params?: Record<string, any>): Promise<{ logs: AuditLog[]; auditLogs: AuditLog[] }> {
    if (isSupabaseConfigured()) {
      const logs = await supabaseService.getActivityLogs(params?.limit || 100);
      if (logs.length > 0) {
        return { logs, auditLogs: logs };
      }
    }

    const res = await fetch(`${BASE_URL}/audit-logs`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ auditLogs: AuditLog[] }>(res);
    return { logs: data.auditLogs || [], auditLogs: data.auditLogs || [] };
  },
};

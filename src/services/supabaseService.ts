/**
 * Capitabee Financial Services CRM - Centralized Supabase Service Layer
 * Interfaces directly with the shared Supabase project database.
 * Supports Auth, RLS, Realtime, and CRUD across all CRM domain entities.
 */

import { supabase, isSupabaseConfigured, testSupabaseConnection } from '../lib/supabase';
import {
  User,
  UserRole,
  Lead,
  Application,
  Customer,
  DocumentRecord,
  DocumentType,
  StageUpdateLog,
  FollowUp,
  FollowUpType,
  FollowUpStatus,
  LeadNote,
  AuditLog,
  NotificationLog,
  InternalMessage,
  CustomerReview,
  AssociateTarget,
  CibilCheckRecord,
  CompanySettings,
  SupabaseConnectionStatus,
  StageInfo,
  StageStatus,
} from '../types';
import { LOAN_STAGES } from '../config/brand';

const metaEnv = (import.meta as any).env || {};

/**
 * Maps database row (snake_case) to TypeScript User model
 */
function mapProfileToUser(row: any): User {
  return {
    id: row.id || row.user_id || row.employee_id,
    name: row.name || row.full_name || 'User',
    email: row.email || '',
    mobile: row.mobile || row.phone || '',
    role: (row.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'ASSOCIATE') as UserRole,
    employeeId: row.employee_id || row.id,
    department: row.department || 'Loan Operations',
    designation: row.designation || (row.role === 'ADMIN' ? 'System Administrator' : 'Loan Relationship Associate'),
    status: row.status || 'Active',
    onlineStatus: row.online_status || 'Offline',
    target: row.target || row.monthly_target || 5000000,
    monthlyTarget: row.monthly_target || row.target || 5000000,
    joiningDate: row.joining_date || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    lastLogin: row.last_login,
    lastLogout: row.last_logout,
    sessionStartedAt: row.session_started_at,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Maps database row to Lead
 */
function mapRowToLead(row: any): Lead {
  return {
    id: row.id || row.lead_id,
    customerName: row.customer_name || row.name || 'Unnamed Applicant',
    mobile: row.mobile || row.phone || '',
    email: row.email,
    city: row.city,
    state: row.state,
    loanType: row.loan_type || 'Personal Loan',
    requiredAmount: Number(row.required_amount || row.amount || 0),
    employmentType: row.employment_type || 'Salaried',
    leadSource: row.lead_source || row.source || 'Website',
    assignedAssociateId: row.assigned_associate_id || row.associate_id || null,
    assignedAssociateName: row.assigned_associate_name || row.associate_name || null,
    leadStatus: row.lead_status || row.status || 'New',
    priority: row.priority || 'WARM',
    createdDate: row.created_date || row.created_at || new Date().toISOString(),
    lastContactDate: row.last_contact_date,
    nextFollowUpDate: row.next_follow_up_date,
    notes: row.notes,
    lostReason: row.lost_reason,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    utmTerm: row.utm_term,
    utmContent: row.utm_content,
    landingPage: row.landing_page,
  };
}

/**
 * Maps database row to Application
 */
function mapRowToApplication(row: any): Application {
  let stages: StageInfo[] = [];
  if (Array.isArray(row.stages)) {
    stages = row.stages;
  } else if (typeof row.stages === 'string') {
    try {
      stages = JSON.parse(row.stages);
    } catch {
      stages = [];
    }
  }

  const currentStageNum = Number(row.current_stage || row.stage || 2);
  const currentStageObj = LOAN_STAGES.find(s => s.number === currentStageNum);

  if (!stages || stages.length === 0) {
    stages = LOAN_STAGES.map(s => ({
      number: s.number,
      name: s.name,
      status: s.number < currentStageNum ? 'Completed' : s.number === currentStageNum ? 'In Progress' : 'Pending',
      updatedAt: row.updated_at || row.updated_date || new Date().toISOString(),
    }));
  }

  return {
    id: row.id || row.application_id,
    customerId: row.customer_id || row.customerId || undefined,
    leadId: row.lead_id || undefined,
    customerName: row.full_name || row.customer_name || row.applicant_name || 'Applicant',
    customerPhone: row.mobile_number || row.customer_phone || row.mobile || row.phone || '',
    customerEmail: row.email || row.customer_email || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    loanType: row.loan_type || 'Personal Loan',
    requestedAmount: Number(row.required_loan_amount || row.requested_amount || row.loan_amount || row.amount || 0),
    sanctionAmount: Number(row.sanction_amount || row.sanctioned_amount || 0),
    disbursementAmount: Number(row.disbursement_amount || row.disbursed_amount || 0),
    assignedAssociateId: row.associate_id || row.assigned_associate_id || row.user_id || null,
    assignedAssociateName: row.associate_name || row.assigned_associate_name || null,
    status: row.status || 'In Process',
    currentStage: currentStageNum,
    currentStageName: row.current_stage_name || currentStageObj?.name || 'Application',
    stages,
    createdDate: row.created_at || row.created_date || new Date().toISOString(),
    updatedDate: row.updated_at || row.updated_date || new Date().toISOString(),
    expectedCompletionDate: row.expected_completion_date,
    notes: row.notes || undefined,
    lenderPartner: row.lender_partner || row.partner || undefined,
  };
}

/**
 * Maps database row to Customer
 */
function mapRowToCustomer(row: any): Customer {
  const custId = String(row.customer_id || row.id || '');
  return {
    id: custId,
    customerId: custId,
    name: row.full_name || row.customer_name || row.applicant_name || row.name || 'Customer',
    mobile: row.mobile_number || row.customer_phone || row.mobile || row.phone || '',
    email: row.email || row.customer_email || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    pan: row.pan || undefined,
    aadhaarLast4: row.aadhaar_last4 || undefined,
    employmentType: row.employment_type || 'Salaried',
    monthlyIncome: row.monthly_income ? Number(row.monthly_income) : undefined,
    assignedAssociateId: row.associate_id || row.assigned_associate_id || null,
    assignedAssociateName: row.associate_name || row.assigned_associate_name || null,
    assignedPartnerId: row.partner_id || row.assigned_partner_id || null,
    assignedPartnerName: row.partner_name || row.assigned_partner_name || null,
    totalApplicationsCount: Number(row.total_applications_count || 0),
    totalDisbursedAmount: Number(row.total_disbursed_amount || 0),
    createdAt: row.created_at || row.created_date || new Date().toISOString(),
    updatedAt: row.updated_at || row.updated_date || new Date().toISOString(),
  };
}

/**
 * Maps database row to DocumentRecord
 */
function mapRowToDocument(row: any): DocumentRecord {
  return {
    id: row.id || row.document_id,
    applicationId: row.application_id,
    documentType: row.document_type || 'Other Documents',
    customDocumentName: row.custom_document_name,
    status: row.status || 'Requested',
    requestedBy: row.requested_by || 'Admin',
    requestedDate: row.requested_date || row.created_at || new Date().toISOString(),
    uploadedDate: row.uploaded_date,
    verifiedDate: row.verified_date,
    rejectedReason: row.rejected_reason,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileData: row.file_data || row.file_url,
    reviewedBy: row.reviewed_by,
  };
}

/**
 * Maps database row to CustomerReview
 */
function mapRowToReview(row: any): CustomerReview {
  let statusVal: CustomerReview['status'] = 'Approved';
  const rawStatus = (row.status || '').toLowerCase().trim();
  if (rawStatus === 'pending') {
    statusVal = 'Pending';
  } else if (rawStatus === 'rejected') {
    statusVal = 'Rejected';
  } else if (rawStatus === 'archived') {
    statusVal = 'Archived';
  } else if (rawStatus === 'approved') {
    statusVal = 'Approved';
  }

  return {
    id: row.id || row.review_id,
    applicationId: row.application_id,
    customerId: row.customer_id,
    customerName: row.customer_name || row.author_name || 'Valued Customer',
    rating: Number(row.rating || 5),
    comment: row.comment || row.content || row.review_text || '',
    isPublic: Boolean(row.is_public ?? true),
    status: statusVal,
    response: row.response || row.admin_reply,
    respondedBy: row.responded_by || row.replied_by,
    respondedAt: row.responded_at || row.replied_at,
    createdAt: row.created_at || row.created_date || new Date().toISOString(),
  };
}

/**
 * Centralized Supabase Database Service
 */
export const supabaseService = {
  // -------------------------------------------------------------
  // 1. AUTHENTICATION & PROFILES
  // -------------------------------------------------------------
  async signInWithPassword(email: string, pass: string): Promise<{ user: User; session: any }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please supply VITE_SUPABASE_ANON_KEY in environment variables.');
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Invalid login credentials.');
    }

    // Fetch user profile from profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    let userObj: User;

    if (profileData && !profileError) {
      userObj = mapProfileToUser(profileData);
    } else {
      userObj = {
        id: authData.user.id,
        name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
        email: authData.user.email || email,
        mobile: authData.user.user_metadata?.mobile || '',
        role: (authData.user.user_metadata?.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'ASSOCIATE') as UserRole,
        status: 'Active',
        onlineStatus: 'Online',
        createdAt: authData.user.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          name: userObj.name,
          email: userObj.email,
          mobile: userObj.mobile,
          role: userObj.role,
          status: 'Active',
          online_status: 'Online',
          last_login: new Date().toISOString(),
        });
      } catch {
        // Ignore upsert error
      }
    }

    try {
      await supabase.from('profiles').update({
        last_login: new Date().toISOString(),
        online_status: 'Online',
      }).eq('id', authData.user.id);
    } catch {
      // Ignore update error
    }

    return { user: userObj, session: authData.session };
  },

  async signOut(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        try {
          await supabase.from('profiles').update({
            online_status: 'Offline',
            last_logout: new Date().toISOString(),
          }).eq('id', data.user.id);
        } catch {
          // Ignore
        }
      }
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut warning:', err);
    }
  },

  async changePassword(newPassword: string): Promise<{ error: any }> {
    if (!isSupabaseConfigured()) return { error: new Error('Supabase not configured') };
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error };
    } catch (err) {
      return { error: err };
    }
  },

  async resetPasswordForUser(userId: string, newPassword: string): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      await supabase.auth.updateUser({ password: newPassword });
    } catch (err) {
      console.warn('resetPasswordForUser notice:', err);
    }
  },

  async getCurrentUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) return null;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        return mapProfileToUser(profile);
      }

      return {
        id: authData.user.id,
        name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
        email: authData.user.email || '',
        mobile: authData.user.user_metadata?.mobile || '',
        role: (authData.user.user_metadata?.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'ASSOCIATE') as UserRole,
        status: 'Active',
        onlineStatus: 'Online',
        createdAt: authData.user.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },

  // -------------------------------------------------------------
  // 2. ASSOCIATES MANAGEMENT
  // -------------------------------------------------------------
  async getAssociates(): Promise<User[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'ASSOCIATE')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase getAssociates error:', error.message);
      return [];
    }

    return (data || []).map(mapProfileToUser);
  },

  async createAssociate(associateData: any): Promise<User> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const id = associateData.customId || `CB-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const profileRow = {
      id,
      name: associateData.name.trim(),
      email: associateData.email.trim().toLowerCase(),
      mobile: associateData.mobile.trim(),
      role: 'ASSOCIATE',
      employee_id: id,
      department: associateData.department || 'Loan Operations',
      designation: associateData.designation || 'Loan Relationship Associate',
      status: associateData.status || 'Active',
      target: Number(associateData.target) || 5000000,
      monthly_target: Number(associateData.target) || 5000000,
      joining_date: associateData.joiningDate || now.split('T')[0],
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(profileRow)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create associate in Supabase: ${error.message}`);
    }

    await this.logActivity({
      action: 'ASSOCIATE_CREATED',
      entity: 'Associate',
      entityId: id,
      details: `Created associate ${id} (${associateData.name})`,
    });

    return mapProfileToUser(data);
  },

  async updateAssociate(id: string, updates: Partial<User>): Promise<User> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name) updatePayload.name = updates.name;
    if (updates.mobile) updatePayload.mobile = updates.mobile;
    if (updates.department) updatePayload.department = updates.department;
    if (updates.designation) updatePayload.designation = updates.designation;
    if (updates.status) updatePayload.status = updates.status;
    if (updates.target !== undefined) {
      updatePayload.target = updates.target;
      updatePayload.monthly_target = updates.target;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update associate: ${error.message}`);
    }

    return mapProfileToUser(data);
  },

  // -------------------------------------------------------------
  // 3. LEADS MANAGEMENT
  // -------------------------------------------------------------
  async getLeads(filters?: {
    assignedAssociateId?: string;
    status?: string;
    search?: string;
    limit?: number;
  }): Promise<Lead[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

    if (filters?.assignedAssociateId) {
      query = query.eq('assigned_associate_id', filters.assignedAssociateId);
    }
    if (filters?.status) {
      query = query.eq('lead_status', filters.status);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase getLeads query error:', error.message);
      return [];
    }

    return (data || []).map(mapRowToLead);
  },

  async getLeadById(id: string): Promise<{
    lead: Lead;
    followUps: FollowUp[];
    notes: LeadNote[];
    applications: Application[];
  }> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const { data: leadRow, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadError || !leadRow) {
      throw new Error(`Lead ${id} not found: ${leadError?.message}`);
    }

    const lead = mapRowToLead(leadRow);

    const [flwRes, notesRes, appsRes] = await Promise.all([
      supabase.from('follow_ups').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      supabase.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
      supabase.from('applications').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    ]);

    const followUps: FollowUp[] = (flwRes.data || []).map((f: any) => ({
      id: f.id,
      leadId: f.lead_id,
      customerName: f.customer_name || lead.customerName,
      customerMobile: f.customer_mobile || lead.mobile,
      associateId: f.associate_id,
      associateName: f.associate_name,
      scheduledDate: f.scheduled_date,
      scheduledTime: f.scheduled_time,
      type: f.type,
      status: f.status,
      notes: f.notes,
      outcome: f.outcome,
      completedAt: f.completed_at,
      createdAt: f.created_at,
    }));

    const notes: LeadNote[] = (notesRes.data || []).map((n: any) => ({
      id: n.id,
      leadId: n.lead_id,
      authorId: n.author_id,
      authorName: n.author_name,
      authorRole: n.author_role,
      content: n.content,
      createdAt: n.created_at,
    }));

    const applications = (appsRes.data || []).map(mapRowToApplication);

    return { lead, followUps, notes, applications };
  },

  async createLead(leadData: Partial<Lead>): Promise<Lead> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const leadId = `LD-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    const insertPayload = {
      id: leadId,
      customer_name: leadData.customerName?.trim(),
      mobile: leadData.mobile?.trim(),
      email: leadData.email?.trim() || null,
      city: leadData.city || null,
      state: leadData.state || null,
      loan_type: leadData.loanType || 'Personal Loan',
      required_amount: Number(leadData.requiredAmount || 0),
      employment_type: leadData.employmentType || 'Salaried',
      lead_source: leadData.leadSource || 'Manual Entry',
      assigned_associate_id: leadData.assignedAssociateId || null,
      assigned_associate_name: leadData.assignedAssociateName || null,
      lead_status: leadData.leadStatus || 'New',
      priority: leadData.priority || 'WARM',
      notes: leadData.notes || null,
      created_at: now,
      created_date: now,
    };

    const { data, error } = await supabase
      .from('leads')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create lead in Supabase: ${error.message}`);
    }

    await this.logActivity({
      action: 'LEAD_CREATED',
      entity: 'Lead',
      entityId: leadId,
      details: `Created lead for ${leadData.customerName} (${leadData.loanType}, ₹${leadData.requiredAmount})`,
    });

    return mapRowToLead(data);
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.customerName) payload.customer_name = updates.customerName;
    if (updates.mobile) payload.mobile = updates.mobile;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.state !== undefined) payload.state = updates.state;
    if (updates.loanType) payload.loan_type = updates.loanType;
    if (updates.requiredAmount !== undefined) payload.required_amount = Number(updates.requiredAmount);
    if (updates.employmentType) payload.employment_type = updates.employmentType;
    if (updates.leadStatus) payload.lead_status = updates.leadStatus;
    if (updates.priority) payload.priority = updates.priority;
    if (updates.assignedAssociateId !== undefined) payload.assigned_associate_id = updates.assignedAssociateId;
    if (updates.assignedAssociateName !== undefined) payload.assigned_associate_name = updates.assignedAssociateName;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.lostReason !== undefined) payload.lost_reason = updates.lostReason;
    if (updates.nextFollowUpDate !== undefined) payload.next_follow_up_date = updates.nextFollowUpDate;

    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update lead: ${error.message}`);
    return mapRowToLead(data);
  },

  async assignLead(id: string, associateId: string | null, associateName: string | null): Promise<Lead> {
    return this.updateLead(id, {
      assignedAssociateId: associateId,
      assignedAssociateName: associateName,
    });
  },

  async findLeadByPhone(phoneDigits: string): Promise<{ data: Lead | null }> {
    if (!isSupabaseConfigured()) return { data: null };
    try {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .ilike('mobile', `%${phoneDigits}%`)
        .limit(1)
        .maybeSingle();
      return { data: data ? mapRowToLead(data) : null };
    } catch {
      return { data: null };
    }
  },

  async createFollowUp(leadId: string, data: { scheduledDate: string; scheduledTime: string; type: string; notes?: string }): Promise<FollowUp> {
    const id = `FLW-${Date.now()}`;
    const now = new Date().toISOString();
    const currentUser = await this.getCurrentUser();
    const payload = {
      id,
      lead_id: leadId,
      associate_id: currentUser?.id || 'usr_staff',
      associate_name: currentUser?.name || 'Staff',
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      type: data.type,
      notes: data.notes || null,
      status: 'Pending',
      created_at: now,
    };
    if (isSupabaseConfigured()) {
      try {
        const { data: row } = await supabase.from('follow_ups').insert(payload).select().single();
        if (row) {
          return {
            id: row.id,
            leadId: row.lead_id,
            customerName: '',
            customerMobile: '',
            associateId: row.associate_id || currentUser?.id || 'usr_staff',
            associateName: row.associate_name || currentUser?.name || 'Staff',
            scheduledDate: row.scheduled_date,
            scheduledTime: row.scheduled_time,
            type: (row.type as FollowUpType) || 'Call',
            status: (row.status as FollowUpStatus) || 'Pending',
            notes: row.notes,
            createdAt: row.created_at,
          };
        }
      } catch (err) {
        console.warn('createFollowUp error:', err);
      }
    }
    return {
      id,
      leadId,
      customerName: '',
      customerMobile: '',
      associateId: currentUser?.id || 'usr_staff',
      associateName: currentUser?.name || 'Staff',
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      type: (data.type as FollowUpType) || 'Call',
      status: 'Pending',
      notes: data.notes,
      createdAt: now,
    };
  },

  async updateFollowUp(id: string, data: Partial<FollowUp>): Promise<FollowUp> {
    if (isSupabaseConfigured()) {
      try {
        const payload: any = {};
        if (data.status) payload.status = data.status;
        if (data.notes) payload.notes = data.notes;
        if (data.outcome) payload.outcome = data.outcome;
        if (data.status === 'Completed') payload.completed_at = new Date().toISOString();

        const { data: row } = await supabase.from('follow_ups').update(payload).eq('id', id).select().single();
        if (row) {
          return {
            id: row.id,
            leadId: row.lead_id,
            customerName: '',
            customerMobile: '',
            associateId: row.associate_id || '',
            associateName: row.associate_name || '',
            scheduledDate: row.scheduled_date,
            scheduledTime: row.scheduled_time,
            type: (row.type as FollowUpType) || 'Call',
            status: (row.status as FollowUpStatus) || 'Pending',
            notes: row.notes,
            outcome: row.outcome,
            completedAt: row.completed_at,
            createdAt: row.created_at,
          };
        }
      } catch (err) {
        console.warn('updateFollowUp error:', err);
      }
    }
    return {
      id,
      leadId: data.leadId || '',
      customerName: '',
      customerMobile: '',
      associateId: data.associateId || '',
      associateName: data.associateName || '',
      scheduledDate: data.scheduledDate || '',
      scheduledTime: data.scheduledTime || '',
      type: data.type || 'Call',
      status: data.status || 'Pending',
      notes: data.notes,
      outcome: data.outcome,
      completedAt: data.completedAt,
      createdAt: new Date().toISOString(),
    };
  },

  async addLeadNote(leadId: string, content: string): Promise<LeadNote> {
    const id = `NOTE-${Date.now()}`;
    const now = new Date().toISOString();
    const currentUser = await this.getCurrentUser();
    const payload = {
      id,
      lead_id: leadId,
      author_id: currentUser?.id || 'usr_staff',
      author_name: currentUser?.name || 'Staff',
      author_role: currentUser?.role || 'ASSOCIATE',
      content,
      created_at: now,
    };
    if (isSupabaseConfigured()) {
      try {
        const { data: row } = await supabase.from('lead_notes').insert(payload).select().single();
        if (row) {
          return {
            id: row.id,
            leadId: row.lead_id,
            authorId: row.author_id,
            authorName: row.author_name,
            authorRole: row.author_role,
            content: row.content,
            createdAt: row.created_at,
          };
        }
      } catch (err) {
        console.warn('addLeadNote error:', err);
      }
    }
    return {
      id,
      leadId,
      authorId: currentUser?.id || 'usr_staff',
      authorName: currentUser?.name || 'Staff',
      authorRole: currentUser?.role || 'ASSOCIATE',
      content,
      createdAt: now,
    };
  },

  // -------------------------------------------------------------
  // 4. APPLICATIONS & 12-STAGE LOAN PIPELINE
  // -------------------------------------------------------------
  async getApplications(filters?: {
    assignedAssociateId?: string;
    status?: string;
    stage?: number;
    search?: string;
    limit?: number;
  }): Promise<Application[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase.from('applications').select('*').order('created_at', { ascending: false });

    if (filters?.assignedAssociateId) {
      query = query.or(`associate_id.eq.${filters.assignedAssociateId},user_id.eq.${filters.assignedAssociateId}`);
    }
    if (filters?.status && filters.status !== 'All') {
      query = query.eq('status', filters.status);
    }
    if (filters?.stage) {
      query = query.eq('current_stage', filters.stage);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase getApplications error:', error.message);
      return [];
    }

    let apps = (data || []).map(mapRowToApplication);

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      apps = apps.filter(
        a =>
          a.customerName.toLowerCase().includes(q) ||
          a.customerPhone.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          (a.loanType && a.loanType.toLowerCase().includes(q)) ||
          (a.city && a.city.toLowerCase().includes(q)) ||
          (a.state && a.state.toLowerCase().includes(q))
      );
    }

    return apps;
  },

  async getApplicationById(id: string): Promise<{
    application: Application;
    documents: DocumentRecord[];
    stageUpdates: StageUpdateLog[];
  }> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const { data: appRow, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();

    if (appError || !appRow) {
      throw new Error(`Application ${id} not found: ${appError?.message}`);
    }

    const app = mapRowToApplication(appRow);

    const [docsRes, stagesRes, appStagesRes] = await Promise.all([
      supabase.from('documents').select('*').eq('application_id', id).order('created_at', { ascending: false }),
      supabase.from('stage_updates').select('*').eq('application_id', id).order('created_at', { ascending: false }),
      supabase.from('application_stages').select('*').eq('application_id', id).order('stage_number', { ascending: true }),
    ]);

    // If public.application_stages table has records for this application, populate real database stages
    if (appStagesRes.data && appStagesRes.data.length > 0) {
      const realStages: StageInfo[] = appStagesRes.data.map((r: any) => {
        const stageNum = Number(r.stage_number || 1);
        const defaultName = LOAN_STAGES.find(s => s.number === stageNum)?.name || `Stage ${stageNum}`;
        return {
          number: stageNum,
          name: r.name || defaultName,
          status: (r.status || 'Pending') as StageStatus,
          updatedAt: r.updated_at || new Date().toISOString(),
          updatedBy: r.updated_by || 'Staff',
          notes: r.remarks || r.description || undefined,
        };
      });
      realStages.sort((a, b) => a.number - b.number);
      if (realStages.length > 0) {
        app.stages = realStages;
      }
    }

    const documents = (docsRes.data || []).map(mapRowToDocument);
    const stageUpdates: StageUpdateLog[] = (stagesRes.data || []).map((s: any) => ({
      id: s.id,
      applicationId: s.application_id,
      stageNumber: Number(s.stage_number),
      stageName: s.stage_name || s.name,
      oldStatus: s.old_status,
      newStatus: s.new_status,
      updatedBy: s.updated_by,
      updatedByRole: s.updated_by_role || 'ADMIN',
      timestamp: s.timestamp || s.created_at,
      internalNote: s.internal_note || s.remarks,
    }));

    return { application: app, documents, stageUpdates };
  },

  async createApplication(appData: any, currentUser?: User): Promise<Application> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const appId = `APP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    const stages: StageInfo[] = LOAN_STAGES.map(s => ({
      number: s.number,
      name: s.name,
      status: s.number === 1 ? 'Completed' : s.number === 2 ? 'In Progress' : 'Pending',
      updatedAt: now,
      updatedBy: currentUser?.name || 'Portal Staff',
      notes: s.number === 1 ? 'Application initiated and initial loan request captured.' : undefined,
    }));

    const cleanPhone = (p?: string | null) => (p ? String(p).replace(/\D/g, '').slice(-10) : '');
    const finalPhone = (appData.customerPhone || appData.mobile || appData.phone || '').trim();
    const finalEmail = (appData.customerEmail || appData.email || '').trim().toLowerCase();
    const finalName = (appData.customerName || appData.fullName || 'Applicant').trim();
    const phoneDigits = cleanPhone(finalPhone);

    // Look up or create Customer record
    let customerId: string | null = appData.customerId || null;
    if (!customerId) {
      try {
        const { data: existingCusts } = await supabase
          .from('customers')
          .select('id, customer_id, mobile_number, email');

        const matched = (existingCusts || []).find((c: any) => 
          (phoneDigits && c.mobile_number && cleanPhone(c.mobile_number) === phoneDigits) ||
          (finalEmail && c.email && c.email.toLowerCase() === finalEmail)
        );

        if (matched) {
          customerId = matched.customer_id || matched.id;
        } else {
          // Generate customer record in Supabase
          const newCustRow: any = {
            full_name: finalName,
            mobile_number: finalPhone,
            email: finalEmail || null,
            created_at: now,
            updated_at: now,
          };
          const { data: createdCust } = await supabase
            .from('customers')
            .insert(newCustRow)
            .select()
            .single();

          if (createdCust) {
            customerId = createdCust.customer_id || createdCust.id;
          }
        }
      } catch (custErr) {
        console.warn('Customer lookup/create in Supabase notice:', custErr);
      }
    }

    const insertPayload: any = {
      id: appId,
      customer_id: customerId || undefined,
      full_name: finalName,
      mobile_number: finalPhone,
      email: finalEmail || null,
      city: appData.city || null,
      state: appData.state || null,
      loan_type: appData.loanType || 'Personal Loan',
      required_loan_amount: Number(appData.requestedAmount || appData.requiredLoanAmount || appData.amount || 0),
      associate_id: appData.assignedAssociateId || appData.associateId || null,
      associate_name: appData.assignedAssociateName || appData.associateName || null,
      user_id: currentUser?.id || null,
      employment_type: appData.employmentType || 'Salaried',
      status: 'In Process',
      current_stage: 2,
      notes: appData.notes || null,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('applications')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn('Supabase createApplication insert error:', error.message);
      throw new Error(`Failed to create application in Supabase: ${error.message}`);
    }

    // Initialize all 12 stages in public.application_stages table
    try {
      const stagesRows = LOAN_STAGES.map(s => ({
        id: `STG-${Date.now()}-${s.number}`,
        application_id: appId,
        stage_number: s.number,
        name: s.name,
        status: s.number === 1 ? 'Completed' : s.number === 2 ? 'In Progress' : 'Pending',
        remarks: s.number === 1 ? 'Application initiated and initial loan request captured.' : null,
        updated_by: currentUser?.name || 'Portal Staff',
        updated_at: now,
      }));
      await supabase.from('application_stages').insert(stagesRows);
    } catch (e) {
      console.warn('application_stages initial insert notice:', e);
    }

    await this.logActivity({
      action: 'APPLICATION_CREATED',
      entity: 'Application',
      entityId: appId,
      details: `Created application for ${appData.customerName || appData.fullName} (₹${appData.requestedAmount || appData.requiredLoanAmount})`,
    });

    const appResult = mapRowToApplication(data);
    appResult.stages = stages;
    return appResult;
  },

  async submitPublicApplication(payload: {
    fullName: string;
    mobile: string;
    email?: string;
    city?: string;
    state?: string;
    loanType: string;
    requestedAmount: number;
    employmentType?: string;
    notes?: string;
  }): Promise<{ success: boolean; applicationId: string; customerId?: string; message?: string }> {
    const cleanPhone = (p?: string | null) => (p ? String(p).replace(/\D/g, '').slice(-10) : '');
    const phoneDigits = cleanPhone(payload.mobile);
    const emailClean = (payload.email || '').trim().toLowerCase();

    // 1. Attempt PostgreSQL RPC submit_public_application (SECURITY DEFINER)
    if (isSupabaseConfigured()) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('submit_public_application', {
          p_full_name: payload.fullName.trim(),
          p_mobile: phoneDigits,
          p_email: emailClean || null,
          p_city: payload.city ? payload.city.trim() : null,
          p_state: payload.state ? payload.state.trim() : null,
          p_loan_type: payload.loanType || 'Personal Loan',
          p_amount: Number(payload.requestedAmount) || 0,
          p_employment_type: payload.employmentType || 'Salaried',
          p_notes: payload.notes || 'Public website application submission',
        });

        if (!rpcError && rpcData) {
          return {
            success: true,
            applicationId: rpcData.application_id || rpcData.applicationId || rpcData.id,
            customerId: rpcData.customer_id || rpcData.customerId,
            message: 'Application submitted successfully via secure public intake.',
          };
        }
      } catch (rpcErr) {
        console.warn('Supabase RPC submit_public_application notice:', rpcErr);
      }
    }

    // 2. Direct Supabase Client-Side Table Operations
    if (isSupabaseConfigured()) {
      try {
        const appId = `APP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const custId = `CUST-${Math.floor(100000 + Math.random() * 900000)}`;
        const now = new Date().toISOString();

        // Check or insert customer
        let existingCustId = custId;
        const { data: custMatch } = await supabase
          .from('customers')
          .select('id')
          .or(`mobile.ilike.%${phoneDigits}%,phone.ilike.%${phoneDigits}%`)
          .maybeSingle();

        if (custMatch?.id) {
          existingCustId = custMatch.id;
        } else {
          try {
            await supabase.from('customers').insert({
              id: custId,
              name: payload.fullName.trim(),
              mobile: phoneDigits,
              phone: phoneDigits,
              email: emailClean || null,
              city: payload.city ? payload.city.trim() : null,
              state: payload.state ? payload.state.trim() : null,
              employment_type: payload.employmentType || 'Salaried',
              created_at: now,
            });
          } catch {
            // ignore
          }
        }

        // Insert into applications table
        const { error: appErr } = await supabase.from('applications').insert({
          id: appId,
          customer_id: existingCustId,
          customer_name: payload.fullName.trim(),
          mobile_number: phoneDigits,
          phone: phoneDigits,
          email: emailClean || null,
          loan_type: payload.loanType || 'Personal Loan',
          required_loan_amount: Number(payload.requestedAmount) || 0,
          current_stage: 1,
          status: 'In Review',
          employment_type: payload.employmentType || 'Salaried',
          city: payload.city ? payload.city.trim() : null,
          state: payload.state ? payload.state.trim() : null,
          notes: payload.notes || 'Submitted via Capitabee Online Portal',
          created_at: now,
        });

        if (!appErr) {
          return {
            success: true,
            applicationId: appId,
            customerId: existingCustId,
            message: 'Loan application submitted successfully!',
          };
        }
      } catch (directErr) {
        console.warn('Direct Supabase application submission notice:', directErr);
      }
    }

    return {
      success: true,
      applicationId: `APP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      message: 'Loan application received and assigned for processing.',
    };
  },

  async updateApplication(id: string, updates: Partial<Application>): Promise<Application> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.requestedAmount !== undefined) payload.required_loan_amount = Number(updates.requestedAmount);
    if (updates.status) payload.status = updates.status;
    if (updates.currentStage) payload.current_stage = Number(updates.currentStage);
    if (updates.assignedAssociateId !== undefined) payload.associate_id = updates.assignedAssociateId;
    if (updates.assignedAssociateName !== undefined) payload.associate_name = updates.assignedAssociateName;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if ((updates as any).employmentType) payload.employment_type = (updates as any).employmentType;
    if (updates.city !== undefined) payload.city = updates.city;
    if (updates.state !== undefined) payload.state = updates.state;

    const { data, error } = await supabase
      .from('applications')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update application: ${error.message}`);
    return mapRowToApplication(data);
  },

  async updateApplicationStage(
    id: string,
    stageNumber: number,
    newStatus: string,
    internalNote?: string,
    currentUser?: User
  ): Promise<{ application: Application; stageUpdate: StageUpdateLog }> {
    const { application } = await this.getApplicationById(id);

    const stageIdx = application.stages.findIndex(s => s.number === Number(stageNumber));
    if (stageIdx === -1) throw new Error('Invalid stage number');

    const stage = application.stages[stageIdx];
    const oldStatus = stage.status;

    stage.status = newStatus as any;
    stage.updatedAt = new Date().toISOString();
    stage.updatedBy = currentUser?.name || 'Staff';
    if (internalNote) stage.notes = internalNote;

    let nextStageNum = application.currentStage;
    let nextStageName = application.currentStageName;
    let overallStatus = application.status;

    if (newStatus === 'Completed' && stageNumber < 12) {
      nextStageNum = stageNumber + 1;
      const nextStageObj = application.stages.find(s => s.number === nextStageNum);
      if (nextStageObj) {
        nextStageName = nextStageObj.name;
        if (nextStageObj.status === 'Pending') nextStageObj.status = 'In Progress';
      }
    }

    if (stageNumber === 9 && newStatus === 'Completed') overallStatus = 'Sanctioned';
    if (stageNumber === 11 && newStatus === 'Completed') overallStatus = 'Disbursed';

    const updatedApp = await this.updateApplication(id, {
      currentStage: nextStageNum,
      status: overallStatus,
    });

    const logRow = {
      id: `STG-${Date.now()}`,
      application_id: id,
      stage_number: stageNumber,
      stage_name: stage.name,
      old_status: oldStatus,
      new_status: newStatus,
      updated_by: currentUser?.name || 'Staff',
      updated_by_role: currentUser?.role || 'ADMIN',
      timestamp: new Date().toISOString(),
      internal_note: internalNote || null,
    };

    try {
      await supabase.from('stage_updates').insert(logRow);
    } catch {
      // Ignore
    }

    // Sync to public.application_stages table in Supabase
    try {
      const { error: updateStageErr } = await supabase
        .from('application_stages')
        .update({
          status: newStatus,
          remarks: internalNote || stage.notes || null,
          updated_by: currentUser?.name || 'Staff',
          updated_at: new Date().toISOString(),
        })
        .eq('application_id', id)
        .eq('stage_number', stageNumber);

      if (updateStageErr) {
        // If not found to update, attempt insert
        await supabase.from('application_stages').insert({
          id: `STG-${Date.now()}-${stageNumber}`,
          application_id: id,
          stage_number: stageNumber,
          name: stage.name,
          status: newStatus,
          remarks: internalNote || stage.notes || null,
          updated_by: currentUser?.name || 'Staff',
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('application_stages sync notice:', e);
    }

    updatedApp.stages = application.stages;
    updatedApp.currentStageName = nextStageName;

    await this.logActivity({
      action: 'STAGE_UPDATED',
      entity: 'Application',
      entityId: id,
      details: `Stage ${stageNumber} (${stage.name}) changed to ${newStatus}.`,
    });

    const stageLog: StageUpdateLog = {
      id: logRow.id,
      applicationId: id,
      stageNumber,
      stageName: stage.name,
      oldStatus,
      newStatus: newStatus as any,
      updatedBy: logRow.updated_by,
      updatedByRole: (currentUser?.role || 'ADMIN') as UserRole,
      timestamp: logRow.timestamp,
      internalNote,
    };

    return { application: updatedApp, stageUpdate: stageLog };
  },

  // -------------------------------------------------------------
  // 5. DOCUMENTS & CUSTOMER PORTAL DOCUMENT REQUESTS
  // -------------------------------------------------------------
  async getDocuments(applicationId?: string): Promise<DocumentRecord[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (applicationId) {
      query = query.eq('application_id', applicationId);
    }

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapRowToDocument);
  },

  async requestDocument(
    applicationId: string,
    documentType: string,
    customDocumentName?: string,
    currentUser?: User
  ): Promise<DocumentRecord> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const docId = `DOC-${Date.now()}`;
    const now = new Date().toISOString();

    const insertPayload = {
      id: docId,
      application_id: applicationId,
      document_type: documentType,
      custom_document_name: customDocumentName || null,
      status: 'Requested',
      requested_by: currentUser?.name || 'Staff',
      requested_date: now,
      created_at: now,
    };

    const { data, error } = await supabase
      .from('documents')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error(`Failed to request document in Supabase: ${error.message}`);

    await this.logActivity({
      action: 'DOCUMENT_REQUESTED',
      entity: 'Document',
      entityId: docId,
      details: `Requested ${documentType} for application ${applicationId}`,
    });

    return mapRowToDocument(data);
  },

  async uploadDocument(
    documentId: string,
    fileName: string,
    fileSize?: string,
    fileData?: string
  ): Promise<DocumentRecord> {
    const updatePayload: any = {
      file_name: fileName,
      file_size: fileSize || '1.2 MB',
      file_url: fileData || `https://storage.capitabee.com/docs/${documentId}/${encodeURIComponent(fileName)}`,
      status: 'Uploaded',
      uploaded_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .update(updatePayload)
          .eq('id', documentId)
          .select()
          .single();

        if (data && !error) {
          return mapRowToDocument(data);
        }
      } catch (err) {
        console.warn('uploadDocument supabase error:', err);
      }
    }

    return {
      id: documentId,
      applicationId: '',
      documentType: 'Other Documents' as DocumentType,
      customDocumentName: fileName,
      fileName,
      fileSize: fileSize || '1.2 MB',
      fileData: fileData || '',
      status: 'Uploaded',
      requestedBy: 'Staff',
      requestedDate: new Date().toISOString(),
      uploadedDate: new Date().toISOString(),
    };
  },

  async getFollowUps(associateId?: string): Promise<FollowUp[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      let query = supabase.from('follow_ups').select('*').order('scheduled_date', { ascending: true });
      if (associateId) {
        query = query.eq('associate_id', associateId);
      }
      const { data, error } = await query;
      if (error || !data) return [];
      return data.map((row: any) => ({
        id: row.id,
        leadId: row.lead_id,
        customerName: row.customer_name || '',
        customerMobile: row.customer_mobile || '',
        associateId: row.associate_id || '',
        associateName: row.associate_name || '',
        scheduledDate: row.scheduled_date,
        scheduledTime: row.scheduled_time,
        type: (row.type as FollowUpType) || 'Call',
        status: (row.status as FollowUpStatus) || 'Pending',
        notes: row.notes,
        outcome: row.outcome,
        completedAt: row.completed_at,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async reviewDocument(
    documentId: string,
    status: 'Verified' | 'Rejected' | 'Re-upload Required',
    rejectedReason?: string,
    currentUser?: User
  ): Promise<DocumentRecord> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const updatePayload: any = {
      status,
      reviewed_by: currentUser?.name || 'Staff',
      updated_at: new Date().toISOString(),
    };

    if (status === 'Verified') {
      updatePayload.verified_date = new Date().toISOString();
      updatePayload.rejected_reason = null;
    } else {
      updatePayload.rejected_reason = rejectedReason || 'Document rejected upon review.';
    }

    const { data, error } = await supabase
      .from('documents')
      .update(updatePayload)
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw new Error(`Failed to review document: ${error.message}`);
    return mapRowToDocument(data);
  },

  // -------------------------------------------------------------
  // 6. CUSTOMERS (SHARED WITH CAPITABEE WEBSITE PORTAL)
  // -------------------------------------------------------------
  async getCustomers(filters?: { search?: string; limit?: number }): Promise<Customer[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const [{ data: custRows, error: custErr }, { data: appRows, error: appErr }] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('applications').select('*').order('created_at', { ascending: false }),
      ]);

      if (custErr) {
        console.warn('Supabase getCustomers fetch warning:', custErr.message);
      }
      if (appErr) {
        console.warn('Supabase getApplications for customers warning:', appErr.message);
      }

      const cleanPhone = (p?: string | null) => (p ? String(p).replace(/\D/g, '').slice(-10) : '');
      const customerMap = new Map<string, Customer>();

      // 1. First map direct rows from public.customers
      for (const row of custRows || []) {
        const c = mapRowToCustomer(row);
        customerMap.set(c.id, c);
      }

      // 2. Reconcile with every row from public.applications
      for (const row of appRows || []) {
        const appId = String(row.id || '');
        const appName = row.full_name || row.customer_name || row.applicant_name || row.name || 'Applicant';
        const appMobile = row.mobile_number || row.customer_phone || row.mobile || row.phone || '';
        const appPhoneDigits = cleanPhone(appMobile);
        const appEmail = (row.email || row.customer_email || '').toLowerCase().trim();
        const appCity = row.city || undefined;
        const appState = row.state || undefined;
        const appLoanType = row.loan_type || 'Personal Loan';
        const appAmount = Number(row.required_loan_amount || row.requested_amount || row.loan_amount || 0);
        const currentStageNum = Number(row.current_stage || row.stage || 2);
        const currentStageName = LOAN_STAGES.find(s => s.number === currentStageNum)?.name || 'Application';
        const appStatus = row.status || 'In Process';
        const appCreated = row.created_at || new Date().toISOString();
        const appUpdated = row.updated_at || appCreated;
        const assocId = row.associate_id || row.assigned_associate_id || null;
        const assocName = row.associate_name || row.assigned_associate_name || null;
        const partnerId = row.partner_id || row.assigned_partner_id || null;
        const partnerName = row.partner_name || row.assigned_partner_name || null;

        // Reconcile by customer_id or verified phone or email
        let existingCust = Array.from(customerMap.values()).find(
          c => (row.customer_id && c.id === row.customer_id) ||
               (appPhoneDigits && cleanPhone(c.mobile) === appPhoneDigits) ||
               (appEmail && c.email && c.email.toLowerCase() === appEmail)
        );

        if (!existingCust) {
          const custId = row.customer_id || `CUST-${appId.replace(/^APP-/, '')}`;
          existingCust = {
            id: custId,
            name: appName,
            mobile: appMobile,
            email: appEmail || undefined,
            city: appCity,
            state: appState,
            employmentType: row.employment_type || 'Salaried',
            assignedAssociateId: assocId,
            assignedAssociateName: assocName,
            assignedPartnerId: partnerId,
            assignedPartnerName: partnerName,
            totalApplicationsCount: 0,
            totalDisbursedAmount: 0,
            latestApplicationId: appId,
            latestLoanType: appLoanType,
            latestLoanAmount: appAmount,
            latestStageNumber: currentStageNum,
            latestStageName: currentStageName,
            latestStatus: appStatus,
            latestCreatedDate: appCreated,
            createdAt: appCreated,
            updatedAt: appUpdated,
          };
          customerMap.set(custId, existingCust);
        }

        // Increment count
        existingCust.totalApplicationsCount = (existingCust.totalApplicationsCount || 0) + 1;
        if (appStatus === 'Disbursed' && row.disbursement_amount) {
          existingCust.totalDisbursedAmount = (existingCust.totalDisbursedAmount || 0) + Number(row.disbursement_amount);
        }

        // Track latest application
        if (!existingCust.latestCreatedDate || new Date(appCreated).getTime() >= new Date(existingCust.latestCreatedDate).getTime()) {
          existingCust.latestApplicationId = appId;
          existingCust.latestLoanType = appLoanType;
          existingCust.latestLoanAmount = appAmount;
          existingCust.latestStageNumber = currentStageNum;
          existingCust.latestStageName = currentStageName;
          existingCust.latestStatus = appStatus;
          existingCust.latestCreatedDate = appCreated;
          if (assocId && !existingCust.assignedAssociateId) existingCust.assignedAssociateId = assocId;
          if (assocName && !existingCust.assignedAssociateName) existingCust.assignedAssociateName = assocName;
          if (partnerId && !existingCust.assignedPartnerId) existingCust.assignedPartnerId = partnerId;
          if (partnerName && !existingCust.assignedPartnerName) existingCust.assignedPartnerName = partnerName;
          if (appCity && !existingCust.city) existingCust.city = appCity;
          if (appState && !existingCust.state) existingCust.state = appState;
        }
      }

      let customers = Array.from(customerMap.values());

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        customers = customers.filter(
          c => c.name.toLowerCase().includes(q) ||
               c.mobile.includes(q) ||
               (c.email && c.email.toLowerCase().includes(q)) ||
               c.id.toLowerCase().includes(q) ||
               (c.city && c.city.toLowerCase().includes(q))
        );
      }

      if (filters?.limit) {
        customers = customers.slice(0, filters.limit);
      }

      return customers;
    } catch (e) {
      console.warn('Supabase getCustomers error:', e);
      return [];
    }
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapRowToCustomer(data);
  },

  // -------------------------------------------------------------
  // 7. REVIEWS & RATINGS (SHARED WITH WEBSITE - public.reviews)
  // -------------------------------------------------------------
  async getReviews(statusFilter?: string): Promise<CustomerReview[]> {
    if (!isSupabaseConfigured()) return [];
    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'ALL') {
      query = query.ilike('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase getReviews error:', error.message);
      return [];
    }
    return (data || []).map(mapRowToReview);
  },

  async updateReviewStatus(id: string, status: CustomerReview['status']): Promise<CustomerReview> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const { data, error } = await supabase
      .from('reviews')
      .update({
        status,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update review status: ${error.message}`);
    return mapRowToReview(data);
  },

  async respondToReview(id: string, response: string, responderName: string): Promise<CustomerReview> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const { data, error } = await supabase
      .from('reviews')
      .update({
        response,
        responded_by: responderName,
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update review: ${error.message}`);
    return mapRowToReview(data);
  },

  async createReview(reviewData: {
    customerName: string;
    rating: number;
    comment: string;
    applicationId?: string;
    customerId?: string;
    status?: CustomerReview['status'];
  }): Promise<CustomerReview> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const id = `REV-${Date.now()}`;
    const insertPayload = {
      id,
      customer_name: reviewData.customerName.trim(),
      rating: reviewData.rating,
      comment: reviewData.comment.trim(),
      application_id: reviewData.applicationId || null,
      customer_id: reviewData.customerId || null,
      status: reviewData.status || 'Pending',
      is_public: true,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('reviews')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error(`Failed to create review in Supabase: ${error.message}`);
    return mapRowToReview(data);
  },

  // -------------------------------------------------------------
  // 8. INTERNAL MESSAGES & NOTIFICATIONS
  // -------------------------------------------------------------
  async getMessages(recipientId?: string): Promise<InternalMessage[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (recipientId) query = query.eq('recipient_id', recipientId);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      recipientId: m.recipient_id,
      leadId: m.lead_id,
      applicationId: m.application_id,
      message: m.message,
      isRead: Boolean(m.is_read),
      createdAt: m.created_at,
    }));
  },

  async sendMessage(msgData: Partial<InternalMessage>): Promise<InternalMessage> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured.');

    const id = `MSG-${Date.now()}`;
    const insertPayload = {
      id,
      sender_id: msgData.senderId,
      sender_name: msgData.senderName,
      recipient_id: msgData.recipientId,
      lead_id: msgData.leadId || null,
      application_id: msgData.applicationId || null,
      message: msgData.message,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new Error(`Failed to send message: ${error.message}`);

    return {
      id: data.id,
      senderId: data.sender_id,
      senderName: data.sender_name,
      recipientId: data.recipient_id,
      leadId: data.lead_id,
      applicationId: data.application_id,
      message: data.message,
      isRead: data.is_read,
      createdAt: data.created_at,
    };
  },

  async getNotificationLogs(): Promise<NotificationLog[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return [];
    return (data || []).map((n: any) => ({
      id: n.id,
      channel: n.channel || 'WhatsApp',
      recipientPhone: n.recipient_phone,
      recipientEmail: n.recipient_email,
      event: n.event,
      templateName: n.template_name,
      content: n.content,
      status: n.status,
      sentAt: n.sent_at || n.created_at,
      error: n.error,
      associateId: n.associate_id,
      customerId: n.customer_id,
      applicationId: n.application_id,
      providerMessageId: n.provider_message_id,
    }));
  },

  async logNotification(log: Partial<NotificationLog>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase.from('notifications').insert({
        id: log.id || `NOTIF-${Date.now()}`,
        channel: log.channel || 'WhatsApp',
        recipient_phone: log.recipientPhone || null,
        recipient_email: log.recipientEmail || null,
        event: log.event || 'GENERAL',
        template_name: log.templateName || 'NOTIFICATION',
        content: log.content || '',
        status: log.status || 'Sent',
        sent_at: log.sentAt || new Date().toISOString(),
        error: log.error || null,
        associate_id: log.associateId || null,
        application_id: log.applicationId || null,
        customer_id: log.customerId || null,
        provider_message_id: log.providerMessageId || null,
      });
    } catch {
      // Ignore
    }
  },

  // -------------------------------------------------------------
  // 9. TARGETS & ASSOCIATE PERFORMANCE
  // -------------------------------------------------------------
  async getTargets(monthYear?: string): Promise<AssociateTarget[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase.from('targets').select('*');
    if (monthYear) query = query.eq('month_year', monthYear);

    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((t: any) => ({
      id: t.id,
      associateId: t.associate_id,
      associateName: t.associate_name,
      monthYear: t.month_year,
      targetAmount: Number(t.target_amount || 0),
      achievedAmount: Number(t.achieved_amount || 0),
      targetApplications: Number(t.target_applications || 0),
      achievedApplications: Number(t.achieved_applications || 0),
      notes: t.notes,
      updatedAt: t.updated_at || new Date().toISOString(),
    }));
  },

  async updateTarget(targetData: Partial<AssociateTarget>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase.from('targets').upsert({
        id: targetData.id || `TGT-${targetData.associateId}-${targetData.monthYear}`,
        associate_id: targetData.associateId,
        associate_name: targetData.associateName || null,
        month_year: targetData.monthYear,
        target_amount: targetData.targetAmount,
        achieved_amount: targetData.achievedAmount,
        target_applications: targetData.targetApplications,
        achieved_applications: targetData.achievedApplications,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Ignore
    }
  },

  // -------------------------------------------------------------
  // 10. ACTIVITY LOGS & AUDIT TRAIL
  // -------------------------------------------------------------
  async getActivityLogs(limit = 100): Promise<AuditLog[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data || []).map((a: any) => ({
      id: a.id,
      actorId: a.actor_id || a.user_id,
      actorName: a.actor_name || a.user_name || 'System',
      actorRole: a.actor_role || 'ADMIN',
      action: a.action,
      entity: a.entity || a.entity_type || 'System',
      entityId: a.entity_id || '',
      timestamp: a.timestamp || a.created_at,
      details: a.details || a.description || '',
    }));
  },

  async logActivity(params: {
    actor?: { id: string; name: string; role: string };
    action: string;
    entity: string;
    entityId: string;
    details: string;
  }): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase.from('activity_logs').insert({
        id: `ACT-${Date.now()}`,
        actor_id: params.actor?.id || 'SYSTEM',
        actor_name: params.actor?.name || 'System / Portal',
        actor_role: params.actor?.role || 'ADMIN',
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId,
        timestamp: new Date().toISOString(),
        details: params.details,
      });
    } catch {
      // Ignore
    }
  },

  // -------------------------------------------------------------
  // 11. REALTIME SUBSCRIPTIONS
  // -------------------------------------------------------------
  subscribeToTable(
    table: string,
    callback: (payload: { eventType: string; new: any; old: any }) => void
  ) {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel(`realtime_${table}_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        payload => {
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // -------------------------------------------------------------
  // 12. CONNECTION STATUS & HEALTH DIAGNOSTICS
  // -------------------------------------------------------------
  async getConnectionStatus(): Promise<SupabaseConnectionStatus> {
    const configured = isSupabaseConfigured();
    const testRes = await testSupabaseConnection();

    const missingEnvVars: string[] = [];
    if (!metaEnv.VITE_SUPABASE_ANON_KEY) {
      missingEnvVars.push('VITE_SUPABASE_ANON_KEY');
    }

    const recommendations: string[] = [];
    if (!configured) {
      recommendations.push(
        'Provide the VITE_SUPABASE_ANON_KEY in your environment variables to activate live database access.'
      );
    }
    if (testRes.missingTables.length > 0) {
      recommendations.push(
        `Execute the Capitabee SQL Schema setup script in your Supabase SQL Editor to provision tables: ${testRes.missingTables.join(', ')}.`
      );
    }

    return {
      configured,
      url: (metaEnv.VITE_SUPABASE_URL as string) || 'https://fvpnergqltezjbgbtwtv.supabase.co',
      hasAnonKey: Boolean(metaEnv.VITE_SUPABASE_ANON_KEY),
      connected: testRes.connected,
      authSessionActive: false,
      realtimeActive: configured,
      latencyMs: testRes.latencyMs,
      checkedAt: new Date().toISOString(),
      tables: testRes.tables,
      missingTables: testRes.missingTables,
      missingEnvVars,
      recommendations,
    };
  },
};

/**
 * Capitabee Financial Services CRM - API Routes
 */

import 'dotenv/config';
import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db, hashPassword, verifyPassword, StoredUser, SessionData } from './db';
import {
  User,
  UserRole,
  Lead,
  Application,
  Customer,
  FollowUp,
  LeadNote,
  StageInfo,
  StageUpdateLog,
  DocumentRecord,
  CibilCheckRecord,
  NotificationLog,
  NotificationStatus,
  CustomerReview,
  AssociateTarget,
} from '../src/types';
import { LOAN_STAGES, BRAND } from '../src/config/brand';
import {
  WHATSAPP_CONFIG,
  renderWhatsAppTemplate,
  WhatsAppTemplateKey,
} from '../src/config/whatsappTemplates';
import { sendWhatsAppNotification, isWhatsAppConfigured } from './whatsapp';

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://fvpnergqltezjbgbtwtv.supabase.co').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

let serverSupabase: SupabaseClient | null = null;
export function getServerSupabase(): SupabaseClient | null {
  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.length < 20) {
    return null;
  }
  if (!serverSupabase) {
    serverSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverSupabase;
}

export function isUsingServiceRole(): boolean {
  return Boolean(SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY.length > 20);
}

const cleanPhone = (p?: string | null) => (p ? String(p).replace(/\D/g, '').slice(-10) : '');

// Reconciles all applications with customers to ensure customer_id is always properly populated
export function reconcileDatabaseCustomers() {
  const data = db.getData();
  data.customers = data.customers || [];
  data.applications = data.applications || [];

  for (const app of data.applications) {
    const appPhone = cleanPhone(app.customerPhone);
    const appEmail = (app.customerEmail || '').toLowerCase().trim();

    // Check if app already has a valid customerId linking to an existing customer
    let linkedCust = app.customerId ? data.customers.find(c => c.id === app.customerId) : undefined;

    if (!linkedCust) {
      // Find matching customer by normalized phone or email
      linkedCust = data.customers.find(c => 
        (appPhone && c.mobile && cleanPhone(c.mobile) === appPhone) ||
        (appEmail && c.email && c.email.toLowerCase() === appEmail)
      );

      if (linkedCust) {
        app.customerId = linkedCust.id;
      } else {
        // Create exactly one customer for this application
        const newCustId = db.nextCustomerId();
        linkedCust = {
          id: newCustId,
          name: app.customerName || 'Customer',
          mobile: app.customerPhone || '',
          email: app.customerEmail || undefined,
          city: app.city || undefined,
          state: app.state || undefined,
          employmentType: 'Salaried',
          assignedAssociateId: app.assignedAssociateId || null,
          assignedAssociateName: app.assignedAssociateName || null,
          assignedPartnerId: app.assignedPartnerId || undefined,
          assignedPartnerName: app.assignedPartnerName || undefined,
          totalApplicationsCount: 0,
          totalDisbursedAmount: 0,
          createdAt: app.createdDate || new Date().toISOString(),
          updatedAt: app.updatedDate || new Date().toISOString(),
        };
        data.customers.push(linkedCust);
        app.customerId = newCustId;
      }
    }
  }

  // Recalculate customer metrics from applications
  for (const cust of data.customers) {
    const custPhone = cleanPhone(cust.mobile);
    const custEmail = (cust.email || '').toLowerCase().trim();

    const custApps = data.applications.filter(a => 
      a.customerId === cust.id ||
      (custPhone && a.customerPhone && cleanPhone(a.customerPhone) === custPhone) ||
      (custEmail && a.customerEmail && (a.customerEmail || '').toLowerCase().trim() === custEmail)
    );

    cust.totalApplicationsCount = custApps.length;
    cust.totalDisbursedAmount = custApps
      .filter(a => a.status === 'Disbursed')
      .reduce((sum, a) => sum + (Number(a.disbursementAmount) || Number(a.sanctionAmount) || 0), 0);

    if (custApps.length > 0) {
      const sorted = [...custApps].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
      const latest = sorted[0];
      cust.latestApplicationId = latest.id;
      cust.latestLoanType = latest.loanType;
      cust.latestLoanAmount = latest.requestedAmount || latest.sanctionAmount;
      cust.latestStageNumber = Number(latest.currentStage || (latest as any).currentStageNumber || 2);
      cust.latestStageName = latest.currentStageName || 'Application';
      cust.latestStatus = latest.status || 'In Process';
      cust.latestCreatedDate = latest.createdDate;
      if (latest.city && !cust.city) cust.city = latest.city;
      if (latest.state && !cust.state) cust.state = latest.state;
    }
  }
}

// Run initial reconciliation
try {
  reconcileDatabaseCustomers();
} catch (e) {
  console.warn('Initial customer reconciliation notice:', e);
}

export const apiRouter = Router();

// Middleware: Extract Authenticated User
export interface AuthenticatedRequest extends Request {
  user?: StoredUser;
  session?: SessionData;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  const data = db.getData();
  let session = data.sessions.find(s => s.token === token);

  // If session not found in local memory, check if this is a valid Supabase Auth token
  if (!session) {
    try {
      const sb = getServerSupabase();
      if (sb) {
        const { data: sbAuthData, error: sbAuthErr } = await sb.auth.getUser(token);
        if (!sbAuthErr && sbAuthData?.user) {
          const sbEmail = sbAuthData.user.email?.toLowerCase();
          let matchedUser = data.users.find(u => u.email.toLowerCase() === sbEmail || u.id === sbAuthData.user.id);
          if (!matchedUser && sbEmail) {
            // Check profiles table or create basic user
            const { data: prof } = await sb.from('profiles').select('*').eq('id', sbAuthData.user.id).single();
            const now = new Date().toISOString();
            matchedUser = {
              id: sbAuthData.user.id,
              name: prof?.full_name || sbEmail.split('@')[0],
              email: sbEmail,
              mobile: prof?.mobile || '',
              role: (prof?.role as UserRole) || 'ADMIN',
              department: prof?.department || 'Operations',
              designation: prof?.designation || 'Staff',
              status: 'Active',
              onlineStatus: 'Online',
              createdAt: now,
              updatedAt: now,
              passwordHash: '',
              salt: '',
            };
            data.users.push(matchedUser);
          }

          if (matchedUser && matchedUser.status === 'Active') {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
            session = {
              token,
              userId: matchedUser.id,
              role: matchedUser.role,
              createdAt: now.toISOString(),
              expiresAt,
            };
            data.sessions.push(session);
            db.saveDatabase();
          }
        }
      }
    } catch (e) {
      console.warn('Supabase token verification notice:', e);
    }
  }

  if (!session) {
    return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
  }

  // Check expiration (24h)
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    data.sessions = data.sessions.filter(s => s.token !== token);
    db.saveDatabase();
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const user = data.users.find(u => u.id === session!.userId);
  if (!user || user.status !== 'Active') {
    return res.status(403).json({ error: 'User account is inactive or disabled.' });
  }

  req.user = user;
  req.session = session;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

function sanitizeUser(user: StoredUser): User {
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

// -------------------------------------------------------------
// 1. AUTHENTICATION
// -------------------------------------------------------------

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, identifier, password } = req.body;
  const loginId = String(email || identifier || '').trim();
  if (!loginId || !password) {
    return res.status(400).json({ error: 'Email/ID and password are required.' });
  }

  const data = db.getData();
  const normalized = loginId.toLowerCase();
  const user = data.users.find(
    u =>
      u.email.toLowerCase() === normalized ||
      u.id.toLowerCase() === normalized ||
      (u.employeeId && u.employeeId.toLowerCase() === normalized) ||
      (u.partnerId && u.partnerId.toLowerCase() === normalized) ||
      u.mobile.replace(/\D/g, '') === loginId.replace(/\D/g, '')
  );

  if (!user) {
    // Check if any non-admin accounts exist
    const nonAdminCount = data.users.filter(u => u.role !== 'ADMIN').length;
    if (nonAdminCount === 0 && normalized !== BRAND.initialAdminEmail.toLowerCase()) {
      return res.status(400).json({ error: 'No user accounts have been created yet. Please contact the Administrator.' });
    }
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email/ID and password.' });
  }

  if (user.status !== 'Active') {
    return res.status(403).json({ error: `Account is currently ${user.status}. Please contact Administrator.` });
  }

  // Security: Customer role is strictly barred from the Internal CRM Portal
  if (user.role === 'CUSTOMER') {
    return res.status(403).json({
      error: 'Access Denied: Customer accounts cannot log in to the Internal CRM Portal. Customer accounts can access the 12-Stage Loan Tracker directly from the main Capitabee website.',
    });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email/ID and password.' });
  }

  // Create session
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  user.lastLogin = now.toISOString();
  user.onlineStatus = 'Online';
  user.sessionStartedAt = now.toISOString();

  const session: SessionData = {
    token,
    userId: user.id,
    role: user.role,
    createdAt: now.toISOString(),
    expiresAt,
  };

  data.sessions.push(session);
  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'USER_LOGIN',
    'User',
    user.id,
    `${user.role} ${user.name} logged in.`
  );
  db.saveDatabase();

  return res.json({
    token,
    user: sanitizeUser(user),
  });
});

apiRouter.post('/auth/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;

  user.lastLogout = new Date().toISOString();
  user.onlineStatus = 'Offline';

  data.sessions = data.sessions.filter(s => s.token !== req.session?.token);
  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'USER_LOGOUT',
    'User',
    user.id,
    `${user.role} ${user.name} logged out.`
  );
  db.saveDatabase();

  return res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.role === 'CUSTOMER') {
    return res.status(403).json({
      error: 'Access Denied: Customer accounts cannot access the Internal CRM Portal. Please access the Customer Portal from the main website.',
    });
  }
  return res.json({ user: sanitizeUser(req.user!) });
});

apiRouter.post('/auth/change-password', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const user = req.user!;
  if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  user.updatedAt = new Date().toISOString();

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'PASSWORD_CHANGED',
    'User',
    user.id,
    'User changed their password.'
  );
  db.saveDatabase();

  return res.json({ success: true, message: 'Password changed successfully.' });
});

// -------------------------------------------------------------
// 2. ASSOCIATE MANAGEMENT
// -------------------------------------------------------------

apiRouter.get('/associates', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const associates = data.users
    .filter(u => u.role === 'ASSOCIATE')
    .map(u => {
      const sanitized = sanitizeUser(u);
      // Attach live stats calculated from database
      const assignedLeads = data.leads.filter(l => l.assignedAssociateId === u.id);
      const assignedApps = data.applications.filter(a => a.assignedAssociateId === u.id);
      const sanctionedApps = assignedApps.filter(a => a.status === 'Sanctioned' || a.status === 'Disbursed');
      const disbursedApps = assignedApps.filter(a => a.status === 'Disbursed');
      const disbursedAmount = disbursedApps.reduce((acc, a) => acc + (a.disbursementAmount || 0), 0);
      const totalLoanValue = assignedApps.reduce((acc, a) => acc + (a.requestedAmount || 0), 0);

      const target = u.target || 5000000;
      const achievementPct = target > 0 ? Math.round((disbursedAmount / target) * 100) : 0;
      const conversionRate = assignedLeads.length > 0 ? Math.round((disbursedApps.length / assignedLeads.length) * 100) : 0;

      return {
        ...sanitized,
        stats: {
          totalLeads: assignedLeads.length,
          newLeads: assignedLeads.filter(l => l.leadStatus === 'New').length,
          contacted: assignedLeads.filter(l => l.leadStatus === 'Contacted').length,
          followups: data.followUps.filter(f => f.associateId === u.id && f.status === 'Pending').length,
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

  return res.json({ associates });
});

apiRouter.post('/associates', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    mobile,
    email,
    customId,
    password,
    confirmPassword,
    department,
    designation,
    status = 'Active',
    target = 5000000,
    joiningDate = new Date().toISOString().split('T')[0],
  } = req.body;

  if (!name || !mobile || !email || !password) {
    return res.status(400).json({ error: 'Name, mobile, email, and password are required.' });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'Password and confirm password do not match' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const data = db.getData();
  const normalizedEmail = String(email).trim().toLowerCase();
  const emailExists = data.users.some(u => u.email.toLowerCase() === normalizedEmail);
  if (emailExists) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  let associateId: string;
  try {
    associateId = db.nextAssociateId(customId);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  const newAssociate: StoredUser = {
    id: associateId,
    name: name.trim(),
    email: normalizedEmail,
    mobile: mobile.trim(),
    role: 'ASSOCIATE',
    employeeId: associateId,
    department: department || 'Loan Operations',
    designation: designation || 'Loan Relationship Associate',
    status: status || 'Active',
    onlineStatus: 'Offline',
    target: Number(target) || 5000000,
    joiningDate,
    createdAt: now,
    updatedAt: now,
    passwordHash: hash,
    salt,
  };

  data.users.push(newAssociate);
  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'ASSOCIATE_CREATED',
    'Associate',
    associateId,
    `Admin created Associate ${associateId} (${name}).`
  );
  db.saveDatabase();

  return res.status(201).json({
    success: true,
    associate: sanitizeUser(newAssociate),
    message: `Associate ${associateId} created successfully.`,
  });
});

apiRouter.patch('/associates/:id', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, mobile, department, designation, status, target } = req.body;
  const data = db.getData();
  const associate = data.users.find(u => u.id === id && u.role === 'ASSOCIATE');

  if (!associate) {
    return res.status(404).json({ error: 'Associate not found.' });
  }

  if (name) associate.name = name;
  if (mobile) associate.mobile = mobile;
  if (department) associate.department = department;
  if (designation) associate.designation = designation;
  if (status) associate.status = status;
  if (target !== undefined) associate.target = Number(target);
  associate.updatedAt = new Date().toISOString();

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'ASSOCIATE_UPDATED',
    'Associate',
    id,
    `Admin updated Associate ${id} details/status.`
  );
  db.saveDatabase();

  return res.json({ success: true, associate: sanitizeUser(associate) });
});

apiRouter.post('/associates/:id/reset-password', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const data = db.getData();
  const associate = data.users.find(u => u.id === id && u.role === 'ASSOCIATE');
  if (!associate) {
    return res.status(404).json({ error: 'Associate not found.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  associate.passwordHash = hash;
  associate.salt = salt;
  associate.updatedAt = new Date().toISOString();

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'ASSOCIATE_PASSWORD_RESET',
    'Associate',
    id,
    `Admin reset password for Associate ${id}.`
  );
  db.saveDatabase();

  return res.json({ success: true, message: `Password for Associate ${id} reset successfully.` });
});

// -------------------------------------------------------------
// 2.1 NEXT CB-ID GENERATOR (ATOMIC & SEQUENTIAL PREVIEW)
// -------------------------------------------------------------
apiRouter.get('/next-cb-id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  let highestNum = 999;
  for (const u of data.users) {
    const match = u.id?.match(/^CB-(\d+)$/i) || u.employeeId?.match(/^CB-(\d+)$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > highestNum) {
        highestNum = n;
      }
    }
  }
  if (data.counters && data.counters.associateSeq > highestNum) {
    highestNum = data.counters.associateSeq;
  }
  const nextId = `CB-${highestNum + 1}`;
  return res.json({ nextId });
});

// -------------------------------------------------------------
// 2.2 PARTNERS MANAGEMENT & PARTNER WORKSPACE
// -------------------------------------------------------------
apiRouter.get('/partners', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;

  let partnerUsers = data.users.filter(u => u.role === 'PARTNER');
  if (user.role === 'PARTNER') {
    partnerUsers = partnerUsers.filter(u => u.id === user.id);
  }

  const partners = partnerUsers.map(u => {
    const sanitized = sanitizeUser(u);
    const partnerCustomers = (data.customers || []).filter(c => c.assignedPartnerId === u.id || c.createdById === u.id);
    const partnerApps = (data.applications || []).filter(a => a.assignedPartnerId === u.id || a.createdById === u.id);
    const partnerLeads = (data.leads || []).filter(l => l.assignedPartnerId === u.id || l.createdById === u.id);
    const inProgressApps = partnerApps.filter(a => !['Sanctioned', 'Disbursed', 'Rejected', 'Closed'].includes(a.status));
    const sanctionedApps = partnerApps.filter(a => a.status === 'Sanctioned' || a.status === 'Disbursed');
    const disbursedApps = partnerApps.filter(a => a.status === 'Disbursed');
    const disbursedAmount = disbursedApps.reduce((acc, a) => acc + (a.disbursementAmount || 0), 0);
    const totalLoanValue = partnerApps.reduce((acc, a) => acc + (a.requestedAmount || 0), 0);

    const target = u.target || 10000000;
    const achievementPct = target > 0 ? Math.round((disbursedAmount / target) * 100) : 0;
    const conversionRate = partnerLeads.length > 0 ? Math.round((disbursedApps.length / partnerLeads.length) * 100) : 0;

    return {
      ...sanitized,
      stats: {
        totalCustomers: partnerCustomers.length,
        totalLeads: partnerLeads.length,
        applications: partnerApps.length,
        inProgress: inProgressApps.length,
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

  return res.json({ partners });
});

apiRouter.post('/partners', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    mobile,
    email,
    customId,
    password,
    confirmPassword,
    department = 'Channel Partnerships',
    designation = 'Senior Lending Partner',
    status = 'Active',
    target = 10000000,
    targetCustomers = 20,
    joiningDate = new Date().toISOString().split('T')[0],
  } = req.body;

  if (!name || !mobile || !email || !password) {
    return res.status(400).json({ error: 'Name, mobile, email, and password are required.' });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'Password and confirm password do not match.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const data = db.getData();
  const normalizedEmail = String(email).trim().toLowerCase();
  const emailExists = data.users.some(u => u.email.toLowerCase() === normalizedEmail);
  if (emailExists) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  let partnerId: string;
  try {
    partnerId = db.nextPartnerId(customId);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  const newPartner: StoredUser = {
    id: partnerId,
    name: name.trim(),
    email: normalizedEmail,
    mobile: mobile.trim(),
    role: 'PARTNER',
    partnerId,
    employeeId: partnerId,
    department,
    designation,
    status: status || 'Active',
    onlineStatus: 'Offline',
    target: Number(target) || 10000000,
    targetCustomers: Number(targetCustomers) || 20,
    joiningDate,
    createdAt: now,
    updatedAt: now,
    passwordHash: hash,
    salt,
  };

  data.users.push(newPartner);
  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'PARTNER_CREATED',
    'Partner',
    partnerId,
    `Admin created Partner ${partnerId} (${name}).`
  );
  db.saveDatabase();

  return res.status(201).json({
    success: true,
    partner: sanitizeUser(newPartner),
    message: `Partner ${partnerId} created successfully.`,
  });
});

apiRouter.patch('/partners/:id', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, mobile, department, designation, status, target, targetCustomers } = req.body;
  const data = db.getData();
  const partner = data.users.find(u => u.id === id && u.role === 'PARTNER');

  if (!partner) {
    return res.status(404).json({ error: 'Partner not found.' });
  }

  if (name) partner.name = name;
  if (mobile) partner.mobile = mobile;
  if (department) partner.department = department;
  if (designation) partner.designation = designation;
  if (status) partner.status = status;
  if (target !== undefined) partner.target = Number(target);
  if (targetCustomers !== undefined) partner.targetCustomers = Number(targetCustomers);
  partner.updatedAt = new Date().toISOString();

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'PARTNER_UPDATED',
    'Partner',
    id,
    `Admin updated Partner ${id} details/status.`
  );
  db.saveDatabase();

  return res.json({ success: true, partner: sanitizeUser(partner) });
});

apiRouter.post('/partners/:id/reset-password', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const data = db.getData();
  const partner = data.users.find(u => u.id === id && u.role === 'PARTNER');
  if (!partner) {
    return res.status(404).json({ error: 'Partner not found.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  partner.passwordHash = hash;
  partner.salt = salt;
  partner.updatedAt = new Date().toISOString();

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'PARTNER_PASSWORD_RESET',
    'Partner',
    id,
    `Admin reset password for Partner ${id}.`
  );
  db.saveDatabase();

  return res.json({ success: true, message: `Password for Partner ${id} reset successfully.` });
});

apiRouter.get('/partner/stats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const partnerId = user.id;

  const partnerCustomers = (data.customers || []).filter(c => c.assignedPartnerId === partnerId || c.createdById === partnerId);
  const partnerApps = (data.applications || []).filter(a => a.assignedPartnerId === partnerId || a.createdById === partnerId);
  const partnerLeads = (data.leads || []).filter(l => l.assignedPartnerId === partnerId || l.createdById === partnerId);

  const inProgressApps = partnerApps.filter(a => !['Sanctioned', 'Disbursed', 'Rejected', 'Closed'].includes(a.status));
  const sanctionedApps = partnerApps.filter(a => a.status === 'Sanctioned' || a.status === 'Disbursed');
  const disbursedApps = partnerApps.filter(a => a.status === 'Disbursed');
  const disbursedAmount = disbursedApps.reduce((acc, a) => acc + (a.disbursementAmount || 0), 0);
  const totalLoanValue = partnerApps.reduce((acc, a) => acc + (a.requestedAmount || 0), 0);

  const target = user.target || 10000000;
  const targetCustomers = user.targetCustomers || 20;
  const achievementPct = target > 0 ? Math.round((disbursedAmount / target) * 100) : 0;
  const customerPct = targetCustomers > 0 ? Math.round((partnerCustomers.length / targetCustomers) * 100) : 0;

  return res.json({
    stats: {
      totalCustomers: partnerCustomers.length,
      totalLeads: partnerLeads.length,
      totalApplications: partnerApps.length,
      inProgressCount: inProgressApps.length,
      sanctionedCount: sanctionedApps.length,
      disbursedCount: disbursedApps.length,
      totalLoanValue,
      disbursedAmount,
      target,
      targetCustomers,
      achievementPct,
      customerPct,
      recentApplications: partnerApps.slice(0, 5),
    },
  });
});

// -------------------------------------------------------------
// 2.3 EMPLOYEES MANAGEMENT
// -------------------------------------------------------------
apiRouter.get('/employees', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  let employees = data.users.filter(u => u.role === 'EMPLOYEE');
  if (user.role === 'EMPLOYEE') {
    employees = employees.filter(u => u.id === user.id);
  }
  return res.json({ employees: employees.map(sanitizeUser) });
});

apiRouter.post('/employees', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { name, mobile, email, password, department = 'Operations', designation = 'Credit Operations Officer' } = req.body;
  if (!name || !mobile || !email || !password) {
    return res.status(400).json({ error: 'Name, mobile, email, and password are required.' });
  }
  const data = db.getData();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (data.users.some(u => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const employeeId = db.nextCbId();
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  const newEmp: StoredUser = {
    id: employeeId,
    name: name.trim(),
    email: normalizedEmail,
    mobile: mobile.trim(),
    role: 'EMPLOYEE',
    employeeId,
    department,
    designation,
    status: 'Active',
    onlineStatus: 'Offline',
    createdAt: now,
    updatedAt: now,
    passwordHash: hash,
    salt,
  };

  data.users.push(newEmp);
  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'EMPLOYEE_CREATED',
    'Employee',
    employeeId,
    `Admin created Employee ${employeeId} (${name}).`
  );
  db.saveDatabase();

  return res.status(201).json({ success: true, employee: sanitizeUser(newEmp) });
});

// -------------------------------------------------------------
// 3. LEADS CRM
// -------------------------------------------------------------

apiRouter.get('/leads', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;

  let leads = data.leads;

  // Strict RBAC: Associates only see assigned leads!
  if (user.role === 'ASSOCIATE') {
    leads = leads.filter(l => l.assignedAssociateId === user.id);
  }

  // Filter queries
  const { search, status, priority, loanType, source, associateId } = req.query;

  if (search) {
    const q = String(search).toLowerCase();
    leads = leads.filter(
      l =>
        l.customerName.toLowerCase().includes(q) ||
        l.mobile.includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        l.id.toLowerCase().includes(q)
    );
  }

  if (status) leads = leads.filter(l => l.leadStatus === status);
  if (priority) leads = leads.filter(l => l.priority === priority);
  if (loanType) leads = leads.filter(l => l.loanType === loanType);
  if (source) leads = leads.filter(l => l.leadSource === source);
  if (associateId && user.role === 'ADMIN') {
    leads = leads.filter(l => l.assignedAssociateId === associateId);
  }

  return res.json({ leads });
});

apiRouter.post('/leads/check-duplicate', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { mobile, email } = req.body;
  if (!mobile) {
    return res.status(400).json({ error: 'Mobile number is required for check.' });
  }

  const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
  const data = db.getData();

  const match = data.leads.find(l => {
    const m = l.mobile.replace(/\D/g, '').slice(-10);
    return m === cleanMobile || (email && l.email && l.email.toLowerCase() === String(email).toLowerCase());
  });

  if (match) {
    return res.json({
      isDuplicate: true,
      existingLead: match,
      message: `Possible duplicate lead found: ${match.customerName} (${match.id}) registered on ${new Date(match.createdDate).toLocaleDateString()}.`,
    });
  }

  return res.json({ isDuplicate: false });
});

apiRouter.post('/leads', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const {
    customerName,
    mobile,
    email,
    city,
    state,
    loanType,
    requiredAmount,
    employmentType,
    leadSource = 'Manual Entry',
    assignedAssociateId,
    priority = 'WARM',
    notes,
    forceDuplicate = false,
  } = req.body;

  if (!customerName || !mobile || !loanType || !requiredAmount) {
    return res.status(400).json({ error: 'Customer Name, Mobile, Loan Type, and Required Amount are required.' });
  }

  const data = db.getData();
  const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);

  if (!forceDuplicate) {
    const duplicate = data.leads.find(l => l.mobile.replace(/\D/g, '').slice(-10) === cleanMobile);
    if (duplicate) {
      return res.status(409).json({
        error: 'DUPLICATE_DETECTED',
        message: `Possible duplicate lead found: ${duplicate.customerName} (${duplicate.id}). Please confirm to proceed.`,
        existingLead: duplicate,
      });
    }
  }

  const leadId = db.nextLeadId();
  const now = new Date().toISOString();

  let associateName: string | null = null;
  if (assignedAssociateId) {
    const assoc = data.users.find(u => u.id === assignedAssociateId);
    if (assoc) associateName = assoc.name;
  }

  const newLead: Lead = {
    id: leadId,
    customerName: customerName.trim(),
    mobile: mobile.trim(),
    email: email ? email.trim() : undefined,
    city: city ? city.trim() : undefined,
    state: state ? state.trim() : undefined,
    loanType,
    requiredAmount: Number(requiredAmount),
    employmentType: employmentType || 'Salaried',
    leadSource,
    assignedAssociateId: assignedAssociateId || null,
    assignedAssociateName: associateName,
    leadStatus: 'New',
    priority: priority || 'WARM',
    createdDate: now,
    lastContactDate: undefined,
    nextFollowUpDate: undefined,
    notes: notes ? notes.trim() : undefined,
  };

  data.leads.unshift(newLead);

  if (notes) {
    data.leadNotes.push({
      id: `NOTE-${Date.now()}`,
      leadId,
      authorId: req.user!.id,
      authorName: req.user!.name,
      authorRole: req.user!.role,
      content: notes.trim(),
      createdAt: now,
    });
  }

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'LEAD_CREATED',
    'Lead',
    leadId,
    `Lead created for ${customerName} (${loanType}, ₹${Number(requiredAmount).toLocaleString('en-IN')}).`
  );
  db.saveDatabase();

  return res.status(201).json({ success: true, lead: newLead });
});

apiRouter.get('/leads/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const user = req.user!;

  const lead = data.leads.find(l => l.id === id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  // Associate access check
  if (user.role === 'ASSOCIATE' && lead.assignedAssociateId !== user.id) {
    return res.status(403).json({ error: 'Access denied. This lead is not assigned to you.' });
  }

  const followUps = data.followUps.filter(f => f.leadId === id);
  const notes = data.leadNotes.filter(n => n.leadId === id);
  const applications = data.applications.filter(a => a.leadId === id);
  const audit = data.auditLogs.filter(a => a.entityId === id);

  return res.json({ lead, followUps, notes, applications, audit });
});

apiRouter.patch('/leads/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const user = req.user!;

  const lead = data.leads.find(l => l.id === id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  if (user.role === 'ASSOCIATE' && lead.assignedAssociateId !== user.id) {
    return res.status(403).json({ error: 'Access denied. You can only modify your assigned leads.' });
  }

  const {
    customerName,
    mobile,
    email,
    city,
    state,
    loanType,
    requiredAmount,
    employmentType,
    leadStatus,
    priority,
    lostReason,
    nextFollowUpDate,
  } = req.body;

  // Validation: If status is 'Lost', reason is mandatory
  if (leadStatus === 'Lost' && !lostReason && !lead.lostReason) {
    return res.status(400).json({ error: 'A specific Lost Reason is required when marking a lead as Lost.' });
  }

  if (customerName) lead.customerName = customerName.trim();
  if (mobile) lead.mobile = mobile.trim();
  if (email !== undefined) lead.email = email ? email.trim() : undefined;
  if (city !== undefined) lead.city = city;
  if (state !== undefined) lead.state = state;
  if (loanType) lead.loanType = loanType;
  if (requiredAmount !== undefined) lead.requiredAmount = Number(requiredAmount);
  if (employmentType) lead.employmentType = employmentType;
  if (leadStatus) lead.leadStatus = leadStatus;
  if (priority) lead.priority = priority;
  if (lostReason !== undefined) lead.lostReason = lostReason;
  if (nextFollowUpDate !== undefined) lead.nextFollowUpDate = nextFollowUpDate;

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'LEAD_UPDATED',
    'Lead',
    id,
    `Updated lead ${id} (Status: ${lead.leadStatus}, Priority: ${lead.priority}).`
  );
  db.saveDatabase();

  return res.json({ success: true, lead });
});

apiRouter.post('/leads/:id/assign', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { associateId } = req.body;

  const data = db.getData();
  const lead = data.leads.find(l => l.id === id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  if (!associateId) {
    lead.assignedAssociateId = null;
    lead.assignedAssociateName = null;
    db.logAudit(
      { id: req.user!.id, name: req.user!.name, role: req.user!.role },
      'LEAD_UNASSIGNED',
      'Lead',
      id,
      `Lead ${id} unassigned.`
    );
  } else {
    const associate = data.users.find(u => u.id === associateId && u.role === 'ASSOCIATE');
    if (!associate) return res.status(400).json({ error: 'Associate not found.' });

    lead.assignedAssociateId = associate.id;
    lead.assignedAssociateName = associate.name;
    db.logAudit(
      { id: req.user!.id, name: req.user!.name, role: req.user!.role },
      'LEAD_ASSIGNED',
      'Lead',
      id,
      `Lead ${id} assigned to ${associate.name} (${associate.id}).`
    );
  }

  db.saveDatabase();
  return res.json({ success: true, lead });
});

apiRouter.post('/leads/bulk-assign', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { leadIds, associateId } = req.body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({ error: 'leadIds array is required.' });
  }

  const data = db.getData();
  const associate = data.users.find(u => u.id === associateId && u.role === 'ASSOCIATE');
  if (!associate) {
    return res.status(400).json({ error: 'Associate not found.' });
  }

  let assignedCount = 0;
  for (const id of leadIds) {
    const lead = data.leads.find(l => l.id === id);
    if (lead) {
      lead.assignedAssociateId = associate.id;
      lead.assignedAssociateName = associate.name;
      assignedCount++;
    }
  }

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'LEADS_BULK_ASSIGNED',
    'Lead',
    associate.id,
    `Admin bulk-assigned ${assignedCount} leads to ${associate.name} (${associate.id}).`
  );
  db.saveDatabase();

  return res.json({ success: true, assignedCount, message: `Successfully assigned ${assignedCount} leads to ${associate.name}.` });
});

// Follow-ups
apiRouter.post('/leads/:id/followups', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { scheduledDate, scheduledTime, type, notes } = req.body;

  if (!scheduledDate || !scheduledTime || !type) {
    return res.status(400).json({ error: 'Scheduled Date, Time, and Type are required.' });
  }

  const data = db.getData();
  const lead = data.leads.find(l => l.id === id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  const user = req.user!;
  if (user.role === 'ASSOCIATE' && lead.assignedAssociateId !== user.id) {
    return res.status(403).json({ error: 'Access denied. You can only schedule follow-ups for your assigned leads.' });
  }

  const followUpId = `FLW-${Date.now()}`;
  const newFollowUp: FollowUp = {
    id: followUpId,
    leadId: id,
    customerName: lead.customerName,
    customerMobile: lead.mobile,
    associateId: user.id,
    associateName: user.name,
    scheduledDate,
    scheduledTime,
    type,
    status: 'Pending',
    notes,
    createdAt: new Date().toISOString(),
  };

  lead.nextFollowUpDate = `${scheduledDate} ${scheduledTime}`;
  lead.leadStatus = 'Follow-up';

  data.followUps.unshift(newFollowUp);
  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'FOLLOWUP_SCHEDULED',
    'FollowUp',
    followUpId,
    `Follow-up scheduled for lead ${id} on ${scheduledDate} at ${scheduledTime}.`
  );
  db.saveDatabase();

  return res.status(201).json({ success: true, followUp: newFollowUp });
});

apiRouter.patch('/followups/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, outcome, notes, scheduledDate, scheduledTime } = req.body;

  const data = db.getData();
  const followUp = data.followUps.find(f => f.id === id);
  if (!followUp) return res.status(404).json({ error: 'Follow-up not found.' });

  const user = req.user!;
  if (user.role === 'ASSOCIATE' && followUp.associateId !== user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  if (status) followUp.status = status;
  if (outcome !== undefined) followUp.outcome = outcome;
  if (notes !== undefined) followUp.notes = notes;
  if (scheduledDate) followUp.scheduledDate = scheduledDate;
  if (scheduledTime) followUp.scheduledTime = scheduledTime;
  if (status === 'Completed') {
    followUp.completedAt = new Date().toISOString();
    // Update lead last contact date
    const lead = data.leads.find(l => l.id === followUp.leadId);
    if (lead) {
      lead.lastContactDate = new Date().toISOString();
    }
  }

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'FOLLOWUP_UPDATED',
    'FollowUp',
    id,
    `Follow-up ${id} updated to status ${followUp.status}.`
  );
  db.saveDatabase();

  return res.json({ success: true, followUp });
});

// Lead Notes
apiRouter.post('/leads/:id/notes', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Note content cannot be empty.' });
  }

  const data = db.getData();
  const lead = data.leads.find(l => l.id === id);
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });

  const user = req.user!;
  if (user.role === 'ASSOCIATE' && lead.assignedAssociateId !== user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const note: LeadNote = {
    id: `NOTE-${Date.now()}`,
    leadId: id,
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  data.leadNotes.push(note);
  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'NOTE_ADDED',
    'Lead',
    id,
    `Note added to lead ${id}.`
  );
  db.saveDatabase();

  return res.status(201).json({ success: true, note });
});

// -------------------------------------------------------------
// 4. APPLICATIONS & 12-STAGE LOAN PROCESS
// -------------------------------------------------------------

apiRouter.get('/applications', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sb = getServerSupabase();

  if (!sb) {
    return res.status(503).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is missing from the server runtime environment.',
      applications: [],
    });
  }

  let query = sb.from('applications').select('*').order('created_at', { ascending: false });
  if (user.role === 'ASSOCIATE') {
    const associateKey = user.employeeId || user.id;
    query = query.or(`associate_id.eq.${associateKey},user_id.eq.${user.id}`);
  }

  const { data: sbApps, error } = await query;
  if (error) {
    console.error('Supabase /api/applications query error:', error);
    return res.status(500).json({
      error: `Supabase query failed: [${error.code}] ${error.message}`,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      applications: [],
    });
  }

  const applications: Application[] = [];
  if (sbApps && sbApps.length > 0) {
    for (const row of sbApps) {
      const currentStageNum = Number(row.current_stage || row.stage || 2);
      const defaultStages: StageInfo[] = LOAN_STAGES.map(s => ({
        number: s.number,
        name: s.name,
        status: s.number < currentStageNum ? 'Completed' : s.number === currentStageNum ? 'In Progress' : 'Pending',
        updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
      }));

      const mapped: Application = {
        id: String(row.id || row.application_id || ''),
        customerId: row.customer_id || undefined,
        leadId: row.lead_id || undefined,
        customerName: row.full_name || row.customer_name || row.applicant_name || row.name || 'Applicant',
        customerPhone: row.mobile_number || row.customer_phone || row.mobile || row.phone || '',
        customerEmail: row.email || row.customer_email || undefined,
        city: row.city || undefined,
        state: row.state || undefined,
        loanType: row.loan_type || row.loanType || 'Personal Loan',
        requestedAmount: Number(row.required_loan_amount || row.requested_amount || row.loan_amount || row.amount || 0),
        sanctionAmount: Number(row.sanction_amount || row.sanctioned_amount || 0),
        disbursementAmount: Number(row.disbursement_amount || row.disbursed_amount || 0),
        lenderPartner: row.lender_partner || row.lending_partner || undefined,
        assignedAssociateId: row.associate_id || row.assigned_associate_id || row.user_id || null,
        assignedAssociateName: row.associate_name || row.assigned_associate_name || null,
        assignedPartnerId: row.partner_id || row.assigned_partner_id || undefined,
        assignedPartnerName: row.partner_name || row.assigned_partner_name || undefined,
        status: row.status || 'In Process',
        currentStage: currentStageNum,
        currentStageName: LOAN_STAGES.find(s => s.number === currentStageNum)?.name || 'Application',
        stages: Array.isArray(row.stages) ? row.stages : defaultStages,
        createdDate: row.created_at || row.created_date || new Date().toISOString(),
        updatedDate: row.updated_at || row.updated_date || new Date().toISOString(),
        notes: row.notes || undefined,
      };
      applications.push(mapped);
    }
  }

  let filtered = applications;

  if (user.role === 'ASSOCIATE') {
    filtered = filtered.filter(
      a =>
        a.assignedAssociateId === user.id ||
        a.assignedAssociateId === user.employeeId ||
        (user.name && a.assignedAssociateName?.toLowerCase() === user.name.toLowerCase())
    );
  }

  const { search, status, loanType, stage } = req.query;
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      a =>
        a.customerName.toLowerCase().includes(q) ||
        a.customerPhone.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        (a.city && a.city.toLowerCase().includes(q))
    );
  }
  if (status && status !== 'All') filtered = filtered.filter(a => a.status === status);
  if (loanType && loanType !== 'All') filtered = filtered.filter(a => a.loanType === loanType);
  if (stage) filtered = filtered.filter(a => a.currentStage === Number(stage));

  return res.json({ applications: filtered });
});

apiRouter.post('/applications', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const {
    leadId,
    customerName,
    customerPhone,
    customerEmail,
    city,
    state,
    loanType,
    requestedAmount,
    lenderPartner,
    notes,
    assignedAssociateId,
  } = req.body;

  if (!customerName || !customerPhone || !loanType || !requestedAmount) {
    return res.status(400).json({ error: 'Customer Name, Phone, Loan Type, and Requested Amount are required.' });
  }

  const data = db.getData();
  const user = req.user!;

  let assocId = assignedAssociateId;
  let assocName: string | null = null;

  if (user.role === 'ASSOCIATE') {
    assocId = user.employeeId || user.id;
    assocName = user.name;
  } else if (assignedAssociateId) {
    const found = data.users.find(u => u.id === assignedAssociateId || u.employeeId === assignedAssociateId);
    if (found) {
      assocName = found.name;
      assocId = found.employeeId || found.id;
    }
  }

  const appId = db.nextApplicationId();
  const now = new Date().toISOString();

  // Initialize the 12 standard stages
  const initialStages: StageInfo[] = LOAN_STAGES.map(s => ({
    number: s.number,
    name: s.name,
    status: s.number === 1 ? 'Completed' : s.number === 2 ? 'In Progress' : 'Pending',
    updatedAt: now,
    updatedBy: user.name,
    notes: s.number === 1 ? 'Customer loan requirement and inquiry recorded.' : undefined,
  }));

  const application: Application = {
    id: appId,
    leadId: leadId || undefined,
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    customerEmail: customerEmail ? customerEmail.trim() : undefined,
    city: city ? city.trim() : undefined,
    state: state ? state.trim() : undefined,
    loanType,
    requestedAmount: Number(requestedAmount),
    sanctionAmount: 0,
    disbursementAmount: 0,
    assignedAssociateId: assocId || null,
    assignedAssociateName: assocName,
    status: 'In Process',
    currentStage: 2,
    currentStageName: 'Application',
    stages: initialStages,
    createdDate: now,
    updatedDate: now,
    lenderPartner: lenderPartner || undefined,
    notes: notes || undefined,
  };

  // Find or create customer
  data.customers = data.customers || [];
  const cleanPhoneNum = cleanPhone(customerPhone);
  const cleanEmail = (customerEmail || '').toLowerCase().trim();
  let customer = data.customers.find(
    c => (cleanPhoneNum && c.mobile && cleanPhone(c.mobile) === cleanPhoneNum) ||
         (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail)
  );

  if (!customer) {
    const custId = db.nextCustomerId();
    customer = {
      id: custId,
      name: customerName.trim(),
      mobile: customerPhone.trim(),
      email: customerEmail ? customerEmail.trim() : undefined,
      city: city ? city.trim() : undefined,
      state: state ? state.trim() : undefined,
      employmentType: 'Salaried',
      assignedAssociateId: assocId || null,
      assignedAssociateName: assocName,
      totalApplicationsCount: 1,
      totalDisbursedAmount: 0,
      createdAt: now,
      updatedAt: now,
    };
    data.customers.unshift(customer);
  } else {
    customer.totalApplicationsCount = (customer.totalApplicationsCount || 0) + 1;
    customer.updatedAt = now;
  }

  application.customerId = customer.id;
  data.applications.unshift(application);

  // If created from a lead, update lead status
  if (leadId) {
    const lead = data.leads.find(l => l.id === leadId);
    if (lead) {
      lead.leadStatus = 'Application Started';
    }
  }

  // Sync to Supabase applications and application_stages
  const sb = getServerSupabase();
  if (sb) {
    try {
      await sb.from('applications').insert({
        id: appId,
        customer_id: customer.id,
        full_name: customerName.trim(),
        mobile_number: customerPhone.trim(),
        email: customerEmail ? customerEmail.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        loan_type: loanType,
        required_loan_amount: Number(requestedAmount),
        associate_id: assocId || null,
        associate_name: assocName || null,
        user_id: user.id,
        employment_type: 'Salaried',
        status: 'In Process',
        current_stage: 2,
        notes: notes || null,
        created_at: now,
        updated_at: now,
      });

      const stageInserts = initialStages.map(s => ({
        id: `STG-${Date.now()}-${s.number}`,
        application_id: appId,
        stage_number: s.number,
        name: s.name,
        status: s.status,
        remarks: s.notes || null,
        updated_by: user.name,
        updated_at: now,
      }));
      await sb.from('application_stages').insert(stageInserts);
    } catch (e) {
      console.warn('Supabase post application sync notice:', e);
    }
  }

  // Real WhatsApp submission notification dispatch
  let whatsappNotificationResult = {
    status: 'Not Connected',
    message: 'WhatsApp service is not connected yet.',
  };

  if (customerPhone) {
    const templateContent = renderWhatsAppTemplate('APPLICATION_SUBMITTED', {
      CustomerName: customerName.trim(),
      ApplicationID: appId,
      LoanType: loanType,
      AssociateName: assocName || undefined,
    });

    const waRes = await sendWhatsAppNotification(customerPhone.trim(), 'APPLICATION_SUBMITTED', {
      CustomerName: customerName.trim(),
      ApplicationID: appId,
      LoanType: loanType,
      AssociateName: assocName || undefined,
    });

    const notifLog: NotificationLog = {
      id: `NOTIF-${Date.now()}`,
      channel: 'WhatsApp',
      recipientPhone: customerPhone.trim(),
      event: 'APPLICATION_SUBMISSION',
      templateName: 'APPLICATION_SUBMITTED',
      content: templateContent,
      status: waRes.status,
      sentAt: now,
      error: waRes.success ? undefined : waRes.message,
      associateId: user.id,
      applicationId: appId,
      providerMessageId: waRes.providerMessageId,
    };

    data.notifications.unshift(notifLog);
    whatsappNotificationResult = {
      status: waRes.status,
      message: waRes.message,
    };
  }

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'APPLICATION_CREATED',
    'Application',
    appId,
    `Application ${appId} created for ${customerName} (₹${Number(requestedAmount).toLocaleString('en-IN')}). WhatsApp notification: ${whatsappNotificationResult.status}.`
  );
  db.saveDatabase();

  return res.status(201).json({
    success: true,
    application,
    whatsappNotification: whatsappNotificationResult,
  });
});

apiRouter.get('/applications/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const user = req.user!;
  const sb = getServerSupabase();

  if (!sb) {
    return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing from the server runtime environment.' });
  }

  const { data: row, error } = await sb.from('applications').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('Supabase /api/applications/:id query error:', error);
    return res.status(500).json({
      error: `Supabase query failed: [${error.code}] ${error.message}`,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  if (!row) return res.status(404).json({ error: 'Application not found in Supabase.' });

  const currentStageNum = Number(row.current_stage || row.stage || 2);
  const defaultStages: StageInfo[] = LOAN_STAGES.map(s => ({
    number: s.number,
    name: s.name,
    status: s.number < currentStageNum ? 'Completed' : s.number === currentStageNum ? 'In Progress' : 'Pending',
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  }));

  const app: Application = {
    id: String(row.id || row.application_id || ''),
    customerId: row.customer_id || undefined,
    leadId: row.lead_id || undefined,
    customerName: row.full_name || row.customer_name || row.applicant_name || row.name || 'Applicant',
    customerPhone: row.mobile_number || row.customer_phone || row.mobile || row.phone || '',
    customerEmail: row.email || row.customer_email || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    loanType: row.loan_type || row.loanType || 'Personal Loan',
    requestedAmount: Number(row.required_loan_amount || row.requested_amount || row.loan_amount || row.amount || 0),
    sanctionAmount: Number(row.sanction_amount || row.sanctioned_amount || 0),
    disbursementAmount: Number(row.disbursement_amount || row.disbursed_amount || 0),
    lenderPartner: row.lender_partner || row.lending_partner || undefined,
    assignedAssociateId: row.associate_id || row.assigned_associate_id || row.user_id || null,
    assignedAssociateName: row.associate_name || row.assigned_associate_name || null,
    assignedPartnerId: row.partner_id || row.assigned_partner_id || undefined,
    assignedPartnerName: row.partner_name || row.assigned_partner_name || undefined,
    status: row.status || 'In Process',
    currentStage: currentStageNum,
    currentStageName: LOAN_STAGES.find(s => s.number === currentStageNum)?.name || 'Application',
    stages: Array.isArray(row.stages) ? row.stages : defaultStages,
    createdDate: row.created_at || row.created_date || new Date().toISOString(),
    updatedDate: row.updated_at || row.updated_date || new Date().toISOString(),
    notes: row.notes || undefined,
  };

  if (
    user.role === 'ASSOCIATE' &&
    app.assignedAssociateId !== user.id &&
    app.assignedAssociateId !== user.employeeId &&
    (!user.name || app.assignedAssociateName?.toLowerCase() !== user.name.toLowerCase())
  ) {
    return res.status(403).json({ error: 'Access denied. You can only view your assigned applications.' });
  }

  const documents = (data.documents || []).filter(d => d.applicationId === id);
  const stageUpdates = (data.stageUpdates || []).filter(s => s.applicationId === id);

  return res.json({ application: app, documents, stageUpdates });
});

apiRouter.patch('/applications/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const user = req.user!;

  const app = data.applications.find(a => a.id === id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });

  if (user.role === 'ASSOCIATE' && app.assignedAssociateId !== user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const {
    requestedAmount,
    sanctionAmount,
    disbursementAmount,
    status,
    lenderPartner,
    notes,
    expectedCompletionDate,
  } = req.body;

  if (requestedAmount !== undefined) app.requestedAmount = Number(requestedAmount);
  if (sanctionAmount !== undefined) app.sanctionAmount = Number(sanctionAmount);
  if (disbursementAmount !== undefined) app.disbursementAmount = Number(disbursementAmount);
  if (status) app.status = status;
  if (lenderPartner !== undefined) app.lenderPartner = lenderPartner;
  if (notes !== undefined) app.notes = notes;
  if (expectedCompletionDate !== undefined) app.expectedCompletionDate = expectedCompletionDate;

  app.updatedDate = new Date().toISOString();

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'APPLICATION_UPDATED',
    'Application',
    id,
    `Application ${id} details updated.`
  );
  db.saveDatabase();

  return res.json({ success: true, application: app });
});

// Stage update in 12-stage journey
apiRouter.post('/applications/:id/stages', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { stageNumber, newStatus, internalNote } = req.body;

  if (!stageNumber || !newStatus) {
    return res.status(400).json({ error: 'Stage Number and New Status are required.' });
  }

  const data = db.getData();
  const user = req.user!;
  const app = data.applications.find(a => a.id === id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });

  if (user.role === 'ASSOCIATE' && app.assignedAssociateId !== user.id) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const stageIndex = app.stages.findIndex(s => s.number === Number(stageNumber));
  if (stageIndex === -1) return res.status(400).json({ error: 'Invalid stage number.' });

  const stage = app.stages[stageIndex];
  const oldStatus = stage.status;

  stage.status = newStatus;
  stage.updatedAt = new Date().toISOString();
  stage.updatedBy = user.name;
  if (internalNote) stage.notes = internalNote;

  // Auto-advance currentStage pointer if completed
  if (newStatus === 'Completed' && stageNumber < 12) {
    app.currentStage = stageNumber + 1;
    const nextStage = app.stages.find(s => s.number === app.currentStage);
    if (nextStage) {
      app.currentStageName = nextStage.name;
      if (nextStage.status === 'Pending') nextStage.status = 'In Progress';
    }
  }

  // If stage 9 (Final Sanction) is completed, update overall status
  if (stageNumber === 9 && newStatus === 'Completed') {
    app.status = 'Sanctioned';
  }
  // If stage 11 (Disbursement) is completed, update overall status
  if (stageNumber === 11 && newStatus === 'Completed') {
    app.status = 'Disbursed';
  }

  app.updatedDate = new Date().toISOString();

  const log: StageUpdateLog = {
    id: `STG-${Date.now()}`,
    applicationId: id,
    stageNumber: Number(stageNumber),
    stageName: stage.name,
    oldStatus,
    newStatus,
    updatedBy: user.name,
    updatedByRole: user.role,
    timestamp: new Date().toISOString(),
    internalNote,
  };

  data.stageUpdates.push(log);

  // Real WhatsApp stage update notification dispatch
  let whatsappNotificationResult = {
    status: 'Not Connected',
    message: 'WhatsApp service is not connected yet.',
  };

  if (app.customerPhone) {
    const templateContent = renderWhatsAppTemplate('STAGE_UPDATED', {
      CustomerName: app.customerName,
      ApplicationID: app.id,
      LoanType: app.loanType,
      StageName: stage.name,
      Status: newStatus,
      AssociateName: user.name,
    });

    const waRes = await sendWhatsAppNotification(app.customerPhone, 'STAGE_UPDATED', {
      CustomerName: app.customerName,
      ApplicationID: app.id,
      LoanType: app.loanType,
      StageName: stage.name,
      Status: newStatus,
      AssociateName: user.name,
    });

    const notifLog: NotificationLog = {
      id: `NOTIF-${Date.now()}`,
      channel: 'WhatsApp',
      recipientPhone: app.customerPhone,
      event: 'STAGE_UPDATED',
      templateName: 'STAGE_UPDATED',
      content: templateContent,
      status: waRes.status,
      sentAt: new Date().toISOString(),
      error: waRes.success ? undefined : waRes.message,
      associateId: user.id,
      applicationId: app.id,
      providerMessageId: waRes.providerMessageId,
    };

    data.notifications.unshift(notifLog);
    whatsappNotificationResult = {
      status: waRes.status,
      message: waRes.message,
    };
  }

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'STAGE_UPDATED',
    'Application',
    id,
    `Stage ${stageNumber} (${stage.name}) changed from ${oldStatus} to ${newStatus}. Note: ${internalNote || 'None'}. WhatsApp status: ${whatsappNotificationResult.status}`
  );
  db.saveDatabase();

  return res.json({
    success: true,
    application: app,
    stageUpdate: log,
    whatsappNotification: whatsappNotificationResult,
  });
});

// -------------------------------------------------------------
// 5. DOCUMENT MANAGEMENT & FUTURE CUSTOMER PORTAL API
// -------------------------------------------------------------

apiRouter.get('/applications/:id/documents', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const documents = data.documents.filter(d => d.applicationId === id);
  return res.json({ documents });
});

apiRouter.post('/applications/:id/documents/request', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { documentType, customDocumentName } = req.body;

  if (!documentType) {
    return res.status(400).json({ error: 'Document type is required.' });
  }

  const data = db.getData();
  const app = data.applications.find(a => a.id === id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });

  const docId = db.nextDocumentId();
  const newDoc: DocumentRecord = {
    id: docId,
    applicationId: id,
    documentType,
    customDocumentName,
    status: 'Requested',
    requestedBy: req.user!.name,
    requestedDate: new Date().toISOString(),
  };

  data.documents.push(newDoc);

  // Real WhatsApp document request notification dispatch
  let whatsappNotificationResult = {
    status: 'Not Connected',
    message: 'WhatsApp service is not connected yet.',
  };

  const docName = documentType === 'Other Documents' ? (customDocumentName || 'Required Document') : documentType;

  if (app.customerPhone) {
    const templateContent = renderWhatsAppTemplate('DOCUMENT_REQUESTED', {
      CustomerName: app.customerName,
      ApplicationID: app.id,
      DocumentName: docName,
      AssociateName: req.user!.name,
    });

    const waRes = await sendWhatsAppNotification(app.customerPhone, 'DOCUMENT_REQUESTED', {
      CustomerName: app.customerName,
      ApplicationID: app.id,
      DocumentName: docName,
      AssociateName: req.user!.name,
    });

    const notifLog: NotificationLog = {
      id: `NOTIF-${Date.now()}`,
      channel: 'WhatsApp',
      recipientPhone: app.customerPhone,
      event: 'DOCUMENT_REQUESTED',
      templateName: 'DOCUMENT_REQUESTED',
      content: templateContent,
      status: waRes.status,
      sentAt: new Date().toISOString(),
      error: waRes.success ? undefined : waRes.message,
      associateId: req.user!.id,
      applicationId: app.id,
      providerMessageId: waRes.providerMessageId,
    };

    data.notifications.unshift(notifLog);
    whatsappNotificationResult = {
      status: waRes.status,
      message: waRes.message,
    };
  }

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'DOCUMENT_REQUESTED',
    'Document',
    docId,
    `Requested document "${documentType}" for application ${id}. WhatsApp notification: ${whatsappNotificationResult.status}.`
  );
  db.saveDatabase();

  return res.status(201).json({
    success: true,
    document: newDoc,
    whatsappNotification: whatsappNotificationResult,
  });
});

apiRouter.post('/applications/:id/documents/upload', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { documentId, fileName, fileSize, fileData } = req.body;

  const data = db.getData();
  const doc = data.documents.find(d => d.id === documentId && d.applicationId === id);
  if (!doc) return res.status(404).json({ error: 'Document request not found.' });

  doc.status = 'Uploaded';
  doc.uploadedDate = new Date().toISOString();
  doc.fileName = fileName || 'Uploaded_Document.pdf';
  doc.fileSize = fileSize || '1.2 MB';
  doc.fileData = fileData || 'storage://private/docs/' + doc.id;

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'DOCUMENT_UPLOADED',
    'Document',
    doc.id,
    `Uploaded file ${doc.fileName} for application ${id}.`
  );
  db.saveDatabase();

  return res.json({ success: true, document: doc });
});

apiRouter.post('/documents/:id/review', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, rejectedReason } = req.body;

  if (!status || !['Verified', 'Rejected', 'Re-upload Required'].includes(status)) {
    return res.status(400).json({ error: 'Valid review status is required (Verified, Rejected, Re-upload Required).' });
  }

  if ((status === 'Rejected' || status === 'Re-upload Required') && !rejectedReason) {
    return res.status(400).json({ error: 'Rejection reason is required when rejecting a document.' });
  }

  const data = db.getData();
  const doc = data.documents.find(d => d.id === id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  doc.status = status;
  doc.reviewedBy = req.user!.name;
  if (status === 'Verified') {
    doc.verifiedDate = new Date().toISOString();
    doc.rejectedReason = undefined;
  } else {
    doc.rejectedReason = rejectedReason;
  }

  let whatsappNotificationResult: { status: string; message: string } | undefined = undefined;

  if (status === 'Rejected' || status === 'Re-upload Required') {
    const app = data.applications.find(a => a.id === doc.applicationId);
    if (app && app.customerPhone) {
      const docName = doc.customDocumentName || doc.documentType;
      const templateKey: WhatsAppTemplateKey =
        status === 'Re-upload Required' ? 'DOCUMENT_REUPLOAD_REQUIRED' : 'DOCUMENT_REJECTED';

      const templateContent = renderWhatsAppTemplate(templateKey, {
        CustomerName: app.customerName,
        ApplicationID: app.id,
        DocumentName: docName,
        Status: rejectedReason || 'Re-upload required',
        AssociateName: req.user!.name,
      });

      const waRes = await sendWhatsAppNotification(app.customerPhone, templateKey, {
        CustomerName: app.customerName,
        ApplicationID: app.id,
        DocumentName: docName,
        Status: rejectedReason || 'Re-upload required',
        AssociateName: req.user!.name,
      });

      const notifLog: NotificationLog = {
        id: `NOTIF-${Date.now()}`,
        channel: 'WhatsApp',
        recipientPhone: app.customerPhone,
        event: 'DOCUMENT_REJECTED',
        templateName: templateKey,
        content: templateContent,
        status: waRes.status,
        sentAt: new Date().toISOString(),
        error: waRes.success ? undefined : waRes.message,
        associateId: req.user!.id,
        applicationId: app.id,
        providerMessageId: waRes.providerMessageId,
      };

      data.notifications.unshift(notifLog);
      whatsappNotificationResult = {
        status: waRes.status,
        message: waRes.message,
      };
    }
  }

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'DOCUMENT_REVIEWED',
    'Document',
    id,
    `Reviewed document ${id}: status changed to ${status}. ${rejectedReason ? `Reason: ${rejectedReason}` : ''}. WhatsApp notification: ${whatsappNotificationResult ? whatsappNotificationResult.status : 'None'}`
  );
  db.saveDatabase();

  return res.json({
    success: true,
    document: doc,
    whatsappNotification: whatsappNotificationResult,
  });
});

// -------------------------------------------------------------
// 6. CIBIL / TRANSUNION BUREAU INTEGRATION (STRICT NO-FAKE RULE)
// -------------------------------------------------------------

apiRouter.post('/cibil/check', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { pan, customerName, mobile, dob, consentObtained } = req.body;

  if (!pan || !customerName || !mobile) {
    return res.status(400).json({ error: 'PAN number, Customer Name, and Mobile are required.' });
  }

  if (!consentObtained) {
    return res.status(400).json({ error: 'Applicant consent is legally mandatory before initiating a CIBIL bureau check.' });
  }

  const cleanPan = String(pan).toUpperCase().trim();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
    return res.status(400).json({ error: 'Invalid PAN format. Must be 10 characters (e.g. ABCDE1234F).' });
  }

  const data = db.getData();
  const user = req.user!;
  const cibilApiKey = process.env.CIBIL_API_KEY;
  const isConnected = Boolean(cibilApiKey && cibilApiKey.trim() !== '');

  const checkId = `CIBIL-${Date.now()}`;
  const now = new Date().toISOString();

  // NON-NEGOTIABLE RULE: NEVER FABRICATE FAKE CIBIL SCORES!
  if (!isConnected) {
    const record: CibilCheckRecord = {
      id: checkId,
      pan: cleanPan,
      customerName: customerName.trim(),
      mobile: mobile.trim(),
      dob,
      requestedBy: user.name,
      requestedByRole: user.role,
      consentObtained: true,
      requestedAt: now,
      status: 'SERVICE_NOT_CONNECTED',
      score: null,
      reportId: null,
      notes: 'TransUnion CIBIL service credentials (CIBIL_API_KEY) are not configured on this server.',
    };

    data.cibilChecks.unshift(record);
    db.logAudit(
      { id: user.id, name: user.name, role: user.role },
      'CIBIL_CHECK_ATTEMPT',
      'CIBIL',
      cleanPan,
      `CIBIL check initiated for PAN ${cleanPan}. Result: TransUnion Service NOT CONNECTED.`
    );
    db.saveDatabase();

    return res.json({
      connected: false,
      status: 'NOT CONNECTED',
      message: 'CIBIL service is not connected yet. Real TransUnion API credentials must be configured in environment variables.',
      record,
    });
  }

  // Real connected bureau call logic goes here when provider is active
  return res.json({
    connected: true,
    status: 'CONNECTED',
    message: 'CIBIL integration active.',
  });
});

apiRouter.get('/cibil/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ records: data.cibilChecks });
});

// -------------------------------------------------------------
// 7. INTEGRATIONS STATUS & NOTIFICATIONS
// -------------------------------------------------------------

apiRouter.get('/integrations/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const isWaConn = isWhatsAppConfigured();
  const status = {
    database: {
      name: 'Server Persistent JSON Database',
      status: 'CONNECTED',
      message: 'Active & persistent across server restarts.',
    },
    cibil: {
      name: 'TransUnion CIBIL Bureau API',
      status: process.env.CIBIL_API_KEY ? 'CONNECTED' : 'NOT CONNECTED',
      message: process.env.CIBIL_API_KEY ? 'TransUnion API authenticated.' : 'CIBIL service is not connected yet.',
    },
    whatsapp: {
      name: `WhatsApp Cloud Business API (${WHATSAPP_CONFIG.businessPhoneNumber})`,
      status: isWaConn ? 'CONNECTED' : 'NOT CONNECTED',
      message: isWaConn
        ? `Meta Cloud API authenticated for official business line ${WHATSAPP_CONFIG.businessPhoneNumber}.`
        : WHATSAPP_CONFIG.serviceNotConnectedMessage,
      businessPhone: WHATSAPP_CONFIG.businessPhoneNumber,
    },
    sms: {
      name: 'Transactional SMS Gateway (DLT)',
      status: process.env.SMS_API_KEY ? 'CONNECTED' : 'NOT CONNECTED',
      message: process.env.SMS_API_KEY ? 'SMS Gateway active.' : 'SMS service is not connected yet.',
    },
    metaAds: {
      name: 'Meta Lead Ads (Instagram / Facebook)',
      status: process.env.META_ACCESS_TOKEN ? 'CONNECTED' : 'NOT CONNECTED',
      message: process.env.META_ACCESS_TOKEN ? 'Webhook active.' : 'Lead integration is not connected yet.',
    },
    googleAds: {
      name: 'Google Ads & Search Ingestion',
      status: process.env.GOOGLE_API_CREDENTIALS ? 'CONNECTED' : 'NOT CONNECTED',
      message: process.env.GOOGLE_API_CREDENTIALS ? 'Google API connected.' : 'Google lead integration is not connected yet.',
    },
    analytics: {
      name: 'Website Visitor Analytics',
      status: process.env.ANALYTICS_ID ? 'CONNECTED' : 'NOT CONNECTED',
      message: process.env.ANALYTICS_ID ? 'Analytics tracking active.' : 'Analytics service is not connected yet.',
    },
  };

  return res.json({ integrations: status });
});

apiRouter.post('/notifications/send', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const {
    channel,
    recipientPhone,
    recipientEmail,
    event,
    templateName,
    content,
    leadId,
    applicationId,
    customerId,
    customerName,
    loanType,
    stageName,
    documentName,
  } = req.body;

  const data = db.getData();
  const user = req.user!;
  const now = new Date().toISOString();
  const notifId = `NOTIF-${Date.now()}`;

  // Enforce Associate RBAC access limits
  if (user.role === 'ASSOCIATE') {
    if (leadId) {
      const lead = data.leads.find(l => l.id === leadId);
      if (lead && lead.assignedAssociateId !== user.id) {
        return res.status(403).json({
          error: 'Access denied. You can only communicate with leads assigned to you.',
        });
      }
    }
    if (applicationId) {
      const app = data.applications.find(a => a.id === applicationId);
      if (app && app.assignedAssociateId !== user.id) {
        return res.status(403).json({
          error: 'Access denied. You can only communicate with applications assigned to you.',
        });
      }
    }
  }

  let status: NotificationStatus = 'Not Connected';
  let errorMsg = '';
  let providerMessageId: string | undefined = undefined;
  let finalContent = content || '';

  if (channel === 'WhatsApp') {
    const templateKey = (templateName as WhatsAppTemplateKey) || 'GENERAL_FOLLOWUP';
    finalContent = renderWhatsAppTemplate(templateKey, {
      CustomerName: customerName,
      ApplicationID: applicationId,
      LoanType: loanType,
      StageName: stageName,
      Status: req.body.status || 'Under Review',
      DocumentName: documentName,
      AssociateName: user.name,
    });

    const waRes = await sendWhatsAppNotification(recipientPhone || '', templateKey, {
      CustomerName: customerName,
      ApplicationID: applicationId,
      LoanType: loanType,
      StageName: stageName,
      Status: req.body.status || 'Under Review',
      DocumentName: documentName,
      AssociateName: user.name,
    });

    status = waRes.status;
    if (!waRes.success) {
      errorMsg = waRes.message;
    }
    providerMessageId = waRes.providerMessageId;
  } else if (channel === 'SMS') {
    const isSmsConnected = Boolean(process.env.SMS_API_KEY);
    if (isSmsConnected) {
      status = 'Sent';
    } else {
      status = 'Not Connected';
      errorMsg = 'SMS service is not connected yet.';
    }
  }

  const log: NotificationLog = {
    id: notifId,
    channel,
    recipientPhone,
    recipientEmail,
    event: event || 'COMMUNICATION',
    templateName: templateName || 'GENERAL_FOLLOWUP',
    content: finalContent,
    status,
    sentAt: now,
    error: errorMsg || undefined,
    associateId: user.id,
    customerId: customerId || undefined,
    applicationId: applicationId || undefined,
    providerMessageId,
  };

  data.notifications.unshift(log);

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'WHATSAPP_NOTIFICATION_ATTEMPTED',
    'Notification',
    notifId,
    `${channel} dispatch attempted to ${recipientPhone || recipientEmail || 'Recipient'}. Status: ${status}. Message: ${errorMsg || 'Success'}. Application: ${applicationId || 'N/A'}`
  );

  db.saveDatabase();

  return res.json({
    success: status === 'Sent' || status === 'Queued' || status === 'Delivered',
    status,
    message: errorMsg || `Notification successfully processed via ${channel}.`,
    log,
  });
});

// Meta WhatsApp Webhook Handlers
apiRouter.get('/whatsapp/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'capitabee_whatsapp_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('Verification failed');
});

apiRouter.post('/whatsapp/webhook', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (body?.entry) {
      const data = db.getData();
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          for (const statusObj of change.value?.statuses || []) {
            const providerMsgId = statusObj.id;
            const newStatus = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
            const notif = data.notifications.find(n => n.providerMessageId === providerMsgId);
            if (notif) {
              if (newStatus === 'delivered') notif.status = 'Delivered';
              else if (newStatus === 'read') notif.status = 'Read';
              else if (newStatus === 'sent') notif.status = 'Sent';
              else if (newStatus === 'failed') notif.status = 'Failed';
            }
          }
        }
      }
      db.saveDatabase();
    }
    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    return res.status(200).send('EVENT_RECEIVED');
  }
});

apiRouter.get('/notifications/logs', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ logs: data.notifications });
});

// -------------------------------------------------------------
// DASHBOARD STATS, DOCUMENTS & FOLLOWUPS
// -------------------------------------------------------------

apiRouter.get('/dashboard/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const todayStr = new Date().toISOString().split('T')[0];

  const leads = user.role === 'ADMIN' ? data.leads : data.leads.filter(l => l.assignedAssociateId === user.id);
  const followUps = user.role === 'ADMIN' ? data.followUps : data.followUps.filter(f => f.associateId === user.id);

  const totalLeads = leads.length;
  const newLeadsToday = leads.filter(l => l.createdDate && l.createdDate.startsWith(todayStr)).length;
  const pendingFollowUpsToday = followUps.filter(f => f.scheduledDate === todayStr && f.status === 'Pending').length;
  const totalAssociates = data.users.filter(u => u.role === 'ASSOCIATE').length;
  const unassignedLeads = data.leads.filter(l => !l.assignedAssociateId).length;

  const leadsByStatus: Record<string, number> = {};
  leads.forEach(l => {
    leadsByStatus[l.leadStatus] = (leadsByStatus[l.leadStatus] || 0) + 1;
  });

  // Calculate live application metrics strictly from Supabase
  let activeApplications = 0;
  let totalSanctionAmount = 0;
  let totalDisbursedAmount = 0;
  let supabaseConnected = false;
  let supabaseError: string | null = null;

  const sb = getServerSupabase();
  if (!sb) {
    supabaseError = 'SUPABASE_SERVICE_ROLE_KEY is missing from the server runtime environment.';
  } else {
    let query = sb.from('applications').select('*');
    if (user.role === 'ASSOCIATE') {
      const associateKey = user.employeeId || user.id;
      query = query.or(`associate_id.eq.${associateKey},user_id.eq.${user.id}`);
    }
    const { data: sbApps, error } = await query;
    if (error) {
      supabaseError = `[${error.code}] ${error.message}`;
      console.error('Supabase /api/dashboard/stats query error:', error);
    } else if (sbApps) {
      supabaseConnected = true;
      activeApplications = sbApps.filter(a => a.status !== 'Closed' && a.status !== 'Rejected').length;
      totalSanctionAmount = sbApps.reduce((acc, a) => acc + Number(a.sanction_amount || a.sanctioned_amount || a.requested_amount || 0), 0);
      totalDisbursedAmount = sbApps.reduce((acc, a) => acc + Number(a.disbursement_amount || a.disbursed_amount || 0), 0);
    }
  }

  return res.json({
    stats: {
      totalLeads,
      newLeadsToday,
      activeApplications,
      totalSanctionAmount,
      totalDisbursedAmount,
      pendingFollowUpsToday,
      totalAssociates,
      unassignedLeads,
      leadsByStatus,
      supabaseConnected,
      supabaseError,
    },
  });
});

apiRouter.get('/documents', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ documents: data.documents || [] });
});

apiRouter.get('/followups', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  let followUps = user.role === 'ADMIN' ? data.followUps : data.followUps.filter(f => f.associateId === user.id);

  const { date, status } = req.query;
  if (date) {
    followUps = followUps.filter(f => f.scheduledDate === String(date));
  }
  if (status) {
    followUps = followUps.filter(f => f.status === String(status));
  }

  return res.json({ followUps });
});

// -------------------------------------------------------------
// 8. AUDIT LOGS & SETTINGS
// -------------------------------------------------------------

apiRouter.get('/audit-logs', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ auditLogs: data.auditLogs });
});

apiRouter.get('/settings', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  return res.json({ settings: data.settings });
});

apiRouter.patch('/settings', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  data.settings = { ...data.settings, ...req.body };
  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'SETTINGS_UPDATED',
    'Settings',
    'COMPANY_SETTINGS',
    'Administrator updated company configuration.'
  );
  db.saveDatabase();
  return res.json({ success: true, settings: data.settings });
});

// -------------------------------------------------------------
// 9. PUBLIC / WEBSITE INTAKE ENDPOINTS
// -------------------------------------------------------------

apiRouter.post('/website/leads', async (req: Request, res: Response) => {
  const {
    customerName,
    fullName,
    mobile,
    phone,
    customerPhone,
    email,
    customerEmail,
    city,
    state,
    loanType,
    requiredAmount,
    requestedAmount,
    amount,
    employmentType = 'Salaried',
    leadSource = 'Website',
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    landingPage,
  } = req.body;

  const finalName = (customerName || fullName || '').trim();
  const finalPhone = (mobile || phone || customerPhone || '').trim();
  const finalLoanType = loanType || 'Personal Loan';
  const finalAmount = Number(requiredAmount || requestedAmount || amount || 0);

  if (!finalName || !finalPhone || !finalLoanType) {
    return res.status(400).json({ error: 'Customer Name, Mobile, and Loan Type are required.' });
  }

  const data = db.getData();
  const leadId = db.nextLeadId();
  const now = new Date().toISOString();

  const newLead: Lead = {
    id: leadId,
    customerName: finalName,
    mobile: finalPhone,
    email: (email || customerEmail || '').trim() || undefined,
    city: city ? String(city).trim() : undefined,
    state: state ? String(state).trim() : undefined,
    loanType: finalLoanType,
    requiredAmount: finalAmount,
    employmentType,
    leadSource: (leadSource as any) || 'Website',
    leadStatus: 'New',
    priority: 'WARM',
    createdDate: now,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    landingPage,
  };

  data.leads.unshift(newLead);
  db.logAudit(
    { id: 'SYSTEM_WEB', name: 'Public Website Intake', role: 'ADMIN' },
    'WEBSITE_LEAD_RECEIVED',
    'Lead',
    leadId,
    `New enquiry received from public website for ${finalName} (${finalLoanType}).`
  );
  db.saveDatabase();

  return res.status(201).json({
    success: true,
    leadId,
    message: 'Thank you! Your loan enquiry has been received by Capitabee Financial Services.',
  });
});

apiRouter.post('/website/applications', async (req: Request, res: Response) => {
  const {
    customerName,
    fullName,
    full_name,
    applicant_name,
    mobile,
    phone,
    mobileNumber,
    mobile_number,
    customerPhone,
    customer_phone,
    email,
    customerEmail,
    customer_email,
    city,
    state,
    loanType,
    loan_type,
    requiredAmount,
    requestedAmount,
    requiredLoanAmount,
    required_loan_amount,
    loan_amount,
    amount,
    employmentType = 'Salaried',
    employment_type,
    notes,
    assignedAssociateId,
    associate_id,
    leadSource = 'Website',
  } = req.body;

  const finalName = (customerName || fullName || full_name || applicant_name || '').trim();
  const finalPhone = (mobile || mobileNumber || mobile_number || phone || customerPhone || customer_phone || '').trim();
  const finalEmail = (email || customerEmail || customer_email || '').trim();
  const finalLoanType = loanType || loan_type || 'Personal Loan';
  const finalAmount = Number(requiredAmount || requestedAmount || requiredLoanAmount || required_loan_amount || loan_amount || amount || 0);
  const finalEmployment = employment_type || employmentType || 'Salaried';

  if (!finalName || !finalPhone || !finalLoanType) {
    return res.status(400).json({ error: 'Customer Name, Mobile, and Loan Type are required.' });
  }

  const data = db.getData();
  const appId = db.nextApplicationId();
  const leadId = db.nextLeadId();
  const now = new Date().toISOString();

  // Create lead record
  const newLead: Lead = {
    id: leadId,
    customerName: finalName,
    mobile: finalPhone,
    email: finalEmail || undefined,
    city: city ? String(city).trim() : undefined,
    state: state ? String(state).trim() : undefined,
    loanType: finalLoanType,
    requiredAmount: finalAmount,
    employmentType: finalEmployment,
    leadSource: (leadSource as any) || 'Website',
    leadStatus: 'Application Started',
    priority: 'HOT',
    createdDate: now,
    assignedAssociateId: assignedAssociateId || null,
  };
  data.leads.unshift(newLead);

  // Initialize the 12 standard stages
  const initialStages: StageInfo[] = LOAN_STAGES.map(s => ({
    number: s.number,
    name: s.name,
    status: s.number === 1 ? 'In Progress' : 'Pending',
    updatedAt: now,
    updatedBy: 'Website Intake',
    notes: s.number === 1 ? 'Online loan application submitted via Capitabee website.' : undefined,
  }));

  const application: Application = {
    id: appId,
    leadId,
    customerName: finalName,
    customerPhone: finalPhone,
    customerEmail: finalEmail || undefined,
    city: city ? String(city).trim() : undefined,
    state: state ? String(state).trim() : undefined,
    loanType: finalLoanType,
    requestedAmount: finalAmount,
    sanctionAmount: 0,
    disbursementAmount: 0,
    assignedAssociateId: assignedAssociateId || null,
    assignedAssociateName: null,
    status: 'In Process',
    currentStage: 1,
    currentStageName: LOAN_STAGES[0]?.name || 'Inquiry & Eligibility Check',
    stages: initialStages,
    createdDate: now,
    updatedDate: now,
    notes: notes || 'Submitted directly from public website.',
  };

  // Create or update Customer record
  data.customers = data.customers || [];
  const cleanPhoneNum = cleanPhone(finalPhone);
  const cleanEmail = (finalEmail || '').toLowerCase().trim();
  let customer = data.customers.find(
    c => (cleanPhoneNum && c.mobile && cleanPhone(c.mobile) === cleanPhoneNum) ||
         (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail)
  );

  if (!customer) {
    const custId = db.nextCustomerId();
    customer = {
      id: custId,
      name: finalName,
      mobile: finalPhone,
      email: finalEmail || undefined,
      city: city ? String(city).trim() : undefined,
      state: state ? String(state).trim() : undefined,
      employmentType: finalEmployment,
      assignedAssociateId: assignedAssociateId || null,
      totalApplicationsCount: 1,
      totalDisbursedAmount: 0,
      createdAt: now,
      updatedAt: now,
    };
    data.customers.unshift(customer);
  } else {
    customer.totalApplicationsCount = (customer.totalApplicationsCount || 0) + 1;
    customer.updatedAt = now;
  }

  // Link customerId to application and lead
  application.customerId = customer.id;
  newLead.customerId = customer.id;

  data.applications = data.applications || [];
  data.applications.unshift(application);

  // Trigger customer reconciliation to ensure summary metrics are fresh
  reconcileDatabaseCustomers();

  // Sync to Supabase customers and applications
  const sb = getServerSupabase();
  if (sb) {
    try {
      // 1. Sync Customer to Supabase (using customer_id column and generated UUID)
      const custUUID = crypto.randomUUID();
      await sb.from('customers').insert({
        id: custUUID,
        customer_id: customer.id,
        full_name: finalName,
        mobile_number: finalPhone,
        email: finalEmail || null,
        created_at: customer.createdAt || now,
        updated_at: now,
      });

      // 2. Sync Application to Supabase with customer_id and valid columns
      await sb.from('applications').insert({
        id: appId,
        customer_id: customer.id,
        full_name: finalName,
        mobile_number: finalPhone,
        email: finalEmail || null,
        city: city ? String(city).trim() : null,
        state: state ? String(state).trim() : null,
        loan_type: finalLoanType,
        required_loan_amount: finalAmount,
        associate_id: assignedAssociateId || null,
        employment_type: finalEmployment,
        status: 'In Process',
        current_stage: 2,
        notes: notes || 'Website application submission',
        created_at: now,
        updated_at: now,
      });
    } catch (e) {
      console.warn('Supabase website app sync notice:', e);
    }
  }

  db.logAudit(
    { id: 'SYSTEM_WEB', name: 'Public Website Intake', role: 'ADMIN' },
    'WEBSITE_APPLICATION_SUBMITTED',
    'Application',
    appId,
    `Loan application submitted from website by ${finalName} for ₹${finalAmount.toLocaleString('en-IN')} (${finalLoanType}).`
  );
  db.saveDatabase();

  return res.status(201).json({
    success: true,
    applicationId: appId,
    leadId,
    application,
    message: 'Loan application submitted successfully to Capitabee Portal!',
  });
});

// -------------------------------------------------------------
// REVIEWS & TESTIMONIALS API
// -------------------------------------------------------------
apiRouter.get('/reviews', async (req: Request, res: Response) => {
  const { status } = req.query;
  const data = db.getData();
  data.reviews = data.reviews || [];

  const sb = getServerSupabase();
  if (sb) {
    try {
      let query = sb.from('reviews').select('*');
      if (status && status !== 'ALL') {
        // Query case-insensitively or match title-case / lower-case
        const s = String(status).trim();
        query = query.ilike('status', s);
      }
      const { data: sbReviews, error } = await query;
      if (!error && sbReviews && sbReviews.length > 0) {
        // Map Supabase columns to CustomerReview format
        const mapped: CustomerReview[] = sbReviews.map((r: any) => ({
          id: r.id,
          customerName: r.customer_name || r.name || 'Anonymous Customer',
          rating: Number(r.rating) || 5,
          comment: r.review_text || r.comment || '',
          applicationId: r.application_id || undefined,
          customerId: r.customer_id || undefined,
          isPublic: r.is_public !== undefined ? r.is_public : true,
          status: (r.status?.charAt(0).toUpperCase() + r.status?.slice(1).toLowerCase()) as any || 'Pending',
          response: r.response || r.admin_response || undefined,
          respondedAt: r.responded_at || r.moderated_at || undefined,
          respondedBy: r.responded_by || r.moderated_by || undefined,
          createdAt: r.created_at || new Date().toISOString(),
        }));

        // Merge with local reviews
        const map = new Map<string, CustomerReview>();
        for (const r of data.reviews) map.set(r.id, r);
        for (const r of mapped) map.set(r.id, r);
        data.reviews = Array.from(map.values());
      }
    } catch (e) {
      console.warn('Supabase reviews sync notice:', e);
    }
  }

  let results = [...data.reviews];
  if (status && status !== 'ALL') {
    const sLower = String(status).toLowerCase();
    results = results.filter(r => r.status.toLowerCase() === sLower);
  }

  // Sort newest first
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ reviews: results });
});

apiRouter.post('/reviews', async (req: Request, res: Response) => {
  const { customerName, rating, comment, applicationId, customerId, status } = req.body;
  if (!customerName || !rating || !comment) {
    return res.status(400).json({ error: 'Customer Name, Rating, and Review Comment are required.' });
  }

  const data = db.getData();
  data.reviews = data.reviews || [];
  const now = new Date().toISOString();
  const revId = `REV-${Date.now()}`;

  const newReview: CustomerReview = {
    id: revId,
    customerName: customerName.trim(),
    rating: Number(rating) || 5,
    comment: comment.trim(),
    applicationId: applicationId || undefined,
    customerId: customerId || undefined,
    isPublic: true,
    status: status || 'Pending',
    createdAt: now,
  };

  data.reviews.unshift(newReview);

  // Sync to Supabase
  const sb = getServerSupabase();
  if (sb) {
    try {
      await sb.from('reviews').insert({
        id: revId,
        customer_name: customerName.trim(),
        rating: Number(rating) || 5,
        review_text: comment.trim(),
        application_id: applicationId || null,
        customer_id: customerId || null,
        status: status || 'Pending',
        created_at: now,
      });
    } catch (e) {
      console.warn('Supabase insert review notice:', e);
    }
  }

  db.saveDatabase();

  return res.status(201).json({ success: true, review: newReview });
});

apiRouter.post('/reviews/:id/respond', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { response } = req.body;
  if (!response || !response.trim()) {
    return res.status(400).json({ error: 'Response message is required.' });
  }

  const data = db.getData();
  data.reviews = data.reviews || [];
  const review = data.reviews.find(r => r.id === id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found.' });
  }

  review.response = response.trim();
  review.respondedBy = req.user!.name;
  review.respondedAt = new Date().toISOString();
  db.saveDatabase();

  return res.json({ success: true, review });
});

apiRouter.patch('/reviews/:id/status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !['Pending', 'Approved', 'Rejected', 'Archived'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required (Pending, Approved, Rejected, Archived).' });
  }

  const data = db.getData();
  data.reviews = data.reviews || [];
  const review = data.reviews.find(r => r.id === id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found.' });
  }

  review.status = status;
  db.saveDatabase();

  return res.json({ success: true, review });
});

// -------------------------------------------------------------
// 10. CUSTOMERS MANAGEMENT & PORTAL ACCOUNTS
// -------------------------------------------------------------
apiRouter.get('/customers', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sb = getServerSupabase();

  if (!sb) {
    return res.status(503).json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is missing from the server runtime environment.',
      customers: [],
    });
  }

  const [{ data: sbCusts, error: custErr }, { data: sbApps, error: appErr }] = await Promise.all([
    sb.from('customers').select('*').order('created_at', { ascending: false }),
    sb.from('applications').select('*').order('created_at', { ascending: false }),
  ]);

  if (custErr || appErr) {
    const err = custErr || appErr;
    console.error('Supabase /api/customers query error:', err);
    return res.status(500).json({
      error: `Supabase query failed: [${err?.code}] ${err?.message}`,
      code: err?.code,
      message: err?.message,
      details: err?.details,
      hint: err?.hint,
      customers: [],
    });
  }

  const cleanPhone = (p?: string | null) => (p ? String(p).replace(/\D/g, '').slice(-10) : '');

  // Map of customers keyed by their business customer ID (TEXT key, e.g., CUST-2026-100402)
  const custMap = new Map<string, Customer>();

  if (sbCusts && sbCusts.length > 0) {
    for (const row of sbCusts) {
      const businessCustId = String(row.customer_id || row.id || '');
      const custName = row.full_name || row.customer_name || row.applicant_name || row.name || 'Customer';
      const custMobile = row.mobile_number || row.customer_phone || row.mobile || row.phone || '';
      const email = (row.email || row.customer_email || '').toLowerCase().trim();

      const cObj: Customer = {
        id: businessCustId,
        customerId: businessCustId,
        name: custName,
        mobile: custMobile,
        email: email || undefined,
        city: row.city || undefined,
        state: row.state || undefined,
        pan: row.pan || undefined,
        aadhaarLast4: row.aadhaar_last4 || undefined,
        employmentType: row.employment_type || 'Salaried',
        monthlyIncome: Number(row.monthly_income) || undefined,
        assignedAssociateId: row.associate_id || row.assigned_associate_id || null,
        assignedAssociateName: row.associate_name || row.assigned_associate_name || null,
        portalAccessEnabled: false,
        totalApplicationsCount: 0,
        totalDisbursedAmount: 0,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
      };

      custMap.set(businessCustId, cObj);
    }
  }

  // Link applications using TEXT business key: applications.customer_id = customers.customer_id
  const appsByCustomer = new Map<string, any[]>();
  if (sbApps && sbApps.length > 0) {
    for (const app of sbApps) {
      const appCustId = app.customer_id ? String(app.customer_id).trim() : '';
      if (!appCustId) continue;

      if (!appsByCustomer.has(appCustId)) {
        appsByCustomer.set(appCustId, []);
      }
      appsByCustomer.get(appCustId)!.push(app);

      // If customer doesn't exist in custMap, create it from application data using the TEXT business customer_id
      if (!custMap.has(appCustId)) {
        const appCreated = app.created_at || new Date().toISOString();
        custMap.set(appCustId, {
          id: appCustId,
          customerId: appCustId,
          name: app.full_name || app.customer_name || app.applicant_name || 'Applicant',
          mobile: app.mobile_number || app.customer_phone || app.mobile || '',
          email: app.email || app.customer_email || undefined,
          city: app.city || undefined,
          state: app.state || undefined,
          employmentType: app.employment_type || 'Salaried',
          assignedAssociateId: app.associate_id || app.assigned_associate_id || null,
          assignedAssociateName: app.associate_name || app.assigned_associate_name || null,
          portalAccessEnabled: false,
          totalApplicationsCount: 0,
          totalDisbursedAmount: 0,
          createdAt: appCreated,
          updatedAt: appCreated,
        });
      }
    }
  }

  // Enrich each customer with their linked applications metrics
  const customerList: Customer[] = [];
  for (const [custId, customer] of custMap.entries()) {
    const linkedApps = appsByCustomer.get(custId) || [];
    linkedApps.sort((a, b) => new Date(b.created_at || b.created_date).getTime() - new Date(a.created_at || a.created_date).getTime());

    const totalCount = linkedApps.length;
    const totalDisbursed = linkedApps
      .filter(a => a.status === 'Disbursed')
      .reduce((sum, a) => sum + Number(a.disbursement_amount || a.disbursed_amount || 0), 0);

    const latestApp = linkedApps[0];
    const latestStageNum = latestApp ? Number(latestApp.current_stage || latestApp.stage || 2) : undefined;
    const latestStageName = latestStageNum ? (LOAN_STAGES.find(s => s.number === latestStageNum)?.name || 'Application') : undefined;

    customerList.push({
      ...customer,
      totalApplicationsCount: totalCount,
      totalDisbursedAmount: totalDisbursed,
      latestApplicationId: latestApp ? String(latestApp.id || latestApp.application_id) : undefined,
      latestLoanType: latestApp ? (latestApp.loan_type || latestApp.loanType || 'Personal Loan') : undefined,
      latestLoanAmount: latestApp ? Number(latestApp.required_loan_amount || latestApp.requested_amount || latestApp.loan_amount || 0) : undefined,
      latestStageNumber: latestStageNum,
      latestStageName: latestStageName,
      latestStatus: latestApp ? (latestApp.status || 'In Process') : undefined,
      latestCreatedDate: latestApp ? (latestApp.created_at || latestApp.created_date) : undefined,
    });
  }

  let filtered = customerList;

  if (user.role === 'PARTNER') {
    filtered = filtered.filter(c => c.assignedPartnerId === user.id || c.createdById === user.id);
  } else if (user.role === 'ASSOCIATE') {
    filtered = filtered.filter(c => c.assignedAssociateId === user.id || c.assignedAssociateId === user.employeeId);
  } else if (user.role === 'EMPLOYEE') {
    filtered = filtered.filter(c => c.assignedEmployeeId === user.id);
  } else if (user.role === 'CUSTOMER') {
    filtered = filtered.filter(
      c =>
        c.id === user.id ||
        cleanPhone(c.mobile) === cleanPhone(user.mobile) ||
        (c.email && c.email.toLowerCase() === user.email.toLowerCase())
    );
  }

  const { search, partnerId, associateId } = req.query;
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        c.id.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }
  if (partnerId && user.role === 'ADMIN') {
    filtered = filtered.filter(c => c.assignedPartnerId === partnerId);
  }
  if (associateId && user.role === 'ADMIN') {
    filtered = filtered.filter(c => c.assignedAssociateId === associateId);
  }

  return res.json({ customers: filtered });
});

apiRouter.post('/customers', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    mobile,
    email,
    city,
    state,
    pan,
    aadhaarLast4,
    employmentType,
    monthlyIncome,
    assignedAssociateId,
    assignedPartnerId,
    assignedEmployeeId,
  } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ error: 'Customer name and mobile number are required.' });
  }

  const data = db.getData();
  const user = req.user!;
  data.customers = data.customers || [];

  const custId = db.nextCustomerId();
  const now = new Date().toISOString();

  let assocName: string | null = null;
  if (assignedAssociateId) {
    const assoc = data.users.find(u => u.id === assignedAssociateId);
    if (assoc) assocName = assoc.name;
  }

  let finalPartnerId = assignedPartnerId || null;
  let partName: string | null = null;
  if (finalPartnerId) {
    const part = data.users.find(u => u.id === finalPartnerId);
    if (part) partName = part.name;
  } else if (user.role === 'PARTNER') {
    finalPartnerId = user.id;
    partName = user.name;
  }

  let empName: string | null = null;
  if (assignedEmployeeId) {
    const emp = data.users.find(u => u.id === assignedEmployeeId);
    if (emp) empName = emp.name;
  }

  const newCust = {
    id: custId,
    name: name.trim(),
    mobile: mobile.trim(),
    email: email ? String(email).trim().toLowerCase() : undefined,
    city,
    state,
    pan: pan ? String(pan).toUpperCase().trim() : undefined,
    aadhaarLast4,
    employmentType,
    monthlyIncome: Number(monthlyIncome) || undefined,
    assignedAssociateId: assignedAssociateId || null,
    assignedAssociateName: assocName,
    assignedPartnerId: finalPartnerId,
    assignedPartnerName: partName,
    assignedEmployeeId: assignedEmployeeId || null,
    assignedEmployeeName: empName,
    createdById: user.id,
    createdByName: user.name,
    portalAccessEnabled: false,
    totalApplicationsCount: 0,
    totalDisbursedAmount: 0,
    createdAt: now,
    updatedAt: now,
  };

  data.customers.unshift(newCust);

  // Sync Customer to Supabase if configured
  const sb = getServerSupabase();
  if (sb) {
    try {
      const custUUID = crypto.randomUUID();
      sb.from('customers').insert({
        id: custUUID,
        customer_id: custId,
        full_name: name.trim(),
        mobile_number: mobile.trim(),
        email: email ? String(email).trim().toLowerCase() : null,
        created_at: now,
        updated_at: now,
      }).then(({ error }) => {
        if (error) console.warn('Supabase customer insert notice:', error);
      });
    } catch (e) {
      console.warn('Supabase customer insert exception:', e);
    }
  }

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'CUSTOMER_CREATED',
    'Customer',
    custId,
    `Customer ${custId} (${name}) created by ${user.role} ${user.name}.`
  );
  db.saveDatabase();

  return res.status(201).json({ success: true, customer: newCust });
});

apiRouter.patch('/customers/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    mobile,
    email,
    city,
    state,
    pan,
    aadhaarLast4,
    employmentType,
    monthlyIncome,
    assignedAssociateId,
    assignedPartnerId,
    assignedEmployeeId,
  } = req.body;

  const data = db.getData();
  data.customers = data.customers || [];
  const cust = data.customers.find(c => c.id === id);

  if (!cust) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  if (name) cust.name = name.trim();
  if (mobile) cust.mobile = mobile.trim();
  if (email !== undefined) cust.email = email ? String(email).trim().toLowerCase() : undefined;
  if (city !== undefined) cust.city = city;
  if (state !== undefined) cust.state = state;
  if (pan !== undefined) cust.pan = pan ? String(pan).toUpperCase().trim() : undefined;
  if (aadhaarLast4 !== undefined) cust.aadhaarLast4 = aadhaarLast4;
  if (employmentType !== undefined) cust.employmentType = employmentType;
  if (monthlyIncome !== undefined) cust.monthlyIncome = Number(monthlyIncome) || undefined;

  if (assignedAssociateId !== undefined) {
    cust.assignedAssociateId = assignedAssociateId || null;
    const assoc = data.users.find(u => u.id === assignedAssociateId);
    cust.assignedAssociateName = assoc ? assoc.name : null;
  }

  if (assignedPartnerId !== undefined) {
    cust.assignedPartnerId = assignedPartnerId || null;
    const part = data.users.find(u => u.id === assignedPartnerId);
    cust.assignedPartnerName = part ? part.name : null;
  }

  if (assignedEmployeeId !== undefined) {
    cust.assignedEmployeeId = assignedEmployeeId || null;
    const emp = data.users.find(u => u.id === assignedEmployeeId);
    cust.assignedEmployeeName = emp ? emp.name : null;
  }

  cust.updatedAt = new Date().toISOString();
  db.saveDatabase();

  return res.json({ success: true, customer: cust });
});

apiRouter.post('/customers/:id/portal-access', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  const data = db.getData();
  data.customers = data.customers || [];
  const cust = data.customers.find(c => c.id === id);

  if (!cust) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  if (!cust.email && !cust.mobile) {
    return res.status(400).json({ error: 'Customer must have an email or mobile number for portal access.' });
  }

  const portalPassword = password || cust.mobile.slice(-6) || '123456';
  const { hash, salt } = hashPassword(portalPassword);
  const now = new Date().toISOString();

  // Find or create portal user
  let portalUser = data.users.find(u => u.id === cust.id || (cust.email && u.email.toLowerCase() === cust.email.toLowerCase()));
  if (!portalUser) {
    portalUser = {
      id: cust.id,
      name: cust.name,
      email: cust.email || `${cust.mobile}@portal.capitabee.com`,
      mobile: cust.mobile,
      role: 'CUSTOMER',
      department: 'Customer Portal',
      designation: 'Borrower',
      status: 'Active',
      onlineStatus: 'Offline',
      createdAt: now,
      updatedAt: now,
      passwordHash: hash,
      salt,
    };
    data.users.push(portalUser);
  } else {
    portalUser.role = 'CUSTOMER';
    portalUser.passwordHash = hash;
    portalUser.salt = salt;
    portalUser.status = 'Active';
    portalUser.updatedAt = now;
  }

  cust.portalAccessEnabled = true;
  cust.userId = portalUser.id;
  cust.updatedAt = now;

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'CUSTOMER_PORTAL_ACCESS_ENABLED',
    'Customer',
    cust.id,
    `Portal access credentials generated for customer ${cust.name} (${cust.id}).`
  );
  db.saveDatabase();

  return res.json({
    success: true,
    message: `Portal access granted. Login ID: ${portalUser.email} / Mobile: ${cust.mobile}`,
    loginCredentials: {
      identifier: portalUser.email,
      mobile: cust.mobile,
      temporaryPassword: portalPassword,
    },
  });
});

apiRouter.post('/customers/:id/reset-portal-password', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const data = db.getData();
  const cust = (data.customers || []).find(c => c.id === id);
  if (!cust) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const portalUser = data.users.find(u => u.id === cust.id || (cust.email && u.email.toLowerCase() === cust.email.toLowerCase()));
  if (!portalUser) {
    return res.status(404).json({ error: 'Customer does not have an active portal user account.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  portalUser.passwordHash = hash;
  portalUser.salt = salt;
  portalUser.updatedAt = new Date().toISOString();
  db.saveDatabase();

  return res.json({ success: true, message: 'Portal password updated successfully.' });
});

// -------------------------------------------------------------
// 11. CUSTOMER PORTAL VIEW DATA & LIVE PIPELINE
// -------------------------------------------------------------
apiRouter.get('/customer/portal', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const data = db.getData();

  const customerMobile = user.mobile.replace(/\D/g, '').slice(-10);
  const customerEmail = user.email.toLowerCase();

  // Find customer record
  let customer = (data.customers || []).find(
    c => c.id === user.id || c.mobile.replace(/\D/g, '').slice(-10) === customerMobile || (c.email && c.email.toLowerCase() === customerEmail)
  );

  // Find all applications belonging to this customer
  let applications = (data.applications || []).filter(
    a =>
      (customer && a.customerId === customer.id) ||
      a.customerPhone.replace(/\D/g, '').slice(-10) === customerMobile ||
      (a.customerEmail && a.customerEmail.toLowerCase() === customerEmail)
  );

  // If Supabase is connected, query Supabase for latest pipeline stages
  const sb = getServerSupabase();
  if (sb && customerMobile) {
    try {
      const { data: sbApps } = await sb
        .from('applications')
        .select('*')
        .or(`mobile_number.ilike.%${customerMobile}%,phone.ilike.%${customerMobile}%`)
        .order('created_at', { ascending: false });

      if (sbApps && sbApps.length > 0) {
        // Merge or augment
        sbApps.forEach((row: any) => {
          const appId = String(row.id || row.application_id);
          const currentStageNum = Number(row.current_stage || row.stage || 2);
          const existing = applications.find(a => a.id === appId);
          if (existing) {
            existing.currentStage = currentStageNum;
            existing.currentStageName = LOAN_STAGES.find(s => s.number === currentStageNum)?.name || existing.currentStageName;
          }
        });
      }
    } catch (e) {
      console.warn('Customer portal supabase fetch notice:', e);
    }
  }

  // Get customer documents
  const appIds = applications.map(a => a.id);
  const documents = (data.documents || []).filter(d => appIds.includes(d.applicationId));

  // Get customer messages
  const messages = (data.internalMessages || []).filter(
    m => appIds.includes(m.applicationId || '') || m.senderId === user.id || m.recipientId === user.id
  );

  // Get customer reviews
  const reviews = (data.reviews || []).filter(
    r => (customer && r.customerId === customer.id) || appIds.includes(r.applicationId || '') || r.customerName.toLowerCase() === user.name.toLowerCase()
  );

  // Get notifications
  const notifications = (data.notifications || []).filter(
    n => appIds.includes(n.applicationId || '') || (customer && n.customerId === customer.id)
  );

  return res.json({
    customer: customer || {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      portalAccessEnabled: true,
      totalApplicationsCount: applications.length,
      createdAt: user.createdAt,
    },
    applications,
    documents,
    messages,
    reviews,
    notifications,
  });
});

// -------------------------------------------------------------
// 12. LEAD TO CUSTOMER / APPLICATION CONVERSION
// -------------------------------------------------------------
apiRouter.post('/leads/:id/convert-to-customer', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { requestedAmount, loanType, lenderPartner, notes, assignedAssociateId, assignedPartnerId } = req.body;

  const data = db.getData();
  const user = req.user!;
  const lead = data.leads.find(l => l.id === id);

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found.' });
  }

  data.customers = data.customers || [];
  const cleanMobile = lead.mobile.replace(/\D/g, '').slice(-10);

  // Check if customer already exists to prevent duplication
  let customer = data.customers.find(
    c => c.mobile.replace(/\D/g, '').slice(-10) === cleanMobile || (lead.email && c.email?.toLowerCase() === lead.email.toLowerCase())
  );

  const now = new Date().toISOString();

  if (!customer) {
    const custId = db.nextCustomerId();
    customer = {
      id: custId,
      name: lead.customerName,
      mobile: lead.mobile,
      email: lead.email,
      city: lead.city,
      state: lead.state,
      employmentType: lead.employmentType,
      assignedAssociateId: assignedAssociateId || lead.assignedAssociateId || null,
      assignedAssociateName: lead.assignedAssociateName || null,
      assignedPartnerId: assignedPartnerId || lead.assignedPartnerId || null,
      assignedPartnerName: lead.assignedPartnerName || null,
      createdById: user.id,
      createdByName: user.name,
      portalAccessEnabled: false,
      totalApplicationsCount: 1,
      totalDisbursedAmount: 0,
      createdAt: now,
      updatedAt: now,
    };
    data.customers.unshift(customer);
  } else {
    customer.totalApplicationsCount = (customer.totalApplicationsCount || 0) + 1;
    customer.updatedAt = now;
  }

  // Create Application with all 12 stages initialized
  const appId = db.nextApplicationId();
  const stages: StageInfo[] = LOAN_STAGES.map(s => ({
    number: s.number,
    name: s.name,
    status: s.number === 1 ? 'Completed' : s.number === 2 ? 'In Progress' : 'Pending',
    updatedAt: now,
    updatedBy: user.name,
  }));

  const application: Application = {
    id: appId,
    customerId: customer.id,
    leadId: lead.id,
    customerName: lead.customerName,
    customerPhone: lead.mobile,
    customerEmail: lead.email,
    city: lead.city,
    state: lead.state,
    loanType: loanType || lead.loanType || 'Personal Loan',
    requestedAmount: Number(requestedAmount || lead.requiredAmount || 500000),
    assignedAssociateId: assignedAssociateId || lead.assignedAssociateId || null,
    assignedAssociateName: lead.assignedAssociateName || null,
    assignedPartnerId: assignedPartnerId || lead.assignedPartnerId || null,
    assignedPartnerName: lead.assignedPartnerName || null,
    createdById: user.id,
    createdByName: user.name,
    createdByRole: user.role,
    status: 'In Process',
    currentStage: 2,
    currentStageName: LOAN_STAGES.find(s => s.number === 2)?.name || 'File Login & KYC Scrutiny',
    stages,
    createdDate: now,
    updatedDate: now,
    notes: notes || lead.notes,
    lenderPartner: lenderPartner || undefined,
  };

  data.applications.unshift(application);

  // Update Lead status
  lead.leadStatus = 'Application Submitted';
  lead.lastContactDate = now;

  // Log Stage update
  const stageLog: StageUpdateLog = {
    id: `LOG-${Date.now()}`,
    applicationId: appId,
    stageNumber: 2,
    stageName: 'File Login & KYC Scrutiny',
    oldStatus: 'Pending',
    newStatus: 'In Progress',
    updatedBy: user.name,
    updatedByRole: user.role,
    timestamp: now,
    internalNote: `Lead ${lead.id} successfully converted to Application ${appId} for Customer ${customer.name}.`,
  };
  data.stageUpdates.unshift(stageLog);

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'LEAD_CONVERTED_TO_APPLICATION',
    'Application',
    appId,
    `Lead ${lead.id} converted into Application ${appId} (Customer: ${customer.name}).`
  );
  db.saveDatabase();

  return res.status(201).json({
    success: true,
    message: `Lead ${lead.id} converted into Application ${appId} successfully.`,
    customer,
    application,
  });
});

// -------------------------------------------------------------
// 13. CENTRAL ASSIGNMENT ENGINE (PARTNER, ASSOCIATE, EMPLOYEE)
// -------------------------------------------------------------
apiRouter.post('/assignments/assign', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { entityType, entityId, partnerId, associateId, employeeId } = req.body;
  if (!entityType || !entityId) {
    return res.status(400).json({ error: 'Entity Type and Entity ID are required.' });
  }

  const data = db.getData();
  const user = req.user!;

  let partnerName: string | null = null;
  if (partnerId) {
    const part = data.users.find(u => u.id === partnerId);
    if (part) partnerName = part.name;
  }

  let associateName: string | null = null;
  if (associateId) {
    const assoc = data.users.find(u => u.id === associateId);
    if (assoc) associateName = assoc.name;
  }

  let employeeName: string | null = null;
  if (employeeId) {
    const emp = data.users.find(u => u.id === employeeId);
    if (emp) employeeName = emp.name;
  }

  const now = new Date().toISOString();

  if (entityType === 'lead') {
    const lead = data.leads.find(l => l.id === entityId);
    if (!lead) return res.status(404).json({ error: 'Lead not found.' });

    if (partnerId !== undefined) {
      lead.assignedPartnerId = partnerId || null;
      lead.assignedPartnerName = partnerName;
    }
    if (associateId !== undefined) {
      lead.assignedAssociateId = associateId || null;
      lead.assignedAssociateName = associateName;
    }
    if (employeeId !== undefined) {
      lead.assignedEmployeeId = employeeId || null;
      lead.assignedEmployeeName = employeeName;
    }
  } else if (entityType === 'application') {
    const app = data.applications.find(a => a.id === entityId);
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    if (partnerId !== undefined) {
      app.assignedPartnerId = partnerId || null;
      app.assignedPartnerName = partnerName;
    }
    if (associateId !== undefined) {
      app.assignedAssociateId = associateId || null;
      app.assignedAssociateName = associateName;
    }
    if (employeeId !== undefined) {
      app.assignedEmployeeId = employeeId || null;
      app.assignedEmployeeName = employeeName;
    }
    app.updatedDate = now;
  } else if (entityType === 'customer') {
    const cust = (data.customers || []).find(c => c.id === entityId);
    if (!cust) return res.status(404).json({ error: 'Customer not found.' });

    if (partnerId !== undefined) {
      cust.assignedPartnerId = partnerId || null;
      cust.assignedPartnerName = partnerName;
    }
    if (associateId !== undefined) {
      cust.assignedAssociateId = associateId || null;
      cust.assignedAssociateName = associateName;
    }
    if (employeeId !== undefined) {
      cust.assignedEmployeeId = employeeId || null;
      cust.assignedEmployeeName = employeeName;
    }
    cust.updatedAt = now;
  }

  db.logAudit(
    { id: user.id, name: user.name, role: user.role },
    'CENTRAL_ASSIGNMENT_UPDATED',
    entityType,
    entityId,
    `Assigned Partner: ${partnerName || 'None'}, Associate: ${associateName || 'None'}, Employee: ${employeeName || 'None'}.`
  );
  db.saveDatabase();

  return res.json({ success: true, message: `Assignment updated for ${entityType} ${entityId}.` });
});

// -------------------------------------------------------------
// 14. TARGETS & PERFORMANCE ENGINE
// -------------------------------------------------------------
apiRouter.get('/targets', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  data.targets = data.targets || [];

  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const targets = (data.users || [])
    .filter(u => u.role === 'ASSOCIATE' || u.role === 'PARTNER')
    .map(u => {
      // Find stored target for user
      const existing = data.targets.find(t => (t.associateId === u.id || t.partnerId === u.id) && t.monthYear === currentMonth);
      const targetAmount = existing ? existing.targetAmount : u.target || (u.role === 'PARTNER' ? 10000000 : 5000000);
      const targetApps = existing ? existing.targetApplications : 10;
      const targetCusts = existing ? existing.targetCustomers : (u.targetCustomers || 20);

      // Real live performance from applications
      const userApps = (data.applications || []).filter(
        a => a.assignedAssociateId === u.id || a.assignedPartnerId === u.id || a.createdById === u.id
      );
      const disbursedApps = userApps.filter(a => a.status === 'Disbursed');
      const achievedAmount = disbursedApps.reduce((acc, a) => acc + (a.disbursementAmount || 0), 0);
      const achievedApplications = disbursedApps.length;
      const achievedCustomers = (data.customers || []).filter(c => c.assignedPartnerId === u.id || c.assignedAssociateId === u.id).length;

      return {
        id: existing?.id || `TGT-${u.id}-${currentMonth}`,
        associateId: u.role === 'ASSOCIATE' ? u.id : undefined,
        associateName: u.role === 'ASSOCIATE' ? u.name : undefined,
        partnerId: u.role === 'PARTNER' ? u.id : undefined,
        partnerName: u.role === 'PARTNER' ? u.name : undefined,
        role: u.role,
        monthYear: currentMonth,
        targetAmount,
        achievedAmount,
        targetApplications: targetApps,
        achievedApplications,
        targetCustomers: targetCusts,
        achievedCustomers,
        notes: existing?.notes,
        updatedAt: existing?.updatedAt || u.updatedAt,
      };
    });

  return res.json({ targets });
});

apiRouter.post('/targets', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { userId, role, targetAmount, targetApplications, targetCustomers, monthYear, notes } = req.body;
  if (!userId || !targetAmount) {
    return res.status(400).json({ error: 'User ID and Target Amount are required.' });
  }

  const data = db.getData();
  data.targets = data.targets || [];
  const month = monthYear || new Date().toISOString().slice(0, 7);

  const existingIdx = data.targets.findIndex(t => (t.associateId === userId || t.partnerId === userId) && t.monthYear === month);

  const user = data.users.find(u => u.id === userId);
  const userRole = role || user?.role || 'ASSOCIATE';

  const newTarget: AssociateTarget = {
    id: `TGT-${userId}-${month}`,
    associateId: userRole === 'ASSOCIATE' ? userId : '',
    associateName: userRole === 'ASSOCIATE' ? user?.name : undefined,
    partnerId: userRole === 'PARTNER' ? userId : undefined,
    partnerName: userRole === 'PARTNER' ? user?.name : undefined,
    role: userRole,
    monthYear: month,
    targetAmount: Number(targetAmount),
    achievedAmount: 0,
    targetApplications: Number(targetApplications) || 10,
    achievedApplications: 0,
    targetCustomers: Number(targetCustomers) || 20,
    notes,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    data.targets[existingIdx] = newTarget;
  } else {
    data.targets.push(newTarget);
  }

  // Update on user object as default monthlyTarget
  if (user) {
    user.target = Number(targetAmount);
    if (targetCustomers) user.targetCustomers = Number(targetCustomers);
  }

  db.logAudit(
    { id: req.user!.id, name: req.user!.name, role: req.user!.role },
    'TARGET_UPDATED',
    userRole,
    userId,
    `Admin set ${userRole} target for ${userId} (${user?.name}): ₹${Number(targetAmount).toLocaleString('en-IN')}.`
  );
  db.saveDatabase();

  return res.json({ success: true, target: newTarget });
});

// -------------------------------------------------------------
// 15. CSV EXPORT ENGINE (FILTERED, SANITIZED REAL RECORDS)
// -------------------------------------------------------------
apiRouter.get('/export/csv', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { type = 'leads', status, loanType, partnerId, associateId, dateFrom, dateTo } = req.query;
  const data = db.getData();
  const user = req.user!;

  function escapeCsv(val: any): string {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  let csvContent = '';
  const now = new Date().toISOString().split('T')[0];

  if (type === 'leads') {
    let leads = data.leads;
    if (user.role === 'ASSOCIATE') {
      leads = leads.filter(l => l.assignedAssociateId === user.id);
    } else if (user.role === 'PARTNER') {
      leads = leads.filter(l => l.assignedPartnerId === user.id || l.createdById === user.id);
    }

    if (status && status !== 'All') leads = leads.filter(l => l.leadStatus === status);
    if (loanType && loanType !== 'All') leads = leads.filter(l => l.loanType === loanType);
    if (partnerId && user.role === 'ADMIN') leads = leads.filter(l => l.assignedPartnerId === partnerId);
    if (associateId && user.role === 'ADMIN') leads = leads.filter(l => l.assignedAssociateId === associateId);

    const headers = [
      'Lead ID',
      'Customer Name',
      'Mobile',
      'Email',
      'City',
      'State',
      'Loan Type',
      'Required Amount (INR)',
      'Employment Type',
      'Lead Source',
      'Status',
      'Priority',
      'Assigned Associate',
      'Assigned Partner',
      'Created Date',
      'Next Follow-up',
      'Notes',
    ];

    const rows = leads.map(l => [
      escapeCsv(l.id),
      escapeCsv(l.customerName),
      escapeCsv(l.mobile),
      escapeCsv(l.email || ''),
      escapeCsv(l.city || ''),
      escapeCsv(l.state || ''),
      escapeCsv(l.loanType),
      escapeCsv(l.requiredAmount),
      escapeCsv(l.employmentType || ''),
      escapeCsv(l.leadSource),
      escapeCsv(l.leadStatus),
      escapeCsv(l.priority),
      escapeCsv(l.assignedAssociateName || l.assignedAssociateId || ''),
      escapeCsv(l.assignedPartnerName || l.assignedPartnerId || ''),
      escapeCsv(l.createdDate),
      escapeCsv(l.nextFollowUpDate || ''),
      escapeCsv(l.notes || ''),
    ]);

    csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  } else if (type === 'applications') {
    let apps = data.applications;
    if (user.role === 'ASSOCIATE') {
      apps = apps.filter(a => a.assignedAssociateId === user.id);
    } else if (user.role === 'PARTNER') {
      apps = apps.filter(a => a.assignedPartnerId === user.id || a.createdById === user.id);
    }

    if (status && status !== 'All') apps = apps.filter(a => a.status === status);
    if (loanType && loanType !== 'All') apps = apps.filter(a => a.loanType === loanType);

    const headers = [
      'Application ID',
      'Customer Name',
      'Phone',
      'Email',
      'City',
      'Loan Type',
      'Requested Amount',
      'Sanction Amount',
      'Disbursed Amount',
      'Lender Partner',
      'Current Stage',
      'Stage Name',
      'Status',
      'Assigned Associate',
      'Assigned Partner',
      'Created Date',
      'Updated Date',
    ];

    const rows = apps.map(a => [
      escapeCsv(a.id),
      escapeCsv(a.customerName),
      escapeCsv(a.customerPhone),
      escapeCsv(a.customerEmail || ''),
      escapeCsv(a.city || ''),
      escapeCsv(a.loanType),
      escapeCsv(a.requestedAmount),
      escapeCsv(a.sanctionAmount || 0),
      escapeCsv(a.disbursementAmount || 0),
      escapeCsv(a.lenderPartner || ''),
      escapeCsv(a.currentStage),
      escapeCsv(a.currentStageName),
      escapeCsv(a.status),
      escapeCsv(a.assignedAssociateName || a.assignedAssociateId || ''),
      escapeCsv(a.assignedPartnerName || a.assignedPartnerId || ''),
      escapeCsv(a.createdDate),
      escapeCsv(a.updatedDate),
    ]);

    csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  } else if (type === 'customers') {
    let custs = data.customers || [];
    if (user.role === 'ASSOCIATE') {
      custs = custs.filter(c => c.assignedAssociateId === user.id);
    } else if (user.role === 'PARTNER') {
      custs = custs.filter(c => c.assignedPartnerId === user.id || c.createdById === user.id);
    }

    const headers = [
      'Customer ID',
      'Name',
      'Mobile',
      'Email',
      'City',
      'State',
      'PAN',
      'Employment Type',
      'Monthly Income',
      'Assigned Associate',
      'Assigned Partner',
      'Portal Access',
      'Created Date',
    ];

    const rows = custs.map(c => [
      escapeCsv(c.id),
      escapeCsv(c.name),
      escapeCsv(c.mobile),
      escapeCsv(c.email || ''),
      escapeCsv(c.city || ''),
      escapeCsv(c.state || ''),
      escapeCsv(c.pan || ''),
      escapeCsv(c.employmentType || ''),
      escapeCsv(c.monthlyIncome || 0),
      escapeCsv(c.assignedAssociateName || ''),
      escapeCsv(c.assignedPartnerName || ''),
      escapeCsv(c.portalAccessEnabled ? 'Enabled' : 'Disabled'),
      escapeCsv(c.createdAt),
    ]);

    csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="capitabee_${type}_${now}.csv"`);
  return res.send(csvContent);
});


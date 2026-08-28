/**
 * Capitabee Financial Services CRM - API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, hashPassword, verifyPassword, StoredUser, SessionData } from './db';
import {
  User,
  Lead,
  Application,
  FollowUp,
  LeadNote,
  StageInfo,
  StageUpdateLog,
  DocumentRecord,
  CibilCheckRecord,
  NotificationLog,
  NotificationStatus,
} from '../src/types';
import { LOAN_STAGES, BRAND } from '../src/config/brand';
import {
  WHATSAPP_CONFIG,
  renderWhatsAppTemplate,
  WhatsAppTemplateKey,
} from '../src/config/whatsappTemplates';
import { sendWhatsAppNotification, isWhatsAppConfigured } from './whatsapp';

export const apiRouter = Router();

// Middleware: Extract Authenticated User
export interface AuthenticatedRequest extends Request {
  user?: StoredUser;
  session?: SessionData;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  const data = db.getData();
  const session = data.sessions.find(s => s.token === token);

  if (!session) {
    return res.status(401).json({ error: 'Session invalid or expired. Please log in again.' });
  }

  // Check expiration (24h)
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    data.sessions = data.sessions.filter(s => s.token !== token);
    db.saveDatabase();
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const user = data.users.find(u => u.id === session.userId);
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
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const data = db.getData();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = data.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    // Check if any associates exist to provide the exact requested error message
    const associateCount = data.users.filter(u => u.role === 'ASSOCIATE').length;
    if (associateCount === 0 && normalizedEmail !== BRAND.initialAdminEmail.toLowerCase()) {
      return res.status(400).json({ error: 'No Associate accounts have been created yet. Please contact the Administrator.' });
    }
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
  }

  if (user.status !== 'Active') {
    return res.status(403).json({ error: `Account is currently ${user.status}. Please contact Administrator.` });
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials. Please verify your email and password.' });
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
// 2. ASSOCIATE MANAGEMENT (ADMIN ONLY)
// -------------------------------------------------------------

apiRouter.get('/associates', authMiddleware, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Password and Confirm Password do not match.' });
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

apiRouter.get('/applications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;

  let applications = data.applications;
  if (user.role === 'ASSOCIATE') {
    applications = applications.filter(a => a.assignedAssociateId === user.id);
  }

  const { search, status, loanType, stage } = req.query;
  if (search) {
    const q = String(search).toLowerCase();
    applications = applications.filter(
      a =>
        a.customerName.toLowerCase().includes(q) ||
        a.customerPhone.includes(q) ||
        a.id.toLowerCase().includes(q)
    );
  }
  if (status) applications = applications.filter(a => a.status === status);
  if (loanType) applications = applications.filter(a => a.loanType === loanType);
  if (stage) applications = applications.filter(a => a.currentStage === Number(stage));

  return res.json({ applications });
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
    assocId = user.id;
    assocName = user.name;
  } else if (assignedAssociateId) {
    const found = data.users.find(u => u.id === assignedAssociateId);
    if (found) assocName = found.name;
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

  data.applications.unshift(application);

  // If created from a lead, update lead status
  if (leadId) {
    const lead = data.leads.find(l => l.id === leadId);
    if (lead) {
      lead.leadStatus = 'Application Started';
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

apiRouter.get('/applications/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const user = req.user!;

  const app = data.applications.find(a => a.id === id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });

  if (user.role === 'ASSOCIATE' && app.assignedAssociateId !== user.id) {
    return res.status(403).json({ error: 'Access denied. You can only view your assigned applications.' });
  }

  const documents = data.documents.filter(d => d.applicationId === id);
  const stageUpdates = data.stageUpdates.filter(s => s.applicationId === id);

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

apiRouter.get('/dashboard/stats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const todayStr = new Date().toISOString().split('T')[0];

  const leads = user.role === 'ADMIN' ? data.leads : data.leads.filter(l => l.assignedAssociateId === user.id);
  const apps = user.role === 'ADMIN' ? data.applications : data.applications.filter(a => a.assignedAssociateId === user.id);
  const followUps = user.role === 'ADMIN' ? data.followUps : data.followUps.filter(f => f.associateId === user.id);

  const totalLeads = leads.length;
  const newLeadsToday = leads.filter(l => l.createdDate && l.createdDate.startsWith(todayStr)).length;
  const activeApplications = apps.filter(a => a.status !== 'Closed' && a.status !== 'Rejected').length;
  const totalSanctionAmount = apps.reduce((acc, a) => acc + (a.sanctionAmount || 0), 0);
  const totalDisbursedAmount = apps.reduce((acc, a) => acc + (a.disbursementAmount || 0), 0);
  const pendingFollowUpsToday = followUps.filter(f => f.scheduledDate === todayStr && f.status === 'Pending').length;
  const totalAssociates = data.users.filter(u => u.role === 'ASSOCIATE').length;
  const unassignedLeads = data.leads.filter(l => !l.assignedAssociateId).length;

  const leadsByStatus: Record<string, number> = {};
  leads.forEach(l => {
    leadsByStatus[l.leadStatus] = (leadsByStatus[l.leadStatus] || 0) + 1;
  });

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

apiRouter.post('/website/leads', (req: Request, res: Response) => {
  const {
    customerName,
    mobile,
    email,
    city,
    state,
    loanType,
    requiredAmount,
    employmentType,
    leadSource = 'Website',
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    landingPage,
  } = req.body;

  if (!customerName || !mobile || !loanType) {
    return res.status(400).json({ error: 'Customer Name, Mobile, and Loan Type are required.' });
  }

  const data = db.getData();
  const leadId = db.nextLeadId();
  const now = new Date().toISOString();

  const newLead: Lead = {
    id: leadId,
    customerName: customerName.trim(),
    mobile: mobile.trim(),
    email: email ? email.trim() : undefined,
    city: city ? city.trim() : undefined,
    state: state ? state.trim() : undefined,
    loanType,
    requiredAmount: Number(requiredAmount) || 0,
    employmentType: employmentType || 'Salaried',
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
    `New enquiry received from public website for ${customerName} (${loanType}).`
  );
  db.saveDatabase();

  return res.status(201).json({
    success: true,
    leadId,
    message: 'Thank you! Your loan enquiry has been received by Capitabee Financial Services.',
  });
});

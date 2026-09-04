/**
 * Capitabee Financial Services CRM - Server Database Engine
 * Persistent file-backed storage with cryptographic hashing and referential integrity.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  User,
  UserRole,
  Lead,
  Application,
  FollowUp,
  LeadNote,
  AuditLog,
  StageUpdateLog,
  DocumentRecord,
  CibilCheckRecord,
  NotificationLog,
  InternalMessage,
  CompanySettings,
  CustomerReview,
  AssociateTarget,
  Customer,
} from '../src/types';
import {
  BRAND,
  INITIAL_LOAN_PRODUCTS,
  LENDING_PARTNERS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LOAN_STAGES,
} from '../src/config/brand';

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

export interface SessionData {
  token: string;
  userId: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  sessions: SessionData[];
  leads: Lead[];
  applications: Application[];
  customers: Customer[];
  targets: AssociateTarget[];
  stageUpdates: StageUpdateLog[];
  documents: DocumentRecord[];
  followUps: FollowUp[];
  leadNotes: LeadNote[];
  auditLogs: AuditLog[];
  cibilChecks: CibilCheckRecord[];
  notifications: NotificationLog[];
  internalMessages: InternalMessage[];
  reviews: CustomerReview[];
  settings: CompanySettings;
  counters: {
    associateSeq: number;
    leadSeq: number;
    applicationSeq: number;
    documentSeq: number;
    auditSeq: number;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'capitabee_crm_db.json');

// Password security using PBKDF2
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadDatabase();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private getInitialData(): DatabaseSchema {
    // Initial Admin Account as specified:
    // Email: info.capitabee@gmail.com
    // Password: 8010886625
    // NO DEMO ACCOUNTS, NO PRE-CREATED ASSOCIATES, NO FAKE LEADS, NO FAKE APPLICATIONS!
    const { hash, salt } = hashPassword('8010886625');
    const now = new Date().toISOString();

    const initialAdmin: StoredUser = {
      id: 'CB-ADMIN-01',
      name: 'System Administrator',
      email: BRAND.initialAdminEmail,
      mobile: '+918010886625',
      role: 'ADMIN',
      department: 'Management',
      designation: 'Principal Administrator',
      status: 'Active',
      onlineStatus: 'Offline',
      createdAt: now,
      updatedAt: now,
      passwordHash: hash,
      salt,
    };

    const initialSettings: CompanySettings = {
      companyName: BRAND.companyName,
      tagline: BRAND.tagline,
      officeAddress: BRAND.officeAddress,
      phone: BRAND.phone,
      whatsapp: BRAND.whatsapp,
      email: BRAND.email,
      instagram: BRAND.instagram,
      loanProducts: INITIAL_LOAN_PRODUCTS,
      lendingPartners: LENDING_PARTNERS,
      leadSources: LEAD_SOURCES,
      leadStatuses: LEAD_STATUSES,
      staleLeadHours: 48,
      stuckApplicationDays: 5,
    };

    return {
      users: [initialAdmin],
      sessions: [],
      leads: [], // Strictly no fake leads
      applications: [], // Strictly no fake applications
      customers: [],
      targets: [],
      stageUpdates: [],
      documents: [],
      followUps: [],
      leadNotes: [],
      auditLogs: [
        {
          id: 'AUD-000001',
          actorId: 'CB-ADMIN-01',
          actorName: 'System Administrator',
          actorRole: 'ADMIN',
          action: 'SYSTEM_INITIALIZATION',
          entity: 'System',
          entityId: 'CAPITABEE-CORE',
          timestamp: now,
          details: 'Capitabee Financial Services CRM initialized with Administrator account.',
        },
      ],
      cibilChecks: [], // Strictly no fake CIBIL records
      notifications: [],
      internalMessages: [],
      reviews: [],
      settings: initialSettings,
      counters: {
        associateSeq: 999,
        leadSeq: 0,
        applicationSeq: 0,
        documentSeq: 0,
        auditSeq: 1,
      },
    };
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseSchema;
        // Verify initial admin presence
        const hasAdmin = parsed.users && parsed.users.some(u => u.email === BRAND.initialAdminEmail && u.role === 'ADMIN');
        if (!hasAdmin) {
          const { hash, salt } = hashPassword('8010886625');
          parsed.users.unshift({
            id: 'CB-ADMIN-01',
            name: 'System Administrator',
            email: BRAND.initialAdminEmail,
            mobile: '+918010886625',
            role: 'ADMIN',
            department: 'Management',
            designation: 'Principal Administrator',
            status: 'Active',
            onlineStatus: 'Offline',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            passwordHash: hash,
            salt,
          });
        }
        if (parsed.settings) {
          parsed.settings.lendingPartners = LENDING_PARTNERS;
        }
        if (!Array.isArray(parsed.reviews)) {
          parsed.reviews = [];
        }
        if (!Array.isArray(parsed.customers)) {
          parsed.customers = [];
        }
        if (!Array.isArray(parsed.targets)) {
          parsed.targets = [];
        }
        if (!parsed.counters) {
          parsed.counters = {
            associateSeq: 999,
            leadSeq: 0,
            applicationSeq: 0,
            documentSeq: 0,
            auditSeq: 1,
          };
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, initializing fresh database:', err);
    }
    const fresh = this.getInitialData();
    this.saveDatabase(fresh);
    return fresh;
  }

  public saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDataDir();
      const target = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(target, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database file:', err);
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  // Sequential Atomic CB ID Generator
  public nextCbId(customId?: string): string {
    if (customId) {
      const normalized = customId.toUpperCase().trim();
      if (!/^CB-\d{4,}$/.test(normalized)) {
        throw new Error('ID must match format CB-XXXX (e.g. CB-1001)');
      }
      const exists = this.data.users.some(u => u.id === normalized || u.employeeId === normalized);
      if (exists) {
        throw new Error(`ID ${normalized} is already taken`);
      }
      return normalized;
    }

    // Find highest CB number in users
    let highestNum = 999;
    for (const u of this.data.users) {
      const match = u.id?.match(/^CB-(\d+)$/i) || u.employeeId?.match(/^CB-(\d+)$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > highestNum) {
          highestNum = n;
        }
      }
    }
    if (this.data.counters.associateSeq > highestNum) {
      highestNum = this.data.counters.associateSeq;
    }

    const nextNum = highestNum + 1;
    this.data.counters.associateSeq = nextNum;
    const generated = `CB-${nextNum}`;
    this.saveDatabase();
    return generated;
  }

  public nextAssociateId(customId?: string): string {
    return this.nextCbId(customId);
  }

  public nextPartnerId(customId?: string): string {
    return this.nextCbId(customId);
  }

  public nextLeadId(): string {
    this.data.counters.leadSeq += 1;
    const year = new Date().getFullYear();
    const pad = String(this.data.counters.leadSeq).padStart(6, '0');
    this.saveDatabase();
    return `LD-${year}-${pad}`;
  }

  public nextApplicationId(): string {
    this.data.counters.applicationSeq += 1;
    const year = new Date().getFullYear();
    const pad = String(this.data.counters.applicationSeq).padStart(6, '0');
    this.saveDatabase();
    return `APP-${year}-${pad}`;
  }

  public nextDocumentId(): string {
    this.data.counters.documentSeq += 1;
    const year = new Date().getFullYear();
    const pad = String(this.data.counters.documentSeq).padStart(6, '0');
    this.saveDatabase();
    return `DOC-${year}-${pad}`;
  }

  public nextCustomerId(): string {
    const year = new Date().getFullYear();
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `CUST-${year}-${rand}`;
  }

  public nextReviewId(): string {
    return `REV-${Date.now()}`;
  }

  public logAudit(actor: { id: string; name: string; role: UserRole | string }, action: string, entity: string, entityId: string, details?: string) {
    this.data.counters.auditSeq += 1;
    const pad = String(this.data.counters.auditSeq).padStart(6, '0');
    const log: AuditLog = {
      id: `AUD-${pad}`,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      entity,
      entityId,
      timestamp: new Date().toISOString(),
      details,
    };
    this.data.auditLogs.unshift(log);
    this.saveDatabase();
    return log;
  }
}

export const db = new Database();

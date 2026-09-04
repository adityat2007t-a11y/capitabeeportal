/**
 * Capitabee Financial Services - Data Types and Interfaces
 */

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'ASSOCIATE' | 'PARTNER' | 'CUSTOMER';
export type Role = UserRole;

export type UserStatus = 'Active' | 'Inactive' | 'Suspended';

export type OnlineStatus = 'Online' | 'Offline' | 'Away';

export interface User {
  id: string; // Admin, Associate, Partner, Employee or Customer ID (e.g., CB-1001)
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  employeeId?: string; // e.g., CB-1001
  partnerId?: string;
  department?: string;
  designation?: string;
  status: UserStatus;
  onlineStatus?: OnlineStatus;
  target?: number; // Monthly target in INR
  monthlyTarget?: number;
  targetCustomers?: number;
  joiningDate?: string;
  lastLogin?: string;
  lastLogout?: string;
  sessionStartedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up'
  | 'Documents Pending'
  | 'Application Started'
  | 'Application Submitted'
  | 'In Process'
  | 'Sanctioned'
  | 'Disbursed'
  | 'Not Interested'
  | 'Not Eligible'
  | 'Rejected'
  | 'Lost'
  | 'Closed';

export type LeadPriority = 'HOT' | 'WARM' | 'COLD';

export type LeadSource =
  | 'Website'
  | 'Instagram'
  | 'Facebook'
  | 'Google Ads'
  | 'Google Search'
  | 'WhatsApp'
  | 'Referral'
  | 'Manual Entry'
  | 'Other';

export interface Lead {
  id: string; // e.g. LD-2026-000001
  customerId?: string;
  customerName: string;
  mobile: string;
  email?: string;
  city?: string;
  state?: string;
  loanType: string;
  requiredAmount: number;
  employmentType?: 'Salaried' | 'Self Employed Professional' | 'Self Employed Business' | 'Other';
  leadSource: LeadSource;
  assignedAssociateId?: string | null;
  assignedAssociateName?: string | null;
  assignedPartnerId?: string | null;
  assignedPartnerName?: string | null;
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdByRole?: UserRole | null;
  leadStatus: LeadStatus;
  priority: LeadPriority;
  createdDate: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  notes?: string;
  lostReason?: string;
  // Campaign & UTM tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage?: string;
}

export type ApplicationStatus =
  | 'In Process'
  | 'Sanctioned'
  | 'Disbursed'
  | 'Pending'
  | 'Rejected'
  | 'Closed';

export type StageStatus = 'Pending' | 'In Progress' | 'Completed' | 'Rejected' | 'Action Required';

export interface StageInfo {
  number: number;
  name: string;
  status: StageStatus;
  updatedAt?: string;
  updatedBy?: string;
  notes?: string;
}

export interface Application {
  id: string; // e.g. APP-2026-000001
  customerId?: string;
  leadId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city?: string;
  state?: string;
  loanType: string;
  requestedAmount: number;
  sanctionAmount?: number;
  disbursementAmount?: number;
  assignedAssociateId?: string | null;
  assignedAssociateName?: string | null;
  assignedPartnerId?: string | null;
  assignedPartnerName?: string | null;
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdByRole?: UserRole | null;
  status: ApplicationStatus;
  currentStage: number; // 1 to 12
  currentStageName: string;
  stages: StageInfo[];
  createdDate: string;
  updatedDate: string;
  expectedCompletionDate?: string;
  notes?: string;
  lenderPartner?: string;
}

export interface StageUpdateLog {
  id: string;
  applicationId: string;
  stageNumber: number;
  stageName: string;
  oldStatus: StageStatus;
  newStatus: StageStatus;
  updatedBy: string;
  updatedByRole: UserRole;
  timestamp: string;
  internalNote?: string;
}

export type DocumentType =
  | 'PAN Card'
  | 'Aadhaar / Address Proof'
  | 'Photograph'
  | 'Salary Slip (3 Months)'
  | 'Form 16'
  | 'ITR & Computation (2 Years)'
  | 'Bank Statement (6/12 Months)'
  | 'GST Returns (1 Year)'
  | 'Audited Balance Sheet & P&L'
  | 'Property Chain Documents'
  | 'Sanction Letter / Loan Statement'
  | 'Company KYC / MOA / AOA / Partnership Deed'
  | 'Other Documents';

export type DocumentStatus =
  | 'Requested'
  | 'Pending Upload'
  | 'Uploaded'
  | 'Under Review'
  | 'Verified'
  | 'Rejected'
  | 'Re-upload Required';

export interface DocumentRecord {
  id: string;
  applicationId: string;
  documentType: DocumentType;
  customDocumentName?: string;
  status: DocumentStatus;
  requestedBy: string;
  requestedDate: string;
  uploadedDate?: string;
  verifiedDate?: string;
  rejectedReason?: string;
  fileName?: string;
  fileSize?: string;
  fileData?: string; // Base64 or secure stored URL
  reviewedBy?: string;
}

export type FollowUpType = 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Other';
export type FollowUpStatus = 'Pending' | 'Completed' | 'Missed' | 'Rescheduled';

export interface FollowUp {
  id: string;
  leadId: string;
  customerName: string;
  customerMobile: string;
  customerPhone?: string;
  associateId: string;
  associateName: string;
  scheduledDate: string;
  scheduledTime: string;
  type: FollowUpType;
  status: FollowUpStatus;
  notes?: string;
  outcome?: string;
  completedAt?: string;
  createdAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | string;
  action: string;
  entity: string;
  entityType?: string;
  entityId: string;
  timestamp: string;
  details: string;
}

export interface CibilCheckRecord {
  id: string;
  pan: string;
  customerName: string;
  mobile: string;
  dob?: string;
  requestedBy: string;
  requestedByRole: UserRole;
  consentObtained: boolean;
  requestedAt: string;
  status: 'CONNECTED_RESULT' | 'SERVICE_NOT_CONNECTED' | 'FAILED';
  score?: number | null;
  reportId?: string | null;
  notes?: string;
}

export type CibilReport = CibilCheckRecord & {
  score?: number | null;
  activeAccounts?: number;
  overdueAmount?: number;
  inquiryDate?: string;
  inquiredBy?: string;
};

export type NotificationStatus =
  | 'Pending'
  | 'Queued'
  | 'Sent'
  | 'Delivered'
  | 'Read'
  | 'Failed'
  | 'Not Connected'
  | 'NOT_CONNECTED';

export interface NotificationLog {
  id: string;
  channel: 'WhatsApp' | 'SMS' | 'Email';
  recipientPhone?: string;
  recipientEmail?: string;
  event: string;
  templateName: string;
  content: string;
  status: NotificationStatus;
  sentAt: string;
  error?: string;
  associateId?: string;
  customerId?: string;
  applicationId?: string;
  providerMessageId?: string;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string; // Associate ID
  leadId?: string;
  applicationId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface LoanProduct {
  id: string;
  name: string;
  ratePerAnnum: string;
  description: string;
  active: boolean;
  tenureRange?: string;
  maxAmount?: string;
}

export interface LendingPartner {
  name: string;
  type: 'Bank' | 'NBFC' | 'HFC';
  tatDays?: string;
  logo?: string;
  active: boolean;
}

export interface Customer {
  id: string; // e.g. CUST-2026-0001 or CAP-20260902-0001
  customerId?: string;
  userId?: string; // Links to Auth User if portal access is granted
  name: string;
  mobile: string;
  email?: string;
  city?: string;
  state?: string;
  pan?: string;
  aadhaarLast4?: string;
  employmentType?: string;
  monthlyIncome?: number;
  assignedAssociateId?: string | null;
  assignedAssociateName?: string | null;
  assignedPartnerId?: string | null;
  assignedPartnerName?: string | null;
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  portalAccessEnabled?: boolean;
  portalLastLogin?: string;
  totalApplicationsCount?: number;
  totalDisbursedAmount?: number;
  latestApplicationId?: string;
  latestLoanType?: string;
  latestStageName?: string;
  latestStageNumber?: number;
  latestStatus?: string;
  latestLoanAmount?: number;
  latestCreatedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReview {
  id: string;
  applicationId?: string;
  customerId?: string;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  isPublic: boolean;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Archived';
  response?: string;
  respondedBy?: string;
  respondedAt?: string;
  createdAt: string;
}

export type Review = CustomerReview;

export interface UserStats {
  totalPartners?: number;
  activePartners?: number;
  totalBorrowers?: number;
  totalApplications?: number;
  totalDisbursedAmount?: number;
}

export interface AssociateTarget {
  id: string;
  associateId: string;
  associateName?: string;
  partnerId?: string;
  partnerName?: string;
  role?: 'ASSOCIATE' | 'PARTNER';
  monthYear: string; // e.g. '2026-08'
  targetAmount: number; // In INR
  achievedAmount: number;
  targetApplications: number;
  achievedApplications: number;
  targetCustomers?: number;
  achievedCustomers?: number;
  notes?: string;
  updatedAt: string;
}

export type PartnerTarget = AssociateTarget;

export interface SupabaseConnectionStatus {
  configured: boolean;
  url: string;
  hasAnonKey: boolean;
  connected: boolean;
  authSessionActive: boolean;
  realtimeActive: boolean;
  latencyMs?: number;
  checkedAt: string;
  tables: {
    name: string;
    exists: boolean;
    rowCount?: number;
    error?: string;
  }[];
  missingTables: string[];
  missingEnvVars: string[];
  recommendations: string[];
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  officeAddress: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  loanProducts: LoanProduct[];
  lendingPartners: LendingPartner[];
  leadSources: string[];
  leadStatuses: string[];
  staleLeadHours: number;
  stuckApplicationDays: number;
}


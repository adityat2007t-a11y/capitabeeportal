/**
 * Capitabee Financial Services - Brand & Business Configuration
 * Centralized design tokens and business rules.
 */

import { LoanProduct, LendingPartner } from '../types';

export const BRAND = {
  companyName: 'CAPITA BEE FINANCIAL SERVICES',
  shortName: 'Capita Bee',
  tagline: 'FINANCIAL SERVICES',
  subTagline: 'PAN-INDIA LOAN ASSISTANCE',
  logoUrl: '/logo.svg',
  logoFullUrl: '/logo.svg',
  officeAddress: '101, Ganesh Tower, Dada Patil Wadi, Thane (W), Maharashtra - 400602',
  phone: '+91 8010886625',
  phoneRaw: '+918010886625',
  whatsapp: '+91 8010886625',
  whatsappRaw: '918010886625',
  email: 'info.capitabee@gmail.com',
  instagram: 'https://www.instagram.com/capitabee.fin?igsi=MTAzMm92aTIwdHRtcw==',
  initialAdminEmail: 'info.capitabee@gmail.com',
};

export const COLORS = {
  bgPrimary: '#FAF9F6',
  bgSection: '#F2F1ED',
  white: '#FFFFFF',
  navyPrimary: '#121212',
  navySecondary: '#242424',
  brandNavy: '#0A1224',
  brandBlue: '#0284C7',
  brandBlueLight: '#38BDF8',
  brandOrange: '#EA580C',
  brandOrangeLight: '#FB923C',
  gold: '#B89758',
  goldDeep: '#8C6D37',
  goldLight: '#EBE5DA',
  teal: '#2D7A70',
  tealLight: '#EBF4F2',
  textPrimary: '#121212',
  textSecondary: '#5A5854',
  textMuted: '#888888',
  border: '#E8E6E1',
};

export const INITIAL_LOAN_PRODUCTS: LoanProduct[] = [
  { id: 'wc', name: 'Working Capital', ratePerAnnum: '8% p.a.', description: 'CC / OD limits, bill discounting & inventory credit lines.', active: true },
  { id: 'hl', name: 'Home Loan', ratePerAnnum: '7.20% p.a.', description: 'Purchase, construction, renovation, or home extension finance.', active: true },
  { id: 'lap', name: 'Loan Against Property (LAP)', ratePerAnnum: '8.50% p.a.', description: 'Liquidity against residential, commercial, or industrial property.', active: true },
  { id: 'ubl', name: 'Unsecured Business Loan', ratePerAnnum: '14% p.a.', description: 'Collateral-free quick expansion & working cashflow funding.', active: true },
  { id: 'las', name: 'Loan Against Shares', ratePerAnnum: '9.00% p.a.', description: 'Pledge listed equity & mutual funds for rapid liquidity.', active: true },
  { id: 'cp', name: 'Commercial Purchase', ratePerAnnum: '8.50% p.a.', description: 'Offices, retail shops, corporate suites & showrooms.', active: true },
  { id: 'ip', name: 'Industrial Purchase', ratePerAnnum: '8.50% p.a.', description: 'Industrial gala, sheds, manufacturing premises & factories.', active: true },
  { id: 'wh', name: 'Warehouse / Godown', ratePerAnnum: '8.75% p.a.', description: 'Logistics hubs, cold storage & godown facilities.', active: true },
  { id: 'plot', name: 'Loan on Plot', ratePerAnnum: '8.25% p.a.', description: 'Residential or commercial non-agricultural plot finance.', active: true },
  { id: 'plot_const', name: 'Plot + Construction', ratePerAnnum: '7.50% p.a.', description: 'Composite financing for plot purchase and structural build.', active: true },
  { id: 'bt', name: 'Balance Transfer', ratePerAnnum: '7.25% p.a.', description: 'Switch high-interest loans for lower EMI and savings.', active: true },
  { id: 'topup', name: 'Top-Up Loan', ratePerAnnum: '7.50% p.a.', description: 'Additional funds on top of your existing serviced mortgage.', active: true },
  { id: 'machinery', name: 'Machinery Loan', ratePerAnnum: '9.25% p.a.', description: 'New and imported CNC, packaging, printing, and medical machinery.', active: true },
  { id: 'plant_equip', name: 'Plant & Equipment', ratePerAnnum: '9.50% p.a.', description: 'Industrial infrastructure and heavy equipment financing.', active: true },
  { id: 'inventory', name: 'Inventory Funding', ratePerAnnum: '9.00% p.a.', description: 'Short-term seasonal trade and supply chain inventory credit.', active: true },
  { id: 'const_fin', name: 'Construction Finance', ratePerAnnum: '10.50% p.a.', description: 'Builder and developer project construction credit facilities.', active: true },
  { id: 'gold', name: 'Gold Loan', ratePerAnnum: 'Starting as per lender eligibility', description: 'Immediate liquidity against gold ornaments and coins.', active: true },
];

export const LENDING_PARTNERS: LendingPartner[] = [
  // Banks
  { name: 'HDFC Bank', type: 'Bank', tatDays: '3-5 Days', active: true },
  { name: 'ICICI Bank', type: 'Bank', tatDays: '3-5 Days', active: true },
  { name: 'Axis Bank', type: 'Bank', tatDays: '3-6 Days', active: true },
  { name: 'State Bank of India', type: 'Bank', tatDays: '5-8 Days', active: true },
  { name: 'Bank of India', type: 'Bank', tatDays: '5-8 Days', active: true },
  { name: 'Bank of Maharashtra', type: 'Bank', tatDays: '5-8 Days', active: true },
  { name: 'Bank of Baroda', type: 'Bank', tatDays: '5-8 Days', active: true },
  { name: 'Union Bank of India', type: 'Bank', tatDays: '5-8 Days', active: true },
  { name: 'IDFC First Bank', type: 'Bank', tatDays: '3-5 Days', active: true },
  { name: 'Saraswat Co-operative Bank', type: 'Bank', tatDays: '3-5 Days', active: true },
  { name: 'IndusInd Bank', type: 'Bank', tatDays: '3-6 Days', active: true },
  { name: 'HSBC Bank', type: 'Bank', tatDays: '4-7 Days', active: true },
  { name: 'Deutsche Bank', type: 'Bank', tatDays: '5-8 Days', active: true },
  { name: 'Standard Chartered Bank', type: 'Bank', tatDays: '4-7 Days', active: true },
  { name: 'Punjab National Bank', type: 'Bank', tatDays: '5-8 Days', active: true },
  { name: 'IDBI Bank', type: 'Bank', tatDays: '4-7 Days', active: true },
  { name: 'Kotak Mahindra Bank', type: 'Bank', tatDays: '3-5 Days', active: true },
  { name: 'Bandhan Bank', type: 'Bank', tatDays: '4-7 Days', active: true },
  { name: 'Central Bank of India', type: 'Bank', tatDays: '5-8 Days', active: true },
  { name: 'Shamrao Vithal Co-op Bank', type: 'Bank', tatDays: '4-7 Days', active: true },
  { name: 'Federal Bank', type: 'Bank', tatDays: '3-6 Days', active: true },
  // NBFCs & HFCs
  { name: 'Sundaram Home Finance', type: 'HFC', tatDays: '4-7 Days', active: true },
  { name: 'SMF (SMFG India Credit)', type: 'NBFC', tatDays: '3-6 Days', active: true },
  { name: 'HDB Financial Services', type: 'NBFC', tatDays: '3-5 Days', active: true },
  { name: 'ICICI Home Finance', type: 'HFC', tatDays: '3-6 Days', active: true },
  { name: 'Axis Finance', type: 'NBFC', tatDays: '3-6 Days', active: true },
  { name: 'Aditya Birla Capital', type: 'NBFC', tatDays: '3-6 Days', active: true },
  { name: 'Tata Capital', type: 'NBFC', tatDays: '3-6 Days', active: true },
  { name: 'Bajaj Finance', type: 'NBFC', tatDays: '2-4 Days', active: true },
  { name: 'L&T Finance', type: 'NBFC', tatDays: '3-6 Days', active: true },
  { name: 'Piramal Capital', type: 'NBFC', tatDays: '4-7 Days', active: true },
  { name: 'Poonawalla Fincorp', type: 'NBFC', tatDays: '3-5 Days', active: true },
  { name: 'Cholamandalam Investment', type: 'NBFC', tatDays: '4-7 Days', active: true },
  { name: 'Anand Rathi Global Finance', type: 'NBFC', tatDays: '4-7 Days', active: true },
  { name: 'Hero FinCorp', type: 'NBFC', tatDays: '3-5 Days', active: true },
  { name: 'Mahindra & Mahindra Financial Services', type: 'NBFC', tatDays: '4-7 Days', active: true },
];

export const LOAN_STAGES = [
  { number: 1, name: 'Inquiry & Eligibility Check', description: 'Initial customer enquiry and loan eligibility assessment' },
  { number: 2, name: 'Application Form & File Login', description: 'Detailed application form and applicant profiling' },
  { number: 3, name: 'Document Collection & Verification', description: 'Collection and verification of KYC, income, and banking documents' },
  { number: 4, name: 'Multi-Bank Evaluation & Login', description: 'Bank/NBFC login file creation and FCU residence/office verification' },
  { number: 5, name: 'Bank Credit & Risk Assessment', description: 'Credit underwriting, eligibility calculation & bureau evaluation' },
  { number: 6, name: 'In-Principle Sanction Letter', description: 'Conditional sanction letter issuance by lending partner' },
  { number: 7, name: 'Legal Vetting & Title Search', description: 'Title search report (TSR) and property legal clearance' },
  { number: 8, name: 'Technical Valuation & Property Inspection', description: 'Property valuation and physical technical site inspection' },
  { number: 9, name: 'Final Sanction & Loan Offer', description: 'Lender credit committee final sanction and term sign-off' },
  { number: 10, name: 'One-Time Condition (OTC) Clearance', description: 'Submission of Over-The-Counter compliance and loan agreement execution' },
  { number: 11, name: 'Loan Agreement Signing & Disbursement', description: 'Loan amount disbursed to applicant or seller account' },
  { number: 12, name: 'Post-Disbursement Documentation (PDD)', description: 'Collection of original property deeds, PDC/NACH & final compliance' },
];

export const STAGES_12 = LOAN_STAGES;
export const BRAND_COLORS = COLORS;
export const COMPANY_INFO = BRAND;

export const LEAD_SOURCES = [
  'Website',
  'Instagram',
  'Facebook',
  'Google Ads',
  'Google Search',
  'WhatsApp',
  'Referral',
  'Manual Entry',
  'Other',
];

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Interested',
  'Follow-up',
  'Documents Pending',
  'Application Started',
  'Application Submitted',
  'In Process',
  'Sanctioned',
  'Disbursed',
  'Not Interested',
  'Not Eligible',
  'Rejected',
  'Lost',
  'Closed',
];

export const LOST_LEAD_REASONS = [
  'Not Interested',
  'High Interest Rate',
  'Not Eligible',
  'Documents Unavailable',
  'Already Financed by Other Lender',
  'Amount Not Suitable',
  'Property Legal / Technical Issue',
  'CIBIL / Eligibility Score Issue',
  'Competitor Offered Better Terms',
  'Postponed Decision',
  'Other',
];

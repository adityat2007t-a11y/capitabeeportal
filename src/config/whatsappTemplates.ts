/**
 * Capitabee Financial Services - WhatsApp Business Integration & Notification Templates
 * Centralized notification templates, parameters, and URL generators.
 * Official WhatsApp Business Number: +91 8010886625
 */

export const WHATSAPP_CONFIG = {
  businessPhoneNumber: '+91 8010886625',
  businessPhoneNumberRaw: '918010886625',
  companyName: 'Capitabee Financial Services',
  serviceNotConnectedMessage: 'WhatsApp service is not connected yet.',
};

export type WhatsAppTemplateKey =
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_STATUS_UPDATED'
  | 'STAGE_UPDATED'
  | 'DOCUMENT_REQUESTED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_REUPLOAD_REQUIRED'
  | 'CALLBACK_REQUEST'
  | 'GENERAL_FOLLOWUP';

export interface WhatsAppTemplateParams {
  CustomerName?: string;
  ApplicationID?: string;
  LoanType?: string;
  StageName?: string;
  Status?: string;
  DocumentName?: string;
  AssociateName?: string;
}

export const WHATSAPP_TEMPLATES: Record<WhatsAppTemplateKey, string> = {
  APPLICATION_SUBMITTED:
`Hi {CustomerName}, your application {ApplicationID} has been successfully received by Capitabee Financial Services.

Loan type:
{LoanType}

Our team will contact you regarding the next steps.`,

  APPLICATION_STATUS_UPDATED:
`Hi {CustomerName}, your Capitabee Financial Services loan application {ApplicationID} has been updated.

Current stage: {StageName}
Status: {Status}

Our team will keep you updated regarding the next step.`,

  STAGE_UPDATED:
`Hi {CustomerName}, your Capitabee Financial Services loan application {ApplicationID} has been updated.

Current stage: {StageName}
Status: {Status}

Our team will keep you updated regarding the next step.`,

  DOCUMENT_REQUESTED:
`Hi {CustomerName}, a document is required for your loan application {ApplicationID}.

Document required:
{DocumentName}

Please log in to your Capitabee customer portal to upload the document.`,

  DOCUMENT_REJECTED:
`Hi {CustomerName}, a document for your loan application {ApplicationID} requires re-upload.

Document:
{DocumentName}

Reason:
{Status}

Please log in to your Capitabee customer portal to upload a fresh copy.`,

  DOCUMENT_REUPLOAD_REQUIRED:
`Hi {CustomerName}, a document re-upload is required for your loan application {ApplicationID}.

Document required:
{DocumentName}

Please log in to your Capitabee customer portal to upload the document.`,

  CALLBACK_REQUEST:
`Hi {CustomerName}, this is Capitabee Financial Services regarding your scheduled callback request. Our loan advisory specialist is available to assist you.`,

  GENERAL_FOLLOWUP:
`Hi {CustomerName}, this is Capitabee Financial Services regarding your loan enquiry. Our team is available to assist you with the next steps.`,
};

/**
 * Replace template variables {VarName} with actual values.
 * Never inserts fake data.
 */
export function renderWhatsAppTemplate(
  templateKey: WhatsAppTemplateKey,
  params: WhatsAppTemplateParams
): string {
  const template = WHATSAPP_TEMPLATES[templateKey] || WHATSAPP_TEMPLATES.GENERAL_FOLLOWUP;
  return template
    .replace(/\{CustomerName\}/g, params.CustomerName?.trim() || 'Valued Customer')
    .replace(/\{ApplicationID\}/g, params.ApplicationID?.trim() || '')
    .replace(/\{LoanType\}/g, params.LoanType?.trim() || 'Loan Facility')
    .replace(/\{StageName\}/g, params.StageName?.trim() || '')
    .replace(/\{Status\}/g, params.Status?.trim() || '')
    .replace(/\{DocumentName\}/g, params.DocumentName?.trim() || 'Financial Document')
    .replace(/\{AssociateName\}/g, params.AssociateName?.trim() || 'Capitabee Representative');
}

/**
 * Normalizes Indian and International phone numbers to raw digits without +, spaces or dashes
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Generates direct wa.me link for communicating with a customer/lead
 */
export function getCustomerWhatsAppUrl(phone: string, prefilledText: string): string {
  const clean = cleanPhoneNumber(phone);
  if (!clean) return '#';
  return `https://wa.me/${clean}?text=${encodeURIComponent(prefilledText)}`;
}

/**
 * Generates direct wa.me link for user to contact Capitabee Financial Services official WhatsApp Business (+91 8010886625)
 */
export function getCapitabeeWhatsAppUrl(customText?: string): string {
  const text = customText || 'Hi Capitabee Financial Services, I would like loan assistance.';
  return `https://wa.me/${WHATSAPP_CONFIG.businessPhoneNumberRaw}?text=${encodeURIComponent(text)}`;
}

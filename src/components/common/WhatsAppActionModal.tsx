/**
 * Capitabee Financial Services CRM - WhatsApp Action & Dispatch Modal
 * Integrates with official WhatsApp Business (+91 8010886625)
 * STRIKE MANDATE: Never fake API success. Shows real connection status and graceful fallback.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  WHATSAPP_CONFIG,
  WhatsAppTemplateKey,
  WHATSAPP_TEMPLATES,
  renderWhatsAppTemplate,
  getCustomerWhatsAppUrl,
  getCapitabeeWhatsAppUrl,
} from '../../config/whatsappTemplates';

export interface WhatsAppTarget {
  customerName: string;
  customerPhone: string;
  applicationId?: string;
  leadId?: string;
  loanType?: string;
  stageName?: string;
  status?: string;
  documentName?: string;
  defaultTemplate?: WhatsAppTemplateKey;
}

interface WhatsAppActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: WhatsAppTarget | null;
  onSuccess?: () => void;
}

export const WhatsAppActionModal: React.FC<WhatsAppActionModalProps> = ({
  isOpen,
  onClose,
  target,
  onSuccess,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateKey>('GENERAL_FOLLOWUP');
  const [customDocumentName, setCustomDocumentName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{
    status: 'Sent' | 'Not Connected' | 'Failed' | 'Idle';
    message: string;
    providerMessageId?: string;
  }>({ status: 'Idle', message: '' });

  useEffect(() => {
    if (target) {
      if (target.defaultTemplate) {
        setSelectedTemplate(target.defaultTemplate);
      } else if (target.applicationId) {
        setSelectedTemplate('STAGE_UPDATED');
      } else {
        setSelectedTemplate('GENERAL_FOLLOWUP');
      }
      setResult({ status: 'Idle', message: '' });
      setCustomDocumentName(target.documentName || '');
    }
  }, [target]);

  if (!isOpen || !target) return null;

  const currentParams = {
    CustomerName: target.customerName,
    ApplicationID: target.applicationId,
    LoanType: target.loanType,
    StageName: target.stageName,
    Status: target.status,
    DocumentName: customDocumentName || target.documentName,
  };

  const renderedMessage = renderWhatsAppTemplate(selectedTemplate, currentParams);
  const directCustomerUrl = getCustomerWhatsAppUrl(target.customerPhone, renderedMessage);
  const directCapitabeeUrl = getCapitabeeWhatsAppUrl(
    `Regarding ${target.customerName} (${target.applicationId || target.leadId || 'Loan Inquiry'})`
  );

  const handleSendNotification = async () => {
    setIsSending(true);
    setResult({ status: 'Idle', message: '' });

    try {
      const res = await api.sendNotification({
        channel: 'WhatsApp',
        recipientPhone: target.customerPhone,
        event: selectedTemplate,
        templateName: selectedTemplate,
        content: renderedMessage,
        leadId: target.leadId,
        applicationId: target.applicationId,
        customerName: target.customerName,
        loanType: target.loanType,
        stageName: target.stageName,
        documentName: customDocumentName || target.documentName,
      });

      if (res.status === 'Sent' || res.status === 'Queued' || res.status === 'Delivered') {
        setResult({
          status: 'Sent',
          message: res.message || 'Notification dispatched via WhatsApp Business API.',
          providerMessageId: res.log?.providerMessageId,
        });
        if (onSuccess) onSuccess();
      } else {
        // Backend correctly reports 'Not Connected'
        setResult({
          status: 'Not Connected',
          message: res.message || WHATSAPP_CONFIG.serviceNotConnectedMessage,
        });
      }
    } catch (err: any) {
      setResult({
        status: 'Failed',
        message: err.message || 'Error executing notification dispatch.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-[#E8E6E1] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E6E1] bg-[#FAF9F6] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EBF4F2] border border-[#C8E2DC] flex items-center justify-center text-[#2D7A70]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="serif-display text-base font-normal text-[#121212]">
                WhatsApp Business Communication
              </h3>
              <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">
                Capitabee Business Official Line: {WHATSAPP_CONFIG.businessPhoneNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#888888] hover:text-[#121212] hover:bg-[#E8E6E1] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Target Customer Info */}
          <div className="p-3.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="sans-micro text-[9px] text-[#888888]">Recipient:</span>
              <p className="serif-display text-sm font-normal text-[#121212]">
                {target.customerName}
              </p>
            </div>
            <div>
              <span className="sans-micro text-[9px] text-[#888888]">Mobile:</span>
              <p className="sans-micro text-xs text-[#2D7A70] font-medium">
                {target.customerPhone}
              </p>
            </div>
            {target.applicationId && (
              <div>
                <span className="sans-micro text-[9px] text-[#888888]">Application:</span>
                <p className="sans-micro text-xs text-[#121212] font-semibold">
                  {target.applicationId}
                </p>
              </div>
            )}
          </div>

          {/* Template Selector */}
          <div>
            <label className="block sans-micro text-[9.5px] uppercase tracking-wider text-[#121212] mb-1.5 font-medium">
              Select Notification Template
            </label>
            <select
              value={selectedTemplate}
              onChange={e => {
                setSelectedTemplate(e.target.value as WhatsAppTemplateKey);
                setResult({ status: 'Idle', message: '' });
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E6E1] bg-white text-xs text-[#121212] focus:outline-none focus:border-[#121212] transition-colors"
            >
              <option value="GENERAL_FOLLOWUP">General Follow-up / Advisory Consultation</option>
              <option value="APPLICATION_SUBMITTED">Application Received / Submitted</option>
              <option value="STAGE_UPDATED">Stage & Status Progression Update</option>
              <option value="DOCUMENT_REQUESTED">Document Request Notice</option>
              <option value="DOCUMENT_REJECTED">Document Re-upload Required / Rejected</option>
              <option value="CALLBACK_REQUEST">Scheduled Callback Confirmation</option>
            </select>
          </div>

          {/* Optional Document Input if relevant */}
          {(selectedTemplate === 'DOCUMENT_REQUESTED' || selectedTemplate === 'DOCUMENT_REJECTED') && (
            <div>
              <label className="block sans-micro text-[9.5px] uppercase tracking-wider text-[#121212] mb-1.5 font-medium">
                Document Name / Description
              </label>
              <input
                type="text"
                value={customDocumentName}
                onChange={e => setCustomDocumentName(e.target.value)}
                placeholder="e.g. Latest 6 Months Bank Statement"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8E6E1] bg-white text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
              />
            </div>
          )}

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="sans-micro text-[9.5px] uppercase tracking-wider text-[#121212] font-medium">
                Rendered Template Preview
              </label>
              <span className="sans-micro text-[8.5px] text-[#888888]">WhatsApp Formatted</span>
            </div>
            <div className="p-4 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] text-[#262626] font-sans text-xs whitespace-pre-wrap leading-relaxed select-text">
              {renderedMessage}
            </div>
          </div>

          {/* Dispatch Status Feedback */}
          {result.status === 'Not Connected' && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs text-amber-900">
                    WhatsApp service is not connected yet.
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Meta Cloud API credentials are not active on this environment. To avoid communication delays, use the safe direct fallback link below.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between flex-wrap gap-2">
                <a
                  href={directCustomerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D7A70] text-white rounded-lg text-xs font-medium hover:bg-[#256860] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Direct WhatsApp Chat with Customer</span>
                </a>
                <a
                  href={directCapitabeeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-800 hover:underline"
                >
                  <span>Contact Capitabee Support (+91 8010886625)</span>
                </a>
              </div>
            </div>
          )}

          {result.status === 'Sent' && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-xs text-emerald-900">Message Dispatched!</h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">{result.message}</p>
                {result.providerMessageId && (
                  <p className="sans-micro text-[8.5px] text-emerald-700 mt-1">
                    Meta Provider ID: {result.providerMessageId}
                  </p>
                )}
              </div>
            </div>
          )}

          {result.status === 'Failed' && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-xs text-rose-900">Dispatch Error</h4>
                <p className="text-[11px] text-rose-800 mt-0.5">{result.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#E8E6E1] bg-[#FAF9F6] flex items-center justify-between gap-3 flex-wrap">
          <a
            href={directCustomerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#2D7A70] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Direct WhatsApp Web Fallback</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E8E6E1] bg-white text-[#121212] text-xs font-medium hover:border-[#121212] transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSendNotification}
              disabled={isSending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#121212] hover:bg-[#262626] text-white text-xs font-medium transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {isSending ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#B89758]" />
                  <span>Dispatch Notification</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Capitabee Financial Services CRM - Customer Portal Access Modal
 * Displays generated portal credentials for an active application / customer
 */

import React, { useState } from 'react';
import { ShieldCheck, X, Copy, Check, MessageSquare, ExternalLink } from 'lucide-react';

export interface CustomerPortalCredentials {
  customer_id?: string;
  customerId?: string;
  email?: string;
  identifier?: string;
  mobile?: string;
  phone?: string;
  temporaryPassword?: string;
  customerName?: string;
  applicationId?: string;
}

interface CustomerPortalAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: CustomerPortalCredentials | null;
}

export const CustomerPortalAccessModal: React.FC<CustomerPortalAccessModalProps> = ({
  isOpen,
  onClose,
  credentials,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !credentials) return null;

  // Resolve fields ensuring they NEVER render blank
  const customerId =
    credentials.customer_id ||
    credentials.customerId ||
    credentials.applicationId ||
    'CUST-ACTIVE';

  const mobile =
    credentials.mobile ||
    credentials.phone ||
    '—';

  const email =
    credentials.email ||
    credentials.identifier ||
    (mobile && mobile !== '—' ? `${mobile.replace(/\D/g, '')}@capitabee.in` : 'customer@capitabee.in');

  const password = credentials.temporaryPassword || 'CB-123456';
  const customerName = credentials.customerName || 'Valued Customer';
  const portalUrl = `${window.location.origin}/portal`;

  const handleCopy = () => {
    const text = `Capitabee Customer Portal Access:
URL: ${portalUrl}
Customer ID: ${customerId}
Login ID / Email: ${email}
Registered Mobile: ${mobile}
Temporary Password: ${password}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello ${customerName},\nYour Capitabee 12-Stage Loan Tracking Portal access is active!\n\n` +
      `🔗 Portal: ${portalUrl}\n` +
      `🆔 Customer ID: ${customerId}\n` +
      `📧 Login ID: ${email}\n` +
      `📱 Mobile: ${mobile}\n` +
      `🔑 Temporary Password: ${password}\n\n` +
      `Please log in to track your loan verification, sanction, and disbursement in real-time.`
    );
    const cleanPhone = mobile.replace(/\D/g, '');
    const phoneParam = cleanPhone.length >= 10 ? `&phone=${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}` : '';
    window.open(`https://api.whatsapp.com/send?text=${text}${phoneParam}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#121212]/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-[#E8E6E1] shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-[#888888] hover:text-[#121212] rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <h3 className="serif-display text-lg font-medium text-[#121212]">
            Customer Portal Access Active
          </h3>
        </div>

        <p className="text-xs text-[#5A5854] mb-4">
          Share these credentials with the customer to allow them to view their 12-stage loan tracking portal.
        </p>

        {/* Credentials Container */}
        <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E8E6E1] space-y-2.5 font-mono text-xs mb-4">
          <div className="flex justify-between items-center py-0.5 border-b border-[#E8E6E1]/60">
            <span className="text-[#888888] font-sans">Customer ID:</span>
            <span className="font-bold text-[#121212] select-all">{customerId}</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-[#E8E6E1]/60">
            <span className="text-[#888888] font-sans">Login ID / Email:</span>
            <span className="font-bold text-[#121212] select-all">{email}</span>
          </div>

          <div className="flex justify-between items-center py-0.5 border-b border-[#E8E6E1]/60">
            <span className="text-[#888888] font-sans">Registered Mobile:</span>
            <span className="font-bold text-[#121212] select-all">{mobile}</span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-[#888888] font-sans">Temporary Password:</span>
            <span className="font-bold text-[#8C6D37] bg-[#B89758]/20 px-2 py-0.5 rounded select-all tracking-wider">
              {password}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2 px-3 border border-[#E8E6E1] hover:border-[#121212] bg-white rounded-xl text-xs font-medium text-[#121212] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#888888]" />
                <span>Copy Credentials</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#EBF4F2] hover:bg-[#DDF0EB] border border-[#C8E2DC] rounded-xl text-xs font-medium text-[#2D7A70] transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Send via WhatsApp</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#121212] hover:bg-[#262626] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
        >
          Done & Close
        </button>
      </div>
    </div>
  );
};

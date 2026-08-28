/**
 * Capitabee Financial Services CRM - CIBIL Bureau Check Modal
 */

import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, CheckCircle2, FileText, Lock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { CibilReport } from '../../types';

interface CibilCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  leadId?: string;
  defaultCustomerName?: string;
  defaultMobile?: string;
  onSuccess: (report: CibilReport) => void;
}

export const CibilCheckModal: React.FC<CibilCheckModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  leadId,
  defaultCustomerName = '',
  defaultMobile = '',
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [mobile, setMobile] = useState(defaultMobile);
  const [pan, setPan] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [hasConsent, setHasConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconnectedNotice, setUnconnectedNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnconnectedNotice(null);

    if (!hasConsent) {
      setError('RBI & Credit Bureau compliance requires applicant formal consent.');
      return;
    }

    const panClean = pan.trim().toUpperCase();
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panClean)) {
      setError('Please enter a valid 10-character Indian PAN Number (e.g. ABCDE1234F).');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.checkCibil({
        applicationId,
        leadId,
        customerName: customerName.trim(),
        pan: panClean,
        mobile: mobile.trim(),
        dateOfBirth: dateOfBirth || undefined,
        hasConsent,
      });

      if (!res.connected) {
        setUnconnectedNotice(res.message);
      } else if (res.report) {
        onSuccess(res.report);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'CIBIL Bureau inquiry failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="cibil-check-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="CIBIL Bureau Credit Score Inquiry"
      subtitle="Official TransUnion Credit Bureau integration. In accordance with CICRA 2005."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {unconnectedNotice && (
          <div className="p-4 text-xs bg-amber-50 text-amber-900 border border-amber-300 rounded-xl space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 text-[#B98520] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-[#173B5E]">Bureau Integration Notice</p>
                <p className="mt-1 leading-relaxed">{unconnectedNotice}</p>
                <p className="text-[11px] text-[#617083] mt-2">
                  Capitabee CRM policy strictly bans fabricating counterfeit scores. To view live bureau reports, provide TransUnion Member ID and API certificates in production environment.
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-1">
            Customer Full Name (as per PAN Card) <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="e.g. Ramesh Chandra Sharma"
            className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              PAN Card Number <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={pan}
              onChange={e => setPan(e.target.value.toUpperCase())}
              placeholder="ABCDE1234F"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Mobile (linked with Aadhaar) <span className="text-rose-600">*</span>
            </label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              placeholder="10-digit mobile"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-1">
            Date of Birth (as per PAN)
          </label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={e => setDateOfBirth(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
          />
        </div>

        {/* Mandatory RBI consent checkbox */}
        <div className="p-3 bg-[#FBF7EE] rounded-xl border border-[#E8E1D5] space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={hasConsent}
              onChange={e => setHasConsent(e.target.checked)}
              className="mt-0.5 rounded border-[#E8E1D5] text-[#173B5E] focus:ring-[#D5A33A]"
            />
            <span className="text-xs text-[#173B5E] leading-relaxed">
              <strong>Applicant Authorization:</strong> I certify that Capitabee Financial Services has obtained signed explicit authorization from the applicant to access their credit information report from Credit Information Companies (CICRA 2005 compliant).
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E1D5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#617083] bg-[#FBF7EE] rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !hasConsent}
            className="px-5 py-2 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 shadow-xs"
          >
            <Lock className="w-4 h-4 text-[#D5A33A]" />
            <span>{submitting ? 'Inquiring Bureau...' : 'Inquire TransUnion Bureau'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

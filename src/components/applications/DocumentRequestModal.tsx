/**
 * Capitabee Financial Services CRM - Request Document Modal
 */

import React, { useState } from 'react';
import { Files, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { DocumentType } from '../../types';
import { api } from '../../services/api';

interface DocumentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string | null;
  onSuccess: () => void;
}

const STANDARD_DOC_TYPES: DocumentType[] = [
  'PAN Card',
  'Aadhaar / Address Proof',
  'Photograph',
  'Salary Slip (3 Months)',
  'Form 16',
  'ITR & Computation (2 Years)',
  'Bank Statement (6/12 Months)',
  'GST Returns (1 Year)',
  'Audited Balance Sheet & P&L',
  'Property Chain Documents',
  'Sanction Letter / Loan Statement',
  'Company KYC / MOA / AOA / Partnership Deed',
  'Other Documents',
];

export const DocumentRequestModal: React.FC<DocumentRequestModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  onSuccess,
}) => {
  const [docType, setDocType] = useState<DocumentType>('PAN Card');
  const [customName, setCustomName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!applicationId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.requestDocument(
        applicationId,
        docType,
        docType === 'Other Documents' ? customName : undefined
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to request document.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="request-document-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Request Document from Applicant"
      subtitle={`Application: ${applicationId}. Synchronized with future Customer Portal API.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-1">
            Required Financial Document Type
          </label>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value as DocumentType)}
            className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D5] rounded-lg font-medium"
          >
            {STANDARD_DOC_TYPES.map(dt => (
              <option key={dt} value={dt}>
                {dt}
              </option>
            ))}
          </select>
        </div>

        {docType === 'Other Documents' && (
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Custom Document Name / Description
            </label>
            <input
              type="text"
              required
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="e.g. Sanction letter of running vehicle loan"
              className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D5] rounded-lg"
            />
          </div>
        )}

        <div className="p-3 bg-[#FBF7EE] rounded-lg border border-[#E8E1D5] text-[11px] text-[#617083] space-y-1">
          <p className="font-semibold text-[#173B5E]">Document Security & API Contract:</p>
          <p>
            When submitted, this creates a record in the database with status <strong>Requested</strong>.
            The future customer portal can upload files directly through <code>POST /api/applications/:id/documents/upload</code>.
          </p>
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
            disabled={submitting}
            className="px-5 py-2 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors flex items-center gap-2"
          >
            <Files className="w-4 h-4 text-[#D5A33A]" />
            <span>{submitting ? 'Requesting...' : 'Send Document Request'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

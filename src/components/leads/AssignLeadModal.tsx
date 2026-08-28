/**
 * Capitabee Financial Services CRM - Assign Lead Modal
 */

import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Lead, User } from '../../types';
import { api } from '../../services/api';

interface AssignLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  associates: User[];
  onSuccess: () => void;
}

export const AssignLeadModal: React.FC<AssignLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  associates,
  onSuccess,
}) => {
  const [selectedAssociateId, setSelectedAssociateId] = useState(lead?.assignedAssociateId || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lead) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.assignLead(lead.id, selectedAssociateId || null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign lead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="assign-lead-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Lead: ${lead.id}`}
      subtitle={`Assign ${lead.customerName} (${lead.loanType}) to a Loan Relationship Associate`}
      maxWidth="md"
    >
      <form onSubmit={handleAssign} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-2">
            Select Associate
          </label>
          <select
            id="assign-associate-select"
            value={selectedAssociateId}
            onChange={e => setSelectedAssociateId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
          >
            <option value="">-- Unassign Lead --</option>
            {associates.map(a => (
              <option key={a.id} value={a.id}>
                {a.id} - {a.name} ({a.department} • Status: {a.status})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E1D5]">
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
            className="px-4 py-2 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4 text-[#D5A33A]" />
            <span>{submitting ? 'Assigning...' : 'Confirm Assignment'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

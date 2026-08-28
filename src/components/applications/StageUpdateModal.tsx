/**
 * Capitabee Financial Services CRM - 12-Stage Loan Pipeline Update Modal
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Application, StageInfo, StageStatus } from '../../types';
import { api } from '../../services/api';

interface StageUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
  stageToEdit?: StageInfo | null;
  onSuccess: (updatedApp: Application) => void;
}

export const StageUpdateModal: React.FC<StageUpdateModalProps> = ({
  isOpen,
  onClose,
  application,
  stageToEdit,
  onSuccess,
}) => {
  const [selectedStageNum, setSelectedStageNum] = useState<number>(1);
  const [status, setStatus] = useState<StageStatus>('In Progress');
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stageToEdit) {
      setSelectedStageNum(stageToEdit.number);
      setStatus(stageToEdit.status);
      setInternalNote(stageToEdit.notes || '');
    } else if (application) {
      setSelectedStageNum(application.currentStage);
      const cur = application.stages.find(s => s.number === application.currentStage);
      setStatus(cur ? cur.status : 'In Progress');
      setInternalNote('');
    }
    setError(null);
  }, [application, stageToEdit, isOpen]);

  if (!application) return null;

  const currentStageObj = application.stages.find(s => s.number === selectedStageNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.updateApplicationStage(
        application.id,
        selectedStageNum,
        status,
        internalNote.trim() || undefined
      );
      onSuccess(res.application);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update stage.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="stage-update-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Stage: ${application.id}`}
      subtitle={`Customer: ${application.customerName} • ${application.loanType}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-1">
            Select Stage to Update
          </label>
          <select
            value={selectedStageNum}
            onChange={e => {
              const num = Number(e.target.value);
              setSelectedStageNum(num);
              const found = application.stages.find(s => s.number === num);
              if (found) setStatus(found.status);
            }}
            className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D5] rounded-lg font-medium"
          >
            {application.stages.map(s => (
              <option key={s.number} value={s.number}>
                Stage {s.number}: {s.name} (Current: {s.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-1">
            New Stage Status <span className="text-rose-600">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(['Pending', 'In Progress', 'Completed', 'Action Required', 'Rejected'] as StageStatus[]).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatus(st)}
                className={`py-2 px-2 text-xs font-bold rounded-lg border transition-all ${
                  status === st
                    ? 'bg-[#173B5E] text-white border-[#173B5E] shadow-2xs'
                    : 'bg-white text-[#617083] border-[#E8E1D5] hover:bg-[#FBF7EE]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-1">
            Operational Note / Compliance Remarks
          </label>
          <textarea
            rows={3}
            value={internalNote}
            onChange={e => setInternalNote(e.target.value)}
            placeholder="e.g. Bank login completed at HDFC Bank. FCU verification pending. Sanction expected within 48 hours..."
            className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
          />
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
            <CheckCircle2 className="w-4 h-4 text-[#D5A33A]" />
            <span>{submitting ? 'Updating...' : 'Confirm Stage Update'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

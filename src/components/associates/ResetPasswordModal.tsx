/**
 * Capitabee Financial Services CRM - Reset Password Modal
 */

import React, { useState } from 'react';
import { KeyRound, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { User } from '../../types';
import { api } from '../../services/api';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  associate: User | null;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  associate,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!associate) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.resetAssociatePassword(associate.id, newPassword);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="reset-password-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={`Reset Password: ${associate.name}`}
      subtitle={`Associate ID: ${associate.id} • ${associate.email}`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-1">New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-1">Confirm New Password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
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
            className="px-4 py-2 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg flex items-center gap-1.5 shadow-xs"
          >
            <KeyRound className="w-4 h-4 text-[#D5A33A]" />
            <span>{submitting ? 'Updating...' : 'Set Password'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

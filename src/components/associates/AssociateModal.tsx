/**
 * Capitabee Financial Services CRM - Create / Edit Associate Modal
 */

import React, { useState, useEffect } from 'react';
import { UserCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../common/Modal';
import { User } from '../../types';
import { api } from '../../services/api';

interface AssociateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialAssociate?: User | null;
}

export const AssociateModal: React.FC<AssociateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialAssociate,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [associateId, setAssociateId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [department, setDepartment] = useState('Loan Operations');
  const [designation, setDesignation] = useState('Loan Relationship Associate');
  const [monthlyTarget, setMonthlyTarget] = useState('2500000');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Suspended'>('Active');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAssociate) {
      setName(initialAssociate.name);
      setEmail(initialAssociate.email);
      setMobile(initialAssociate.mobile);
      setAssociateId(initialAssociate.id);
      setPassword('');
      setConfirmPassword('');
      setDepartment(initialAssociate.department || 'Loan Operations');
      setDesignation(initialAssociate.designation || 'Loan Relationship Associate');
      setMonthlyTarget(String(initialAssociate.monthlyTarget || 2500000));
      setStatus(initialAssociate.status);
    } else {
      setName('');
      setEmail('');
      setMobile('');
      setAssociateId('');
      setPassword('');
      setConfirmPassword('');
      setDepartment('Loan Operations');
      setDesignation('Loan Relationship Associate');
      setMonthlyTarget('2500000');
      setStatus('Active');
    }
    setError(null);
  }, [initialAssociate, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !mobile.trim()) {
      setError('Please fill in Name, Email, and Mobile.');
      return;
    }

    if (!initialAssociate) {
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (initialAssociate) {
        await api.updateAssociate(initialAssociate.id, {
          name,
          email,
          mobile,
          department,
          designation,
          monthlyTarget: Number(monthlyTarget) || 0,
          status,
        });
      } else {
        await api.createAssociate({
          name,
          email,
          mobile,
          password,
          associateId: associateId.trim() || undefined,
          department,
          designation,
          monthlyTarget: Number(monthlyTarget) || 0,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save associate.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="associate-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={initialAssociate ? `Edit Associate: ${initialAssociate.id}` : 'Add New Relationship Associate'}
      subtitle="Creates official employee profile for CRM loan management & lead assignments."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Associate Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Priya Deshmukh"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Official Email <span className="text-rose-600">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="priya@capitabee.com"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Mobile Number <span className="text-rose-600">*</span>
            </label>
            <input
              type="tel"
              required
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              placeholder="9876543210"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Associate ID (Optional)
            </label>
            <input
              type="text"
              disabled={!!initialAssociate}
              value={associateId}
              onChange={e => setAssociateId(e.target.value)}
              placeholder="Leave blank for auto CB-XXXX"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg font-mono disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">Department</label>
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
            >
              <option value="Loan Operations">Loan Operations</option>
              <option value="Direct Sales">Direct Sales / Origination</option>
              <option value="Credit & Underwriting">Credit & Underwriting</option>
              <option value="Legal & Technical">Legal & Technical</option>
              <option value="Customer Verification">Customer Verification</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">Designation</label>
            <input
              type="text"
              value={designation}
              onChange={e => setDesignation(e.target.value)}
              placeholder="e.g. Loan Relationship Associate"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Monthly Disbursement Target (₹)
            </label>
            <input
              type="number"
              value={monthlyTarget}
              onChange={e => setMonthlyTarget(e.target.value)}
              placeholder="e.g. 2500000"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
            />
          </div>

          {initialAssociate && (
            <div>
              <label className="block text-xs font-bold text-[#173B5E] mb-1">Account Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
              >
                <option value="Active">Active (Can Login & Receive Leads)</option>
                <option value="Inactive">Inactive (Cannot Login)</option>
                <option value="Suspended">Suspended (Access Revoked)</option>
              </select>
            </div>
          )}
        </div>

        {!initialAssociate && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E8E1D5]">
            <div>
              <label className="block text-xs font-bold text-[#173B5E] mb-1">
                Temporary Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-[#7A8795]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#173B5E] mb-1">
                Confirm Password <span className="text-rose-600">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
              />
            </div>
          </div>
        )}

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
            className="px-5 py-2 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors flex items-center gap-2 shadow-xs"
          >
            <UserCheck className="w-4 h-4 text-[#D5A33A]" />
            <span>{submitting ? 'Saving...' : initialAssociate ? 'Update Associate' : 'Create Associate'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

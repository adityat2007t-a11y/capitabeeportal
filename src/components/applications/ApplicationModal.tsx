/**
 * Capitabee Financial Services CRM - Create Loan Application Modal
 */

import React, { useState, useEffect } from 'react';
import { Briefcase, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Application, Lead, User } from '../../types';
import { INITIAL_LOAN_PRODUCTS, LENDING_PARTNERS } from '../../config/brand';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (app: Application) => void;
  fromLead?: Lead | null;
  associates?: User[];
}

export const ApplicationModal: React.FC<ApplicationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  fromLead,
  associates = [],
}) => {
  const { role, user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loanType, setLoanType] = useState('Working Capital');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [lenderPartner, setLenderPartner] = useState('');
  const [assignedAssociateId, setAssignedAssociateId] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fromLead) {
      setCustomerName(fromLead.customerName);
      setCustomerPhone(fromLead.mobile);
      setCustomerEmail(fromLead.email || '');
      setCity(fromLead.city || '');
      setState(fromLead.state || '');
      setLoanType(fromLead.loanType);
      setRequestedAmount(String(fromLead.requiredAmount || ''));
      setAssignedAssociateId(fromLead.assignedAssociateId || '');
      setNotes(`Initiated from Lead: ${fromLead.id}`);
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCity('');
      setState('');
      setLoanType('Working Capital');
      setRequestedAmount('');
      setLenderPartner('');
      setAssignedAssociateId(role === 'ASSOCIATE' ? user?.id || '' : '');
      setNotes('');
    }
    setError(null);
  }, [fromLead, isOpen, role, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerPhone.trim() || !requestedAmount) {
      setError('Please fill in Customer Name, Phone, and Requested Amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createApplication({
        leadId: fromLead?.id,
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        city: city || undefined,
        state: state || undefined,
        loanType,
        requestedAmount: Number(requestedAmount),
        lenderPartner: lenderPartner || undefined,
        assignedAssociateId: assignedAssociateId || undefined,
        notes: notes || undefined,
      });
      onSuccess(res.application);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="create-application-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Create Loan Application File"
      subtitle="Generates unique application ID (APP-2026-XXXXXX) with 12-stage loan tracking."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {fromLead && (
          <div className="p-2.5 rounded-lg bg-[#FBF7EE] border border-[#E8E1D5] text-xs text-[#173B5E] flex items-center justify-between">
            <span>
              Linking to Lead ID: <strong className="font-mono">{fromLead.id}</strong>
            </span>
            <span className="font-semibold">{fromLead.leadSource}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Customer Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g. Anand Mahindra"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Mobile Phone <span className="text-rose-600">*</span>
            </label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="10-digit mobile"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              placeholder="applicant@company.com"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Loan Product <span className="text-rose-600">*</span>
            </label>
            <select
              value={loanType}
              onChange={e => setLoanType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            >
              {INITIAL_LOAN_PRODUCTS.map(p => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Requested Loan Amount (₹) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              required
              min="50000"
              value={requestedAmount}
              onChange={e => setRequestedAmount(e.target.value)}
              placeholder="e.g. 10000000"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Proposed Lending Partner
            </label>
            <select
              value={lenderPartner}
              onChange={e => setLenderPartner(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            >
              <option value="">-- Choose Partner / Lending Network --</option>
              {LENDING_PARTNERS.map(l => (
                <option key={l.name} value={l.name}>
                  {l.name} ({l.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">City</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Thane / Mumbai"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">State</label>
            <input
              type="text"
              value={state}
              onChange={e => setState(e.target.value)}
              placeholder="e.g. Maharashtra"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
            />
          </div>

          {role === 'ADMIN' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#173B5E] mb-1">
                Assigned Associate
              </label>
              <select
                value={assignedAssociateId}
                onChange={e => setAssignedAssociateId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
              >
                <option value="">-- Leave Unassigned --</option>
                {associates.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.id} - {a.name} ({a.department})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#173B5E] mb-1">
            Application Case Notes / Underwriting Remarks
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Property valuation estimate, collateral type, current turnover, banking health..."
            className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg"
          />
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
            className="px-5 py-2 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4 text-[#D5A33A]" />
            <span>{submitting ? 'Creating...' : 'Create Application'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Capitabee Financial Services - Create / Edit Lead Modal
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Lead, User, LeadSource, LeadPriority } from '../../types';
import { INITIAL_LOAN_PRODUCTS, LEAD_SOURCES } from '../../config/brand';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead) => void;
  initialLead?: Lead | null;
  associates?: User[];
}

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialLead,
  associates = [],
}) => {
  const { role } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loanType, setLoanType] = useState('Working Capital');
  const [requiredAmount, setRequiredAmount] = useState('');
  const [employmentType, setEmploymentType] = useState<'Salaried' | 'Self Employed Professional' | 'Self Employed Business' | 'Other'>('Salaried');
  const [leadSource, setLeadSource] = useState<LeadSource>('Manual Entry');
  const [assignedAssociateId, setAssignedAssociateId] = useState('');
  const [priority, setPriority] = useState<LeadPriority>('WARM');
  const [notes, setNotes] = useState('');

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [forceDuplicate, setForceDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialLead) {
      setCustomerName(initialLead.customerName);
      setMobile(initialLead.mobile);
      setEmail(initialLead.email || '');
      setCity(initialLead.city || '');
      setState(initialLead.state || '');
      setLoanType(initialLead.loanType);
      setRequiredAmount(String(initialLead.requiredAmount || ''));
      setEmploymentType(initialLead.employmentType || 'Salaried');
      setLeadSource(initialLead.leadSource);
      setAssignedAssociateId(initialLead.assignedAssociateId || '');
      setPriority(initialLead.priority);
      setNotes(initialLead.notes || '');
    } else {
      setCustomerName('');
      setMobile('');
      setEmail('');
      setCity('');
      setState('');
      setLoanType('Working Capital');
      setRequiredAmount('');
      setEmploymentType('Salaried');
      setLeadSource('Manual Entry');
      setAssignedAssociateId('');
      setPriority('WARM');
      setNotes('');
    }
    setDuplicateWarning(null);
    setForceDuplicate(false);
    setError(null);
  }, [initialLead, isOpen]);

  const handleMobileBlur = async () => {
    if (!mobile || mobile.length < 10 || initialLead) return;
    try {
      const res = await api.checkDuplicateLead(mobile, email);
      if (res.isDuplicate && res.existingLead) {
        setDuplicateWarning(res.message || 'Possible duplicate lead found with this mobile number.');
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !mobile.trim() || !requiredAmount) {
      setError('Please fill in all required fields (Name, Mobile, Required Amount).');
      return;
    }

    setSubmitting(true);
    try {
      if (initialLead) {
        const res = await api.updateLead(initialLead.id, {
          customerName,
          mobile,
          email: email || undefined,
          city: city || undefined,
          state: state || undefined,
          loanType,
          requiredAmount: Number(requiredAmount),
          employmentType,
          priority,
        });
        onSuccess(res.lead);
      } else {
        const res = await api.createLead({
          customerName,
          mobile,
          email: email || undefined,
          city: city || undefined,
          state: state || undefined,
          loanType,
          requiredAmount: Number(requiredAmount),
          employmentType,
          leadSource,
          assignedAssociateId: assignedAssociateId || undefined,
          priority,
          notes,
          forceDuplicate,
        });
        onSuccess(res.lead);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save lead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="lead-create-edit-modal"
      isOpen={isOpen}
      onClose={onClose}
      title={initialLead ? `Edit Lead: ${initialLead.id}` : 'Add New Loan Lead'}
      subtitle="Enter genuine customer information. Mobile number will be validated against existing records."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Duplicate Detection Warning */}
        {duplicateWarning && (
          <div className="p-3 text-xs bg-amber-50 text-amber-800 border border-amber-300 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#B98520] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{duplicateWarning}</p>
                <p className="text-[11px] text-[#617083] mt-0.5">
                  You may proceed only if you confirm this is a distinct applicant or requirement.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={forceDuplicate}
                onChange={e => setForceDuplicate(e.target.checked)}
                className="rounded border-[#E8E1D5] text-[#173B5E] focus:ring-[#D5A33A]"
              />
              <span className="font-semibold text-[11px]">Confirm & save as new lead anyway</span>
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Customer Full Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              id="lead-name-input"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Chandra Sharma"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Mobile Number <span className="text-rose-600">*</span>
            </label>
            <input
              type="tel"
              required
              id="lead-mobile-input"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              onBlur={handleMobileBlur}
              placeholder="10-digit mobile number"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="lead-email-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          {/* Loan Product */}
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Loan Product <span className="text-rose-600">*</span>
            </label>
            <select
              id="lead-loan-type-select"
              value={loanType}
              onChange={e => setLoanType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            >
              {INITIAL_LOAN_PRODUCTS.map(prod => (
                <option key={prod.id} value={prod.name}>
                  {prod.name} ({prod.ratePerAnnum})
                </option>
              ))}
            </select>
          </div>

          {/* Required Amount */}
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Required Loan Amount (₹) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              required
              min="50000"
              id="lead-amount-input"
              value={requiredAmount}
              onChange={e => setRequiredAmount(e.target.value)}
              placeholder="e.g. 5000000"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          {/* Employment Type */}
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Employment Profile
            </label>
            <select
              id="lead-employment-select"
              value={employmentType}
              onChange={e => setEmploymentType(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            >
              <option value="Salaried">Salaried (MNC / Corporate / Govt)</option>
              <option value="Self Employed Business">Self Employed Business (Proprietorship / Pvt Ltd / LLP)</option>
              <option value="Self Employed Professional">Self Employed Professional (CA / Doctor / Architect)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">City</label>
            <input
              type="text"
              id="lead-city-input"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Thane / Mumbai / Pune"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">State</label>
            <input
              type="text"
              id="lead-state-input"
              value={state}
              onChange={e => setState(e.target.value)}
              placeholder="e.g. Maharashtra"
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>

          {/* Lead Source */}
          {!initialLead && (
            <div>
              <label className="block text-xs font-bold text-[#173B5E] mb-1">
                Lead Source <span className="text-rose-600">*</span>
              </label>
              <select
                id="lead-source-select"
                value={leadSource}
                onChange={e => setLeadSource(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
              >
                {LEAD_SOURCES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lead Priority */}
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">Priority</label>
            <select
              id="lead-priority-select"
              value={priority}
              onChange={e => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            >
              <option value="HOT">HOT (Immediate requirement)</option>
              <option value="WARM">WARM (Evaluating within 15-30 days)</option>
              <option value="COLD">COLD (Future inquiry)</option>
            </select>
          </div>

          {/* Assign to Associate (Admin only) */}
          {role === 'ADMIN' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#173B5E] mb-1">
                Assign to Associate
              </label>
              <select
                id="lead-associate-select"
                value={assignedAssociateId}
                onChange={e => setAssignedAssociateId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
              >
                <option value="">-- Leave Unassigned --</option>
                {associates.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.id} - {a.name} ({a.department || 'Operations'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Initial Notes */}
        {!initialLead && (
          <div>
            <label className="block text-xs font-bold text-[#173B5E] mb-1">
              Initial Discussion / Requirement Notes
            </label>
            <textarea
              id="lead-notes-input"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add key background: turnover, existing loans, property details, preferred lender..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8E1D5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#617083] bg-[#FBF7EE] hover:bg-[#E8E1D5]/60 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            id="save-lead-submit-btn"
            className="px-5 py-2 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors shadow-xs disabled:opacity-60 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#D5A33A]" />
            <span>{submitting ? 'Saving...' : initialLead ? 'Update Lead' : 'Save Lead'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Capitabee Financial Services CRM - Lead Detail Drawer
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  FileText,
  Plus,
  Send,
} from 'lucide-react';
import { Lead, FollowUp, LeadNote, Application, AuditLog, LeadStatus, LeadPriority } from '../../types';
import { LEAD_STATUSES, LOST_LEAD_REASONS } from '../../config/brand';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppActionModal, WhatsAppTarget } from '../common/WhatsAppActionModal';

interface LeadDetailDrawerProps {
  leadId: string | null;
  onClose: () => void;
  onUpdate: () => void;
  onConvertToApplication: (lead: Lead) => void;
  onOpenAssignModal: (lead: Lead) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  leadId,
  onClose,
  onUpdate,
  onConvertToApplication,
  onOpenAssignModal,
}) => {
  const { role, user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'details' | 'followups' | 'notes' | 'audit'>('details');

  // Follow-up form
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [fuDate, setFuDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuTime, setFuTime] = useState('11:00');
  const [fuType, setFuType] = useState('Call');
  const [fuNotes, setFuNotes] = useState('');

  // New Note
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Status edit
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('New');
  const [lostReason, setLostReason] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const loadLeadDetails = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const data = await api.getLead(leadId);
      setLead(data.lead);
      setSelectedStatus(data.lead.leadStatus);
      setLostReason(data.lead.lostReason || '');
      setFollowUps(data.followUps || []);
      setNotes(data.notes || []);
      setApps(data.applications || []);
      setAudit(data.audit || []);
    } catch (err: any) {
      console.error('Error loading lead detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      loadLeadDetails();
      setActiveTab('details');
      setShowFollowUpForm(false);
    }
  }, [leadId]);

  if (!leadId) return null;

  const handleStatusChange = async () => {
    if (!lead) return;
    if (selectedStatus === 'Lost' && !lostReason.trim()) {
      alert('A specific Lost Reason is mandatory when marking a lead as Lost.');
      return;
    }

    setSavingStatus(true);
    try {
      await api.updateLead(lead.id, {
        leadStatus: selectedStatus,
        lostReason: selectedStatus === 'Lost' ? lostReason : undefined,
      });
      setStatusMsg('Status updated successfully');
      setTimeout(() => setStatusMsg(''), 3000);
      loadLeadDetails();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority: LeadPriority) => {
    if (!lead) return;
    try {
      await api.updateLead(lead.id, { priority: newPriority });
      loadLeadDetails();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newNote.trim()) return;
    setAddingNote(true);
    try {
      await api.addLeadNote(lead.id, newNote);
      setNewNote('');
      loadLeadDetails();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !fuDate || !fuTime) return;
    try {
      await api.createFollowUp(lead.id, {
        scheduledDate: fuDate,
        scheduledTime: fuTime,
        type: fuType,
        notes: fuNotes,
      });
      setShowFollowUpForm(false);
      setFuNotes('');
      loadLeadDetails();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule follow-up');
    }
  };

  const handleCompleteFollowUp = async (fuId: string) => {
    try {
      await api.updateFollowUp(fuId, { status: 'Completed', outcome: 'Discussion completed' });
      loadLeadDetails();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to complete follow-up');
    }
  };

  const cleanPhone = lead?.mobile ? lead.mobile.replace(/\D/g, '') : '';
  const phoneFormatted = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

  return (
    <div
      id="lead-detail-drawer"
      className="fixed inset-0 z-50 overflow-hidden bg-[#173B5E]/40 backdrop-blur-xs flex justify-end"
    >
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-[#E8E1D5]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E1D5] bg-[#FBF7EE]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#173B5E] bg-white px-2 py-0.5 rounded border border-[#E8E1D5]">
                {lead?.id}
              </span>
              <h3 className="text-lg font-bold text-[#173B5E] truncate">
                {lead?.customerName}
              </h3>
            </div>
            <p className="text-xs text-[#617083] mt-0.5">
              Source: <span className="font-semibold">{lead?.leadSource}</span> • Created:{' '}
              {lead?.createdDate ? new Date(lead.createdDate).toLocaleDateString() : ''}
            </p>
          </div>
          <button
            type="button"
            id="close-lead-drawer-btn"
            onClick={onClose}
            className="p-1.5 text-[#7A8795] hover:text-[#173B5E] hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Action Contact Bar (Strictly no dead buttons!) */}
        <div className="px-6 py-3 bg-white border-b border-[#E8E1D5] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {/* CALL Button */}
            <a
              href={`tel:${lead?.mobile}`}
              id="call-customer-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#173B5E] bg-[#FBF7EE] border border-[#E8E1D5] hover:border-[#D5A33A] rounded-lg transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#2BAE9B]" />
              <span>Call ({lead?.mobile})</span>
            </a>

            {/* WhatsApp Button */}
            <button
              type="button"
              id="whatsapp-customer-btn"
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Email Button */}
            {lead?.email && (
              <a
                href={`mailto:${lead.email}?subject=Capitabee%20Financial%20Services%20-%20Loan%20Application%20Update`}
                id="email-customer-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </a>
            )}
          </div>

          {/* Convert to Application Button */}
          {apps.length === 0 ? (
            <button
              type="button"
              id="convert-lead-to-app-btn"
              onClick={() => lead && onConvertToApplication(lead)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-[#D5A33A]" />
              <span>Start Application</span>
            </button>
          ) : (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              Application: {apps[0].id}
            </span>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E8E1D5] bg-[#FBF7EE]/40 px-6">
          {(['details', 'followups', 'notes', 'audit'] as const).map(tab => (
            <button
              key={tab}
              id={`tab-btn-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-[#173B5E] text-[#173B5E] bg-white'
                  : 'border-transparent text-[#617083] hover:text-[#173B5E]'
              }`}
            >
              {tab === 'details'
                ? 'Overview'
                : tab === 'followups'
                ? `Follow-ups (${followUps.length})`
                : tab === 'notes'
                ? `Notes (${notes.length})`
                : `Audit Trail (${audit.length})`}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-12 text-center text-xs text-[#617083]">
              Loading lead details...
            </div>
          )}

          {!loading && lead && activeTab === 'details' && (
            <div className="space-y-6">
              {/* Status & Priority Management Card */}
              <div className="p-4 rounded-xl border border-[#E8E1D5] bg-[#FBF7EE]/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#617083]">
                    Lead Status & Pipeline Stage
                  </span>
                  {statusMsg && <span className="text-xs text-emerald-600 font-bold">{statusMsg}</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#173B5E] mb-1">
                      Current Status
                    </label>
                    <select
                      id="lead-status-dropdown"
                      value={selectedStatus}
                      onChange={e => setSelectedStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E8E1D5] rounded-lg font-medium"
                    >
                      {LEAD_STATUSES.map(st => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#173B5E] mb-1">
                      Priority
                    </label>
                    <div className="flex items-center gap-1.5">
                      {(['HOT', 'WARM', 'COLD'] as LeadPriority[]).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePriorityChange(p)}
                          className={`flex-1 py-1 text-xs font-bold rounded border transition-all ${
                            lead.priority === p
                              ? 'bg-[#173B5E] text-white border-[#173B5E]'
                              : 'bg-white text-[#617083] border-[#E8E1D5] hover:bg-[#FBF7EE]'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lost Reason if status is Lost */}
                {selectedStatus === 'Lost' && (
                  <div>
                    <label className="block text-[11px] font-bold text-rose-700 mb-1">
                      Mandatory Lost Reason <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="lost-reason-dropdown"
                      value={lostReason}
                      onChange={e => setLostReason(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-rose-300 rounded-lg text-rose-800 font-medium"
                    >
                      <option value="">-- Select reason why lead was lost --</option>
                      {LOST_LEAD_REASONS.map(r => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={savingStatus}
                    onClick={handleStatusChange}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors shadow-2xs"
                  >
                    {savingStatus ? 'Saving...' : 'Update Status'}
                  </button>
                </div>
              </div>

              {/* Loan Requirement & Customer Profile Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-[#E8E1D5] bg-white">
                  <p className="text-[11px] font-bold text-[#617083] uppercase">Requested Loan</p>
                  <p className="text-base font-extrabold text-[#173B5E] mt-1">
                    ₹{Number(lead.requiredAmount).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-[#B98520] font-semibold mt-0.5">{lead.loanType}</p>
                </div>

                <div className="p-3.5 rounded-lg border border-[#E8E1D5] bg-white">
                  <p className="text-[11px] font-bold text-[#617083] uppercase">Assigned Associate</p>
                  <div className="mt-1 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#173B5E]">
                        {lead.assignedAssociateName || 'Unassigned'}
                      </p>
                      {lead.assignedAssociateId && (
                        <p className="text-[10px] text-[#617083] font-mono">{lead.assignedAssociateId}</p>
                      )}
                    </div>
                    {role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => onOpenAssignModal(lead)}
                        className="text-xs text-[#B98520] hover:underline font-bold"
                      >
                        Change
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Profile Details */}
              <div className="p-4 rounded-xl border border-[#E8E1D5] bg-white space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#617083]">
                  Applicant Information
                </h4>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-[#617083]">Full Name:</span>
                    <p className="font-semibold text-[#173B5E]">{lead.customerName}</p>
                  </div>
                  <div>
                    <span className="text-[#617083]">Mobile Phone:</span>
                    <p className="font-semibold text-[#173B5E]">{lead.mobile}</p>
                  </div>
                  <div>
                    <span className="text-[#617083]">Email:</span>
                    <p className="font-semibold text-[#173B5E]">{lead.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-[#617083]">Employment:</span>
                    <p className="font-semibold text-[#173B5E]">{lead.employmentType || 'Salaried'}</p>
                  </div>
                  <div>
                    <span className="text-[#617083]">Location:</span>
                    <p className="font-semibold text-[#173B5E]">
                      {[lead.city, lead.state].filter(Boolean).join(', ') || 'India'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#617083]">Next Follow-up:</span>
                    <p className="font-semibold text-[#B98520]">
                      {lead.nextFollowUpDate || 'No scheduled follow-up'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Marketing / Campaign Attribution */}
              {(lead.utmSource || lead.utmCampaign || lead.landingPage) && (
                <div className="p-4 rounded-xl border border-[#E8E1D5] bg-[#FBF7EE]/60 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#617083]">
                    Marketing & Campaign Attribution
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {lead.utmSource && (
                      <div>
                        <span className="text-[#617083]">UTM Source:</span>{' '}
                        <span className="font-semibold text-[#173B5E]">{lead.utmSource}</span>
                      </div>
                    )}
                    {lead.utmCampaign && (
                      <div>
                        <span className="text-[#617083]">Campaign:</span>{' '}
                        <span className="font-semibold text-[#173B5E]">{lead.utmCampaign}</span>
                      </div>
                    )}
                    {lead.landingPage && (
                      <div className="col-span-2">
                        <span className="text-[#617083]">Landing Page:</span>{' '}
                        <span className="font-mono text-[11px] text-[#173B5E]">{lead.landingPage}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Follow-ups Tab */}
          {!loading && activeTab === 'followups' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#617083]">
                  Scheduled & Past Follow-ups
                </h4>
                <button
                  type="button"
                  id="add-followup-toggle-btn"
                  onClick={() => setShowFollowUpForm(!showFollowUpForm)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#D5A33A]" />
                  <span>Schedule Follow-up</span>
                </button>
              </div>

              {/* Schedule form */}
              {showFollowUpForm && (
                <form
                  onSubmit={handleCreateFollowUp}
                  className="p-4 rounded-xl border border-[#D5A33A]/40 bg-[#FBF7EE] space-y-3"
                >
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#173B5E] mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={fuDate}
                        onChange={e => setFuDate(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-[#E8E1D5] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#173B5E] mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={fuTime}
                        onChange={e => setFuTime(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-[#E8E1D5] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#173B5E] mb-1">Mode</label>
                      <select
                        value={fuType}
                        onChange={e => setFuType(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-[#E8E1D5] rounded-lg"
                      >
                        <option value="Call">Phone Call</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Meeting">Meeting (Office / Site)</option>
                        <option value="Email">Email</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#173B5E] mb-1">Notes / Agenda</label>
                    <input
                      type="text"
                      value={fuNotes}
                      onChange={e => setFuNotes(e.target.value)}
                      placeholder="e.g. Discuss ITR documents and bank statement eligibility..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#E8E1D5] rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFollowUpForm(false)}
                      className="px-3 py-1 text-xs text-[#617083] bg-white rounded border border-[#E8E1D5]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded shadow-2xs"
                    >
                      Confirm Schedule
                    </button>
                  </div>
                </form>
              )}

              {/* Follow-up list */}
              {followUps.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#617083] bg-white rounded-lg border border-dashed border-[#E8E1D5]">
                  No follow-ups due or scheduled for this lead.
                </div>
              ) : (
                <div className="space-y-2">
                  {followUps.map(fu => (
                    <div
                      key={fu.id}
                      className="p-3.5 rounded-lg border border-[#E8E1D5] bg-white flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              fu.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {fu.type} • {fu.status}
                          </span>
                          <span className="text-xs font-semibold text-[#173B5E]">
                            {fu.scheduledDate} at {fu.scheduledTime}
                          </span>
                        </div>
                        {fu.notes && (
                          <p className="text-xs text-[#617083] mt-1">{fu.notes}</p>
                        )}
                        <p className="text-[10px] text-[#7A8795] mt-1">
                          By {fu.associateName} • Created {new Date(fu.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      {fu.status === 'Pending' && (
                        <button
                          type="button"
                          onClick={() => handleCompleteFollowUp(fu.id)}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded transition-colors"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Internal Notes Tab */}
          {!loading && activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <label className="block text-xs font-bold text-[#173B5E]">
                  Add Internal Observation / Discussion Note
                </label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Record discussions, banking remarks, client preference, or lender feedback..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#E8E1D5] rounded-lg focus:outline-hidden focus:border-[#D5A33A]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingNote || !newNote.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#173B5E] hover:bg-[#244C70] rounded-lg transition-colors disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5 text-[#D5A33A]" />
                    <span>{addingNote ? 'Posting...' : 'Post Note'}</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2 pt-2">
                {notes.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#617083] bg-white rounded-lg border border-dashed border-[#E8E1D5]">
                    No internal notes logged yet.
                  </div>
                ) : (
                  notes.map(n => (
                    <div
                      key={n.id}
                      className="p-3.5 rounded-lg border border-[#E8E1D5] bg-white space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#617083]">
                        <span className="font-bold text-[#173B5E]">
                          {n.authorName} ({n.authorRole})
                        </span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-[#173B5E] leading-relaxed">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Audit Trail Tab */}
          {!loading && activeTab === 'audit' && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#617083] mb-3">
                Lead Audit Timeline
              </h4>
              {audit.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#617083] bg-white rounded-lg border border-dashed border-[#E8E1D5]">
                  No audit logs recorded.
                </div>
              ) : (
                <div className="relative border-l-2 border-[#E8E1D5] ml-3 pl-4 space-y-4">
                  {audit.map(log => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-[#D5A33A] border-2 border-white" />
                      <p className="text-xs font-bold text-[#173B5E]">{log.action}</p>
                      <p className="text-[11px] text-[#617083] mt-0.5">{log.details}</p>
                      <p className="text-[10px] text-[#7A8795] mt-0.5 font-mono">
                        By {log.actorName} • {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {lead && (
        <WhatsAppActionModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          target={{
            customerName: lead.customerName,
            customerPhone: lead.mobile,
            leadId: lead.id,
            loanType: lead.loanType,
            defaultTemplate: 'GENERAL_FOLLOWUP',
          }}
          onSuccess={() => loadLeadDetails()}
        />
      )}
    </div>
  );
};

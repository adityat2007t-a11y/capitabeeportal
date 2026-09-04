/**
 * Capitabee Financial Services CRM - Application Detail & 12-Stage Pipeline Drawer
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Files,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileCheck,
  Upload,
} from 'lucide-react';
import { Application, DocumentRecord, StageUpdateLog, StageInfo } from '../../types';
import { StatusBadge } from '../common/Badge';
import { StageUpdateModal } from './StageUpdateModal';
import { DocumentRequestModal } from './DocumentRequestModal';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { WhatsAppActionModal } from '../common/WhatsAppActionModal';

interface ApplicationDetailDrawerProps {
  applicationId?: string | null;
  application?: Application | null;
  isOpen?: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onRefresh?: () => void;
  onUpdateStage?: (app: Application) => void;
  onRequestDocs?: (app: Application) => void;
}

export const ApplicationDetailDrawer: React.FC<ApplicationDetailDrawerProps> = ({
  applicationId,
  application,
  isOpen,
  onClose,
  onUpdate,
  onRefresh,
}) => {
  const { role, user } = useAuth();
  const effectiveAppId = applicationId || application?.id || null;
  const isVisible = isOpen !== undefined ? isOpen && !!effectiveAppId : !!effectiveAppId;

  const [app, setApp] = useState<Application | null>(application || null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [stageUpdates, setStageUpdates] = useState<StageUpdateLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'stages' | 'documents' | 'history' | 'details'>('stages');
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [selectedStageForEdit, setSelectedStageForEdit] = useState<StageInfo | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Financial details editing
  const [sanctionAmount, setSanctionAmount] = useState('');
  const [disbursedAmount, setDisbursedAmount] = useState('');
  const [editingAmounts, setEditingAmounts] = useState(false);

  // Rejection modal
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const triggerRefresh = () => {
    onUpdate?.();
    onRefresh?.();
  };

  const loadData = async () => {
    if (!effectiveAppId) return;
    setLoading(true);
    try {
      const res = await api.getApplication(effectiveAppId);
      setApp(res.application);
      setDocuments(res.documents || []);
      setStageUpdates(res.stageUpdates || []);
      setSanctionAmount(String(res.application.sanctionAmount || 0));
      setDisbursedAmount(String(res.application.disbursementAmount || 0));
    } catch (err: any) {
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (application) {
      setApp(application);
      setSanctionAmount(String(application.sanctionAmount || 0));
      setDisbursedAmount(String(application.disbursementAmount || 0));
    }
    if (effectiveAppId) {
      loadData();
      setActiveTab('stages');
      setEditingAmounts(false);
    }
  }, [effectiveAppId, application]);

  if (!isVisible || !effectiveAppId) return null;

  const handleSaveAmounts = async () => {
    if (!app) return;
    try {
      await api.updateApplication(app.id, {
        sanctionAmount: Number(sanctionAmount) || 0,
        disbursementAmount: Number(disbursedAmount) || 0,
      });
      setEditingAmounts(false);
      loadData();
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update amounts');
    }
  };

  const handleVerifyDocument = async (docId: string) => {
    try {
      await api.reviewDocument(docId, 'Verified');
      loadData();
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to verify document');
    }
  };

  const handleConfirmRejectDoc = async () => {
    if (!rejectingDocId || !rejectionReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    try {
      await api.reviewDocument(rejectingDocId, 'Rejected', rejectionReason.trim());
      setRejectingDocId(null);
      setRejectionReason('');
      loadData();
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to reject document');
    }
  };

  const handleSimulateUpload = async (docId: string, docName: string) => {
    try {
      await api.uploadDocument(
        app!.id,
        docId,
        `${docName.replace(/\s+/g, '_')}_ClientDoc.pdf`,
        '1.8 MB'
      );
      loadData();
      onUpdate();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    }
  };

  const cleanPhone = app?.customerPhone ? app.customerPhone.replace(/\D/g, '') : '';
  const phoneFormatted = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

  return (
    <div
      id="application-detail-drawer"
      className="fixed inset-0 z-50 overflow-hidden bg-[#121212]/40 backdrop-blur-xs flex justify-end"
    >
      <div className="relative w-full max-w-3xl bg-[#FAF9F6] shadow-2xl flex flex-col h-full border-l border-[#E8E6E1]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E8E6E1] bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="sans-micro text-[9px] text-[#121212] bg-[#FAF9F6] px-2.5 py-0.5 rounded-full border border-[#E8E6E1]">
                {app?.id}
              </span>
              <h3 className="serif-display text-xl font-normal italic text-[#121212] truncate">
                {app?.customerName}
              </h3>
              <StatusBadge status={app?.status || 'In Process'} />
            </div>
            <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em] mt-1">
              {app?.loanType} • Preferred Lender: <strong className="text-[#121212]">{app?.lenderPartner || 'Pending Selection'}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E8E6E1] bg-white hover:border-[#121212] flex items-center justify-center text-[#888888] hover:text-[#121212] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1-Click Action Bar */}
        <div className="px-6 py-3 bg-white border-b border-[#E8E6E1] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <a
              href={`tel:${app?.customerPhone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sans-micro text-[10px] uppercase tracking-wider text-[#121212] bg-[#FAF9F6] border border-[#E8E6E1] hover:border-[#121212] rounded-full transition-colors"
            >
              <Phone className="w-3 h-3 text-[#2D7A70]" />
              <span>Call ({app?.customerPhone})</span>
            </a>
            <button
              type="button"
              onClick={() => setIsWhatsAppModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sans-micro text-[10px] uppercase tracking-wider text-[#2D7A70] bg-[#EBF4F2] border border-[#C8E2DC] hover:bg-[#DDF0EB] rounded-full transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3 h-3" />
              <span>WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedStageForEdit(null);
                setIsStageModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sans-micro text-[10px] font-semibold uppercase tracking-[0.14em] text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 text-[#B89758]" />
              <span>Update Stage</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDocModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sans-micro text-[10px] uppercase tracking-wider text-[#121212] bg-white border border-[#E8E6E1] hover:border-[#121212] rounded-full transition-colors cursor-pointer"
            >
              <Files className="w-3 h-3 text-[#8C6D37]" />
              <span>Request Document</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Bar */}
        <div className="grid grid-cols-3 gap-2 px-6 py-3.5 bg-[#FAF9F6] border-b border-[#E8E6E1] text-xs">
          <div>
            <span className="sans-micro text-[9px] text-[#888888]">Requested:</span>
            <p className="serif-display text-lg font-normal text-[#121212]">
              ₹{Number(app?.requestedAmount || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <span className="sans-micro text-[9px] text-[#888888]">Sanction Amount:</span>
            <p className="serif-display text-lg font-normal text-[#2D7A70]">
              ₹{Number(app?.sanctionAmount || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <span className="sans-micro text-[9px] text-[#888888]">Disbursed Amount:</span>
            <p className="serif-display text-lg font-normal text-[#8C6D37]">
              ₹{Number(app?.disbursementAmount || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Tabs Header */}
        <div className="flex border-b border-[#E8E6E1] bg-white px-6 gap-1">
          {(['stages', 'documents', 'history', 'details'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 sans-micro text-[9.5px] font-medium tracking-[0.14em] uppercase border-b-2 transition-all cursor-pointer ${
                activeTab === tab
                  ? 'border-[#121212] text-[#121212]'
                  : 'border-transparent text-[#888888] hover:text-[#121212]'
              }`}
            >
              {tab === 'stages'
                ? `12-Stage Pipeline (${app?.currentStage}/12)`
                : tab === 'documents'
                ? `Documents (${documents.length})`
                : tab === 'history'
                ? `Stage Updates (${stageUpdates.length})`
                : 'Application Details'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="py-12 text-center sans-micro text-xs text-[#888888]">
              Loading application pipeline...
            </div>
          )}

          {/* 1. 12-STAGE PIPELINE TAB */}
          {!loading && app && activeTab === 'stages' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">
                  Standard 12-Stage Loan Journey
                </span>
                <span className="sans-micro text-[10px] font-semibold text-[#121212]">
                  Current: Stage {app.currentStage} ({app.currentStageName})
                </span>
              </div>

              <div className="space-y-2">
                {app.stages.map(st => {
                  const isCurrent = st.number === app.currentStage;
                  const isPassed = st.status === 'Completed';

                  return (
                    <div
                      key={st.number}
                      className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'border-[#B89758] bg-white shadow-2xs ring-1 ring-[#B89758]/30 artistic-card'
                          : isPassed
                          ? 'border-[#C8E2DC] bg-[#EBF4F2]/30'
                          : 'border-[#E8E6E1] bg-white opacity-85'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-normal text-xs shrink-0 mt-0.5 ${
                            isPassed
                              ? 'bg-[#2D7A70] text-white'
                              : isCurrent
                              ? 'bg-[#121212] text-[#B89758]'
                              : 'bg-[#FAF9F6] text-[#888888] border border-[#E8E6E1]'
                          }`}
                        >
                          {isPassed ? '✓' : st.number}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="serif-display text-sm font-normal text-[#121212]">
                              Stage {st.number}: {st.name}
                            </h5>
                            <StatusBadge status={st.status} />
                          </div>
                          {st.notes && (
                            <p className="text-xs text-[#666666] mt-1 italic font-serif">
                              "{st.notes}"
                            </p>
                          )}
                          {st.updatedAt && (
                            <p className="sans-micro text-[9px] text-[#888888] mt-1">
                              Last updated by {st.updatedBy || 'Staff'} on{' '}
                              {new Date(st.updatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStageForEdit(st);
                          setIsStageModalOpen(true);
                        }}
                        className="sans-micro px-3 py-1 text-[9.5px] uppercase tracking-wider text-[#121212] bg-white border border-[#E8E6E1] hover:border-[#121212] rounded-full transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. DOCUMENTS TAB */}
          {!loading && app && activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">
                    Requested & Uploaded Documents
                  </h4>
                  <p className="sans-micro text-[9px] text-[#888888]">
                    API Contract: <code>/api/applications/{app.id}/documents</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sans-micro text-[10px] font-semibold uppercase tracking-wider text-white bg-[#121212] hover:bg-[#262626] rounded-full transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#B89758]" />
                  <span>+ Request Doc</span>
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#888888] bg-white rounded-xl border border-dashed border-[#E8E6E1]">
                  No documents requested yet. Click "+ Request Doc" to request PAN, ITR, GST, etc.
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-xl border border-[#E8E6E1] bg-white artistic-card space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="sans-micro text-[9px] text-[#888888]">{doc.id}</span>
                            <span className="serif-display text-sm font-normal text-[#121212]">
                              {doc.customDocumentName || doc.documentType}
                            </span>
                            <StatusBadge status={doc.status} />
                          </div>
                          <p className="sans-micro text-[9px] text-[#888888] mt-0.5">
                            Requested by {doc.requestedBy} on{' '}
                            {new Date(doc.requestedDate).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {doc.status === 'Requested' && (
                            <button
                              type="button"
                              onClick={() => handleSimulateUpload(doc.id, doc.documentType)}
                              className="px-2.5 py-1 sans-micro text-[9.5px] uppercase tracking-wider text-[#121212] bg-[#FAF9F6] border border-[#E8E6E1] hover:border-[#121212] rounded-full flex items-center gap-1 cursor-pointer"
                              title="Simulate client upload via Future Customer Portal API"
                            >
                              <Upload className="w-3 h-3 text-[#2D7A70]" />
                              <span>Simulate Upload</span>
                            </button>
                          )}

                          {doc.status === 'Uploaded' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleVerifyDocument(doc.id)}
                                className="px-3 py-1 sans-micro text-[9.5px] uppercase tracking-wider text-[#2D7A70] bg-[#EBF4F2] border border-[#C8E2DC] hover:bg-[#DDF0EB] rounded-full cursor-pointer"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectingDocId(doc.id);
                                  setRejectionReason('');
                                }}
                                className="px-3 py-1 sans-micro text-[9.5px] uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-full cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {doc.fileName && (
                        <div className="flex items-center gap-2 text-xs bg-[#FAF9F6] p-2 rounded-lg border border-[#E8E6E1]">
                          <FileCheck className="w-4 h-4 text-[#2D7A70]" />
                          <span className="font-medium text-[#121212]">{doc.fileName}</span>
                          <span className="sans-micro text-[9px] text-[#888888]">({doc.fileSize})</span>
                        </div>
                      )}

                      {doc.rejectedReason && (
                        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                          <strong>Rejection Reason:</strong> {doc.rejectedReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. STAGE UPDATES HISTORY TAB */}
          {!loading && app && activeTab === 'history' && (
            <div className="space-y-3">
              <h4 className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em] mb-2">
                Stage Transition Timeline
              </h4>
              {stageUpdates.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#888888] bg-white rounded-lg border border-dashed border-[#E8E6E1]">
                  No stage transitions recorded yet.
                </div>
              ) : (
                <div className="relative border-l border-[#E8E6E1] ml-3 pl-4 space-y-4">
                  {stageUpdates.map(su => (
                    <div key={su.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#121212] border-2 border-white" />
                      <div className="flex items-center gap-2">
                        <span className="serif-display text-sm font-normal text-[#121212]">
                          Stage {su.stageNumber}: {su.stageName}
                        </span>
                        <span className="sans-micro text-[9px] px-2 py-0.5 rounded-full bg-[#FAF9F6] border border-[#E8E6E1] text-[#5A5854]">
                          {su.oldStatus} → {su.newStatus}
                        </span>
                      </div>
                      {su.internalNote && (
                        <p className="text-xs text-[#666666] mt-0.5 italic font-serif">"{su.internalNote}"</p>
                      )}
                      <p className="sans-micro text-[9px] text-[#888888] mt-0.5">
                        Updated by {su.updatedBy} ({su.updatedByRole}) •{' '}
                        {new Date(su.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. APPLICATION DETAILS TAB */}
          {!loading && app && activeTab === 'details' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#E8E6E1] bg-white artistic-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="serif-display text-sm font-normal italic text-[#121212]">
                    Sanction & Disbursement Values
                  </h4>
                  {!editingAmounts ? (
                    <button
                      type="button"
                      onClick={() => setEditingAmounts(true)}
                      className="sans-micro text-[10px] text-[#8C6D37] hover:underline cursor-pointer"
                    >
                      Edit Values
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveAmounts}
                      className="px-3.5 py-1 sans-micro text-[10px] uppercase tracking-wider text-white bg-[#121212] rounded-full hover:bg-[#262626] cursor-pointer"
                    >
                      Save
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block sans-micro text-[9.5px] text-[#888888] mb-1">Sanction Amount (₹)</label>
                    {editingAmounts ? (
                      <input
                        type="number"
                        value={sanctionAmount}
                        onChange={e => setSanctionAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#121212]"
                      />
                    ) : (
                      <p className="serif-display text-base font-normal text-[#121212]">
                        ₹{Number(app.sanctionAmount || 0).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block sans-micro text-[9.5px] text-[#888888] mb-1">Disbursed Amount (₹)</label>
                    {editingAmounts ? (
                      <input
                        type="number"
                        value={disbursedAmount}
                        onChange={e => setDisbursedAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#121212]"
                      />
                    ) : (
                      <p className="serif-display text-base font-normal text-[#121212]">
                        ₹{Number(app.disbursementAmount || 0).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E8E6E1] bg-white artistic-card space-y-3">
                <h4 className="serif-display text-sm font-normal italic text-[#121212]">
                  Applicant & Operational Metadata
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="sans-micro text-[9px] text-[#888888]">Applicant:</span>
                    <p className="font-medium text-[#121212]">{app.customerName}</p>
                  </div>
                  <div>
                    <span className="sans-micro text-[9px] text-[#888888]">Phone:</span>
                    <p className="font-medium text-[#121212]">{app.customerPhone}</p>
                  </div>
                  <div>
                    <span className="sans-micro text-[9px] text-[#888888]">Email:</span>
                    <p className="font-medium text-[#121212]">{app.customerEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="sans-micro text-[9px] text-[#888888]">Assigned Associate:</span>
                    <p className="font-medium text-[#121212]">
                      {app.assignedAssociateName || 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <span className="sans-micro text-[9px] text-[#888888]">Created Date:</span>
                    <p className="font-medium text-[#121212]">
                      {new Date(app.createdDate).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="sans-micro text-[9px] text-[#888888]">Last Update:</span>
                    <p className="font-medium text-[#121212]">
                      {new Date(app.updatedDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stage Update Modal */}
      <StageUpdateModal
        isOpen={isStageModalOpen}
        onClose={() => setIsStageModalOpen(false)}
        application={app}
        stageToEdit={selectedStageForEdit}
        onSuccess={() => {
          loadData();
          triggerRefresh();
        }}
      />

      {/* Document Request Modal */}
      <DocumentRequestModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        applicationId={app?.id || null}
        onSuccess={() => {
          loadData();
          triggerRefresh();
        }}
      />

      {/* Rejection Prompt */}
      {rejectingDocId && (
        <div className="fixed inset-0 z-60 bg-[#121212]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#E8E6E1] space-y-4">
            <h4 className="serif-display text-base font-normal italic text-rose-700">Document Rejection Reason</h4>
            <p className="sans-micro text-[9.5px] text-[#888888] tracking-wider">
              Specify why this document is rejected so applicant or relationship manager can re-upload.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Bank statement password protected / Missing 3rd page..."
              className="w-full px-3 py-2 text-xs border border-rose-300 rounded-xl bg-[#FAF9F6]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingDocId(null)}
                className="px-3.5 py-1.5 sans-micro text-[10px] uppercase tracking-wider text-[#5A5854] bg-[#FAF9F6] rounded-full border border-[#E8E6E1] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectDoc}
                className="px-3.5 py-1.5 sans-micro text-[10px] uppercase tracking-wider font-medium text-white bg-rose-700 rounded-full hover:bg-rose-800 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {app && (
        <WhatsAppActionModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          target={{
            customerName: app.customerName,
            customerPhone: app.customerPhone,
            applicationId: app.id,
            loanType: app.loanType,
            stageName: app.currentStageName,
            status: app.status,
            defaultTemplate: 'STAGE_UPDATED',
          }}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
};

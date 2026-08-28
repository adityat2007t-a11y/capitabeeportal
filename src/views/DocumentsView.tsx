/**
 * Capitabee Financial Services CRM - Central Documents Management View
 */

import React, { useState, useEffect } from 'react';
import {
  Files,
  CheckCircle2,
  XCircle,
  FileCheck,
  Search,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { StatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { DocumentRecord, DocumentStatus } from '../types';

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Rejection modal state
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.getDocuments();
      setDocuments(res.documents || []);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const filteredDocs = documents.filter(d => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.documentType.toLowerCase().includes(q) ||
        d.applicationId.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleVerify = async (docId: string) => {
    try {
      await api.reviewDocument(docId, 'Verified');
      loadDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to verify document');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingDocId || !rejectionReason.trim()) {
      alert('Please specify why this document is rejected.');
      return;
    }
    try {
      await api.reviewDocument(rejectingDocId, 'Rejected', rejectionReason.trim());
      setRejectingDocId(null);
      setRejectionReason('');
      loadDocuments();
    } catch (err: any) {
      alert(err.message || 'Failed to reject document');
    }
  };

  return (
    <div id="documents-view" className="space-y-5">
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Loan Document Repository</h2>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Audit-ready borrower documentation, KYC, tax filings, and sanction agreements
          </p>
        </div>

        <div className="flex p-1 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1] text-xs">
          {(['All', 'Requested', 'Uploaded', 'Verified', 'Rejected'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg sans-micro text-[9px] transition-all ${
                statusFilter === tab
                  ? 'bg-[#121212] text-white shadow-2xs font-semibold'
                  : 'text-[#888888] hover:text-[#121212]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card p-6">
        {loading ? (
          <div className="py-16 text-center sans-micro text-xs text-[#888888]">
            Loading documents repository...
          </div>
        ) : filteredDocs.length === 0 ? (
          <EmptyState
            title="No documents found."
            description="Documents requested in loan applications will appear here for verification."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E8E6E1] sans-micro text-[9px] text-[#888888]">
                  <th className="py-3.5 px-4 font-medium">Document ID & Name</th>
                  <th className="py-3.5 px-4 font-medium">Application ID</th>
                  <th className="py-3.5 px-4 font-medium">File Details</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium">Requested By & Date</th>
                  <th className="py-3.5 px-4 font-medium text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1] text-xs">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="sans-micro text-[8.5px] text-[#888888]">{doc.id}</span>
                        <span className="serif-display text-sm font-normal text-[#121212]">
                          {doc.customDocumentName || doc.documentType}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="sans-micro text-[9.5px] font-medium text-[#121212]">
                        {doc.applicationId}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {doc.fileName ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#121212]">
                          <FileCheck className="w-3.5 h-3.5 text-[#2D7A70]" />
                          <span className="font-medium">{doc.fileName}</span>
                          <span className="sans-micro text-[8.5px] text-[#888888]">({doc.fileSize})</span>
                        </div>
                      ) : (
                        <span className="sans-micro text-[9px] text-[#888888] italic">Awaiting upload</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={doc.status} />
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-[#121212]">{doc.requestedBy}</span>
                        <span className="sans-micro text-[8.5px] text-[#888888]">
                          {new Date(doc.requestedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.status === 'Uploaded' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleVerify(doc.id)}
                              className="px-3 py-1 sans-micro text-[9px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
                            >
                              Verify
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingDocId(doc.id);
                                setRejectionReason('');
                              }}
                              className="px-3 py-1 sans-micro text-[9px] font-medium text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {doc.status === 'Verified' && (
                          <span className="sans-micro text-[9px] font-semibold text-emerald-800">Verified ✓</span>
                        )}
                        {doc.status === 'Rejected' && (
                          <span className="sans-micro text-[9px] font-semibold text-rose-800" title={doc.rejectedReason}>
                            Rejected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingDocId && (
        <div className="fixed inset-0 z-50 bg-[#121212]/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#E8E6E1] space-y-4">
            <h4 className="serif-display text-lg font-normal text-[#121212]">Document Rejection Reason</h4>
            <p className="sans-micro text-[9.5px] text-[#888888] tracking-wider">
              Specify the exact reason for document rejection:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete statement / Blur image / Name mismatch..."
              className="w-full px-3 py-2 text-xs border border-[#E8E6E1] rounded-xl focus:border-[#121212] outline-none"
            />
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingDocId(null)}
                className="px-4 py-2 sans-micro text-[9px] font-medium text-[#888888] hover:text-[#121212] bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 sans-micro text-[9px] font-medium text-white bg-[#121212] rounded-xl hover:bg-[#2A2A2A] transition-colors"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

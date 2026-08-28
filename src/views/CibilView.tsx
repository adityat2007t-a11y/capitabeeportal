/**
 * Capitabee Financial Services CRM - CIBIL Bureau View
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { CibilCheckModal } from '../components/cibil/CibilCheckModal';
import { api } from '../services/api';
import { CibilReport } from '../types';

export const CibilView: React.FC = () => {
  const [reports, setReports] = useState<CibilReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.getCibilReports();
      setReports(res.reports || []);
    } catch (err: any) {
      console.error('Failed to load CIBIL reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div id="cibil-bureau-view" className="space-y-5">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="serif-display text-2xl font-normal italic text-[#121212]">CIBIL Credit Bureau Verification</h2>
            <span className="sans-micro text-[8.5px] font-medium tracking-[0.14em] uppercase px-2.5 py-0.5 rounded-full bg-[#FAF9F6] text-[#8C6D37] border border-[#E8E6E1]">
              CICRA 2005 Compliant
            </span>
          </div>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Credit Information Companies integration for applicant score pulls & credit history
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCheckModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 sans-micro text-[10.5px] font-medium uppercase tracking-[0.15em] text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-[#B89758]" />
          <span>+ Pull Bureau Score</span>
        </button>
      </div>

      {/* Compliance / Integration Notice */}
      <div className="p-4 bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-[#8C6D37] shrink-0 mt-0.5" />
        <div className="text-xs text-[#121212] space-y-1">
          <p className="sans-micro text-[10px] font-semibold tracking-wider uppercase text-[#121212]">Official Regulatory Bureau Policy:</p>
          <p className="text-[#666666] leading-relaxed">
            Capitabee Financial Services operates strictly under Reserve Bank of India (RBI) and Credit Information Companies Regulations Act (CICRA 2005). We do not generate mock or synthetic credit scores. Live reports are retrieved exclusively upon authentic applicant digital/physical authorization.
          </p>
          <p className="sans-micro text-[9.5px] text-[#888888]">
            To enable direct bureau queries, configure <code className="px-1.5 py-0.5 rounded bg-white border border-[#E8E6E1] text-[#121212]">CIBIL_MEMBER_ID</code> and <code className="px-1.5 py-0.5 rounded bg-white border border-[#E8E6E1] text-[#121212]">CIBIL_API_KEY</code> in environment secrets.
          </p>
        </div>
      </div>

      {/* Reports Table or Empty State */}
      <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card p-5">
        {loading ? (
          <div className="py-16 text-center sans-micro text-xs text-[#888888]">
            Loading credit bureau history...
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            title="CIBIL service is not connected yet."
            description="TransUnion CIBIL Member ID and API credentials are required to pull live credit scores. No fabricated scores will ever be displayed."
            actionText="Inquire Bureau API"
            onAction={() => setIsCheckModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E8E6E1] sans-micro text-[9px] text-[#888888]">
                  <th className="py-3.5 px-4 font-medium">Customer Name & PAN</th>
                  <th className="py-3.5 px-4 font-medium">Score</th>
                  <th className="py-3.5 px-4 font-medium">Active Loans / Enquiries</th>
                  <th className="py-3.5 px-4 font-medium">Inquiry Date</th>
                  <th className="py-3.5 px-4 font-medium">Inquired By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1] text-xs">
                {reports.map(rep => (
                  <tr key={rep.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="serif-display text-sm font-normal text-[#121212]">{rep.customerName}</span>
                        <span className="sans-micro text-[8.5px] text-[#888888]">{rep.pan}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="serif-display text-lg font-normal text-[#2D7A70]">
                        {rep.score}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col text-[11px]">
                        <span className="font-medium text-[#121212]">Active Loans: {rep.activeAccounts || 0}</span>
                        <span className="text-[#888888]">Overdue: ₹{rep.overdueAmount || 0}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[#888888]">
                        {new Date(rep.inquiryDate).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-[#121212]">{rep.inquiredBy}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CibilCheckModal
        isOpen={isCheckModalOpen}
        onClose={() => setIsCheckModalOpen(false)}
        onSuccess={() => loadReports()}
      />
    </div>
  );
};

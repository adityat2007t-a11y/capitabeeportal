/**
 * Capitabee Financial Services CRM - Reports & Audit Export Center
 */

import React, { useState } from 'react';
import { FileSpreadsheet, Download, Calendar, Filter } from 'lucide-react';
import { api } from '../services/api';

export const ReportsView: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleExport = async (type: 'leads' | 'applications' | 'associates' | 'audit') => {
    setDownloading(type);
    try {
      if (type === 'leads') {
        const res = await api.getLeads({ limit: 5000 });
        const leads = res.leads || [];
        const headers = ['Lead ID', 'Customer', 'Mobile', 'Loan Product', 'Amount', 'Status', 'Priority', 'Associate', 'Date'];
        const rows = leads.map(l => [
          l.id,
          `"${l.customerName.replace(/"/g, '""')}"`,
          l.mobile,
          `"${l.loanType}"`,
          l.requiredAmount,
          l.leadStatus,
          l.priority,
          `"${l.assignedAssociateName || 'Unassigned'}"`,
          l.createdDate,
        ]);
        triggerDownload(`Capitabee_Leads_Report.csv`, headers, rows);
      } else if (type === 'applications') {
        const res = await api.getApplications({ limit: 5000 });
        const apps = res.applications || [];
        const headers = ['Application ID', 'Customer', 'Phone', 'Loan Product', 'Requested', 'Sanctioned', 'Disbursed', 'Stage', 'Status'];
        const rows = apps.map(a => [
          a.id,
          `"${a.customerName.replace(/"/g, '""')}"`,
          a.customerPhone,
          `"${a.loanType}"`,
          a.requestedAmount,
          a.sanctionAmount || 0,
          a.disbursementAmount || 0,
          `"Stage ${a.currentStage}: ${a.currentStageName}"`,
          a.status,
        ]);
        triggerDownload(`Capitabee_Applications_Report.csv`, headers, rows);
      } else if (type === 'associates') {
        const res = await api.getAssociates();
        const assocs = res.associates || [];
        const headers = ['Associate ID', 'Name', 'Email', 'Mobile', 'Department', 'Monthly Target', 'Status'];
        const rows = assocs.map(a => [
          a.id,
          `"${a.name.replace(/"/g, '""')}"`,
          a.email,
          a.mobile,
          `"${a.department || 'Operations'}"`,
          a.monthlyTarget || a.target || 0,
          a.status,
        ]);
        triggerDownload(`Capitabee_Associates_Report.csv`, headers, rows);
      } else if (type === 'audit') {
        const res = await api.getAuditLogs({ limit: 1000 });
        const logs = res.logs || [];
        const headers = ['Timestamp', 'Actor Name', 'Actor Role', 'Action', 'Entity Type', 'Entity ID', 'Details'];
        const rows = logs.map(l => [
          l.timestamp,
          `"${l.actorName}"`,
          l.actorRole,
          l.action,
          l.entityType,
          l.entityId,
          `"${l.details.replace(/"/g, '""')}"`,
        ]);
        triggerDownload(`Capitabee_Audit_Logs.csv`, headers, rows);
      }
    } catch (err: any) {
      alert(err.message || 'Export failed.');
    } finally {
      setDownloading(null);
    }
  };

  const triggerDownload = (fileName: string, headers: string[], rows: any[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportCards = [
    {
      id: 'leads',
      title: 'Full Leads CRM Register',
      description: 'Complete master ledger of all applicant inquiries, mobile verification, loan requirements, and assigned relationship managers.',
      type: 'leads' as const,
    },
    {
      id: 'applications',
      title: '12-Stage Loan Pipeline Ledger',
      description: 'Granular underwriting report detailing current stage, requested vs. sanctioned amounts, lender networks, and disbursements.',
      type: 'applications' as const,
    },
    {
      id: 'associates',
      title: 'Associate Performance & Capacity',
      description: 'Staff directory with monthly disbursement targets, contact information, departmental allocations, and active status.',
      type: 'associates' as const,
    },
    {
      id: 'audit',
      title: 'System Security & Audit Trail',
      description: 'Immutable regulatory log of all user logins, stage updates, document verifications, status changes, and sensitive operations.',
      type: 'audit' as const,
    },
  ];

  return (
    <div id="reports-view" className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card">
        <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Regulatory Reporting & Data Export</h2>
        <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
          Generate structured CSV exports formatted for NBFC and banking partner audits
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportCards.map(rep => (
          <div
            key={rep.id}
            className="p-6 bg-white rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col justify-between hover:border-[#121212] transition-all"
          >
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <FileSpreadsheet className="w-5 h-5 text-[#8C6D37]" />
                <h3 className="serif-display text-lg font-normal text-[#121212]">{rep.title}</h3>
              </div>
              <p className="text-xs text-[#5A5854] leading-relaxed mb-5">{rep.description}</p>
            </div>

            <div className="pt-4 border-t border-[#E8E6E1] flex items-center justify-between">
              <span className="sans-micro text-[9px] text-[#888888]">Format: CSV</span>
              <button
                type="button"
                disabled={downloading === rep.type}
                onClick={() => handleExport(rep.type)}
                className="inline-flex items-center gap-2 px-4 py-2 sans-micro text-[9.5px] font-medium text-white bg-[#121212] hover:bg-[#2A2A2A] rounded-xl transition-colors shadow-2xs disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5 text-[#B89758]" />
                <span>{downloading === rep.type ? 'Preparing...' : 'Download CSV'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

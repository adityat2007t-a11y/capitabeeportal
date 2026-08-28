/**
 * Capitabee Financial Services - Status & Priority Badges
 */

import React from 'react';
import { LeadPriority, LeadStatus, ApplicationStatus, StageStatus, DocumentStatus } from '../../types';

export const PriorityBadge: React.FC<{ priority: LeadPriority; id?: string }> = ({ priority, id }) => {
  const styles: Record<LeadPriority, string> = {
    HOT: 'bg-rose-50 text-rose-800 border-rose-200',
    WARM: 'bg-[#FAF5EB] text-[#8C6D37] border-[#EBE5DA]',
    COLD: 'bg-[#F2F1ED] text-[#5A5854] border-[#E8E6E1]',
  };

  return (
    <span
      id={id || `priority-badge-${priority.toLowerCase()}`}
      className={`sans-micro inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] border ${styles[priority] || styles.WARM}`}
    >
      <span className="w-1 h-1 rounded-full mr-1.5 bg-current opacity-80" />
      {priority}
    </span>
  );
};

export const StatusBadge: React.FC<{
  status: LeadStatus | ApplicationStatus | StageStatus | DocumentStatus | string;
  id?: string;
}> = ({ status, id }) => {
  let style = 'bg-[#F2F1ED] text-[#5A5854] border-[#E8E6E1]';

  switch (status) {
    case 'New':
    case 'Requested':
      style = 'bg-stone-100 text-[#121212] border-[#E8E6E1]';
      break;
    case 'Contacted':
    case 'Under Review':
    case 'In Progress':
      style = 'bg-sky-50/80 text-sky-900 border-sky-200';
      break;
    case 'Interested':
    case 'Uploaded':
      style = 'bg-[#FAF5EB] text-[#8C6D37] border-[#EBE5DA]';
      break;
    case 'Follow-up':
      style = 'bg-[#F5F2F9] text-[#5A4378] border-[#E5DFEF]';
      break;
    case 'Documents Pending':
    case 'Action Required':
    case 'Re-upload Required':
      style = 'bg-amber-50 text-amber-900 border-amber-200';
      break;
    case 'Application Started':
    case 'Application Submitted':
    case 'In Process':
      style = 'bg-[#F0F4F8] text-[#243E56] border-[#D0DDE8]';
      break;
    case 'Sanctioned':
      style = 'bg-[#EBF4F2] text-[#2D7A70] border-[#C8E2DC]';
      break;
    case 'Disbursed':
    case 'Verified':
    case 'Completed':
    case 'Active':
      style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      break;
    case 'Rejected':
    case 'Lost':
    case 'Suspended':
    case 'Inactive':
      style = 'bg-rose-50 text-rose-800 border-rose-200';
      break;
    case 'Not Interested':
    case 'Not Eligible':
    case 'Closed':
      style = 'bg-[#F2F1ED] text-[#888888] border-[#E8E6E1]';
      break;
    case 'NOT CONNECTED':
      style = 'bg-[#FAF5EB] text-[#8C6D37] border-[#B89758]/50 font-semibold';
      break;
    case 'CONNECTED':
      style = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold';
      break;
  }

  return (
    <span
      id={id || `status-badge-${String(status).replace(/\s+/g, '-').toLowerCase()}`}
      className={`sans-micro inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] border ${style}`}
    >
      {status}
    </span>
  );
};

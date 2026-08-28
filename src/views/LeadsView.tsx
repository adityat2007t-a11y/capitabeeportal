/**
 * Capitabee Financial Services CRM - Leads CRM View
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Phone,
  MessageSquare,
  ChevronRight,
  UserCheck,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Lead, User, LeadStatus, LeadPriority } from '../types';
import { LEAD_STATUSES, INITIAL_LOAN_PRODUCTS } from '../config/brand';
import { WhatsAppActionModal, WhatsAppTarget } from '../components/common/WhatsAppActionModal';

interface LeadsViewProps {
  onOpenNewLead: () => void;
  onSelectLead: (lead: Lead) => void;
  onConvertToApplication: (lead: Lead) => void;
  onAssignLead: (lead: Lead) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  onOpenNewLead,
  onSelectLead,
  onConvertToApplication,
  onAssignLead,
}) => {
  const { role } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [associates, setAssociates] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [productFilter, setProductFilter] = useState<string>('All');
  const [associateFilter, setAssociateFilter] = useState<string>('All');
  const [whatsappTarget, setWhatsappTarget] = useState<WhatsAppTarget | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'All') params.status = statusFilter;
      if (priorityFilter !== 'All') params.priority = priorityFilter;
      if (associateFilter !== 'All') params.assignedAssociateId = associateFilter;

      const [leadRes, assocRes] = await Promise.all([
        api.getLeads(params),
        role === 'ADMIN' ? api.getAssociates() : Promise.resolve({ associates: [] }),
      ]);
      setLeads(leadRes.leads || []);
      setAssociates(assocRes.associates || []);
    } catch (err: any) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [statusFilter, priorityFilter, associateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  // Filter client-side by product if needed
  const filteredLeads = leads.filter(l => {
    if (productFilter !== 'All' && l.loanType !== productFilter) return false;
    return true;
  });

  // Real CSV Export
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      alert('No leads to export.');
      return;
    }

    const headers = [
      'Lead ID',
      'Customer Name',
      'Mobile',
      'Email',
      'City',
      'State',
      'Loan Product',
      'Required Amount (INR)',
      'Employment Type',
      'Lead Status',
      'Priority',
      'Assigned Associate',
      'Lead Source',
      'Created Date',
    ];

    const rows = filteredLeads.map(l => [
      l.id,
      `"${l.customerName.replace(/"/g, '""')}"`,
      l.mobile,
      l.email || '',
      l.city || '',
      l.state || '',
      `"${l.loanType}"`,
      l.requiredAmount,
      l.employmentType || '',
      l.leadStatus,
      l.priority,
      `"${l.assignedAssociateName || 'Unassigned'}"`,
      l.leadSource,
      l.createdDate,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Capitabee_Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="leads-crm-view" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card">
        <div>
          <h2 className="serif-display text-2xl font-normal italic text-[#121212]">
            {role === 'ADMIN' ? 'Leads Management CRM' : 'My Assigned Leads'}
          </h2>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            {filteredLeads.length} total active inquiry profiles in filter view
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 sans-micro text-[10px] font-medium uppercase tracking-[0.12em] text-[#121212] bg-white border border-[#E8E6E1] hover:border-[#121212] rounded-full transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#8C6D37]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewLead}
            className="inline-flex items-center gap-2 px-4 py-2 sans-micro text-[10.5px] font-medium uppercase tracking-[0.15em] text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#B89758]" />
            <span>+ Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E8E6E1] artistic-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2 lg:col-span-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, phone, ID..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg focus:outline-hidden focus:border-[#121212] text-[#121212] transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-2.5" />
          </form>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#121212] focus:border-[#121212]"
            >
              <option value="All">All Statuses</option>
              {LEAD_STATUSES.map(st => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#121212] focus:border-[#121212]"
            >
              <option value="All">All Priorities</option>
              <option value="HOT">HOT</option>
              <option value="WARM">WARM</option>
              <option value="COLD">COLD</option>
            </select>
          </div>

          {/* Loan Product Filter */}
          <div>
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#121212] focus:border-[#121212]"
            >
              <option value="All">All Loan Products</option>
              {INITIAL_LOAN_PRODUCTS.map(p => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Associate Filter (Admin only) */}
          {role === 'ADMIN' && (
            <div>
              <select
                value={associateFilter}
                onChange={e => setAssociateFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#121212] focus:border-[#121212]"
              >
                <option value="All">All Associates</option>
                {associates.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.id} - {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Leads Table / Responsive Cards */}
      <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#888888]">
            Loading leads database...
          </div>
        ) : filteredLeads.length === 0 ? (
          <EmptyState
            title="No leads found."
            description={
              search || statusFilter !== 'All'
                ? 'Try adjusting your search criteria or active filters.'
                : 'No leads registered in system yet. Click "+ Add Lead" to record a new borrower inquiry.'
            }
            actionText={search ? undefined : '+ Add Lead'}
            onAction={onOpenNewLead}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E8E6E1] sans-micro text-[9px] text-[#888888]">
                  <th className="py-3.5 px-4 font-medium">Lead ID & Customer</th>
                  <th className="py-3.5 px-4 font-medium">Loan Requirement</th>
                  <th className="py-3.5 px-4 font-medium">Status & Priority</th>
                  <th className="py-3.5 px-4 font-medium">Assigned Associate</th>
                  <th className="py-3.5 px-4 font-medium">Source & Date</th>
                  <th className="py-3.5 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1] text-xs">
                {filteredLeads.map(lead => {
                  const cleanPhone = lead.mobile.replace(/\D/g, '');
                  const phoneFormatted = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#FAF9F6]/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectLead(lead)}
                    >
                      {/* Customer Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="sans-micro text-[8.5px] text-[#888888]">
                            {lead.id}
                          </span>
                          <span className="serif-display text-sm font-normal text-[#121212] group-hover:text-black transition-colors">
                            {lead.customerName}
                          </span>
                          <span className="text-[11px] text-[#888888] mt-0.5">{lead.mobile}</span>
                        </div>
                      </td>

                      {/* Loan Requirement */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#121212]">
                            ₹{Number(lead.requiredAmount).toLocaleString('en-IN')}
                          </span>
                          <span className="sans-micro text-[9px] text-[#8C6D37]">
                            {lead.loanType}
                          </span>
                          <span className="text-[10px] text-[#888888]">
                            {lead.employmentType || 'Salaried'}
                          </span>
                        </div>
                      </td>

                      {/* Status & Priority */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <StatusBadge status={lead.leadStatus} />
                          <PriorityBadge priority={lead.priority} />
                        </div>
                      </td>

                      {/* Associate */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#121212]">
                            {lead.assignedAssociateName || 'Unassigned'}
                          </span>
                          {role === 'ADMIN' && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onAssignLead(lead);
                              }}
                              className="sans-micro text-[8.5px] text-[#8C6D37] hover:underline text-left mt-0.5 cursor-pointer"
                            >
                              Reassign
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Source & Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col text-[11px]">
                          <span className="font-medium text-[#121212]">{lead.leadSource}</span>
                          <span className="sans-micro text-[9px] text-[#888888]">
                            {new Date(lead.createdDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* 1-click Call */}
                          <a
                            href={`tel:${lead.mobile}`}
                            className="w-7 h-7 rounded-full border border-[#E8E6E1] bg-white hover:border-[#121212] flex items-center justify-center transition-colors text-[#121212]"
                            title={`Call ${lead.mobile}`}
                          >
                            <Phone className="w-3 h-3 text-[#2D7A70]" />
                          </a>

                          {/* 1-click WhatsApp Action */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setWhatsappTarget({
                                customerName: lead.customerName,
                                customerPhone: lead.mobile,
                                leadId: lead.id,
                                loanType: lead.loanType,
                                defaultTemplate: 'GENERAL_FOLLOWUP',
                              });
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-full border border-[#C8E2DC] bg-[#EBF4F2] hover:bg-[#DDF0EB] flex items-center justify-center text-[#2D7A70] transition-colors cursor-pointer"
                            title="Communicate via WhatsApp Business"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>

                          {/* Start Application */}
                          <button
                            type="button"
                            onClick={() => onConvertToApplication(lead)}
                            className="sans-micro text-[9px] font-semibold uppercase tracking-wider text-white bg-[#121212] hover:bg-[#262626] rounded-full px-3 py-1 transition-colors cursor-pointer"
                            title="Convert to Loan Application"
                          >
                            Apply
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectLead(lead)}
                            className="p-1.5 text-[#888888] hover:text-[#121212] rounded-full cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WhatsApp Action Modal */}
      <WhatsAppActionModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setWhatsappTarget(null);
        }}
        target={whatsappTarget}
      />
    </div>
  );
};

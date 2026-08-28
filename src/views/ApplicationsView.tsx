/**
 * Capitabee Financial Services CRM - 12-Stage Loan Applications View
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Download,
  Briefcase,
  ChevronRight,
  CheckCircle2,
  Phone,
  MessageSquare,
  Building2,
} from 'lucide-react';
import { StatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Application, User } from '../types';
import { STAGES_12, INITIAL_LOAN_PRODUCTS } from '../config/brand';
import { WhatsAppActionModal, WhatsAppTarget } from '../components/common/WhatsAppActionModal';

interface ApplicationsViewProps {
  onOpenNewApp: () => void;
  onSelectApp: (app: Application) => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  onOpenNewApp,
  onSelectApp,
}) => {
  const { role } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [productFilter, setProductFilter] = useState<string>('All');
  const [whatsappTarget, setWhatsappTarget] = useState<WhatsAppTarget | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const loadApps = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (stageFilter !== 'All') params.stage = Number(stageFilter);
      if (statusFilter !== 'All') params.status = statusFilter;

      const res = await api.getApplications(params);
      setApps(res.applications || []);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApps();
  }, [stageFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadApps();
  };

  const filteredApps = apps.filter(a => {
    if (productFilter !== 'All' && a.loanType !== productFilter) return false;
    return true;
  });

  const handleExportCSV = () => {
    if (filteredApps.length === 0) {
      alert('No applications to export.');
      return;
    }

    const headers = [
      'Application ID',
      'Customer Name',
      'Phone',
      'Email',
      'Loan Type',
      'Requested Amount',
      'Sanction Amount',
      'Disbursed Amount',
      'Lending Partner',
      'Current Stage Number',
      'Current Stage Name',
      'Status',
      'Assigned Associate',
      'Created Date',
    ];

    const rows = filteredApps.map(a => [
      a.id,
      `"${a.customerName.replace(/"/g, '""')}"`,
      a.customerPhone,
      a.customerEmail || '',
      `"${a.loanType}"`,
      a.requestedAmount,
      a.sanctionAmount || 0,
      a.disbursementAmount || 0,
      `"${a.lenderPartner || ''}"`,
      a.currentStage,
      `"${a.currentStageName}"`,
      a.status,
      `"${a.assignedAssociateName || 'Unassigned'}"`,
      a.createdDate,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Capitabee_Applications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="applications-view" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card">
        <div>
          <h2 className="serif-display text-2xl font-normal italic text-[#121212]">
            {role === 'ADMIN' ? '12-Stage Loan Pipeline' : 'My Loan Applications'}
          </h2>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            {filteredApps.length} cases tracked across KYC, Credit, Legal, Sanction & Disbursement
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
            onClick={onOpenNewApp}
            className="inline-flex items-center gap-2 px-4 py-2 sans-micro text-[10.5px] font-medium uppercase tracking-[0.15em] text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#B89758]" />
            <span>+ New Application</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E8E6E1] artistic-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, customer name, phone..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg focus:outline-hidden focus:border-[#121212] text-[#121212] transition-colors"
            />
            <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-2.5" />
          </form>

          {/* Stage Filter */}
          <div>
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#121212] focus:border-[#121212]"
            >
              <option value="All">All 12 Stages</option>
              {STAGES_12.map(st => (
                <option key={st.number} value={st.number}>
                  Stage {st.number}: {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg text-[#121212] focus:border-[#121212]"
            >
              <option value="All">All Statuses</option>
              <option value="In Process">In Process</option>
              <option value="Sanctioned">Sanctioned</option>
              <option value="Disbursed">Disbursed</option>
              <option value="Rejected">Rejected</option>
              <option value="Withdrawn">Withdrawn</option>
            </select>
          </div>

          {/* Product Filter */}
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
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center sans-micro text-xs text-[#888888]">
            Loading application files...
          </div>
        ) : filteredApps.length === 0 ? (
          <EmptyState
            title="No applications found."
            description={
              search || stageFilter !== 'All'
                ? 'Try adjusting your search criteria or active filters.'
                : 'No loan applications created yet. Start a new file or convert a lead.'
            }
            actionText={search ? undefined : '+ Start Application'}
            onAction={onOpenNewApp}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E8E6E1] sans-micro text-[9px] text-[#888888]">
                  <th className="py-3.5 px-4 font-medium">Application ID & Applicant</th>
                  <th className="py-3.5 px-4 font-medium">Loan Product & Lender</th>
                  <th className="py-3.5 px-4 font-medium">Values (Req / Sanc / Disb)</th>
                  <th className="py-3.5 px-4 font-medium">12-Stage Pipeline Progress</th>
                  <th className="py-3.5 px-4 font-medium">Associate</th>
                  <th className="py-3.5 px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1] text-xs">
                {filteredApps.map(app => {
                  const stagePct = Math.round((app.currentStage / 12) * 100);
                  const cleanPhone = app.customerPhone.replace(/\D/g, '');
                  const phoneFormatted = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-[#FAF9F6]/80 transition-colors group cursor-pointer"
                      onClick={() => onSelectApp(app)}
                    >
                      {/* ID & Applicant */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="sans-micro text-[8.5px] text-[#888888]">
                            {app.id}
                          </span>
                          <span className="serif-display text-sm font-normal text-[#121212] group-hover:text-black transition-colors">
                            {app.customerName}
                          </span>
                          <span className="text-[11px] text-[#888888] mt-0.5">{app.customerPhone}</span>
                        </div>
                      </td>

                      {/* Product & Partner */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#121212]">{app.loanType}</span>
                          <span className="sans-micro text-[9px] text-[#8C6D37]">
                            {app.lenderPartner || 'Lender Pending'}
                          </span>
                        </div>
                      </td>

                      {/* Financial Values */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#121212]">
                            Req: ₹{Number(app.requestedAmount).toLocaleString('en-IN')}
                          </span>
                          {app.sanctionAmount ? (
                            <span className="sans-micro text-[9px] font-medium text-[#2D7A70]">
                              Sanc: ₹{Number(app.sanctionAmount).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="sans-micro text-[8.5px] text-[#888888]">Sanction: Pending</span>
                          )}
                          {app.disbursementAmount ? (
                            <span className="sans-micro text-[9px] font-medium text-[#8C6D37]">
                              Disb: ₹{Number(app.disbursementAmount).toLocaleString('en-IN')}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* 12-Stage Stepper Progress */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="sans-micro text-[9.5px] font-semibold text-[#121212]">
                              Stage {app.currentStage}/12: {app.currentStageName}
                            </span>
                            <span className="sans-micro text-[9px] text-[#888888]">{stagePct}%</span>
                          </div>
                          <div className="w-full bg-[#E8E6E1] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#2D7A70] h-full rounded-full transition-all"
                              style={{ width: `${stagePct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Associate */}
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#121212]">
                          {app.assignedAssociateName || 'Unassigned'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={e => e.stopPropagation()}
                        >
                          <a
                            href={`tel:${app.customerPhone}`}
                            className="w-7 h-7 rounded-full border border-[#E8E6E1] bg-white hover:border-[#121212] flex items-center justify-center transition-colors text-[#121212]"
                            title={`Call ${app.customerPhone}`}
                          >
                            <Phone className="w-3 h-3 text-[#2D7A70]" />
                          </a>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setWhatsappTarget({
                                customerName: app.customerName,
                                customerPhone: app.customerPhone,
                                applicationId: app.id,
                                loanType: app.loanType,
                                stageName: app.currentStageName,
                                defaultTemplate: 'STAGE_UPDATED',
                              });
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-full border border-[#C8E2DC] bg-[#EBF4F2] hover:bg-[#DDF0EB] flex items-center justify-center text-[#2D7A70] transition-colors cursor-pointer"
                            title="WhatsApp Business Notification"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectApp(app)}
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

/**
 * Capitabee Financial Services CRM - 12-Stage Loan Applications View
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  AlertCircle,
  Database,
} from 'lucide-react';
import { StatusBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Application, User, StageInfo, StageStatus } from '../types';
import { STAGES_12, INITIAL_LOAN_PRODUCTS } from '../config/brand';
import { WhatsAppActionModal, WhatsAppTarget } from '../components/common/WhatsAppActionModal';

interface ApplicationsViewProps {
  onOpenNewApp: () => void;
  onSelectApp: (app: Application) => void;
}

function mapSupabaseRowToApplication(row: any): Application {
  const currentStageNum = Number(row.current_stage || row.stage || 2);
  const currentStageObj = STAGES_12.find(s => s.number === currentStageNum);

  let stages: StageInfo[] = [];
  if (Array.isArray(row.stages)) {
    stages = row.stages;
  } else if (typeof row.stages === 'string') {
    try {
      stages = JSON.parse(row.stages);
    } catch {
      stages = [];
    }
  }

  if (!stages || stages.length === 0) {
    stages = STAGES_12.map(s => ({
      number: s.number,
      name: s.name,
      status: s.number < currentStageNum ? 'Completed' : s.number === currentStageNum ? 'In Progress' : 'Pending',
      updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    }));
  }

  return {
    id: String(row.id || row.application_id || ''),
    leadId: row.lead_id || undefined,
    customerName: row.full_name || row.customer_name || row.applicant_name || row.name || 'Applicant',
    customerPhone: row.mobile_number || row.customer_phone || row.mobile || row.phone || '',
    customerEmail: row.email || row.customer_email || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    loanType: row.loan_type || row.loanType || 'Personal Loan',
    requestedAmount: Number(row.required_loan_amount || row.requested_amount || row.loan_amount || row.amount || 0),
    sanctionAmount: Number(row.sanction_amount || row.sanctioned_amount || 0),
    disbursementAmount: Number(row.disbursement_amount || row.disbursed_amount || 0),
    lenderPartner: row.lender_partner || row.lending_partner || undefined,
    assignedAssociateId: row.associate_id || row.assigned_associate_id || row.user_id || null,
    assignedAssociateName: row.associate_name || row.assigned_associate_name || null,
    status: row.status || 'In Process',
    currentStage: currentStageNum,
    currentStageName: currentStageObj?.name || row.current_stage_name || 'Application',
    stages,
    createdDate: row.created_at || row.created_date || new Date().toISOString(),
    updatedDate: row.updated_at || row.updated_date || new Date().toISOString(),
    notes: row.notes || undefined,
  };
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  onOpenNewApp,
  onSelectApp,
}) => {
  const { role, user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Diagnostic State for Supabase
  const [diagnostic, setDiagnostic] = useState<{
    rowsCount: number;
    queryError: string | null;
    returnedIds: string[];
  }>({
    rowsCount: 0,
    queryError: null,
    returnedIds: [],
  });

  // Filters
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [productFilter, setProductFilter] = useState<string>('All');
  const [whatsappTarget, setWhatsappTarget] = useState<WhatsAppTarget | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch through authorized API layer which securely reads from Supabase database
      const res = await api.getApplications();
      const serverApps = res?.applications || [];
      const ids = serverApps.map(a => a.id);

      const stateLoadedFound = serverApps.some(a => a.id === 'APP-2026-000014');
      console.log('[DIAGNOSTIC TRACE] Layer 3 (ApplicationsView state after loading):', {
        STATE_LOADED_FOUND: stateLoadedFound,
        targetId: 'APP-2026-000014',
        totalAppsLoaded: serverApps.length,
        loadedIds: ids,
      });

      setDiagnostic({
        rowsCount: serverApps.length,
        queryError: null,
        returnedIds: ids,
      });
      setApps(serverApps);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      setDiagnostic({
        rowsCount: 0,
        queryError: err?.message || String(err),
        returnedIds: [],
      });
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApps();

    // Setup Supabase Realtime subscription
    let channel: any = null;
    if (isSupabaseConfigured()) {
      try {
        channel = supabase
          .channel('public_applications_realtime')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'applications' },
            () => {
              loadApps();
            }
          )
          .subscribe();
      } catch (e) {
        console.warn('Realtime channel error:', e);
      }
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadApps]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const filteredApps = apps.filter(a => {
    if (productFilter !== 'All' && a.loanType !== productFilter) return false;
    if (stageFilter !== 'All' && a.currentStage !== Number(stageFilter)) return false;
    if (statusFilter !== 'All' && a.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const match =
        a.id.toLowerCase().includes(q) ||
        (a.customerId ? a.customerId.toLowerCase().includes(q) : false) ||
        a.customerName.toLowerCase().includes(q) ||
        a.customerPhone.toLowerCase().includes(q) ||
        (a.city && a.city.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const targetInApps = apps.some(a => a.id === 'APP-2026-000014');
  const targetInFiltered = filteredApps.some(a => a.id === 'APP-2026-000014');
  // Since ApplicationsView renders the entire filteredApps list directly without page slicing:
  const targetInPagination = targetInFiltered;
  const targetInRendered = targetInFiltered;

  console.log('[DIAGNOSTIC TRACE] Layer 4, 5, 6 (ApplicationsView Pipeline Diagnostic):', {
    targetId: 'APP-2026-000014',
    API_FOUND: targetInApps,
    MAPPED_FOUND: targetInApps,
    AFTER_FILTER_FOUND: targetInFiltered,
    AFTER_PAGINATION_FOUND: targetInPagination,
    RENDERED_FOUND: targetInRendered,
    activeFilters: {
      search,
      stageFilter,
      statusFilter,
      productFilter,
    },
    totalFiltered: filteredApps.length,
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
      {/* REQUIRED VISIBLE SUPABASE DIAGNOSTIC BANNER */}
      <div
        id="live-supabase-diagnostic"
        className="bg-[#121212] text-white p-5 rounded-2xl font-mono text-xs border border-[#8C6D37]/50 shadow-md space-y-1.5"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#E0B86C]" />
            <span className="text-[#E0B86C] font-bold text-sm tracking-wider">LIVE SUPABASE</span>
          </div>
          <button
            type="button"
            onClick={() => loadApps()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[#E8E6E1] text-[11px] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Table</span>
          </button>
        </div>

        <div>
          <span className="text-[#888888]">Table: </span>
          <span className="text-white font-semibold">applications</span>
        </div>

        <div>
          <span className="text-[#888888]">Rows returned: </span>
          <span className="text-[#E0B86C] font-bold text-sm">{diagnostic.rowsCount}</span>
        </div>

        <div>
          <span className="text-[#888888]">Query error: </span>
          <span className={diagnostic.queryError ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
            {diagnostic.queryError || 'NONE'}
          </span>
        </div>

        <div>
          <span className="text-[#888888]">Application IDs: </span>
          <span className="text-white font-semibold">
            {diagnostic.returnedIds.length > 0 ? diagnostic.returnedIds.join(', ') : 'NONE'}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card">
        <div>
          <h2 className="serif-display text-2xl font-normal italic text-[#121212]">
            {role === 'ADMIN' ? '12-Stage Loan Pipeline' : 'My Loan Applications'}
          </h2>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            {filteredApps.length} cases tracked across KYC, Credit, Legal, Sanction & Disbursement (Live Supabase)
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

      {/* Applications Table or Error / Empty State */}
      <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center sans-micro text-xs text-[#888888]">
            Querying Supabase public.applications table...
          </div>
        ) : diagnostic.queryError ? (
          <div className="p-8 text-center bg-red-50 border border-red-200 text-red-800 space-y-2">
            <div className="flex items-center justify-center gap-2 text-red-600 font-semibold">
              <AlertCircle className="w-5 h-5" />
              <span>Supabase Query Error</span>
            </div>
            <p className="font-mono text-xs">{diagnostic.queryError}</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <EmptyState
            title="No applications returned from Supabase table 'applications'."
            description={
              search || stageFilter !== 'All'
                ? 'Try adjusting your search criteria or active filters.'
                : 'Zero records in public.applications. Once an application is submitted, it will be rendered here directly.'
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


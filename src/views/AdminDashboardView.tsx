/**
 * Capitabee Financial Services CRM - Admin Dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Clock,
  UserCheck,
  Plus,
  ShieldAlert,
  ArrowRight,
  ChevronRight,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { api } from '../services/api';
import { Lead, Application, User } from '../types';

interface AdminDashboardViewProps {
  onNavigate: (viewId: string) => void;
  onOpenNewLead: () => void;
  onOpenNewApp: () => void;
  onOpenNewAssociate: () => void;
  onOpenCibil: () => void;
  onSelectLead: (lead: Lead) => void;
  onSelectApp: (app: Application) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigate,
  onOpenNewLead,
  onOpenNewApp,
  onOpenNewAssociate,
  onOpenCibil,
  onSelectLead,
  onSelectApp,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [recentApps, setRecentApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, leadsRes, appsRes] = await Promise.all([
        api.getDashboardStats().catch(() => ({ stats: null })),
        api.getLeads({ limit: 5 }).catch(() => ({ leads: [] })),
        api.getApplications({ limit: 5 }).catch(() => ({ applications: [] })),
      ]);
      setStats(statsRes.stats);
      setRecentLeads(leadsRes.leads || []);
      setRecentApps(appsRes.applications || []);
    } catch (err: any) {
      console.warn('Dashboard data notification:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div id="admin-dashboard-view" className="space-y-6">
      {/* Top Banner / Welcome & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card">
        <div>
          <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Admin Executive Dashboard</h2>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Real-time origination, pipeline progression, and associate distribution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="dash-add-lead-btn"
            onClick={onOpenNewLead}
            className="flex items-center gap-2 px-4 py-2 sans-micro text-[10.5px] font-medium tracking-[0.15em] uppercase text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#B89758]" />
            <span>+ Lead</span>
          </button>

          <button
            type="button"
            id="dash-add-app-btn"
            onClick={onOpenNewApp}
            className="flex items-center gap-2 px-4 py-2 sans-micro text-[10.5px] font-medium tracking-[0.15em] uppercase text-[#121212] bg-white border border-[#E8E6E1] hover:border-[#121212] rounded-full transition-colors cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#2D7A70]" />
            <span>+ Application</span>
          </button>

          <button
            type="button"
            id="dash-add-assoc-btn"
            onClick={onOpenNewAssociate}
            className="flex items-center gap-1.5 px-3.5 py-2 sans-micro text-[10px] font-medium tracking-[0.12em] uppercase text-[#8C6D37] bg-[#FAF5EB] border border-[#EBE5DA] hover:border-[#B89758] rounded-full transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>+ Associate</span>
          </button>

          <button
            type="button"
            id="dash-open-cibil-btn"
            onClick={onOpenCibil}
            className="flex items-center gap-1.5 px-3.5 py-2 sans-micro text-[10px] font-medium tracking-[0.12em] uppercase text-[#5A5854] bg-white border border-[#E8E6E1] hover:border-[#121212] rounded-full transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-[#243E56]" />
            <span>CIBIL</span>
          </button>
        </div>
      </div>

      {/* Unassigned Leads Warning Banner */}
      {stats && stats.unassignedLeads > 0 && (
        <div className="p-4 bg-[#FAF5EB] border border-[#EBE5DA] rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-[#B89758]/40 flex items-center justify-center text-[#8C6D37] shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#121212]">
                {stats.unassignedLeads} Unassigned Lead(s) Require Allocation
              </p>
              <p className="sans-micro text-[9.5px] text-[#888888] tracking-wider mt-0.5">
                Assign incoming leads to relationship associates to ensure prompt customer contact within SLA.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('admin-leads')}
            className="sans-micro px-3.5 py-1.5 text-[9.5px] font-medium text-[#121212] bg-white border border-[#E8E6E1] rounded-full hover:border-[#121212] transition-colors cursor-pointer"
          >
            Review Leads →
          </button>
        </div>
      )}

      {/* 6 Key Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          id="stat-total-leads"
          title="Total Leads"
          value={stats?.totalLeads ?? 0}
          subtitle={`${stats?.newLeadsToday ?? 0} generated today`}
          icon={Users}
          accentColor="navy"
          badgeText="Active Inquiries"
          onClick={() => onNavigate('admin-leads')}
        />

        <StatCard
          id="stat-active-apps"
          title="Loan Applications"
          value={stats?.activeApplications ?? 0}
          subtitle="In 12-Stage Pipeline"
          icon={Briefcase}
          accentColor="gold"
          badgeText="Active Pipeline"
          onClick={() => onNavigate('admin-applications')}
        />

        <StatCard
          id="stat-sanction-vol"
          title="Sanction Volume"
          value={`₹${((stats?.totalSanctionAmount ?? 0) / 100000).toFixed(1)}L`}
          subtitle="Approved by Lenders"
          icon={CheckCircle2}
          accentColor="teal"
          badgeText="₹ Sanctioned"
          badgeType="success"
        />

        <StatCard
          id="stat-disbursed-vol"
          title="Disbursement"
          value={`₹${((stats?.totalDisbursedAmount ?? 0) / 100000).toFixed(1)}L`}
          subtitle="Capital Deployed"
          icon={TrendingUp}
          accentColor="navy"
          badgeText="Disbursed"
          badgeType="success"
        />

        <StatCard
          id="stat-followups-due"
          title="Follow-ups Due"
          value={stats?.pendingFollowUpsToday ?? 0}
          subtitle="Scheduled for today"
          icon={Clock}
          accentColor="amber"
          badgeText="SLA Touchpoints"
          badgeType="warning"
          onClick={() => onNavigate('admin-followups')}
        />

        <StatCard
          id="stat-team-size"
          title="Associates"
          value={stats?.totalAssociates ?? 0}
          subtitle="Operations & Sales Team"
          icon={UserCheck}
          accentColor="gold"
          badgeText="Staff Capacity"
          onClick={() => onNavigate('admin-associates')}
        />
      </div>

      {/* Pipeline Status Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="serif-display text-lg font-normal italic text-[#121212]">Lead Pipeline Distribution</h3>
            <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">Current operational status of all incoming customer requests</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('admin-leads')}
            className="sans-micro text-[10px] text-[#8C6D37] hover:text-[#121212] flex items-center gap-1 cursor-pointer"
          >
            <span>View All Leads</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {stats?.leadsByStatus &&
            Object.entries(stats.leadsByStatus).map(([st, count]: [string, any]) => (
              <div
                key={st}
                onClick={() => onNavigate('admin-leads')}
                className="p-3 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] hover:bg-white hover:border-[#121212] cursor-pointer transition-all text-center group"
              >
                <p className="serif-display text-2xl font-normal text-[#121212]">{count}</p>
                <p className="sans-micro text-[8.5px] text-[#888888] group-hover:text-[#121212] uppercase tracking-wider truncate mt-1">
                  {st}
                </p>
              </div>
            ))}
        </div>
      </div>

      {/* Two Column Layout: Recent Leads & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="serif-display text-lg font-normal italic text-[#121212]">Recent Customer Inquiries</h3>
                <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">Latest leads received in Capitabee CRM</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('admin-leads')}
                className="sans-micro text-[10px] text-[#8C6D37] hover:text-[#121212] cursor-pointer"
              >
                View All
              </button>
            </div>

            {recentLeads.length === 0 ? (
              <EmptyState
                title="No leads found."
                description="Start by adding your first loan applicant inquiry or linking campaign webhooks."
                actionText="+ Add First Lead"
                onAction={onOpenNewLead}
              />
            ) : (
              <div className="space-y-2.5">
                {recentLeads.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className="p-3.5 rounded-xl border border-[#E8E6E1] hover:border-[#121212] bg-[#FAF9F6]/60 hover:bg-white cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="sans-micro text-[9px] text-[#888888]">{lead.id}</span>
                        <span className="text-xs font-semibold text-[#121212] group-hover:text-black">{lead.customerName}</span>
                        <PriorityBadge priority={lead.priority} />
                      </div>
                      <div className="text-[11px] text-[#5A5854] mt-1.5 flex items-center gap-3">
                        <span className="sans-micro text-[9px] text-[#888888] uppercase">{lead.loanType}</span>
                        <span className="font-medium text-[#121212]">₹{Number(lead.requiredAmount).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] text-[#888888]">Associate: {lead.assignedAssociateName || 'Unassigned'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={lead.leadStatus} />
                      <ChevronRight className="w-3.5 h-3.5 text-[#888888] group-hover:text-[#121212]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="serif-display text-lg font-normal italic text-[#121212]">12-Stage Loan Pipeline</h3>
                <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">Active customer cases progressing toward disbursement</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('admin-applications')}
                className="sans-micro text-[10px] text-[#8C6D37] hover:text-[#121212] cursor-pointer"
              >
                View All
              </button>
            </div>

            {recentApps.length === 0 ? (
              <EmptyState
                title="No applications found."
                description="Convert a qualified lead or create a new loan application file to start 12-stage tracking."
                actionText="+ Start Application"
                onAction={onOpenNewApp}
              />
            ) : (
              <div className="space-y-2.5">
                {recentApps.map(app => (
                  <div
                    key={app.id}
                    onClick={() => onSelectApp(app)}
                    className="p-3.5 rounded-xl border border-[#E8E6E1] hover:border-[#121212] bg-[#FAF9F6]/60 hover:bg-white cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="sans-micro text-[9px] text-[#888888]">{app.id}</span>
                        <span className="text-xs font-semibold text-[#121212] group-hover:text-black">{app.customerName}</span>
                      </div>
                      <div className="text-[11px] text-[#5A5854] mt-1.5 flex items-center gap-2.5">
                        <span className="sans-micro text-[9px] text-[#2D7A70] bg-[#EBF4F2] px-2 py-0.5 rounded-full border border-[#C8E2DC]">
                          Stage {app.currentStage}/12: {app.currentStageName}
                        </span>
                        <span className="font-medium text-[#121212]">₹{Number(app.requestedAmount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={app.status} />
                      <ChevronRight className="w-3.5 h-3.5 text-[#888888] group-hover:text-[#121212]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

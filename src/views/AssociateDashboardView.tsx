/**
 * Capitabee Financial Services CRM - Associate Workspace Dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  Phone,
  MessageSquare,
  Plus,
  ChevronRight,
  Target,
  FileCheck,
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { EmptyState } from '../components/common/EmptyState';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lead, Application, FollowUp } from '../types';
import { WhatsAppActionModal, WhatsAppTarget } from '../components/common/WhatsAppActionModal';

interface AssociateDashboardViewProps {
  onNavigate: (viewId: string) => void;
  onOpenNewLead: () => void;
  onOpenNewApp: () => void;
  onSelectLead: (lead: Lead) => void;
  onSelectApp: (app: Application) => void;
}

export const AssociateDashboardView: React.FC<AssociateDashboardViewProps> = ({
  onNavigate,
  onOpenNewLead,
  onOpenNewApp,
  onSelectLead,
  onSelectApp,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [myApps, setMyApps] = useState<Application[]>([]);
  const [todayFollowUps, setTodayFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappTarget, setWhatsappTarget] = useState<WhatsAppTarget | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, leadsRes, appsRes, followUpsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getLeads({ limit: 6 }),
        api.getApplications({ limit: 6 }),
        api.getFollowUps({ date: new Date().toISOString().split('T')[0] }),
      ]);
      setStats(statsRes.stats);
      setMyLeads(leadsRes.leads || []);
      setMyApps(appsRes.applications || []);
      setTodayFollowUps(followUpsRes.followUps || []);
    } catch (err: any) {
      console.error('Associate dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const monthlyTarget = user?.monthlyTarget || 2500000;
  const currentDisbursed = stats?.totalDisbursedAmount || 0;
  const targetPct = Math.min(100, Math.round((currentDisbursed / monthlyTarget) * 100));

  return (
    <div id="associate-dashboard-view" className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="sans-micro text-[8.5px] font-medium tracking-[0.14em] uppercase text-[#8C6D37] bg-[#FAF9F6] px-2.5 py-0.5 rounded-full border border-[#E8E6E1]">
              {user?.id}
            </span>
            <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Welcome, {user?.name}</h2>
          </div>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            {user?.designation || 'Loan Relationship Associate'} • {user?.department || 'Operations'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenNewLead}
            className="flex items-center gap-2 px-4 py-2 sans-micro text-[10.5px] font-medium uppercase tracking-[0.15em] text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#B89758]" />
            <span>+ Add Lead</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewApp}
            className="flex items-center gap-2 px-3.5 py-2 sans-micro text-[10px] font-medium uppercase tracking-[0.12em] text-[#121212] bg-white border border-[#E8E6E1] hover:border-[#121212] rounded-full transition-colors cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5 text-[#2D7A70]" />
            <span>+ Start Application</span>
          </button>
        </div>
      </div>

      {/* Target Progress Bar Widget */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] artistic-card space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#8C6D37]" />
            <span className="sans-micro text-[9.5px] font-medium uppercase tracking-[0.15em] text-[#121212]">Monthly Disbursement Target</span>
          </div>
          <span className="serif-display text-sm text-[#121212]">
            ₹{currentDisbursed.toLocaleString('en-IN')} / ₹{monthlyTarget.toLocaleString('en-IN')} ({targetPct}%)
          </span>
        </div>
        <div className="w-full bg-[#FAF9F6] h-2 rounded-full overflow-hidden border border-[#E8E6E1]">
          <div
            className="bg-[#121212] h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(5, targetPct)}%` }}
          />
        </div>
      </div>

      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="assoc-stat-leads"
          title="Assigned Leads"
          value={stats?.totalLeads ?? 0}
          subtitle="Directly assigned to you"
          icon={Users}
          accentColor="navy"
          badgeText="Active Leads"
          onClick={() => onNavigate('associate-leads')}
        />

        <StatCard
          id="assoc-stat-followups"
          title="Follow-ups Due Today"
          value={todayFollowUps.length}
          subtitle="Scheduled client callbacks"
          icon={Clock}
          accentColor="amber"
          badgeText="Today's SLA"
          badgeType="warning"
          onClick={() => onNavigate('associate-followups')}
        />

        <StatCard
          id="assoc-stat-apps"
          title="My Applications"
          value={stats?.activeApplications ?? 0}
          subtitle="Active 12-stage cases"
          icon={Briefcase}
          accentColor="gold"
          badgeText="Cases"
          onClick={() => onNavigate('associate-applications')}
        />

        <StatCard
          id="assoc-stat-disbursed"
          title="My Disbursements"
          value={`₹${(currentDisbursed / 100000).toFixed(1)}L`}
          subtitle="Total volume disbursed"
          icon={TrendingUp}
          accentColor="teal"
          badgeText="Achievement"
          badgeType="success"
        />
      </div>

      {/* Today's Follow-up SLA Priority Widget */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="serif-display text-lg font-normal italic text-[#121212]">Today's Scheduled Follow-ups</h3>
            <p className="sans-micro text-[10px] text-[#888888] tracking-[0.14em]">Immediate applicant outreach via phone or WhatsApp</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('associate-followups')}
            className="sans-micro text-[10px] font-medium uppercase tracking-[0.15em] text-[#8C6D37] hover:text-[#121212] transition-colors"
          >
            All Follow-ups
          </button>
        </div>

        {todayFollowUps.length === 0 ? (
          <div className="py-8 text-center sans-micro text-xs text-[#888888] bg-[#FAF9F6] rounded-xl border border-[#E8E6E1]">
            No follow-ups due today. Keep up the high responsiveness!
          </div>
        ) : (
          <div className="space-y-2">
            {todayFollowUps.map(fu => {
              const cleanPhone = fu.customerPhone ? fu.customerPhone.replace(/\D/g, '') : '';
              const phoneFormatted = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

              return (
                <div
                  key={fu.id}
                  className="p-3.5 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] flex items-center justify-between gap-3 flex-wrap"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="serif-display text-sm font-normal text-[#121212]">
                        {fu.customerName}
                      </span>
                      <span className="sans-micro text-[8.5px] px-2 py-0.5 rounded-full font-medium bg-white text-[#121212] border border-[#E8E6E1]">
                        {fu.scheduledTime} • {fu.type}
                      </span>
                    </div>
                    {fu.notes && <p className="text-xs text-[#666666] mt-1">{fu.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${fu.customerPhone}`}
                      className="w-7 h-7 rounded-full border border-[#E8E6E1] bg-white hover:border-[#121212] flex items-center justify-center transition-colors text-[#121212]"
                      title={`Call ${fu.customerPhone}`}
                    >
                      <Phone className="w-3 h-3 text-[#2D7A70]" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsappTarget({
                          customerName: fu.customerName,
                          customerPhone: fu.customerPhone,
                          leadId: fu.leadId,
                          defaultTemplate: 'GENERAL_FOLLOWUP',
                        });
                        setIsWhatsAppModalOpen(true);
                      }}
                      className="w-7 h-7 rounded-full border border-[#C8E2DC] bg-[#EBF4F2] hover:bg-[#DDF0EB] flex items-center justify-center text-[#2D7A70] transition-colors cursor-pointer"
                      title="WhatsApp Business Notification"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two Columns: My Leads & My Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Leads */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="serif-display text-base font-normal italic text-[#121212]">My Assigned Leads</h3>
              <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">Prospects requiring documentation or follow-up</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('associate-leads')}
              className="sans-micro text-[9.5px] font-medium uppercase tracking-[0.14em] text-[#8C6D37] hover:text-[#121212] transition-colors"
            >
              View All
            </button>
          </div>

          {myLeads.length === 0 ? (
            <EmptyState
              title="No leads assigned yet."
              description="New leads assigned by Admin will appear here immediately."
              actionText="+ Create Self-Originated Lead"
              onAction={onOpenNewLead}
            />
          ) : (
            <div className="space-y-2">
              {myLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="p-3.5 rounded-xl border border-[#E8E6E1] hover:border-[#121212] hover:bg-[#FAF9F6]/80 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="sans-micro text-[8.5px] text-[#888888]">{lead.id}</span>
                      <span className="serif-display text-sm font-normal text-[#121212]">{lead.customerName}</span>
                      <PriorityBadge priority={lead.priority} />
                    </div>
                    <div className="sans-micro text-[9px] text-[#888888] mt-1 flex items-center gap-2">
                      <span>{lead.loanType}</span>
                      <span>•</span>
                      <span>₹{Number(lead.requiredAmount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={lead.leadStatus} />
                    <ChevronRight className="w-4 h-4 text-[#888888]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Applications */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="serif-display text-base font-normal italic text-[#121212]">My Active Applications</h3>
              <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">Cases in the 12-stage underwriting process</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('associate-applications')}
              className="sans-micro text-[9.5px] font-medium uppercase tracking-[0.14em] text-[#8C6D37] hover:text-[#121212] transition-colors"
            >
              View All
            </button>
          </div>

          {myApps.length === 0 ? (
            <EmptyState
              title="No applications found."
              description="Convert one of your qualified leads into an application to start the 12-stage pipeline."
              actionText="+ Start Application"
              onAction={onOpenNewApp}
            />
          ) : (
            <div className="space-y-2">
              {myApps.map(app => (
                <div
                  key={app.id}
                  onClick={() => onSelectApp(app)}
                  className="p-3.5 rounded-xl border border-[#E8E6E1] hover:border-[#121212] hover:bg-[#FAF9F6]/80 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="sans-micro text-[8.5px] text-[#888888]">{app.id}</span>
                      <span className="serif-display text-sm font-normal text-[#121212]">{app.customerName}</span>
                    </div>
                    <div className="sans-micro text-[9px] text-[#888888] mt-1 flex items-center gap-2">
                      <span className="font-medium text-[#2D7A70] bg-[#EBF4F2] px-2 py-0.5 rounded-full border border-[#C8E2DC]">
                        Stage {app.currentStage}: {app.currentStageName}
                      </span>
                      <span>₹{Number(app.requestedAmount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={app.status} />
                    <ChevronRight className="w-4 h-4 text-[#888888]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Action Modal */}
      <WhatsAppActionModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setWhatsappTarget(null);
        }}
        target={whatsappTarget}
        onSuccess={() => loadData()}
      />
    </div>
  );
};

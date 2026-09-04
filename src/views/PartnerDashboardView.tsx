/**
 * Capitabee Financial Services CRM - Channel Partner Dashboard View
 * Personalized workspace for logged-in Channel Partners
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  TrendingUp,
  Award,
  Plus,
  RefreshCw,
  Phone,
  Building2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Application, Customer } from '../types';

interface PartnerDashboardProps {
  onNavigate: (viewId: string) => void;
  onOpenNewLead?: () => void;
  onOpenNewApp?: () => void;
  onSelectApp?: (app: Application) => void;
}

export const PartnerDashboardView: React.FC<PartnerDashboardProps> = ({
  onNavigate,
  onOpenNewLead,
  onOpenNewApp,
  onSelectApp,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('capitabee_auth_token');
      const [statsRes, appsRes, custsRes] = await Promise.all([
        fetch('/api/partner/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/applications', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/customers', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (appsRes.ok) {
        const d = await appsRes.json();
        setApplications(d.applications || []);
      }
      if (custsRes.ok) {
        const d = await custsRes.json();
        setCustomers(d.customers || []);
      }
    } catch (err) {
      console.error('Error fetching partner dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const targetAmount = stats?.target || user?.target || 10000000;
  const disbursedAmount = stats?.disbursedAmount || 0;
  const achievementPct = Math.min(100, Math.round((disbursedAmount / targetAmount) * 100));

  return (
    <div id="partner-dashboard-view" className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-[#121212] text-white p-6 sm:p-8 rounded-2xl border border-[#2A2A2A] shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-[#B89758]/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="sans-micro text-[9.5px] uppercase tracking-widest bg-[#B89758]/20 text-[#B89758] px-2.5 py-1 rounded-full border border-[#B89758]/30">
                Partner ID: {user?.id}
              </span>
              <span className="sans-micro text-[9.5px] uppercase tracking-widest text-[#A0A0A0]">
                {user?.designation || 'Senior Channel Partner'}
              </span>
            </div>
            <h1 className="serif-display text-2xl sm:text-3xl font-normal text-white">
              Welcome, {user?.name}
            </h1>
            <p className="text-xs text-[#A0A0A0] mt-1 font-light">
              Track your referred borrowers, 12-stage application pipelines, and channel disbursements live.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenNewLead && (
              <button
                type="button"
                onClick={onOpenNewLead}
                className="px-4 py-2 bg-[#B89758] hover:bg-[#A38446] text-[#121212] font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Refer New Customer / Lead</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
          <span className="sans-micro text-[9.5px] text-[#888888] uppercase tracking-wider block mb-1">Referred Customers</span>
          <div className="flex items-baseline justify-between">
            <span className="serif-display text-2xl font-semibold text-[#121212]">
              {customers.length}
            </span>
            <span className="text-xs text-[#5A5854]">Target: {stats?.targetCustomers || 20}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
          <span className="sans-micro text-[9.5px] text-[#888888] uppercase tracking-wider block mb-1">Active Pipeline</span>
          <div className="flex items-baseline justify-between">
            <span className="serif-display text-2xl font-semibold text-[#121212]">
              {applications.filter(a => !['Sanctioned', 'Disbursed', 'Rejected'].includes(a.status)).length}
            </span>
            <span className="text-xs text-amber-600 font-medium">In 12 Stages</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
          <span className="sans-micro text-[9.5px] text-[#888888] uppercase tracking-wider block mb-1">Disbursed Volume</span>
          <div className="flex items-baseline justify-between">
            <span className="serif-display text-2xl font-semibold text-emerald-700">
              ₹{(disbursedAmount / 100000).toFixed(2)} Lakhs
            </span>
            <span className="text-xs text-emerald-600 font-medium">Disbursed</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
          <span className="sans-micro text-[9.5px] text-[#888888] uppercase tracking-wider block mb-1">Target Achievement</span>
          <div className="flex items-baseline justify-between">
            <span className="serif-display text-2xl font-semibold text-[#121212]">
              {achievementPct}%
            </span>
            <span className="text-xs text-[#5A5854]">Target: ₹{(targetAmount / 100000).toFixed(0)} L</span>
          </div>
        </div>
      </div>

      {/* Target Progress Bar */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#8C6D37]" />
            <h3 className="serif-display text-base font-medium text-[#121212]">Monthly Disbursement Target</h3>
          </div>
          <span className="text-xs font-semibold text-[#121212]">{achievementPct}% Achieved</span>
        </div>
        <div className="w-full bg-[#FAF9F6] h-3 rounded-full overflow-hidden border border-[#E8E6E1]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              achievementPct >= 100 ? 'bg-emerald-500' : 'bg-[#121212]'
            }`}
            style={{ width: `${achievementPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[#888888] mt-1.5">
          <span>Current: ₹{(disbursedAmount / 100000).toFixed(2)} Lakhs</span>
          <span>Goal: ₹{(targetAmount / 100000).toFixed(0)} Lakhs</span>
        </div>
      </div>

      {/* Recent Applications Pipeline */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="serif-display text-lg font-medium text-[#121212]">Your Loan Applications Pipeline</h3>
            <p className="text-xs text-[#5A5854]">Live 12-stage status updates for applications referred by your channel.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('partner-applications')}
            className="text-xs font-semibold text-[#121212] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 text-[#B89758] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#888888]">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center bg-[#FAF9F6] rounded-xl border border-[#E8E6E1]">
            <Briefcase className="w-8 h-8 text-[#888888] mx-auto mb-2 opacity-50" />
            <p className="text-xs text-[#5A5854]">No applications found. Click "Refer New Customer" above to start.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E6E1]">
            {applications.slice(0, 5).map(app => (
              <div
                key={app.id}
                onClick={() => onSelectApp && onSelectApp(app)}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] px-2 rounded-xl transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#8C6D37]">{app.id}</span>
                    <span className="text-xs font-semibold text-[#121212]">{app.customerName}</span>
                    <span className="text-[10px] text-[#888888]">({app.loanType})</span>
                  </div>
                  <p className="text-[11px] text-[#5A5854] mt-0.5">
                    Stage {app.currentStage}/12: <strong>{app.currentStageName}</strong>
                    {app.lenderPartner && <> • Lender: {app.lenderPartner}</>}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="block text-xs font-semibold text-[#121212]">
                      ₹{app.requestedAmount?.toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        app.status === 'Disbursed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : app.status === 'Sanctioned'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#888888]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

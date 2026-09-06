/**
 * Capitabee Financial Services CRM - Partners Management View
 * Channel Partner Workspace & Onboarding with Sequential CB-XXXX IDs
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  TrendingUp,
  Award,
  Users,
  Briefcase,
  KeyRound,
  Edit2,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Shield,
  Download,
  RefreshCw,
  X,
} from 'lucide-react';
import { User, UserStats } from '../types';
import { supabaseService } from '../services/supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../services/api';

interface PartnerWithStats extends User {
  stats?: {
    totalCustomers: number;
    totalLeads: number;
    applications: number;
    inProgress: number;
    sanctions: number;
    disbursements: number;
    totalLoanValue: number;
    disbursedAmount: number;
    target: number;
    achievementPct: number;
    conversionRate: number;
  };
}

export const PartnersView: React.FC = () => {
  const [partners, setPartners] = useState<PartnerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Create/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerWithStats | null>(null);
  const [nextCbId, setNextCbId] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    customId: '',
    password: '',
    confirmPassword: '',
    department: 'Channel Partnerships',
    designation: 'Senior Lending Partner',
    status: 'Active',
    target: 10000000,
    targetCustomers: 20,
  });

  const [resetPassword, setResetPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPartners = async () => {
    try {
      setLoading(true);

      // Direct Supabase query
      if (isSupabaseConfigured()) {
        try {
          const associates = await supabaseService.getAssociates();
          const channelPartners = associates.filter(
            a =>
              (a as any).partnerType ||
              a.department?.toLowerCase().includes('partner') ||
              a.designation?.toLowerCase().includes('partner') ||
              a.role === 'ASSOCIATE'
          );

          const apps = await supabaseService.getApplications();
          const custs = await supabaseService.getCustomers();

          const partnersWithStats: PartnerWithStats[] = channelPartners.map(p => {
            const pApps = apps.filter(a => a.assignedPartnerId === p.id || a.assignedAssociateId === p.id);
            const pCusts = custs.filter(c => (c as any).partnerId === p.id || (c as any).assignedAssociateId === p.id);
            const disbursed = pApps.filter(a => a.currentStage === 12 || a.status === 'Disbursed');
            const totalDisbursedAmount = disbursed.reduce((sum, a) => sum + (Number(a.requestedAmount) || 0), 0);
            const targetVal = p.target || 10000000;

            return {
              ...p,
              stats: {
                totalCustomers: pCusts.length,
                totalLeads: 0,
                applications: pApps.length,
                inProgress: pApps.filter(a => a.currentStage < 12 && a.status !== 'Rejected').length,
                sanctions: pApps.filter(a => a.currentStage >= 8).length,
                disbursements: disbursed.length,
                totalLoanValue: pApps.reduce((sum, a) => sum + (Number(a.requestedAmount) || 0), 0),
                disbursedAmount: totalDisbursedAmount,
                target: targetVal,
                achievementPct: Math.min(100, Math.round((totalDisbursedAmount / targetVal) * 100)),
                conversionRate: pApps.length > 0 ? Math.round((disbursed.length / pApps.length) * 100) : 0,
              },
            };
          });

          setPartners(partnersWithStats);
          setLoading(false);
          return;
        } catch (sbErr) {
          console.warn('Supabase fetchPartners notice:', sbErr);
        }
      }

      const assocRes = await api.getAssociates();
      setPartners((assocRes.associates || []).filter(a => (a as any).partnerType || a.department === 'Partner Network'));
    } catch (err) {
      console.error('Error fetching partners:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextId = async () => {
    try {
      const associates = await supabaseService.getAssociates();
      const cbNums = associates
        .map(a => {
          const match = a.id.match(/^CB-(\d+)$/i);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter((n): n is number => n !== null);

      const maxNum = cbNums.length > 0 ? Math.max(...cbNums) : 1000;
      setNextCbId(`CB-${maxNum + 1}`);
    } catch (err) {
      console.error('Error fetching next CB ID:', err);
      setNextCbId('CB-1001');
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const openCreateModal = () => {
    fetchNextId();
    setSelectedPartner(null);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      customId: '',
      password: '',
      confirmPassword: '',
      department: 'Channel Partnerships',
      designation: 'Senior Lending Partner',
      status: 'Active',
      target: 10000000,
      targetCustomers: 20,
    });
    setAlertMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (partner: PartnerWithStats) => {
    setSelectedPartner(partner);
    setFormData({
      name: partner.name,
      mobile: partner.mobile,
      email: partner.email,
      customId: partner.id,
      password: '',
      confirmPassword: '',
      department: partner.department || 'Channel Partnerships',
      designation: partner.designation || 'Senior Lending Partner',
      status: partner.status || 'Active',
      target: partner.target || 10000000,
      targetCustomers: partner.targetCustomers || 20,
    });
    setAlertMsg(null);
    setIsModalOpen(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setAlertMsg(null);

    try {
      if (selectedPartner) {
        await supabaseService.updateAssociate(selectedPartner.id, {
          name: formData.name,
          mobile: formData.mobile,
          department: formData.department,
          designation: formData.designation,
          status: formData.status as any,
          target: formData.target,
        });
        setAlertMsg({ type: 'success', text: `Partner ${selectedPartner.id} updated successfully.` });
      } else {
        const partnerId = formData.customId || nextCbId || `CB-${Math.floor(1000 + Math.random() * 9000)}`;
        await supabaseService.createAssociate({
          customId: partnerId,
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          department: formData.department,
          designation: formData.designation,
          status: formData.status,
          target: formData.target,
          role: 'ASSOCIATE',
        });
        setAlertMsg({ type: 'success', text: `Partner ${partnerId} created successfully!` });
      }
      setIsModalOpen(false);
      fetchPartners();
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !resetPassword) return;

    setActionLoading(true);
    try {
      await api.resetAssociatePassword(selectedPartner.id, resetPassword);
      setAlertMsg({ type: 'success', text: `Password for Partner ${selectedPartner.id} reset successfully.` });
      setIsResetModalOpen(false);
      setResetPassword('');
    } catch (err: any) {
      setAlertMsg({ type: 'error', text: err.message || 'Password reset failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter partners
  const filtered = partners.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.mobile.includes(search);
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Calculate totals
  const totalVolume = partners.reduce((sum, p) => sum + (p.stats?.totalLoanValue || 0), 0);
  const totalDisbursed = partners.reduce((sum, p) => sum + (p.stats?.disbursedAmount || 0), 0);
  const totalCustomers = partners.reduce((sum, p) => sum + (p.stats?.totalCustomers || 0), 0);

  return (
    <div id="partners-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="sans-micro text-[9.5px] uppercase tracking-widest text-[#8C6D37] bg-[#B89758]/10 px-2 py-0.5 rounded font-semibold">
              Channel Network
            </span>
            <span className="text-xs text-[#888888]">Direct Referral & Broker Hierarchy</span>
          </div>
          <h1 className="serif-display text-2xl sm:text-3xl font-normal text-[#121212]">
            Channel Partners Management
          </h1>
          <p className="text-xs text-[#5A5854] mt-1 font-light">
            Manage authorized channel partners, assign monthly targets, track disbursements, and issue secure portal access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/export/csv?type=partners"
            download
            className="px-3.5 py-2 bg-[#FAF9F6] hover:bg-[#F2F1ED] text-[#121212] rounded-xl text-xs font-semibold border border-[#E8E6E1] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#5A5854]" />
            <span>Export CSV</span>
          </a>
          <button
            type="button"
            id="create-partner-btn"
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#121212] hover:bg-[#2A2A2A] text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#B89758]" />
            <span>Add Channel Partner</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
          <span className="sans-micro text-[9.5px] text-[#888888] uppercase tracking-wider block mb-1">Total Active Partners</span>
          <div className="flex items-baseline justify-between">
            <span className="serif-display text-2xl font-semibold text-[#121212]">
              {partners.filter(p => p.status === 'Active').length}
            </span>
            <span className="text-xs text-[#888888]">of {partners.length} registered</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
          <span className="sans-micro text-[9.5px] text-[#888888] uppercase tracking-wider block mb-1">Referred Customers</span>
          <div className="flex items-baseline justify-between">
            <span className="serif-display text-2xl font-semibold text-[#121212]">
              {totalCustomers}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Channel Pipeline</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
          <span className="sans-micro text-[9.5px] text-[#888888] uppercase tracking-wider block mb-1">Total Volume Sourced</span>
          <div className="flex items-baseline justify-between">
            <span className="serif-display text-2xl font-semibold text-[#121212]">
              ₹{(totalVolume / 10000000).toFixed(2)} Cr
            </span>
            <span className="text-xs text-[#5A5854]">Requested</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-2xs">
          <span className="sans-micro text-[9.5px] text-[#888888] uppercase tracking-wider block mb-1">Total Disbursed Volume</span>
          <div className="flex items-baseline justify-between">
            <span className="serif-display text-2xl font-semibold text-emerald-700">
              ₹{(totalDisbursed / 10000000).toFixed(2)} Cr
            </span>
            <span className="text-xs text-emerald-600 font-medium">Disbursed</span>
          </div>
        </div>
      </div>

      {alertMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{alertMsg.text}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} className="text-xs underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E6E1] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search partner name, CB-ID, phone..."
            className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#888888]">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none cursor-pointer"
          >
            <option value="All">All Partners</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Partners List Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E8E6E1]">
          <RefreshCw className="w-6 h-6 text-[#B89758] animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#888888]">Loading partners registry...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E8E6E1]">
          <Building2 className="w-10 h-10 text-[#888888] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-[#121212]">No Partners Found</p>
          <p className="text-xs text-[#5A5854] mt-1 mb-4">Click "Add Channel Partner" to register a new partner with auto CB-ID allocation.</p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-xl"
          >
            Add Channel Partner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(partner => {
            const stats = partner.stats;
            const target = stats?.target || partner.target || 10000000;
            const disbursed = stats?.disbursedAmount || 0;
            const pct = Math.min(100, Math.round((disbursed / target) * 100));

            return (
              <div
                key={partner.id}
                className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-xs hover:border-[#121212]/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#8C6D37] bg-[#B89758]/10 px-2 py-0.5 rounded border border-[#B89758]/20">
                        {partner.id}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          partner.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {partner.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(partner)}
                        title="Edit Details & Target"
                        className="p-1.5 text-[#5A5854] hover:text-[#121212] hover:bg-[#FAF9F6] rounded-lg cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPartner(partner);
                          setIsResetModalOpen(true);
                        }}
                        title="Reset Portal Password"
                        className="p-1.5 text-[#5A5854] hover:text-[#121212] hover:bg-[#FAF9F6] rounded-lg cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="serif-display text-lg font-medium text-[#121212]">{partner.name}</h3>
                  <p className="text-xs text-[#5A5854]">{partner.email} • {partner.mobile}</p>
                  <p className="text-[11px] text-[#888888] mt-0.5">{partner.designation || 'Channel Partner'}</p>

                  {/* Target Achievement Bar */}
                  <div className="mt-4 pt-3 border-t border-[#E8E6E1]">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-[#888888]">Monthly Target:</span>
                      <span className="font-semibold text-[#121212]">₹{(target / 100000).toFixed(1)} Lakhs</span>
                    </div>
                    <div className="w-full bg-[#FAF9F6] h-2 rounded-full overflow-hidden border border-[#E8E6E1]">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-[#121212]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#888888] mt-1">
                      <span>Disbursed: ₹{(disbursed / 100000).toFixed(1)} L</span>
                      <span className="font-semibold text-[#121212]">{pct}% Achieved</span>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#E8E6E1] text-center">
                    <div className="p-2 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1]">
                      <span className="block text-[9px] uppercase text-[#888888]">Customers</span>
                      <span className="text-xs font-bold text-[#121212]">{stats?.totalCustomers || 0}</span>
                    </div>
                    <div className="p-2 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1]">
                      <span className="block text-[9px] uppercase text-[#888888]">Applications</span>
                      <span className="text-xs font-bold text-[#121212]">{stats?.applications || 0}</span>
                    </div>
                    <div className="p-2 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1]">
                      <span className="block text-[9px] uppercase text-[#888888]">Disbursed</span>
                      <span className="text-xs font-bold text-emerald-700">{stats?.disbursements || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT PARTNER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#121212]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-[#E8E6E1] shadow-2xl p-6 relative animate-in fade-in">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-[#888888] hover:text-[#121212] rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="sans-micro text-[9.5px] uppercase tracking-widest text-[#8C6D37] bg-[#B89758]/10 px-2 py-0.5 rounded font-semibold">
                {selectedPartner ? 'Edit Channel Partner' : 'New Channel Partner Onboarding'}
              </span>
              <h2 className="serif-display text-xl font-medium text-[#121212] mt-1">
                {selectedPartner ? `Update Partner ${selectedPartner.id}` : 'Create Partner Account'}
              </h2>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-3.5">
              {!selectedPartner && (
                <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1] flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-[#888888] uppercase">Assigned Sequential ID</span>
                    <span className="font-mono text-sm font-bold text-[#8C6D37]">{formData.customId || nextCbId}</span>
                  </div>
                  <input
                    type="text"
                    value={formData.customId}
                    onChange={e => setFormData({ ...formData, customId: e.target.value })}
                    placeholder={`Auto: ${nextCbId}`}
                    className="w-32 px-3 py-1.5 bg-white border border-[#E8E6E1] rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#121212] mb-1">Partner Full Name / Entity *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex Finserve / Rajesh Gupta"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#121212] mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#121212] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!!selectedPartner}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="partner@example.com"
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212] disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#121212] mb-1">Monthly Target (INR)</label>
                  <input
                    type="number"
                    value={formData.target}
                    onChange={e => setFormData({ ...formData, target: Number(e.target.value) })}
                    placeholder="10000000"
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#121212] mb-1">Target Customers / Month</label>
                  <input
                    type="number"
                    value={formData.targetCustomers}
                    onChange={e => setFormData({ ...formData, targetCustomers: Number(e.target.value) })}
                    placeholder="20"
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
                  />
                </div>
              </div>

              {!selectedPartner && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-[#121212] mb-1">Set Password *</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#121212] mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Repeat password"
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
                    />
                  </div>
                </div>
              )}

              {selectedPartner && (
                <div>
                  <label className="block text-xs font-medium text-[#121212] mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#FAF9F6] hover:bg-[#F2F1ED] text-[#5A5854] text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#121212] hover:bg-[#2A2A2A] text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : selectedPartner ? 'Update Partner' : 'Create Partner Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 bg-[#121212]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-[#E8E6E1] shadow-2xl p-6 relative">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-[#888888] hover:text-[#121212] rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="serif-display text-lg font-medium text-[#121212] mb-1">
              Reset Password for {selectedPartner.id}
            </h3>
            <p className="text-xs text-[#5A5854] mb-4">{selectedPartner.name}</p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#121212] mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3.5 py-2 bg-[#FAF9F6] text-[#5A5854] text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || resetPassword.length < 6}
                  className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

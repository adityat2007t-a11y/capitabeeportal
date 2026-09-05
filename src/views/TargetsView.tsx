/**
 * Capitabee Financial Services CRM - Targets & Performance View
 * Set and track monthly targets for Associates, Channel Partners, and Teams
 */

import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  Target,
  Users,
  Building,
  Edit2,
  CheckCircle2,
  RefreshCw,
  Search,
  Calendar,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { supabaseService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

interface TargetItem {
  id: string;
  userId: string;
  userName: string;
  role: string;
  month: string;
  targetAmount: number;
  targetCount: number;
  targetCustomers: number;
  achievedAmount: number;
  achievedCount: number;
  achievedCustomers: number;
  achievementRate: number;
  status: 'In Progress' | 'Achieved' | 'Behind';
}

export const TargetsView: React.FC = () => {
  const { role, user } = useAuth();
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('2025-01');

  // Edit target modal state
  const [editingTarget, setEditingTarget] = useState<TargetItem | null>(null);
  const [targetAmountInput, setTargetAmountInput] = useState(10000000);
  const [targetCustomersInput, setTargetCustomersInput] = useState(20);
  const [saving, setSaving] = useState(false);

  const fetchTargets = async () => {
    try {
      setLoading(true);

      // Direct Supabase query
      if (isSupabaseConfigured()) {
        try {
          const associates = await supabaseService.getAssociates();
          const supabaseTargets = await supabaseService.getTargets(selectedMonth);

          const items: TargetItem[] = associates.map(a => {
            const tgt = supabaseTargets.find(t => t.associateId === a.id);
            const targetAmount = tgt ? tgt.targetAmount : Number(a.monthlyTarget || a.target || 5000000);
            const achievedAmount = tgt ? tgt.achievedAmount : 0;
            const targetCustomers = tgt ? tgt.targetApplications : 20;
            const achievedCustomers = tgt ? tgt.achievedApplications : 0;
            const rate = targetAmount > 0 ? Math.round((achievedAmount / targetAmount) * 100) : 0;

            return {
              id: tgt?.id || `TGT-${a.id}-${selectedMonth}`,
              userId: a.id,
              userName: a.name,
              role: a.role,
              month: selectedMonth,
              targetAmount,
              targetCount: targetCustomers,
              targetCustomers,
              achievedAmount,
              achievedCount: achievedCustomers,
              achievedCustomers,
              achievementRate: rate,
              status: rate >= 100 ? 'Achieved' : rate < 50 ? 'Behind' : 'In Progress',
            };
          });

          setTargets(items);
          setLoading(false);
          return;
        } catch (sbErr) {
          console.warn('Supabase getTargets notice:', sbErr);
        }
      }

      const res = await api.getTargets(selectedMonth);
      setTargets(res.targets || []);
    } catch (err) {
      console.error('Error fetching targets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, [selectedMonth]);

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget) return;

    setSaving(true);
    try {
      await api.updateTarget({
        associateId: editingTarget.userId,
        associateName: editingTarget.userName,
        monthYear: selectedMonth,
        targetAmount: targetAmountInput,
        targetApplications: targetCustomersInput,
      });
      setEditingTarget(null);
      fetchTargets();
    } catch (err) {
      console.error('Error saving target:', err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = targets.filter(t => {
    const matchSearch =
      t.userName.toLowerCase().includes(search.toLowerCase()) ||
      t.userId.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || t.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div id="targets-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="sans-micro text-[9.5px] uppercase tracking-widest text-[#8C6D37] bg-[#B89758]/10 px-2 py-0.5 rounded font-semibold">
              Performance Engine
            </span>
            <span className="text-xs text-[#888888]">Monthly Goals & Disbursement Metrics</span>
          </div>
          <h1 className="serif-display text-2xl sm:text-3xl font-normal text-[#121212]">
            Targets & Performance Tracker
          </h1>
          <p className="text-xs text-[#5A5854] mt-1 font-light">
            Monitor real disbursement performance against assigned goals for all Channel Partners and Associates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#FAF9F6] border border-[#E8E6E1] px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-[#888888]" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs text-[#121212] font-semibold focus:outline-none cursor-pointer"
            >
              <option value="2025-01">January 2025</option>
              <option value="2025-02">February 2025</option>
              <option value="2025-03">March 2025</option>
              <option value="2024-12">December 2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#E8E6E1] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search person name, ID..."
            className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-[#888888]">Role:</span>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none cursor-pointer"
          >
            <option value="All">All Roles</option>
            <option value="PARTNER">Channel Partners</option>
            <option value="ASSOCIATE">Associates</option>
          </select>
        </div>
      </div>

      {/* Targets Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E8E6E1]">
          <RefreshCw className="w-6 h-6 text-[#B89758] animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#888888]">Calculating performance metrics...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E8E6E1]">
          <Target className="w-10 h-10 text-[#888888] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-[#121212]">No Targets Found</p>
          <p className="text-xs text-[#5A5854] mt-1">Targets are automatically provisioned when Partners or Associates are created.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(t => {
            const pct = t.achievementRate;
            return (
              <div
                key={t.userId}
                className="bg-white p-5 rounded-2xl border border-[#E8E6E1] shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#8C6D37] bg-[#B89758]/10 px-2 py-0.5 rounded">
                        {t.userId}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-[#5A5854]">
                        {t.role}
                      </span>
                    </div>

                    {role === 'ADMIN' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTarget(t);
                          setTargetAmountInput(t.targetAmount);
                          setTargetCustomersInput(t.targetCustomers);
                        }}
                        className="p-1.5 text-[#5A5854] hover:text-[#121212] hover:bg-[#FAF9F6] rounded-lg cursor-pointer"
                        title="Edit Target"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <h3 className="serif-display text-base font-semibold text-[#121212]">{t.userName}</h3>
                  <p className="text-[11px] text-[#888888]">Target Cycle: {t.month}</p>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#888888]">Disbursement Goal:</span>
                      <span className="font-semibold text-[#121212]">₹{(t.targetAmount / 100000).toFixed(1)} L</span>
                    </div>
                    <div className="w-full bg-[#FAF9F6] h-2.5 rounded-full overflow-hidden border border-[#E8E6E1]">
                      <div
                        className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-[#121212]'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#888888] mt-1">
                      <span>Achieved: ₹{(t.achievedAmount / 100000).toFixed(1)} L</span>
                      <span className={`font-bold ${pct >= 100 ? 'text-emerald-700' : 'text-[#121212]'}`}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  {/* Customers Target */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#E8E6E1] text-center">
                    <div className="p-2 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1]">
                      <span className="block text-[9px] uppercase text-[#888888]">Target Cust</span>
                      <span className="text-xs font-bold text-[#121212]">{t.targetCustomers}</span>
                    </div>
                    <div className="p-2 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1]">
                      <span className="block text-[9px] uppercase text-[#888888]">Achieved Cust</span>
                      <span className="text-xs font-bold text-[#121212]">{t.achievedCustomers}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT TARGET MODAL */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 bg-[#121212]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#E8E6E1] shadow-2xl p-6 relative">
            <h3 className="serif-display text-lg font-medium text-[#121212] mb-1">
              Adjust Monthly Target for {editingTarget.userName}
            </h3>
            <p className="text-xs text-[#5A5854] mb-4">Cycle: {selectedMonth} • ID: {editingTarget.userId}</p>

            <form onSubmit={handleSaveTarget} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#121212] mb-1">Target Amount (INR)</label>
                <input
                  type="number"
                  required
                  value={targetAmountInput}
                  onChange={e => setTargetAmountInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#121212] mb-1">Target Customer Count</label>
                <input
                  type="number"
                  required
                  value={targetCustomersInput}
                  onChange={e => setTargetCustomersInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl text-xs text-[#121212]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTarget(null)}
                  className="px-3.5 py-2 bg-[#FAF9F6] text-[#5A5854] text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#121212] text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

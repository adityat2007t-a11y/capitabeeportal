/**
 * Capitabee Financial Services CRM - Assignments & Ownership Engine
 * Matrix for assigning Leads, Customers, and Applications to Partners and Associates
 */

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Users,
  Briefcase,
  UserCheck,
  Building,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Lead, Application, Customer, User } from '../types';
import { supabaseService } from '../services/supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const AssignmentsView: React.FC = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'leads' | 'applications' | 'customers'>('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [associates, setAssociates] = useState<User[]>([]);
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Target assignment selections
  const [targetAssociateId, setTargetAssociateId] = useState('');
  const [targetPartnerId, setTargetPartnerId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Direct Supabase calls
      if (isSupabaseConfigured()) {
        try {
          const [leadsData, appsData, custsData, assocData] = await Promise.all([
            supabaseService.getLeads(),
            supabaseService.getApplications(),
            supabaseService.getCustomers(),
            supabaseService.getAssociates(),
          ]);

          setLeads(leadsData);
          setApplications(appsData);
          setCustomers(custsData);
          setAssociates(assocData);
          setPartners(assocData.filter(a => (a as any).partnerType || a.department === 'Partner Network'));
          setLoading(false);
          return;
        } catch (sbErr) {
          console.warn('Supabase assignments data fetch notice:', sbErr);
        }
      }

      const [leadsRes, appsRes, custsRes, assocRes] = await Promise.all([
        api.getLeads(),
        api.getApplications(),
        api.getCustomers(),
        api.getAssociates(),
      ]);

      setLeads(leadsRes.leads || []);
      setApplications(appsRes.applications || []);
      setCustomers(custsRes.customers || []);
      setAssociates(assocRes.associates || []);
      setPartners((assocRes.associates || []).filter(a => (a as any).partnerType || a.department === 'Partner Network'));
    } catch (err) {
      console.error('Error fetching assignment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setSelectedIds([]);
  }, [activeTab]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (items: any[]) => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map(i => i.id));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0 || (!targetAssociateId && !targetPartnerId)) {
      setStatusMsg({ type: 'error', text: 'Please select records and choose an Associate or Partner.' });
      return;
    }

    setAssigning(true);
    setStatusMsg(null);

    try {
      if (isSupabaseConfigured()) {
        try {
          const assoc = associates.find(a => a.id === targetAssociateId);
          if (activeTab === 'leads') {
            for (const id of selectedIds) {
              await supabaseService.updateLead(id, {
                assignedAssociateId: targetAssociateId || undefined,
                assignedAssociateName: assoc?.name || undefined,
              });
            }
          } else if (activeTab === 'applications') {
            for (const id of selectedIds) {
              await supabaseService.updateApplication(id, {
                assignedAssociateId: targetAssociateId || undefined,
                assignedAssociateName: assoc?.name || undefined,
              });
            }
          } else if (activeTab === 'customers') {
            for (const id of selectedIds) {
              await supabase
                .from('customers')
                .update({
                  assigned_associate_id: targetAssociateId || null,
                  assigned_associate_name: assoc?.name || null,
                })
                .eq('id', id);
            }
          }

          setStatusMsg({
            type: 'success',
            text: `Successfully updated assignments for ${selectedIds.length} ${activeTab}.`,
          });
          setSelectedIds([]);
          fetchData();
          setAssigning(false);
          return;
        } catch (sbErr: any) {
          console.warn('Supabase bulk assign notice:', sbErr);
        }
      }

      // Perform client-side / Supabase bulk assignment
      for (const id of selectedIds) {
        if (activeTab === 'leads') {
          await api.updateLead(id, {
            assignedAssociateId: targetAssociateId || undefined,
            assignedAssociateName: targetAssoc?.name || undefined,
          });
        } else if (activeTab === 'applications') {
          await api.updateApplication(id, {
            assignedAssociateId: targetAssociateId || undefined,
            assignedAssociateName: targetAssoc?.name || undefined,
          });
        }
      }

      setStatusMsg({
        type: 'success',
        text: `Successfully updated assignments for ${selectedIds.length} ${activeTab}.`,
      });
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div id="assignments-view" className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="sans-micro text-[9.5px] uppercase tracking-widest text-[#8C6D37] bg-[#B89758]/10 px-2 py-0.5 rounded font-semibold">
              Governance & Delegation
            </span>
            <span className="text-xs text-[#888888]">Centralized Portfolio Assignments</span>
          </div>
          <h1 className="serif-display text-2xl sm:text-3xl font-normal text-[#121212]">
            Assignments & Portfolio Ownership
          </h1>
          <p className="text-xs text-[#5A5854] mt-1 font-light">
            Reassign leads, borrower files, and loan applications between Associates and Channel Partners with instant audit log recording.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-xs underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#E8E6E1] gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
            activeTab === 'leads'
              ? 'border-[#121212] text-[#121212]'
              : 'border-transparent text-[#888888] hover:text-[#121212]'
          }`}
        >
          Leads ({leads.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('applications')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
            activeTab === 'applications'
              ? 'border-[#121212] text-[#121212]'
              : 'border-transparent text-[#888888] hover:text-[#121212]'
          }`}
        >
          Applications ({applications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('customers')}
          className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
            activeTab === 'customers'
              ? 'border-[#121212] text-[#121212]'
              : 'border-transparent text-[#888888] hover:text-[#121212]'
          }`}
        >
          Customers ({customers.length})
        </button>
      </div>

      {/* Bulk Action Bar */}
      <div className="bg-[#121212] text-white p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">
            {selectedIds.length} Selected
          </span>
          <span className="text-xs text-[#888888]">for reassignment</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={targetAssociateId}
            onChange={e => setTargetAssociateId(e.target.value)}
            className="px-3 py-1.5 bg-[#2A2A2A] border border-white/20 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="">Assign to Associate...</option>
            {associates.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
            ))}
          </select>

          <select
            value={targetPartnerId}
            onChange={e => setTargetPartnerId(e.target.value)}
            className="px-3 py-1.5 bg-[#2A2A2A] border border-white/20 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="">Assign to Partner...</option>
            {partners.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
            ))}
          </select>

          <button
            type="button"
            disabled={assigning || selectedIds.length === 0}
            onClick={handleBulkAssign}
            className="px-4 py-1.5 bg-[#B89758] hover:bg-[#A38446] text-[#121212] font-semibold text-xs rounded-xl disabled:opacity-40 transition-all cursor-pointer"
          >
            {assigning ? 'Assigning...' : 'Apply Reassignment'}
          </button>
        </div>
      </div>

      {/* Items Table */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-[#E8E6E1]">
          <RefreshCw className="w-6 h-6 text-[#B89758] animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#888888]">Loading records...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E8E6E1] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-[#E8E6E1] text-[#888888] font-medium uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3 w-12">
                    <input
                      type="checkbox"
                      onChange={() => {
                        const items = activeTab === 'leads' ? leads : activeTab === 'applications' ? applications : customers;
                        handleSelectAll(items);
                      }}
                      checked={
                        selectedIds.length > 0 &&
                        selectedIds.length ===
                          (activeTab === 'leads' ? leads.length : activeTab === 'applications' ? applications.length : customers.length)
                      }
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">ID & Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Current Associate</th>
                  <th className="px-4 py-3">Current Partner</th>
                  <th className="px-4 py-3">Status / Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1]">
                {(activeTab === 'leads' ? leads : activeTab === 'applications' ? applications : customers).map((item: any) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleToggleSelect(item.id)}
                      className={`hover:bg-[#FAF9F6]/80 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#B89758]/5' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-[#121212]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#8C6D37]">{item.id}</span>
                          <span>{item.name || item.customerName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#5A5854]">
                        {item.mobile}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-[#121212]">
                          {item.assignedAssociateName || item.assignedAssociateId || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-[#8C6D37]">
                          {item.assignedPartnerName || item.assignedPartnerId || 'Direct'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-[#FAF9F6] border border-[#E8E6E1] text-[#5A5854]">
                          {item.status || `Stage ${item.currentStage}/12`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

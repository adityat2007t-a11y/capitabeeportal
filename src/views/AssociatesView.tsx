/**
 * Capitabee Financial Services CRM - Associate Team Management (Admin Only)
 */

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  KeyRound,
  Edit2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { AssociateModal } from '../components/associates/AssociateModal';
import { ResetPasswordModal } from '../components/associates/ResetPasswordModal';
import { api } from '../services/api';
import { User } from '../types';

interface AssociatesViewProps {
  onOpenNewAssociate: () => void;
}

export const AssociatesView: React.FC<AssociatesViewProps> = ({
  onOpenNewAssociate,
}) => {
  const [associates, setAssociates] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [editingAssociate, setEditingAssociate] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [resettingAssociate, setResettingAssociate] = useState<User | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Status toggle confirm
  const [confirmToggleUser, setConfirmToggleUser] = useState<User | null>(null);

  const loadAssociates = async () => {
    setLoading(true);
    try {
      const res = await api.getAssociates();
      setAssociates(res.associates || []);
    } catch (err: any) {
      console.error('Failed to load associates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssociates();
  }, []);

  const filteredAssociates = associates.filter(a => {
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.mobile.includes(q)
    );
  });

  const handleToggleStatus = async () => {
    if (!confirmToggleUser) return;
    const newStatus = confirmToggleUser.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.updateAssociate(confirmToggleUser.id, { status: newStatus });
      setConfirmToggleUser(null);
      loadAssociates();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <div id="associates-view" className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card">
        <div>
          <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Loan Relationship Associates</h2>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Internal operations and sales personnel directory with role-based access
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewAssociate}
          className="inline-flex items-center gap-2 px-4 py-2 sans-micro text-[10.5px] font-medium uppercase tracking-[0.15em] text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-[#B89758]" />
          <span>+ Add Associate</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E8E6E1] artistic-card flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by associate name, ID (CB-XXXX), email..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-lg focus:outline-hidden focus:border-[#121212] text-[#121212] transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center sans-micro text-xs text-[#888888]">
            Loading associates directory...
          </div>
        ) : filteredAssociates.length === 0 ? (
          <EmptyState
            title="No Associate accounts created yet."
            description="Create official employee accounts to delegate leads, track 12-stage cases, and evaluate performance."
            actionText="+ Add First Associate"
            onAction={onOpenNewAssociate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E8E6E1] sans-micro text-[9px] text-[#888888]">
                  <th className="py-3.5 px-4 font-medium">Associate ID & Name</th>
                  <th className="py-3.5 px-4 font-medium">Contact Info</th>
                  <th className="py-3.5 px-4 font-medium">Department & Role</th>
                  <th className="py-3.5 px-4 font-medium">Monthly Target</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1] text-xs">
                {filteredAssociates.map(assoc => (
                  <tr key={assoc.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="sans-micro text-[8.5px] text-[#8C6D37]">
                          {assoc.id}
                        </span>
                        <span className="serif-display text-sm font-normal text-[#121212]">{assoc.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col text-[11px]">
                        <span className="font-medium text-[#121212]">{assoc.email}</span>
                        <span className="text-[#888888]">{assoc.mobile}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col text-[11px]">
                        <span className="font-medium text-[#121212]">
                          {assoc.department || 'Loan Operations'}
                        </span>
                        <span className="text-[#888888]">
                          {assoc.designation || 'Loan Relationship Associate'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-[#121212]">
                        ₹{Number(assoc.monthlyTarget || 2500000).toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full sans-micro text-[8.5px] tracking-wider uppercase font-medium ${
                          assoc.status === 'Active'
                            ? 'bg-[#EBF4F2] text-[#2D7A70] border border-[#C8E2DC]'
                            : 'bg-[#FAF0F0] text-[#9E3A3A] border border-[#F0D5D5]'
                        }`}
                      >
                        {assoc.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Associate */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAssociate(assoc);
                            setIsEditModalOpen(true);
                          }}
                          className="w-7 h-7 rounded-full border border-[#E8E6E1] bg-white hover:border-[#121212] flex items-center justify-center transition-colors text-[#121212] cursor-pointer"
                          title="Edit Associate Profile"
                        >
                          <Edit2 className="w-3 h-3 text-[#121212]" />
                        </button>

                        {/* Reset Password */}
                        <button
                          type="button"
                          onClick={() => {
                            setResettingAssociate(assoc);
                            setIsResetModalOpen(true);
                          }}
                          className="w-7 h-7 rounded-full border border-[#E8E6E1] bg-[#FAF9F6] hover:border-[#8C6D37] flex items-center justify-center transition-colors text-[#8C6D37] cursor-pointer"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3 h-3" />
                        </button>

                        {/* Toggle Status */}
                        <button
                          type="button"
                          onClick={() => setConfirmToggleUser(assoc)}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                            assoc.status === 'Active'
                              ? 'border-[#F0D5D5] bg-[#FAF0F0] text-[#9E3A3A] hover:bg-[#F5E1E1]'
                              : 'border-[#C8E2DC] bg-[#EBF4F2] text-[#2D7A70] hover:bg-[#DDF0EB]'
                          }`}
                          title={assoc.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {assoc.status === 'Active' ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Associate Modal */}
      <AssociateModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialAssociate={editingAssociate}
        onSuccess={loadAssociates}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        associate={resettingAssociate}
        onSuccess={() => {
          alert('Password updated successfully.');
        }}
      />

      {/* Deactivate / Activate Confirm */}
      <ConfirmDialog
        id="toggle-associate-status-dialog"
        isOpen={!!confirmToggleUser}
        onClose={() => setConfirmToggleUser(null)}
        onConfirm={handleToggleStatus}
        title={confirmToggleUser?.status === 'Active' ? 'Deactivate Associate' : 'Activate Associate'}
        message={`Are you sure you want to change the status of ${confirmToggleUser?.name} (${confirmToggleUser?.id}) to ${
          confirmToggleUser?.status === 'Active' ? 'Inactive' : 'Active'
        }?`}
        isDestructive={confirmToggleUser?.status === 'Active'}
        confirmText={confirmToggleUser?.status === 'Active' ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
};

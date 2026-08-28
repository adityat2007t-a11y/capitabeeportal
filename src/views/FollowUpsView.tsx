/**
 * Capitabee Financial Services CRM - Follow-ups Management View
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FollowUp } from '../types';
import { WhatsAppActionModal, WhatsAppTarget } from '../components/common/WhatsAppActionModal';

interface FollowUpsViewProps {
  onSelectLeadId?: (leadId: string) => void;
}

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({ onSelectLeadId }) => {
  const { role } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'today' | 'upcoming' | 'overdue' | 'completed' | 'all'>('today');
  const [whatsappTarget, setWhatsappTarget] = useState<WhatsAppTarget | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadFollowUps = async () => {
    setLoading(true);
    try {
      const res = await api.getFollowUps();
      setFollowUps(res.followUps || []);
    } catch (err: any) {
      console.error('Error loading followups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFollowUps();
  }, []);

  const filtered = followUps.filter(fu => {
    if (activeFilter === 'today') {
      return fu.scheduledDate === todayStr && fu.status === 'Pending';
    }
    if (activeFilter === 'upcoming') {
      return fu.scheduledDate > todayStr && fu.status === 'Pending';
    }
    if (activeFilter === 'overdue') {
      return fu.scheduledDate < todayStr && fu.status === 'Pending';
    }
    if (activeFilter === 'completed') {
      return fu.status === 'Completed';
    }
    return true;
  });

  const handleMarkDone = async (id: string) => {
    try {
      await api.updateFollowUp(id, { status: 'Completed', outcome: 'Discussion concluded' });
      loadFollowUps();
    } catch (err: any) {
      alert(err.message || 'Failed to complete follow-up');
    }
  };

  return (
    <div id="followups-view" className="space-y-5">
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Customer Follow-up Registry</h2>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Scheduled callbacks, meeting touchpoints, and borrower interactions
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex p-1 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1] text-xs">
          {(['today', 'overdue', 'upcoming', 'completed', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg capitalize sans-micro text-[9px] transition-all ${
                activeFilter === tab
                  ? 'bg-[#121212] text-white shadow-2xs font-semibold'
                  : 'text-[#888888] hover:text-[#121212]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card p-6">
        {loading ? (
          <div className="py-16 text-center sans-micro text-xs text-[#888888]">
            Loading scheduled follow-ups...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No follow-ups due."
            description={
              activeFilter === 'today'
                ? 'No client follow-ups due for today.'
                : `No follow-ups found in the "${activeFilter}" filter.`
            }
          />
        ) : (
          <div className="space-y-3.5">
            {filtered.map(fu => {
              const cleanPhone = fu.customerPhone ? fu.customerPhone.replace(/\D/g, '') : '';
              const phoneFormatted = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
              const isOverdue = fu.scheduledDate < todayStr && fu.status === 'Pending';

              return (
                <div
                  key={fu.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 flex-wrap ${
                    isOverdue
                      ? 'border-[#121212] bg-[#FAF9F6]'
                      : 'border-[#E8E6E1] bg-white hover:border-[#121212]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="serif-display text-base font-normal text-[#121212]">{fu.customerName}</span>
                      <span
                        className={`sans-micro text-[8.5px] px-2.5 py-0.5 rounded-full font-medium ${
                          fu.status === 'Completed'
                            ? 'bg-[#2D7A70]/10 text-[#2D7A70] border border-[#2D7A70]/20'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-[#FAF9F6] text-[#888888] border border-[#E8E6E1]'
                        }`}
                      >
                        {fu.type} • {isOverdue ? 'OVERDUE' : fu.status}
                      </span>
                    </div>

                    <div className="sans-micro text-[9px] text-[#888888] mt-1.5 flex items-center gap-3">
                      <span>
                        {fu.scheduledDate} • {fu.scheduledTime}
                      </span>
                      <span>—</span>
                      <span>Assignee: {fu.associateName}</span>
                    </div>

                    {fu.notes && (
                      <p className="text-xs text-[#5A5854] mt-2 italic bg-[#FAF9F6] p-2.5 rounded-lg border border-[#E8E6E1]">
                        "{fu.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${fu.customerPhone}`}
                      className="px-3.5 py-1.5 sans-micro text-[9px] font-medium text-[#121212] bg-[#FAF9F6] border border-[#E8E6E1] hover:border-[#121212] rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#8C6D37]" />
                      <span>Call</span>
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
                      className="px-3.5 py-1.5 sans-micro text-[9px] font-medium text-[#2D7A70] bg-[#2D7A70]/10 border border-[#2D7A70]/20 hover:bg-[#2D7A70]/20 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    {fu.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => handleMarkDone(fu.id)}
                        className="px-3.5 py-1.5 sans-micro text-[9px] font-medium text-white bg-[#121212] hover:bg-[#2A2A2A] rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#B89758]" />
                        <span>Mark Done</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
        onSuccess={() => loadFollowUps()}
      />
    </div>
  );
};

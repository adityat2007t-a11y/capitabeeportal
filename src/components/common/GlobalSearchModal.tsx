/**
 * Capitabee Financial Services - Global Command Search Modal
 */

import React, { useState, useEffect } from 'react';
import { Search, UserCheck, FileText, Users, ArrowRight, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Lead, Application, User } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLead: (lead: Lead) => void;
  onSelectApplication: (app: Application) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectLead,
  onSelectApplication,
}) => {
  const { role } = useAuth();
  const [query, setQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [associates, setAssociates] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setLeads([]);
      setApps([]);
      setAssociates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [leadRes, appRes] = await Promise.all([
          api.getLeads({ search: query }),
          api.getApplications({ search: query }),
        ]);
        setLeads(leadRes.leads || []);
        setApps(appRes.applications || []);

        if (role === 'ADMIN') {
          const assocRes = await api.getAssociates();
          const q = query.toLowerCase();
          const filtered = (assocRes.associates || []).filter(
            a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.mobile.includes(q)
          );
          setAssociates(filtered);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, role]);

  if (!isOpen) return null;

  const totalResults = leads.length + apps.length + associates.length;

  return (
    <div
      id="global-search-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#121212]/40 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E8E6E1] overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-5 py-4 border-b border-[#E8E6E1] bg-[#FAF9F6]">
          <Search className="w-4 h-4 text-[#8C6D37] mr-3 shrink-0" />
          <input
            type="text"
            id="global-search-input"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search customer name, mobile, lead ID, application, or associate..."
            className="w-full bg-transparent border-none text-[#121212] placeholder-[#888888] text-sm focus:outline-hidden font-normal"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-[#888888] hover:text-[#121212] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block ml-2 px-2 py-0.5 sans-micro text-[8.5px] font-medium text-[#888888] bg-white border border-[#E8E6E1] rounded shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="py-8 text-center sans-micro text-xs text-[#888888]">
              Searching Capitabee database...
            </div>
          )}

          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="py-8 text-center sans-micro text-xs text-[#888888]">
              No records found matching "{query}".
            </div>
          )}

          {/* Leads */}
          {leads.length > 0 && (
            <div>
              <div className="flex items-center justify-between sans-micro text-[9px] text-[#888888] px-2 mb-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-[#8C6D37]" />
                  Leads ({leads.length})
                </span>
              </div>
              <div className="space-y-1">
                {leads.slice(0, 5).map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => {
                      onSelectLead(lead);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAF9F6] border border-transparent hover:border-[#E8E6E1] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="sans-micro text-[8.5px] text-[#888888]">{lead.id}</span>
                        <span className="serif-display text-sm font-normal text-[#121212]">{lead.customerName}</span>
                        <span className="sans-micro text-[8px] px-2 py-0.5 bg-[#FAF9F6] text-[#8C6D37] border border-[#E8E6E1] rounded-full">
                          {lead.leadStatus}
                        </span>
                      </div>
                      <div className="sans-micro text-[8.5px] text-[#888888] mt-1 flex gap-3">
                        <span>{lead.mobile}</span>
                        <span>•</span>
                        <span>{lead.loanType}</span>
                        <span>•</span>
                        <span className="font-semibold text-[#121212]">₹{Number(lead.requiredAmount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#888888]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Applications */}
          {apps.length > 0 && (
            <div>
              <div className="flex items-center justify-between sans-micro text-[9px] text-[#888888] px-2 mb-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <FileText className="w-3.5 h-3.5 text-[#2D7A70]" />
                  Loan Applications ({apps.length})
                </span>
              </div>
              <div className="space-y-1">
                {apps.slice(0, 5).map(app => (
                  <div
                    key={app.id}
                    onClick={() => {
                      onSelectApplication(app);
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#FAF9F6] border border-transparent hover:border-[#E8E6E1] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="sans-micro text-[8.5px] text-[#888888]">{app.id}</span>
                        <span className="serif-display text-sm font-normal text-[#121212]">{app.customerName}</span>
                        <span className="sans-micro text-[8px] px-2 py-0.5 bg-[#2D7A70]/10 text-[#2D7A70] border border-[#2D7A70]/20 rounded-full font-medium">
                          Stage {app.currentStage}: {app.currentStageName}
                        </span>
                      </div>
                      <div className="sans-micro text-[8.5px] text-[#888888] mt-1 flex gap-3">
                        <span>{app.customerPhone}</span>
                        <span>•</span>
                        <span>{app.loanType}</span>
                        <span>•</span>
                        <span className="font-semibold text-[#121212]">₹{Number(app.requestedAmount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#888888]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Associates (Admin Only) */}
          {associates.length > 0 && (
            <div>
              <div className="flex items-center justify-between sans-micro text-[9px] text-[#888888] px-2 mb-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-[#121212]" />
                  Associates ({associates.length})
                </span>
              </div>
              <div className="space-y-1">
                {associates.slice(0, 3).map(assoc => (
                  <div
                    key={assoc.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E8E6E1]"
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="sans-micro text-[8.5px] text-[#8C6D37]">{assoc.id}</span>
                        <span className="serif-display text-sm font-normal text-[#121212]">{assoc.name}</span>
                        <span className="sans-micro text-[8px] px-2 py-0.5 bg-[#FAF9F6] text-[#888888] border border-[#E8E6E1] rounded-full">
                          {assoc.status}
                        </span>
                      </div>
                      <div className="sans-micro text-[8.5px] text-[#888888] mt-1 flex gap-3">
                        <span>{assoc.email}</span>
                        <span>•</span>
                        <span>{assoc.mobile}</span>
                        <span>•</span>
                        <span>{assoc.department}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

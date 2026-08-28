/**
 * Capitabee Financial Services CRM - Regulatory Audit Logs View
 */

import React, { useState, useEffect } from 'react';
import { History, Search, Download, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({ limit: 500 });
      setLogs(res.logs || []);
    } catch (err: any) {
      console.error('Audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actorName.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.entityType.toLowerCase().includes(q) ||
      (l.entityId && l.entityId.toLowerCase().includes(q))
    );
  });

  return (
    <div id="audit-logs-view" className="space-y-5">
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-[#8C6D37]" />
            <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Compliance Audit Trail</h2>
          </div>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Cryptographically stamped transaction logs of user actions, logins, stage advances & document verifications
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search action, actor, entity ID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl focus:border-[#121212] outline-none"
          />
          <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-2.5" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card p-6">
        {loading ? (
          <div className="py-16 text-center sans-micro text-xs text-[#888888]">
            Loading audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center sans-micro text-xs text-[#888888]">
            No audit logs match current search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E8E6E1] sans-micro text-[9px] text-[#888888]">
                  <th className="py-3.5 px-4 font-medium">Timestamp</th>
                  <th className="py-3.5 px-4 font-medium">Actor</th>
                  <th className="py-3.5 px-4 font-medium">Action</th>
                  <th className="py-3.5 px-4 font-medium">Entity</th>
                  <th className="py-3.5 px-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1] text-xs">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap sans-micro text-[8.5px] text-[#888888]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="serif-display text-sm font-normal text-[#121212]">{log.actorName}</span>
                        <span className="sans-micro text-[8px] text-[#888888]">
                          {log.actorRole}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="sans-micro text-[9px] font-medium text-[#8C6D37]">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium text-[#121212]">{log.entityType}</span>
                        {log.entityId && (
                          <span className="sans-micro text-[8.5px] text-[#888888]">
                            ({log.entityId})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-md">
                      <p className="text-xs text-[#5A5854] break-words leading-relaxed">{log.details}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

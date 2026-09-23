/**
 * Capitabee Financial Services CRM - Regulatory Audit Logs & Employee Activity Monitor
 */

import React, { useState, useEffect } from 'react';
import { History, Search, Activity, Clock, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'audit' | 'activity'>('audit');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

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

  const loadActivities = async () => {
    setActivityLoading(true);
    try {
      const res = await api.getUserActivity();
      setActivities(res.activities || []);
    } catch (err: any) {
      console.error('User activity error:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    if (activeTab === 'activity') {
      loadActivities();
    }
  }, [activeTab]);

  // Unique actions list for filter
  const actionOptions = Array.from(new Set(logs.map(l => l.action))).sort();

  const filteredLogs = logs.filter(l => {
    if (actionFilter !== 'All' && l.action !== actionFilter) return false;
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

  const filteredActivities = activities.filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q) ||
      a.department?.toLowerCase().includes(q)
    );
  });

  const formatDuration = (mins: number) => {
    if (mins <= 0) return 'Just started';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div id="audit-logs-view" className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-[#8C6D37]" />
            <h2 className="serif-display text-2xl font-normal italic text-[#121212]">
              Compliance Audit & Activity Monitor
            </h2>
          </div>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Immutable regulatory audit trail and staff activity & session monitoring
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#FAF9F6] p-1 rounded-xl border border-[#E8E6E1]">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 sans-micro text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#121212] text-white font-medium shadow-xs'
                : 'text-[#888888] hover:text-[#121212]'
            }`}
          >
            Audit Trail ({logs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-3.5 py-1.5 sans-micro text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-[#121212] text-white font-medium shadow-xs'
                : 'text-[#888888] hover:text-[#121212]'
            }`}
          >
            Staff Sessions & Activity
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E8E6E1]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={activeTab === 'audit' ? 'Search actions, actors...' : 'Search staff by name, ID...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl focus:border-[#121212] outline-none"
            />
            <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-2" />
          </div>

          {activeTab === 'audit' && (
            <div className="flex items-center gap-2">
              <span className="sans-micro text-[9px] text-[#888888] uppercase">Action:</span>
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl focus:border-[#121212] outline-none"
              >
                <option value="All">All Actions ({logs.length})</option>
                {actionOptions.map(action => (
                  <option key={action} value={action}>
                    {action} ({logs.filter(l => l.action === action).length})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => (activeTab === 'audit' ? loadLogs() : loadActivities())}
          className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1.5 sans-micro text-[10px] uppercase tracking-wider text-[#5A5854] hover:text-[#121212] bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl hover:border-[#121212] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      {/* TAB 1: AUDIT TRAIL TABLE */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card p-6">
          {loading ? (
            <div className="py-16 text-center sans-micro text-xs text-[#888888]">
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center sans-micro text-xs text-[#888888]">
              No audit logs match current filter.
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
                        <span className="inline-block px-2 py-0.5 sans-micro text-[8.5px] font-semibold text-[#8C6D37] bg-[#B89758]/10 rounded border border-[#B89758]/20">
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
      )}

      {/* TAB 2: USER SESSIONS & ACTIVITY MONITOR */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card p-6">
          {activityLoading ? (
            <div className="py-16 text-center sans-micro text-xs text-[#888888]">
              Loading user session activities...
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-12 text-center sans-micro text-xs text-[#888888]">
              No active users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E8E6E1] sans-micro text-[9px] text-[#888888]">
                    <th className="py-3.5 px-4 font-medium">Staff Member</th>
                    <th className="py-3.5 px-4 font-medium">Role & Dept</th>
                    <th className="py-3.5 px-4 font-medium">Current Status</th>
                    <th className="py-3.5 px-4 font-medium">Session Duration</th>
                    <th className="py-3.5 px-4 font-medium">Last Login</th>
                    <th className="py-3.5 px-4 font-medium">Last Logout</th>
                    <th className="py-3.5 px-4 font-medium">Total Sessions</th>
                    <th className="py-3.5 px-4 font-medium">Recent Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E1] text-xs">
                  {filteredActivities.map(user => {
                    const isOnline = user.onlineStatus === 'Online';
                    return (
                      <tr key={user.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-[#121212] text-white flex items-center justify-center font-bold text-xs">
                                {user.name?.charAt(0) || 'U'}
                              </div>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-300'
                                }`}
                              />
                            </div>
                            <div>
                              <div className="serif-display text-sm font-medium text-[#121212]">{user.name}</div>
                              <div className="sans-micro text-[8.5px] text-[#888888]">{user.id} • {user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 sans-micro text-[8px] uppercase tracking-wider font-semibold bg-[#FAF9F6] border border-[#E8E6E1] rounded text-[#121212]">
                            {user.role}
                          </span>
                          <p className="sans-micro text-[8.5px] text-[#888888] mt-0.5">{user.department || 'Loan Operations'}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                              isOnline
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
                            {user.onlineStatus || 'Offline'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#121212]">
                          {isOnline ? (
                            <span className="text-emerald-700 font-semibold">{formatDuration(user.sessionDurationMinutes)}</span>
                          ) : (
                            <span className="text-[#888888]">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap sans-micro text-[8.5px] text-[#5A5854]">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap sans-micro text-[8.5px] text-[#888888]">
                          {user.lastLogout ? new Date(user.lastLogout).toLocaleString() : '—'}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-[#121212]">
                          {user.totalSessions || 1}
                        </td>

                        <td className="py-3.5 px-4 max-w-xs text-xs text-[#5A5854] truncate" title={user.lastAction}>
                          {user.lastAction || 'Active in system'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

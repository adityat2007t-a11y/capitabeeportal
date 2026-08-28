/**
 * Capitabee Financial Services CRM - Champions Leaderboard
 */

import React, { useState, useEffect } from 'react';
import { Trophy, Award, TrendingUp, Users, Medal, Star } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { api } from '../services/api';
import { User, Lead, Application } from '../types';

export const ChampionsBoardView: React.FC = () => {
  const [associates, setAssociates] = useState<User[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assocRes, appRes, leadRes] = await Promise.all([
          api.getAssociates(),
          api.getApplications({ limit: 1000 }),
          api.getLeads({ limit: 1000 }),
        ]);
        setAssociates(assocRes.associates || []);
        setApps(appRes.applications || []);
        setLeads(leadRes.leads || []);
      } catch (err: any) {
        console.error('Champions board error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Compute performance per associate
  const performanceList = associates.map(assoc => {
    const assocApps = apps.filter(a => a.assignedAssociateId === assoc.id);
    const assocLeads = leads.filter(l => l.assignedAssociateId === assoc.id);

    const totalSanction = assocApps.reduce((acc, a) => acc + (a.sanctionAmount || 0), 0);
    const totalDisbursed = assocApps.reduce((acc, a) => acc + (a.disbursementAmount || 0), 0);
    const convertedLeads = assocLeads.filter(
      l => l.leadStatus === 'Application In Progress' || l.leadStatus === 'Sanctioned' || l.leadStatus === 'Disbursed'
    ).length;

    const target = assoc.monthlyTarget || 2500000;
    const achievementPct = target > 0 ? Math.round((totalDisbursed / target) * 100) : 0;

    return {
      ...assoc,
      totalSanction,
      totalDisbursed,
      convertedLeads,
      totalAssignedLeads: assocLeads.length,
      achievementPct,
    };
  });

  // Sort by total disbursed descending
  performanceList.sort((a, b) => b.totalDisbursed - a.totalDisbursed);

  return (
    <div id="champions-board-view" className="space-y-5">
      {/* Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-[#8C6D37]" />
            <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Capitabee Champions Board</h2>
          </div>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Operational excellence, disbursement rankings, and conversion performance
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E6E1] artistic-card p-6">
        {loading ? (
          <div className="py-16 text-center sans-micro text-xs text-[#888888]">
            Calculating performance metrics...
          </div>
        ) : performanceList.length === 0 ? (
          <EmptyState
            title="No Associate accounts created yet."
            description="Add associate accounts in the Associates directory to begin tracking disbursements and team rankings."
            icon={Trophy}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {performanceList.slice(0, 3).map((champion, idx) => (
                <div
                  key={champion.id}
                  className={`p-5 rounded-2xl border relative overflow-hidden transition-all ${
                    idx === 0
                      ? 'bg-[#FAF9F6] border-[#121212] shadow-xs'
                      : idx === 1
                      ? 'bg-white border-[#E8E6E1]'
                      : 'bg-white border-[#E8E6E1]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="sans-micro text-[8.5px] font-medium tracking-[0.15em] uppercase text-[#8C6D37]">
                        Rank #{idx + 1}
                      </span>
                      <h4 className="serif-display text-lg font-normal text-[#121212] mt-1">
                        {champion.name}
                      </h4>
                      <p className="sans-micro text-[9.5px] text-[#888888] mt-0.5">{champion.department}</p>
                    </div>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs border ${
                        idx === 0
                          ? 'bg-[#121212] text-[#B89758] border-[#121212]'
                          : idx === 1
                          ? 'bg-white text-[#121212] border-[#E8E6E1]'
                          : 'bg-white text-[#888888] border-[#E8E6E1]'
                      }`}
                    >
                      {idx === 0 ? '1' : idx === 1 ? '2' : '3'}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E8E6E1] grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="sans-micro text-[8.5px] text-[#888888]">Disbursed:</span>
                      <p className="serif-display text-base font-normal text-[#121212] mt-0.5">
                        ₹{(champion.totalDisbursed / 100000).toFixed(1)}L
                      </p>
                    </div>
                    <div>
                      <span className="sans-micro text-[8.5px] text-[#888888]">Target Hit:</span>
                      <p className="serif-display text-base font-normal text-[#2D7A70] mt-0.5">
                        {champion.achievementPct}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Complete Ranking Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E8E6E1] sans-micro text-[9px] text-[#888888]">
                    <th className="py-3.5 px-4 font-medium">Rank & Associate</th>
                    <th className="py-3.5 px-4 font-medium">Department</th>
                    <th className="py-3.5 px-4 font-medium">Disbursed Volume</th>
                    <th className="py-3.5 px-4 font-medium">Sanctioned Volume</th>
                    <th className="py-3.5 px-4 font-medium">Leads Converted</th>
                    <th className="py-3.5 px-4 font-medium">Target Achievement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E1] text-xs">
                  {performanceList.map((assoc, i) => (
                    <tr key={assoc.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <span className="sans-micro text-[9.5px] font-medium text-[#888888] w-5">#{i + 1}</span>
                          <div className="flex flex-col">
                            <span className="serif-display text-sm font-normal text-[#121212]">{assoc.name}</span>
                            <span className="sans-micro text-[8.5px] text-[#888888]">{assoc.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[#888888]">{assoc.department}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-[#121212]">
                          ₹{assoc.totalDisbursed.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="sans-micro text-[9.5px] font-medium text-[#2D7A70]">
                          ₹{assoc.totalSanction.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-[#121212]">
                          {assoc.convertedLeads} / {assoc.totalAssignedLeads}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="sans-micro text-[9.5px] font-medium text-[#121212]">{assoc.achievementPct}%</span>
                          <div className="w-20 bg-[#FAF9F6] h-1.5 rounded-full overflow-hidden border border-[#E8E6E1]">
                            <div
                              className="bg-[#121212] h-full rounded-full"
                              style={{ width: `${Math.min(100, assoc.achievementPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

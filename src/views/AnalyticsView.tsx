/**
 * Capitabee Financial Services CRM - Marketing & Loan Analytics
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, PieChart, BarChart3, Globe, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { LEAD_SOURCES } from '../config/brand';

export const AnalyticsView: React.FC = () => {
  const [sourceData, setSourceData] = useState<Record<string, number>>({});
  const [productData, setProductData] = useState<Record<string, number>>({});
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.getLeads({ limit: 1000 });
        const leads = res.leads || [];
        setTotalLeads(leads.length);

        const sMap: Record<string, number> = {};
        const pMap: Record<string, number> = {};

        leads.forEach(l => {
          sMap[l.leadSource] = (sMap[l.leadSource] || 0) + 1;
          pMap[l.loanType] = (pMap[l.loanType] || 0) + 1;
        });

        setSourceData(sMap);
        setProductData(pMap);
      } catch (err: any) {
        console.error('Analytics error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  return (
    <div id="marketing-analytics-view" className="space-y-5">
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Campaign & Origination Analytics</h2>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Channel attribution, lead source conversions, and loan product demand distribution
          </p>
        </div>
      </div>

      {/* External Analytics Integration Warning */}
      <div className="p-4 bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl flex items-start gap-3.5">
        <AlertCircle className="w-5 h-5 text-[#8C6D37] shrink-0 mt-0.5" />
        <div className="text-xs text-[#121212] space-y-1">
          <p className="sans-micro text-[10px] font-semibold tracking-wider uppercase text-[#121212]">External Tracking Service Integration:</p>
          <p className="text-[#666666] leading-relaxed">
            Analytics service is not connected yet. Connect Google Analytics 4 Measurement ID and Meta Pixel Access Token to sync live ad-spend ROI, CPC, and customer acquisition costs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card space-y-4">
          <div>
            <h3 className="serif-display text-base font-normal italic text-[#121212]">Inquiry Volume by Lead Channel</h3>
            <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">Origin channels across web, social media, and direct referrals</p>
          </div>

          {totalLeads === 0 ? (
            <p className="sans-micro text-xs text-[#888888] py-8 text-center">No lead data recorded yet.</p>
          ) : (
            <div className="space-y-3.5">
              {LEAD_SOURCES.map(source => {
                const count = sourceData[source] || 0;
                const pct = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;

                return (
                  <div key={source} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#121212]">{source}</span>
                      <span className="sans-micro text-[9px] text-[#888888]">
                        {count} leads ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#FAF9F6] h-1.5 rounded-full overflow-hidden border border-[#E8E6E1]">
                      <div
                        className="bg-[#121212] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Loan Product Demand */}
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card space-y-4">
          <div>
            <h3 className="serif-display text-base font-normal italic text-[#121212]">Borrower Demand by Loan Product</h3>
            <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.14em]">Distribution across retail, MSME, and commercial mortgage</p>
          </div>

          {totalLeads === 0 ? (
            <p className="sans-micro text-xs text-[#888888] py-8 text-center">No lead data recorded yet.</p>
          ) : (
            <div className="space-y-3.5">
              {Object.entries(productData).map(([prod, count]) => {
                const numericCount = Number(count) || 0;
                const pct = totalLeads > 0 ? Math.round((numericCount / totalLeads) * 100) : 0;

                return (
                  <div key={prod} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#121212]">{prod}</span>
                      <span className="sans-micro text-[9px] text-[#888888]">
                        {count} cases ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#FAF9F6] h-1.5 rounded-full overflow-hidden border border-[#E8E6E1]">
                      <div
                        className="bg-[#2D7A70] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

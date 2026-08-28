/**
 * Capitabee Financial Services - KPI Stat Card
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badgeText?: string;
  badgeType?: 'success' | 'warning' | 'neutral' | 'unconnected';
  onClick?: () => void;
  accentColor?: 'navy' | 'gold' | 'teal' | 'rose' | 'amber';
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeType = 'neutral',
  onClick,
  accentColor = 'navy',
}) => {
  const iconColors = {
    navy: 'bg-[#121212]/5 text-[#121212] border-[#121212]/20',
    gold: 'bg-[#B89758]/10 text-[#8C6D37] border-[#B89758]/30',
    teal: 'bg-[#2D7A70]/10 text-[#2D7A70] border-[#2D7A70]/30',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
  };

  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-[#FAF5EB] text-[#8C6D37] border-[#EBE5DA]',
    neutral: 'bg-[#F2F1ED] text-[#5A5854] border-[#E8E6E1]',
    unconnected: 'bg-[#FAF5EB] text-[#8C6D37] border-[#B89758]/40 font-medium',
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative artistic-card p-5 rounded-xl border border-[#E8E6E1] bg-white transition-all ${
        onClick ? 'cursor-pointer hover:border-[#121212] hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <p className="sans-micro text-[10px] text-[#888888] truncate font-medium">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="serif-display text-3xl font-normal tracking-tight text-[#121212]">
              {value}
            </span>
          </div>
          {subtitle && (
            <p className="mt-1.5 text-xs text-[#5A5854] line-clamp-1 font-light">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${iconColors[accentColor]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {badgeText && (
        <div className="mt-3 pt-3 border-t border-[#E8E6E1]/60 flex items-center justify-between">
          <span className={`sans-micro inline-flex items-center text-[9px] px-2.5 py-0.5 rounded-full border ${badgeStyles[badgeType]}`}>
            {badgeText}
          </span>
        </div>
      )}
    </div>
  );
};

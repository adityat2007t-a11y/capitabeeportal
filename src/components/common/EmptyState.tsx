/**
 * Capitabee Financial Services - Professional Empty State Component
 */

import React from 'react';
import { LucideIcon, FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  id?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  id = 'crm-empty-state',
  title,
  description,
  icon: Icon = FileQuestion,
  actionText,
  onAction,
}) => {
  return (
    <div
      id={id}
      className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-dashed border-[#E8E1D5] my-4"
    >
      <div className="w-12 h-12 rounded-full bg-[#FBF7EE] border border-[#E8E1D5] flex items-center justify-center text-[#B98520] mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-[#173B5E]">{title}</h4>
      {description && (
        <p className="mt-1 text-sm text-[#617083] max-w-sm">{description}</p>
      )}
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-[#173B5E] text-white hover:bg-[#244C70] transition-colors shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

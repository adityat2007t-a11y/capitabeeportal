/**
 * Capitabee Financial Services - Reusable Modal Dialogue
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  id,
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div
      id={id}
      className="fixed inset-0 z-50 overflow-y-auto bg-[#121212]/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-white rounded-2xl shadow-2xl border border-[#E8E6E1] overflow-hidden my-8`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#E8E6E1] bg-[#FAF9F6]">
          <div>
            <h3 className="serif-display text-xl font-normal italic text-[#121212]">{title}</h3>
            {subtitle && <p className="sans-micro text-[9.5px] text-[#888888] tracking-[0.16em] mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            id={`${id}-close-button`}
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#121212]/15 flex items-center justify-center text-[#5A5854] hover:text-white hover:bg-[#121212] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

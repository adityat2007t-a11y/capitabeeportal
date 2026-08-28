/**
 * Capitabee Financial Services CRM - Top Navigation Bar
 */

import React from 'react';
import {
  Menu,
  Search,
  PlusCircle,
  Bell,
  LogOut,
  UserCheck,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CapitabeeLogo } from '../common/CapitabeeLogo';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenSearch: () => void;
  onQuickAddLead?: () => void;
  onOpenNewLead?: () => void;
  onQuickAddApplication?: () => void;
  onOpenNewApp?: () => void;
  onQuickAddAssociate?: () => void;
  onNavigate: (viewId: string) => void;
  currentView?: string;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenSearch,
  onQuickAddLead,
  onOpenNewLead,
  onQuickAddApplication,
  onOpenNewApp,
  onQuickAddAssociate,
  onNavigate,
  currentView,
  unreadCount,
}) => {
  const { user, role, logout } = useAuth();
  const handleAddLead = onOpenNewLead || onQuickAddLead;
  const handleAddApp = onOpenNewApp || onQuickAddApplication;

  return (
    <header
      id="crm-top-navbar"
      className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-[#E8E6E1] lg:ml-64 transition-colors"
    >
      {/* Left side: Hamburger & Global search */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="toggle-sidebar-button"
          onClick={onToggleSidebar}
          className="p-2 text-[#5A5854] hover:text-[#121212] hover:bg-[#F2F1ED] rounded-lg transition-colors lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile brand emblem */}
        <div className="lg:hidden flex items-center">
          <CapitabeeLogo size="xs" showTagline={false} />
        </div>

        {/* Global Search Button */}
        <button
          type="button"
          id="global-search-trigger"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs text-[#888888] bg-white border border-[#E8E6E1] rounded-full hover:border-[#121212] hover:text-[#121212] transition-all w-44 sm:w-72 justify-between shadow-2xs"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-[#B89758]" />
            <span className="truncate text-xs">Search leads, loans, IDs...</span>
          </div>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-medium tracking-wider text-[#888888] bg-[#F2F1ED] border border-[#E8E6E1] rounded-full">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right side: Quick actions & user menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action: New Lead */}
        <button
          type="button"
          id="quick-add-lead-btn"
          onClick={handleAddLead}
          className="flex items-center gap-2 px-4 py-1.5 text-[11px] font-medium tracking-[0.14em] uppercase text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#B89758]" />
          <span className="hidden sm:inline">Add Lead</span>
          <span className="sm:hidden">Lead</span>
        </button>

        {/* Quick Action: New Application */}
        <button
          type="button"
          id="quick-add-app-btn"
          onClick={handleAddApp}
          className="hidden md:flex items-center gap-2 px-4 py-1.5 text-[11px] font-medium tracking-[0.14em] uppercase text-[#121212] bg-white border border-[#E8E6E1] hover:border-[#121212] rounded-full transition-colors shadow-2xs cursor-pointer"
        >
          <Building2 className="w-3.5 h-3.5 text-[#2D7A70]" />
          <span>New Application</span>
        </button>

        {/* Admin Quick Action: Create Associate */}
        {role === 'ADMIN' && onQuickAddAssociate && (
          <button
            type="button"
            id="quick-add-associate-btn"
            onClick={onQuickAddAssociate}
            className="hidden xl:flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-medium tracking-[0.12em] uppercase text-[#8C6D37] bg-[#FAF5EB] border border-[#EBE5DA] hover:border-[#B89758] rounded-full transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>+ Associate</span>
          </button>
        )}

        {/* Notifications Icon */}
        <button
          type="button"
          id="navbar-notifications-btn"
          onClick={() => onNavigate(role === 'ADMIN' ? 'notifications' : 'associate-notifications')}
          className="relative p-2 text-[#5A5854] hover:text-[#121212] hover:bg-[#F2F1ED] rounded-full transition-colors cursor-pointer"
          title="Notification Center"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#B89758]" />
        </button>

        <div className="h-5 w-px bg-[#E8E6E1]" />

        {/* User Identity Pill */}
        <div className="flex items-center gap-2 pl-1">
          <div className="w-8 h-8 rounded-full bg-[#121212] text-[#FAF9F6] font-semibold text-xs flex items-center justify-center border border-[#B89758]/50 shrink-0 shadow-2xs">
            {role === 'ADMIN' ? 'AD' : user?.name.slice(0, 2).toUpperCase() || 'CB'}
          </div>

          <div className="hidden lg:flex flex-col text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#121212] truncate max-w-[130px]">
                {user?.name}
              </span>
              {role === 'ADMIN' ? (
                <ShieldCheck className="w-3.5 h-3.5 text-[#B89758]" title="Administrator" />
              ) : (
                <span className="text-[10px] font-mono text-[#888888]">({user?.id})</span>
              )}
            </div>
            <span className="sans-micro text-[9px] text-[#2D7A70] flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2D7A70] animate-pulse" />
              Online
            </span>
          </div>

          {/* Logout button */}
          <button
            type="button"
            id="navbar-logout-btn"
            onClick={logout}
            className="p-2 text-[#888888] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors ml-1 cursor-pointer"
            title="Secure Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

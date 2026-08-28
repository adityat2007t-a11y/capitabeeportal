/**
 * Capitabee Financial Services CRM - Sidebar Navigation
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileSpreadsheet,
  Clock,
  Files,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Trophy,
  Bell,
  Settings,
  History,
  LogOut,
  UserCheck,
  X,
} from 'lucide-react';
import { CapitabeeLogo } from '../common/CapitabeeLogo';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (viewId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpen = false,
  onClose = () => {},
}) => {
  const { role, user, logout } = useAuth();

  const adminNavItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin-leads', label: 'Leads CRM', icon: Users },
    { id: 'admin-applications', label: 'Applications (12-Stage)', icon: Briefcase },
    { id: 'admin-associates', label: 'Associates', icon: UserCheck },
    { id: 'admin-followups', label: 'Follow-ups', icon: Clock },
    { id: 'admin-documents', label: 'Documents', icon: Files },
    { id: 'admin-cibil', label: 'CIBIL Bureau', icon: ShieldAlert },
    { id: 'admin-champions', label: 'Champions Board', icon: Trophy },
    { id: 'admin-reports', label: 'Reporting Center', icon: FileSpreadsheet },
    { id: 'admin-analytics', label: 'Marketing Analytics', icon: TrendingUp },
    { id: 'admin-settings', label: 'Control Center', icon: Settings },
    { id: 'admin-audit', label: 'Audit Logs', icon: History },
  ];

  const associateNavItems = [
    { id: 'associate-dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'associate-leads', label: 'My Leads', icon: Users },
    { id: 'associate-applications', label: 'My Applications', icon: Briefcase },
    { id: 'associate-followups', label: "Today's Follow-ups", icon: Clock },
    { id: 'associate-documents', label: 'Assigned Documents', icon: Files },
    { id: 'associate-cibil', label: 'CIBIL Check', icon: ShieldAlert },
    { id: 'associate-champions', label: 'Champions Board', icon: Trophy },
    { id: 'associate-settings', label: 'Profile & Settings', icon: Settings },
  ];

  const navItems = role === 'ADMIN' ? adminNavItems : associateNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#121212]/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="crm-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#FAF9F6] border-r border-[#E8E6E1] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding Section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#E8E6E1] bg-[#FAF9F6]">
          <CapitabeeLogo size="sm" showTagline={true} />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-[#121212] hover:bg-[#F2F1ED] rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge Banner */}
        <div className="px-5 py-2.5 bg-[#F2F1ED] border-b border-[#E8E6E1] flex items-center justify-between">
          <span className="sans-micro text-[9px] text-[#5A5854]">
            {role === 'ADMIN' ? 'ARCHIVE • ADMIN' : 'WORKSPACE • ASSOCIATE'}
          </span>
          <span
            className={`sans-micro text-[9px] px-2.5 py-0.5 rounded-full border ${
              role === 'ADMIN'
                ? 'bg-[#121212] text-white border-[#121212]'
                : 'bg-white text-[#8C6D37] border-[#B89758]/50'
            }`}
          >
            {role === 'ADMIN' ? 'Super Admin' : user?.id || 'Associate'}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" id="sidebar-navigation">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const itemNumber = (idx + 1).toString().padStart(2, '0');
            return (
              <button
                key={item.id}
                type="button"
                id={`sidebar-link-${item.id}`}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs tracking-wide transition-all text-left group cursor-pointer ${
                  isActive
                    ? 'bg-[#121212] text-white shadow-2xs'
                    : 'text-[#5A5854] hover:text-[#121212] hover:bg-[#F2F1ED]'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                      isActive ? 'text-[#B89758]' : 'text-[#888888] group-hover:text-[#121212]'
                    }`}
                  />
                  <span className={`truncate text-xs ${isActive ? 'font-medium' : 'font-normal'}`}>
                    {item.label}
                  </span>
                </div>
                <span
                  className={`sans-micro text-[8px] shrink-0 opacity-40 group-hover:opacity-75 ${
                    isActive ? 'text-[#B89758] opacity-90' : 'text-[#888888]'
                  }`}
                >
                  {itemNumber}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User / Session Section */}
        <div className="p-3 border-t border-[#E8E6E1] bg-[#FAF9F6]">
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <div className="truncate">
              <p className="text-xs font-semibold text-[#121212] truncate">{user?.name}</p>
              <p className="sans-micro text-[8.5px] text-[#888888] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            id="sidebar-logout-btn"
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-[#121212] hover:bg-[#121212] hover:text-white rounded-lg border border-[#E8E6E1] transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="sans-micro text-[10px]">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

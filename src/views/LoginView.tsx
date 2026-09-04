/**
 * Capitabee Financial Services CRM - Internal CRM Login Screen
 * Roles: Admin, Associate, Channel Partner (Customer Portal is on the main website)
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Building2,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { CapitabeeLogo } from '../components/common/CapitabeeLogo';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { BRAND } from '../config/brand';

type CrmRole = 'ADMIN' | 'ASSOCIATE' | 'PARTNER';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<CrmRole>('ADMIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleToggle = (role: CrmRole) => {
    setSelectedRole(role);
    setError(null);
    setIdentifier('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(identifier.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="crm-login-view"
      className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Background Architectural Geometry */}
      <div className="absolute -top-20 -left-20 w-96 h-[480px] bg-[#E8E6E1]/50 rounded-3xl -rotate-6 pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full bg-[#F2F1ED]/70 pointer-events-none -z-10" />

      {/* Vertical archival text indicator */}
      <div className="hidden lg:flex absolute left-8 bottom-16 vertical-text flex-col items-center gap-3 text-[#888888]">
        <span className="sans-micro text-[9px]">Est. 2021</span>
        <div className="w-[1px] h-20 bg-[#E8E6E1]" />
        <span className="sans-micro text-[9px]">Capitabee Financial</span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="flex justify-center mb-5">
          <CapitabeeLogo size="lg" showTagline={true} />
        </div>
        <h2 className="serif-display text-3xl font-normal italic text-[#121212] tracking-tight">
          Financial Management Portal
        </h2>
        <p className="sans-micro mt-2 text-[10px] text-[#888888] tracking-[0.18em] uppercase">
          Internal CRM & 12-Stage Loan Tracking Engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-[#E8E6E1]">
          {/* 3 CRM Role Selector Tabs: ADMIN | ASSOCIATE | PARTNER */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#F2F1ED] rounded-xl border border-[#E8E6E1] mb-6">
            <button
              type="button"
              id="role-tab-admin"
              onClick={() => handleRoleToggle('ADMIN')}
              className={`py-2 px-2 text-[10px] font-medium tracking-wider uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRole === 'ADMIN'
                  ? 'bg-[#121212] text-white shadow-2xs'
                  : 'text-[#5A5854] hover:text-[#121212]'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${selectedRole === 'ADMIN' ? 'text-[#B89758]' : ''}`} />
              <span className="sans-micro text-[9.5px]">Admin</span>
            </button>

            <button
              type="button"
              id="role-tab-associate"
              onClick={() => handleRoleToggle('ASSOCIATE')}
              className={`py-2 px-2 text-[10px] font-medium tracking-wider uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRole === 'ASSOCIATE'
                  ? 'bg-[#121212] text-white shadow-2xs'
                  : 'text-[#5A5854] hover:text-[#121212]'
              }`}
            >
              <UserCheck className={`w-3.5 h-3.5 ${selectedRole === 'ASSOCIATE' ? 'text-[#B89758]' : ''}`} />
              <span className="sans-micro text-[9.5px]">Associate</span>
            </button>

            <button
              type="button"
              id="role-tab-partner"
              onClick={() => handleRoleToggle('PARTNER')}
              className={`py-2 px-2 text-[10px] font-medium tracking-wider uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                selectedRole === 'PARTNER'
                  ? 'bg-[#121212] text-white shadow-2xs'
                  : 'text-[#5A5854] hover:text-[#121212]'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${selectedRole === 'PARTNER' ? 'text-[#B89758]' : ''}`} />
              <span className="sans-micro text-[9.5px]">Partner</span>
            </button>
          </div>

          {error && (
            <div
              id="login-error-alert"
              className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-identifier"
                className="sans-micro block text-[10px] text-[#5A5854] mb-1.5 font-medium"
              >
                {selectedRole === 'ADMIN'
                  ? 'Admin Email / Mobile'
                  : selectedRole === 'PARTNER'
                  ? 'Partner CB-ID / Email / Mobile'
                  : 'Associate ID (e.g. CB-XXXX) or Email'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#888888]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Enter email, CB-ID, or phone number"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-[#E8E6E1] rounded-lg focus:outline-hidden focus:border-[#121212] transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="sans-micro block text-[10px] text-[#5A5854] mb-1.5 font-medium"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#888888]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-[#E8E6E1] rounded-lg focus:outline-hidden focus:border-[#121212] transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#5A5854] text-xs">
                Portal: <strong className="text-[#121212] font-medium">{selectedRole}</strong>
              </span>
              <span className="sans-micro text-[9px] text-[#B89758]">Secured Gateway Auth</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              id="login-submit-btn"
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 sans-micro text-[10.5px] font-semibold text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs disabled:opacity-60 mt-3 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : `Enter ${selectedRole} Workspace`}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#B89758]" />
            </button>
          </form>

          {/* Secure Access Notice */}
          <div className="mt-6 pt-4 border-t border-[#E8E6E1] text-[11px] text-[#5A5854] space-y-1 bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E8E6E1]/60">
            <p className="sans-micro text-[9.5px] font-semibold text-[#121212]">Authorized Access Only</p>
            <p className="text-[10.5px] text-[#76746F]">
              Please log in with your assigned Capitabee credentials. If you require access or password assistance, contact your system administrator.
            </p>
            <div className="pt-2 text-[10px] text-[#888888] border-t border-[#E8E6E1]/50">
              <em>Customer portal login is accessible directly from the public website.</em>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center sans-micro text-[9.5px] text-[#888888] tracking-[0.16em]">
          © {new Date().getFullYear()} Capitabee Financial Services • Internal CRM Portal
        </p>
      </div>
    </div>
  );
};

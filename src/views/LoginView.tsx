/**
 * Capitabee Financial Services CRM - Login Screen
 */

import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { CapitabeeLogo } from '../components/common/CapitabeeLogo';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { BRAND } from '../config/brand';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [identifier, setIdentifier] = useState(BRAND.initialAdminEmail);
  const [password, setPassword] = useState('8010886625');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleToggle = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    if (role === 'ADMIN') {
      setIdentifier(BRAND.initialAdminEmail);
      setPassword('8010886625');
    } else {
      setIdentifier('');
      setPassword('');
    }
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
      {/* Background Architectural Geometry from Artistic Flair */}
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
        <p className="sans-micro mt-2 text-[10px] text-[#888888] tracking-[0.18em]">
          Internal CRM & 12-Stage Loan Tracking Engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-[#E8E6E1]">
          {/* Role Selector Tabs */}
          <div className="flex p-1 bg-[#F2F1ED] rounded-xl border border-[#E8E6E1] mb-6">
            <button
              type="button"
              id="role-tab-admin"
              onClick={() => handleRoleToggle('ADMIN')}
              className={`flex-1 py-2 px-3 text-[11px] font-medium tracking-wider uppercase rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                selectedRole === 'ADMIN'
                  ? 'bg-[#121212] text-white shadow-2xs'
                  : 'text-[#5A5854] hover:text-[#121212]'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${selectedRole === 'ADMIN' ? 'text-[#B89758]' : ''}`} />
              <span className="sans-micro text-[9.5px]">Admin Portal</span>
            </button>

            <button
              type="button"
              id="role-tab-associate"
              onClick={() => handleRoleToggle('ASSOCIATE')}
              className={`flex-1 py-2 px-3 text-[11px] font-medium tracking-wider uppercase rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                selectedRole === 'ASSOCIATE'
                  ? 'bg-[#121212] text-white shadow-2xs'
                  : 'text-[#5A5854] hover:text-[#121212]'
              }`}
            >
              <UserCheck className={`w-3.5 h-3.5 ${selectedRole === 'ASSOCIATE' ? 'text-[#B89758]' : ''}`} />
              <span className="sans-micro text-[9.5px]">Associate Portal</span>
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
                {selectedRole === 'ADMIN' ? 'Admin Email / Identity' : 'Associate ID (e.g. CB-XXXX) or Email'}
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
                  placeholder={
                    selectedRole === 'ADMIN' ? 'admin@capitabee.com' : 'e.g. CB-1001 or email'
                  }
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
                Role: <strong className="text-[#121212] font-medium">{selectedRole}</strong>
              </span>
              <span className="sans-micro text-[9px] text-[#B89758]">Secured Credential Auth</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              id="login-submit-btn"
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 sans-micro text-[10.5px] font-semibold text-white bg-[#121212] hover:bg-[#262626] border border-[#121212] rounded-full transition-all shadow-2xs disabled:opacity-60 mt-3 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : `Enter ${selectedRole === 'ADMIN' ? 'Admin Portal' : 'Associate Workspace'}`}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#B89758]" />
            </button>
          </form>

          {/* Quick Notice for default access */}
          <div className="mt-6 pt-4 border-t border-[#E8E6E1] text-[11px] text-[#5A5854] space-y-1.5 bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E8E6E1]/60">
            <p className="sans-micro text-[9px] font-semibold text-[#121212]">Primary System Identity:</p>
            <p className="text-xs">
              • <strong>Admin:</strong> <code className="text-[#121212] font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-[#E8E6E1]">{BRAND.initialAdminEmail}</code>
            </p>
            <p className="text-xs">
              • <strong>Associate:</strong> Admin can create new staff in <em>Associates</em> section to assign CB-XXXX IDs.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center sans-micro text-[9.5px] text-[#888888] tracking-[0.16em]">
          © {new Date().getFullYear()} Capitabee Financial Services • Internal Archive
        </p>
      </div>
    </div>
  );
};

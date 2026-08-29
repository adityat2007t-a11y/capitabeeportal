/**
 * Capitabee Financial Services CRM - Control Center & Settings
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Sliders,
  ShieldCheck,
  Globe,
  MessageSquare,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import {
  INITIAL_LOAN_PRODUCTS,
  LENDING_PARTNERS,
  COMPANY_INFO,
} from '../config/brand';
import { CapitabeeLogo } from '../components/common/CapitabeeLogo';
import { api } from '../services/api';
import { WHATSAPP_CONFIG, getCapitabeeWhatsAppUrl } from '../config/whatsappTemplates';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'company' | 'products' | 'lenders' | 'integrations'>('company');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedWaWebhook, setCopiedWaWebhook] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);

  const webhookUrl = `${window.location.origin}/api/leads/webhook`;
  const waWebhookUrl = `${window.location.origin}/api/whatsapp/webhook`;

  useEffect(() => {
    if (activeTab === 'integrations') {
      api.getIntegrationsStatus()
        .then(res => setIntegrationStatus(res.integrations))
        .catch(err => console.error('Failed to load integrations status:', err));
    }
  }, [activeTab]);

  const copyToClipboard = (url: string, type: 'leads' | 'wa') => {
    navigator.clipboard.writeText(url);
    if (type === 'leads') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    } else {
      setCopiedWaWebhook(true);
      setTimeout(() => setCopiedWaWebhook(false), 2500);
    }
  };

  return (
    <div id="settings-view" className="space-y-5">
      <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="serif-display text-2xl font-normal italic text-[#121212]">Control Center & Configurations</h2>
          <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-1">
            Enterprise products catalog, lending networks, and integration endpoints
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1] text-xs">
          {(['company', 'products', 'lenders', 'integrations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg capitalize sans-micro text-[9px] transition-all ${
                activeTab === tab
                  ? 'bg-[#121212] text-white shadow-2xs font-semibold'
                  : 'text-[#888888] hover:text-[#121212]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Company Profile */}
      {activeTab === 'company' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E6E1]">
            <div>
              <h3 className="serif-display text-lg font-normal text-[#121212]">Company Profile & Legal Details</h3>
              <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-0.5">
                Official Registered Identity & Brand Assets
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#0A1224] border border-[#1E293B] inline-flex items-center">
              <CapitabeeLogo size="md" theme="dark" showTagline={true} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <span className="sans-micro text-[8.5px] text-[#888888]">Entity Legal Name:</span>
              <p className="serif-display text-base font-normal text-[#121212] mt-1">{COMPANY_INFO.companyName}</p>
              <p className="sans-micro text-[9px] text-[#888888] mt-1">{COMPANY_INFO.tagline}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <span className="sans-micro text-[8.5px] text-[#888888]">Registered Headquarters:</span>
              <p className="text-sm font-medium text-[#121212] mt-1">{COMPANY_INFO.officeAddress}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <span className="sans-micro text-[8.5px] text-[#888888]">Corporate Support Email:</span>
              <p className="text-sm font-medium text-[#121212] mt-1">{COMPANY_INFO.email}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1]">
              <span className="sans-micro text-[8.5px] text-[#888888]">Contact Telephone:</span>
              <p className="text-sm font-medium text-[#121212] mt-1">{COMPANY_INFO.phone}</p>
            </div>
          </div>

          {/* Official Brand Identity Card */}
          <div className="mt-4 p-5 rounded-2xl bg-gradient-to-r from-[#0A1224] via-[#0D182E] to-[#0A1224] border border-[#1E2B45] text-white flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-[#1E293B] shadow-md bg-[#080E1D] flex items-center justify-center p-1 overflow-hidden shrink-0">
                <CapitabeeLogo size="sm" variant="mark" />
              </div>
              <div>
                <span className="sans-micro text-[9px] text-[#FB923C] tracking-[0.2em] font-semibold">
                  OFFICIAL BRAND MARK
                </span>
                <h4 className="text-base font-extrabold tracking-wide text-white mt-0.5">
                  CAPITA BEE FINANCIAL SERVICES
                </h4>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  House Roof with Chimney Silhouette • Azure Crescent 'C' & Vibrant Orange 'B' Monogram
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#080E1D] border border-[#1E293B]">
                <CapitabeeLogo size="md" variant="badge" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Loan Products */}
      {activeTab === 'products' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="serif-display text-lg font-normal text-[#121212]">Loan Product Suite</h3>
            <span className="sans-micro text-[9px] text-[#888888]">{INITIAL_LOAN_PRODUCTS.length} Standard Products</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {INITIAL_LOAN_PRODUCTS.map(p => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6]/60 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <h4 className="serif-display text-base font-normal text-[#121212]">{p.name}</h4>
                  <span className="sans-micro text-[8.5px] font-medium px-2 py-0.5 rounded-full bg-[#2D7A70]/10 text-[#2D7A70] border border-[#2D7A70]/20">
                    {p.ratePerAnnum}
                  </span>
                </div>
                <p className="text-xs text-[#5A5854] leading-relaxed">{p.description}</p>
                <div className="pt-2.5 border-t border-[#E8E6E1] flex items-center justify-between sans-micro text-[8.5px] text-[#888888]">
                  <span>Tenure: {p.tenureRange || '1 - 20 Yrs'}</span>
                  <span>Cap: {p.maxAmount || 'Up to 25 Cr'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Lending Partners */}
      {activeTab === 'lenders' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="serif-display text-lg font-normal text-[#121212]">Lending Partners & Banking Network</h3>
            <span className="sans-micro text-[9px] text-[#888888]">{LENDING_PARTNERS.length} Approved Partners</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LENDING_PARTNERS.map(l => (
              <div
                key={l.name}
                className="p-3.5 rounded-xl border border-[#E8E6E1] bg-white flex items-center justify-between"
              >
                <div>
                  <h4 className="serif-display text-sm font-normal text-[#121212]">{l.name}</h4>
                  <span className="sans-micro text-[8px] text-[#8C6D37]">{l.type}</span>
                </div>
                <span className="sans-micro text-[8.5px] px-2 py-0.5 bg-[#FAF9F6] text-[#121212] border border-[#E8E6E1] rounded-md">
                  {l.tatDays || '3-7 Days'} TAT
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Integrations */}
      {activeTab === 'integrations' && (
        <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] artistic-card space-y-6">
          <div>
            <h3 className="serif-display text-lg font-normal text-[#121212]">API & Webhook Gateway Connectors</h3>
            <p className="sans-micro text-[10px] text-[#888888] tracking-[0.16em] mt-0.5">
              Configuration endpoints for incoming leads and external credit service providers
            </p>
          </div>

          {/* Shared Supabase Database Connector */}
          <div className="p-5 rounded-xl border border-[#E8E6E1] bg-white space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#B89758]" />
                  <h4 className="serif-display text-base font-normal text-[#121212]">
                    Shared Supabase Database Project
                  </h4>
                </div>
                <p className="text-xs text-[#5A5854] mt-1">
                  Unified PostgreSQL database shared between the Capitabee public website and this Employee CRM portal.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 sans-micro text-[9px]">
                  <span className="text-[#888888]">Project URL:</span>
                  <code className="px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E8E6E1] text-[#121212] font-mono">
                    https://fvpnergqltezjbgbtwtv.supabase.co
                  </code>
                </div>
              </div>

              <div>
                {integrationStatus?.supabase?.status?.includes('CONNECTED') ? (
                  <span className="sans-micro text-[9px] font-semibold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>CONNECTED TO SUPABASE</span>
                  </span>
                ) : (
                  <span className="sans-micro text-[9px] font-semibold px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{integrationStatus?.supabase?.status || 'AWAITING ANON KEY'}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="sans-micro text-[9px] font-semibold text-[#121212] tracking-wider uppercase">
                  Connection Details & Synchronized Entities
                </span>
                <span className="sans-micro text-[8.5px] text-[#888888]">
                  Status: {integrationStatus?.supabase?.message || 'Configured via VITE_SUPABASE_ANON_KEY'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {[
                  { name: 'Admin & Associates', key: 'profiles' },
                  { name: 'Leads & Inquiries', key: 'leads' },
                  { name: 'Customer Records', key: 'customers' },
                  { name: '12-Stage Applications', key: 'applications' },
                  { name: 'Stage Updates Log', key: 'stage_updates' },
                  { name: 'KYC & Loan Documents', key: 'documents' },
                  { name: 'WhatsApp & SMS Logs', key: 'notifications' },
                  { name: 'Reviews & Feedback', key: 'reviews' },
                ].map(item => (
                  <div key={item.key} className="p-2 bg-white rounded-lg border border-[#E8E6E1] text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[#2D7A70] shrink-0" />
                    <span className="text-[#121212] truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lead Webhook */}
          <div className="p-4 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="sans-micro text-[9.5px] font-semibold text-[#121212]">
                Incoming Leads Ingestion Webhook (Meta Ads / Website Forms)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl, 'leads')}
                className="sans-micro text-[9px] text-[#8C6D37] hover:underline font-medium flex items-center gap-1.5 cursor-pointer"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-[#2D7A70]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'Copied URL' : 'Copy Endpoint'}</span>
              </button>
            </div>
            <div className="p-2.5 bg-white rounded-lg border border-[#E8E6E1] font-mono text-xs text-[#121212] break-all">
              {webhookUrl}
            </div>
            <p className="sans-micro text-[8.5px] text-[#888888]">
              Send JSON payloads via <code>POST</code> with fields: <code>customerName</code>, <code>mobile</code>, <code>loanType</code>, <code>requiredAmount</code>, <code>leadSource</code>.
            </p>
          </div>

          {/* WhatsApp Business Cloud API */}
          <div className="p-4 rounded-xl border border-[#E8E6E1] bg-white space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#2D7A70]" />
                  <h4 className="serif-display text-sm font-normal text-[#121212]">
                    WhatsApp Business Cloud API ({WHATSAPP_CONFIG.businessPhoneNumber})
                  </h4>
                </div>
                <p className="text-xs text-[#5A5854] mt-1">
                  Automated 12-stage milestone notifications, document requests, and associate communication via official Capitabee Business account.
                </p>
                <p className="sans-micro text-[8.5px] text-[#888888] mt-1">
                  Variables: <code>WHATSAPP_API_KEY</code> (Bearer Token), <code>WHATSAPP_PHONE_NUMBER_ID</code>, <code>WHATSAPP_BUSINESS_ACCOUNT_ID</code>
                </p>
              </div>

              <div>
                {integrationStatus?.whatsapp?.status === 'CONNECTED' ? (
                  <span className="sans-micro text-[8.5px] font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>CONNECTED</span>
                  </span>
                ) : (
                  <span className="sans-micro text-[8.5px] font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Not Connected</span>
                  </span>
                )}
              </div>
            </div>

            {/* If not connected, show note and fallback link */}
            {integrationStatus?.whatsapp?.status !== 'CONNECTED' && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-center justify-between flex-wrap gap-2">
                <span>{WHATSAPP_CONFIG.serviceNotConnectedMessage} Direct WhatsApp Business fallback active.</span>
                <a
                  href={getCapitabeeWhatsAppUrl('Inquiry regarding Capitabee Partner Portal')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2D7A70] hover:underline"
                >
                  <span>Chat on WhatsApp ({WHATSAPP_CONFIG.businessPhoneNumber})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Meta Webhook Endpoint */}
            <div className="p-3 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="sans-micro text-[9px] font-medium text-[#121212]">
                  Meta Cloud API Webhook URL (Delivery receipts & inbound message updates)
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(waWebhookUrl, 'wa')}
                  className="sans-micro text-[9px] text-[#8C6D37] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedWaWebhook ? <Check className="w-3 h-3 text-[#2D7A70]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedWaWebhook ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E8E6E1] font-mono text-[11px] text-[#121212] break-all">
                {waWebhookUrl}
              </div>
              <p className="sans-micro text-[8px] text-[#888888]">
                Verify Token: <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> (default: <code>capitabee_whatsapp_verify_token</code>)
              </p>
            </div>
          </div>

          {/* CIBIL Status */}
          <div className="p-4 rounded-xl border border-[#E8E6E1] bg-white flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#8C6D37]" />
                <h4 className="serif-display text-sm font-normal text-[#121212]">TransUnion CIBIL Bureau API</h4>
              </div>
              <p className="text-xs text-[#5A5854] mt-1">
                Provides direct, instant borrower credit score reports with CICRA 2005 compliance.
              </p>
              <p className="sans-micro text-[8.5px] text-[#888888] mt-1">
                Variable: <code>CIBIL_MEMBER_ID</code>, <code>CIBIL_API_KEY</code>
              </p>
            </div>
            <span className="sans-micro text-[8.5px] font-medium px-2.5 py-1 bg-[#FAF9F6] text-[#8C6D37] border border-[#E8E6E1] rounded-lg">
              Pending Credentials
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

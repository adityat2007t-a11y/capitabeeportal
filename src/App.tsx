/**
 * Capitabee Financial Services CRM & Loan Management Portal
 * Main Application Orchestrator
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginView } from './views/LoginView';
import { CapitabeeLogo } from './components/common/CapitabeeLogo';

// Views
import { AdminDashboardView } from './views/AdminDashboardView';
import { AssociateDashboardView } from './views/AssociateDashboardView';
import { PartnerDashboardView } from './views/PartnerDashboardView';
import { LeadsView } from './views/LeadsView';
import { ApplicationsView } from './views/ApplicationsView';
import { CustomersView } from './views/CustomersView';
import { PartnersView } from './views/PartnersView';
import { AssociatesView } from './views/AssociatesView';
import { TargetsView } from './views/TargetsView';
import { AssignmentsView } from './views/AssignmentsView';
import { FollowUpsView } from './views/FollowUpsView';
import { DocumentsView } from './views/DocumentsView';
import { CibilView } from './views/CibilView';
import { ChampionsBoardView } from './views/ChampionsBoardView';
import { ReviewsView } from './views/ReviewsView';
import { ReportsView } from './views/ReportsView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { AuditLogsView } from './views/AuditLogsView';

// Modals & Drawers
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { LeadModal } from './components/leads/LeadModal';
import { LeadDetailDrawer } from './components/leads/LeadDetailDrawer';
import { AssignLeadModal } from './components/leads/AssignLeadModal';
import { ApplicationModal } from './components/applications/ApplicationModal';
import { ApplicationDetailDrawer } from './components/applications/ApplicationDetailDrawer';
import { StageUpdateModal } from './components/applications/StageUpdateModal';
import { DocumentRequestModal } from './components/applications/DocumentRequestModal';
import { AssociateModal } from './components/associates/AssociateModal';
import { CibilCheckModal } from './components/cibil/CibilCheckModal';

// Types & Brand
import { Lead, Application, User } from './types';
import { BRAND_COLORS } from './config/brand';

const AppContent: React.FC = () => {
  const { user, role, loading, logout } = useAuth();

  // Navigation state
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals & Drawers state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Leads
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState<Lead | null>(null);

  // Applications
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [selectedAppForEdit, setSelectedAppForEdit] = useState<Application | null>(null);
  const [selectedAppForDetail, setSelectedAppForDetail] = useState<Application | null>(null);
  const [selectedAppForStage, setSelectedAppForStage] = useState<Application | null>(null);
  const [selectedAppForDocs, setSelectedAppForDocs] = useState<Application | null>(null);

  // Conversion prefill
  const [prefillFromLead, setPrefillFromLead] = useState<Lead | null>(null);

  // Associates
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);

  // CIBIL
  const [isCibilModalOpen, setIsCibilModalOpen] = useState(false);

  // Notifications
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Refresh trigger for data updates
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  // Keyboard shortcut for Search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update default view on role change
  useEffect(() => {
    if (role === 'ADMIN') {
      setCurrentView('admin-dashboard');
    } else if (role === 'PARTNER') {
      setCurrentView('partner-dashboard');
    } else if (role === 'ASSOCIATE') {
      setCurrentView('associate-dashboard');
    }
  }, [role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1224] flex flex-col items-center justify-center p-4">
        <div className="animate-pulse flex flex-col items-center">
          <CapitabeeLogo size="lg" theme="dark" showTagline={true} />
        </div>
        <p className="text-xs text-[#94A3B8] mt-4 tracking-wider">Connecting to Secure CRM Gateway...</p>
      </div>
    );
  }

  // If not logged in, show Login Screen
  if (!user) {
    return <LoginView />;
  }

  // Security Check: Customer accounts are blocked from the Internal CRM Portal
  if (role === 'CUSTOMER') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-rose-200 shadow-xl space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="serif-display text-2xl text-[#121212] font-semibold">
            Access Denied: Internal CRM Portal
          </h2>
          <p className="text-xs text-[#5A5854] leading-relaxed">
            Customer accounts are not authorized to access this internal financial management system.
            Borrowers can track their 12-stage loan progress, status, and documents from the Customer Portal on the main Capitabee website.
          </p>
          <div className="pt-3">
            <button
              type="button"
              onClick={() => logout()}
              className="w-full py-2.5 px-4 bg-[#121212] text-white text-xs font-medium rounded-full hover:bg-[#262626] transition-colors cursor-pointer"
            >
              Return to CRM Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle Converting a Lead into an Application
  const handleConvertToApplication = (lead: Lead) => {
    setPrefillFromLead(lead);
    setSelectedAppForEdit(null);
    setIsAppModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#121212] flex flex-col font-sans relative overflow-x-hidden selection:bg-[#B89758]/20 selection:text-[#121212]">
      {/* Artistic Flair Subtle Architectural Backdrop Accents */}
      <div className="fixed -top-16 -left-16 w-96 h-[480px] bg-[#E8E6E1]/30 rounded-3xl -rotate-6 pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[450px] h-[450px] rounded-full bg-[#F2F1ED]/50 pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenNewLead={() => {
          setSelectedLeadForEdit(null);
          setIsLeadModalOpen(true);
        }}
        onOpenNewApp={() => {
          setPrefillFromLead(null);
          setSelectedAppForEdit(null);
          setIsAppModalOpen(true);
        }}
        unreadCount={unreadNotifications}
      />

      {/* Main Layout: Sidebar + Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={setCurrentView}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Dynamic View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full lg:ml-64 relative">
          {/* Admin Views */}
          {role === 'ADMIN' && (
            <>
              {currentView === 'admin-dashboard' && (
                <AdminDashboardView
                  key={refreshKey}
                  onNavigate={setCurrentView}
                  onOpenNewLead={() => {
                    setSelectedLeadForEdit(null);
                    setIsLeadModalOpen(true);
                  }}
                  onOpenNewApp={() => {
                    setPrefillFromLead(null);
                    setSelectedAppForEdit(null);
                    setIsAppModalOpen(true);
                  }}
                  onOpenNewAssociate={() => setIsAssociateModalOpen(true)}
                  onOpenCibil={() => setIsCibilModalOpen(true)}
                  onSelectLead={lead => setSelectedLeadForDetail(lead)}
                  onSelectApp={app => setSelectedAppForDetail(app)}
                />
              )}

              {currentView === 'admin-leads' && (
                <LeadsView
                  key={refreshKey}
                  onOpenNewLead={() => {
                    setSelectedLeadForEdit(null);
                    setIsLeadModalOpen(true);
                  }}
                  onSelectLead={lead => setSelectedLeadForDetail(lead)}
                  onConvertToApplication={handleConvertToApplication}
                  onAssignLead={lead => setSelectedLeadForAssign(lead)}
                />
              )}

              {currentView === 'admin-applications' && (
                <ApplicationsView
                  key={refreshKey}
                  onOpenNewApp={() => {
                    setPrefillFromLead(null);
                    setSelectedAppForEdit(null);
                    setIsAppModalOpen(true);
                  }}
                  onSelectApp={app => setSelectedAppForDetail(app)}
                />
              )}

              {currentView === 'admin-customers' && (
                <CustomersView key={refreshKey} />
              )}

              {currentView === 'admin-associates' && (
                <AssociatesView
                  key={refreshKey}
                  onOpenNewAssociate={() => setIsAssociateModalOpen(true)}
                />
              )}

              {currentView === 'admin-partners' && (
                <PartnersView key={refreshKey} />
              )}

              {currentView === 'admin-targets' && (
                <TargetsView key={refreshKey} />
              )}

              {currentView === 'admin-assignments' && (
                <AssignmentsView key={refreshKey} />
              )}

              {currentView === 'admin-followups' && (
                <FollowUpsView key={refreshKey} />
              )}

              {currentView === 'admin-documents' && (
                <DocumentsView key={refreshKey} />
              )}

              {currentView === 'admin-cibil' && (
                <CibilView key={refreshKey} />
              )}

              {currentView === 'admin-champions' && (
                <ChampionsBoardView key={refreshKey} />
              )}

              {currentView === 'admin-reviews' && (
                <ReviewsView key={refreshKey} />
              )}

              {currentView === 'admin-reports' && (
                <ReportsView key={refreshKey} />
              )}

              {currentView === 'admin-analytics' && (
                <AnalyticsView key={refreshKey} />
              )}

              {currentView === 'admin-settings' && (
                <SettingsView key={refreshKey} />
              )}

              {currentView === 'admin-audit' && (
                <AuditLogsView key={refreshKey} />
              )}
            </>
          )}

          {/* Partner Views */}
          {role === 'PARTNER' && (
            <>
              {currentView === 'partner-dashboard' && (
                <PartnerDashboardView
                  key={refreshKey}
                  onNavigate={setCurrentView}
                  onOpenNewLead={() => {
                    setSelectedLeadForEdit(null);
                    setIsLeadModalOpen(true);
                  }}
                  onOpenNewApp={() => {
                    setPrefillFromLead(null);
                    setSelectedAppForEdit(null);
                    setIsAppModalOpen(true);
                  }}
                  onSelectApp={app => setSelectedAppForDetail(app)}
                />
              )}

              {currentView === 'partner-customers' && (
                <CustomersView key={refreshKey} />
              )}

              {currentView === 'partner-applications' && (
                <ApplicationsView
                  key={refreshKey}
                  onOpenNewApp={() => {
                    setPrefillFromLead(null);
                    setSelectedAppForEdit(null);
                    setIsAppModalOpen(true);
                  }}
                  onSelectApp={app => setSelectedAppForDetail(app)}
                />
              )}

              {currentView === 'partner-leads' && (
                <LeadsView
                  key={refreshKey}
                  onOpenNewLead={() => {
                    setSelectedLeadForEdit(null);
                    setIsLeadModalOpen(true);
                  }}
                  onSelectLead={lead => setSelectedLeadForDetail(lead)}
                  onConvertToApplication={handleConvertToApplication}
                  onAssignLead={lead => setSelectedLeadForAssign(lead)}
                />
              )}

              {currentView === 'partner-targets' && (
                <TargetsView key={refreshKey} />
              )}

              {currentView === 'partner-reviews' && (
                <ReviewsView key={refreshKey} />
              )}

              {currentView === 'partner-documents' && (
                <DocumentsView key={refreshKey} />
              )}

              {currentView === 'partner-settings' && (
                <SettingsView key={refreshKey} />
              )}
            </>
          )}

          {/* Associate Views */}
          {role === 'ASSOCIATE' && (
            <>
              {currentView === 'associate-dashboard' && (
                <AssociateDashboardView
                  key={refreshKey}
                  onNavigate={setCurrentView}
                  onOpenNewLead={() => {
                    setSelectedLeadForEdit(null);
                    setIsLeadModalOpen(true);
                  }}
                  onOpenNewApp={() => {
                    setPrefillFromLead(null);
                    setSelectedAppForEdit(null);
                    setIsAppModalOpen(true);
                  }}
                  onSelectLead={lead => setSelectedLeadForDetail(lead)}
                  onSelectApp={app => setSelectedAppForDetail(app)}
                />
              )}

              {currentView === 'associate-leads' && (
                <LeadsView
                  key={refreshKey}
                  onOpenNewLead={() => {
                    setSelectedLeadForEdit(null);
                    setIsLeadModalOpen(true);
                  }}
                  onSelectLead={lead => setSelectedLeadForDetail(lead)}
                  onConvertToApplication={handleConvertToApplication}
                  onAssignLead={lead => setSelectedLeadForAssign(lead)}
                />
              )}

              {currentView === 'associate-applications' && (
                <ApplicationsView
                  key={refreshKey}
                  onOpenNewApp={() => {
                    setPrefillFromLead(null);
                    setSelectedAppForEdit(null);
                    setIsAppModalOpen(true);
                  }}
                  onSelectApp={app => setSelectedAppForDetail(app)}
                />
              )}

              {currentView === 'associate-customers' && (
                <CustomersView key={refreshKey} />
              )}

              {currentView === 'associate-targets' && (
                <TargetsView key={refreshKey} />
              )}

              {currentView === 'associate-followups' && (
                <FollowUpsView key={refreshKey} />
              )}

              {currentView === 'associate-documents' && (
                <DocumentsView key={refreshKey} />
              )}

              {currentView === 'associate-cibil' && (
                <CibilView key={refreshKey} />
              )}

              {currentView === 'associate-champions' && (
                <ChampionsBoardView key={refreshKey} />
              )}

              {currentView === 'associate-reviews' && (
                <ReviewsView key={refreshKey} />
              )}

              {currentView === 'associate-settings' && (
                <SettingsView key={refreshKey} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Modals & Drawers */}

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectLead={lead => {
          setIsSearchOpen(false);
          setSelectedLeadForDetail(lead);
        }}
        onSelectApplication={app => {
          setIsSearchOpen(false);
          setSelectedAppForDetail(app);
        }}
      />

      {/* Lead Create / Edit Modal */}
      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => {
          setIsLeadModalOpen(false);
          setSelectedLeadForEdit(null);
        }}
        initialLead={selectedLeadForEdit}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        isOpen={!!selectedLeadForDetail}
        onClose={() => setSelectedLeadForDetail(null)}
        lead={selectedLeadForDetail}
        onEdit={lead => {
          setSelectedLeadForEdit(lead);
          setSelectedLeadForDetail(null);
          setIsLeadModalOpen(true);
        }}
        onAssign={lead => {
          setSelectedLeadForAssign(lead);
        }}
        onConvertToApplication={handleConvertToApplication}
        onRefresh={triggerRefresh}
      />

      {/* Assign Lead Modal (Admin Only) */}
      <AssignLeadModal
        isOpen={!!selectedLeadForAssign}
        onClose={() => setSelectedLeadForAssign(null)}
        lead={selectedLeadForAssign}
        onSuccess={() => {
          triggerRefresh();
          setSelectedLeadForAssign(null);
        }}
      />

      {/* Application Create / Edit Modal */}
      <ApplicationModal
        isOpen={isAppModalOpen}
        onClose={() => {
          setIsAppModalOpen(false);
          setSelectedAppForEdit(null);
          setPrefillFromLead(null);
        }}
        initialApp={selectedAppForEdit}
        leadPrefill={prefillFromLead}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      {/* Application Detail Drawer */}
      <ApplicationDetailDrawer
        isOpen={!!selectedAppForDetail}
        onClose={() => setSelectedAppForDetail(null)}
        application={selectedAppForDetail}
        applicationId={selectedAppForDetail?.id || null}
        onUpdateStage={app => {
          setSelectedAppForStage(app);
        }}
        onRequestDocs={app => {
          setSelectedAppForDocs(app);
        }}
        onRefresh={triggerRefresh}
      />

      {/* Stage Update Modal */}
      <StageUpdateModal
        isOpen={!!selectedAppForStage}
        onClose={() => setSelectedAppForStage(null)}
        application={selectedAppForStage}
        onSuccess={() => {
          triggerRefresh();
          setSelectedAppForStage(null);
        }}
      />

      {/* Document Request Modal */}
      <DocumentRequestModal
        isOpen={!!selectedAppForDocs}
        onClose={() => setSelectedAppForDocs(null)}
        application={selectedAppForDocs}
        onSuccess={() => {
          triggerRefresh();
          setSelectedAppForDocs(null);
        }}
      />

      {/* Associate Create Modal */}
      <AssociateModal
        isOpen={isAssociateModalOpen}
        onClose={() => setIsAssociateModalOpen(false)}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      {/* TransUnion CIBIL Bureau Inquiry Modal */}
      <CibilCheckModal
        isOpen={isCibilModalOpen}
        onClose={() => setIsCibilModalOpen(false)}
        onSuccess={() => {
          triggerRefresh();
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

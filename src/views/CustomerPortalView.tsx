/**
 * Capitabee Financial Services - Customer Portal View
 * Matches CRM 12-Stage Loan Pipeline, Documents, Timeline, and Support
 * Strict VIEW-ONLY access for the 12-stage pipeline
 */

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  MessageSquare,
  Star,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Building,
  User,
  Phone,
  Mail,
  AlertCircle,
  HelpCircle,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LOAN_STAGES } from '../config/brand';
import { Application, DocumentRecord, InternalMessage, Review } from '../types';

export const CustomerPortalView: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'tracker' | 'documents' | 'support' | 'review'>('tracker');
  const [refreshing, setRefreshing] = useState(false);

  // Review Form state
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Message Form state
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchPortalData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('capitabee_auth_token');
      const res = await fetch('/api/customer/portal', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
        setDocuments(data.documents || []);
        setMessages(data.messages || []);
        setReviews(data.reviews || []);
        if (data.applications && data.applications.length > 0 && !selectedAppId) {
          setSelectedAppId(data.applications[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading customer portal data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
    const interval = setInterval(fetchPortalData, 15000); // 15-second polling for live status
    return () => clearInterval(interval);
  }, []);

  const currentApp = applications.find(a => a.id === selectedAppId) || applications[0];

  const handleSendQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentApp) return;

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('capitabee_auth_token');
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicationId: currentApp.id,
          message: newMessage.trim(),
          recipientId: currentApp.assignedAssociateId || 'CB-ADMIN-01',
          recipientName: currentApp.assignedAssociateName || 'Loan Executive',
        }),
      });

      if (res.ok) {
        setNewMessage('');
        fetchPortalData();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim() || !currentApp) return;

    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('capitabee_auth_token');
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName: user?.name || currentApp.customerName,
          applicationId: currentApp.id,
          customerId: user?.id,
          rating,
          comment: reviewComment.trim(),
        }),
      });

      if (res.ok) {
        setReviewComment('');
        setReviewSuccess(true);
        fetchPortalData();
        setTimeout(() => setReviewSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <RefreshCw className="w-8 h-8 text-[#B89758] animate-spin mb-3" />
        <p className="text-xs uppercase tracking-widest text-[#888888]">Loading Loan Pipeline Status...</p>
      </div>
    );
  }

  return (
    <div id="customer-portal-view" className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-[#121212] text-white p-6 sm:p-8 rounded-2xl border border-[#2A2A2A] shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-[#B89758]/20 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="sans-micro text-[9.5px] uppercase tracking-widest bg-[#B89758]/20 text-[#B89758] px-2.5 py-1 rounded-full border border-[#B89758]/30">
                Customer Borrowing Portal
              </span>
              <span className="sans-micro text-[9.5px] uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live CRM Sync
              </span>
            </div>
            <h1 className="serif-display text-2xl sm:text-3xl font-normal text-white">
              Welcome, {user?.name}
            </h1>
            <p className="text-xs text-[#A0A0A0] mt-1 font-light">
              Track your loan journey across all 12 stages in real-time, view verified lender updates, and manage documents.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="refresh-portal-btn"
              onClick={fetchPortalData}
              disabled={refreshing}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
            </button>
          </div>
        </div>

        {/* Multi-Application Selector Bar (if customer has more than 1 loan) */}
        {applications.length > 1 && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#A0A0A0] mr-2">Your Applications:</span>
            {applications.map(app => (
              <button
                key={app.id}
                type="button"
                onClick={() => setSelectedAppId(app.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  (currentApp?.id === app.id)
                    ? 'bg-[#B89758] text-[#121212] font-semibold'
                    : 'bg-white/5 hover:bg-white/10 text-white/80'
                }`}
              >
                {app.loanType} ({app.id}) - Stage {app.currentStage}/12
              </button>
            ))}
          </div>
        )}
      </div>

      {/* If No Applications exist for customer */}
      {applications.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-[#E8E6E1] text-center max-w-lg mx-auto">
          <Briefcase className="w-12 h-12 text-[#888888] mx-auto mb-3 opacity-50" />
          <h3 className="serif-display text-xl font-medium text-[#121212]">No Active Applications Found</h3>
          <p className="text-xs text-[#5A5854] mt-2 mb-4 leading-relaxed">
            Your loan application file is being prepared by our relationship manager. As soon as it is logged in the CRM, you can track all 12 stages live here.
          </p>
          <div className="p-4 bg-[#F2F1ED] rounded-xl text-left text-xs space-y-2 border border-[#E8E6E1]">
            <div className="flex items-center gap-2 text-[#121212] font-medium">
              <Phone className="w-3.5 h-3.5 text-[#B89758]" />
              <span>Dedicated Support Desk: +91 80108 86625</span>
            </div>
            <div className="flex items-center gap-2 text-[#5A5854]">
              <Mail className="w-3.5 h-3.5 text-[#B89758]" />
              <span>Email: support@capitabee.com</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Active Application Overview Card */}
          {currentApp && (
            <div className="bg-white p-6 rounded-2xl border border-[#E8E6E1] shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E8E6E1]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#B89758] bg-[#FAF9F6] px-2.5 py-0.5 rounded-md border border-[#E8E6E1]">
                      {currentApp.id}
                    </span>
                    <span className="text-sm font-semibold text-[#121212]">
                      {currentApp.loanType}
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                        currentApp.status === 'Disbursed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : currentApp.status === 'Sanctioned'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {currentApp.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A5854]">
                    Assigned Relationship Executive: <strong className="text-[#121212]">{currentApp.assignedAssociateName || 'Capitabee Lending Desk'}</strong>
                    {currentApp.lenderPartner && <> • Lending Institution: <strong className="text-[#121212]">{currentApp.lenderPartner}</strong></>}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <span className="block text-[10px] uppercase text-[#888888] font-medium tracking-wider">Required Amount</span>
                    <span className="serif-display text-xl font-semibold text-[#121212]">
                      ₹{currentApp.requestedAmount?.toLocaleString('en-IN') || '0'}
                    </span>
                  </div>
                  {currentApp.sanctionAmount ? (
                    <div>
                      <span className="block text-[10px] uppercase text-blue-600 font-medium tracking-wider">Sanctioned</span>
                      <span className="serif-display text-xl font-semibold text-blue-700">
                        ₹{currentApp.sanctionAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ) : null}
                  {currentApp.disbursementAmount ? (
                    <div>
                      <span className="block text-[10px] uppercase text-emerald-600 font-medium tracking-wider">Disbursed</span>
                      <span className="serif-display text-xl font-semibold text-emerald-700">
                        ₹{currentApp.disbursementAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-[#E8E6E1] mt-4 gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('tracker')}
                  className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    activeTab === 'tracker'
                      ? 'border-[#121212] text-[#121212]'
                      : 'border-transparent text-[#888888] hover:text-[#121212]'
                  }`}
                >
                  12-Stage Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    activeTab === 'documents'
                      ? 'border-[#121212] text-[#121212]'
                      : 'border-transparent text-[#888888] hover:text-[#121212]'
                  }`}
                >
                  Documents ({documents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('support')}
                  className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    activeTab === 'support'
                      ? 'border-[#121212] text-[#121212]'
                      : 'border-transparent text-[#888888] hover:text-[#121212]'
                  }`}
                >
                  Direct Support & Chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('review')}
                  className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 ${
                    activeTab === 'review'
                      ? 'border-[#121212] text-[#121212]'
                      : 'border-transparent text-[#888888] hover:text-[#121212]'
                  }`}
                >
                  Rate & Review
                </button>
              </div>

              {/* TAB 1: 12-STAGE TIMELINE TRACKER */}
              {activeTab === 'tracker' && (
                <div className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="serif-display text-lg font-medium text-[#121212]">
                      Stage Progress: Stage {currentApp.currentStage} of 12 ({currentApp.currentStageName})
                    </h3>
                    <span className="text-xs text-[#5A5854] bg-[#F2F1ED] px-3 py-1 rounded-full font-medium">
                      {Math.round((currentApp.currentStage / 12) * 100)}% Completed
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#E8E6E1] h-2.5 rounded-full overflow-hidden mb-8">
                    <div
                      className="bg-[#121212] h-full rounded-full transition-all duration-500"
                      style={{ width: `${(currentApp.currentStage / 12) * 100}%` }}
                    />
                  </div>

                  {/* 12-Stage Visual Roadmap */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {LOAN_STAGES.map((stage) => {
                      const isPast = stage.number < currentApp.currentStage;
                      const isCurrent = stage.number === currentApp.currentStage;
                      const isFuture = stage.number > currentApp.currentStage;

                      return (
                        <div
                          key={stage.number}
                          className={`p-4 rounded-xl border transition-all ${
                            isCurrent
                              ? 'bg-[#121212] text-white border-[#121212] shadow-md scale-[1.02]'
                              : isPast
                              ? 'bg-emerald-50/50 text-[#121212] border-emerald-200'
                              : 'bg-[#FAF9F6] text-[#888888] border-[#E8E6E1] opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                isCurrent
                                  ? 'bg-[#B89758] text-[#121212]'
                                  : isPast
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#E8E6E1] text-[#5A5854]'
                              }`}
                            >
                              STAGE {stage.number.toString().padStart(2, '0')}
                            </span>
                            {isPast && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                              </span>
                            )}
                            {isCurrent && (
                              <span className="flex items-center gap-1 text-[11px] font-medium text-[#B89758] animate-pulse">
                                <Clock className="w-3.5 h-3.5" /> Active Now
                              </span>
                            )}
                            {isFuture && (
                              <span className="text-[11px] font-medium text-[#888888]">
                                Upcoming
                              </span>
                            )}
                          </div>

                          <h4 className={`text-xs font-semibold ${isCurrent ? 'text-white' : 'text-[#121212]'}`}>
                            {stage.name}
                          </h4>
                          <p className={`text-[11px] mt-1 line-clamp-2 ${isCurrent ? 'text-[#C5C3BE]' : 'text-[#5A5854]'}`}>
                            {stage.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="serif-display text-lg font-medium text-[#121212]">
                        Loan Application Documents
                      </h3>
                      <p className="text-xs text-[#5A5854]">
                        Verified and submitted documents for Application {currentApp.id}.
                      </p>
                    </div>
                  </div>

                  {documents.length === 0 ? (
                    <div className="p-8 text-center bg-[#FAF9F6] rounded-xl border border-[#E8E6E1]">
                      <FileText className="w-8 h-8 text-[#888888] mx-auto mb-2 opacity-50" />
                      <p className="text-xs text-[#5A5854]">No documents attached yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {documents.map(doc => (
                        <div
                          key={doc.id}
                          className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1] flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg border border-[#E8E6E1] text-[#121212]">
                              <FileCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <span className="text-xs font-medium text-[#121212] block">
                                {doc.documentType}
                              </span>
                              <span className="text-[10px] text-[#888888]">
                                {doc.originalFileName || `${doc.documentType}.pdf`} • {doc.verified ? 'Verified by Executive' : 'Under Verification'}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              doc.verified
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DIRECT SUPPORT & CHAT */}
              {activeTab === 'support' && (
                <div className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="serif-display text-lg font-medium text-[#121212]">
                        Relationship Desk Messages
                      </h3>
                      <p className="text-xs text-[#5A5854]">
                        Send a message directly to your loan processing officer for immediate assistance.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] p-4 rounded-xl border border-[#E8E6E1] max-h-80 overflow-y-auto space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-xs text-center text-[#888888] py-4">No message history yet. Send a message below.</p>
                    ) : (
                      messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-xl text-xs max-w-md ${
                            msg.senderId === user?.id
                              ? 'ml-auto bg-[#121212] text-white'
                              : 'mr-auto bg-white border border-[#E8E6E1] text-[#121212]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="font-semibold text-[10px] opacity-80">{msg.senderName}</span>
                            <span className="text-[9px] opacity-60">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p>{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendQuery} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type your question or query here..."
                      className="flex-1 px-4 py-2.5 bg-white border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !newMessage.trim()}
                      className="px-5 py-2.5 bg-[#121212] hover:bg-[#2A2A2A] text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {sendingMessage ? 'Sending...' : 'Send Message'}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: RATE & REVIEW */}
              {activeTab === 'review' && (
                <div className="pt-6 max-w-lg space-y-4">
                  <div>
                    <h3 className="serif-display text-lg font-medium text-[#121212]">
                      Rate Your Experience with Capitabee
                    </h3>
                    <p className="text-xs text-[#5A5854]">
                      Your feedback helps our team maintain stellar service quality and fast turnaround times.
                    </p>
                  </div>

                  {reviewSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Thank you! Your review has been submitted successfully to the Capitabee review board.</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmitReview} className="space-y-4 bg-[#FAF9F6] p-5 rounded-xl border border-[#E8E6E1]">
                    <div>
                      <label className="block text-xs font-medium text-[#121212] mb-1">Your Rating</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="p-1 cursor-pointer transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= rating
                                  ? 'text-[#B89758] fill-[#B89758]'
                                  : 'text-[#C5C3BE]'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#121212] mb-1">Your Comments & Feedback</label>
                      <textarea
                        rows={3}
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Share your feedback regarding our loan processing speed, documentation assistance, and team support..."
                        className="w-full p-3 bg-white border border-[#E8E6E1] rounded-xl text-xs text-[#121212] focus:outline-none focus:border-[#121212]"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview || !reviewComment.trim()}
                      className="w-full py-2.5 bg-[#121212] hover:bg-[#2A2A2A] text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {submittingReview ? 'Submitting Review...' : 'Submit Feedback'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

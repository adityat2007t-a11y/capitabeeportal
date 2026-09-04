/**
 * Capitabee Financial Services CRM - Reviews & Customer Feedback Management
 * Real-time monitoring and moderation of public.reviews from Supabase & API.
 */

import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Search,
  Filter,
  RefreshCw,
  User,
  Calendar,
  AlertCircle,
  Archive,
  Award,
} from 'lucide-react';
import { CustomerReview } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

export const ReviewsView: React.FC = () => {
  const { user, role } = useAuth();
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeStatusFilter, setActiveStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Rejected' | 'Archived'>('ALL');
  const [activeRatingFilter, setActiveRatingFilter] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Response Modal State
  const [respondingReview, setRespondingReview] = useState<CustomerReview | null>(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Status Action Loading State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getReviews();
      setReviews(res.reviews || []);
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
      setError(err.message || 'Failed to fetch reviews from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleUpdateStatus = async (reviewId: string, newStatus: CustomerReview['status']) => {
    setActionLoadingId(reviewId);
    try {
      await api.updateReviewStatus(reviewId, newStatus);
      setReviews(prev =>
        prev.map(r => (r.id === reviewId ? { ...r, status: newStatus } : r))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update review status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingReview || !responseText.trim()) return;

    setSubmittingResponse(true);
    try {
      const res = await api.respondToReview(
        respondingReview.id,
        responseText.trim(),
        user?.name || 'Capitabee Support'
      );
      setReviews(prev =>
        prev.map(r => (r.id === respondingReview.id ? res.review : r))
      );
      setRespondingReview(null);
      setResponseText('');
    } catch (err: any) {
      alert(err.message || 'Failed to submit response.');
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Filtered Reviews
  const filteredReviews = reviews.filter(r => {
    if (activeStatusFilter !== 'ALL' && r.status !== activeStatusFilter) {
      return false;
    }
    if (activeRatingFilter !== 'ALL' && r.rating !== activeRatingFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.customerName.toLowerCase().includes(q);
      const matchComment = r.comment.toLowerCase().includes(q);
      const matchApp = r.applicationId?.toLowerCase().includes(q);
      if (!matchName && !matchComment && !matchApp) return false;
    }
    return true;
  });

  // Calculate Metrics
  const totalReviews = reviews.length;
  const pendingCount = reviews.filter(r => r.status === 'Pending').length;
  const approvedCount = reviews.filter(r => r.status === 'Approved').length;
  const rejectedCount = reviews.filter(r => r.status === 'Rejected').length;
  const averageRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviews).toFixed(1)
      : '5.0';

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating ? 'text-[#B89758] fill-[#B89758]' : 'text-[#E8E6E1]'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div id="reviews-management-view" className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="sans-micro text-[10px] uppercase tracking-[0.16em] text-[#8C6D37] font-semibold">
              Feedback & Reputation Management
            </span>
            <span className="sans-micro text-[9px] px-2 py-0.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-full text-[#5A5854]">
              Table: <code>public.reviews</code>
            </span>
          </div>
          <h1 className="serif-display text-2xl font-normal text-[#121212] mt-1">
            Customer Reviews & Testimonials
          </h1>
          <p className="text-xs text-[#5A5854] mt-0.5">
            Monitor, moderate, and reply to client ratings across all loan applications and portal touchpoints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="refresh-reviews-btn"
            onClick={fetchReviews}
            disabled={loading}
            className="px-3.5 py-2 text-xs bg-white hover:bg-[#F2F1ED] text-[#121212] border border-[#E8E6E1] rounded-xl flex items-center gap-2 font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5A5854] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-[#E8E6E1] bg-white artistic-card">
          <div className="flex items-center justify-between">
            <span className="sans-micro text-[9.5px] uppercase tracking-wider text-[#888888]">
              Total Submissions
            </span>
            <MessageSquare className="w-4 h-4 text-[#8C6D37]" />
          </div>
          <div className="text-2xl font-serif text-[#121212] mt-2">{totalReviews}</div>
          <p className="sans-micro text-[9px] text-[#5A5854] mt-1">All registered client reviews</p>
        </div>

        <div className="p-4 rounded-xl border border-[#E8E6E1] bg-white artistic-card">
          <div className="flex items-center justify-between">
            <span className="sans-micro text-[9.5px] uppercase tracking-wider text-[#888888]">
              Average Rating
            </span>
            <Award className="w-4 h-4 text-[#B89758]" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-serif text-[#121212]">{averageRating}</span>
            <span className="text-xs text-[#888888]">/ 5.0</span>
          </div>
          <p className="sans-micro text-[9px] text-[#2D7A70] mt-1 font-medium">Satisfied borrowers</p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 artistic-card">
          <div className="flex items-center justify-between">
            <span className="sans-micro text-[9.5px] uppercase tracking-wider text-amber-800 font-semibold">
              Pending Moderation
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-serif text-amber-900 mt-2">{pendingCount}</div>
          <p className="sans-micro text-[9px] text-amber-700 mt-1">Requires Admin verification</p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 artistic-card">
          <div className="flex items-center justify-between">
            <span className="sans-micro text-[9.5px] uppercase tracking-wider text-emerald-800 font-semibold">
              Approved & Public
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif text-emerald-900 mt-2">{approvedCount}</div>
          <p className="sans-micro text-[9px] text-emerald-700 mt-1">Visible on website & showcase</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-[#E8E6E1] space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(['ALL', 'Pending', 'Approved', 'Rejected', 'Archived'] as const).map(status => (
              <button
                key={status}
                type="button"
                id={`filter-status-${status.toLowerCase()}`}
                onClick={() => setActiveStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg sans-micro text-[10.5px] uppercase tracking-wider font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeStatusFilter === status
                    ? 'bg-[#121212] text-white shadow-2xs'
                    : 'bg-[#FAF9F6] text-[#5A5854] hover:text-[#121212] hover:bg-[#F2F1ED] border border-[#E8E6E1]'
                }`}
              >
                {status === 'ALL' ? 'All Reviews' : status}
                {status === 'Pending' && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[8.5px]">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-reviews-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by customer, comment, or app ID..."
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#121212] text-[#121212] placeholder:text-[#888888]"
            />
          </div>
        </div>

        {/* Rating Filters Row */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#E8E6E1]/60 flex-wrap">
          <span className="sans-micro text-[9px] uppercase tracking-wider text-[#888888] flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Filter Rating:</span>
          </span>
          <button
            type="button"
            onClick={() => setActiveRatingFilter('ALL')}
            className={`px-2.5 py-1 rounded-md sans-micro text-[9.5px] transition-colors cursor-pointer ${
              activeRatingFilter === 'ALL'
                ? 'bg-[#8C6D37] text-white font-medium'
                : 'text-[#5A5854] hover:bg-[#F2F1ED]'
            }`}
          >
            All Stars
          </button>
          {[5, 4, 3, 2, 1].map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setActiveRatingFilter(r)}
              className={`px-2.5 py-1 rounded-md sans-micro text-[9.5px] flex items-center gap-1 transition-colors cursor-pointer ${
                activeRatingFilter === r
                  ? 'bg-[#8C6D37] text-white font-medium'
                  : 'text-[#5A5854] hover:bg-[#F2F1ED]'
              }`}
            >
              <span>{r}</span>
              <Star className="w-2.5 h-2.5 fill-current" />
            </button>
          ))}
        </div>
      </div>

      {/* Error message if any */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#888888] bg-white rounded-2xl border border-[#E8E6E1]">
            <div className="inline-block animate-spin w-5 h-5 border-2 border-[#8C6D37] border-t-transparent rounded-full mb-2" />
            <p>Loading customer reviews from <code>public.reviews</code>...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-[#E8E6E1] p-6 space-y-2">
            <MessageSquare className="w-8 h-8 text-[#888888]/40 mx-auto" />
            <h4 className="serif-display text-base font-normal text-[#121212]">
              No reviews found matching criteria
            </h4>
            <p className="text-xs text-[#888888] max-w-sm mx-auto">
              No customer review records matched the selected status or search filter in the database.
            </p>
          </div>
        ) : (
          filteredReviews.map(review => {
            const isApproved = review.status === 'Approved';
            const isPending = review.status === 'Pending';
            const isRejected = review.status === 'Rejected';
            const isArchived = review.status === 'Archived';

            return (
              <div
                key={review.id}
                id={`review-card-${review.id}`}
                className="p-5 rounded-2xl border border-[#E8E6E1] bg-white artistic-card space-y-3.5 transition-all hover:border-[#D5D2C9]"
              >
                {/* Review Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FAF9F6] border border-[#E8E6E1] flex items-center justify-center font-serif text-sm font-medium text-[#121212]">
                      {review.customerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="serif-display text-sm font-normal text-[#121212]">
                          {review.customerName}
                        </h4>
                        {renderStars(review.rating)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#888888] mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#888888]" />
                          {new Date(review.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {review.applicationId && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-[#5A5854]">
                              App: {review.applicationId}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`sans-micro text-[9px] px-2.5 py-0.5 font-semibold rounded-full border flex items-center gap-1 ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isPending
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : isRejected
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                      {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                      {isArchived && <Archive className="w-3 h-3 text-zinc-500" />}
                      <span>{review.status}</span>
                    </span>

                    {/* Role-based moderation buttons */}
                    {role === 'ADMIN' && (
                      <div className="flex items-center gap-1.5 ml-2">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              id={`approve-btn-${review.id}`}
                              disabled={actionLoadingId === review.id}
                              onClick={() => handleUpdateStatus(review.id, 'Approved')}
                              className="px-2.5 py-1 sans-micro text-[9px] font-semibold uppercase tracking-wider text-white bg-[#2D7A70] hover:bg-[#23635B] rounded-lg transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              id={`reject-btn-${review.id}`}
                              disabled={actionLoadingId === review.id}
                              onClick={() => handleUpdateStatus(review.id, 'Rejected')}
                              className="px-2.5 py-1 sans-micro text-[9px] font-semibold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <button
                            type="button"
                            id={`archive-btn-${review.id}`}
                            disabled={actionLoadingId === review.id}
                            onClick={() => handleUpdateStatus(review.id, 'Archived')}
                            className="px-2.5 py-1 sans-micro text-[9px] font-medium text-[#5A5854] bg-[#FAF9F6] hover:bg-[#F2F1ED] border border-[#E8E6E1] rounded-lg transition-colors cursor-pointer"
                          >
                            Archive
                          </button>
                        )}

                        {isRejected && (
                          <button
                            type="button"
                            id={`reapprove-btn-${review.id}`}
                            disabled={actionLoadingId === review.id}
                            onClick={() => handleUpdateStatus(review.id, 'Approved')}
                            className="px-2.5 py-1 sans-micro text-[9px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Re-approve
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Body Comment */}
                <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1] text-xs text-[#121212] leading-relaxed">
                  "{review.comment}"
                </div>

                {/* Official Response Section if already responded */}
                {review.response && (
                  <div className="pl-4 border-l-2 border-[#8C6D37] space-y-1 bg-[#FAF9F6]/50 p-3 rounded-r-xl">
                    <div className="flex items-center justify-between">
                      <span className="sans-micro text-[9.5px] font-semibold text-[#8C6D37] uppercase tracking-wider">
                        Response by {review.respondedBy || 'Capitabee Team'}
                      </span>
                      {review.respondedAt && (
                        <span className="sans-micro text-[8.5px] text-[#888888]">
                          {new Date(review.respondedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A5854] italic font-serif">
                      "{review.response}"
                    </p>
                  </div>
                )}

                {/* Reply Button if not yet responded */}
                {!review.response && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      id={`reply-btn-${review.id}`}
                      onClick={() => {
                        setRespondingReview(review);
                        setResponseText('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 sans-micro text-[9.5px] font-medium text-[#121212] bg-white hover:bg-[#F2F1ED] border border-[#E8E6E1] rounded-lg transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3 text-[#8C6D37]" />
                      <span>Reply to Customer</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Response Modal */}
      {respondingReview && (
        <Modal
          id="respond-review-modal"
          isOpen={Boolean(respondingReview)}
          onClose={() => setRespondingReview(null)}
          title="Reply to Customer Review"
          subtitle={`Replying to ${respondingReview.customerName} • ${respondingReview.rating} Stars`}
          maxWidth="md"
        >
          <form onSubmit={handleSendResponse} className="space-y-4">
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E8E6E1] text-xs text-[#5A5854]">
              <span className="font-semibold text-[#121212]">Customer Review:</span>
              <p className="mt-1 italic">"{respondingReview.comment}"</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#121212] mb-1">
                Official Capitabee Response <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="review-response-text"
                rows={4}
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                placeholder="Thank you for your feedback! We are delighted to hear about your smooth loan experience..."
                required
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E8E6E1] rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#121212] text-[#121212] placeholder:text-[#888888]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E6E1]">
              <button
                type="button"
                onClick={() => setRespondingReview(null)}
                className="px-4 py-2 sans-micro text-[10px] uppercase tracking-wider text-[#5A5854] hover:bg-[#F2F1ED] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-review-response-btn"
                disabled={submittingResponse || !responseText.trim()}
                className="px-5 py-2 sans-micro text-[10px] uppercase tracking-wider font-semibold text-white bg-[#121212] hover:bg-[#262626] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3 h-3 text-[#B89758]" />
                <span>{submittingResponse ? 'Submitting...' : 'Post Response'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

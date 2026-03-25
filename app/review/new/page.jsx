'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const dynamic = "force-dynamic";

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-3xl transition-transform hover:scale-110 focus:outline-none"
        >
          {star <= (hovered || value) ? '⭐' : '☆'}
        </button>
      ))}
    </div>
  );
}

const LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

export default function NewReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const equipmentId = searchParams.get('equipmentId');

  const [booking, setBooking] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('equipment');

  const [equipRating, setEquipRating] = useState(0);
  const [equipComment, setEquipComment] = useState('');
  const [equipSubmitted, setEquipSubmitted] = useState(false);

  const [borrowerRating, setBorrowerRating] = useState(0);
  const [borrowerComment, setBorrowerComment] = useState('');
  const [borrowerSubmitted, setBorrowerSubmitted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token) { router.push('/login'); return; }
    if (!bookingId) { router.push('/dashboard'); return; }
    setCurrentUser(u);
    fetch(`/api/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setBooking(d.booking);
        if (d.booking?.owner?._id === u?._id) setActiveTab('borrower');
      });
  }, [router, bookingId]);

  const isBorrower = booking && currentUser && booking.borrower?._id === currentUser._id;
  const isOwner = booking && currentUser && booking.owner?._id === currentUser._id;

  const handleSubmit = async (reviewType) => {
    const rating = reviewType === 'equipment' ? equipRating : borrowerRating;
    if (rating === 0) { setError('Please select a rating'); return; }
    setError('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bookingId,
          equipmentId,
          rating,
          comment: reviewType === 'equipment' ? equipComment : borrowerComment,
          reviewType,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      if (reviewType === 'equipment') setEquipSubmitted(true);
      else setBorrowerSubmitted(true);
    } catch {
      setError('Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  const allDone = (isBorrower && equipSubmitted) || (isOwner && borrowerSubmitted);

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Leave a Review</h1>
        <p className="text-gray-400 mb-8">Share your experience with this equipment</p>

        {allDone ? (
          <div className="card p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Review Submitted!</h2>
            <p className="text-gray-500 mb-6">Thank you for helping the community.</p>
            <Link href="/dashboard" className="btn-primary">Back to Dashboard</Link>
          </div>
        ) : (
          <>
            {isBorrower && !isOwner && (
              <form onSubmit={e => { e.preventDefault(); handleSubmit('equipment'); }} className="card p-6 space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Your Rating *</label>
                  <StarPicker value={equipRating} onChange={setEquipRating} />
                  {equipRating > 0 && <p className="text-sm text-[#2d6a2d] font-medium mt-2">{LABELS[equipRating]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Comment <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    className="input-field resize-none"
                    rows={4}
                    placeholder="How was the equipment condition? Was the owner helpful? Would you recommend it?"
                    value={equipComment}
                    onChange={e => setEquipComment(e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{equipComment.length}/500</p>
                </div>
                <div className="flex gap-3">
                  <Link href="/dashboard" className="btn-secondary flex-1 text-center">Cancel</Link>
                  <button type="submit" disabled={loading || equipRating === 0} className="btn-primary flex-1">
                    {loading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}

            {isOwner && !isBorrower && (
              <form onSubmit={e => { e.preventDefault(); handleSubmit('borrower'); }} className="card p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">👤</div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Rate the Borrower</p>
                    <p className="text-xs text-gray-400">How responsible were they with your equipment?</p>
                  </div>
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Your Rating *</label>
                  <StarPicker value={borrowerRating} onChange={setBorrowerRating} />
                  {borrowerRating > 0 && <p className="text-sm text-[#2d6a2d] font-medium mt-2">{LABELS[borrowerRating]}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Comment <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    className="input-field resize-none"
                    rows={4}
                    placeholder="Did they return it on time? In good condition? Would you rent to them again?"
                    value={borrowerComment}
                    onChange={e => setBorrowerComment(e.target.value)}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{borrowerComment.length}/500</p>
                </div>
                <div className="flex gap-3">
                  <Link href="/dashboard" className="btn-secondary flex-1 text-center">Cancel</Link>
                  <button type="submit" disabled={loading || borrowerRating === 0} className="btn-primary flex-1">
                    {loading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

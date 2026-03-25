'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const CATEGORY_ICONS = {
  tractor: '🚜', harvester: '🌾', irrigation: '💧', plowing: '⛏️',
  seeding: '🌱', spraying: '🪣', other: '🔧',
};

function StarDisplay({ rating }) {
  return (
    <span className="text-yellow-400 text-sm">
      {[1,2,3,4,5].map(s => s <= Math.round(rating) ? '★' : '☆').join('')}
    </span>
  );
}

function RatingBreakdown({ reviews }) {
  const total = reviews.length;
  const avg = total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : 0;
  return (
    <div className="flex gap-6 items-center mb-5">
      <div className="text-center shrink-0">
        <div className="text-4xl font-bold text-gray-900">{avg}</div>
        <StarDisplay rating={Number(avg)} />
        <div className="text-xs text-gray-400 mt-1">{total} review{total !== 1 ? 's' : ''}</div>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map(star => {
          const count = reviews.filter(r => Math.round(r.rating) === star).length;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 w-3 shrink-0">{star}</span>
              <span className="text-yellow-400">★</span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-yellow-400 h-full rounded-full"
                  style={{ width: total > 0 ? `${Math.round((count / total) * 100)}%` : '0%' }}
                />
              </div>
              <span className="text-gray-400 w-3 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImageGallery({ images }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="relative h-64 bg-gray-100 overflow-hidden">
        <Image src={images[active]} alt="Equipment" fill className="object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={"relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition " + (active === i ? "border-[#2d6a2d]" : "border-transparent")}>
              <Image src={img} alt={`thumb ${i}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple QR code SVG generator using encoded URL pattern
function QRCodeDisplay({ bookingId, qrToken, borrowerName, equipmentTitle }) {
  // We encode booking info as a visual QR-like grid (deterministic from token)
  const size = 21;
  const cells = [];
  // Generate deterministic pattern from token
  const seed = qrToken || bookingId;
  for (let i = 0; i < size * size; i++) {
    const charIdx = i % seed.length;
    const val = seed.charCodeAt(charIdx);
    cells.push((val + i * 7 + Math.floor(i / size) * 3) % 3 === 0);
  }
  // Finder patterns
  const isFinderPattern = (r, c) => {
    const inTopLeft = r < 7 && c < 7;
    const inTopRight = r < 7 && c >= size - 7;
    const inBottomLeft = r >= size - 7 && c < 7;
    if (!inTopLeft && !inTopRight && !inBottomLeft) return null;
    const lr = inTopLeft ? r : (inBottomLeft ? r - (size - 7) : r);
    const lc = inTopLeft ? c : (inTopRight ? c - (size - 7) : c);
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-[#2d6a2d]">
        <svg width="168" height="168" viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
          {Array.from({ length: size }, (_, r) =>
            Array.from({ length: size }, (_, c) => {
              const fp = isFinderPattern(r, c);
              const filled = fp !== null ? fp : cells[r * size + c];
              return filled ? (
                <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#1a1a1a" />
              ) : null;
            })
          )}
        </svg>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center font-mono">{qrToken?.slice(0, 16)}</p>
      <p className="text-xs text-gray-400 mt-1 text-center">Show this to the equipment owner</p>
    </div>
  );
}

// Payment modal
function PaymentModal({ booking, onClose, onSuccess }) {
  const [method, setMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [step, setStep] = useState('form'); // form | processing | done
  const [error, setError] = useState('');

  const totalPayable = booking.totalPrice + (booking.depositAmount || 0);

  const handlePay = async () => {
    setError('');
    if (method === 'upi' && !upiId.trim()) { setError('Please enter UPI ID'); return; }
    if (method === 'card') {
      if (cardNum.replace(/\s/g, '').length < 16) { setError('Enter valid card number'); return; }
      if (!expiry.match(/^\d{2}\/\d{2}$/)) { setError('Enter valid expiry MM/YY'); return; }
      if (cvv.length < 3) { setError('Enter valid CVV'); return; }
    }
    setStep('processing');
    // Simulate 2s payment processing
    await new Promise(r => setTimeout(r, 2000));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setStep('form'); return; }
      setStep('done');
      setTimeout(() => onSuccess(data.booking), 1500);
    } catch {
      setError('Payment failed. Try again.');
      setStep('form');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {step === 'processing' && (
          <div className="p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-[#2d6a2d] border-t-transparent animate-spin" />
            <p className="font-semibold text-gray-700">Processing Payment...</p>
            <p className="text-sm text-gray-400">Please wait, do not close this window</p>
          </div>
        )}
        {step === 'done' && (
          <div className="p-10 flex flex-col items-center gap-4">
            <div className="text-6xl">✅</div>
            <p className="font-bold text-gray-900 text-xl">Payment Successful!</p>
            <p className="text-sm text-gray-500 text-center">Your booking is now confirmed. Getting your QR code...</p>
          </div>
        )}
        {step === 'form' && (
          <>
            <div className="bg-[#2d6a2d] text-white p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-lg">🔒 Secure Payment</span>
                <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
              </div>
              <p className="text-sm text-green-200">FarmLink Payment Gateway</p>
            </div>
            <div className="p-5 bg-green-50 border-b border-green-100">
              <p className="text-sm text-gray-600 mb-1">{booking.equipment?.title}</p>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Rental ({booking.totalDays} days)</span><span>₹{booking.totalPrice}</span>
              </div>
              {booking.depositAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Refundable Deposit</span><span>₹{booking.depositAmount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 mt-2 pt-2 border-t border-green-200">
                <span>Total Payable</span><span className="text-[#2d6a2d]">₹{totalPayable}</span>
              </div>
            </div>
            <div className="p-5">
              {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">{error}</div>}
              {/* Payment method tabs */}
              <div className="flex gap-2 mb-4">
                {[['upi', '📱 UPI'], ['card', '💳 Card'], ['cash', '💵 Cash on Delivery']].map(([v, l]) => (
                  <button key={v} onClick={() => setMethod(v)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition ${method === v ? 'bg-[#2d6a2d] text-white border-[#2d6a2d]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#2d6a2d]'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {method === 'upi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                  <input className="input-field" placeholder="yourname@upi" value={upiId} onChange={e => setUpiId(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">e.g. 9876543210@paytm, name@gpay</p>
                </div>
              )}
              {method === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                    <input className="input-field font-mono" placeholder="0000 0000 0000 0000" maxLength={19}
                      value={cardNum} onChange={e => {
                        const v = e.target.value.replace(/\D/g,'').slice(0,16);
                        setCardNum(v.replace(/(.{4})/g,'$1 ').trim());
                      }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                      <input className="input-field" placeholder="MM/YY" maxLength={5}
                        value={expiry} onChange={e => {
                          let v = e.target.value.replace(/\D/g,'').slice(0,4);
                          if (v.length > 2) v = v.slice(0,2) + '/' + v.slice(2);
                          setExpiry(v);
                        }} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                      <input className="input-field" type="password" placeholder="•••" maxLength={3}
                        value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g,'').slice(0,3))} />
                    </div>
                  </div>
                </div>
              )}
              {method === 'cash' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                  <p className="font-medium mb-1">💡 Cash on Delivery</p>
                  <p>Pay ₹{totalPayable} in cash when the equipment is delivered. Your booking will be confirmed immediately.</p>
                </div>
              )}
              <button onClick={handlePay} className="btn-primary w-full mt-4 py-3 text-base">
                Pay ₹{totalPayable}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">🔒 This is a simulated payment for demo purposes</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Blocked dates calendar
function BookedDatesCalendar({ bookedRanges }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isBooked = (day) => {
    const d = new Date(year, month, day);
    return bookedRanges.some(r => {
      const s = new Date(r.startDate);
      const e = new Date(r.endDate);
      s.setHours(0,0,0,0); e.setHours(23,59,59,999);
      return d >= s && d <= e;
    });
  };
  const isPast = (day) => new Date(year, month, day) < today;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); }}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 text-lg">‹</button>
        <span className="font-semibold text-gray-700 text-sm">{months[month]} {year}</span>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); }}
          className="p-1 rounded hover:bg-gray-100 text-gray-500 text-lg">›</button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-xs text-gray-400 pb-1">{d}</div>
        ))}
        {Array.from({ length: firstDay }, (_, i) => <div key={'e'+i} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const booked = isBooked(day);
          const past = isPast(day);
          return (
            <div key={day} className={`text-xs py-1 rounded text-center font-medium ${
              booked ? 'bg-red-100 text-red-500 line-through' :
              past ? 'text-gray-300' :
              'text-gray-600'
            }`}>{day}</div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block" />Booked</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" />Available</span>
      </div>
    </div>
  );
}

export default function EquipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [equipment, setEquipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({ startDate: '', endDate: '', notes: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [createdBooking, setCreatedBooking] = useState(null); // booking object after creation
  const [showPayment, setShowPayment] = useState(false);
  const [paidBooking, setPaidBooking] = useState(null); // booking after payment
  const [currentUser, setCurrentUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token) { router.push('/login'); return; }
    setCurrentUser(user);

    Promise.all([
      fetch(`/api/equipment/${params.id}`).then(r => r.json()),
      fetch(`/api/reviews?equipmentId=${params.id}`).then(r => r.json()),
      fetch(`/api/equipment/${params.id}/booked-dates`).then(r => r.json()),
    ]).then(([eData, rData, bData]) => {
      setEquipment(eData.equipment);
      setReviews(rData.reviews || []);
      setBookedRanges(bData.bookings || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [params.id, router]);

  const totalDays = booking.startDate && booking.endDate
    ? Math.max(0, Math.ceil((new Date(booking.endDate) - new Date(booking.startDate)) / 86400000))
    : 0;
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + (a.pricePerDay || 0), 0) * totalDays;
  const totalPrice = totalDays * (equipment?.pricePerDay || 0) + addOnsTotal;

  const isDateConflict = useCallback((start, end) => {
    if (!start || !end) return false;
    const s = new Date(start), e = new Date(end);
    return bookedRanges.some(r => {
      const rs = new Date(r.startDate); const re = new Date(r.endDate);
      return s < re && e > rs;
    });
  }, [bookedRanges]);

  const dateConflict = isDateConflict(booking.startDate, booking.endDate);

  const toggleAddOn = (addon) => {
    setSelectedAddOns(prev =>
      prev.find(a => a.name === addon.name)
        ? prev.filter(a => a.name !== addon.name)
        : [...prev, { name: addon.name, pricePerDay: addon.pricePerDay }]
    );
  };

  const handleRequestBooking = async (e) => {
    e.preventDefault();
    if (dateConflict) { setBookingError('Selected dates overlap with existing bookings.'); return; }
    setBookingError('');
    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ equipmentId: params.id, ...booking, selectedAddOns }),
      });
      const data = await res.json();
      if (!res.ok) { setBookingError(data.error); return; }
      setCreatedBooking(data.booking);
      setShowPayment(true);
    } catch {
      setBookingError('Booking failed. Try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePaymentSuccess = (paidBk) => {
    setShowPayment(false);
    setPaidBooking(paidBk);
  };

  const isOwner = currentUser && equipment && equipment.owner?._id === currentUser._id;
  const today = new Date().toISOString().split('T')[0];
  const canBook = equipment && !['maintenance', 'inspection'].includes(equipment.status) && !isOwner;

  if (loading) return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
        <div className="h-64 bg-white rounded-2xl mb-6" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-80 bg-white rounded-2xl" />
          <div className="h-80 bg-white rounded-2xl" />
        </div>
      </div>
    </div>
  );

  if (!equipment) return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />
      <div className="text-center py-20">
        <p className="text-gray-500">Equipment not found.</p>
        <Link href="/marketplace" className="btn-primary mt-4 inline-block">Back to Marketplace</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />
      {showPayment && createdBooking && (
        <PaymentModal
          booking={{ ...createdBooking, equipment }}
          onClose={() => {
            setShowPayment(false);
            setCreatedBooking(null);
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-sm text-gray-400 mb-6">
          <Link href="/marketplace" className="hover:text-[#2d6a2d]">Marketplace</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600">{equipment.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-5">
            <div className="card">
              {equipment.images && equipment.images.length > 0 ? (
                <ImageGallery images={equipment.images} />
              ) : (
                <div className="h-56 bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center text-8xl">
                  {CATEGORY_ICONS[equipment.category] || '🔧'}
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">{equipment.title}</h1>
                  <span className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${
                    equipment.status === 'available' ? 'bg-green-100 text-green-700' :
                    equipment.status === 'in_use' ? 'bg-blue-100 text-blue-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {equipment.status === 'in_use' ? '📦 In Use (bookable)' : equipment.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="capitalize">📦 {equipment.category}</span>
                  <span>📍 {equipment.location}</span>
                </div>
                <p className="text-gray-600 leading-relaxed">{equipment.description}</p>
              </div>
            </div>

            {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
              <div className="card p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Specifications</h2>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(equipment.specifications).map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-lg p-3">
                      <span className="text-xs text-gray-400 capitalize block">{k}</span>
                      <span className="text-sm font-medium text-gray-700">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Owner</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#2d6a2d] text-white flex items-center justify-center text-lg font-bold">
                  {equipment.owner?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{equipment.owner?.name}</p>
                  <p className="text-sm text-gray-400">{equipment.owner?.location}</p>
                </div>
              </div>
            </div>

            {/* Availability Calendar */}
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">📅 Availability Calendar</h2>
              <p className="text-sm text-gray-500 mb-4">Dates in red are already booked. Choose available dates below.</p>
              <BookedDatesCalendar bookedRanges={bookedRanges} />
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                Reviews {reviews.length > 0 && <span className="text-gray-400 font-normal text-sm">({reviews.length})</span>}
              </h2>
              {reviews.length === 0 ? (
                <p className="text-gray-400 text-sm">No reviews yet. Be the first to review after renting!</p>
              ) : (
                <>
                  <RatingBreakdown reviews={reviews} />
                  <div className="space-y-4 border-t border-gray-50 pt-4">
                    {reviews.map(r => (
                      <div key={r._id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#2d6a2d] text-white text-xs flex items-center justify-center font-bold">
                              {r.reviewer?.name?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{r.reviewer?.name}</span>
                          </div>
                          <StarDisplay rating={r.rating} />
                        </div>
                        {r.comment && <p className="text-sm text-gray-500 ml-9">{r.comment}</p>}
                        <p className="text-xs text-gray-300 ml-9 mt-1">
                          {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Booking Panel */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-20">
              <div className="mb-5">
                <span className="text-3xl font-bold text-[#2d6a2d]">₹{equipment.pricePerDay}</span>
                <span className="text-gray-400">/day</span>
                {equipment.depositAmount > 0 && (
                  <p className="text-sm text-gray-400 mt-1">+ ₹{equipment.depositAmount} refundable deposit</p>
                )}
              </div>

              {/* Show QR after payment */}
              {paidBooking ? (
                <div className="text-center py-2">
                  <div className="text-3xl mb-2">🎉</div>
                  <h3 className="font-bold text-gray-900 mb-1">Booking Confirmed!</h3>
                  <p className="text-sm text-gray-500 mb-1">Payment successful</p>
                  <div className="bg-green-50 rounded-lg px-3 py-1.5 text-xs text-green-700 mb-4 inline-block">
                    Txn: {paidBooking.paymentTransactionId}
                  </div>
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Your Delivery QR Code</p>
                    <QRCodeDisplay
                      bookingId={paidBooking._id}
                      qrToken={paidBooking.qrToken}
                      borrowerName={currentUser?.name}
                      equipmentTitle={equipment.title}
                    />
                  </div>
                  <Link href="/dashboard" className="btn-primary w-full block text-center text-sm">
                    View in Dashboard
                  </Link>
                </div>
              ) : isOwner ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  This is your equipment listing.
                </div>
              ) : !canBook ? (
                <div className="text-center py-4">
                  <p className="text-orange-600 font-medium">Not available for booking</p>
                  <p className="text-sm text-gray-400 mt-1">Current status: {equipment.status}</p>
                </div>
              ) : (
                <form onSubmit={handleRequestBooking} className="space-y-4">
                  {bookingError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm">
                      {bookingError}
                    </div>
                  )}
                  {dateConflict && booking.startDate && booking.endDate && (
                    <div className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-2 rounded-lg text-xs">
                      ⚠️ These dates overlap with an existing booking. Please choose different dates.
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input type="date" className="input-field" min={today}
                      value={booking.startDate}
                      onChange={e => setBooking({ ...booking, startDate: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input type="date" className="input-field" min={booking.startDate || today}
                      value={booking.endDate}
                      onChange={e => setBooking({ ...booking, endDate: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea className="input-field resize-none" rows={2} placeholder="Any special requirements..."
                      value={booking.notes}
                      onChange={e => setBooking({ ...booking, notes: e.target.value })} />
                  </div>

                  {/* Add-ons selection */}
                  {equipment.addOns && equipment.addOns.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add-ons <span className="text-gray-400 font-normal text-xs">(optional)</span>
                      </label>
                      <div className="space-y-2">
                        {equipment.addOns.map((addon, idx) => {
                          const selected = selectedAddOns.some(a => a.name === addon.name);
                          return (
                            <button key={idx} type="button" onClick={() => toggleAddOn(addon)}
                              className={"w-full flex items-center justify-between rounded-xl border px-3 py-2.5 transition text-sm " + (selected ? "border-[#2d6a2d] bg-green-50" : "border-gray-200 bg-white hover:border-gray-300")}>
                              <div className="flex items-center gap-2.5">
                                <div className={"w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition " + (selected ? "border-[#2d6a2d] bg-[#2d6a2d]" : "border-gray-300")}>
                                  {selected && <span className="text-white text-xs leading-none font-bold">✓</span>}
                                </div>
                                <span className="text-gray-700">{addon.name}</span>
                              </div>
                              <span className={"font-semibold text-sm " + (selected ? "text-[#2d6a2d]" : "text-gray-400")}>
                                {addon.pricePerDay > 0 ? `+₹${addon.pricePerDay}/day` : "Free"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {totalDays > 0 && (
                    <div className="bg-green-50 rounded-xl p-3 text-sm space-y-1.5">
                      <div className="flex justify-between text-gray-600">
                        <span>₹{equipment.pricePerDay} × {totalDays} day{totalDays > 1 ? 's' : ''}</span>
                        <span>₹{totalDays * equipment.pricePerDay}</span>
                      </div>
                      {selectedAddOns.map((a, i) => (
                        <div key={i} className="flex justify-between text-gray-600">
                          <span>{a.name} × {totalDays} day{totalDays > 1 ? 's' : ''}</span>
                          <span>₹{a.pricePerDay * totalDays}</span>
                        </div>
                      ))}
                      {equipment.depositAmount > 0 && (
                        <div className="flex justify-between text-gray-600">
                          <span>Security Deposit</span>
                          <span>₹{equipment.depositAmount}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-green-200">
                        <span>Total Payable</span>
                        <span>₹{totalPrice + (equipment.depositAmount || 0)}</span>
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={bookingLoading || totalDays === 0 || dateConflict}
                    className="btn-primary w-full py-3">
                    {bookingLoading ? 'Creating Booking...' : '💳 Book & Pay'}
                  </button>
                  <p className="text-xs text-gray-400 text-center">You&apos;ll be prompted to pay after booking</p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const STATUS_COLORS = {
  payment_pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS = {
  payment_pending: '⏳ Awaiting Payment',
  confirmed: '✅ Confirmed',
  in_progress: '🚜 Delivered',
  completed: '🏁 Completed',
  cancelled: '❌ Cancelled',
  pending: 'Pending',
};

// Simple QR code display (same as equipment page)
function QRCodeDisplay({ qrToken }) {
  const size = 21;
  const cells = [];
  const seed = qrToken || 'default';
  for (let i = 0; i < size * size; i++) {
    const charIdx = i % seed.length;
    const val = seed.charCodeAt(charIdx);
    cells.push((val + i * 7 + Math.floor(i / size) * 3) % 3 === 0);
  }
  const isFinderPattern = (r, c) => {
    const inTL = r < 7 && c < 7, inTR = r < 7 && c >= size - 7, inBL = r >= size - 7 && c < 7;
    if (!inTL && !inTR && !inBL) return null;
    const lr = inTL ? r : (inBL ? r - (size - 7) : r);
    const lc = inTL ? c : (inTR ? c - (size - 7) : c);
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) return true;
    return false;
  };
  return (
    <svg width="80" height="80" viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => {
          const fp = isFinderPattern(r, c);
          const filled = fp !== null ? fp : cells[r * size + c];
          return filled ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#1a1a1a" /> : null;
        })
      )}
    </svg>
  );
}

// QR Scanner Simulator for owners
function QRScannerModal({ bookings, onClose, onScanned }) {
  const [input, setInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');

  const simulateScan = async () => {
    if (!input.trim()) { setError('Enter a QR token to scan'); return; }
    setError('');
    setScanning(true);
    await new Promise(r => setTimeout(r, 1200));
    setScanning(false);

    // Find matching booking
    const match = bookings.find(b => b.qrToken === input.trim() && b.status === 'confirmed');
    if (!match) {
      setScanResult({ success: false, message: 'Invalid or already used QR code' });
      return;
    }
    setScanResult({ success: true, booking: match });
  };

  const confirmDelivery = async () => {
    if (!scanResult?.booking) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/bookings/${scanResult.booking._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ qrToken: input.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      onScanned(data.booking);
      onClose();
    } else {
      setError(data.error);
    }
  };

  // Auto-fill shortcut for demo
  const autoFill = (token) => { setInput(token); setScanResult(null); setError(''); };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-gray-900 text-white p-5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg">📷 QR Code Scanner</span>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
          </div>
          <p className="text-gray-400 text-sm mt-1">Scan borrower's QR code to confirm delivery</p>
        </div>

        <div className="p-5">
          {/* Camera simulator */}
          <div className="relative bg-gray-900 rounded-xl h-36 flex items-center justify-center mb-4 overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-green-400 to-blue-500" />
            {scanning ? (
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-green-400 text-sm font-mono">Scanning...</p>
              </div>
            ) : scanResult?.success ? (
              <div className="flex flex-col items-center gap-1 z-10">
                <div className="text-4xl">✅</div>
                <p className="text-green-400 text-sm font-semibold">QR Verified!</p>
              </div>
            ) : scanResult ? (
              <div className="flex flex-col items-center gap-1 z-10">
                <div className="text-4xl">❌</div>
                <p className="text-red-400 text-sm">{scanResult.message}</p>
              </div>
            ) : (
              <div className="z-10 text-center">
                <div className="text-4xl mb-1">📷</div>
                <p className="text-gray-400 text-xs">Camera view (simulated)</p>
                <div className="w-20 h-20 border-2 border-dashed border-green-400 mx-auto mt-2 rounded" />
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">QR Token (paste or type)</label>
            <div className="flex gap-2">
              <input className="input-field flex-1 font-mono text-sm" placeholder="Enter QR token..."
                value={input} onChange={e => { setInput(e.target.value); setScanResult(null); setError(''); }} />
              <button onClick={simulateScan} className="btn-primary px-4 shrink-0" disabled={scanning}>
                {scanning ? '...' : 'Scan'}
              </button>
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}

          {/* Quick-fill from confirmed bookings */}
          {bookings.filter(b => b.status === 'confirmed').length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">📋 Confirmed Bookings (click to scan)</p>
              <div className="space-y-2">
                {bookings.filter(b => b.status === 'confirmed').map(b => (
                  <button key={b._id} onClick={() => autoFill(b.qrToken)}
                    className="w-full text-left bg-white rounded-lg p-2.5 border border-blue-100 hover:border-blue-300 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{b.equipment?.title}</p>
                        <p className="text-xs text-gray-500">Borrower: {b.borrower?.name}</p>
                      </div>
                      <div className="bg-white border border-gray-200 rounded p-1">
                        <QRCodeDisplay qrToken={b.qrToken} />
                      </div>
                    </div>
                    <p className="text-xs font-mono text-blue-500 mt-1 truncate">{b.qrToken}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {scanResult?.success && scanResult.booking && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="font-semibold text-green-800 mb-1">✅ Valid QR Code</p>
              <p className="text-sm text-gray-700"><strong>Equipment:</strong> {scanResult.booking.equipment?.title}</p>
              <p className="text-sm text-gray-700"><strong>Borrower:</strong> {scanResult.booking.borrower?.name}</p>
              <p className="text-sm text-gray-700"><strong>Booking ID:</strong> {scanResult.booking._id?.slice(-8)}</p>
              <button onClick={confirmDelivery} className="btn-primary w-full mt-3">
                ✅ Confirm Delivery
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking, viewAs, onStatusUpdate, onOpenScanner }) {
  const [updating, setUpdating] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bookings/${booking._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) onStatusUpdate();
    } catch { console.error('Update failed'); }
    finally { setUpdating(false); }
  };

  const eq = booking.equipment;
  const start = new Date(booking.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const end = new Date(booking.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link href={`/equipment/${eq?._id}`} className="font-semibold text-gray-900 hover:text-[#2d6a2d]">
            {eq?.title || 'Equipment'}
          </Link>
          <p className="text-sm text-gray-400">{eq?.location}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[booking.status]}`}>
          {STATUS_LABELS[booking.status] || booking.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm mb-4">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Dates</p>
          <p className="font-medium text-gray-700 text-xs">{start} → {end}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Duration</p>
          <p className="font-medium text-gray-700">{booking.totalDays} days</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-xs text-gray-400 mb-0.5">Total</p>
          <p className="font-medium text-[#2d6a2d]">₹{booking.totalPrice}</p>
        </div>
      </div>

      {/* Payment status */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
          booking.paymentStatus === 'refunded' ? 'bg-gray-100 text-gray-600' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          💳 {booking.paymentStatus === 'paid' ? 'Paid' : booking.paymentStatus === 'refunded' ? 'Refunded' : 'Unpaid'}
        </span>
        {booking.paymentMethod && (
          <span className="text-xs text-gray-400 capitalize">{booking.paymentMethod}</span>
        )}
        {booking.paymentTransactionId && (
          <span className="text-xs text-gray-300 font-mono">{booking.paymentTransactionId}</span>
        )}
      </div>

      {booking.deliveredAt && (
        <p className="text-xs text-purple-600 mb-3">
          📦 Delivered: {new Date(booking.deliveredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}

      <div className="text-xs text-gray-400 mb-3">
        {viewAs === 'borrower'
          ? `Owner: ${booking.owner?.name} · ${booking.owner?.phone || ''}`
          : `Borrower: ${booking.borrower?.name} · ${booking.borrower?.phone || ''}`}
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Borrower: show QR if confirmed */}
        {viewAs === 'borrower' && booking.status === 'confirmed' && booking.qrToken && (
          <button onClick={() => setShowQR(v => !v)}
            className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
            {showQR ? 'Hide QR' : '📱 Show QR Code'}
          </button>
        )}

        {/* Owner: scan QR to deliver */}
        {viewAs === 'owner' && booking.status === 'confirmed' && (
          <button onClick={onOpenScanner}
            className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition">
            📷 Scan QR (Deliver)
          </button>
        )}

        {/* Owner: mark complete after delivery */}
        {viewAs === 'owner' && booking.status === 'in_progress' && (
          <button onClick={() => handleUpdate('completed')} disabled={updating}
            className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
            🏁 Mark as Completed
          </button>
        )}

        {/* Cancel options */}
        {viewAs === 'owner' && ['payment_pending', 'confirmed'].includes(booking.status) && (
          <button onClick={() => handleUpdate('cancelled')} disabled={updating}
            className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
            Cancel
          </button>
        )}
        {viewAs === 'borrower' && ['payment_pending', 'confirmed'].includes(booking.status) && (
          <button onClick={() => handleUpdate('cancelled')} disabled={updating}
            className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
            Cancel Booking
          </button>
        )}

        {/* Leave review */}
        {viewAs === 'borrower' && booking.status === 'completed' && (
          <Link href={`/review/new?bookingId=${booking._id}&equipmentId=${eq?._id}`}
            className="text-xs bg-[#f0f7f0] text-[#2d6a2d] border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition inline-block">
            ⭐ Leave a Review
          </Link>
        )}

        {viewAs === 'owner' && booking.status === 'completed' && (
          <Link href={`/review/new?bookingId=${booking._id}&equipmentId=${eq?._id}`}
            className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition inline-block">
            ⭐ Rate Borrower
          </Link>
        )}
      </div>

      {/* QR code expandable for borrower */}
      {showQR && booking.qrToken && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-700 mb-3">Your Delivery QR Code</p>
          <div className="bg-white border-2 border-[#2d6a2d] rounded-xl p-3 inline-flex">
            <QRCodeDisplay qrToken={booking.qrToken} />
          </div>
          <p className="text-xs text-gray-500 mt-2 font-mono">{booking.qrToken}</p>
          <p className="text-xs text-gray-400 mt-1 text-center">Show this to the owner when equipment is delivered</p>
        </div>
      )}
    </div>
  );
}

const EQUIPMENT_STATUS_COLORS = {
  available: 'bg-green-100 text-green-700',
  in_use: 'bg-purple-100 text-purple-700',
  inspection: 'bg-orange-100 text-orange-700',
  maintenance: 'bg-red-100 text-red-700',
};

function EquipmentCard({ item, onRelist }) {
  const [relisting, setRelisting] = useState(false);
  const handleRelist = async () => {
    setRelisting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/equipment/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'available' }),
      });
      if (res.ok) onRelist();
    } catch { console.error('Relist failed'); }
    finally { setRelisting(false); }
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <Link href={`/equipment/${item._id}`} className="font-semibold text-gray-900 hover:text-[#2d6a2d]">
            {item.title}
          </Link>
          <p className="text-sm text-gray-400 mt-1">{item.location}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${EQUIPMENT_STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
          {item.status.replace('_', ' ')}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-gray-500 capitalize">{item.category}</span>
        <span className="font-semibold text-[#2d6a2d]">₹{item.pricePerDay}/day</span>
      </div>
      <div className="flex gap-2">
        <Link href={`/equipment/${item._id}`} className="btn-secondary text-sm py-2 text-center flex-1">View</Link>
        {item.status !== 'available' && (
          <button type="button" onClick={handleRelist} disabled={relisting} className="btn-primary text-sm py-2 flex-1">
            {relisting ? 'Relisting...' : 'Relist'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState('borrower');
  const [bookings, setBookings] = useState([]);
  const [myEquipment, setMyEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const [bRes, eRes] = await Promise.all([
        fetch(`/api/bookings?role=${tab}`, { headers: { Authorization: `Bearer ${token}` } }),
        tab === 'owner' ? fetch('/api/equipment/mine', { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
      ]);
      const bData = await bRes.json();
      setBookings(bData.bookings || []);
      if (eRes) {
        const eData = await eRes.json();
        setMyEquipment(eData.equipment || []);
      }
    } catch { console.error('Fetch failed'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token) { router.push('/login'); return; }
    setUser(u);
  }, [router]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const stats = {
    total: bookings.length,
    active: bookings.filter(b => ['confirmed', 'in_progress'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
    earned: bookings.filter(b => b.status === 'completed').reduce((s, b) => s + b.totalPrice, 0),
  };

  const confirmedOwnerBookings = bookings.filter(b => b.status === 'confirmed');
  const showOwnerEquipment = tab === 'owner' && myEquipment.length > 0;

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />
      {showScanner && (
        <QRScannerModal
          bookings={bookings}
          onClose={() => setShowScanner(false)}
          onScanned={() => { setShowScanner(false); fetchData(); }}
        />
      )}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-400 text-sm">Welcome back, {user?.name} 👋</p>
          </div>
          <div className="flex gap-2">
            {tab === 'owner' && confirmedOwnerBookings.length > 0 && (
              <button onClick={() => setShowScanner(true)}
                className="btn-secondary text-sm py-2 flex items-center gap-1.5">
                📷 Scan QR
              </button>
            )}
            <Link href="/equipment/new" className="btn-primary">+ List Equipment</Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit mb-6">
          {['borrower', 'owner'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition capitalize ${
                tab === t ? 'bg-[#2d6a2d] text-white' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'borrower' ? '🔑 My Rentals' : '🚜 My Listings'}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Bookings', value: stats.total },
            { label: 'Active', value: stats.active },
            { label: 'Completed', value: stats.completed },
            { label: tab === 'borrower' ? 'Total Spent' : 'Total Earned', value: `₹${stats.earned}` },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-2xl font-bold text-[#2d6a2d]">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Owner QR scanner tip */}
        {tab === 'owner' && confirmedOwnerBookings.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <span className="text-2xl">📷</span>
            <div>
              <p className="font-semibold text-purple-800 text-sm">You have {confirmedOwnerBookings.length} confirmed booking{confirmedOwnerBookings.length > 1 ? 's' : ''} ready for delivery</p>
              <p className="text-xs text-purple-600 mt-0.5">Click &quot;Scan QR&quot; above to verify and deliver equipment to borrowers.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-36" />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No bookings yet</h3>
            {tab === 'borrower' ? (
              <>
                <p className="text-gray-400 mb-4">Browse the marketplace to rent equipment.</p>
                <Link href="/marketplace" className="btn-primary">Browse Marketplace</Link>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-4">List your equipment to start receiving bookings.</p>
                <Link href="/equipment/new" className="btn-primary">List Equipment</Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <BookingCard
                key={b._id}
                booking={b}
                viewAs={tab}
                onStatusUpdate={fetchData}
                onOpenScanner={() => setShowScanner(true)}
              />
            ))}
          </div>
        )}

        {showOwnerEquipment && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">My Equipment</h2>
                <p className="text-sm text-gray-400">Manage your listings. Equipment stays bookable even while in use.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myEquipment.map(item => (
                <EquipmentCard key={item._id} item={item} onRelist={fetchData} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

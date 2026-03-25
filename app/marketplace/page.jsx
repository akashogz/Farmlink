'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const CATEGORIES = ['all', 'tractor', 'harvester', 'irrigation', 'plowing', 'seeding', 'spraying', 'other'];
const CATEGORY_ICONS = {
  tractor: '🚜', harvester: '🌾', irrigation: '💧', plowing: '⛏️',
  seeding: '🌱', spraying: '🪣', other: '🔧', all: '🏪',
};

function distanceLabel(km) {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

function EquipmentCard({ item }) {
  const isInUse = item.status === 'in_use';
  const dist = distanceLabel(item.distanceKm);
  return (
    <Link href={`/equipment/${item._id}`}>
      <div className="card hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col relative">
        {isInUse && (
          <div className="absolute top-3 left-3 z-10 bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow">
            In Use
          </div>
        )}
        {dist && (
          <div className="absolute top-3 right-3 z-10 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
            📍 {dist}
          </div>
        )}
        <div className="h-44 bg-gradient-to-br from-green-100 to-emerald-50 relative overflow-hidden flex items-center justify-center text-6xl">
          {item.images && item.images.length > 0 ? (
            <Image src={item.images[0]} alt={item.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          ) : (
            <span>{CATEGORY_ICONS[item.category] || '🔧'}</span>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-semibold text-gray-900 leading-tight">{item.title}</h3>
            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full capitalize ml-2 shrink-0">
              {item.category}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-3 line-clamp-2 flex-1">{item.description}</p>
          <div className="flex items-center text-xs text-gray-400 mb-3">
            <span>📍 {item.location}</span>
            {item.owner?.name && <span className="ml-auto">by {item.owner.name}</span>}
          </div>
          {item.rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <span className="text-yellow-400 text-sm">{'★'.repeat(Math.round(item.rating))}{'☆'.repeat(5 - Math.round(item.rating))}</span>
              <span className="text-xs text-gray-400">({item.totalReviews})</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-3 border-t border-gray-50">
            <div>
              <span className="text-xl font-bold text-[#2d6a2d]">₹{item.pricePerDay}</span>
              <span className="text-gray-400 text-sm">/day</span>
            </div>
            {item.depositAmount > 0 && (
              <span className="text-xs text-gray-400">₹{item.depositAmount} deposit</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function MarketplacePage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [userCoords, setUserCoords] = useState(null); // { lat, lng }
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | detecting | granted | denied
  const [sortBy, setSortBy] = useState('distance'); // distance | newest | price_asc | price_desc

  // Try to get user location on mount (silently)
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => setLocationStatus('denied'),
      { timeout: 6000 }
    );
  }, []);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (search) params.set('search', search);
      if (userCoords) {
        params.set('lat', userCoords.lat);
        params.set('lng', userCoords.lng);
      }
      const res = await fetch(`/api/equipment?${params}`);
      const data = await res.json();
      let items = data.equipment || [];

      // Client-side sort (backend already sorts by distance if coords given)
      if (sortBy === 'price_asc') items = [...items].sort((a, b) => a.pricePerDay - b.pricePerDay);
      else if (sortBy === 'price_desc') items = [...items].sort((a, b) => b.pricePerDay - a.pricePerDay);
      else if (sortBy === 'newest') items = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      // 'distance' is already handled server-side

      setEquipment(items);
    } catch { console.error('Failed to load equipment'); }
    finally { setLoading(false); }
  }, [category, search, userCoords, sortBy]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetchEquipment();
  }, [fetchEquipment, router]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setLocationStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationStatus('granted');
      },
      () => setLocationStatus('denied'),
      { timeout: 8000 }
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />

      {/* Hero strip */}
      <div className="bg-[#2d6a2d] text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Farm Equipment Marketplace</h1>
          <p className="text-green-200 mb-5">Rent quality agricultural equipment from owners near you</p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <input
              className="flex-1 px-4 py-2.5 rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="Search by name, type, or location..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type="submit" className="bg-white text-[#2d6a2d] font-semibold px-5 py-2.5 rounded-lg hover:bg-green-50 transition">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Location banner */}
        {locationStatus === 'denied' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-800 flex items-center justify-between gap-2">
            <span>📍 Allow location access to see equipment sorted by distance from you</span>
            <button onClick={requestLocation} className="shrink-0 text-xs bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg font-medium transition">
              Enable
            </button>
          </div>
        )}
        {locationStatus === 'granted' && (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mb-4 text-sm text-green-700 flex items-center gap-2">
            <span>✅ Showing equipment sorted by distance from your location</span>
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 items-center justify-between mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition shrink-0 ${
                  category === cat
                    ? 'bg-[#2d6a2d] text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-[#2d6a2d]'
                }`}>
                <span>{CATEGORY_ICONS[cat]}</span>
                <span className="capitalize">{cat}</span>
              </button>
            ))}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="input-field w-auto text-sm py-1.5 shrink-0">
            <option value="distance">📍 Nearest first</option>
            <option value="newest">🆕 Newest first</option>
            <option value="price_asc">₹ Price: Low to High</option>
            <option value="price_desc">₹ Price: High to Low</option>
          </select>
        </div>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-5 text-sm text-blue-700 flex items-center gap-2">
          <span>ℹ️</span>
          <span>Equipment marked <strong>In Use</strong> can still be booked for future dates.</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <div key={i} className="card animate-pulse h-72" />)}
          </div>
        ) : equipment.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No equipment found</h3>
            <p className="text-gray-400 mb-4">Try a different category or search term.</p>
            <button onClick={() => { setCategory('all'); setSearch(''); setSearchInput(''); }} className="btn-secondary">
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">{equipment.length} listing{equipment.length !== 1 ? 's' : ''} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {equipment.map(item => <EquipmentCard key={item._id} item={item} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

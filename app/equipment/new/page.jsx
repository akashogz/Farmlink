'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Navbar from '@/components/Navbar';

const CATEGORIES = ['tractor', 'harvester', 'irrigation', 'plowing', 'seeding', 'spraying', 'other'];
const CATEGORY_ICONS = { tractor:'🚜', harvester:'🌾', irrigation:'💧', plowing:'⛏️', seeding:'🌱', spraying:'🪣', other:'🔧' };

const SPEC_PRESETS = {
  tractor:   [{ field:'HP', value:'' }, { field:'Year', value:'' }, { field:'Fuel Type', value:'Diesel' }, { field:'Brand', value:'' }, { field:'Drive', value:'2WD' }],
  harvester: [{ field:'Cutting Width', value:'' }, { field:'Year', value:'' }, { field:'Brand', value:'' }, { field:'Engine HP', value:'' }],
  irrigation:[{ field:'Flow Rate', value:'' }, { field:'Pipe Length', value:'' }, { field:'Power Source', value:'' }, { field:'Coverage Area', value:'' }],
  plowing:   [{ field:'Working Width', value:'' }, { field:'Depth', value:'' }, { field:'Year', value:'' }, { field:'Brand', value:'' }],
  seeding:   [{ field:'Row Count', value:'' }, { field:'Seed Types', value:'' }, { field:'Year', value:'' }],
  spraying:  [{ field:'Tank Capacity', value:'' }, { field:'Boom Width', value:'' }, { field:'Power Source', value:'' }],
  other:     [{ field:'Brand', value:'' }, { field:'Year', value:'' }, { field:'Condition', value:'' }],
};

const ADDON_SUGGESTIONS = ['Fuel', 'Operator / Driver', 'Transport to site', 'Trailer', 'Insurance', 'Tool kit'];

export default function NewEquipmentPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const locationDebounce = useRef(null);

  const [form, setForm] = useState({ title:'', category:'tractor', description:'', pricePerDay:'', depositAmount:'', location:'' });
  const [specs, setSpecs] = useState(SPEC_PRESETS['tractor']);
  const [addOns, setAddOns] = useState([]);
  const [addOnInput, setAddOnInput] = useState({ name:'', pricePerDay:'' });
  const [coordinates, setCoordinates] = useState(null);
  const [geoStatus, setGeoStatus] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!localStorage.getItem('token')) router.push('/login'); }, [router]);

  const handleCategoryChange = (cat) => {
    setForm(f => ({ ...f, category: cat }));
    const preset = SPEC_PRESETS[cat] || [];
    setSpecs(preset.map(p => { const ex = specs.find(s => s.field === p.field); return ex || p; }));
  };

  const updateSpec = (idx, key, val) => setSpecs(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s));
  const addSpecRow = () => setSpecs(prev => [...prev, { field:'', value:'' }]);
  const removeSpec = (idx) => setSpecs(prev => prev.filter((_, i) => i !== idx));

  const addAddOn = () => {
    if (!addOnInput.name.trim()) return;
    setAddOns(prev => [...prev, { name: addOnInput.name.trim(), pricePerDay: Number(addOnInput.pricePerDay) || 0 }]);
    setAddOnInput({ name:'', pricePerDay:'' });
  };
  const removeAddOn = (idx) => setAddOns(prev => prev.filter((_, i) => i !== idx));

  const detectLocation = () => {
    if (!navigator.geolocation) { setGeoStatus('error'); return; }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setCoordinates({ lat, lng });
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();
        const addr = data.address;
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const loc = [city, state].filter(Boolean).join(', ');
        if (loc) setForm(f => ({ ...f, location: loc }));
      } catch {}
      setGeoStatus('found');
    }, () => setGeoStatus('error'), { timeout: 8000 });
  };

  const geocodeLocation = async (query) => {
    if (!query || query.length < 3) { setLocationSuggestions([]); return; }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`, { headers: { 'Accept-Language': 'en' } });
      const results = await res.json();
      setLocationSuggestions(results.slice(0, 5));
      setShowSuggestions(true);
    } catch {}
  };

  const handleLocationChange = (val) => {
    setForm(f => ({ ...f, location: val }));
    setCoordinates(null);
    if (locationDebounce.current) clearTimeout(locationDebounce.current);
    locationDebounce.current = setTimeout(() => geocodeLocation(val), 500);
  };

  const handleSuggestionPick = (s) => {
    const addr = s.address;
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || '';
    const display = [city, state].filter(Boolean).join(', ') || s.display_name.split(',').slice(0, 2).join(',');
    setForm(f => ({ ...f, location: display }));
    setCoordinates({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setLocationSuggestions([]);
    setShowSuggestions(false);
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (images.length + files.length > 5) { setError('Maximum 5 images allowed'); return; }
    setUploading(true);
    setError('');
    const token = localStorage.getItem('token');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) { setError(`${file.name} exceeds 10MB`); continue; }
      const tempId = Date.now() + i;
      setUploadingFiles(prev => [...prev, tempId]);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: fd });
        const data = await res.json();
        if (!res.ok) setError(`Upload failed: ${data.error || 'Unknown error'}`);
        else setImages(prev => [...prev, { url: data.url, publicId: data.publicId }]);
      } catch (err) { setError(`Upload failed: ${err.message}`); }
      finally { setUploadingFiles(prev => prev.filter(id => id !== tempId)); }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (idx) => setImages(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (images.length === 0) {
      setError('Please upload at least one photo of your equipment.');
      return;
    }
    setLoading(true);
    try {
      const specifications = {};
      specs.forEach(s => { if (s.field.trim() && s.value.trim()) specifications[s.field.trim()] = s.value.trim(); });

      const token = localStorage.getItem('token');
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          pricePerDay: Number(form.pricePerDay),
          depositAmount: Number(form.depositAmount) || 0,
          specifications,
          addOns,
          images: images.map(img => img.url),
          coordinates: coordinates || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      router.push(`/equipment/${data.equipment._id}`);
    } catch { setError('Something went wrong.'); }
    finally { setLoading(false); }
  };

  const totalSlots = images.length + uploadingFiles.length;

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">List Your Equipment</h1>
        <p className="text-gray-500 mb-8">Fill in the details to make it discoverable to farmers near you.</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-5 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Photos ── */}
          <div className="card p-6">
            <label className="block text-sm font-medium text-gray-700 mb-0.5">
              Equipment Photos <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-3">At least 1 required · up to 5 · max 10MB each · first image is cover</p>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100">
                  <Image src={img.url} alt={`Equipment ${idx + 1}`} fill className="object-cover" />
                  <button type="button" onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center font-bold shadow">×</button>
                  {idx === 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 py-0.5 rounded leading-none">Cover</span>}
                </div>
              ))}
              {uploadingFiles.map(id => (
                <div key={id} className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center border border-dashed border-gray-200">
                  <div className="w-5 h-5 border-2 border-[#2d6a2d] border-t-transparent rounded-full animate-spin" />
                </div>
              ))}
              {totalSlots < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#2d6a2d] hover:text-[#2d6a2d] transition disabled:opacity-50">
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-xs">Photo</span>
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
            {images.length === 0 && !uploading && (
              <p className="text-xs text-amber-500">⚠️ At least one photo is required to list equipment</p>
            )}
            {images.length > 0 && (
              <p className="text-xs text-green-600">✅ {images.length} image{images.length > 1 ? 's' : ''} uploaded</p>
            )}
          </div>

          {/* ── Basic Details ── */}
          <div className="card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Equipment Title *</label>
              <input type="text" className="input-field" placeholder="e.g. John Deere 5050D Tractor"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                <select className="input-field" value={form.category} onChange={e => handleCategoryChange(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location *{' '}
                  {geoStatus === 'found' && <span className="text-green-500 text-xs">📍 GPS set</span>}
                  {geoStatus === 'detecting' && <span className="text-gray-400 text-xs">Detecting...</span>}
                </label>
                <div className="flex gap-1.5">
                  <input type="text" className="input-field flex-1" placeholder="Village, City or District"
                    value={form.location}
                    onChange={e => handleLocationChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    required />
                  <button type="button" onClick={detectLocation} title="Use my current location"
                    className="shrink-0 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#2d6a2d] hover:border-[#2d6a2d] transition">📍</button>
                </div>
                {coordinates && <p className="text-xs text-green-600 mt-1">✅ GPS coordinates set</p>}
                {!coordinates && form.location.length > 2 && geoStatus !== 'found' && (
                  <p className="text-xs text-amber-500 mt-1">⚠️ Pick a suggestion or tap 📍 for GPS</p>
                )}
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {locationSuggestions.map((s, i) => (
                      <button key={i} type="button" onMouseDown={() => handleSuggestionPick(s)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 border-b border-gray-50 last:border-0">
                        📍 {s.display_name.split(',').slice(0, 3).join(', ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
              <textarea className="input-field resize-none" rows={3} placeholder="Describe condition, usage, any included accessories..."
                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price per Day (₹) *</label>
                <input type="number" className="input-field" placeholder="500" min="1"
                  value={form.pricePerDay} onChange={e => setForm({ ...form, pricePerDay: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Security Deposit (₹)</label>
                <input type="number" className="input-field" placeholder="0 (optional)" min="0"
                  value={form.depositAmount} onChange={e => setForm({ ...form, depositAmount: e.target.value })} />
              </div>
            </div>
          </div>

          {/* ── Specifications ── */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-medium text-gray-700">Specifications</h2>
                <p className="text-xs text-gray-400 mt-0.5">Key technical details about your equipment</p>
              </div>
              <button type="button" onClick={addSpecRow}
                className="text-xs text-[#2d6a2d] font-medium hover:underline">+ Add row</button>
            </div>
            <div className="space-y-2">
              {specs.map((spec, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="text" className="input-field flex-1 text-sm" placeholder="Field (e.g. HP)"
                    value={spec.field} onChange={e => updateSpec(idx, 'field', e.target.value)} />
                  <input type="text" className="input-field flex-1 text-sm" placeholder="Value (e.g. 50)"
                    value={spec.value} onChange={e => updateSpec(idx, 'value', e.target.value)} />
                  <button type="button" onClick={() => removeSpec(idx)}
                    className="text-gray-300 hover:text-red-400 transition text-xl leading-none px-1 shrink-0">×</button>
                </div>
              ))}
            </div>
            {specs.length === 0 && (
              <p className="text-xs text-gray-300 text-center py-3">No specs yet. Click &quot;+ Add row&quot; to add one.</p>
            )}
          </div>

          {/* ── Add-ons ── */}
          <div className="card p-6">
            <div className="mb-3">
              <h2 className="text-sm font-medium text-gray-700">Add-ons <span className="text-gray-400 font-normal">(optional)</span></h2>
              <p className="text-xs text-gray-400 mt-0.5">Extra services or items renters can add to their booking</p>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {ADDON_SUGGESTIONS.filter(s => !addOns.find(a => a.name === s)).map(s => (
                <button key={s} type="button" onClick={() => setAddOnInput(prev => ({ ...prev, name: s }))}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-[#2d6a2d] transition">
                  + {s}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-3">
              <input type="text" className="input-field flex-1 text-sm" placeholder="Add-on name (e.g. Fuel)"
                value={addOnInput.name} onChange={e => setAddOnInput(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAddOn())} />
              <div className="relative shrink-0">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input type="number" className="input-field pl-7 w-28 text-sm" placeholder="0/day" min="0"
                  value={addOnInput.pricePerDay} onChange={e => setAddOnInput(prev => ({ ...prev, pricePerDay: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAddOn())} />
              </div>
              <button type="button" onClick={addAddOn} disabled={!addOnInput.name.trim()}
                className="btn-primary text-sm px-4 disabled:opacity-40 shrink-0">Add</button>
            </div>

            {addOns.length > 0 && (
              <div className="space-y-2">
                {addOns.map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2.5">
                    <span className="text-sm text-gray-700 font-medium">{a.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#2d6a2d] font-semibold">
                        {a.pricePerDay > 0 ? `+₹${a.pricePerDay}/day` : 'Free / Included'}
                      </span>
                      <button type="button" onClick={() => removeAddOn(idx)}
                        className="text-gray-300 hover:text-red-400 transition text-xl leading-none">×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {addOns.length === 0 && (
              <p className="text-xs text-gray-300 text-center py-2">No add-ons yet. Use suggestions above or type your own.</p>
            )}
          </div>

          <button type="submit" disabled={loading || uploading} className="btn-primary w-full py-3 text-base">
            {loading ? 'Listing...' : uploading ? 'Wait for uploads...' : '🚜 List Equipment'}
          </button>
        </form>
      </div>
    </div>
  );
}

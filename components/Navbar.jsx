'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem('token'));
    setUser(JSON.parse(localStorage.getItem('user') || 'null'));
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const linkCls = (href) =>
    `text-sm font-medium px-3 py-1.5 rounded-lg transition ${
      pathname === href ? 'bg-[#f0f7f0] text-[#2d6a2d]' : 'text-gray-600 hover:text-[#2d6a2d]'
    }`;

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          <Link href="/marketplace" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🌾</span>
            <span className="font-bold text-xl text-[#2d6a2d]">FarmLink</span>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            {token ? (
              <>
                <Link href="/marketplace" className={linkCls('/marketplace')}>Marketplace</Link>
                <Link href="/dashboard" className={linkCls('/dashboard')}>Dashboard</Link>
                <Link href="/equipment/new" className="btn-primary text-sm py-2">+ List Equipment</Link>
                <div className="flex items-center gap-2 ml-1 pl-3 border-l border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-[#2d6a2d] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 transition">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm py-2">Login</Link>
                <Link href="/register" className="btn-primary text-sm py-2">Register</Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 shadow-md">
          {token ? (
            <>
              <Link href="/marketplace" className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition ${pathname === '/marketplace' ? 'bg-[#f0f7f0] text-[#2d6a2d]' : 'text-gray-600 hover:bg-gray-50'}`}>
                🏪 Marketplace
              </Link>
              <Link href="/dashboard" className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition ${pathname === '/dashboard' ? 'bg-[#f0f7f0] text-[#2d6a2d]' : 'text-gray-600 hover:bg-gray-50'}`}>
                📋 Dashboard
              </Link>
              <Link href="/equipment/new" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-center bg-[#2d6a2d] text-white mt-1">
                + List Equipment
              </Link>
              <div className="flex items-center justify-between px-3 py-2.5 mt-1 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#2d6a2d] text-white flex items-center justify-center text-xs font-bold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{user?.name}</span>
                </div>
                <button onClick={handleLogout} className="text-sm text-red-500 font-medium">Logout</button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-center border border-[#2d6a2d] text-[#2d6a2d]">Login</Link>
              <Link href="/register" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-center bg-[#2d6a2d] text-white">Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

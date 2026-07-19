'use client';

import { useEffect, useState } from 'react';

const COUNTRIES: Record<string, { name: string; flag: string; currency: string }> = {
  KGZ: { name: "Qirg'iziston", flag: '🇰🇬', currency: 'KGS' },
  KAZ: { name: 'Qozog\'iston', flag: '🇰🇿', currency: 'KZT' },
  TJK: { name: 'Tojikiston', flag: '🇹🇯', currency: 'TJS' },
  RUS: { name: 'Rossiya', flag: '🇷🇺', currency: 'RUB' },
};

export default function CrossborderPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    loadListings();
  }, [country]);

  const loadListings = async () => {
    setLoading(true);
    try {
      let url = '/api/crossborder/listings?limit=30';
      if (country) url += `&country=${country}`;
      const res = await fetch(url);
      const d = await res.json();
      if (d.listings) setListings(d.listings);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border-primary)' }}>
        <div className="max-w-5xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 text-lg font-bold no-underline" style={{ color: 'var(--text-primary)' }}>
            <svg viewBox="0 0 36 36" fill="none" style={{ width: 28, height: 28 }}>
              <defs><linearGradient id="lgCb" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgCb)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full border-none cursor-pointer transition" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>🌍 Cross-Border Savdo</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>KGZ, KAZ, TJK va RUS bozorlariga chiqing</p>
        </div>

        {/* Country Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[{ code: '', name: 'Barcha', flag: '🌍' }, ...Object.entries(COUNTRIES).map(([code, info]) => ({ code, ...info }))].map(c => (
            <button key={c.code} onClick={() => setCountry(c.code)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full border transition cursor-pointer"
              style={{
                background: country === c.code ? 'var(--accent)' : 'var(--surface)',
                borderColor: country === c.code ? 'var(--accent)' : 'var(--border-primary)',
                color: country === c.code ? 'white' : 'var(--text-secondary)',
              }}>
              {c.flag} {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="h-4 w-24 rounded mb-3" style={{ background: 'var(--surface-hover)' }} />
                <div className="h-6 w-32 rounded mb-2" style={{ background: 'var(--surface-hover)' }} />
                <div className="h-4 w-20 rounded" style={{ background: 'var(--surface-hover)' }} />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-3xl mb-3">🌍</div>
            <p>Hozircha cross-border listinglar yo'q</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {listings.map((l: any) => (
              <div key={l.id} className="p-5 rounded-xl border transition hover:-translate-y-1 hover:shadow-md"
                style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg">{l.country_flag}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: l.is_active ? 'rgba(16,185,129,0.1)' : 'var(--surface-hover)', color: l.is_active ? '#10b981' : 'var(--text-tertiary)' }}>
                    {l.is_active ? 'Faol' : 'Arxiv'}
                  </span>
                </div>
                <h3 className="text-sm font-bold mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>{l.lot_title}</h3>
                <div className="space-y-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <div>💰 {l.lot_price?.toLocaleString()} so'm</div>
                  <div>📦 Yetkazish: {l.shipping_formatted || `${l.shipping_cost?.toLocaleString()} so'm`}</div>
                  <div>👤 {l.seller_name}</div>
                </div>
                <div className="mt-3 pt-3 border-t text-center" style={{ borderColor: 'var(--border-primary)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                    {l.country_name} ({l.currency})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface ReviewData {
  reviews: {
    id: number; rating: number; text: string; created_at: string;
    media_type: string; is_verified_purchase: boolean;
    lot: { id: number; title: string; category: string } | null;
    buyer: { name: string };
    seller: { id: number; name: string; rating: number; is_verified: boolean } | null;
  }[];
  count: number; total: number; avg_rating: number;
  rating_distribution: Record<string, number>;
}

export default function ReviewsPage() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  const load = async (rating?: number | null) => {
    setLoading(true);
    try {
      let url = '/api/reviews?limit=50';
      if (rating) url += `&min_rating=${rating}`;
      const res = await fetch(url);
      const d = await res.json();
      if (d.ok) setData(d);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    load();
  }, []);

  useEffect(() => { load(minRating); }, [minRating]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const maxDist = data ? Math.max(...Object.values(data.rating_distribution), 1) : 1;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border-primary)' }}>
        <div className="max-w-5xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 text-lg font-bold no-underline" style={{ color: 'var(--text-primary)' }}>
            <svg viewBox="0 0 36 36" fill="none" style={{ width: 28, height: 28 }}>
              <defs><linearGradient id="lgRv" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgRv)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            <a href="/analytics" className="px-3 py-2 text-sm rounded-lg no-underline transition hover:bg-surface-hover" style={{ color: 'var(--text-secondary)' }}>Analytics</a>
            <a href="/leaderboard" className="px-3 py-2 text-sm rounded-lg no-underline transition hover:bg-surface-hover" style={{ color: 'var(--text-secondary)' }}>Reyting</a>
            <a href="/reviews" className="px-3 py-2 text-sm font-semibold rounded-lg no-underline" style={{ color: 'var(--accent)', background: 'var(--accent-50)' }}>Sharhlar</a>
          </nav>
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full border-none cursor-pointer transition" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden fixed top-3 right-3 flex-col gap-1.5 p-2 rounded-md z-50 bg-none border-none cursor-pointer" style={{ background: 'var(--surface)' }}>
          <span className={`block w-5 h-0.5 transition ${mobileMenu ? 'rotate-45 translate-y-1.5' : ''}`} style={{ background: 'var(--text-primary)' }} />
          <span className={`block w-5 h-0.5 transition ${mobileMenu ? 'opacity-0' : ''}`} style={{ background: 'var(--text-primary)' }} />
          <span className={`block w-5 h-0.5 transition ${mobileMenu ? '-rotate-45 -translate-y-1.5' : ''}`} style={{ background: 'var(--text-primary)' }} />
        </button>
      </header>

      {mobileMenu && (
        <nav className="fixed inset-0 z-40 flex flex-col justify-center items-center p-10" style={{ background: 'var(--surface)' }}>
          <div className="flex flex-col gap-4 text-center">
            <a href="/" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--text-secondary)' }}>🏠 Bosh</a>
            <a href="/analytics" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--text-secondary)' }}>📊 Analytics</a>
            <a href="/leaderboard" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--text-secondary)' }}>🏆 Reyting</a>
            <a href="/reviews" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--accent)', background: 'var(--accent-50)' }}>⭐ Sharhlar</a>
          </div>
        </nav>
      )}

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Sharhlar</span>
          <h1 className="text-2xl md:text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>⭐ Ishonchli sharhlar</h1>
        </div>

        {/* Stats + Distribution */}
        {data && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="p-5 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{data.avg_rating}</div>
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>O'rtacha baho</div>
              <div className="text-xs mt-1">{'⭐'.repeat(Math.round(data.avg_rating))}</div>
            </div>
            <div className="p-5 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{data.total}</div>
              <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Jami sharhlar</div>
            </div>
            <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              {[5, 4, 3, 2, 1].map(rating => {
                const cnt = data.rating_distribution[rating] || 0;
                const pct = (cnt / maxDist) * 100;
                return (
                  <div key={rating} className="flex items-center gap-2 py-1 text-xs">
                    <span className="w-4 shrink-0">{rating}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-primary)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: rating >= 4 ? '#10b981' : rating === 3 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <span className="w-8 text-right shrink-0" style={{ color: 'var(--text-tertiary)' }}>{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[null, 5, 4, 3, 2, 1].map(r => (
            <button key={String(r)} onClick={() => setMinRating(r)}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border transition cursor-pointer"
              style={{
                background: minRating === r ? 'var(--accent)' : 'var(--surface)',
                borderColor: minRating === r ? 'var(--accent)' : 'var(--border-primary)',
                color: minRating === r ? 'white' : 'var(--text-secondary)',
              }}>
              {r === null ? 'Barcha' : `⭐ ${r}+`}
            </button>
          ))}
        </div>

        {/* Reviews */}
        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full" style={{ background: 'var(--surface-hover)' }} />
                  <div className="flex-1">
                    <div className="h-4 w-24 rounded" style={{ background: 'var(--surface-hover)' }} />
                    <div className="h-3 w-16 rounded mt-1" style={{ background: 'var(--surface-hover)' }} />
                  </div>
                  <div className="h-4 w-12 rounded" style={{ background: 'var(--surface-hover)' }} />
                </div>
                <div className="h-4 w-3/4 rounded" style={{ background: 'var(--surface-hover)' }} />
              </div>
            ))}
          </div>
        ) : data && data.reviews.length > 0 ? data.reviews.map(r => (
          <div key={r.id} className="p-5 rounded-xl border mb-3 transition hover:-translate-y-0.5 hover:shadow-sm" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--surface-hover)' }}>
                  {r.buyer?.name?.charAt(0) || '👤'}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.buyer?.name || 'Noma\'lum'}</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {r.lot?.title?.substring(0, 50) || 'Lot'} 
                    {r.is_verified_purchase && <span className="ml-1 text-green-600">✅ Tasdiqlangan</span>}
                  </div>
                </div>
              </div>
              <div className="text-sm shrink-0">{'⭐'.repeat(r.rating)}</div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{r.text || 'Sharh matni yo\'q'}</p>
            {r.seller && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                Sotuvchi: <strong style={{ color: 'var(--text-primary)' }}>{r.seller.name}</strong>
                ⭐ {r.seller.rating}
                {r.seller.is_verified && ' ✅'}
              </div>
            )}
          </div>
        )) : (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">⭐</div>
            <p>Hozircha sharhlar yo'q</p>
          </div>
        )}
      </div>
    </div>
  );
}

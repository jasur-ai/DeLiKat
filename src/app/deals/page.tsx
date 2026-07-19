'use client';

import { useEffect, useState } from 'react';

interface Deal {
  id: number;
  lot_id: number;
  lot_title: string;
  lot_price: number;
  lot_category: string;
  lot_grade: string;
  lot_quantity: number;
  buyer_name: string;
  seller_name: string;
  amount: number;
  status: string;
  created_at: string;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  yakunlangan: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  kutilmoqda: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  bekor_qilingan: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    Promise.all([
      fetch('/api/deals').then(r => r.json()),
      fetch('/api/deals/stats').then(r => r.json()),
    ]).then(([d, s]) => {
      if (d.ok) setDeals(d.deals || []);
      if (s.ok) setStats(s.stats || s);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

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
              <defs><linearGradient id="lgD" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgD)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
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
            <a href="/deals" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--accent)', background: 'var(--accent-50)' }}>💰 Bitimlar</a>
          </div>
        </nav>
      )}

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Bitimlar</span>
          <h1 className="text-2xl md:text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>💰 Bitimlar tarixi</h1>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total || 0}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Jami bitimlar</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: '#10b981' }}>{stats.yakunlangan || 0}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Yakunlangan</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{stats.kutilmoqda || 0}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Kutilmoqda</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats.total_amount ? `${((stats.total_amount || 0) / 1e6).toFixed(1)} mln` : '—'}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Jami summa</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-4 rounded w-32" style={{ background: 'var(--surface-hover)' }} />
                  <div className="h-4 rounded w-16" style={{ background: 'var(--surface-hover)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">💰</div>
            <p>Hozircha bitimlar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deals.map(deal => {
              const ss = STATUS_STYLES[deal.status] || { bg: 'var(--surface-hover)', color: 'var(--text-secondary)' };
              return (
                <div key={deal.id} className="p-5 rounded-xl border transition hover:-translate-y-0.5 hover:shadow-sm" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <a href={`/lot/${deal.lot_id}`} className="text-sm font-semibold no-underline hover:underline" style={{ color: 'var(--text-primary)' }}>
                      {deal.lot_title}
                    </a>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                      {deal.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span>💰 {(deal.amount || 0).toLocaleString()} so'm</span>
                    <span>📦 {deal.lot_quantity || 0} dona</span>
                    <span>👤 Sotuvchi: {deal.seller_name || "Noma'lum"}</span>
                    <span>🏪 Xaridor: {deal.buyer_name || "Noma'lum"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Deal {
  id: number; lot_id: number; lot_title: string; lot_category: string; lot_grade: string;
  amount: number; quantity?: number; status: string;
  buyer: { id: number; name: string; rating: number };
  seller: { id: number; name: string; rating: number };
  created_at: string; completed_at?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  yakunlangan: { label: '✅ Yakunlangan', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  kutilmoqda: { label: '⏳ Kutilmoqda', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  bekor_qilingan: { label: '❌ Bekor qilingan', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  qabul: { label: '✅ Qabul qilingan', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  rad: { label: '❌ Rad etilgan', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln so'm`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} ming so'm`;
  return `${v.toLocaleString()} so'm`;
}

export default function DealDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    fetch('/api/deals?limit=200')
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          const found = (d.deals || []).find((tx: any) => String(tx.id) === id);
          setDeal(found || null);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const statusInfo = deal ? STATUS_MAP[deal.status] || { label: deal.status, color: 'var(--text-secondary)', bg: 'var(--surface-hover)' } : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border-primary)' }}>
        <div className="max-w-3xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 text-lg font-bold no-underline" style={{ color: 'var(--text-primary)' }}>
            <svg viewBox="0 0 36 36" fill="none" style={{ width: 28, height: 28 }}>
              <defs><linearGradient id="lgDl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgDl)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full border-none cursor-pointer transition" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="pt-24 pb-16 max-w-3xl mx-auto px-5">
        <a href="/deals" className="text-sm mb-4 inline-block no-underline hover:underline" style={{ color: 'var(--text-tertiary)' }}>
          ← Barcha bitimlar
        </a>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded" style={{ background: 'var(--surface-hover)' }} />
            <div className="h-4 w-64 rounded" style={{ background: 'var(--surface-hover)' }} />
            <div className="grid grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl" style={{ background: 'var(--surface-hover)' }} />)}
            </div>
          </div>
        ) : !deal ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">💰</div>
            <p className="text-lg mb-2">Bitim topilmadi</p>
            <a href="/deals" className="text-sm" style={{ color: 'var(--accent)' }}>← Barcha bitimlar</a>
          </div>
        ) : (
          <>
            {/* Deal Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">💰</span>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Bitim #{deal.id}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{deal.lot_title}</h1>
              <div className="flex items-center gap-3 mt-3">
                {statusInfo && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                    {statusInfo.label}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  📅 {deal.created_at ? new Date(deal.created_at).toLocaleDateString('uz-UZ') : '—'}
                </span>
                {deal.completed_at && (
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    🏁 {new Date(deal.completed_at).toLocaleDateString('uz-UZ')}
                  </span>
                )}
              </div>
            </div>

            {/* Amount Card */}
            <div className="p-8 rounded-2xl border mb-8 text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Bitim summasi</div>
              <div className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{fmtPrice(deal.amount)}</div>              {deal.quantity != null && deal.quantity > 0 && (
                  <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>📦 {deal.quantity} dona</div>
                )}
            </div>

            {/* Buyer & Seller Cards */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>🛍️ Xaridor</div>
                <a href={`/shop/${deal.buyer.id}`} className="flex items-center gap-3 no-underline">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--surface-hover)' }}>
                    {deal.buyer.name?.charAt(0) || '👤'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.buyer.name || 'Noma\'lum'}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>⭐ {deal.buyer.rating || 0}</div>
                  </div>
                </a>
              </div>
              <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>🏪 Sotuvchi</div>
                <a href={`/shop/${deal.seller.id}`} className="flex items-center gap-3 no-underline">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--surface-hover)' }}>
                    {deal.seller.name?.charAt(0) || '👤'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.seller.name || 'Noma\'lum'}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>⭐ {deal.seller.rating || 0}</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Lot Link */}
            <a href={`/lot/${deal.lot_id}`}
              className="flex items-center justify-between p-5 rounded-xl border no-underline transition hover:-translate-y-0.5 hover:shadow-sm"
              style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">📦</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.lot_title}</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{deal.lot_category} · {deal.lot_grade}</div>
                </div>
              </div>
              <span className="text-sm" style={{ color: 'var(--accent)' }}>Batafsil →</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}

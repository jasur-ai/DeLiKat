'use client';

import { useEffect, useState } from 'react';

interface LotDetail {
  id: number; title: string; category: string; description?: string;
  quantity: number; price: number; grade: string; status: string;
  image_file_id?: string; created_at: string; view_count: number;
  seller_name: string; seller_rating: number; seller_id: number;
  bid_count: number; bids: { id: number; price: number; quantity: number; buyer_name: string; status: string; created_at: string }[];
}

const CATEGORY_ICONS: Record<string, string> = { smartfon: '📱', notebook: '💻', tv: '📺', audio: '🎧', aksesuar: '🔌', kiyim: '👕' };
const GRADE_COLORS: Record<string, string> = { A: '#10b981', B: '#f59e0b', C: '#ef4444' };

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln so'm`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} ming so'm`;
  return `${v.toLocaleString()} so'm`;
}

export default function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [lot, setLot] = useState<LotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [bidQty, setBidQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    params.then(({ id }) => {
      fetch(`/api/lots/${id}`).then(r => r.json()).then(d => {
        if (d.ok !== false) setLot(d);
      }).catch(console.error).finally(() => setLoading(false));
    });
  }, [params]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleBid = async () => {
    if (!lot || !bidPrice) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lot_id: lot.id, price: parseFloat(bidPrice), quantity: parseInt(bidQty) || 1 }),
      });
      if (res.ok) { alert('✅ Taklif yuborildi!'); setBidPrice(''); } else { alert('❌ Xatolik yuz berdi'); }
    } catch { alert('❌ Xatolik'); } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border-primary)' }}>
        <div className="max-w-5xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 text-lg font-bold no-underline" style={{ color: 'var(--text-primary)' }}>
            <svg viewBox="0 0 36 36" fill="none" style={{ width: 28, height: 28 }}>
              <defs><linearGradient id="lgLd" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgLd)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full border-none cursor-pointer transition" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 rounded" style={{ background: 'var(--surface-hover)' }} />
            <div className="h-4 w-96 rounded" style={{ background: 'var(--surface-hover)' }} />
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--surface-hover)' }} />)}
            </div>
          </div>
        ) : !lot ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">📦</div>
            <p>Lot topilmadi</p>
            <a href="/" className="text-sm mt-4 inline-block" style={{ color: 'var(--accent)' }}>← Bosh sahifa</a>
          </div>
        ) : (
          <>
            <a href="/" className="text-sm mb-4 inline-block no-underline hover:underline" style={{ color: 'var(--text-tertiary)' }}>← Barcha lotlar</a>

            <div className="grid md:grid-cols-3 gap-6 mt-2">
              {/* Main Info */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{CATEGORY_ICONS[lot.category] || '📦'}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{lot.category}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{lot.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full" style={{
                      background: `${GRADE_COLORS[lot.grade]}15`,
                      color: GRADE_COLORS[lot.grade] || 'var(--text-secondary)',
                    }}>{lot.grade} — {lot.grade === 'A' ? 'Yangi' : lot.grade === 'B' ? 'Yaxshi' : 'Qoniqarli'}</span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>📅 {lot.created_at ? new Date(lot.created_at).toLocaleDateString('uz-UZ') : '—'}</span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>👁 {lot.view_count || 0}</span>
                  </div>
                </div>

                {lot.description && (
                  <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Tavsif</h3>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{lot.description}</p>
                  </div>
                )}

                {/* Bids */}
                <div>
                  <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Takliflar ({lot.bids?.length || 0})</h3>
                  {lot.bids && lot.bids.length > 0 ? (
                    <div className="space-y-2">
                      {lot.bids.map(b => (
                        <div key={b.id} className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{b.buyer_name || 'Noma\'lum'}</span>
                              <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>📦 {b.quantity} dona</span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmtPrice(b.price)}</div>
                              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{b.status}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 rounded-xl border" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                      <p className="text-sm">Hali takliflar yo'q. Birinchi bo'ling!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Price Card */}
                <div className="p-6 rounded-xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>Narx</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmtPrice(lot.price)}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{lot.quantity} dona mavjud</div>

                  {/* Bid Form */}
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Taklif yuborish</div>
                    <div className="flex gap-2 mb-2">
                      <input value={bidPrice} onChange={e => setBidPrice(e.target.value.replace(/[^0-9]/g, ''))}
                        type="text" placeholder="Narx" className="flex-1 px-3 py-2 text-sm border rounded-lg outline-none"
                        style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
                      <input value={bidQty} onChange={e => setBidQty(e.target.value.replace(/[^0-9]/g, ''))}
                        type="text" placeholder="Soni" className="w-16 px-2 py-2 text-sm border rounded-lg outline-none text-center"
                        style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
                    </div>
                    <button onClick={handleBid} disabled={submitting || !bidPrice}
                      className="w-full py-2.5 text-sm font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-50"
                      style={{ background: 'var(--accent)', color: 'white' }}>
                      {submitting ? 'Yuborilmoqda...' : 'Taklif yuborish'}
                    </button>
                  </div>
                </div>

                {/* Seller Card */}
                <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>Sotuvchi</div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--surface-hover)' }}>
                      {lot.seller_name?.charAt(0) || '👤'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lot.seller_name || 'Noma\'lum'}</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>⭐ {lot.seller_rating || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Telegram CTA */}
                <a href="https://t.me/DeLiKatbot" target="_blank"
                  className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold rounded-lg no-underline transition"
                  style={{ background: '#0088cc', color: 'white' }}>
                  ✈️ Telegram botda ochish
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

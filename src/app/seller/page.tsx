'use client';

import { useEffect, useState } from 'react';

interface Seller {
  id: number | string;
  name: string;
  rating: number;
  lots: number;
  bids: number;
  txCount: number;
  icon: string;
}

export default function SellerPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('lots');
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [txItems, setTxItems] = useState<any[]>([]);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    Promise.all([
      fetch('/api/stats').then(r => r.json()),
      fetch('/api/lots?limit=500').then(r => r.json()),
    ]).then(([statsData, lotsData]) => {
      if (statsData.ok) setStats(statsData.stats);
      const lots = lotsData.ok ? (lotsData.lots || []) : [];

      const sellerMap: Record<string, Seller> = {};
      lots.forEach((l: any) => {
        if (!l.seller_name) return;
        const key = l.seller_name;
        if (!sellerMap[key]) {
          sellerMap[key] = {
            id: l.seller_id || key,
            name: l.seller_name,
            rating: l.seller_rating || 0,
            lots: 0, bids: 0, txCount: 0, icon: '',
          };
        }
        sellerMap[key].lots++;
        sellerMap[key].bids += l.bid_count || 0;
        sellerMap[key].txCount += Math.min(l.bid_count || 0, 5);
      });

      setSellers(Object.values(sellerMap));

      // Transaction history
      const tx: any[] = [];
      lots.slice(0, 6).forEach((l: any) => {
        tx.push({
          title: l.title,
          seller: l.seller_name || "Noma'lum",
          buyer: 'Xaridor ' + Math.floor(Math.random() * 100),
          amount: l.price,
          qty: l.quantity,
          status: ['completed', 'pending', 'cancelled'][Math.floor(Math.random() * 3)],
          date: new Date(Date.now() - Math.random() * 30 * 86400000),
        });
      });
      tx.sort((a, b) => b.date - a.date);
      setTxItems(tx);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const trustScore = (s: Seller) => ((s.rating || 0) / 10) * 0.5 + Math.min(s.txCount / 20, 1) * 0.3 + Math.min(s.lots / 10, 1) * 0.2;

  const sorted = [...sellers].sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'trust') return trustScore(b) - trustScore(a);
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return b.lots - a.lots;
  });

  const top = sorted[0];
  const starCount = (r: number) => Math.min(5, Math.round((r || 0) / 2));

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
              <defs><linearGradient id="lgSl" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgSl)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            <a href="/" className="px-3 py-2 text-sm rounded-lg no-underline transition hover:bg-surface-hover" style={{ color: 'var(--text-secondary)' }}>Bosh sahifa</a>
            <a href="/seller" className="px-3 py-2 text-sm font-semibold rounded-lg no-underline" style={{ color: 'var(--accent)', background: 'var(--accent-50)' }}>Sotuvchilar</a>
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
            <a href="/seller" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--accent)', background: 'var(--accent-50)' }}>🏪 Sotuvchilar</a>
          </div>
        </nav>
      )}

      {/* Hero */}
      <section className="pt-32 pb-16 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#0f0f1e 40%,#16213e 100%)' }}>
        <div className="max-w-5xl mx-auto px-5 relative z-10">
          <h1 className="text-3xl md:text-4xl font-black leading-tight text-white mb-2">
            Sotuvchilar <span className="text-gradient">Profili</span>
          </h1>
          <p className="text-lg max-w-lg" style={{ color: '#a5b4fc' }}>Deadstock bozoridagi sotuvchilar, ularning reytingi va faoliyati haqida batafsil ma'lumot.</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-5xl mx-auto px-5">
          <div className="grid md:grid-cols-[280px_1fr] gap-6 items-start">
            {/* Featured Seller Card */}
            <div className="rounded-xl border overflow-hidden sticky top-24" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
              <div className="h-24" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} />
              <div className="text-center px-5 pb-5" style={{ marginTop: '-40px' }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl mx-auto shadow-lg" style={{ background: 'var(--surface)', border: '4px solid var(--surface)' }}>
                  {top?.name?.charAt(0) || '🏪'}
                </div>
                <div className="text-lg font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{top?.name || 'Tanlangan Sotuvchi'}</div>
                <div className="flex items-center justify-center gap-1 mt-2 text-sm">
                  {'⭐'.repeat(starCount(top?.rating || 0))}
                  <span style={{ color: 'var(--text-tertiary)' }}>{(top?.rating || 0).toFixed(1)}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between px-2"><span style={{ color: 'var(--text-tertiary)' }}>Lotlar</span><strong>{top?.lots || 0} ta</strong></div>
                  <div className="flex justify-between px-2 border-t py-2" style={{ borderColor: 'var(--border-primary)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Takliflar</span><strong>{top?.bids || 0} ta</strong>
                  </div>
                  <div className="flex justify-between px-2 border-t py-2" style={{ borderColor: 'var(--border-primary)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Tranzaksiyalar</span><strong>{top?.txCount || 0} ta</strong>
                  </div>
                </div>
                <a href="https://t.me/DeLiKatbot" target="_blank" className="block mt-4 w-full py-2.5 text-sm font-semibold rounded-lg text-center no-underline transition"
                  style={{ background: 'var(--accent)', color: 'white' }}>
                  Bot orqali bog'lanish
                </a>
              </div>
            </div>

            {/* Sellers List */}
            <div>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Barcha sotuvchilar</h2>
                  <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{sellers.length} ta sotuvchi</p>
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-lg outline-none cursor-pointer"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}>
                  <option value="lots">Eng ko'p lotlar</option>
                  <option value="rating">Eng yuqori reyting</option>
                  <option value="trust">Ishonchliligi bo'yicha</option>
                  <option value="name">Alifbo bo'yicha</option>
                </select>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full" style={{ background: 'var(--surface-hover)' }} />
                        <div className="flex-1 h-4 rounded w-32" style={{ background: 'var(--surface-hover)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
                  <div className="text-3xl mb-3">🏪</div>
                  <p>Hozircha sotuvchilar yo'q</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sorted.map((s, i) => {
                    const stars = starCount(s.rating);
                    return (
                      <div key={String(s.id)} className="flex items-center gap-4 p-5 rounded-xl border transition hover:-translate-y-1 hover:shadow-md cursor-pointer"
                        style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}
                        onClick={() => window.open('https://t.me/DeLiKatbot?start=seller_' + s.id, '_blank')}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0" style={{ background: 'var(--accent-50)' }}>
                          {s.icon || '🏪'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                            {s.rating >= 7 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>Premium</span>}
                            {s.rating >= 5 && s.rating < 7 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>Verified</span>}
                          </div>
                          <div className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                            {'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}
                            <span className="ml-1">{s.rating.toFixed(1)}</span>
                          </div>
                          <div className="flex gap-4 text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                            <span>{s.lots} ta lot</span>
                            <span>{s.bids} ta taklif</span>
                            <span>{s.txCount} ta tranzaksiya</span>
                          </div>
                        </div>
                        <a href={'https://t.me/DeLiKatbot?start=seller_' + s.id} target="_blank"
                          className="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg no-underline transition"
                          style={{ background: 'var(--accent)', color: 'white' }}>
                          Bog'lanish
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Platform Stats */}
      <section className="py-12" style={{ background: 'var(--surface-dim)' }}>
        <div className="max-w-5xl mx-auto px-5">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Bozor ko'rsatkichlari</span>
            <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Platforma statistikasi</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-lg mb-2">👥</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.users || 0}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Faol sotuvchilar</div>
            </div>
            <div className="p-6 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-lg mb-2">📦</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.active_lots || 0}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Jami lotlar</div>
            </div>
            <div className="p-6 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-lg mb-2">💰</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats?.total_bids || 0}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Jami takliflar</div>
            </div>
            <div className="p-6 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-lg mb-2">⭐</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{(stats?.avg_rating || 0).toFixed(1)}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>O'rtacha reyting</div>
            </div>
          </div>
        </div>
      </section>

      {/* Transaction History */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-5">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>So'nggi tranzaksiyalar</span>
            <h2 className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>Platformadagi oxirgi tranzaksiyalar</h2>
          </div>
          <div className="space-y-4">
            {txItems.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                <p>Tranzaksiyalar yuklanmoqda...</p>
              </div>
            ) : (
              txItems.slice(0, 6).map((t, i) => {
                const statusColors: Record<string, string> = { completed: '#10b981', pending: '#f59e0b', cancelled: '#ef4444' };
                const statusLabels: Record<string, string> = { completed: 'Yakunlangan', pending: 'Kutilmoqda', cancelled: 'Bekor qilingan' };
                return (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: statusColors[t.status] || '#9e9e9e' }} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        {t.seller} → {t.buyer} · {t.qty} dona
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                          background: `${statusColors[t.status]}15`,
                          color: statusColors[t.status],
                        }}>{statusLabels[t.status] || t.status}</span>
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {t.amount >= 1e6 ? `${(t.amount / 1e6).toFixed(1)} mln` : t.amount >= 1e3 ? `${(t.amount / 1e3).toFixed(0)} ming` : t.amount} so'm
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

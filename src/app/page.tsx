'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';

interface Stats {
  users: number;
  active_lots: number;
  total_bids: number;
  avg_price: number;
  price_range: { min: number; max: number };
}

interface Lot {
  id: number;
  title: string;
  category: string;
  price: number;
  grade: string;
  quantity: number;
  status: string;
  seller_name?: string;
  created_at: string;
}

const CATEGORIES = [
  { id: 'smartfon', name: 'Smartfonlar', icon: '📱', color: '#f59e0b' },
  { id: 'notebook', name: 'Notebooklar', icon: '💻', color: '#6366f1' },
  { id: 'tv', name: 'TV & Video', icon: '📺', color: '#10b981' },
  { id: 'audio', name: 'Audio', icon: '🎧', color: '#ec4899' },
  { id: 'aksesuar', name: 'Aksessuarlar', icon: '🔌', color: '#8b5cf6' },
  { id: 'kiyim', name: 'Kiyim', icon: '👕', color: '#ef4444' },
];

const GRADE_EMOJI: Record<string, string> = { A: '🟢', B: '🟡', C: '🔴' };

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln so'm`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} ming so'm`;
  return `${v.toLocaleString()} so'm`;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, lotsRes] = await Promise.all([
          fetch('/api/stats').then(r => r.json()),
          fetch(`/api/lots?category=${selectedCat}&limit=12`).then(r => r.json()),
        ]);
        if (statsRes.ok) setStats(statsRes.stats);
        if (lotsRes.ok) setLots(lotsRes.lots);
      } catch (e) {
        console.error('Load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCat]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="home" />

      {/* Hero */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, var(--accent-50) 0%, transparent 100%)',
          opacity: 0.5,
        }} />
        <div className="max-w-7xl mx-auto px-5 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
                style={{
                  background: 'var(--accent-50)',
                  border: '1px solid var(--accent-100)',
                  color: 'var(--accent)',
                }}>
                <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
                O&apos;zbekistondagi ilk B2B Deadstock Marketplace
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4"
                style={{ color: 'var(--text-primary)' }}>
                Ortiqcha stokni{' '}
                <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
                  0% komissiya
                </span>{' '}
                bilan likvidatsiya qiling
              </h1>
              <p className="text-lg max-w-lg leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                Omboringizda sotilmay yotgan mahsulotlarni <strong>0% komissiya</strong>,{' '}
                <strong>AI Trust Score</strong> va <strong>ESCROW himoyasi</strong> bilan B2B bozorida likvidatsiya qiling.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {['0% komissiya', 'Trust Score', 'ESCROW himoya', 'Telegram 1 daqiqa'].map(tag => (
                  <span key={tag} className="px-2.5 py-1 text-xs font-semibold rounded-full"
                    style={{
                      background: 'var(--accent-50)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent-100)',
                    }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                <a href="https://t.me/DeLiKatbot" target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition-all no-underline hover:-translate-y-0.5"
                  style={{ background: 'var(--accent)' }}>
                  Botga o&apos;tish →
                </a>
                <a href="#marketplace"
                  className="inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all no-underline hover:-translate-y-0.5"
                  style={{
                    background: 'var(--surface)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                  }}>
                  Bozorni ko&apos;rish
                </a>
              </div>

              {stats && (
                <div className="grid grid-cols-3 gap-5 pt-5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.active_lots}</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Faol lotlar</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total_bids}</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Takliflar</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.users}</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Foydalanuvchilar</div>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:grid gap-3">
              <div className="rounded-xl p-5" style={{
                background: 'var(--surface-dim)',
                border: '1px solid var(--border-primary)',
              }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Eng ko&apos;p kategoriya</span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full"
                    style={{
                      background: 'rgba(16,185,129,0.1)',
                      color: '#10b981',
                      border: '1px solid rgba(16,185,129,0.2)',
                    }}>A grade</span>
                </div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stats ? fmtPrice(stats.price_range.max) : <span className="inline-block w-28 h-6 rounded animate-pulse" style={{ background: 'var(--surface-hover)' }} />}
                </div>
              </div>
              <div className="rounded-xl p-5" style={{
                background: 'var(--surface-dim)',
                border: '1px solid var(--border-primary)',
              }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>O&apos;rtacha narx</div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stats ? fmtPrice(stats.avg_price) : <span className="inline-block w-24 h-6 rounded animate-pulse" style={{ background: 'var(--surface-hover)' }} />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Kategoriyalar</span>
            <h2 className="text-2xl md:text-3xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>Mahsulot turlari</h2>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>6 xil kategoriyada 21+ real deadstock lotlari</p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(selectedCat === cat.id ? 'all' : cat.id)}
                className="flex flex-col items-center gap-2 p-5 rounded-xl transition-all cursor-pointer"
                style={{
                  border: selectedCat === cat.id ? '2px solid var(--accent)' : '1px solid var(--border-primary)',
                  background: selectedCat === cat.id ? 'var(--accent-50)' : 'var(--surface)',
                  boxShadow: selectedCat === cat.id ? '0 4px 12px rgba(255,145,0,0.15)' : 'none',
                }}
                onMouseEnter={e => { if (selectedCat !== cat.id) e.currentTarget.style.borderColor = 'var(--accent-200)'; }}
                onMouseLeave={e => { if (selectedCat !== cat.id) e.currentTarget.style.borderColor = 'var(--border-primary)'; }}>
                <span className="text-2xl transition-transform hover:scale-110">{cat.icon}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <section id="marketplace" className="py-16" style={{ background: 'var(--surface-dim)' }}>
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Barcha lotlar</h2>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border-primary)' }}>
                  <div className="h-40 animate-pulse" style={{ background: 'var(--surface-hover)' }} />
                  <div className="p-4 space-y-3">
                    <div className="h-4 rounded w-3/4 animate-pulse" style={{ background: 'var(--surface-hover)' }} />
                    <div className="h-4 rounded w-1/2 animate-pulse" style={{ background: 'var(--surface-hover)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : lots.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
              <div className="text-4xl mb-4">📦</div>
              <p>Hozircha lotlar yo&apos;q</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lots.map(lot => (
                <a key={lot.id} href={`/lot/${lot.id}`}
                  className="group rounded-xl overflow-hidden no-underline transition-all hover:-translate-y-1"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border-primary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(255,145,0,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div className="h-40 flex items-center justify-center text-4xl relative"
                    style={{ background: 'linear-gradient(135deg, var(--surface-hover), var(--surface-dim))' }}>
                    <span className="absolute top-3 left-3">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full"
                        style={{
                          background: lot.grade === 'A' ? 'rgba(16,185,129,0.1)' : lot.grade === 'B' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                          color: lot.grade === 'A' ? '#10b981' : lot.grade === 'B' ? '#f59e0b' : '#ef4444',
                        }}>
                        {GRADE_EMOJI[lot.grade] || '⚪'} {lot.grade}
                      </span>
                    </span>
                    {CATEGORIES.find(c => c.id === lot.category)?.icon || '📦'}
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{lot.category}</span>
                    <h3 className="font-semibold mt-1 transition-colors line-clamp-2" style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}>
                      {lot.title}
                    </h3>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                      <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{fmtPrice(lot.price)}</span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{lot.quantity} dona</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Nega <span className="text-gradient">DeLiKet</span>?</h2>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>B2B deadstock bozorining afzalliklari</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '💰', title: '0% Komissiya', desc: 'Hech qanday yashirin to\'lovlarsiz erkin savdo' },
              { icon: '🤖', title: 'AI Trust Score', desc: 'Har bir sotuvchi va lot uchun avtomatik ishonchlilik bahosi' },
              { icon: '🛡️', title: 'ESCROW Himoya', desc: 'To\'lov xavfsiz saqlanadi, mahsulot yetib borgandan keyin o\'tkaziladi' },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-xl text-center transition-all hover:-translate-y-1"
                style={{
                  background: 'var(--surface-dim)',
                  border: '1px solid var(--border-primary)',
                }}>
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <a href="/" className="flex items-center gap-2 text-lg font-bold no-underline mb-3" style={{ color: 'var(--text-primary)' }}>
                DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
              </a>
              <p className="text-sm max-w-xs" style={{ color: 'var(--text-tertiary)' }}>Deadstock Liquidation Marketplace — ortiqcha mahsulotlar uchun B2B platforma.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>Marketplace</h4>
              <div className="flex flex-col gap-2">
                <a href="/" className="text-sm no-underline transition-colors" style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>Bosh sahifa</a>
                <a href="/analytics" className="text-sm no-underline transition-colors" style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>Analytics</a>
                <a href="/seller" className="text-sm no-underline transition-colors" style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>Sotuvchilar</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>Qo&apos;llanma</h4>
              <div className="flex flex-col gap-2">
                <a href="/how-it-works" className="text-sm no-underline transition-colors" style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>Qanday ishlaydi</a>
                <a href="https://t.me/DeLiKatbot" target="_blank" className="text-sm no-underline transition-colors" style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>Botni ishga tushirish</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>Loyiha</h4>
              <div className="flex flex-col gap-2">
                <a href="https://github.com/jasur-ai/DeLiKat" target="_blank" className="text-sm no-underline transition-colors" style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}>GitHub</a>
              </div>
            </div>
          </div>
          <div className="pt-5 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-quaternary)' }}>
            <span>© 2026 DeLiKet. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

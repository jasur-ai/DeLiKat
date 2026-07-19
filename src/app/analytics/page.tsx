'use client';

import { useEffect, useState } from 'react';

interface AnalyticsData {
  ok: boolean;
  stats: {
    active_lots: number;
    total_bids: number;
    pending_bids: number;
    users: number;
    price_range: { min: number; max: number; avg: number };
  };
  categories: Record<string, number>;
  category_prices: { name: string; avg_price: number; count: number }[];
  top_sellers: { name: string; lots: number; sales: number; rating: number }[];
  grade_distribution: Record<string, number>;
  role_distribution: Record<string, number>;
  recent_activity: { text: string; time: string; icon: string }[];
}

const LABELS: Record<string, string> = { smartfon: 'Smartfonlar', notebook: 'Notebooklar', tv: 'TV & Video', audio: 'Audio', aksesuar: 'Aksessuarlar', kiyim: 'Kiyim' };
const COLORS: Record<string, string> = { smartfon: '#f59e0b', notebook: '#6366f1', tv: '#10b981', audio: '#ec4899', aksesuar: '#8b5cf6', kiyim: '#ef4444' };

function fmt(v: number) { if (!v && v !== 0) return '—'; if (v >= 1e6) return (v / 1e6).toFixed(1) + ' mln'; if (v >= 1e3) return (v / 1e3).toFixed(0) + ' ming'; return v.toLocaleString(); }

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    fetch('/api/analytics').then(r => r.json()).then(d => {
      if (d.ok) setData(d);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const s = data?.stats;
  const cats = data?.categories ? Object.entries(data.categories).sort((a, b) => b[1] - a[1]) : [];
  const maxCat = Math.max(...cats.map(c => c[1]), 1);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border-primary)' }}>
        <div className="max-w-5xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 text-lg font-bold no-underline" style={{ color: 'var(--text-primary)' }}>
            <svg viewBox="0 0 36 36" fill="none" style={{ width: 28, height: 28 }}>
              <defs><linearGradient id="lgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgA)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            <a href="/analytics" className="px-3 py-2 text-sm font-semibold rounded-lg no-underline" style={{ color: 'var(--accent)', background: 'var(--accent-50)' }}>Analytics</a>
            <a href="/leaderboard" className="px-3 py-2 text-sm rounded-lg no-underline transition hover:bg-surface-hover" style={{ color: 'var(--text-secondary)' }}>Reyting</a>
            <a href="/reviews" className="px-3 py-2 text-sm rounded-lg no-underline transition hover:bg-surface-hover" style={{ color: 'var(--text-secondary)' }}>Sharhlar</a>
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
            <a href="/" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--text-secondary)' }}>🏠 Bosh sahifa</a>
            <a href="/analytics" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--accent)', background: 'var(--accent-50)' }}>📊 Analytics</a>
            <a href="/leaderboard" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--text-secondary)' }}>🏆 Reyting</a>
            <a href="/reviews" className="px-5 py-3 text-lg rounded-lg no-underline" style={{ color: 'var(--text-secondary)' }}>⭐ Sharhlar</a>
          </div>
        </nav>
      )}

      {/* Content */}
      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        {/* Hero */}
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Bozor tahlili</span>
          <h1 className="text-2xl md:text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            Real-time <span className="text-gradient">Analytics</span> Dashboard
          </h1>
          <p className="text-sm mt-2 max-w-md" style={{ color: 'var(--text-tertiary)' }}>Bozor ko'rsatkichlari, kategoriya taqsimoti, narx trendlari va sotuvchilar faoliyati</p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="h-8 w-16 mb-2 rounded" style={{ background: 'var(--surface-hover)' }} />
                <div className="h-3 w-20 rounded" style={{ background: 'var(--surface-hover)' }} />
              </div>
            ))}
          </div>
        ) : s ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="p-5 rounded-xl border transition hover:-translate-y-0.5" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>📦 Faol lotlar</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.active_lots}</div>
            </div>
            <div className="p-5 rounded-xl border transition hover:-translate-y-0.5" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>💰 Jami takliflar</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.total_bids}</div>
            </div>
            <div className="p-5 rounded-xl border transition hover:-translate-y-0.5" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>👥 Foydalanuvchilar</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.users}</div>
            </div>
            <div className="p-5 rounded-xl border transition hover:-translate-y-0.5" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>📊 O'rtacha narx</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(s.price_range.avg)}</div>
            </div>
            <div className="p-5 rounded-xl border transition hover:-translate-y-0.5" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>📈 Narx oralig'i</div>
              <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(s.price_range.min)} — {fmt(s.price_range.max)}</div>
            </div>
          </div>
        ) : null}

        {/* Price Insights */}
        {data?.category_prices && data.category_prices.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Narx tahlili</h3>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Kategoriya bo'yicha</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {data.category_prices.map((c: any) => (
                <div key={c.name} className="p-3 text-center rounded-lg" style={{ background: 'var(--surface-dim)' }}>
                  <div className="text-sm font-bold">{fmt(c.avg_price)} so'm</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{LABELS[c.name] || c.name} ({c.count})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>Kategoriya bo'yicha lotlar</div>
            <svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet" className="w-full overflow-visible">
              {[40, 80, 120, 160].map(y => (
                <line key={y} x1="0" y1={y} x2="560" y2={y} stroke={darkMode ? '#333' : '#e0e0e0'} strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
              ))}
              {cats.map(([name, count], i) => {
                const barW = Math.min(48, (520 - cats.length * 15) / cats.length);
                const x = 20 + i * (barW + 15);
                const h = (count / maxCat) * 155;
                const color = COLORS[name] || '#f59e0b';
                return (
                  <g key={name} transform={`translate(${x},0)`}>
                    <rect x="0" y={180 - h} width={barW} height={h} rx="4" fill={color} opacity="0.8" />
                    <text x={barW / 2} y={180 - h - 6} textAnchor="middle" fontSize="9" fontWeight="600" fill={darkMode ? '#9e9e9e' : '#757575'} opacity="0">{count}</text>
                    <text x={barW / 2} y="195" textAnchor="middle" fontSize="10" fill={darkMode ? '#616161' : '#bdbdbd'}>{(LABELS[name] || name).slice(0, 8)}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>Kategoriyalar</div>
            {cats.map(([name, count]) => {
              const pct = (count / maxCat) * 100;
              return (
                <div key={name} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="w-7 h-7 flex items-center justify-center text-xs rounded shrink-0" style={{ background: `${COLORS[name]}15` }}>{name === 'smartfon' ? '📱' : name === 'notebook' ? '💻' : name === 'tv' ? '📺' : name === 'audio' ? '🎧' : name === 'aksesuar' ? '🔌' : '👕'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{LABELS[name] || name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{count} ta lot</div>
                  </div>
                  <div className="w-16 h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--border-primary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[name] || '#f59e0b' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grade + Role Distribution */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>Grade bo'yicha taqsimot</div>
            {data?.grade_distribution && Object.entries(data.grade_distribution).map(([grade, count]) => {
              const total = Object.values(data.grade_distribution!).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={grade} className="flex items-center gap-3 py-2">
                  <span className="text-sm font-semibold w-6">{grade}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-primary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: grade === 'A' ? '#10b981' : grade === 'B' ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{count}</span>
                </div>
              );
            })}
          </div>
          <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>Foydalanuvchi rollari</div>
            {data?.role_distribution && Object.entries(data.role_distribution).map(([role, count]) => {
              const total = Object.values(data.role_distribution!).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={role} className="flex items-center gap-3 py-2">
                  <span className="text-sm font-semibold w-20 capitalize">{role}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-primary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: role === 'xaridor' ? '#6366f1' : role === 'sotuvchi' ? '#f59e0b' : '#10b981' }} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sellers + Activity */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>Eng faol sotuvchilar</div>
            {data?.top_sellers && data.top_sellers.length > 0 ? data.top_sellers.map((seller: any, i: number) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full shrink-0" style={{
                  background: i === 0 ? 'rgba(245,158,11,0.12)' : i === 1 ? 'rgba(99,102,241,0.1)' : 'rgba(239,68,68,0.1)',
                  color: i === 0 ? '#d97706' : i === 1 ? '#6366f1' : '#dc2626',
                }}>{i + 1}</div>
                <div className="flex-1 text-sm font-semibold">{seller.name}</div>
                <div className="text-xs text-right" style={{ color: 'var(--text-tertiary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{seller.lots}</strong> lotlar
                </div>
              </div>
            )) : <div className="text-sm py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>Ma'lumot yo'q</div>}
          </div>
          <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-tertiary)' }}>So'nggi faoliyat</div>
            {data?.recent_activity && data.recent_activity.length > 0 ? data.recent_activity.map((act: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 px-2 rounded-md">
                <span className="text-sm">{act.icon || '📌'}</span>
                <span className="text-sm flex-1 truncate">{act.text}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-quaternary)' }}>{act.time}</span>
              </div>
            )) : <div className="text-sm py-4 text-center" style={{ color: 'var(--text-tertiary)' }}>Faoliyat yo'q</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

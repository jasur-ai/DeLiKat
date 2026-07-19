'use client';

import { useEffect, useState } from 'react';

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
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState('all');

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

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

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-transparent scrolled:border-gray-200 dark:scrolled:border-gray-800 scrolled:bg-white/95 dark:scrolled:bg-gray-900/95 backdrop-blur transition-all">
        <div className="max-w-7xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <svg viewBox="0 0 36 36" className="w-7 h-7" fill="none">
              <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b"/><stop offset="100%" stopColor="#d97706"/></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lg)"/>
              <path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95"/>
              <circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6"/>
            </svg>
            DeLi<span className="text-amber-500">Ket</span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {['Analytics', 'Seller', 'AI Search', 'Premium', 'Cross-Border'].map(item => (
              <a key={item} href={`/${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                {item}
              </a>
            ))}
            <a href="https://t.me/DeLiKatbot" target="_blank"
              className="ml-2 px-4 py-2 text-sm font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30 transition">
              Bot →
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition" aria-label="Toggle theme">
              {darkMode ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <span className={`block w-5 h-0.5 bg-gray-900 dark:bg-white transition ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-900 dark:bg-white transition ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-gray-900 dark:bg-white transition ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-4">
            <div className="flex flex-col gap-2">
              {['Analytics', 'Seller', 'AI Search', 'Premium', 'Cross-Border', 'Bot'].map(item => (
                <a key={item} href={item === 'Bot' ? 'https://t.me/DeLiKatbot' : `/${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                  onClick={() => setMenuOpen(false)}>
                  {item}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-900/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-5 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-semibold text-amber-600 dark:text-amber-400 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                O'zbekistondagi ilk B2B Deadstock Marketplace
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight mb-4">
                Ortiqcha stokni{' '}
                <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
                  0% komissiya
                </span>{' '}
                bilan likvidatsiya qiling
              </h1>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed mb-6">
                Omboringizda sotilmay yotgan mahsulotlarni <strong>0% komissiya</strong>,{' '}
                <strong>AI Trust Score</strong> va <strong>ESCROW himoyasi</strong> bilan B2B bozorida likvidatsiya qiling.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {['0% komissiya', 'Trust Score', 'ESCROW himoya', 'Telegram 1 daqiqa'].map(tag => (
                  <span key={tag} className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 mb-8">
                <a href="https://t.me/DeLiKatbot" target="_blank"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
                  Botga o'tish →
                </a>
                <a href="#marketplace"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition">
                  Bozorni ko'rish
                </a>
              </div>

              {stats && (
                <div className="grid grid-cols-3 gap-5 pt-5 border-t border-gray-200 dark:border-gray-800">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_lots}</div>
                    <div className="text-sm text-gray-500">Faol lotlar</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_bids}</div>
                    <div className="text-sm text-gray-500">Takliflar</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.users}</div>
                    <div className="text-sm text-gray-500">Foydalanuvchilar</div>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:grid gap-3">
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Eng ko'p kategoriya</span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">A grade</span>
                </div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats ? fmtPrice(stats.price_range.max) : <span className="inline-block w-28 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">O'rtacha narx</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats ? fmtPrice(stats.avg_price) : <span className="inline-block w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />}
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
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">Kategoriyalar</span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-2">Mahsulot turlari</h2>
            <p className="text-gray-500 mt-2">6 xil kategoriyada 21+ real deadstock lotlari</p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(selectedCat === cat.id ? 'all' : cat.id)}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border transition-all ${
                  selectedCat === cat.id
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow'
                }`}
              >
                <span className="text-2xl transition-transform hover:scale-110">{cat.icon}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Marketplace */}
      <section id="marketplace" className="py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Barcha lotlar</h2>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="h-40 bg-gray-100 dark:bg-gray-700 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : lots.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-4">📦</div>
              <p>Hozircha lotlar yo'q</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lots.map(lot => (
                <a key={lot.id} href={`/lot/${lot.id}`}
                  className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-amber-500 hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-4xl relative">
                    <span className="absolute top-3 left-3 flex gap-1">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-opacity-90
                        {lot.grade === 'A' ? 'bg-emerald-50 text-emerald-600' : lot.grade === 'B' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}">
                        {GRADE_EMOJI[lot.grade] || '⚪'} {lot.grade}
                      </span>
                    </span>
                    {CATEGORIES.find(c => c.id === lot.category)?.icon || '📦'}
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">{lot.category}</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white mt-1 group-hover:text-amber-500 transition-colors line-clamp-2">{lot.title}</h3>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{fmtPrice(lot.price)}</span>
                      <span className="text-xs text-gray-400">{lot.quantity} dona</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <a href="/" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-3">
                DeLi<span className="text-amber-500">Ket</span>
              </a>
              <p className="text-sm text-gray-500 max-w-xs">Deadstock Liquidation Marketplace — ortiqcha mahsulotlar uchun B2B platforma.</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Marketplace</h4>
              <div className="flex flex-col gap-2">
                <a href="/" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">Bosh sahifa</a>
                <a href="/analytics" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">Analytics</a>
                <a href="/seller" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">Sotuvchilar</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Qo'llanma</h4>
              <div className="flex flex-col gap-2">
                <a href="/how-it-works" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">Qanday ishlaydi</a>
                <a href="https://t.me/DeLiKatbot" target="_blank" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">Botni ishga tushirish</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Loyiha</h4>
              <div className="flex flex-col gap-2">
                <a href="https://github.com/jasur-ai/DeLiKat" target="_blank" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition">GitHub</a>
              </div>
            </div>
          </div>
          <div className="pt-5 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <span>© 2026 DeLiKet. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

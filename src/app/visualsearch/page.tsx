'use client';

import { useEffect, useState } from 'react';

const CATEGORIES = [
  { id: 'smartfon', name: 'Smartfonlar', icon: '📱' },
  { id: 'notebook', name: 'Notebooklar', icon: '💻' },
  { id: 'tv', name: 'TV & Video', icon: '📺' },
  { id: 'audio', name: 'Audio', icon: '🎧' },
  { id: 'aksesuar', name: 'Aksessuarlar', icon: '🔌' },
  { id: 'kiyim', name: 'Kiyim', icon: '👕' },
];

export default function VisualSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  const handleSearch = async (categoryFilter = '') => {
    if (!query && !categoryFilter) return;
    setLoading(true);
    setSearched(true);
    try {
      let url = `/api/lots?limit=20${categoryFilter ? `&category=${categoryFilter}` : ''}${query ? `&search=${encodeURIComponent(query)}` : ''}`;
      const res = await fetch(url);
      const d = await res.json();
      if (d.ok) setResults(d.lots || []);
      else setResults([]);
    } catch (e) { console.error(e); setResults([]); } finally { setLoading(false); }
  };

  const handleCategoryClick = (catId: string) => {
    handleSearch(catId);
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
              <defs><linearGradient id="lgVs" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgVs)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full border-none cursor-pointer transition" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>🔍 AI Qidiruv</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Tabiiy tilda qidiring yoki kategoriya bo'yicha filtrlang</p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder='"400$ gacha notebook" yoki "iPhone 14 pro"'
              className="flex-1 px-4 py-3 text-sm border-2 rounded-xl outline-none transition"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
            <button onClick={() => handleSearch()}
              className="px-6 py-3 text-sm font-semibold rounded-xl border-none cursor-pointer transition"
              style={{ background: 'var(--accent)', color: 'white' }}>
              Qidirish
            </button>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => handleCategoryClick(cat.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition cursor-pointer"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-xl border overflow-hidden animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="h-40" style={{ background: 'var(--surface-hover)' }} />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded" style={{ background: 'var(--surface-hover)' }} />
                  <div className="h-4 w-1/2 rounded" style={{ background: 'var(--surface-hover)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-3xl mb-3">🔍</div>
            <p>Hech narsa topilmadi. Boshqa so'z bilan urinib ko'ring.</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((lot: any) => (
              <a key={lot.id} href={`/lot/${lot.id}`}
                className="group rounded-xl border overflow-hidden transition hover:-translate-y-1 hover:shadow-md no-underline"
                style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
                <div className="h-40 flex items-center justify-center text-4xl" style={{ background: 'var(--surface-dim)' }}>
                  {CATEGORIES.find(c => c.id === lot.category)?.icon || '📦'}
                </div>
                <div className="p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{lot.category}</span>
                  <h3 className="text-sm font-semibold mt-1 line-clamp-2 group-hover:underline" style={{ color: 'var(--text-primary)' }}>{lot.title}</h3>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {lot.price >= 1e6 ? `${(lot.price / 1e6).toFixed(1)} mln` : lot.price >= 1e3 ? `${(lot.price / 1e3).toFixed(0)} ming` : lot.price} so'm
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{lot.quantity} dona</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : !searched ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-3xl mb-3">🤖</div>
            <p>Mahsulot nomi yoki kategoriya tanlang</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

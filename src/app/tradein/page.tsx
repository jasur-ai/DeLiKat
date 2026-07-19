'use client';

import { useEffect, useState } from 'react';

export default function TradeinPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('good');
  const [valuation, setValuation] = useState<any>(null);
  const [valuating, setValuating] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    Promise.all([
      fetch('/api/tradein/listings?limit=10').then(r => r.json()),
      fetch('/api/tradein/stats').then(r => r.json()),
    ]).then(([l, s]) => {
      if (l.items) setListings(l.items);
      if (s) setStats(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleEvaluate = async () => {
    if (!category || !model) return;
    setValuating(true);
    try {
      const res = await fetch(`/api/tradein/evaluate?category=${category}&model=${encodeURIComponent(model)}&condition=${condition}`);
      const d = await res.json();
      if (d.ok) setValuation(d);
    } catch (e) { console.error(e); } finally { setValuating(false); }
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
              <defs><linearGradient id="lgTi" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgTi)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
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
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>🔄 Trade-In</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Eski qurilmangizni baholang va eng yaxshi narxda soting</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            <div className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Jami</div>
            </div>
            <div className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-xl font-bold" style={{ color: '#f59e0b' }}>{stats.pending}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Kutilmoqda</div>
            </div>
            <div className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-xl font-bold" style={{ color: '#10b981' }}>{stats.evaluated}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Baholandi</div>
            </div>
            <div className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-xl font-bold" style={{ color: '#6366f1' }}>{stats.sold}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Sotildi</div>
            </div>
          </div>
        )}

        {/* AI Valuation */}
        <div className="p-6 rounded-xl border mb-8" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>🤖 AI Baholash</h2>
          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="px-3 py-2.5 text-sm border rounded-lg outline-none"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}>
              <option value="">Kategoriya</option>
              <option value="smartfon">Smartfon</option>
              <option value="notebook">Notebook</option>
              <option value="tv">TV</option>
              <option value="audio">Audio</option>
              <option value="aksesuar">Aksesuar</option>
              <option value="kiyim">Kiyim</option>
            </select>
            <input value={model} onChange={e => setModel(e.target.value)} placeholder="Model (masalan: iPhone 14)"
              className="px-3 py-2.5 text-sm border rounded-lg outline-none"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
            <select value={condition} onChange={e => setCondition(e.target.value)}
              className="px-3 py-2.5 text-sm border rounded-lg outline-none"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}>
              <option value="excellent">Zo'r</option>
              <option value="good">Yaxshi</option>
              <option value="fair">Qoniqarli</option>
              <option value="poor">Yomon</option>
            </select>
            <button onClick={handleEvaluate} disabled={valuating || !category || !model}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {valuating ? 'Baholanmoqda...' : 'Baholash'}
            </button>
          </div>

          {valuation && (
            <div className="p-4 rounded-lg" style={{ background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {valuation.estimated_price?.toLocaleString()} so'm
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                {valuation.price_range?.min?.toLocaleString()} — {valuation.price_range?.max?.toLocaleString()} so'm oralig'ida
              </div>
              <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>Ishonchlilik: {valuation.confidence}%</span>
                <span>Multiplier: {valuation.multiplier}x</span>
              </div>
            </div>
          )}
        </div>

        {/* Listings */}
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>So'nggi listinglar</h2>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="p-4 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="h-4 w-32 rounded" style={{ background: 'var(--surface-hover)' }} />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-tertiary)' }}>
            <p>Hozircha listinglar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{l.device_model}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    {l.category} · {l.condition} · {l.grade && `${l.grade} grade`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {l.estimated_price?.toLocaleString()} so'm
                  </div>
                  <span className="text-xs font-semibold" style={{
                    color: l.status === 'kutilmoqda' ? '#f59e0b' : l.status === 'baholandi' ? '#6366f1' : '#10b981',
                  }}>{l.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

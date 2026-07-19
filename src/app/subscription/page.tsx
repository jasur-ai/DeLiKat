'use client';

import { useEffect, useState } from 'react';

const TIERS = [
  { id: 'free', name: 'Bepul', price: 0, badge: '🆓', color: 'gray', popular: false,
    features: ['5 tagacha aktiv lot', 'Asosiy funksiyalar', 'Standart qidiruv', 'Oddiy statistikalar'] },
  { id: 'basic', name: 'Basic', price: 50000, badge: '⚡', color: '#6366f1', popular: true,
    features: ['50 tagacha aktiv lot', 'Kengaytirilgan analitika', "Ekspert qo'llab-quvvatlash", 'Narx trendlari', "Sotuvchilar feed'ida ko'rinish", 'Telegram bildirishnomalar'] },
  { id: 'pro', name: 'Pro', price: 150000, badge: '💎', color: '#8b5cf6', popular: false,
    features: ['Cheksiz aktiv lotlar', 'AI Price Optimizer', 'Visual Comparison (CLIP)', 'Cross-Border sotuv', 'Premium badge ✅', "Shaxsiy do'kon sahifasi", 'Market analytics dashboard', 'Smart Digest kundalik hisobot'] },
  { id: 'enterprise', name: 'Enterprise', price: 500000, badge: '👑', color: '#d97706', popular: false,
    features: ['Barcha Pro funksiyalar', "Shaxsiy account menedjer", 'API orqali ulanish', "Ommaviy lot boshqaruvi", "Sotuvchilar akademiyasi", 'Dispute Center prioritet', 'Maxsus integrasiyalar', 'SLA 24/7 yordam'] },
];

export default function SubscriptionPage() {
  const [plan, setPlan] = useState<{ tier: string; is_active: boolean; days_left?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Try to load current plan
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.user) {
          return fetch(`/api/subscription/user/${d.user.id}`).then(r => r.json());
        }
      })
      .then(d => { if (d) setPlan(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
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
              <defs><linearGradient id="lgSub" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgSub)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            <a href="/" className="px-3 py-2 text-sm rounded-lg no-underline transition hover:bg-surface-hover" style={{ color: 'var(--text-secondary)' }}>Bosh</a>
            <a href="/subscription" className="px-3 py-2 text-sm font-semibold rounded-lg no-underline" style={{ color: 'var(--accent)', background: 'var(--accent-50)' }}>Premium</a>
          </nav>
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full border-none cursor-pointer transition" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="text-center mb-10 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(circle at center, var(--accent-50), transparent 70%)' }} />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 relative" style={{ color: 'var(--text-primary)' }}>
            <span className="text-gradient">Premium</span> Subscription
          </h1>
          <p className="text-sm max-w-md mx-auto relative" style={{ color: 'var(--text-tertiary)' }}>
            Cheksiz imkoniyatlar, AI Price Optimizer, Cross-Border va premium badge
          </p>
        </div>

        {/* Current Plan */}
        {plan && plan.tier !== 'free' && (
          <div className="flex items-center justify-between flex-wrap gap-4 p-4 mb-8 rounded-xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 flex items-center justify-center text-lg rounded-lg" style={{ background: 'var(--accent-50)' }}>
                {TIERS.find(t => t.id === plan.tier)?.badge || '🆓'}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {TIERS.find(t => t.id === plan.tier)?.name || plan.tier} — {plan.is_active ? '✅ Faol' : '❌ Faol emas'}
                </div>
                {plan.days_left !== null && plan.days_left !== undefined && (
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{plan.days_left} kun qoldi</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-4 gap-4 items-start">
          {TIERS.map(tier => {
            const isCurrent = plan?.tier === tier.id;
            return (
              <div key={tier.id} className={`relative p-6 rounded-xl border flex flex-col transition ${
                tier.popular ? 'scale-[1.03] z-10' : ''
              }`}
                style={{
                  borderColor: tier.popular ? 'var(--accent)' : 'var(--border-primary)',
                  background: 'var(--surface)',
                  boxShadow: tier.popular ? '0 0 0 1px var(--accent), 0 8px 30px rgba(0,0,0,0.12)' : 'none',
                }}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold uppercase tracking-wider rounded-full text-white whitespace-nowrap"
                    style={{ background: 'var(--accent)' }}>Eng ommabop</div>
                )}
                <div className="text-center pb-4 mb-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-2xl mb-1">{tier.badge}</div>
                  <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{tier.name}</div>
                  <div className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
                    {tier.price === 0 ? 'Bepul' : `${tier.price.toLocaleString()}`}
                    {tier.price > 0 && <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}> so'm/oy</span>}
                  </div>
                </div>
                <div className="flex-1 space-y-2 mb-6">
                  {tier.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="w-5 h-5 flex items-center justify-center text-xs rounded-full shrink-0"
                        style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <button onClick={isCurrent ? undefined : () => window.open('https://t.me/DeLiKatbot', '_blank')}
                  className={`w-full py-2.5 text-sm font-semibold rounded-lg border transition cursor-pointer ${
                    isCurrent ? '' : tier.popular ? 'text-white' : ''
                  }`}
                  style={isCurrent ? {
                    background: 'rgba(16,185,129,0.1)', color: '#10b981',
                    borderColor: 'rgba(16,185,129,0.2)', cursor: 'default',
                  } : tier.popular ? {
                    background: 'var(--accent)', color: 'white',
                    borderColor: 'var(--accent)',
                  } : {
                    background: 'var(--surface)', color: 'var(--text-primary)',
                    borderColor: 'var(--border-primary)',
                  }}>
                  {isCurrent ? 'Joriy reja' : tier.price === 0 ? 'Bepul boshlash' : 'Ulanish'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Comparison */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>To'liq taqqoslash</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 font-semibold border-b" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>Xususiyat</th>
                  {TIERS.map(t => <th key={t.id} className="p-3 font-semibold text-center border-b" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>{t.badge} {t.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Aktiv lotlar', '5', '50', 'Cheksiz', 'Cheksiz'],
                  ['Analitika', 'Oddiy', 'Kengaytirilgan', 'AI', 'Full'],
                  ['AI Price Optimizer', '✕', '✕', '✓', '✓'],
                  ['Cross-Border', '✕', '✕', '✓', '✓'],
                  ['Premium badge', '✕', '✕', '✓', '✓'],
                  ['Shaxsiy do\'kon', '✕', '✕', '✓', '✓'],
                  ['Account menedjer', '✕', '✕', '✕', '✓'],
                  ['API ulanish', '✕', '✕', '✕', '✓'],
                  ['Dispute Center', 'Oddiy', 'Oddiy', 'Standart', 'Prioritet'],
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="p-3 border-b font-medium" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>{row[0]}</td>
                    {row.slice(1).map((v, j) => (
                      <td key={j} className={`p-3 text-center border-b ${j === 2 ? 'font-semibold' : ''}`}
                        style={{ borderColor: 'var(--border-primary)', color: v === '✓' ? '#10b981' : v === '✕' ? '#ef4444' : 'var(--text-primary)' }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

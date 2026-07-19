'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  { icon: '🤖', title: '1. Botga o\'ting', desc: 'Telegram\'da @DeLiKatbot\'ni toping va /start buyrug\'ini yuboring. 1 daqiqada ro\'yxatdan o\'ting.' },
  { icon: '📦', title: '2. Lot yarating', desc: 'Mahsulotingizni suratga oling, kategoriya va narxni belgilang. AI Trust Score avtomatik hisoblanadi.' },
  { icon: '🔄', title: '3. B2B bozoriga chiqing', desc: 'Lotingiz barcha foydalanuvchilarga ko\'rinadi. Xaridorlar taklif yuboradi.' },
  { icon: '💎', title: '4. Premium imkoniyatlar', desc: 'AI Price Optimizer, Cross-Border savdo, analytics dashboard va boshqa premium funksiyalardan foydalaning.' },
  { icon: '🤝', title: '5. Bitim va ESCROW', desc: 'Xavfsiz to\'lov tizimi: pul ESCROW\'da saqlanadi, mahsulot kelganda sotuvchiga o\'tkaziladi.' },
  { icon: '⭐', title: '6. Reyting va Trust Score', desc: 'Muvaffaqiyatli bitimlar soni, reyting va Trust Score — ishonchlilik ko\'rsatkichlari.' },
];

const FEATURES = [
  { icon: '🏪', title: 'Deadstock Marketplace', desc: 'Ortiqcha stok, partiyaviy va qaytarilgan mahsulotlar uchun maxsus B2B platforma.' },
  { icon: '🤖', title: 'AI Trust Score', desc: 'Har bir lot va sotuvchi uchun avtomatik ishonchlilik bahosi — scam xavfini kamaytiradi.' },
  { icon: '🛡️', title: 'ESCROW Himoya', desc: 'To\'lov xavfsiz saqlanadi, mahsulot yetib borgandan keyin sotuvchiga o\'tkaziladi.' },
  { icon: '💰', title: '0% Komissiya', desc: 'Uzum 15-25%, OLX premium xizmatlardan farqli — DeLiKet\'da komissiya yo\'q.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Real-time bozor tahlili, narx trendlari, sotuvchilar reytingi.' },
  { icon: '🌍', title: 'Cross-Border', desc: 'KGZ, KAZ, TJK, RUS bozorlariga chiqing. Yetkazish xarajati aniq.' },
  { icon: '🔄', title: 'Trade-In', desc: 'Eski qurilmalarni AI baholash orqali soting yoki almashtiring.' },
  { icon: '🎓', title: 'Seller Academy', desc: '5 ta interaktiv dars orqali sotuv mahoratingizni oshiring va XP to\'plang.' },
  { icon: '⚡', title: 'Premium Subscription', desc: 'Cheksiz lotlar, AI Price Optimizer, premium badge va boshqa imkoniyatlar.' },
];

export default function HowItWorksPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
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
              <defs><linearGradient id="lgHi" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgHi)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <nav className="hidden md:flex items-center gap-1">
            <a href="/" className="px-3 py-2 text-sm rounded-lg no-underline transition hover:bg-surface-hover" style={{ color: 'var(--text-secondary)' }}>Bosh</a>
            <a href="/how-it-works" className="px-3 py-2 text-sm font-semibold rounded-lg no-underline" style={{ color: 'var(--accent)', background: 'var(--accent-50)' }}>Qo'llanma</a>
          </nav>
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full border-none cursor-pointer transition" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Qanday ishlaydi?</h1>
          <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: 'var(--text-tertiary)' }}>DeLiKet bozori — ortiqcha mahsulotlarni likvidatsiya qilishning eng tez va xavfsiz usuli</p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {STEPS.map((step, i) => (
            <div key={i} className="p-6 rounded-xl border text-center hover:-translate-y-1 transition" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-3xl mb-3">{step.icon}</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <h2 className="text-xl font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>Barcha imkoniyatlar</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="text-lg mb-2">{f.icon}</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a href="https://t.me/DeLiKatbot" target="_blank"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl no-underline transition"
            style={{ background: 'var(--accent)', color: 'white' }}>
            ✈️ Botga o'tish — 1 daqiqa
          </a>
        </div>
      </div>
    </div>
  );
}

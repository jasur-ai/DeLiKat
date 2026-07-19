'use client';

import { useState, useEffect, FormEvent } from 'react';

declare global {
  interface Window { onTelegramAuth?: (user: any) => void; }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tgCode, setTgCode] = useState('');
  const [showTgForm, setShowTgForm] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('deliket-theme') === 'dark' ||
      (!localStorage.getItem('deliket-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Setup Telegram widget
    window.onTelegramAuth = (user) => {
      fetch('/api/auth/telegram-widget-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })
        .then(r => r.json())
        .then(d => { if (d.ok) window.location.href = '/'; else setError(d.detail || 'Xatolik'); })
        .catch(e => setError('Xatolik: ' + e.message));
    };

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'DeLiKatbot');
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    const container = document.getElementById('tgWidget');
    if (container) container.appendChild(script);
  }, []);

  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('deliket-theme', next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Kirishda xatolik');
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTgCodeSubmit = async () => {
    if (tgCode.length !== 6) { setError('6 xonali kodni to\'liq kiriting'); return; }
    setError('');
    setTgLoading(true);
    try {
      const res = await fetch('/api/auth/telegram-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tgCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Xatolik');
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTgLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-dim)' }}>
      <div className="w-full max-w-[420px]">
        <div className="bg-surface border border-border rounded-xl p-8 shadow-modal">
          <a href="/" className="flex items-center justify-center gap-2 text-lg font-bold mb-1 no-underline" style={{ color: 'var(--text-primary)' }}>
            <svg viewBox="0 0 36 36" fill="none" style={{ width: 28, height: 28 }}>
              <defs><linearGradient id="lgL" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgL)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <h1 className="text-xl font-bold text-center mb-1">Xush kelibsiz</h1>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--text-tertiary)' }}>Hisobingizga kiring yoki yangi hisob yarating</p>

          {error && (
            <div className="p-2.5 mb-4 text-sm rounded-md" style={{ background: 'var(--error-light)', color: 'var(--error)' }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="email@example.com" required
                className="w-full px-3 py-2.5 text-sm border rounded-md outline-none transition"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,145,0,0.1)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-primary)'; e.target.style.boxShadow = 'none' }} />
            </div>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Parol</label>
                <a href="/reset-password" className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>Parolni unutdingizmi?</a>
              </div>
              <div className="relative">
                <input value={password} onChange={e => setPassword(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="••••••••" required
                  className="w-full px-3 py-2.5 text-sm border rounded-md outline-none transition" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,145,0,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-primary)'; e.target.style.boxShadow = 'none' }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs p-1 bg-none border-none cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-60"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {loading ? <span className="inline-flex gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay:'0ms'}}/><span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay:'150ms'}}/><span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay:'300ms'}}/></span> : 'Kirish'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--text-quaternary)' }}>yoki</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
          </div>

          <div className="flex flex-col items-center gap-3">
            <div id="tgWidget" style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />

            <button onClick={() => setShowTgForm(!showTgForm)}
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium rounded-md cursor-pointer transition"
              style={{ border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              6 xonali kod bilan kirish
            </button>

            {showTgForm && (
              <div className="w-full">
                <p className="text-xs text-center mb-3 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  Telegram botda <strong style={{ color: 'var(--text-primary)' }}>/web_login</strong> buyrug'ini yuboring.
                  <br />Bot sizga <strong>6 xonali kod</strong> beradi.
                </p>
                <div className="flex gap-2">
                  <input value={tgCode} onChange={e => setTgCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                    onKeyDown={e => { if (e.key === 'Enter' && tgCode.length === 6) handleTgCodeSubmit(); }}
                    type="text" placeholder="000000" maxLength={6}
                    className="flex-1 px-3 py-2.5 text-lg font-bold text-center border rounded-md outline-none transition" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)', fontFamily: 'monospace', letterSpacing: '0.3em' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
                  <button onClick={handleTgCodeSubmit} disabled={tgLoading}
                    className="px-4 py-2.5 text-sm font-semibold rounded-md border-none cursor-pointer transition disabled:opacity-60"
                    style={{ background: 'var(--accent)', color: 'white' }}>
                    {tgLoading ? '...' : 'Kirish'}
                  </button>
                </div>
                <div className="text-center mt-2">
                  <a href="https://t.me/DeLiKatbot" target="_blank" className="text-xs" style={{ color: 'var(--accent)' }}>Botga o'tish</a>
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Hisobingiz yo'qmi? <a href="/register" className="font-semibold" style={{ color: 'var(--accent)' }}>Ro'yxatdan o'tish</a>
          </div>
        </div>
      </div>

      {/* Theme toggle */}
      <button onClick={toggleTheme}
        className="fixed bottom-4 right-4 w-10 h-10 flex items-center justify-center rounded-full shadow-lg border-none cursor-pointer z-50 transition"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
        🌓
      </button>

      {/* Mobile menu */}
      <button onClick={() => setMobileMenu(!mobileMenu)}
        className="fixed top-3 right-3 flex-col gap-1.5 p-2 rounded-md z-50 md:hidden bg-none border-none cursor-pointer"
        style={{ display: window.innerWidth < 768 ? 'flex' : 'none', background: 'var(--surface)' }}>
        <span className={`block w-5 h-0.5 transition ${mobileMenu ? 'rotate-45 translate-y-1.5' : ''}`} style={{ background: 'var(--text-primary)' }} />
        <span className={`block w-5 h-0.5 transition ${mobileMenu ? 'opacity-0' : ''}`} style={{ background: 'var(--text-primary)' }} />
        <span className={`block w-5 h-0.5 transition ${mobileMenu ? '-rotate-45 -translate-y-1.5' : ''}`} style={{ background: 'var(--text-primary)' }} />
      </button>
      {mobileMenu && (
        <nav className="fixed inset-0 z-40 flex flex-col justify-center items-center p-10" style={{ background: 'var(--surface)' }}>
          <div className="flex flex-col gap-4 text-center">
            {['Bosh', 'Analytics', 'Sotuvchilar', 'Bitimlar', 'Academy'].map(item => (
              <a key={item} href={item === 'Bosh' ? '/' : `/${item.toLowerCase()}`}
                className="text-lg font-semibold px-5 py-3 rounded-lg transition no-underline"
                style={{ color: 'var(--text-secondary)' }}
                onClick={() => setMobileMenu(false)}>
                {item === 'Bosh' ? '🏠 ' : ''}{item}
              </a>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

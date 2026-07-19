'use client';

import { useState, useEffect, FormEvent } from 'react';

declare global {
  interface Window { onTelegramAuth?: (user: any) => void; }
}

const ROLES = [
  { id: 'xaridor', label: 'Xaridor', icon: '🛍️' },
  { id: 'sotuvchi', label: 'Sotuvchi', icon: '🏪' },
  { id: 'ikkalasi', label: 'Ikkalasi', icon: '🤝' },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState('xaridor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('deliket-theme') === 'dark' ||
      (!localStorage.getItem('deliket-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

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
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ro'yxatdan o'tishda xatolik");
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-dim)' }}>
      <div className="w-full max-w-[440px]">
        <div className="bg-surface border border-border rounded-xl p-8 shadow-modal">
          <a href="/" className="flex items-center justify-center gap-2 text-lg font-bold mb-1 no-underline" style={{ color: 'var(--text-primary)' }}>
            <svg viewBox="0 0 36 36" fill="none" style={{ width: 28, height: 28 }}>
              <defs><linearGradient id="lgR" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgR)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <h1 className="text-xl font-bold text-center mb-1">Hisob yaratish</h1>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--text-tertiary)' }}>Bepul hisob yarating va marketplace'ga qo'shiling</p>

          {error && (
            <div className="p-2.5 mb-4 text-sm rounded-md" style={{ background: 'var(--error-light)', color: 'var(--error)' }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Ismingiz</label>
                <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Ali" required
                  className="w-full px-3 py-2.5 text-sm border rounded-md outline-none transition"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-primary)'; }} />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Telefon</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+998 90 123 45 67"
                  className="w-full px-3 py-2.5 text-sm border rounded-md outline-none transition"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="ali@example.com" required
                className="w-full px-3 py-2.5 text-sm border rounded-md outline-none transition"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Kim bo'lib qo'shilasiz?</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)}
                    className="py-2.5 px-2 text-center text-xs font-medium rounded-md cursor-pointer transition"
                    style={{
                      border: `1px solid ${role === r.id ? 'var(--accent)' : 'var(--border-primary)'}`,
                      background: role === r.id ? 'var(--accent-50)' : 'var(--surface)',
                      color: role === r.id ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: role === r.id ? 600 : 500,
                    }}>
                    <span className="block text-lg mb-0.5">{r.icon}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>Parol</label>
              <div className="relative">
                <input value={password} onChange={e => setPassword(e.target.value)} type={showPass ? 'text' : 'password'} placeholder="Kamida 4 belgi" required minLength={4}
                  className="w-full px-3 py-2.5 text-sm border rounded-md outline-none transition"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs p-1 bg-none border-none cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-60"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {loading ? <span className="inline-flex gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay:'0ms'}}/><span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay:'150ms'}}/><span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay:'300ms'}}/></span> : "Ro'yxatdan o'tish"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--text-quaternary)' }}>yoki</span>
            <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
          </div>

          <div className="flex flex-col items-center gap-3">
            <div id="tgWidget" style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            <a href="https://t.me/DeLiKatbot" target="_blank"
              className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium rounded-md transition no-underline"
              style={{ border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
              📱 Telegram'da tezroq ro'yxatdan o'tish
            </a>
          </div>

          <div className="text-center mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Hisobingiz bormi? <a href="/login" className="font-semibold" style={{ color: 'var(--accent)' }}>Kirish</a>
          </div>
        </div>
      </div>

      <button onClick={toggleTheme}
        className="fixed bottom-4 right-4 w-10 h-10 flex items-center justify-center rounded-full shadow-lg border-none cursor-pointer z-50 transition"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
        🌓
      </button>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface HeaderProps {
  /** Current page for active highlighting */
  active?: string;
}

const NAV_ITEMS = [
  { id: 'home', label: '🏠 Bosh', href: '/' },
  { id: 'seller', label: '🏪 Sotuvchilar', href: '/seller' },
  { id: 'deals', label: '💰 Bitimlar', href: '/deals' },
  { id: 'chat', label: '💬 Chat', href: '/chat' },
  { id: 'analytics', label: '📊 Analytics', href: '/analytics' },
  { id: 'leaderboard', label: '🏆 Reyting', href: '/leaderboard' },
  { id: 'reviews', label: '⭐ Sharhlar', href: '/reviews' },
  { id: 'how-it-works', label: '📖 Qo\'llanma', href: '/how-it-works' },
  { id: 'subscription', label: '💎 Premium', href: '/subscription' },
];

export default function Header({ active = 'home' }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    setScrolled(window.scrollY > 20);

    const fetchCounts = () => {
      // Bildirishnomalar
      fetch('/api/notifications?user_id=1')
        .then(r => r.json())
        .then(d => { if (d.ok) setNotifCount(d.unread_count || 0); })
        .catch(() => {});

      // Chat — conversation list dan unread count
      fetch('/api/chat?user_id=1')
        .then(r => r.json())
        .then(d => {
          if (d.ok && d.conversations) {
            const total = d.conversations.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
            setChatUnread(total);
          }
        })
        .catch(() => {});
    };

    fetchCounts();
    // Har 30 sekundda yangilash
    const interval = setInterval(fetchCounts, 30000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 transition-shadow duration-200"
      style={{
        background: scrolled
          ? darkMode ? 'rgba(18,18,18,0.92)' : 'rgba(255,255,255,0.92)'
          : 'var(--surface)',
        borderBottom: `1px solid ${scrolled ? 'var(--border-primary)' : 'transparent'}`,
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}>
      <div className="max-w-7xl mx-auto px-5 h-full flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 text-lg font-bold no-underline shrink-0" style={{ color: 'var(--text-primary)' }}>
          <svg viewBox="0 0 36 36" fill="none" style={{ width: 28, height: 28 }}>
            <defs><linearGradient id="headerLogo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
            <rect width="36" height="36" rx="9" fill="url(#headerLogo)" />
            <path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" />
            <circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
          </svg>
          DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
          {NAV_ITEMS.slice(0, 7).map(item => (
            <a
              key={item.id}
              href={item.href}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg no-underline whitespace-nowrap transition-colors"
              style={{
                color: active === item.id ? 'var(--accent)' : 'var(--text-secondary)',
                background: active === item.id ? 'var(--accent-50)' : 'transparent',
              }}
              onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.background = 'var(--surface-hover)'; }}
              onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.background = 'transparent'; }}>
              {item.label}
            </a>
          ))}
          <a href="https://t.me/DeLiKatbot" target="_blank"
            className="ml-2 px-4 py-1.5 text-xs font-semibold rounded-full no-underline whitespace-nowrap transition-all"
            style={{ background: 'var(--accent)', color: 'white' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            ✈️ Bot
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Chat */}
          <a href="/chat"
            className="relative w-8 h-8 flex items-center justify-center rounded-full no-underline transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Chat">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {chatUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white rounded-full"
                style={{ background: '#6366f1' }}>
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </a>

          {/* Notification Bell */}
          <a href="/notifications"
            className="relative w-8 h-8 flex items-center justify-center rounded-full no-underline transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Bildirishnomalar">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[10px] font-bold text-white rounded-full"
                style={{ background: 'var(--accent)' }}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </a>

          <button onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-full border-none cursor-pointer transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            aria-label="Toggle theme">
            {darkMode ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1 p-2 rounded-lg border-none cursor-pointer transition-colors"
            style={{ background: 'transparent' }}
            aria-label="Toggle menu">
            <span className={`block w-5 h-0.5 transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`}
              style={{ background: 'var(--text-primary)' }} />
            <span className={`block w-5 h-0.5 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`}
              style={{ background: 'var(--text-primary)' }} />
            <span className={`block w-5 h-0.5 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}
              style={{ background: 'var(--text-primary)' }} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col"
          style={{ background: 'var(--surface)', marginTop: '64px' }}>
          <div className="flex flex-col gap-1 p-5 overflow-y-auto">
            {NAV_ITEMS.map(item => (
              <a key={item.id} href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl no-underline transition-colors"
                style={{
                  color: active === item.id ? 'var(--accent)' : 'var(--text-primary)',
                  background: active === item.id ? 'var(--accent-50)' : 'transparent',
                }}>
                {item.label}
              </a>
            ))}
            <a href="/chat" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl no-underline transition-colors"
              style={{ color: 'var(--text-primary)' }}>
              💬 Xabarlar {chatUnread > 0 && <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#6366f1', color: 'white' }}>{chatUnread}</span>}
            </a>
            <a href="/notifications" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-base font-medium rounded-xl no-underline transition-colors"
              style={{ color: 'var(--text-primary)' }}>
              🔔 Bildirishnomalar {notifCount > 0 && <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--accent)' }}>{notifCount}</span>}
            </a>
            <div className="border-t my-3" style={{ borderColor: 'var(--border-primary)' }} />
            <a href="https://t.me/DeLiKatbot" target="_blank" onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold rounded-xl no-underline transition-all"
              style={{ background: 'var(--accent)', color: 'white' }}>
              ✈️ Telegram bot
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

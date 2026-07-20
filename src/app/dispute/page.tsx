'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  ochiq: { label: 'Ochiq', color: '#f59e0b', icon: '🔴' },
  "ko'rib_chiqilmoqda": { label: "Ko'rib chiqilmoqda", color: '#6366f1', icon: '🔵' },
  hal_qilingan: { label: 'Hal qilingan', color: '#10b981', icon: '✅' },
  rad_etilgan: { label: 'Rad etilgan', color: '#ef4444', icon: '❌' },
};

export default function DisputePage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Try to get current user
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.user) {
          setUserId(d.user.id);
          return Promise.all([
            fetch(`/api/disputes/user/${d.user.id}`).then(r => r.json()),
            fetch('/api/disputes/stats').then(r => r.json()),
          ]);
        }
        return Promise.all([
          Promise.resolve(null),
          fetch('/api/disputes/stats').then(r => r.json()),
        ]);
      })
      .then(([d, s]: any) => {
        if (d?.disputes) setDisputes(d.disputes);
        if (s) setStats(s);
      })
      .catch(console.error)
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
      <Header active="dispute" />

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>⚖️ Dispute Center</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Nizolarni adolat bilan hal qiling</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-3 mb-8">
            {[
              { label: 'Jami', value: stats.total, color: 'var(--text-primary)' },
              { label: 'Ochiq', value: stats.open, color: '#f59e0b' },
              { label: "Ko'rib chiqilmoqda", value: stats.reviewing, color: '#6366f1' },
              { label: 'Hal qilingan', value: stats.resolved, color: '#10b981' },
              { label: 'Resolution rate', value: `${stats.resolution_rate}%`, color: 'var(--text-primary)' },
            ].map(s => (
              <div key={s.label} className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {!userId ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-3xl mb-3">🔒</div>
            <p>Dispute'larni ko'rish uchun <a href="/login" style={{ color: 'var(--accent)' }}>kiring</a></p>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="h-4 w-48 rounded" style={{ background: 'var(--surface-hover)' }} />
              </div>
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-3xl mb-3">⚖️</div>
            <p>Sizda ochiq dispute'lar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d: any) => {
              const si = STATUS_MAP[d.status] || { label: d.status, color: '#9e9e9e', icon: '⚪' };
              return (
                <div key={d.id} className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{d.lot_title}</span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${si.color}15`, color: si.color }}>
                      {si.icon} {si.label}
                    </span>
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{d.reason}</div>
                  <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span>💰 {d.transaction_amount?.toLocaleString()} so'm</span>
                    <span>📅 {d.created_at ? new Date(d.created_at).toLocaleDateString('uz-UZ') : '—'}</span>
                    {d.days_open !== null && <span>⏱ {d.days_open} kun</span>}
                  </div>
                  {d.resolution && (
                    <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                      Yechim: <strong style={{ color: 'var(--text-primary)' }}>{d.resolution}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

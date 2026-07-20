'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [verifyLink, setVerifyLink] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.user) setUser(d.user);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/');
  };

  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      const res = await fetch('/api/auth/send-verification', { method: 'POST', credentials: 'include' });
      const d = await res.json();
      if (d.ok && d.verify_link) setVerifyLink(d.verify_link);
    } catch (e) { console.error('Verify error:', e); } finally { setVerifyLoading(false); }
  };

  const roleLabels: Record<string, string> = { sotuvchi: 'Sotuvchi', xaridor: '🛍️ Xaridor', ikkalasi: '🤝 Ikkalasi' };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <div className="text-center animate-pulse" style={{ color: 'var(--text-tertiary)' }}>Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-dim)' }}>
      <Header active="profile" />

      <div className="pt-24 pb-16 max-w-3xl mx-auto px-5">
        {error ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">🔒</div>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Kirish talab qilinadi</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Profilni ko'rish uchun hisobingizga kiring</p>
            <div className="flex gap-3 justify-center">
              <a href="/login" className="px-6 py-2.5 text-sm font-semibold rounded-lg no-underline" style={{ background: 'var(--accent)', color: 'white' }}>Kirish</a>
              <a href="/register" className="px-6 py-2.5 text-sm font-semibold rounded-lg no-underline border" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>Ro'yxatdan o'tish</a>
            </div>
          </div>
        ) : user ? (
          <>
            {/* Profile Header */}
            <div className="flex items-center gap-4 p-6 rounded-xl border mb-6" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0" style={{ background: 'var(--accent)' }}>
                {user.name?.charAt(0)?.toUpperCase() || '👤'}
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{user.name}</div>
                <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{user.email}</div>
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1" style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}>
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.level || 1}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Level</div>
              </div>
              <div className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.xp || 0}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>XP</div>
              </div>
              <div className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{(user.trust_score || 0).toFixed(1)}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Trust Score</div>
              </div>
              <div className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{(user.rating || 0).toFixed(1)}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>☆ Reyting</div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="p-6 rounded-xl border mb-6" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Shaxsiy ma'lumotlar</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Ism</div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{user.name}</div>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Email</div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{user.email}</div>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Telefon</div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{user.phone || '—'}</div>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Rol</div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{roleLabels[user.role] || user.role}</div>
                </div>
              </div>
            </div>

            {/* Email Verification */}
            <div className="p-5 rounded-xl border mb-6" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Email tasdiqlash</h3>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: user.email_verified ? '#10b981' : 'var(--text-primary)' }}>
                    {user.email_verified ? '✅ Email tasdiqlangan' : '⚠️ Email tasdiqlanmagan'}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{user.email}</div>
                </div>
                {user.email_verified ? (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Tasdiqlangan</span>
                ) : (
                  <button onClick={handleVerify} disabled={verifyLoading}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-60"
                    style={{ background: 'var(--accent)', color: 'white' }}>
                    {verifyLoading ? '...' : 'Tasdiqlash'}
                  </button>
                )}
              </div>
              {verifyLink && (
                <div className="mt-3 text-xs" style={{ color: 'var(--accent)' }}>
                  Havola: <a href={verifyLink} className="underline">{verifyLink}</a>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <a href="https://t.me/DeLiKatbot" target="_blank" className="px-5 py-2.5 text-sm font-semibold rounded-lg no-underline transition" style={{ background: '#0088cc', color: 'white' }}>
                ✈️ Botga o'tish
              </a>
              <button onClick={handleLogout} className="px-5 py-2.5 text-sm font-semibold rounded-lg border cursor-pointer transition"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
                Chiqish
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

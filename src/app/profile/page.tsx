'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import TrustScore from '@/components/TrustScore';

// 🔐 KYC Verification section
function KycSection({ userId }: { userId: number }) {
  const [kyc, setKyc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/kyc?userId=${userId}`).then(r => r.json()).then(d => {
      if (d.ok) setKyc(d);
    }).catch(console.error).finally(() => setLoading(false));
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const res = await fetch('/api/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        full_name: data.get('full_name'),
        document_type: data.get('document_type'),
        document_number: data.get('document_number'),
        phone: data.get('phone'),
      }),
    });
    const d = await res.json();
    if (d.ok) {
      setKyc((prev: any) => ({ ...prev, status: 'pending' }));
      setShowForm(false);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="p-5 rounded-xl border animate-pulse mb-6" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="h-4 rounded w-32" style={{ background: 'var(--surface-hover)' }} />
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl border mb-6" style={{
      borderColor: kyc?.verified ? 'rgba(16,185,129,0.3)' : 'var(--border-primary)',
      background: kyc?.verified ? 'rgba(16,185,129,0.03)' : 'var(--surface)',
    }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          🔐 Sotuvchi identifikatsiyasi (KYC)
        </h3>
        {kyc?.verified ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            ✅ Tasdiqlangan
          </span>
        ) : kyc?.status === 'pending' ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            ⏳ Tekshirilmoqda
          </span>
        ) : (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            ❌ Tasdiqlanmagan
          </span>
        )}
      </div>

      {kyc?.verified ? (
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span>📄 Hujjat: {kyc.method || 'passport'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>✅ Daraja: {kyc.level === 'full' ? 'To\'liq' : 'Asosiy'}</span>
            <span>·</span>
            <span>📅 {kyc.verified_at ? new Date(kyc.verified_at).toLocaleDateString('uz-UZ') : '—'}</span>
          </div>
        </div>
      ) : kyc?.status === 'pending' ? (
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Arizyngiz tekshirilmoqda. Admin tomonidan tasdiqlangach sizga bildirishnoma keladi.
        </div>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="full_name" placeholder="To\'liq ismingiz" required
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)', color: 'var(--text-primary)' }} />
          <select name="document_type"
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)', color: 'var(--text-primary)' }}>
            <option value="passport">Passport (biometrik)</option>
            <option value="id_card">ID karta</option>
            <option value="driver_license">Haydovchilik guvohnomasi</option>
          </select>
          <input name="document_number" placeholder="Hujjat raqami" required
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)', color: 'var(--text-primary)' }} />
          <input name="phone" placeholder="Telefon (+998901234567)" required
            className="w-full px-3 py-2 text-sm rounded-lg border"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)', color: 'var(--text-primary)' }} />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-60"
              style={{ background: 'var(--accent)', color: 'white' }}>
              {submitting ? 'Yuborilmoqda...' : '📤 Arizani yuborish'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'transparent' }}>
              Bekor qilish
            </button>
          </div>
        </form>
      ) : (
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <p className="mb-3">Sotuvchi sifatida lot qo\'yish uchun shaxsingizni tasdiqlashingiz kerak.</p>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg border-none cursor-pointer transition"
            style={{ background: 'var(--accent)', color: 'white' }}>
            🔐 Tasdiqlashni boshlash
          </button>
        </div>
      )}
    </div>
  );
}

// 🤖 Trust Score section (fetches data from API)
function TrustScoreSection({ userId }: { userId: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trust-score?userId=${userId}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="p-5 rounded-xl border animate-pulse mb-6" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="h-4 rounded w-32 mb-3" style={{ background: 'var(--surface-hover)' }} />
        <div className="h-2 rounded-full w-full" style={{ background: 'var(--surface-hover)' }} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-6">
      <TrustScore data={data} showBreakdown={true} />
    </div>
  );
}

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

            {/* Stats + Trust Score */}
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
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.rating || 0}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>☆ Reyting</div>
              </div>
              <div className="p-4 text-center rounded-xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{(user.trust_score || 0).toFixed(1)}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>🛡️ Trust Score</div>
              </div>
            </div>

            {/* 🤖 AI Trust Score — Full Breakdown */}
            <TrustScoreSection userId={user.id} />

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

            {/* 🔐 KYC Verification */}
            <KycSection userId={user.id} />

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

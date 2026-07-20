'use client';

/**
 * 🏷️ Product Authentication UI Component
 *
 * Compact badge + Full verification details modal
 * Raqobatchilarda yo'q — DeLiKet unique feature
 */

import { useEffect, useState } from 'react';

interface VerificationBadge {
  label: string;
  icon: string;
  color: string;
  bg: string;
}

interface VerificationData {
  ok: boolean;
  status: string;
  score: number;
  badge?: VerificationBadge;
  verification?: {
    id: number;
    brand: string;
    model?: string;
    imei?: string;
    serial_number?: string;
    status: string;
    method: string;
    score: number;
    ai_image_score?: number;
    ai_image_details?: string;
    checked_at: string;
  };
  imei?: { valid: boolean; brand?: string; model?: string; error?: string };
  serial?: { valid: boolean; brand?: string; error?: string };
  ai_image?: { score: number; passed: boolean; details: string; flags?: string[] };
  combined?: { verified: boolean; confidence: number; notes: string };
}

interface Props {
  lotId: number;
  title: string;
  compact?: boolean;
  onVerifyStart?: () => void;
  onVerifyEnd?: (result: VerificationData) => void;
}

export default function ProductVerification({ lotId, title, compact = false, onVerifyStart, onVerifyEnd }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VerificationData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [imeiInput, setImeiInput] = useState('');
  const [serialInput, setSerialInput] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Load existing verification
  const loadVerification = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/product-auth?lot_id=${lotId}`);
      const d = await res.json();
      if (d.ok && (d.verification || d.status)) setData(d);
    } catch {} finally { setLoading(false); }
  };

  // Run new verification
  const runVerification = async () => {
    if (!imeiInput && !serialInput) return;

    setLoading(true);
    setShowForm(false);
    onVerifyStart?.();

    try {
      const res = await fetch('/api/product-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_id: lotId,
          title,
          imei: imeiInput || undefined,
          serial_number: serialInput || undefined,
          image_urls: [],
        }),
      });
      const d = await res.json();
      setData(d);
      onVerifyEnd?.(d);
    } catch {} finally { setLoading(false); }
  };

  const badge = data?.badge;
  const v = data?.verification;

  // Auto-load verification on mount
  useEffect(() => {
    loadVerification();
  }, []);

  // Reset form state when modal opens
  useEffect(() => {
    if (showModal) {
      setShowForm(false);
      setImeiInput('');
      setSerialInput('');
    }
  }, [showModal]);

  // Compact badge for lot cards
  if (compact) {
    if (loading && !data) {
      return (
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full animate-pulse"
          style={{ background: 'var(--surface-hover)', color: 'var(--text-tertiary)' }}>
          🔍 Tekshirilmoqda...
        </div>
      );
    }

    return (
      <button
        onClick={() => { loadVerification(); setShowModal(true); }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border-none cursor-pointer transition-all hover:scale-105"
        style={{
          background: badge?.bg || 'var(--surface-hover)',
          color: badge?.color || 'var(--text-tertiary)',
        }}
        title="Mahsulot autentifikatsiyasi">
        <span>{badge?.icon || '🔍'}</span>
        <span>{badge ? badge.label.split('(')[0].trim() : 'Tekshirish'}</span>
      </button>
    );
  }

  // Full verification modal trigger (for detail page)
  return (
    <>
      <button
        onClick={() => { loadVerification(); setShowModal(true); }}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          borderColor: badge?.color || 'var(--border-primary)',
          color: badge?.color || 'var(--text-secondary)',
          background: badge?.bg || 'transparent',
        }}>
        <span>{badge?.icon || '🛡️'}</span>
        <span>{badge?.label || 'Mahsulotni tekshirish'}</span>
        {loading && <span className="ml-1 animate-pulse">...</span>}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--surface)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                🏷️ Mahsulot autentifikatsiyasi
              </h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full border-none cursor-pointer"
                style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
                ✕
              </button>
            </div>

            {!data && !loading && (
              <div className="text-center py-8">
                <div className="text-3xl mb-3">🔍</div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Bu mahsulot hali tekshirilmagan
                </p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  IMEI yoki Serial raqamni kiriting yoki AI rasm analizini ishga tushiring
                </p>
                <button onClick={() => setShowForm(true)}
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg border-none cursor-pointer transition"
                  style={{ background: 'var(--accent)', color: 'white' }}>
                  🛡️ Autentifikatsiyani boshlash
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin text-3xl mb-3">🔍</div>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Tekshirilmoqda...</p>
              </div>
            )}

            {/* Verification Form */}
            {showForm && !loading && (
              <div className="space-y-3 mb-4 p-4 rounded-xl" style={{ background: 'var(--surface-dim)' }}>
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-primary)' }}>
                    IMEI raqam (15 xonali)
                  </label>
                  <input value={imeiInput} onChange={e => setImeiInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 15))}
                    placeholder="356307112345678"
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                    style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                    maxLength={15} />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-primary)' }}>
                    Serial raqam
                  </label>
                  <input value={serialInput} onChange={e => setSerialInput(e.target.value.toUpperCase())}
                    placeholder="F2LZ5Y1MQ5YF"
                    className="w-full px-3 py-2 text-sm rounded-lg border outline-none"
                    style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }} />
                </div>
                <div className="flex gap-2">
                  <button onClick={runVerification} disabled={!imeiInput && !serialInput}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'white' }}>
                    🔍 Tekshirish
                  </button>
                  <button onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 text-sm font-semibold rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'transparent' }}>
                    Bekor qilish
                  </button>
                </div>
              </div>
            )}

            {/* Results */}
            {data && !loading && (
              <div className="space-y-4">
                {/* Badge */}
                {badge && (
                  <div className="p-4 rounded-xl text-center" style={{ background: badge.bg }}>
                    <div className="text-lg font-bold" style={{ color: badge.color }}>
                      {badge.icon} {badge.label}
                    </div>
                    {data.combined?.notes && (
                      <div className="text-xs mt-1" style={{ color: badge.color, opacity: 0.8 }}>
                        {data.combined.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* IMEI Result */}
                {data.imei && (
                  <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>📱 IMEI tekshiruvi</span>
                      <span className={`text-xs font-bold ${data.imei.valid ? 'text-green-500' : 'text-red-500'}`}>
                        {data.imei.valid ? '✅ To\'g\'ri' : '❌ Xato'}
                      </span>
                    </div>
                    {data.imei.brand && <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Brend: {data.imei.brand}</div>}
                    {data.imei.error && <div className="text-xs text-red-500 mt-1">{data.imei.error}</div>}
                  </div>
                )}

                {/* Serial Result */}
                {data.serial && (
                  <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>🔤 Serial raqam tekshiruvi</span>
                      <span className={`text-xs font-bold ${data.serial.valid ? 'text-green-500' : 'text-red-500'}`}>
                        {data.serial.valid ? '✅ To\'g\'ri' : '❌ Xato'}
                      </span>
                    </div>
                    {data.serial.brand && <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Brend: {data.serial.brand}</div>}
                    {data.serial.error && <div className="text-xs text-red-500 mt-1">{data.serial.error}</div>}
                  </div>
                )}

                {/* AI Image Result */}
                {data.ai_image && (
                  <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>🖼️ AI rasm analizi</span>
                      <span className="text-xs font-bold" style={{ color: data.ai_image.passed ? '#10b981' : '#f59e0b' }}>
                        {data.ai_image.score}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full mt-1 mb-1" style={{ background: 'var(--surface-hover)' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${data.ai_image.score}%`,
                        background: data.ai_image.score >= 80 ? '#10b981' : data.ai_image.score >= 60 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{data.ai_image.details}</div>
                    {data.ai_image.flags && data.ai_image.flags.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {data.ai_image.flags.map((flag, i) => (
                          <div key={i} className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{flag}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Product Info */}
                {v && (
                  <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                    <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>📋 Tekshiruv ma'lumotlari</div>
                    <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <div>Brend: <strong style={{ color: 'var(--text-primary)' }}>{v.brand}</strong></div>
                      <div>Metod: <strong style={{ color: 'var(--text-primary)' }}>{v.method}</strong></div>
                      <div>Baho: <strong style={{ color: 'var(--text-primary)' }}>{v.score}/100</strong></div>
                      <div>Sana: <strong style={{ color: 'var(--text-primary)' }}>{v.checked_at ? new Date(v.checked_at).toLocaleDateString('uz-UZ') : '—'}</strong></div>
                    </div>
                  </div>
                )}

                {/* Verify Again Button */}
                <button onClick={() => setShowForm(true)}
                  className="w-full py-2.5 text-sm font-semibold rounded-lg border cursor-pointer transition"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'transparent' }}>
                  🔄 Qayta tekshirish
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

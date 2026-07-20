'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';

interface FiscalStats {
  total: number;
  pending: number;
  paid: number;
  fiscal_done: number;
  fiscal_failed: number;
  cancelled: number;
}

interface FiscalReceipt {
  id: number;
  receipt_id: string;
  order_id: string;
  amount: number;
  state: number;
  status: string;
  fiscal_sign?: string;
  fiscal_receipt_id?: number;
  qr_code_url?: string;
  terminal_id?: string;
  ofd_message?: string;
  error?: string;
  created_at: string;
  paid_at?: string;
  fiscal_at?: string;
}

const STATUS_MAP: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  pending: { label: "To'lov kutilmoqda", icon: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  paid: { label: "To'landi (OFD kutilyapti)", icon: '💳', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  fiscal_sent: { label: "OFD ga yuborildi", icon: '📤', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  fiscal_done: { label: "✅ Fiskalizatsiya tugallandi", icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  fiscal_failed: { label: "❌ Fiskalizatsiya xatolik", icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  cancelled: { label: "Bekor qilingan", icon: '🔴', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
};

function fmtPrice(v: number): string {
  const sum = v / 100; // tiyindan so'mga
  if (sum >= 1_000_000) return `${(sum / 1_000_000).toFixed(1)} mln so'm`;
  if (sum >= 1_000) return `${(sum / 1_000).toFixed(0)} ming so'm`;
  return `${sum.toLocaleString()} so'm`;
}

function fmtTime(ts?: string): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('uz-UZ');
}

export default function FiscalPage() {
  const [receipts, setReceipts] = useState<FiscalReceipt[]>([]);
  const [stats, setStats] = useState<FiscalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showQr, setShowQr] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<FiscalReceipt | null>(null);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    Promise.all([
      fetch('/api/fiscal?stats=true').then(r => r.json()),
      fetch('/api/fiscal?list=true').then(r => r.json()),
    ]).then(([s, l]) => {
      if (s.ok) setStats(s.stats);
      if (l.ok) setReceipts(l.receipts || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="analytics" />

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        {/* Header */}
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
            🏛️ Soliq nazorati
          </span>
          <h1 className="text-2xl md:text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            Fiskalizatsiya
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Payme Receipts API orqali O'zbekiston soliq tizimiga fiskal cheklarni yuborish
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Jami</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'rgba(245,158,11,0.05)' }}>
              <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{stats.pending}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>⏳ Kutilmoqda</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'rgba(99,102,241,0.05)' }}>
              <div className="text-2xl font-bold" style={{ color: '#6366f1' }}>{stats.paid}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>💳 To'langan</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'rgba(16,185,129,0.05)' }}>
              <div className="text-2xl font-bold" style={{ color: '#10b981' }}>{stats.fiscal_done}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>✅ Fiskallashtirilgan</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'rgba(239,68,68,0.05)' }}>
              <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>{stats.fiscal_failed}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>❌ Xatolik</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'rgba(220,38,38,0.05)' }}>
              <div className="text-2xl font-bold" style={{ color: '#dc2626' }}>{stats.cancelled}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>🔴 Bekor qilingan</div>
            </div>
          </div>
        )}

        {/* Receipts List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-4 rounded w-32" style={{ background: 'var(--surface-hover)' }} />
                  <div className="h-4 rounded w-16" style={{ background: 'var(--surface-hover)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">🏛️</div>
            <p className="text-lg">Hozircha fiskal cheklar yo'q</p>
            <p className="text-sm mt-2">ESCROW to'lovlari amalga oshirilganda avtomatik fiskal chek yaratiladi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map(receipt => {
              const st = STATUS_MAP[receipt.status] || { label: receipt.status, icon: '❓', color: 'var(--text-tertiary)', bg: 'var(--surface-hover)' };
              return (
                <div key={receipt.id}
                  className="p-5 rounded-xl border transition hover:-translate-y-0.5 hover:shadow-sm cursor-pointer"
                  style={{ borderColor: 'var(--border-primary)' }}
                  onClick={() => setSelectedReceipt(selectedReceipt?.id === receipt.id ? null : receipt)}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                        #{receipt.receipt_id.slice(0, 16)}...
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        📦 {receipt.order_id}
                      </span>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: st.bg, color: st.color }}>
                      {st.icon} {st.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span>💰 {fmtPrice(receipt.amount)}</span>
                    <span>📅 {fmtTime(receipt.created_at)}</span>
                    {receipt.fiscal_at && <span>🏁 {fmtTime(receipt.fiscal_at)}</span>}
                    {receipt.qr_code_url && (
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setShowQr(showQr === receipt.receipt_id ? null : receipt.receipt_id);
                      }}
                        className="text-xs font-semibold border-none cursor-pointer hover:underline"
                        style={{ color: 'var(--accent)' }}>
                        📱 QR kod
                      </button>
                    )}
                  </div>

                  {/* Expandable Details */}
                  {selectedReceipt?.id === receipt.id && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-xs" style={{ borderColor: 'var(--border-primary)' }}>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Fiskal belgi:</span>
                        <div className="font-mono font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {receipt.fiscal_sign || '—'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>VFM chek raqami:</span>
                        <div className="font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {receipt.fiscal_receipt_id || '—'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>Terminal ID:</span>
                        <div className="font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {receipt.terminal_id || '—'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-tertiary)' }}>OFD xabar:</span>
                        <div className="mt-0.5" style={{ color: receipt.ofd_message === 'accepted' ? '#10b981' : 'var(--text-primary)' }}>
                          {receipt.ofd_message || '—'}
                        </div>
                      </div>
                      {receipt.error && (
                        <div className="col-span-2">
                          <span style={{ color: 'var(--text-tertiary)' }}>Xatolik:</span>
                          <div className="mt-0.5" style={{ color: '#ef4444' }}>{receipt.error}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code Modal */}
                  {showQr === receipt.receipt_id && receipt.qr_code_url && (
                    <div className="mt-4 pt-4 border-t flex justify-center" style={{ borderColor: 'var(--border-primary)' }}>
                      <div className="text-center p-4 rounded-xl" style={{ background: 'var(--surface-dim)' }}>
                        <div className="text-xs mb-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
                          🏛️ Fiskal chek QR kodi
                        </div>
                        <div className="w-40 h-40 mx-auto rounded-lg flex items-center justify-center border-2 border-dashed"
                          style={{ background: 'white', borderColor: 'var(--border-primary)' }}>
                          <div className="text-center">
                            <div className="text-4xl mb-1">📱</div>
                            <a href={receipt.qr_code_url} target="_blank"
                              className="text-xs font-semibold no-underline hover:underline"
                              style={{ color: 'var(--accent)' }}>
                              QR kodni ochish
                            </a>
                          </div>
                        </div>
                        <div className="text-xs mt-2 font-mono" style={{ color: 'var(--text-tertiary)' }}>
                          {receipt.fiscal_sign || 'fiskal_belgi'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 p-6 rounded-xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            🏛️ Fiskalizatsiya jarayoni
          </h3>
          <div className="space-y-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>1</div>
              <span><strong style={{ color: 'var(--text-primary)' }}>ReceiptsCreate</strong> — Fiskal chek yaratish (IKPU, QQS, STIR bilan)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>2</div>
              <span><strong style={{ color: 'var(--text-primary)' }}>ReceiptsPay</strong> — To'lovni amalga oshirish</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>3</div>
              <span><strong style={{ color: 'var(--text-primary)' }}>OFD</strong> — Online Fiscal Data Operator chekni ro'yxatdan o'tkazadi</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>4</div>
              <span><strong style={{ color: 'var(--text-primary)' }}>setFiscalData</strong> — Fiskal belgi, QR kod va terminal ID Payme ga yuboriladi</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>5</div>
              <span><strong style={{ color: 'var(--text-primary)' }}>✅ Tugallandi</strong> — Fiskal chek soliq tizimida rasman ro'yxatdan o'tdi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

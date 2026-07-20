'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';

interface Deal {
  id: number; lot_id: number; lot_title: string; lot_category: string; lot_grade: string;
  amount: number; quantity?: number; status: string;
  buyer: { id: number; name: string; rating: number };
  seller: { id: number; name: string; rating: number };
  created_at: string; completed_at?: string;
}

interface EscrowRecord {
  id: number; deal_id: number; lot_id: number;
  buyer_id: number; seller_id: number;
  amount: number; status: string;
  payment_method: string; payment_url?: string; payment_id?: string;
  payme_transaction_id?: string; click_transaction_id?: string;
  transaction_id?: number;
  created_at: string; held_at?: string; released_at?: string; cancelled_at?: string;
}

interface EscrowLog {
  id: number; escrow_id: number;
  action: string; status: string; amount: number;
  provider: string; provider_transaction_id?: string;
  provider_response?: string; error?: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  yakunlangan: { label: '✅ Yakunlangan', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  kutilmoqda: { label: '⏳ Kutilmoqda', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  bekor_qilingan: { label: '❌ Bekor qilingan', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  qabul: { label: '✅ Qabul qilingan', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  rad: { label: '❌ Rad etilgan', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const ESCROW_STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  pending_payment: { label: "To'lov kutilmoqda", color: '#f59e0b', icon: '⏳' },
  held: { label: "ESCROWda saqlanmoqda", color: '#6366f1', icon: '🛡️' },
  released: { label: "Sotuvchiga o'tkazildi", color: '#10b981', icon: '✅' },
  cancelled: { label: "Bekor qilindi", color: '#ef4444', icon: '❌' },
  disputed: { label: "Nizo", color: '#dc2626', icon: '⚖️' },
};

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln so'm`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} ming so'm`;
  return `${v.toLocaleString()} so'm`;
}

const DEMO_USER_ID = 1; // Demo: logged in as user 1 (Jasur Karimov — sotuvchi)

export default function DealDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [deal, setDeal] = useState<Deal | null>(null);
  const [escrow, setEscrow] = useState<EscrowRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [actionResult, setActionResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [escrowLogs, setEscrowLogs] = useState<EscrowLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dealRes] = await Promise.all([
        fetch('/api/deals?limit=200').then(r => r.json()),
      ]);

      if (dealRes.ok) {
        const found = (dealRes.deals || []).find((tx: any) => String(tx.id) === id);
        setDeal(found || null);

        // Load escrow if deal found
        if (found) {
          const escrowRes = await fetch(`/api/payments/escrow?deal_id=${found.id}`);
          const escrowData = await escrowRes.json();
          if (escrowData.ok && escrowData.escrow) {
            setEscrow(escrowData.escrow);
            // Load audit logs for this escrow
            const logsRes = await fetch(`/api/payments/escrow?action=logs&escrow_id=${escrowData.escrow.id}`);
            const logsData = await logsRes.json();
            if (logsData.ok) setEscrowLogs(logsData.logs || []);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    loadData();
  }, [loadData]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const createEscrow = async () => {
    if (!deal) return;
    setActionLoading('create');
    setActionResult(null);
    try {
      const res = await fetch('/api/payments/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          deal_id: deal.id,
          lot_id: deal.lot_id,
          buyer_id: deal.buyer.id,
          seller_id: deal.seller.id,
          amount: deal.amount,
          payment_method: 'payme',
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setEscrow(d.escrow);
        setActionResult({ ok: true, message: '✅ ESCROW muvaffaqiyatli yaratildi!' });
        if (d.payment_url) {
          window.open(d.payment_url, '_blank');
        }
      } else {
        setActionResult({ ok: false, message: `❌ ${d.error || 'Xatolik'}` });
      }
    } catch {
      setActionResult({ ok: false, message: '❌ Server xatosi' });
    } finally {
      setActionLoading(null);
    }
  };

  const simulatePayment = async () => {
    if (!escrow) return;
    setActionLoading('simulate');
    setActionResult(null);
    try {
      const res = await fetch('/api/payments/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate', escrow_id: escrow.id }),
      });
      const d = await res.json();
      if (d.ok) {
        setEscrow(d.escrow);
        setActionResult({ ok: true, message: '🛡️ To\'lov ESCROW da saqlanmoqda!' });
        loadData();
      } else {
        setActionResult({ ok: false, message: `❌ ${d.error || 'Xatolik'}` });
      }
    } catch {
      setActionResult({ ok: false, message: '❌ Server xatosi' });
    } finally {
      setActionLoading(null);
    }
  };

  const releaseEscrow = async () => {
    if (!escrow) return;
    setActionLoading('release');
    setActionResult(null);
    try {
      const res = await fetch('/api/payments/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release', escrow_id: escrow.id }),
      });
      const d = await res.json();
      if (d.ok) {
        setEscrow(d.escrow);
        setActionResult({ ok: true, message: '✅ Pul sotuvchiga o\'tkazildi!' });
        loadData();
      } else {
        setActionResult({ ok: false, message: `❌ ${d.error || 'Xatolik'}` });
      }
    } catch {
      setActionResult({ ok: false, message: '❌ Server xatosi' });
    } finally {
      setActionLoading(null);
    }
  };

  const cancelEscrow = async () => {
    if (!escrow) return;
    if (!confirm('Haqiqatan ham bu bitimni bekor qilmoqchimisiz?')) return;
    setActionLoading('cancel');
    setActionResult(null);
    try {
      const res = await fetch('/api/payments/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', escrow_id: escrow.id, reason: 'User requested cancellation' }),
      });
      const d = await res.json();
      if (d.ok) {
        setEscrow(d.escrow);
        setActionResult({ ok: true, message: '🔄 Bitim bekor qilindi, pul qaytarildi' });
        loadData();
      } else {
        setActionResult({ ok: false, message: `❌ ${d.error || 'Xatolik'}` });
      }
    } catch {
      setActionResult({ ok: false, message: '❌ Server xatosi' });
    } finally {
      setActionLoading(null);
    }
  };

  const statusInfo = deal ? STATUS_MAP[deal.status] || { label: deal.status, color: 'var(--text-secondary)', bg: 'var(--surface-hover)' } : null;
  const escrowInfo = escrow ? ESCROW_STATUS_MAP[escrow.status] || { label: escrow.status, color: 'var(--text-secondary)', icon: '⚪' } : null;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="deals" />

      <div className="pt-24 pb-16 max-w-3xl mx-auto px-5">
        <a href="/deals" className="text-sm mb-4 inline-block no-underline hover:underline" style={{ color: 'var(--text-tertiary)' }}>
          ← Barcha bitimlar
        </a>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded" style={{ background: 'var(--surface-hover)' }} />
            <div className="h-4 w-64 rounded" style={{ background: 'var(--surface-hover)' }} />
            <div className="grid grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl" style={{ background: 'var(--surface-hover)' }} />)}
            </div>
          </div>
        ) : !deal ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">💰</div>
            <p className="text-lg mb-2">Bitim topilmadi</p>
            <a href="/deals" className="text-sm" style={{ color: 'var(--accent)' }}>← Barcha bitimlar</a>
          </div>
        ) : (
          <>
            {/* Deal Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">💰</span>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Bitim #{deal.id}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{deal.lot_title}</h1>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {statusInfo && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                    {statusInfo.label}
                  </span>
                )}
                {escrowInfo && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${escrowInfo.color}15`, color: escrowInfo.color }}>
                    {escrowInfo.icon} {escrowInfo.label}
                  </span>
                )}
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  📅 {deal.created_at ? new Date(deal.created_at).toLocaleDateString('uz-UZ') : '—'}
                </span>
                {deal.completed_at && (
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    🏁 {new Date(deal.completed_at).toLocaleDateString('uz-UZ')}
                  </span>
                )}
              </div>
            </div>

            {/* Amount Card */}
            <div className="p-8 rounded-2xl border mb-8 text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Bitim summasi</div>
              <div className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{fmtPrice(deal.amount)}</div>
              {deal.quantity != null && deal.quantity > 0 && (
                <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>📦 {deal.quantity} dona</div>
              )}
            </div>

            {/* 🛡️ ESCROW Section */}
            <div className="p-6 rounded-xl border mb-8" style={{
              borderColor: escrow ? `${escrowInfo?.color}30` : 'var(--border-primary)',
              background: escrow ? `${escrowInfo?.color}08` : 'var(--surface-dim)',
            }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  🛡️ ESCROW xavfsiz to'lov
                </h2>
                {escrow && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${escrowInfo?.color}20`, color: escrowInfo?.color }}>
                    {escrowInfo?.icon} {escrowInfo?.label}
                  </span>
                )}
              </div>

              {/* ESCROW Timeline */}
              {escrow ? (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0"
                      style={{ background: escrow.created_at ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)', color: escrow.created_at ? '#10b981' : 'var(--text-tertiary)' }}>
                      {escrow.created_at ? '✓' : '○'}
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: escrow.created_at ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>ESCROW yaratildi</div>
                      {escrow.created_at && <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(escrow.created_at).toLocaleString('uz-UZ')}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0"
                      style={{ background: escrow.held_at ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)', color: escrow.held_at ? '#10b981' : 'var(--text-tertiary)' }}>
                      {escrow.held_at ? '✓' : '○'}
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: escrow.held_at ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>To'lov ESCROW da saqlanmoqda</div>
                      {escrow.held_at && <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(escrow.held_at).toLocaleString('uz-UZ')}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0"
                      style={{ background: escrow.released_at ? 'rgba(16,185,129,0.15)' : 'var(--surface-hover)', color: escrow.released_at ? '#10b981' : 'var(--text-tertiary)' }}>
                      {escrow.released_at ? '✓' : escrow.status === 'cancelled' ? '✕' : '○'}
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: escrow.released_at ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                        {escrow.status === 'cancelled' ? 'Bekor qilindi — pul qaytarildi' : 'Sotuvchiga o\'tkazildi'}
                      </div>
                      {escrow.released_at && <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(escrow.released_at).toLocaleString('uz-UZ')}</div>}
                      {escrow.cancelled_at && <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(escrow.cancelled_at).toLocaleString('uz-UZ')}</div>}
                    </div>
                  </div>

                  {/* Payment Info */}
                  {escrow.payment_method && (
                    <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
                      To'lov usuli: <strong style={{ color: 'var(--text-primary)' }}>
                        {escrow.payment_method === 'payme' ? '💳 Payme' : escrow.payment_method === 'click' ? '💳 Click' : '💳 ' + escrow.payment_method}
                      </strong>
                      {escrow.payment_id && <> · ID: <strong style={{ color: 'var(--text-primary)' }}>{escrow.payment_id}</strong></>}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {/* 1. If no escrow yet and deal is pending → create escrow */}
                {!escrow && deal.status === 'kutilmoqda' && (
                  <>
                    <button onClick={createEscrow} disabled={actionLoading === 'create'}
                      className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl border-none cursor-pointer transition disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 2px 8px var(--accent-25)' }}>
                      {actionLoading === 'create' ? 'Yaratilmoqda...' : '🛡️ ESCROW orqali to\'lash'}
                    </button>
                  </>
                )}

                {/* 2. If escrow is pending_payment → pay via Payme/Click or simulate */}
                {escrow?.status === 'pending_payment' && (
                  <>
                    {escrow.payment_url && (
                      <a href={escrow.payment_url} target="_blank"
                        className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl border-none cursor-pointer transition hover:scale-[1.02] no-underline"
                        style={{ background: 'var(--accent)', color: 'white' }}>
                        💳 Payme orqali to'lash
                      </a>
                    )}
                    <button onClick={simulatePayment} disabled={actionLoading === 'simulate'}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl border cursor-pointer transition disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                      style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}>
                      {actionLoading === 'simulate' ? 'Ishlanmoqda...' : '🎮 Simulyatsiya (demo)'}
                    </button>
                  </>
                )}

                {/* 3. If escrow is held → seller or admin can release */}
                {escrow?.status === 'held' && (
                  <>
                    <button onClick={releaseEscrow} disabled={actionLoading === 'release'}
                      className="flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl border-none cursor-pointer transition disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                      style={{ background: '#10b981', color: 'white' }}>
                      {actionLoading === 'release' ? 'Ishlanmoqda...' : '✅ Mahsulotni tasdiqlash'}
                    </button>
                    <button onClick={cancelEscrow} disabled={actionLoading === 'cancel'}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl border cursor-pointer transition disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                      style={{ borderColor: '#ef4444', color: '#ef4444', background: 'transparent' }}>
                      {actionLoading === 'cancel' ? 'Ishlanmoqda...' : '❌ Bekor qilish'}
                    </button>
                  </>
                )}

                {/* 4. If released → show success */}
                {escrow?.status === 'released' && (
                  <div className="w-full p-4 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <div className="text-lg font-bold" style={{ color: '#10b981' }}>✅ To'lov muvaffaqiyatli yakunlandi</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Pul sotuvchiga o'tkazildi{escrow.released_at ? ` — ${new Date(escrow.released_at).toLocaleString('uz-UZ')}` : ''}
                    </div>
                  </div>
                )}

                {/* 5. If cancelled */}
                {escrow?.status === 'cancelled' && (
                  <div className="w-full p-4 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <div className="text-lg font-bold" style={{ color: '#ef4444' }}>🔄 Bitim bekor qilindi</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Pul xaridorga qaytarildi{escrow.cancelled_at ? ` — ${new Date(escrow.cancelled_at).toLocaleString('uz-UZ')}` : ''}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Result Message */}
              {actionResult && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${actionResult.ok ? '' : ''}`}
                  style={{ background: actionResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: actionResult.ok ? '#10b981' : '#ef4444' }}>
                  {actionResult.message}
                </div>
              )}
            </div>

            {/* Buyer & Seller Cards */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>🛍️ Xaridor</div>
                <a href={`/shop/${deal.buyer.id}`} className="flex items-center gap-3 no-underline">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--surface-hover)' }}>
                    {deal.buyer.name?.charAt(0) || '👤'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.buyer.name || "Noma'lum"}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>⭐ {deal.buyer.rating || 0}</div>
                  </div>
                </a>
              </div>
              <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>🏪 Sotuvchi</div>
                <a href={`/shop/${deal.seller.id}`} className="flex items-center gap-3 no-underline">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0" style={{ background: 'var(--surface-hover)' }}>
                    {deal.seller.name?.charAt(0) || '👤'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.seller.name || "Noma'lum"}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>⭐ {deal.seller.rating || 0}</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Lot Link */}
            <a href={`/lot/${deal.lot_id}`}
              className="flex items-center justify-between p-5 rounded-xl border no-underline transition hover:-translate-y-0.5 hover:shadow-sm"
              style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">📦</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{deal.lot_title}</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{deal.lot_category} · {deal.lot_grade}</div>
                </div>
              </div>
              <span className="text-sm" style={{ color: 'var(--accent)' }}>Batafsil →</span>
            </a>

            {/* 📋 ESCROW Audit Log */}
            {escrow && escrowLogs.length > 0 && (
              <div className="mt-8 p-6 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    📋 Tranzaksiya tarixi
                  </h2>
                  <button onClick={() => setShowLogs(!showLogs)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border-none cursor-pointer transition"
                    style={{ background: 'var(--surface-dim)', color: 'var(--accent)' }}>
                    {showLogs ? 'Yopish ▲' : `${escrowLogs.length} ta hodisa ▼`}
                  </button>
                </div>

                {showLogs && (
                  <div className="space-y-0">
                    {escrowLogs.map((log, idx) => {
                      const isLast = idx === escrowLogs.length - 1;
                      const actionLabel = (a: string) => {
                        const labels: Record<string, string> = {
                          create: 'ESCROW yaratildi',
                          check_perform: 'Tekshiruv (CheckPerformTransaction)',
                          create_transaction: 'Tranzaksiya yaratildi',
                          perform_transaction: "To'lov qabul qilindi",
                          confirm_held: "To'lov ESCROW ga tushdi",
                          prepare: 'Click Prepare (tekshiruv)',
                          complete: 'Click Complete (to\'lov qabul qilindi)',
                          release: 'Pul sotuvchiga o\'tkazilmoqda',
                          release_click: 'Click orqali o\'tkazilmoqda',
                          release_click_check_failed: 'Click tekshiruvda xatolik',
                          release_complete: "Pul sotuvchiga o'tkazildi",
                          cancel_payme: 'Payme orqali qaytarilmoqda',
                          cancel_click: 'Click orqali qaytarilmoqda',
                          cancel_transaction: 'Tranzaksiya bekor qilindi',
                          cancel_complete: 'Pul xaridorga qaytarildi',
                          cancel_failed: 'Bekor qilishda xatolik',
                          payme_callback: 'Payme callback',
                          click_callback: 'Click callback',
                        };
                        return labels[a] || a.replace(/_/g, ' ');
                      };
                      const actionIcon = (a: string) => {
                        if (a.includes('release') || a.includes('complete')) return '✅';
                        if (a.includes('cancel')) return '❌';
                        if (a.includes('perform') || a.includes('confirm') || a === 'complete') return '💳';
                        if (a.includes('create') || a === 'prepare') return '📝';
                        if (a.includes('check')) return '🔍';
                        return '○';
                      };
                      const actionColor = (a: string) => {
                        if (a.includes('release') || a.includes('complete')) return '#10b981';
                        if (a.includes('cancel')) return '#ef4444';
                        if (a.includes('perform') || a.includes('confirm') || a === 'complete') return '#6366f1';
                        return 'var(--text-tertiary)';
                      };
                      return (
                        <div key={log.id} className="flex items-start gap-3 py-3" style={{
                          borderBottom: isLast ? 'none' : '1px solid var(--border-primary)',
                        }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                            style={{ background: `${actionColor(log.action)}15`, color: actionColor(log.action) }}>
                            {actionIcon(log.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {actionLabel(log.action)}
                              </span>
                              <span className="text-xs shrink-0 ml-2" style={{ color: 'var(--text-tertiary)' }}>
                                {new Date(log.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                              <span className="font-medium" style={{ color: actionColor(log.action) }}>{log.provider?.toUpperCase()}</span>
                              {log.provider_transaction_id && <span>ID: {log.provider_transaction_id.slice(0, 16)}...</span>}
                              <span>{fmtPrice(log.amount)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

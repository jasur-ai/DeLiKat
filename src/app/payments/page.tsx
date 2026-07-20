'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import TrustScore from '@/components/TrustScore';

/**
 * 💳 Soddalashtirilgan to'lov sahifasi — #16 To'lov + #2 ESCROW UX
 *
 * Bir sahifada:
 *   1. Bitim ma'lumotlari
 *   2. Sotuvchi Trust Score + KYC
 *   3. Bir tugma bilan to'lov
 *   4. Real vaqtli status
 */

export default function PaymentsPage() {
  // useSearchParams o'rniga window.location.search (Next.js 14.2 compatibility)
  const [dealId, setDealId] = useState('3');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('deal_id');
      if (id) setDealId(id);
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [sellerScore, setSellerScore] = useState<any>(null);
  const [sellerKyc, setSellerKyc] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/deals?limit=200')
      .then(r => r.json())
      .then(async d => {
        if (!d.ok) return;
        const found = (d.deals || []).find((tx: any) => String(tx.id) === dealId);
        setDeal(found);
        if (found) {
          // Load escrow
          const escRes = await fetch(`/api/payments/escrow?deal_id=${found.id}`);
          const escData = await escRes.json();
          if (escData.ok && escData.escrow) {
            setEscrow(escData.escrow);
            const logRes = await fetch(`/api/payments/escrow?action=logs&escrow_id=${escData.escrow.id}`);
            const logData = await logRes.json();
            if (logData.ok) setLogs(logData.logs || []);
          }

          // Load seller trust score + KYC
          const sellerId = found.seller?.id || found.seller_id;
          if (sellerId) {
            const [tsRes, kycRes] = await Promise.all([
              fetch(`/api/trust-score?userId=${sellerId}`),
              fetch(`/api/kyc?userId=${sellerId}`),
            ]);
            const tsData = await tsRes.json();
            const kycData = await kycRes.json();
            if (tsData.ok) setSellerScore(tsData);
            if (kycData.ok) setSellerKyc(kycData);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dealId]);

  const doAction = async (action: string) => {
    setActionLoading(action);
    setMessage(null);
    try {
      let body: any = { action, escrow_id: escrow?.id };
      if (action === 'create') {
        body = {
          action: 'create',
          deal_id: deal.id,
          lot_id: deal.lot_id,
          buyer_id: deal.buyer?.id || deal.buyer_id,
          seller_id: deal.seller?.id || deal.seller_id,
          amount: deal.amount,
          payment_method: 'payme',
        };
      }

      const res = await fetch('/api/payments/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();

      if (d.ok) {
        setEscrow(d.escrow);
        if (action === 'create') {
          setMessage({ ok: true, text: "✅ To'lov xavfsiz ESCROW hisobiga qabul qilindi!" });
          if (d.payment_url) window.open(d.payment_url, '_blank');
        } else if (action === 'simulate') {
          setMessage({ ok: true, text: '🛡️ To\'lov ESCROW da saqlanmoqda!' });
        } else if (action === 'release') {
          setMessage({ ok: true, text: '✅ Pul sotuvchiga o\'tkazildi!' });
        } else if (action === 'cancel') {
          setMessage({ ok: true, text: '🔄 To\'lov bekor qilindi' });
        }
        // Refresh logs
        const logRes = await fetch(`/api/payments/escrow?action=logs&escrow_id=${d.escrow.id}`);
        const logData = await logRes.json();
        if (logData.ok) setLogs(logData.logs || []);
      } else {
        setMessage({ ok: false, text: `❌ ${d.error || 'Xatolik'}` });
      }
    } catch {
      setMessage({ ok: false, text: '❌ Server xatosi' });
    } finally {
      setActionLoading(null);
    }
  };

  const fmtPrice = (v: number) =>
    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} mln so'm` :
    v >= 1_000 ? `${(v / 1_000).toFixed(0)} ming so'm` :
    `${v.toLocaleString()} so'm`;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="deals" />
      <div className="pt-24 pb-16 max-w-3xl mx-auto px-5">

        <a href={`/deal/${dealId}`} className="text-sm mb-4 inline-block no-underline hover:underline" style={{ color: 'var(--text-tertiary)' }}>
          ← Bitimga qaytish
        </a>

        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>💳 To'lov</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-tertiary)' }}>Xavfsiz ESCROW kafolati bilan</p>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl" style={{ background: 'var(--surface-hover)' }} />)}
          </div>
        ) : !deal ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">💳</div>
            <p>Bitim topilmadi</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Deal summary */}
            <div className="p-6 rounded-2xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgba(16,185,129,0.1)' }}>🛡️</div>
                <div>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{deal.lot_title}</div>
                  <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Bitim #{deal.id}</div>
                </div>
              </div>
              <div className="text-center py-4">
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-tertiary)' }}>To'lov summasi</div>
                <div className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{fmtPrice(deal.amount)}</div>
              </div>
            </div>

            {/* Seller trust + KYC */}
            {sellerScore && (
              <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-3">
                  <TrustScore data={sellerScore} compact={true} />
                  {sellerKyc?.verified && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                      ✅ Tasdiqlangan sotuvchi
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ESCROW status + action */}
            <div className="p-6 rounded-2xl border" style={{
              borderColor: escrow?.status === 'released' ? 'rgba(16,185,129,0.3)' : escrow?.status === 'held' ? 'rgba(99,102,241,0.3)' : 'var(--border-primary)',
              background: escrow?.status === 'released' ? 'rgba(16,185,129,0.03)' : 'transparent',
            }}>
              {/* Progress indicator */}
              <div className="flex items-center gap-1 mb-6">
                {[
                  { status: 'pending_payment', label: "To'lov", icon: '💳' },
                  { status: 'held', label: 'ESCROW', icon: '🛡️' },
                  { status: 'released', label: 'Yakunlash', icon: '✅' },
                ].map((step, idx) => {
                  const currentStatus = escrow?.status || 'pending_payment';
                  const order = ['pending_payment', 'held', 'released', 'cancelled'];
                  const currentIdx = order.indexOf(currentStatus);
                  const done = idx <= currentIdx && currentStatus !== 'cancelled';
                  const cancelled = currentStatus === 'cancelled';
                  return (
                    <div key={step.status} className="flex-1 text-center">
                      <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm mb-1 transition-all ${
                        done && !cancelled ? 'shadow-sm' : ''
                      }`} style={{
                        background: done && !cancelled ? 'rgba(16,185,129,0.15)' : cancelled && idx === 2 ? 'rgba(239,68,68,0.1)' : 'var(--surface-hover)',
                        color: done && !cancelled ? '#10b981' : cancelled && idx === 2 ? '#ef4444' : 'var(--text-tertiary)',
                      }}>
                        {done && !cancelled ? '✓' : cancelled && idx === 2 ? '✕' : step.icon}
                      </div>
                      <div className="text-[10px] font-semibold" style={{ color: done ? '#10b981' : 'var(--text-tertiary)' }}>{step.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons — single clear flow */}
              {(!escrow || escrow.status === 'pending_payment') && (
                <div className="space-y-3">
                  <button onClick={() => doAction('create')} disabled={actionLoading === 'create'}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold rounded-xl border-none cursor-pointer transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'white', boxShadow: '0 4px 12px var(--accent-25)' }}>
                    {actionLoading === 'create' ? 'Ishlanmoqda...' : '🛡️ ESCROW orqali xavfsiz to\'lash'}
                  </button>
                  <div className="flex items-center gap-2 text-xs justify-center" style={{ color: 'var(--text-tertiary)' }}>
                    <span>🛡️</span>
                    <span>Pul sotuvchiga mahsulotni tasdiqlagandan so'ng o'tkaziladi</span>
                  </div>
                  {escrow?.payment_url && (
                    <a href={escrow.payment_url} target="_blank"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl border no-underline transition hover:bg-gray-50"
                      style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>
                      💳 Payme orqali to'lash
                    </a>
                  )}
                  <button onClick={() => doAction('simulate')} disabled={actionLoading === 'simulate'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border cursor-pointer transition disabled:opacity-50"
                    style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'transparent' }}>
                    {actionLoading === 'simulate' ? '...' : '🎮 Demo simulyatsiya'}
                  </button>
                </div>
              )}

              {escrow?.status === 'held' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
                    <div className="font-bold" style={{ color: '#6366f1' }}>🛡️ Pul ESCROW da saqlanmoqda</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Mahsulotni olganingizdan so'ng sotuvchiga pul o'tkaziladi
                    </div>
                  </div>
                  <button onClick={() => doAction('release')} disabled={actionLoading === 'release'}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 text-sm font-semibold rounded-xl border-none cursor-pointer transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    style={{ background: '#10b981', color: 'white', boxShadow: '0 4px 12px rgba(16,185,129,0.25)' }}>
                    {actionLoading === 'release' ? 'Ishlanmoqda...' : '✅ Mahsulotni tasdiqlash va pulni o\'tkazish'}
                  </button>
                  <button onClick={() => doAction('cancel')} disabled={actionLoading === 'cancel'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border cursor-pointer transition disabled:opacity-50"
                    style={{ borderColor: '#ef4444', color: '#ef4444', background: 'transparent' }}>
                    {actionLoading === 'cancel' ? '...' : '❌ Bekor qilish va pulni qaytarish'}
                  </button>
                </div>
              )}

              {escrow?.status === 'released' && (
                <div className="p-6 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.08)' }}>
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-lg font-bold" style={{ color: '#10b981' }}>To'lov muvaffaqiyatli yakunlandi</div>
                  <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    Pul sotuvchiga o'tkazildi{escrow.released_at ? ` — ${new Date(escrow.released_at).toLocaleString('uz-UZ')}` : ''}
                  </div>
                </div>
              )}

              {escrow?.status === 'cancelled' && (
                <div className="p-6 rounded-xl text-center" style={{ background: 'rgba(239,68,68,0.08)' }}>
                  <div className="text-2xl mb-2">🔄</div>
                  <div className="text-lg font-bold" style={{ color: '#ef4444' }}>Bitim bekor qilindi</div>
                  <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                    Pul xaridorga qaytarildi{escrow.cancelled_at ? ` — ${new Date(escrow.cancelled_at).toLocaleString('uz-UZ')}` : ''}
                  </div>
                </div>
              )}

              {message && (
                <div className={`mt-4 p-3 rounded-lg text-sm text-center`}
                  style={{ background: message.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: message.ok ? '#10b981' : '#ef4444' }}>
                  {message.text}
                </div>
              )}
            </div>

            {/* Audit log */}
            {logs.length > 0 && (
              <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>📋 Tranzaksiya tarixi</h3>
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div key={log.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                      <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>{log.provider}</span>
                      <span>·</span>
                      <span>{new Date(log.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment info */}
            <div className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              🛡️ Barcha to'lovlar ESCROW tizimi orqali himoyalangan
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

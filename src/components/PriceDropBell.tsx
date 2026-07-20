'use client';
import { useState } from 'react';

/**
 * 🔔 PriceDropBell — Lot narxi pasayganda bildirish olish
 */
interface Props {
  lotId: number;
  currentPrice: number;
}

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln so'm`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} ming so'm`;
  return `${v.toLocaleString()} so'm`;
}

export default function PriceDropBell({ lotId, currentPrice }: Props) {
  const [show, setShow] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!targetPrice) return;
    setLoading(true);
    try {
      const res = await fetch('/api/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lot_id: lotId, target_price: parseFloat(targetPrice), user_id: 1 }),
      });
      const d = await res.json();
      if (d.ok) {
        setSuccess(true);
        setTimeout(() => { setShow(false); setSuccess(false); }, 2000);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setShow(true)}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 text-sm font-semibold rounded-lg border cursor-pointer transition hover:scale-[1.01] active:scale-[0.98]"
        style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
        🔔 Narx tushganda bildirish
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => { if (!success) setShow(false); }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--surface)' }}
            onClick={e => e.stopPropagation()}>
            {success ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Bildirish o&apos;rnatildi!</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Narx {fmtPrice(parseFloat(targetPrice))} ga tushganda xabar beramiz
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>🔔 Narx tushganda bildirish</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
                  Hozirgi narx: <strong>{fmtPrice(currentPrice)}</strong>
                </p>
                <input
                  value={targetPrice}
                  onChange={e => setTargetPrice(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Maqsadli narxni kiriting"
                  type="text"
                  className="w-full px-4 py-3 text-sm rounded-xl border outline-none mb-4"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface-dim)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-primary)'}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={handleSubscribe} disabled={loading || !targetPrice}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: 'white' }}>
                    {loading ? '⏳...' : '✅ Bildirish o\'rnatish'}
                  </button>
                  <button onClick={() => setShow(false)}
                    className="px-4 py-2.5 text-sm font-semibold rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'transparent' }}>
                    Bekor
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

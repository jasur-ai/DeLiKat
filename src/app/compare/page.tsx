'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { getCompareIds, toggleCompare, clearCompare } from '@/lib/compare';

interface Lot {
  id: number; title: string; category: string; price: number;
  grade: string; quantity: number; description?: string;
  seller_name?: string; seller_rating?: number;
  view_count?: number; bid_count?: number;
}

const GRADE_LABELS: Record<string, string> = {
  A: '🟢 Yangi', B: '🟡 Yaxshi', C: '🔴 Qoniqarli',
};

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln so'm`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} ming so'm`;
  return `${v.toLocaleString()} so'm`;
}

export default function ComparePage() {
  const [lotIds, setLotIds] = useState<number[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getCompareIds();
    setLotIds(ids);
    if (ids.length === 0) { setLoading(false); return; }
    fetch('/api/lots?limit=30')
      .then(r => r.json())
      .then(d => { if (d.ok) setLots((d.lots || []).filter((l: Lot) => ids.includes(l.id))); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const removeItem = (id: number) => {
    toggleCompare(id);
    setLotIds(prev => prev.filter(i => i !== id));
    setLots(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="compare" />
      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              📊 Mahsulotlarni solishtirish
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {lotIds.length} ta mahsulot solishtirilmoqda
            </p>
          </div>
          {lots.length > 1 && (
            <button onClick={() => { clearCompare(); setLots([]); setLotIds([]); }}
              className="px-4 py-2 text-xs font-semibold rounded-lg border cursor-pointer"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'transparent' }}>
              🗑 Tozalash
            </button>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--surface-hover)' }} />
            ))}
          </div>
        ) : lots.length === 0 ? (
          <div className="text-center py-16 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-5xl mb-4">📊</div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Solishtirish uchun mahsulot tanlanmagan</p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>Lot kartasidagi 📊 belgisini bosib qo'shing</p>
            <a href="/" className="inline-block mt-4 text-sm font-semibold no-underline" style={{ color: 'var(--accent)' }}>Bozorni ko'rish →</a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm rounded-xl overflow-hidden" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider sticky left-0"
                    style={{ color: 'var(--text-tertiary)', background: 'var(--surface)', minWidth: '140px' }}>Xususiyatlar</th>
                  {lots.map(lot => (
                    <th key={lot.id} className="p-3 text-center min-w-[200px]" style={{ background: 'var(--surface-dim)' }}>
                      <button onClick={() => removeItem(lot.id)}
                        className="float-right text-xs cursor-pointer border-none" style={{ color: 'var(--text-tertiary)' }}>✕</button>
                      <div className="text-2xl mb-1">📦</div>
                      <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{lot.title}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Narx', val: (l: Lot) => fmtPrice(l.price) },
                  { label: 'Kategoriya', val: (l: Lot) => l.category },
                  { label: 'Grade', val: (l: Lot) => GRADE_LABELS[l.grade] || l.grade },
                  { label: 'Soni', val: (l: Lot) => `${l.quantity} dona` },
                  { label: 'Sotuvchi', val: (l: Lot) => l.seller_name || '—' },
                  { label: 'Reyting', val: (l: Lot) => `⭐ ${l.seller_rating || '—'}` },
                  { label: "Ko'rilgan", val: (l: Lot) => `${l.view_count || 0} marta` },
                  { label: 'Takliflar', val: (l: Lot) => `${l.bid_count || 0} ta` },
                ].map(row => (
                  <tr key={row.label}>
                    <td className="p-3 text-xs font-semibold sticky left-0"
                      style={{ color: 'var(--text-tertiary)', background: 'var(--surface)', borderBottom: '1px solid var(--border-primary)' }}>
                      {row.label}
                    </td>
                    {lots.map(lot => (
                      <td key={lot.id} className="p-3 text-center"
                        style={{ borderBottom: '1px solid var(--border-primary)' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{row.val(lot)}</span>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="p-3"></td>
                  {lots.map(lot => (
                    <td key={lot.id} className="p-3 text-center">
                      <a href={`/lot/${lot.id}`}
                        className="inline-block px-4 py-2 text-xs font-semibold rounded-lg no-underline transition"
                        style={{ background: 'var(--accent)', color: 'white' }}>
                        Ko'rish →
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

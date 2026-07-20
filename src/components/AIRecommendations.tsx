'use client';
import { useEffect, useState } from 'react';

/**
 * 🤖 AI Recommendations — Shu kategoriyadagi shu narx oralig'idagi lotlar
 */
interface Lot {
  id: number; title: string; category: string; price: number;
  grade: string; quantity: number;
}

interface Props {
  currentLotId: number;
  category: string;
  price: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  smartfon: '📱', notebook: '💻', tv: '📺', audio: '🎧',
  aksesuar: '🔌', kiyim: '👕',
};

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln so'm`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} ming so'm`;
  return `${v.toLocaleString()} so'm`;
}

export default function AIRecommendations({ currentLotId, category, price }: Props) {
  const [recommendations, setRecommendations] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/lots?category=${category}&limit=6`);
        const d = await res.json();
        if (d.ok) {
          // Filter: boshqa lot, o'xshash narx oralig'i
          const similar = (d.lots || [])
            .filter((l: Lot) => l.id !== currentLotId)
            .filter((l: Lot) => Math.abs(l.price - price) / price < 0.5) // +/-50% narx
            .slice(0, 4);
          setRecommendations(similar);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [currentLotId, category, price]);

  if (loading || recommendations.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-primary)' }}>
      <h3 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        🤖 Sizga ham yoqishi mumkin
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {recommendations.map(lot => (
          <a key={lot.id} href={`/lot/${lot.id}`}
            className="p-3 rounded-xl border no-underline transition hover:-translate-y-0.5"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-2xl mb-2">{CATEGORY_ICONS[lot.category] || '📦'}</div>
            <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {lot.title}
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: 'var(--accent)' }}>
              {fmtPrice(lot.price)}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              📦 {lot.quantity} dona · {lot.grade} grade
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

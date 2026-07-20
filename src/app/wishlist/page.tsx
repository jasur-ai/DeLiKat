'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';

interface Lot {
  id: number; title: string; category: string; price: number; grade: string;
  quantity: number; status: string; created_at: string;
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

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWishlist = async () => {
    try {
      const res = await fetch('/api/wishlist?user_id=1');
      const d = await res.json();
      if (d.ok) setWishlist(d.wishlist);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadWishlist().then(async () => {
      try {
        const res = await fetch('/api/lots?limit=30');
        const d = await res.json();
        if (d.ok) setLots(d.lots || []);
      } catch { /* ignore */ }
    }).finally(() => setLoading(false));
  }, []);

  const toggleWishlist = async (lotId: number) => {
    await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lot_id: lotId, user_id: 1 }),
    });
    await loadWishlist();
  };

  const favLots = lots.filter(l => wishlist.includes(l.id));

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="wishlist" />

      <div className="pt-24 pb-16 max-w-4xl mx-auto px-5">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ❤️ Sevimli lotlar
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {wishlist.length === 0 ? 'Hali hech narsa saqlanmagan' : `${wishlist.length} ta lot sevimlilar ro'yxatida`}
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--surface-hover)' }} />
            ))}
          </div>
        ) : favLots.length === 0 ? (
          <div className="text-center py-16 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="text-5xl mb-4">💔</div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Sevimli lotlar yo'q</p>
            <a href="/" className="inline-block mt-3 text-sm font-semibold no-underline" style={{ color: 'var(--accent)' }}>
              Bozorni ko'rish →
            </a>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {favLots.map(lot => (
              <div key={lot.id}
                className="flex items-center gap-4 p-4 rounded-xl border transition hover:-translate-y-0.5 cursor-pointer"
                style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}
                onClick={() => window.location.href = `/lot/${lot.id}`}>
                <div className="text-3xl shrink-0">
                  {CATEGORY_ICONS[lot.category] || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                    {lot.category}
                  </div>
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {lot.title}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {fmtPrice(lot.price)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      📦 {lot.quantity} dona
                    </span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleWishlist(lot.id); }}
                  className="text-lg cursor-pointer transition hover:scale-110"
                  style={{ background: 'none', border: 'none' }}>
                  ❤️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

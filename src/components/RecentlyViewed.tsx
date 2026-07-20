'use client';
import { useEffect, useState } from 'react';

/**
 * 🔄 Recently Viewed — So'ngi ko'rilgan lotlar (localStorage)
 * Har safar lot sahifasiga kirganda chaqiriladi
 */
const STORAGE_KEY = 'deliket_recently_viewed';
const MAX_ITEMS = 8;

interface RecentlyViewedItem {
  id: number;
  title: string;
  category: string;
  price: number;
  grade: string;
  viewed_at: string;
}

export function addRecentlyViewed(lot: { id: number; title: string; category: string; price: number; grade: string }) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = stored.filter((i: RecentlyViewedItem) => i.id !== lot.id);
    filtered.unshift({ ...lot, viewed_at: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch { /* ignore */ }
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
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

export default function RecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    setItems(getRecentlyViewed());
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
        🕐 So'ngi ko'rilganlar
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {items.map(item => (
          <a key={`${item.id}-${item.viewed_at}`}
            href={`/lot/${item.id}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border no-underline shrink-0 transition hover:-translate-y-0.5"
            style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <span>{CATEGORY_ICONS[item.category] || '📦'}</span>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>
                {item.title}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                {fmtPrice(item.price)}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';

/**
 * 🔍 Search History — Qidiruv tarixi (localStorage)
 */
const STORAGE_KEY = 'deliket_search_history';
const MAX_ITEMS = 10;

export function addSearchQuery(query: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = stored.filter((q: string) => q.toLowerCase() !== query.toLowerCase());
    filtered.unshift(query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch { /* ignore */ }
}

export function getSearchHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearSearchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

interface Props {
  onSelect: (query: string) => void;
}

export default function SearchHistory({ onSelect }: Props) {
  const [queries, setQueries] = useState<string[]>([]);

  useEffect(() => {
    setQueries(getSearchHistory());
  }, []);

  if (queries.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
          🕐 So'ngi qidiruvlar
        </span>
        <button onClick={() => { clearSearchHistory(); setQueries([]); }}
          className="text-[10px] cursor-pointer border-none"
          style={{ color: 'var(--text-tertiary)' }}>
          Tozalash
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {queries.map((q, i) => (
          <button key={i} onClick={() => onSelect(q)}
            className="px-2.5 py-1 text-xs rounded-full border cursor-pointer transition hover:bg-accent-50"
            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'var(--surface-dim)' }}>
            🔍 {q}
          </button>
        ))}
      </div>
    </div>
  );
}

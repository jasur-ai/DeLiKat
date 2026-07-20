'use client';

import { useState } from 'react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSeed = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xatolik');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--surface-dim)' }}>
      <div className="w-full max-w-lg p-8 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border-primary)' }}>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>📦 DeLiKet Database Seeder</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-tertiary)' }}>Neon PostgreSQL ga jadvallar va demo data yuklash</p>

        {error && (
          <div className="p-3 mb-4 text-sm rounded-md" style={{ background: 'var(--error-light)', color: 'var(--error)' }}>{error}</div>
        )}

        {result && (
          <div className="p-4 mb-4 rounded-lg text-sm space-y-1" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
            {result.message && <p style={{ color: '#10b981' }}>✅ {result.message}</p>}
            {result.tables_created && <p style={{ color: 'var(--text-secondary)' }}>Jadvallar: {result.tables_created.join(', ')}</p>}
            {result.data_inserted && (
              <div>
                <p className="font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>Yuklangan ma'lumotlar:</p>
                <ul className="list-disc pl-4 mt-1">
                  {Object.entries(result.data_inserted).map(([key, val]) => (
                    <li key={key} style={{ color: 'var(--text-secondary)' }}>{key}: {val as number} ta</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <button onClick={handleSeed} disabled={loading}
          className="w-full py-3 text-sm font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-60"
          style={{ background: 'var(--accent)', color: 'white' }}>
          {loading ? '⏳ Yuklanmoqda...' : '🚀 Databaseni seed qilish'}
        </button>
      </div>
    </div>
  );
}

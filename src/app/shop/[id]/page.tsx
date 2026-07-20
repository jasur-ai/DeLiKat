'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import TrustScore from '@/components/TrustScore';

interface Lot {
  id: number; title: string; category: string; price: number; quantity: number;
  grade: string; status: string; created_at: string; bid_count: number;
  seller_name: string; seller_id: number; seller_rating: number;
}

interface SellerStats {
  total_lots: number; active_lots: number; sold_lots: number;
  total_bids: number; avg_price: number; rating: number;
}

const CATEGORY_ICONS: Record<string, string> = { smartfon: '📱', notebook: '💻', tv: '📺', audio: '🎧', aksesuar: '🔌', kiyim: '👕' };
const GRADE_COLORS: Record<string, string> = { A: '#10b981', B: '#f59e0b', C: '#ef4444' };
const STATUS_LABELS: Record<string, string> = { aktiv: '🟢 Aktiv', sotilgan: '💰 Sotilgan', arxiv: '📦 Arxiv' };

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln so'm`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} ming so'm`;
  return `${v.toLocaleString()} so'm`;
}

export default function ShopDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [sellerName, setSellerName] = useState('');
  const [sellerRating, setSellerRating] = useState(0);
  const [trustScoreData, setTrustScoreData] = useState<any>(null);
  const [kycStatus, setKycStatus] = useState<any>(null);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    if (!id || isNaN(parseInt(id))) { setLoading(false); return; }
    const sellerId = parseInt(id);

    fetch('/api/lots?limit=500')
      .then(r => r.json())
      .then(d => {
        const allLots: Lot[] = d.ok ? (d.lots || []) : [];
        const sellerLots = allLots.filter((l: any) => l.seller_id === sellerId);

        setSellerName(sellerLots[0]?.seller_name || 'Sotuvchi');
        setSellerRating(sellerLots[0]?.seller_rating || 0);
        setLots(sellerLots);

        // Load Trust Score
        fetch(`/api/trust-score?userId=${sellerId}`)
          .then(r => r.json())
          .then(ts => { if (ts.ok) setTrustScoreData(ts); })
          .catch(() => {});

        // Load KYC status
        fetch(`/api/kyc?userId=${sellerId}`)
          .then(r => r.json())
          .then(k => { if (k.ok) setKycStatus(k); })
          .catch(() => {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const stats: SellerStats = {
    total_lots: lots.length,
    active_lots: lots.filter(l => l.status === 'aktiv').length,
    sold_lots: lots.filter(l => l.status === 'sotilgan').length,
    total_bids: lots.reduce((s, l) => s + (l.bid_count || 0), 0),
    avg_price: lots.length > 0 ? lots.reduce((s, l) => s + l.price, 0) / lots.length : 0,
    rating: sellerRating,
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="seller" />

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        {/* Seller Hero */}
        <div className="rounded-2xl border overflow-hidden mb-8" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="h-32" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} />
          <div className="px-6 pb-6" style={{ marginTop: '-40px' }}>
            <div className="flex items-end gap-5">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl shadow-lg" style={{ background: 'var(--surface)', border: '4px solid var(--surface)' }}>
                {sellerName.charAt(0) || '🏪'}
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{sellerName}</h1>
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  <span>⭐ {sellerRating.toFixed(1)}</span>
                  <span>·</span>
                  <span>🏪 Sotuvchi</span>
                  {kycStatus?.verified && (
                    <><span>·</span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>✅ Tasdiqlangan sotuvchi</span></>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Score Card */}
        {trustScoreData && (
          <div className="mb-8">
            <TrustScore data={trustScoreData} compact={false} showBreakdown={true} />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total_lots}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Jami lotlar</div>
          </div>
          <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-2xl font-bold" style={{ color: '#10b981' }}>{stats.active_lots}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Aktiv</div>
          </div>
          <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{stats.sold_lots}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Sotilgan</div>
          </div>
          <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total_bids}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Takliflar</div>
          </div>
          <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmtPrice(stats.avg_price)}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>O'rtacha narx</div>
          </div>
        </div>

        {/* Lots */}
        <div className="mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Lotlari ({lots.length})</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="h-4 rounded w-48" style={{ background: 'var(--surface-hover)' }} />
              </div>
            ))}
          </div>
        ) : lots.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">🏪</div>
            <p>Bu sotuvchining hali lotlari yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lots.map(lot => (
              <a key={lot.id} href={`/lot/${lot.id}`}
                className="flex items-center gap-4 p-5 rounded-xl border no-underline transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
                <span className="text-xl">{CATEGORY_ICONS[lot.category] || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{lot.title}</div>
                  <div className="flex items-center gap-3 text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    <span>{STATUS_LABELS[lot.status] || lot.status}</span>
                    <span>🏷️ {lot.grade}</span>
                    <span>📦 {lot.quantity} dona</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{fmtPrice(lot.price)}</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{lot.bid_count || 0} taklif</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

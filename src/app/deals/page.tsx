'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';

interface Deal {
  id: number;
  lot_id: number;
  lot_title: string;
  lot_price: number;
  lot_category: string;
  lot_grade: string;
  lot_quantity: number;
  buyer_name: string;
  seller_name: string;
  amount: number;
  status: string;
  created_at: string;
}

interface EscrowSummary {
  deal_id: number;
  status: string;
  payment_method?: string;
  log_count: number;
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  yakunlangan: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  kutilmoqda: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  bekor_qilingan: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [escrowSummaries, setEscrowSummaries] = useState<Record<number, EscrowSummary>>({});
  const [showEscrowIds, setShowEscrowIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    Promise.all([
      fetch('/api/deals').then(r => r.json()),
      fetch('/api/deals/stats').then(r => r.json()),
      fetch('/api/payments/escrow?stats=true').then(r => r.json()),
    ]).then(([d, s, esc]) => {
      if (d.ok) setDeals(d.deals || []);
      if (s.ok) setStats(s.stats || s);
      // Load escrow summaries for each deal
      if (d.ok && d.deals) {
        (d.deals as Deal[]).forEach((deal: Deal) => {
          fetch(`/api/payments/escrow?deal_id=${deal.id}`)
            .then(r => r.json())
            .then(ed => {
              if (ed.ok && ed.escrow) {
                // Also get log count
                fetch(`/api/payments/escrow?action=logs&escrow_id=${ed.escrow.id}`)
                  .then(r => r.json())
                  .then(ld => {
                    setEscrowSummaries(prev => ({
                      ...prev,
                      [deal.id]: {
                        deal_id: deal.id,
                        status: ed.escrow.status,
                        payment_method: ed.escrow.payment_method,
                        log_count: ld.ok ? (ld.logs || []).length : 0,
                      },
                    }));
                  })
                  .catch(() => {});
              }
            })
            .catch(() => {});
        });
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="deals" />

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Bitimlar</span>
          <h1 className="text-2xl md:text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>💰 Bitimlar tarixi</h1>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total || 0}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Jami bitimlar</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: '#10b981' }}>{stats.yakunlangan || 0}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Yakunlangan</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: '#f59e0b' }}>{stats.kutilmoqda || 0}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Kutilmoqda</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats.total_amount ? `${((stats.total_amount || 0) / 1e6).toFixed(1)} mln` : '—'}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Jami summa</div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-4 rounded w-32" style={{ background: 'var(--surface-hover)' }} />
                  <div className="h-4 rounded w-16" style={{ background: 'var(--surface-hover)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">💰</div>
            <p>Hozircha bitimlar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deals.map(deal => {
              const ss = STATUS_STYLES[deal.status] || { bg: 'var(--surface-hover)', color: 'var(--text-secondary)' };
              return (
                <div key={deal.id} className="p-5 rounded-xl border transition hover:-translate-y-0.5 hover:shadow-sm" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <a href={`/lot/${deal.lot_id}`} className="text-sm font-semibold no-underline hover:underline" style={{ color: 'var(--text-primary)' }}>
                      {deal.lot_title}
                    </a>
                    <div className="flex items-center gap-2">
                      {/* ESCROW status badge */}
                      {escrowSummaries[deal.id] && (
                        <button onClick={(e) => {
                          e.preventDefault();
                          setShowEscrowIds(prev => {
                            const next = new Set(prev);
                            if (next.has(deal.id)) next.delete(deal.id);
                            else next.add(deal.id);
                            return next;
                          });
                        }}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border-none cursor-pointer transition`}
                          style={{
                            background: escrowSummaries[deal.id].status === 'released' ? 'rgba(16,185,129,0.1)' :
                              escrowSummaries[deal.id].status === 'held' ? 'rgba(99,102,241,0.1)' :
                              escrowSummaries[deal.id].status === 'cancelled' ? 'rgba(239,68,68,0.1)' :
                              'rgba(245,158,11,0.1)',
                            color: escrowSummaries[deal.id].status === 'released' ? '#10b981' :
                              escrowSummaries[deal.id].status === 'held' ? '#6366f1' :
                              escrowSummaries[deal.id].status === 'cancelled' ? '#ef4444' :
                              '#f59e0b',
                          }}>
                          🛡️ {escrowSummaries[deal.id].log_count > 0 ? `${escrowSummaries[deal.id].log_count} ta` : 'ESCROW'}
                        </button>
                      )}
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                        {deal.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    <span>💰 {(deal.amount || 0).toLocaleString()} so'm</span>
                    <span>📦 {deal.lot_quantity || 0} dona</span>
                    <span>👤 Sotuvchi: {deal.seller_name || "Noma'lum"}</span>
                    <span>🏪 Xaridor: {deal.buyer_name || "Noma'lum"}</span>
                    {escrowSummaries[deal.id]?.payment_method && (
                      <span>💳 {escrowSummaries[deal.id].payment_method!.toUpperCase()}</span>
                    )}
                  </div>

                  {/* Expandable ESCROW Logs */}
                  {showEscrowIds.has(deal.id) && (
                    <div className="mt-4 pt-4 border-t text-xs" style={{ borderColor: 'var(--border-primary)' }}>
                      <a href={`/deal/${deal.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold no-underline transition hover:gap-2"
                        style={{ color: 'var(--accent)' }}>
                        📋 Tranzaksiya tarixini ko'rish →
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

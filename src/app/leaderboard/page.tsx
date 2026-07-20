'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';

interface LeaderUser {
  rank: number;
  user_id: number;
  name: string;
  username: string;
  role: string;
  xp: number;
  level: number;
  rating: number;
  trust_score: number;
  is_verified: boolean;
  total_sales: number;
  total_purchases: number;
  achievements: { badge: string; title: string; xp_reward: number }[];
  achievement_count: number;
}

const LEVEL_NAMES = ['', 'Yangi boshlovchi', 'O\'rganuvchi', 'Bilimdon', 'Mutaxassis', 'Ekspert', 'Usta', 'Leygend', 'Afsona', 'Titan'];
const RANK_COLORS = ['#d97706', '#6366f1', '#dc2626'];

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    loadLeaderboard();
  }, [limit]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?limit=${limit}`);
      const data = await res.json();
      if (data.ok) setUsers(data.leaderboard);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="leaderboard" />

      {/* Content */}
      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Reyting</span>
            <h1 className="text-2xl md:text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>🏆 Leaderboard</h1>
          </div>
          <select value={limit} onChange={e => setLimit(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border rounded-lg outline-none cursor-pointer"
            style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}>
            <option value={20}>20 ta</option>
            <option value={50}>50 ta</option>
            <option value={100}>100 ta</option>
            <option value={200}>200 ta</option>
          </select>
        </div>

        {/* Podium */}
        {users.length >= 3 && !loading && (
          <div className="flex items-end justify-center gap-4 mb-10">
            {[{ idx: 1, h: 'h-24', label: '2' }, { idx: 0, h: 'h-32', label: '1' }, { idx: 2, h: 'h-20', label: '3' }].map(({ idx, h, label }) => {
              const u = users[idx];
              return (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg" style={{ background: RANK_COLORS[idx] || '#757575' }}>
                    {idx === 0 ? '👑' : idx + 1}
                  </div>
                  <span className="text-sm font-bold text-center" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
                  <div className={`${h} w-20 rounded-t-xl flex items-center justify-center text-white font-bold text-sm`} style={{ background: RANK_COLORS[idx] || '#757575', opacity: 0.8 }}>
                    {u.xp} XP
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="w-8 h-8 rounded-full" style={{ background: 'var(--surface-hover)' }} />
                <div className="flex-1 h-4 rounded w-32" style={{ background: 'var(--surface-hover)' }} />
                <div className="h-4 rounded w-16" style={{ background: 'var(--surface-hover)' }} />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-4">🏆</div>
            <p>Hozircha hech qanday ma'lumot yo'q</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => {
              const levelName = LEVEL_NAMES[u.level] || `Level ${u.level}`;
              return (
                <div key={u.user_id} className="flex items-center gap-4 p-4 rounded-xl border transition hover:-translate-y-0.5 hover:shadow-md cursor-default"
                  style={{ borderColor: 'var(--border-primary)', background: 'var(--surface)' }}>
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center text-sm font-bold rounded-full"
                    style={{ background: u.rank <= 3 ? `${RANK_COLORS[u.rank - 1]}20` : 'var(--surface-hover)', color: u.rank <= 3 ? RANK_COLORS[u.rank - 1] : 'var(--text-secondary)' }}>
                    {u.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
                      {u.is_verified && <span className="text-xs" title="Tasdiqlangan">✅</span>}
                      {u.achievement_count > 0 && <span className="text-xs" title="Sovrinlar">🎖️{u.achievement_count}</span>}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Level {u.level} · {u.role}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{u.xp.toLocaleString()} XP</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      ⭐ {u.rating} · 🤝 {u.trust_score}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { MOCK_USERS, MOCK_ACHIEVEMENTS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200);

    const users = await query<any>(
      `SELECT id, name, username, role, xp, level, rating, trust_score,
              is_verified, total_sales, total_purchases, created_at
       FROM users WHERE is_active = true ORDER BY xp DESC, level DESC LIMIT $1`,
      [limit]
    );

    const results = await Promise.all(
      users.map(async (u, idx) => {
        let achievements: any[] = [];
        try {
          achievements = await query<any>(
            `SELECT id, badge, title, xp_reward FROM achievements WHERE user_id = $1 ORDER BY unlocked_at DESC`,
            [u.id]
          );
        } catch { /* table may not exist */ }
        return {
          rank: idx + 1, user_id: u.id, name: u.name || "Noma'lum",
          username: u.username || '', role: u.role || 'xaridor',
          xp: u.xp || 0, level: u.level || 1,
          rating: Math.round((u.rating || 0) * 10) / 10,
          trust_score: Math.round((u.trust_score || 0) * 10) / 10,
          is_verified: u.is_verified || false,
          total_sales: u.total_sales || 0, total_purchases: u.total_purchases || 0,
          achievements: achievements.map(a => ({ badge: a.badge, title: a.title, xp_reward: a.xp_reward })),
          achievement_count: achievements.length,
        };
      })
    );

    return NextResponse.json({ ok: true, count: results.length, leaderboard: results });
  } catch (err) {
    console.error('Leaderboard error, using mock data:', err);
    const limit = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 1), 200);
    const sorted = [...MOCK_USERS].sort((a, b) => b.xp - a.xp).slice(0, limit);
    const results = sorted.map((u, idx) => ({
      rank: idx + 1, user_id: u.id, name: u.name, username: u.username || '',
      role: u.role, xp: u.xp, level: u.level,
      rating: Math.round(u.rating * 10) / 10,
      trust_score: Math.round((u.trust_score || 0) * 10) / 10,
      is_verified: u.is_verified, total_sales: u.total_sales, total_purchases: u.total_purchases,
      achievements: MOCK_ACHIEVEMENTS.filter(a => a.user_id === u.id).map(a => ({
        badge: a.badge, title: a.title, xp_reward: a.xp_reward,
      })),
      achievement_count: MOCK_ACHIEVEMENTS.filter(a => a.user_id === u.id).length,
    }));
    return NextResponse.json({ ok: true, count: results.length, leaderboard: results });
  }
}

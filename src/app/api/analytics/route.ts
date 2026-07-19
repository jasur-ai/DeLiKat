import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userCount = await queryOne<{ c: string }>('SELECT COUNT(*) as c FROM users');
    const lotCounts = await queryOne<{ total: string; active: string; sold: string }>(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'aktiv' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'sotilgan' THEN 1 ELSE 0 END) as sold FROM lots"
    );
    const bidCounts = await queryOne<{ total: string; pending: string }>(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'kutmoqda' THEN 1 ELSE 0 END) as pending FROM bids"
    );
    const priceStats = await queryOne<{ min: string; max: string; avg: string }>(
      "SELECT COALESCE(MIN(price),0) as min, COALESCE(MAX(price),0) as max, COALESCE(AVG(price),0) as avg FROM lots WHERE status = 'aktiv'"
    );
    const categories = await query<{ cat: string; cnt: string }>(
      "SELECT category as cat, COUNT(*) as cnt FROM lots WHERE status = 'aktiv' GROUP BY category"
    );
    const grades = await query<{ g: string; cnt: string }>(
      "SELECT grade as g, COUNT(*) as cnt FROM lots WHERE status = 'aktiv' AND grade IS NOT NULL GROUP BY grade"
    );
    const roles = await query<{ r: string; cnt: string }>(
      "SELECT role as r, COUNT(*) as cnt FROM users WHERE is_active = true AND role IS NOT NULL GROUP BY role"
    );
    const topSellers = await query<any>(
      `SELECT u.id, u.name, u.rating, u.is_verified, COUNT(l.id) as lot_count
       FROM users u JOIN lots l ON l.seller_id = u.id
       WHERE l.status = 'aktiv'
       GROUP BY u.id ORDER BY lot_count DESC LIMIT 10`
    );
    const recentLots = await query<{ title: string; price: number; category: string; created_at: string }>(
      "SELECT title, price, category, created_at FROM lots ORDER BY created_at DESC LIMIT 5"
    );

    return NextResponse.json({
      ok: true,
      stats: {
        users: parseInt(userCount?.c || '0'),
        total_lots: parseInt(lotCounts?.total || '0'),
        active_lots: parseInt(lotCounts?.active || '0'),
        sold_lots: parseInt(lotCounts?.sold || '0'),
        total_bids: parseInt(bidCounts?.total || '0'),
        pending_bids: parseInt(bidCounts?.pending || '0'),
        price_range: {
          min: Math.round(parseFloat(priceStats?.min || '0')),
          max: Math.round(parseFloat(priceStats?.max || '0')),
          avg: Math.round(parseFloat(priceStats?.avg || '0')),
        },
      },
      categories: Object.fromEntries(categories.map(c => [c.cat, parseInt(c.cnt)])),
      grade_distribution: Object.fromEntries(grades.map(g => [g.g, parseInt(g.cnt)])),
      role_distribution: Object.fromEntries(roles.map(r => [r.r, parseInt(r.cnt)])),
      top_sellers: topSellers.map(s => ({
        id: s.id, name: s.name, rating: s.rating || 0, is_verified: s.is_verified || false,
        active_lots: parseInt(s.lot_count),
      })),
      recent_activity: recentLots.map(l => ({
        type: 'new_lot', title: l.title?.slice(0, 80), price: l.price,
        category: l.category, time: l.created_at,
      })),
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

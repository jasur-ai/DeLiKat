import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getMockStats, getMockCategories } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users');
    const lotCount = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM lots WHERE status = 'aktiv'");
    const bidCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM bids');
    const avgPrice = await queryOne<{ avg: string }>("SELECT AVG(price) as avg FROM lots WHERE status = 'aktiv'");
    const minPrice = await queryOne<{ min: string }>("SELECT MIN(price) as min FROM lots WHERE status = 'aktiv'");
    const maxPrice = await queryOne<{ max: string }>("SELECT MAX(price) as max FROM lots WHERE status = 'aktiv'");
    const categories = await query<{ category: string; count: string }>(
      "SELECT category, COUNT(*) as count FROM lots WHERE status = 'aktiv' GROUP BY category ORDER BY count DESC"
    );

    return NextResponse.json({
      ok: true,
      stats: {
        users: parseInt(userCount?.count || '0'),
        active_lots: parseInt(lotCount?.count || '0'),
        total_bids: parseInt(bidCount?.count || '0'),
        avg_price: parseFloat(avgPrice?.avg || '0'),
        price_range: {
          min: parseFloat(minPrice?.min || '0'),
          max: parseFloat(maxPrice?.max || '0'),
        },
      },
      categories: Object.fromEntries(categories.map(c => [c.category, parseInt(c.count)])),
    });
  } catch (err) {
    console.error('Stats error, using mock data:', err);
    const mockStats = getMockStats();
    const mockCats = getMockCategories();
    return NextResponse.json({
      ok: true,
      stats: mockStats,
      categories: mockCats,
    });
  }
}

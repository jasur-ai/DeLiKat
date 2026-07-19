import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

const COUNTRIES: Record<string, { name: string; flag: string; currency: string; code: string }> = {
  KGZ: { name: "Qirg'iziston", flag: '🇰🇬', currency: 'KGS', code: 'KGZ' },
  KAZ: { name: 'Qozog\'iston', flag: '🇰🇿', currency: 'KZT', code: 'KAZ' },
  TJK: { name: 'Tojikiston', flag: '🇹🇯', currency: 'TJS', code: 'TJK' },
  RUS: { name: 'Rossiya', flag: '🇷🇺', currency: 'RUB', code: 'RUS' },
};

function fmtPrice(p: number): string {
  if (!p) return "0 so'm";
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)} mln so'm`;
  if (p >= 1_000) return `${Math.round(p / 1_000)} ming so'm`;
  return `${p.toLocaleString()} so'm`;
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // /api/crossborder/countries
  if (pathname.endsWith('/countries')) {
    return NextResponse.json({
      countries: Object.values(COUNTRIES),
      total: Object.keys(COUNTRIES).length,
    });
  }

  // /api/crossborder/user/{userId}
  const userMatch = pathname.match(/\/user\/(\d+)$/);
  if (userMatch) {
    const userId = parseInt(userMatch[1]);
    try {
      const user = await queryOne<any>('SELECT id, name FROM users WHERE id = $1', [userId]);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const listings = await query<any>(
        `SELECT cb.*, l.title as lot_title, l.price as lot_price
         FROM cross_border_listings cb
         LEFT JOIN lots l ON cb.lot_id = l.id
         WHERE cb.seller_id = $1
         ORDER BY cb.created_at DESC`,
        [userId]
      );

      const results = listings.map((cb: any) => {
        const ci = COUNTRIES[cb.target_country] || {};
        return {
          id: cb.id,
          lot_id: cb.lot_id,
          lot_title: cb.lot_title || "Noma'lum",
          lot_price: cb.lot_price || 0,
          target_country: cb.target_country,
          country_name: ci.name || cb.target_country,
          country_flag: ci.flag || '🌍',
          shipping_cost: cb.shipping_cost,
          shipping_formatted: fmtPrice(cb.shipping_cost),
          is_active: cb.is_active,
          created_at: cb.created_at || null,
        };
      });

      return NextResponse.json({
        user_id: userId,
        user_name: user.name,
        listings: results,
        total: results.length,
        active_count: results.filter((l: any) => l.is_active).length,
      });
    } catch (err) {
      console.error('User crossborder error:', err);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  // /api/crossborder/listings (default)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 50);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
  const country = searchParams.get('country');

  try {
    let whereClause = 'WHERE cb.is_active = true';
    const params: any[] = [];
    let paramIdx = 1;

    if (country && COUNTRIES[country.toUpperCase()]) {
      whereClause += ` AND cb.target_country = $${paramIdx++}`;
      params.push(country.toUpperCase());
    }

    const countResult = await queryOne<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM cross_border_listings cb ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.cnt || '0');

    const listings = await query<any>(
      `SELECT cb.*, l.title as lot_title, l.price as lot_price, l.category as lot_category,
              l.grade as lot_grade, l.quantity as lot_quantity,
              u.name as seller_name, u.rating as seller_rating
       FROM cross_border_listings cb
       LEFT JOIN lots l ON cb.lot_id = l.id
       LEFT JOIN users u ON cb.seller_id = u.id
       ${whereClause}
       ORDER BY cb.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    // Country totals
    let countryTotals: Record<string, number> = {};
    try {
      const totals = await query<any>(
        `SELECT target_country, COUNT(*) as cnt FROM cross_border_listings WHERE is_active = true GROUP BY target_country`
      );
      for (const t of totals) countryTotals[t.target_country] = parseInt(t.cnt);
    } catch { /* skip */ }

    const results = listings.map((cb: any) => {
      const ci = COUNTRIES[cb.target_country] || {};
      return {
        id: cb.id,
        lot_id: cb.lot_id,
        lot_title: cb.lot_title || "Noma'lum",
        lot_price: cb.lot_price || 0,
        lot_category: cb.lot_category || '',
        lot_grade: cb.lot_grade || '',
        lot_quantity: cb.lot_quantity || 0,
        seller_id: cb.seller_id,
        seller_name: cb.seller_name || "Noma'lum",
        seller_rating: cb.seller_rating || 0,
        target_country: cb.target_country,
        country_name: ci.name || cb.target_country,
        country_flag: ci.flag || '🌍',
        currency: ci.currency || cb.currency,
        shipping_cost: cb.shipping_cost,
        shipping_formatted: fmtPrice(cb.shipping_cost),
        price_with_shipping: (cb.lot_price || 0) + (cb.shipping_cost || 0),
        is_active: cb.is_active,
        created_at: cb.created_at || null,
      };
    });

    return NextResponse.json({
      listings: results,
      total,
      limit,
      offset,
      countries: COUNTRIES,
      country_totals: countryTotals,
    });
  } catch (err) {
    console.error('Cross-border listings error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

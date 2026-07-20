import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { MOCK_REVIEWS, MOCK_LOTS, MOCK_USERS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30'), 1), 100);
    const sellerId = searchParams.get('seller_id');
    const minRating = searchParams.get('min_rating');

    let whereClause = 'WHERE r.is_verified_purchase = true';
    const params: any[] = [];
    let paramIdx = 1;

    if (sellerId) { whereClause += ` AND r.seller_id = $${paramIdx++}`; params.push(parseInt(sellerId)); }
    if (minRating) { whereClause += ` AND r.rating >= $${paramIdx++}`; params.push(parseInt(minRating)); }

    const reviews = await query<any>(
      `SELECT r.* FROM trusted_reviews r ${whereClause} ORDER BY r.created_at DESC LIMIT $${paramIdx}`,
      [...params, limit]
    );

    const results = await Promise.all(
      reviews.map(async (r: any) => {
        let lot: any = null, buyer: any = null, seller: any = null;
        try { lot = await queryOne<any>('SELECT id, title, category FROM lots WHERE id = $1', [r.lot_id]); } catch {}
        try { buyer = await queryOne<any>('SELECT id, name FROM users WHERE id = $1', [r.buyer_id]); } catch {}
        try { seller = await queryOne<any>('SELECT id, name, rating, is_verified FROM users WHERE id = $1', [r.seller_id]); } catch {}
        return {
          id: r.id, rating: r.rating, text: r.text || '', media_type: r.media_type || 'photo',
          is_verified_purchase: r.is_verified_purchase, created_at: r.created_at || '',
          lot: lot ? { id: lot.id, title: lot.title?.substring(0, 100) || "Noma'lum lot", category: lot.category || '' } : null,
          buyer: { name: buyer?.name || "Noma'lum" },
          seller: seller ? { id: seller.id, name: seller.name || "Noma'lum", rating: Math.round((seller.rating || 0) * 10) / 10, is_verified: seller.is_verified || false } : null,
        };
      })
    );

    let totalCount = 0, avgRatingVal = 0;
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    try {
      const countResult = await queryOne<{ cnt: string }>('SELECT COUNT(*) as cnt FROM trusted_reviews WHERE is_verified_purchase = true');
      totalCount = parseInt(countResult?.cnt || '0');
      const allRatings = await query<{ rating: number }>('SELECT rating FROM trusted_reviews WHERE is_verified_purchase = true');
      if (allRatings.length > 0) {
        avgRatingVal = Math.round((allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length) * 10) / 10;
        for (const r of allRatings) dist[r.rating] = (dist[r.rating] || 0) + 1;
      }
    } catch {}

    return NextResponse.json({ ok: true, count: results.length, total: totalCount, avg_rating: avgRatingVal, rating_distribution: dist, reviews: results });
  } catch (err) {
    console.error('Reviews error, using mock data:', err);
    const minRating = request.nextUrl.searchParams.get('min_rating');
    const minR = minRating ? parseInt(minRating) : 0;
    let filtered = MOCK_REVIEWS.filter(r => r.rating >= minR);
    const totalCount = MOCK_REVIEWS.length;
    const avgRatingVal = Math.round((MOCK_REVIEWS.reduce((s, r) => s + r.rating, 0) / MOCK_REVIEWS.length) * 10) / 10;
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of MOCK_REVIEWS) dist[r.rating] = (dist[r.rating] || 0) + 1;

    const results = filtered.map(r => {
      const lot = MOCK_LOTS.find(l => l.id === r.lot_id);
      const buyer = MOCK_USERS.find(u => u.id === r.buyer_id);
      const seller = MOCK_USERS.find(u => u.id === r.seller_id);
      return {
        id: r.id, rating: r.rating, text: r.text, media_type: r.media_type,
        is_verified_purchase: r.is_verified_purchase, created_at: r.created_at,
        lot: lot ? { id: lot.id, title: lot.title.substring(0, 100), category: lot.category } : null,
        buyer: { name: buyer?.name || "Noma'lum" },
        seller: seller ? { id: seller.id, name: seller.name, rating: Math.round(seller.rating * 10) / 10, is_verified: seller.is_verified } : null,
      };
    });

    return NextResponse.json({ ok: true, count: results.length, total: totalCount, avg_rating: avgRatingVal, rating_distribution: dist, reviews: results });
  }
}

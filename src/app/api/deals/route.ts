import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    let where = '';
    const params: any[] = [];
    let idx = 1;

    if (status) {
      where = `WHERE t.status = $${idx++}`;
      params.push(status);
    }

    const rows = await query<any>(
      `SELECT t.*, 
              l.title as lot_title, l.category as lot_category, l.grade as lot_grade,
              b.name as buyer_name, b.rating as buyer_rating,
              s.name as seller_name, s.rating as seller_rating
       FROM transactions t
       LEFT JOIN lots l ON t.lot_id = l.id
       LEFT JOIN users b ON t.buyer_id = b.id
       LEFT JOIN users s ON t.seller_id = s.id
       ${where}
       ORDER BY t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset]
    );

    const total = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM transactions t ${where}`,
      params
    );

    return NextResponse.json({
      ok: true,
      deals: rows.map(r => ({
        id: r.id, lot_id: r.lot_id, lot_title: r.lot_title,
        amount: r.amount, status: r.status, lot_quantity: r.lot_quantity,
        buyer: { id: r.buyer_id, name: r.buyer_name, rating: r.buyer_rating },
        seller: { id: r.seller_id, name: r.seller_name, rating: r.seller_rating },
        created_at: r.created_at, completed_at: r.completed_at,
      })),
      total: parseInt(total[0]?.count || '0'),
      limit, offset,
    });
  } catch (err) {
    console.error('Deals error, using mock data:', err);
    const { MOCK_TRANSACTIONS, MOCK_LOTS, MOCK_USERS } = await import('@/lib/mock-data');
    const status = request.nextUrl.searchParams.get('status') || '';
    let filtered = MOCK_TRANSACTIONS;
    if (status) filtered = filtered.filter((t: any) => t.status === status);
    const lmt = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 200);
    const deals = filtered.slice(0, lmt).map((t: any) => {
      const lot = MOCK_LOTS.find((l: any) => l.id === t.lot_id);
      const buyer = MOCK_USERS.find((u: any) => u.id === t.buyer_id);
      const seller = MOCK_USERS.find((u: any) => u.id === t.seller_id);
      return {
        id: t.id, lot_id: t.lot_id, lot_title: lot?.title || "Noma'lum",
        amount: t.amount, status: t.status, lot_quantity: lot?.quantity || 1,
        lot_price: lot?.price || t.amount, lot_category: lot?.category || '',
        lot_grade: lot?.grade || '', buyer_name: buyer?.name || "Noma'lum",
        seller_name: seller?.name || "Noma'lum",
        buyer: { id: t.buyer_id, name: buyer?.name || "Noma'lum", rating: buyer?.rating || 0 },
        seller: { id: t.seller_id, name: seller?.name || "Noma'lum", rating: seller?.rating || 0 },
        created_at: t.created_at, completed_at: t.completed_at || null,
      };
    });
    return NextResponse.json({ ok: true, deals, total: MOCK_TRANSACTIONS.length, limit: lmt, offset: 0 });
  }
}

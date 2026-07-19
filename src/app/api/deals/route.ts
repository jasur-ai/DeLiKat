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
        amount: r.amount, status: r.status,
        buyer: { id: r.buyer_id, name: r.buyer_name, rating: r.buyer_rating },
        seller: { id: r.seller_id, name: r.seller_name, rating: r.seller_rating },
        created_at: r.created_at, completed_at: r.completed_at,
      })),
      total: parseInt(total[0]?.count || '0'),
      limit, offset,
    });
  } catch (err) {
    console.error('Deals error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

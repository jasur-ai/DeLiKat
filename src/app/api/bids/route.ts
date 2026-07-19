import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { lot_id, price, quantity } = data;

    if (!lot_id || !price) {
      return NextResponse.json({ error: 'lot_id and price are required' }, { status: 400 });
    }

    // Check if lot exists and is active
    const lot = await queryOne<any>('SELECT * FROM lots WHERE id = $1 AND status = $2', [lot_id, 'aktiv']);
    if (!lot) {
      return NextResponse.json({ error: 'Lot not found or not active' }, { status: 404 });
    }

    // Get current user from token (fallback to anonymous if no token)
    let buyerId = 0;
    try {
      const { cookies } = await import('next/headers');
      const { verifyToken, TOKEN_COOKIE } = await import('@/lib/auth');
      const cookieStore = await cookies();
      const token = cookieStore.get(TOKEN_COOKIE)?.value;
      if (token) {
        const payload = verifyToken(token);
        if (payload) buyerId = payload.userId;
      }
    } catch { /* no auth */ }

    if (!buyerId) {
      return NextResponse.json({ error: 'Authentication required. Please login first.' }, { status: 401 });
    }

    const result = await queryOne<any>(
      `INSERT INTO bids (lot_id, buyer_id, price, quantity, status)
       VALUES ($1, $2, $3, $4, 'kutmoqda')
       RETURNING id, lot_id, price, quantity, status, created_at`,
      [lot_id, buyerId, price, quantity || 1]
    );

    return NextResponse.json({ ok: true, bid: result });
  } catch (err) {
    console.error('Bid creation error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buyerId = searchParams.get('buyer_id');
    const lotId = searchParams.get('lot_id');

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (buyerId) { whereClause += ` AND b.buyer_id = $${idx++}`; params.push(parseInt(buyerId)); }
    if (lotId) { whereClause += ` AND b.lot_id = $${idx++}`; params.push(parseInt(lotId)); }

    const bids = await query<any>(
      `SELECT b.*, l.title as lot_title, u.name as buyer_name
       FROM bids b
       LEFT JOIN lots l ON b.lot_id = l.id
       LEFT JOIN users u ON b.buyer_id = u.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT 50`,
      params
    );

    return NextResponse.json({ ok: true, bids, count: bids.length });
  } catch (err) {
    console.error('Bids fetch error:', err);
    return NextResponse.json({ ok: false, bids: [], count: 0 });
  }
}

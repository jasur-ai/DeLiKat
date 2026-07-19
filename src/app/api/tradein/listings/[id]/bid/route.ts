import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listingId = parseInt(id);
    const data = await request.json();

    const tradeIn = await queryOne<any>('SELECT * FROM trade_ins WHERE id = $1', [listingId]);
    if (!tradeIn) {
      return NextResponse.json({ error: 'Trade-in not found' }, { status: 404 });
    }

    const acceptingStatuses = ['kutilmoqda', 'baholandi'];
    if (!acceptingStatuses.includes(tradeIn.status)) {
      return NextResponse.json({ error: 'Trade-in not accepting bids' }, { status: 400 });
    }

    const buyerId = data.buyer_id;
    const price = data.price;

    if (!buyerId || !price) {
      return NextResponse.json({ error: 'buyer_id and price required' }, { status: 400 });
    }

    const result = await queryOne<any>(
      `INSERT INTO trade_in_bids (trade_in_id, buyer_id, price, message, status)
       VALUES ($1, $2, $3, $4, 'kutilmoqda')
       RETURNING id, price, status`,
      [listingId, buyerId, price, data.message || null]
    );

    return NextResponse.json({
      ok: true,
      bid: result,
    });
  } catch (err) {
    console.error('Trade-in bid error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

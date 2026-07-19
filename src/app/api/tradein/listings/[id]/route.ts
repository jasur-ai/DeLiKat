import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listingId = parseInt(id);

    const tradeIn = await queryOne<any>(
      `SELECT ti.*, u.name as seller_name, u.rating as seller_rating
       FROM trade_ins ti
       LEFT JOIN users u ON ti.seller_id = u.id
       WHERE ti.id = $1`,
      [listingId]
    );

    if (!tradeIn) {
      return NextResponse.json({ error: 'Trade-in not found' }, { status: 404 });
    }

    let bids: any[] = [];
    try {
      bids = await query<any>(
        `SELECT b.*, u.name as buyer_name, u.rating as buyer_rating
         FROM trade_in_bids b
         LEFT JOIN users u ON b.buyer_id = u.id
         WHERE b.trade_in_id = $1
         ORDER BY b.created_at DESC`,
        [listingId]
      );
    } catch { /* bids table may not exist */ }

    const bidsData = bids.map((b: any) => ({
      id: b.id,
      price: b.price,
      message: b.message,
      status: b.status,
      created_at: b.created_at || null,
      buyer: { id: b.buyer_id, name: b.buyer_name || "Noma'lum", rating: b.buyer_rating || 0 },
    }));

    let aiValuation = null;
    try { aiValuation = typeof tradeIn.ai_valuation_data === 'string' ? JSON.parse(tradeIn.ai_valuation_data) : tradeIn.ai_valuation_data; } catch { aiValuation = tradeIn.ai_valuation_data; }

    return NextResponse.json({
      id: tradeIn.id,
      device_model: tradeIn.device_model,
      category: tradeIn.category,
      condition: tradeIn.condition,
      grade: tradeIn.grade,
      estimated_price: tradeIn.estimated_price,
      final_price: tradeIn.final_price,
      description: tradeIn.description,
      status: tradeIn.status,
      ai_valuation: aiValuation,
      created_at: tradeIn.created_at || null,
      seller: tradeIn.seller_name ? { id: tradeIn.seller_id, name: tradeIn.seller_name, rating: tradeIn.seller_rating } : null,
      bids: bidsData,
    });
  } catch (err) {
    console.error('Trade-in detail error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
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

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.final_price !== undefined) {
      updates.push(`final_price = $${idx++}`);
      values.push(data.final_price);
      updates.push(`status = 'baholandi'`);
      updates.push(`evaluated_at = NOW()`);
    }
    if (data.status) {
      const validStatuses = ['kutilmoqda', 'baholandi', 'qabul', 'qaytarildi', 'sotildi'];
      if (!validStatuses.includes(data.status)) {
        return NextResponse.json({ error: `Invalid status. Valid: ${validStatuses.join(', ')}` }, { status: 400 });
      }
      updates.push(`status = $${idx++}`);
      values.push(data.status);

      if (data.status === 'sotildi') {
        updates.push(`sold_at = NOW()`);
      }
      if (['baholandi', 'qabul'].includes(data.status)) {
        updates.push(`evaluated_at = NOW()`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    values.push(listingId);
    const result = await queryOne<any>(
      `UPDATE trade_ins SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, status, estimated_price, final_price`,
      values
    );

    return NextResponse.json({
      ok: true,
      trade_in: result,
    });
  } catch (err) {
    console.error('Trade-in update error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, Lot } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lotId = parseInt(params.id);
    if (isNaN(lotId)) {
      return NextResponse.json({ ok: false, error: 'Invalid lot ID' }, { status: 400 });
    }

    const lot = await queryOne<any>(
      `SELECT l.*, u.id as seller_id, u.name as seller_name, u.phone as seller_phone, 
              u.rating as seller_rating, u.role as seller_role
       FROM lots l
       LEFT JOIN users u ON l.seller_id = u.id
       WHERE l.id = $1`,
      [lotId]
    );

    if (!lot) {
      return NextResponse.json({ ok: false, error: 'Lot not found' }, { status: 404 });
    }

    const bids = await query<any>(
      `SELECT b.*, u.name as buyer_name, u.rating as buyer_rating
       FROM bids b
       LEFT JOIN users u ON b.buyer_id = u.id
       WHERE b.lot_id = $1
       ORDER BY b.created_at DESC`,
      [lotId]
    );

    return NextResponse.json({
      id: lot.id,
      title: lot.title,
      description: lot.description,
      category: lot.category,
      price: lot.price,
      quantity: lot.quantity,
      grade: lot.grade,
      status: lot.status,
      image_file_id: lot.image_file_id,
      created_at: lot.created_at,
      seller: {
        id: lot.seller_id,
        name: lot.seller_name,
        phone: lot.seller_phone,
        rating: lot.seller_rating,
        role: lot.seller_role,
      },
      bids: bids.map(b => ({
        id: b.id,
        price: b.price,
        quantity: b.quantity,
        status: b.status,
        created_at: b.created_at,
        buyer: { id: b.buyer_id, name: b.buyer_name, rating: b.buyer_rating },
      })),
    });
  } catch (err) {
    console.error('Lot detail error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * ❤️ Wishlist API — Sevimli lotlar
 *
 * GET  /api/wishlist       → user wishlist
 * POST /api/wishlist       → { lot_id } add/remove toggle
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory wishlist store (would be DB in production)
const wishlists = new Map<number, Set<number>>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = parseInt(searchParams.get('user_id') || '1');

  const userWishlist = wishlists.get(userId) || new Set<number>();
  return NextResponse.json({
    ok: true,
    wishlist: Array.from(userWishlist),
    count: userWishlist.size,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lot_id, user_id } = body;

    if (!lot_id) {
      return NextResponse.json({ ok: false, error: 'lot_id required' }, { status: 400 });
    }

    const uid = user_id || 1;
    if (!wishlists.has(uid)) wishlists.set(uid, new Set());

    const userList = wishlists.get(uid)!;
    const isAdding = !userList.has(lot_id);

    if (isAdding) {
      userList.add(lot_id);
    } else {
      userList.delete(lot_id);
    }

    return NextResponse.json({
      ok: true,
      wishlist: Array.from(userList),
      count: userList.size,
      action: isAdding ? 'added' : 'removed',
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}

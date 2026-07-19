import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';

    if (!token || token.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid token format (6 characters required)' },
        { status: 400 }
      );
    }

    // Find valid token
    const sync = await queryOne<any>(
      `SELECT * FROM sync_tokens
       WHERE token = $1 AND is_used = false AND expires_at > NOW()`,
      [token.toUpperCase()]
    );

    if (!sync) {
      return NextResponse.json(
        { error: 'Token not found or expired. Generate a new one with /sync in Telegram bot.' },
        { status: 404 }
      );
    }

    // Mark token as used
    await query('UPDATE sync_tokens SET is_used = true WHERE id = $1', [sync.id]);

    // Get user data
    const user = await queryOne<any>('SELECT * FROM users WHERE id = $1', [sync.user_id]);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's lots
    const lots = await query<any>(
      `SELECT * FROM lots WHERE seller_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );

    const lotsData = await Promise.all(
      lots.map(async (lot: any) => {
        let bidCount = 0;
        try {
          const bidResult = await queryOne<{ cnt: string }>('SELECT COUNT(*) as cnt FROM bids WHERE lot_id = $1', [lot.id]);
          bidCount = parseInt(bidResult?.cnt || '0');
        } catch { /* skip */ }
        return {
          id: lot.id,
          title: lot.title,
          category: lot.category,
          price: lot.price,
          quantity: lot.quantity,
          grade: lot.grade,
          status: lot.status,
          bid_count: bidCount,
          created_at: lot.created_at || null,
        };
      })
    );

    // Get user's bids
    let bidsData: any[] = [];
    try {
      const bids = await query<any>(
        `SELECT b.*, l.title as lot_title
         FROM bids b
         LEFT JOIN lots l ON b.lot_id = l.id
         WHERE b.buyer_id = $1
         ORDER BY b.created_at DESC`,
        [user.id]
      );
      bidsData = bids.map((b: any) => ({
        id: b.id,
        lot_id: b.lot_id,
        lot_title: b.lot_title || "Noma'lum",
        price: b.price,
        quantity: b.quantity,
        status: b.status,
        created_at: b.created_at || null,
      }));
    } catch { /* skip */ }

    // Get wishlist
    let wishlistData: any[] = [];
    try {
      const wishlist = await query<any>(
        `SELECT w.*, l.title as lot_title, l.price as lot_price, l.status as lot_status
         FROM wishlist w
         LEFT JOIN lots l ON w.lot_id = l.id
         WHERE w.user_id = $1`,
        [user.id]
      );
      wishlistData = wishlist.map((w: any) => ({
        id: w.id,
        lot_id: w.lot_id,
        lot_title: w.lot_title ? w.lot_title.substring(0, 60) : '',
        lot_price: w.lot_price,
        lot_status: w.lot_status,
      }));
    } catch { /* skip */ }

    // Get achievements
    let achievementsData: any[] = [];
    try {
      const achievements = await query<any>(
        `SELECT * FROM achievements WHERE user_id = $1 ORDER BY unlocked_at DESC`,
        [user.id]
      );
      achievementsData = achievements.map((a: any) => ({
        badge: a.badge,
        title: a.title,
        xp_reward: a.xp_reward,
        unlocked_at: a.unlocked_at || null,
      }));
    } catch { /* skip */ }

    return NextResponse.json({
      status: 'ok',
      message: `✅ Hisob sinxronlandi! Xush kelibsiz, ${user.name}!`,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        rating: user.rating,
        is_verified: user.is_verified,
        xp: user.xp || 0,
        level: user.level || 1,
        created_at: user.created_at || null,
      },
      stats: {
        total_lots: lotsData.length,
        active_lots: lotsData.filter((l: any) => l.status === 'aktiv').length,
        sold_lots: lotsData.filter((l: any) => l.status === 'sotilgan').length,
        total_bids: bidsData.length,
        pending_bids: bidsData.filter((b: any) => b.status === 'kutmoqda').length,
        wishlist_count: wishlistData.length,
        achievements_count: achievementsData.length,
      },
      lots: lotsData,
      bids: bidsData,
      wishlist: wishlistData,
      achievements: achievementsData,
    });
  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: 'Server error during sync' }, { status: 500 });
  }
}

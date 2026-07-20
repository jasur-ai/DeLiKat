import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { MOCK_LOTS, MOCK_TRANSACTIONS, MOCK_BIDS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Generate mock notifications for a user */
function getMockNotifications(userId: number) {
  const userLots = MOCK_LOTS.filter(l => l.seller_id === userId);
  const userBids = MOCK_BIDS.filter(b => b.buyer_id === userId);
  const now = new Date();
  const notifications: any[] = [];

  // New bid on user's lot
  if (userLots.length > 0) {
    notifications.push({
      id: 1, type: 'new_bid', title: 'Yangi taklif',
      message: `Lotingizga yangi taklif kelib tushdi: "${userLots[0].title?.slice(0, 40)}..."`,
      icon: '💰', lot_id: userLots[0].id,
      created_at: new Date(now.getTime() - 3600000).toISOString(), is_read: false,
    });
  }

  // Bid accepted
  if (userBids.length > 0) {
    notifications.push({
      id: 2, type: 'bid_accepted', title: 'Taklif qabul qilindi',
      message: `"${userBids[0].lot_id}" lotiga taklifingiz qabul qilindi!`,
      icon: '✅', lot_id: userBids[0].lot_id,
      created_at: new Date(now.getTime() - 7200000).toISOString(), is_read: false,
    });
  }

  // New transaction
  const userTx = MOCK_TRANSACTIONS.find(t => t.buyer_id === userId || t.seller_id === userId);
  if (userTx) {
    notifications.push({
      id: 3, type: 'new_deal', title: 'Yangi bitim',
      message: 'Bitim muvaffaqiyatli yaratildi! ESCROW himoyasida.',
      icon: '🤝', lot_id: userTx.lot_id,
      created_at: new Date(now.getTime() - 86400000).toISOString(), is_read: true,
    });
  }

  // ESCROW release
  notifications.push({
    id: 4, type: 'escrow', title: 'ESCROW to\'lov',
    message: 'Mahsulot yetib bordi. ESCROW dan pul sotuvchiga o\'tkazildi.',
    icon: '🛡️',
    created_at: new Date(now.getTime() - 172800000).toISOString(), is_read: true,
  });

  // Academy reminder
  notifications.push({
    id: 5, type: 'academy', title: '🎓 Yangi dars',
    message: '"Marketing va sotuv strategiyalari" darsi mavjud. +150 XP!',
    icon: '📚',
    created_at: new Date(now.getTime() - 259200000).toISOString(), is_read: true,
  });

  return notifications;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('user_id');

  try {
    if (userId) {
      let notifications = await query<any>(
        `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [parseInt(userId)]
      );

      const unreadCount = await queryOne<{ cnt: string }>(
        'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = $1 AND is_read = false',
        [parseInt(userId)]
      );

      return NextResponse.json({
        ok: true,
        notifications: notifications.map((n: any) => ({
          id: n.id, type: n.type, title: n.title, message: n.message,
          icon: n.icon, lot_id: n.lot_id,
          created_at: n.created_at, is_read: n.is_read,
        })),
        unread_count: parseInt(unreadCount?.cnt || '0'),
      });
    }
  } catch (err) {
    console.error('Notifications error, using mock:', err);
  }

  const uid = userId ? parseInt(userId) : 1;
  const notifications = getMockNotifications(uid);
  return NextResponse.json({
    ok: true,
    notifications,
    unread_count: notifications.filter(n => !n.is_read).length,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'mark_read') {
      const { notification_id } = body;
      if (notification_id) {
        try {
          await query('UPDATE notifications SET is_read = true WHERE id = $1', [notification_id]);
        } catch { /* table may not exist */ }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'mark_all_read') {
      const { user_id } = body;
      if (user_id) {
        try {
          await query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [parseInt(user_id)]);
        } catch { /* table may not exist */ }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'create') {
      const { user_id, type, title, message, icon, lot_id } = body;
      if (!user_id || !type || !title || !message) {
        return NextResponse.json({ error: 'user_id, type, title, and message are required' }, { status: 400 });
      }
      try {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, icon, lot_id) VALUES ($1, $2, $3, $4, $5, $6)`,
          [user_id, type, title, message, icon, lot_id || null]
        );
      } catch { /* table may not exist */ }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Notification action error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

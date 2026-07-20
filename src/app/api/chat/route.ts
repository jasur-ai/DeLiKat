import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { MOCK_USERS, MOCK_LOTS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Mock conversations for demo */
const MOCK_CONVERSATIONS: Record<string, any[]> = {
  '1_4': [
    { id: 1, sender_id: 1, sender_name: "Jasur Karimov", text: "Assalomu alaykum! iPhone 14 Pro Max hali bormi?", created_at: "2026-06-14T10:00:00Z", is_mine: false },
    { id: 2, sender_id: 4, sender_name: "Dilnoza Abdullayeva", text: "Va alaykum assalom! Ha, 1 dona qolgan. 12.5 mln so'm", created_at: "2026-06-14T10:05:00Z", is_mine: true },
    { id: 3, sender_id: 1, sender_name: "Jasur Karimov", text: "Narxni tushirish mumkinmi? 11.5 mln bo'lsa olaman", created_at: "2026-06-14T10:10:00Z", is_mine: false },
    { id: 4, sender_id: 4, sender_name: "Dilnoza Abdullayeva", text: "12 mln bo'lishi mumkin. Bugun olsangiz yetkazib beraman", created_at: "2026-06-14T10:15:00Z", is_mine: true },
  ],
  '10_1': [
    { id: 1, sender_id: 10, sender_name: "Kamola Yoqubova", text: "HP Spectre notebook hali bormi?", created_at: "2026-06-13T09:00:00Z", is_mine: false },
    { id: 2, sender_id: 1, sender_name: "Jasur Karimov", text: "Ha, 3 dona mavjud. 9.5 mln/dona", created_at: "2026-06-13T09:30:00Z", is_mine: true },
    { id: 3, sender_id: 10, sender_name: "Kamola Yoqubova", text: "3 tasini ham olsak chegirma bormi?", created_at: "2026-06-13T10:00:00Z", is_mine: false },
    { id: 4, sender_id: 1, sender_name: "Jasur Karimov", text: "26 mln qilaman 3 tasini. Eng zo'r narx!", created_at: "2026-06-13T11:00:00Z", is_mine: true },
  ],
};

function getMockConversations(userId: number): any[] {
  const result: any[] = [];
  const convKeys = Object.keys(MOCK_CONVERSATIONS);
  for (const key of convKeys) {
    const [id1, id2] = key.split('_').map(Number);
    if (id1 === userId || id2 === userId) {
      const msgs = MOCK_CONVERSATIONS[key];
      const lastMsg = msgs[msgs.length - 1];
      const otherId = id1 === userId ? id2 : id1;
      const otherUser = MOCK_USERS.find(u => u.id === otherId);
      const unread = msgs.filter(m => !m.is_mine && m.id === msgs.length).length;
      result.push({
        id: key,
        with_user_id: otherId,
        with_user_name: otherUser?.name || "Noma'lum",
        with_user_avatar: (otherUser?.name?.charAt(0) || '👤').toUpperCase(),
        last_message: lastMsg.text,
        last_message_time: lastMsg.created_at,
        unread_count: 0, // simplified
        messages: msgs,
      });
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('user_id');
  const withUserId = searchParams.get('with');

  try {
    // Try DB first
    if (userId) {
      const convResult = await query<any>(
        `SELECT DISTINCT
          CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_user_id,
          u.name as other_user_name,
          m2.text as last_message,
          m2.created_at as last_message_time
         FROM messages m
         LEFT JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
         LEFT JOIN LATERAL (
           SELECT text, created_at FROM messages
           WHERE (sender_id = $1 AND receiver_id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
              OR (receiver_id = $1 AND sender_id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END)
           ORDER BY created_at DESC LIMIT 1
         ) m2 ON true
         WHERE m.sender_id = $1 OR m.receiver_id = $1
         ORDER BY m2.created_at DESC`,
        [parseInt(userId)]
      );

      const conversations = await Promise.all(
        convResult.map(async (row: any) => {
          let msgs: any[] = [];
          try {
            msgs = await query<any>(
              `SELECT m.*, u.name as sender_name
               FROM messages m
               LEFT JOIN users u ON m.sender_id = u.id
               WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
               ORDER BY m.created_at ASC`,
              [parseInt(userId), row.other_user_id]
            );
          } catch { /* skip */ }
          return {
            id: `${userId}_${row.other_user_id}`,
            with_user_id: row.other_user_id,
            with_user_name: row.other_user_name || "Noma'lum",
            last_message: row.last_message || '',
            last_message_time: row.last_message_time || null,
            messages: msgs.map(m => ({
              id: m.id,
              sender_id: m.sender_id,
              sender_name: m.sender_name || "Noma'lum",
              text: m.text,
              created_at: m.created_at,
              is_mine: m.sender_id === parseInt(userId),
            })),
          };
        })
      );

      return NextResponse.json({ ok: true, conversations });
    }
  } catch (err) {
    console.error('Chat error, using mock data:', err);
  }

  // Fall back to mock data
  const uid = userId ? parseInt(userId) : 1;
  let conversations = getMockConversations(uid);

  if (withUserId) {
    const conv = conversations.find(c => c.with_user_id === parseInt(withUserId));
    return NextResponse.json({ ok: true, conversations: conv ? [conv] : [] });
  }

  return NextResponse.json({ ok: true, conversations });
}

export async function POST(request: NextRequest) {
  try {
    const { sender_id, receiver_id, text, lot_id } = await request.json();

    if (!sender_id || !receiver_id || !text) {
      return NextResponse.json({ error: 'sender_id, receiver_id, and text required' }, { status: 400 });
    }

    // Try DB
    try {
      const result = await query<any>(
        `INSERT INTO messages (sender_id, receiver_id, lot_id, text)
         VALUES ($1, $2, $3, $4)
         RETURNING id, sender_id, receiver_id, text, created_at`,
        [sender_id, receiver_id, lot_id || null, text]
      );

      const msg = result[0];
      const sender = await queryOne<any>('SELECT name FROM users WHERE id = $1', [sender_id]);

      return NextResponse.json({
        ok: true,
        message: {
          id: msg.id,
          sender_id: msg.sender_id,
          sender_name: sender?.name || "Noma'lum",
          text: msg.text,
          created_at: msg.created_at,
          is_mine: true,
        },
      });
    } catch {
      // Mock response
      const sender = MOCK_USERS.find(u => u.id === sender_id);
      return NextResponse.json({
        ok: true,
        message: {
          id: Date.now(),
          sender_id,
          sender_name: sender?.name || "Noma'lum",
          text,
          created_at: new Date().toISOString(),
          is_mine: true,
        },
      });
    }
  } catch (err) {
    console.error('Chat send error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

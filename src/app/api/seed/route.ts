import { NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { MOCK_USERS, MOCK_LOTS, MOCK_BIDS, MOCK_TRANSACTIONS, MOCK_REVIEWS, MOCK_ACHIEVEMENTS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  const results: string[] = [];
  const inserted: Record<string, number> = {};

  try {
    // 1. Create tables
    results.push('users');
    await execute(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100),
      phone VARCHAR(30),
      name VARCHAR(200) NOT NULL,
      email VARCHAR(200),
      password_hash VARCHAR(255) DEFAULT '',
      role VARCHAR(20) DEFAULT 'xaridor',
      rating DECIMAL(3,1) DEFAULT 0,
      is_admin BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      trust_score DECIMAL(3,1) DEFAULT 5.0,
      total_sales INTEGER DEFAULT 0,
      total_purchases INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    results.push('lots');
    await execute(`CREATE TABLE IF NOT EXISTS lots (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER REFERENCES users(id),
      category VARCHAR(50) NOT NULL,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      quantity INTEGER DEFAULT 1,
      price DECIMAL(12,2) NOT NULL,
      grade VARCHAR(5) DEFAULT 'B',
      status VARCHAR(20) DEFAULT 'aktiv',
      image_file_id VARCHAR(255),
      view_count INTEGER DEFAULT 0,
      bid_count INTEGER DEFAULT 0,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    results.push('bids');
    await execute(`CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      lot_id INTEGER REFERENCES lots(id),
      buyer_id INTEGER REFERENCES users(id),
      price DECIMAL(12,2) NOT NULL,
      quantity INTEGER DEFAULT 1,
      status VARCHAR(20) DEFAULT 'kutmoqda',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    results.push('transactions');
    await execute(`CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      lot_id INTEGER REFERENCES lots(id),
      buyer_id INTEGER REFERENCES users(id),
      seller_id INTEGER REFERENCES users(id),
      amount DECIMAL(14,2) NOT NULL,
      status VARCHAR(30) DEFAULT 'kutilmoqda',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    )`);

    results.push('trusted_reviews');
    await execute(`CREATE TABLE IF NOT EXISTS trusted_reviews (
      id SERIAL PRIMARY KEY,
      lot_id INTEGER REFERENCES lots(id),
      buyer_id INTEGER REFERENCES users(id),
      seller_id INTEGER REFERENCES users(id),
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      text TEXT,
      media_type VARCHAR(20) DEFAULT 'photo',
      is_verified_purchase BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    results.push('achievements');
    await execute(`CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      badge VARCHAR(50),
      title VARCHAR(200),
      xp_reward INTEGER DEFAULT 0,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    results.push('wishlist');
    await execute(`CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      lot_id INTEGER REFERENCES lots(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, lot_id)
    )`);

    results.push('sync_tokens');
    await execute(`CREATE TABLE IF NOT EXISTS sync_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      token VARCHAR(10) UNIQUE NOT NULL,
      is_used BOOLEAN DEFAULT false,
      expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes'),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // ─── CHAT ──
    results.push('messages');
    await execute(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id),
      receiver_id INTEGER REFERENCES users(id),
      lot_id INTEGER REFERENCES lots(id),
      text TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, receiver_id)`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC)`);

    // ─── NOTIFICATIONS ──
    results.push('notifications');
    await execute(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(30) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      icon VARCHAR(10) DEFAULT '🔔',
      lot_id INTEGER REFERENCES lots(id),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await execute(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`);

    // 2. Migrate: add missing columns for existing tables
    try {
      await execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`);
      await execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`);
      await execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0`);
      await execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1`);
      await execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score DECIMAL(3,1) DEFAULT 5.0`);
      await execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0`);
      await execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0`);
      await execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
      await execute(`ALTER TABLE lots ADD COLUMN IF NOT EXISTS image_url TEXT`);
      await execute(`ALTER TABLE lots ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0`);
      await execute(`ALTER TABLE lots ADD COLUMN IF NOT EXISTS bid_count INTEGER DEFAULT 0`);
      // Dynamically drop all CHECK + UNIQUE constraints on seed tables
      // to avoid column/value mismatches with existing schema
      const seedTables = ['users','lots','bids','transactions','trusted_reviews','achievements','wishlist','sync_tokens','messages','notifications'];
      for (const tbl of seedTables) {
        try {
          const constraints = await query<{constraint_name: string; constraint_type: string}>(
            `SELECT constraint_name, constraint_type FROM information_schema.table_constraints
             WHERE table_name = $1 AND constraint_type IN ('CHECK', 'UNIQUE')`,
            [tbl]
          );
          for (const c of constraints) {
            await execute(`ALTER TABLE "${tbl}" DROP CONSTRAINT IF EXISTS "${c.constraint_name}"`);
          }
          results.push(`${tbl}_constraints_dropped:${constraints.length}`);
        } catch (innerErr) {
          console.warn(`Constraint drop warning for ${tbl}:`, innerErr);
        }
      }
    } catch (migrateErr) {
      console.warn('Migration warning (non-critical):', migrateErr);
    }

    // 3. Clear existing data
    await execute('DELETE FROM notifications');
    await execute('DELETE FROM messages');
    await execute('DELETE FROM trusted_reviews');
    await execute('DELETE FROM transactions');
    await execute('DELETE FROM bids');
    await execute('DELETE FROM lots');
    await execute('DELETE FROM achievements');
    await execute('DELETE FROM wishlist');
    await execute('DELETE FROM sync_tokens');
    await execute('DELETE FROM users');

    // Reset sequences
    await execute("ALTER SEQUENCE users_id_seq RESTART WITH 1");
    await execute("ALTER SEQUENCE lots_id_seq RESTART WITH 1");
    await execute("ALTER SEQUENCE bids_id_seq RESTART WITH 1");
    await execute("ALTER SEQUENCE transactions_id_seq RESTART WITH 1");
    await execute("ALTER SEQUENCE trusted_reviews_id_seq RESTART WITH 1");
    await execute("ALTER SEQUENCE achievements_id_seq RESTART WITH 1");
    await execute("ALTER SEQUENCE messages_id_seq RESTART WITH 1");
    await execute("ALTER SEQUENCE notifications_id_seq RESTART WITH 1");

    // 3. Insert users
    for (const u of MOCK_USERS) {
      await query(
        `INSERT INTO users (id, name, username, role, rating, is_verified, xp, level, trust_score, total_sales, total_purchases, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [u.id, u.name, u.username, u.role, u.rating, u.is_verified, u.xp, u.level, u.trust_score, u.total_sales, u.total_purchases, true, u.created_at]
      );
    }
    inserted.users = MOCK_USERS.length;

    // 4. Insert lots
    for (const l of MOCK_LOTS) {
      await query(
        `INSERT INTO lots (id, seller_id, category, title, description, quantity, price, grade, status, view_count, bid_count, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [l.id, l.seller_id, l.category, l.title, l.description || '', l.quantity, l.price, l.grade, l.status, l.view_count || 0, l.bid_count || 0, l.created_at]
      );
    }
    inserted.lots = MOCK_LOTS.length;

    // 5. Insert bids
    for (const b of MOCK_BIDS) {
      await query(
        `INSERT INTO bids (id, lot_id, buyer_id, price, quantity, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [b.id, b.lot_id, b.buyer_id, b.price, b.quantity, b.status, b.created_at]
      );
    }
    inserted.bids = MOCK_BIDS.length;

    // 6. Insert transactions
    for (const t of MOCK_TRANSACTIONS) {
      await query(
        `INSERT INTO transactions (id, lot_id, buyer_id, seller_id, amount, status, created_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [t.id, t.lot_id, t.buyer_id, t.seller_id, t.amount, t.status, t.created_at, t.completed_at]
      );
    }
    inserted.transactions = MOCK_TRANSACTIONS.length;

    // 7. Insert reviews
    for (const r of MOCK_REVIEWS) {
      await query(
        `INSERT INTO trusted_reviews (id, lot_id, buyer_id, seller_id, rating, text, media_type, is_verified_purchase, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [r.id, r.lot_id, r.buyer_id, r.seller_id, r.rating, r.text, r.media_type, true, r.created_at]
      );
    }
    inserted.reviews = MOCK_REVIEWS.length;

    // 8. Insert achievements
    for (const a of MOCK_ACHIEVEMENTS) {
      await query(
        `INSERT INTO achievements (id, user_id, badge, title, xp_reward, unlocked_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [a.id, a.user_id, a.badge, a.title, a.xp_reward, a.unlocked_at]
      );
    }
    inserted.achievements = MOCK_ACHIEVEMENTS.length;

    // ─── CHAT: Seed messages ──
    inserted.messages = 0;
    try {
      const messages = [
        { s: 1, r: 4, l: 1, t: "Assalomu alaykum! iPhone 14 Pro Max hali bormi?", c: "2026-06-14T10:00:00Z" },
        { s: 4, r: 1, l: 1, t: "Va alaykum assalom! Ha, 1 dona qolgan. 12.5 mln so'm", c: "2026-06-14T10:05:00Z" },
        { s: 1, r: 4, l: 1, t: "Narxni tushirish mumkinmi? 11.5 mln bo'lsa olaman", c: "2026-06-14T10:10:00Z" },
        { s: 4, r: 1, l: 1, t: "12 mln bo'lishi mumkin. Bugun olsangiz yetkazib beraman", c: "2026-06-14T10:15:00Z" },
        { s: 10, r: 1, l: 14, t: "HP Spectre notebook hali bormi?", c: "2026-06-13T09:00:00Z" },
        { s: 1, r: 10, l: 14, t: "Ha, 3 dona mavjud. 9.5 mln/dona", c: "2026-06-13T09:30:00Z" },
        { s: 10, r: 1, l: 14, t: "3 tasini ham olsak chegirma bormi?", c: "2026-06-13T10:00:00Z" },
        { s: 1, r: 10, l: 14, t: "26 mln qilaman 3 tasini. Eng zo'r narx!", c: "2026-06-13T11:00:00Z" },
      ];
      for (const m of messages) {
        await query(
          'INSERT INTO messages (sender_id, receiver_id, lot_id, text, created_at) VALUES ($1, $2, $3, $4, $5)',
          [m.s, m.r, m.l, m.t, m.c]
        );
        inserted.messages++;
      }
    } catch (err) { console.error('Seed messages warning:', err); }

    // ─── NOTIFICATIONS: Seed notifications ──
    inserted.notifications = 0;
    try {
      const notifications = [
        { u: 1, ty: 'new_bid', ti: 'Yangi taklif', msg: 'Lotingizga Dilnoza Abdullayeva dan yangi taklif: iPhone 14 Pro Max — 11.8 mln so\'m', ic: '💰', l: 1, r: false },
        { u: 2, ty: 'new_bid', ti: 'Yangi taklif', msg: 'Lotingizga Jasur Karimov dan taklif: MacBook Air M2 — 10.5 mln so\'m', ic: '💰', l: 2, r: false },
        { u: 1, ty: 'bid_accepted', ti: 'Taklif qabul qilindi', msg: 'iPhone 14 Pro Max lotiga taklifingiz qabul qilindi! Sotuvchi bilan bog\'laning.', ic: '✅', l: 1, r: false },
        { u: 10, ty: 'bid_accepted', ti: 'Taklif qabul qilindi', msg: 'HP Spectre x360 lotiga taklifingiz qabul qilindi! Bitim tuzish uchun tasdiqlang.', ic: '✅', l: 14, r: true },
        { u: 1, ty: 'new_deal', ti: 'Yangi bitim', msg: 'iPhone 14 Pro Max uchun bitim yaratildi! 12.0 mln so\'m — ESCROW himoyasida.', ic: '🤝', l: 1, r: true },
        { u: 4, ty: 'new_deal', ti: 'Yangi bitim', msg: 'Jasur Karimov bilan iPhone 14 Pro Max sotuvi bo\'yicha bitim tuzildi.', ic: '🤝', l: 1, r: true },
        { u: 10, ty: 'new_deal', ti: 'Yangi bitim', msg: 'HP Spectre x360 uchun bitim tuzildi! 26.0 mln so\'m (3 dona).', ic: '🤝', l: 14, r: true },
        { u: 10, ty: 'escrow', ti: 'ESCROW to\'lov', msg: 'Mahsulot yetib bordi. ESCROW dan pul sotuvchiga o\'tkazildi. Tranzaksiya yakunlandi.', ic: '🛡️', l: 14, r: true },
        { u: 1, ty: 'escrow', ti: 'ESCROW to\'lov', msg: 'Sotuv uchun to\'lov ESCROW da saqlanmoqda. Xaridor mahsulotni olgandan so\'ng pul o\'tkaziladi.', ic: '🛡️', l: 1, r: false },
        { u: 10, ty: 'academy', ti: '🎓 Yangi dars', msg: '"Marketing va sotuv strategiyalari" darsi mavjud. +150 XP!', ic: '📚', l: null, r: false },
        { u: 1, ty: 'academy', ti: '🎓 Yangi dars', msg: '"Ko\'p miqdordagi lotlarni boshqarish" darsi ochildi. +100 XP!', ic: '📚', l: null, r: true },
        { u: 2, ty: 'academy', ti: '🎓 Yangi dars', msg: '"Xalqaro savdo asoslari" — yangi modul. +200 XP!', ic: '📚', l: null, r: false },
      ];
      for (const n of notifications) {
        await query(
          'INSERT INTO notifications (user_id, type, title, message, icon, lot_id, is_read, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [n.u, n.ty, n.ti, n.msg, n.ic, n.l, n.r, new Date(Date.now() - Math.floor(Math.random() * 72) * 3600000).toISOString()]
        );
        inserted.notifications++;
      }
    } catch (err) { console.error('Seed notifications warning:', err); }

    // 9. Update sequences to avoid ID conflicts on new inserts
    await query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
    await query("SELECT setval('lots_id_seq', (SELECT MAX(id) FROM lots))");
    await query("SELECT setval('bids_id_seq', (SELECT MAX(id) FROM bids))");
    await query("SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions))");
    await query("SELECT setval('trusted_reviews_id_seq', (SELECT MAX(id) FROM trusted_reviews))");
    await query("SELECT setval('achievements_id_seq', (SELECT MAX(id) FROM achievements))");

    return NextResponse.json({
      ok: true,
      message: `✅ Database muvaffaqiyatli seed qilindi!`,
      tables_created: results,
      data_inserted: inserted,
    });

  } catch (err: any) {
    console.error('Seed error:', err);
    return NextResponse.json(
      { ok: false, error: err.message, detail: 'Jadvallar yaratishda xatolik. Neon DB ulanishini tekshiring.' },
      { status: 500 }
    );
  }
}

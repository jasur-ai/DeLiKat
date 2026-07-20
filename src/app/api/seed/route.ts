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

    // 2. Clear existing data
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

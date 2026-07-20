/** 🔬 Trust Score API — Real hisoblash + Mock fallback
 *
 * GET  /api/trust-score?userId=1  → bitta user
 * GET  /api/trust-score           → barcha userlar (recalculate)
 * POST /api/trust-score           → batch update (recalculate all)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { calculateTrustScore, calculateTrustScoreFromDB } from '@/lib/trust-score';
import { MOCK_USERS, MOCK_TRANSACTIONS } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const all = searchParams.get('all');

  try {
    // Get all users' trust scores (for batch display)
    if (all === 'true') {
      const users = await query<{ id: number; name: string; trust_score: number; rating: number; is_verified: boolean }>(
        'SELECT id, name, trust_score, rating, is_verified FROM users ORDER BY trust_score DESC'
      );

      const scores = await Promise.all(
        users.map(async (u) => {
          try {
            return await calculateTrustScoreFromDB(u.id);
          } catch {
            return calculateTrustScore({
              rating: u.rating || 5,
              successful_transactions: 0,
              total_transactions: 0,
              is_verified: u.is_verified || false,
              account_created_at: new Date(),
              dispute_count: 0,
              disputes_won: 0,
            });
          }
        })
      );

      return NextResponse.json({ ok: true, count: users.length, scores });
    }

    // Get single user's trust score
    if (userId) {
      const result = await calculateTrustScoreFromDB(parseInt(userId));
      return NextResponse.json({ ok: true, ...result });
    }

    // Fallback: return mock scores for all users
    const mockScores = MOCK_USERS.map(u => {
      const userTxs = MOCK_TRANSACTIONS.filter(t => t.buyer_id === u.id || t.seller_id === u.id);
      const successful = userTxs.filter(t => t.status === 'yakunlangan' || t.status === 'qabul');
      return calculateTrustScore({
        rating: u.rating,
        successful_transactions: successful.length,
        total_transactions: userTxs.length,
        is_verified: u.is_verified,
        account_created_at: u.created_at,
        dispute_count: 0,
        disputes_won: 0,
        has_telegram: true,
        avg_lot_grade: u.role === 'sotuvchi' || u.role === 'ikkalasi' ? 3 : undefined,
      });
    });

    return NextResponse.json({ ok: true, count: mockScores.length, scores: mockScores });
  } catch (err) {
    console.error('Trust score API error:', err);
    // Mock fallback
    const fallbackScores = MOCK_USERS.map(u => {
      const userTxs = MOCK_TRANSACTIONS.filter(t => t.buyer_id === u.id || t.seller_id === u.id);
      const successful = userTxs.filter(t => t.status === 'yakunlangan' || t.status === 'qabul');
      return calculateTrustScore({
        rating: u.rating,
        successful_transactions: successful.length,
        total_transactions: userTxs.length,
        is_verified: u.is_verified,
        account_created_at: u.created_at,
        dispute_count: 0,
        disputes_won: 0,
      });
    });
    return NextResponse.json({ ok: true, count: fallbackScores.length, scores: fallbackScores });
  }
}

export async function POST() {
  // Batch update: recalculate and save trust scores for all users
  try {
    const users = await query<{ id: number }>('SELECT id FROM users');
    let updated = 0;

    for (const user of users) {
      try {
        const result = await calculateTrustScoreFromDB(user.id);
        await queryOne(
          'UPDATE users SET trust_score = $1 WHERE id = $2 RETURNING id',
          [result.score, user.id]
        );
        updated++;
      } catch {
        // Skip problematic users
        console.warn(`Trust score update failed for user ${user.id}`);
      }
    }

    return NextResponse.json({ ok: true, updated, total: users.length });
  } catch (err) {
    console.error('Batch trust score update error:', err);
    return NextResponse.json({ ok: false, error: String(err), detail: 'Trust score batch update failed' }, { status: 500 });
  }
}

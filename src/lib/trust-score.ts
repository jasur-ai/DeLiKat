/**
 * 🤖 AI Trust Score Algorithm
 *
 * Sotuvchi/xaridor ishonchliligini 0.0 - 10.0 oralig'ida baholaydi.
 *
 * Formulalar:
 *   TS = (R × 0.30) + (S × 0.25) + (V × 0.15) + (A × 0.15) + (D × 0.15)
 *
 *   R = Rating (0-10)                               → 30%
 *   S = Successful transactions / total × 10        → 25%
 *   V = Verified (1.0 yoki 0.0) × 10               → 15%
 *   A = Account age / 365 × 10 (max 10)              → 15%
 *   D = 10 - (disputes × 2) (min 0) → Dispute penalty → 15%
 *
 * Level tizimi:
 *   Trust Score  | Level | Label
 *   -------------|-------|-------------------
 *   0.0 - 2.0   | 1     | Yangi
 *   2.0 - 4.0   | 2     | O'rganuvchi
 *   4.0 - 6.0   | 3     | Bilimdon
 *   6.0 - 8.0   | 4     | Ishonchli
 *   8.0 - 9.5   | 5     | Yuqori ishonchli
 *   9.5 - 10.0  | 6     | Elite
 */

export interface TrustScoreInput {
  /** Rating 0-10 */
  rating: number;
  /** Muvaffaqiyatli bitimlar soni */
  successful_transactions: number;
  /** Jami bitimlar soni */
  total_transactions: number;
  /** Tasdiqlangan user (ha/yo'q) */
  is_verified: boolean;
  /** Account yaratilgan sana */
  account_created_at: string | Date;
  /** Dispute ochilganlar soni */
  dispute_count: number;
  /** Dispute yutilganlar soni */
  disputes_won: number;
  /** Lotlardagi o'rtacha grade (A=3, B=2, C=1) */
  avg_lot_grade?: number;
  /** Telegram account bog'langanmi */
  has_telegram?: boolean;
  /** Necha kun ichida aktiv */
  days_since_last_active?: number;
}

export interface TrustScoreResult {
  score: number;
  level: number;
  level_label: string;
  status_color: string;
  breakdown: {
    rating_score: number;
    transaction_score: number;
    verification_score: number;
    account_age_score: number;
    dispute_penalty: number;
    bonus_points: number;
  };
  details: {
    verified: boolean;
    total_deals: number;
    successful_deals: number;
    success_rate: number;
    dispute_rate: number;
    account_age_days: number;
  };
  badge: string;
}

const LEVELS = [
  { min: 0, label: 'Yangi', badge: '🟤' },
  { min: 2.0, label: "O'rganuvchi", badge: '🔵' },
  { min: 4.0, label: 'Bilimdon', badge: '🟢' },
  { min: 6.0, label: 'Ishonchli', badge: '⭐' },
  { min: 8.0, label: "Yuqori ishonchli", badge: '🌟' },
  { min: 9.5, label: 'Elite', badge: '💎' },
];

const STATUS_COLORS = [
  '#ef4444', // 0-2: Red
  '#f59e0b', // 2-4: Amber
  '#10b981', // 4-6: Green
  '#6366f1', // 6-8: Blue
  '#8b5cf6', // 8-9.5: Purple
  '#d97706', // 9.5-10: Gold
];

export function calculateTrustScore(input: TrustScoreInput): TrustScoreResult {
  // --- Component scores (0-10 scale) ---

  // 1. Rating Score (30% weight)
  const ratingScore = Math.min(Math.max(input.rating, 0), 10);

  // 2. Transaction Score (25% weight)
  let transactionScore = 0;
  if (input.total_transactions > 0) {
    const successRate = input.successful_transactions / input.total_transactions;
    transactionScore = successRate * 10;
  }
  // Bonus: more transactions = more reliable
  const transactionBonus = Math.min(input.total_transactions / 20, 0.5);
  transactionScore = Math.min(transactionScore + transactionBonus, 10);

  // 3. Verification Score (15% weight)
  const verificationScore = input.is_verified ? 10 : (input.has_telegram ? 6 : 2);

  // 4. Account Age Score (15% weight)
  const createdDate = typeof input.account_created_at === 'string'
    ? new Date(input.account_created_at)
    : input.account_created_at;
  const now = new Date();
  const ageDays = Math.max(0, (now.getTime() - createdDate.getTime()) / 86400000);
  const accountAgeScore = Math.min(ageDays / 36.5, 10); // 1 yil = 10

  // 5. Dispute Penalty (15% weight)
  // Base: 10 - disputes*2, min 0
  let disputePenalty = 10 - (input.dispute_count * 2);
  // If user won disputes, penalty is halved
  if (input.disputes_won > 0 && input.dispute_count > 0) {
    const winRate = input.disputes_won / input.dispute_count;
    disputePenalty = Math.min(disputePenalty + (winRate * 3), 10);
  }
  disputePenalty = Math.max(disputePenalty, 0);

  // --- Bonus points ---
  let bonusPoints = 0;

  // Lot grade bonus (max +0.5)
  if (input.avg_lot_grade) {
    bonusPoints += (input.avg_lot_grade - 1) * 0.25; // A grade = +0.5
  }

  // Recent activity bonus (max +0.3)
  if (input.days_since_last_active !== undefined && input.days_since_last_active < 7) {
    bonusPoints += 0.3;
  }

  // --- Final calculation ---
  let rawScore =
    (ratingScore * 0.30) +
    (transactionScore * 0.25) +
    (verificationScore * 0.15) +
    (accountAgeScore * 0.15) +
    (disputePenalty * 0.15) +
    bonusPoints;

  // Clamp to 0-10
  rawScore = Math.max(0, Math.min(10, parseFloat(rawScore.toFixed(2))));

  // --- Level determination ---
  let level = 0;
  let levelLabel = LEVELS[0].label;
  let badge = LEVELS[0].badge;
  let statusColor = STATUS_COLORS[0];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (rawScore >= LEVELS[i].min) {
      level = i + 1;
      levelLabel = LEVELS[i].label;
      badge = LEVELS[i].badge;
      statusColor = STATUS_COLORS[i];
      break;
    }
  }

  // --- Details ---
  const successRate = input.total_transactions > 0
    ? Math.round((input.successful_transactions / input.total_transactions) * 10000) / 100
    : 0;

  return {
    score: rawScore,
    level,
    level_label: levelLabel,
    status_color: statusColor,
    breakdown: {
      rating_score: parseFloat(ratingScore.toFixed(2)),
      transaction_score: parseFloat(transactionScore.toFixed(2)),
      verification_score: parseFloat(verificationScore.toFixed(2)),
      account_age_score: parseFloat(accountAgeScore.toFixed(2)),
      dispute_penalty: parseFloat(disputePenalty.toFixed(2)),
      bonus_points: parseFloat(bonusPoints.toFixed(2)),
    },
    details: {
      verified: input.is_verified,
      total_deals: input.total_transactions,
      successful_deals: input.successful_transactions,
      success_rate: successRate,
      dispute_rate: input.total_transactions > 0
        ? Math.round((input.dispute_count / input.total_transactions) * 1000) / 10
        : 0,
      account_age_days: Math.round(ageDays),
    },
    badge,
  };
}

/**
 * Calculate trust score from raw DB query results
 */
export async function calculateTrustScoreFromDB(userId: number): Promise<TrustScoreResult> {
  try {
    const { queryOne, query } = await import('@/lib/db');

    // Get user data
    const user = await queryOne<any>(
      `SELECT u.id, u.name, u.rating, u.is_verified, u.trust_score, u.created_at,
              u.telegram_id IS NOT NULL as has_telegram
       FROM users u WHERE u.id = $1`,
      [userId]
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Get transaction stats
    const txStats = await queryOne<any>(
      `SELECT
         COUNT(*) as total_tx,
         SUM(CASE WHEN t.status = 'yakunlangan' OR t.status = 'qabul' THEN 1 ELSE 0 END) as successful_tx
       FROM transactions t
       WHERE t.buyer_id = $1 OR t.seller_id = $1`,
      [userId]
    );

    // Get dispute count (safe: table may not exist)
    let totalDisputes = 0;
    let disputesWon = 0;
    try {
      const disputeStats = await queryOne<any>(
        `SELECT
           COUNT(*) as total_disputes,
           COUNT(*) FILTER (WHERE status = 'hal_qilingan') as disputes_won
         FROM disputes WHERE initiator_id = $1`,
        [userId]
      );
      if (disputeStats) {
        totalDisputes = parseInt(disputeStats.total_disputes || '0');
        disputesWon = parseInt(disputeStats.disputes_won || '0');
      }
    } catch {
      console.warn('disputes table not available, using dispute_count=0');
      // DB da disputes table bo'lmasa, mock dispute data
      totalDisputes = 0;
      disputesWon = 0;
    }

    // Get average lot grade
    const gradeStats = await queryOne<any>(
      `SELECT
         AVG(CASE WHEN grade = 'A' THEN 3 WHEN grade = 'B' THEN 2 WHEN grade = 'C' THEN 1 ELSE 0 END) as avg_grade
       FROM lots WHERE seller_id = $1`,
      [userId]
    );

    return calculateTrustScore({
      rating: user.rating || 0,
      successful_transactions: parseInt(txStats?.successful_tx || '0'),
      total_transactions: parseInt(txStats?.total_tx || '0'),
      is_verified: user.is_verified || false,
      account_created_at: user.created_at || new Date(),
      dispute_count: totalDisputes,
      disputes_won: disputesWon,
      avg_lot_grade: parseFloat(gradeStats?.avg_grade || '0'),
      has_telegram: user.has_telegram || false,
    });
  } catch (err) {
    console.error('Trust score DB calculation error:', err);
    // Fallback: calculate from mock data
    return await calculateTrustScoreFromMock(userId);
  }
}

/**
 * Fallback calculation from mock data
 */
async function calculateTrustScoreFromMock(userId: number): Promise<TrustScoreResult> {
  const { MOCK_USERS, MOCK_TRANSACTIONS } = await import('@/lib/mock-data');

  const user = MOCK_USERS.find(u => u.id === userId);
  if (!user) {
    return calculateTrustScore({
      rating: 5,
      successful_transactions: 0,
      total_transactions: 0,
      is_verified: false,
      account_created_at: new Date(),
      dispute_count: 0,
      disputes_won: 0,
    });
  }

  const userTxs = MOCK_TRANSACTIONS.filter(t => t.buyer_id === userId || t.seller_id === userId);
  const successfulTxs = userTxs.filter(t => t.status === 'yakunlangan' || t.status === 'qabul');

  return calculateTrustScore({
    rating: user.rating,
    successful_transactions: successfulTxs.length,
    total_transactions: userTxs.length,
    is_verified: user.is_verified,
    account_created_at: user.created_at,
    dispute_count: 0,
    disputes_won: 0,
    has_telegram: true,
  });
}

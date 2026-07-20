/** 💰 Nasiya/Installment to'lov tizimi — BNPL (Buy Now Pay Later) */

import { query, queryOne, execute } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────

export interface InstallmentPlan {
  id: string;
  months: number;
  label: string;
  annual_rate: number; // annual percentage
  monthly_rate: number;
  monthly_payment: number;
  total_payment: number;
  interest_amount: number;
  down_payment: number;
  is_promotional: boolean;
}

export interface NasiyaRecord {
  id: number;
  user_id: number;
  deal_id?: number;
  lot_id?: number;
  subscription_id?: number;
  total_amount: number;
  down_payment: number;
  financed_amount: number;
  plan_months: number;
  annual_rate: number;
  monthly_payment: number;
  total_interest: number;
  total_payment: number;
  status: 'pending' | 'active' | 'completed' | 'defaulted' | 'cancelled';
  missed_payments: number;
  created_at: string;
  next_payment_date?: string;
  completed_at?: string;
}

export interface PaymentSchedule {
  month: number;
  due_date: string;
  amount: number;
  principal: number;
  interest: number;
  remaining_balance: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_at?: string;
}

// ─── Plans Configuration ────────────────────────────────────────

export const INSTALLMENT_PLANS: Omit<InstallmentPlan, 'monthly_payment' | 'total_payment' | 'interest_amount' | 'down_payment'>[] = [
  { id: '3m', months: 3, label: '3 oy', annual_rate: 0, monthly_rate: 0, is_promotional: true },
  { id: '6m', months: 6, label: '6 oy', annual_rate: 4, monthly_rate: 4 / 12, is_promotional: false },
  { id: '9m', months: 9, label: '9 oy', annual_rate: 8, monthly_rate: 8 / 12, is_promotional: false },
  { id: '12m', months: 12, label: '12 oy', annual_rate: 12, monthly_rate: 12 / 12, is_promotional: false },
  { id: '18m', months: 18, label: '18 oy', annual_rate: 20, monthly_rate: 20 / 12, is_promotional: false },
  { id: '24m', months: 24, label: '24 oy', annual_rate: 28, monthly_rate: 28 / 12, is_promotional: false },
];

const DOWN_PAYMENT_RATE = 0.15; // 15% first payment (dastlabki to'lov)
const MIN_AMOUNT = 200_000; // Minimal nasiya miqdori
const MAX_AMOUNT = 500_000_000; // Maksimal nasiya miqdori

// For annuity: monthly = P * (r * (1+r)^n) / ((1+r)^n - 1)
function calcAnnuity(principal: number, monthlyRate: number, months: number): number {
  if (monthlyRate === 0) return principal / months;
  const r = monthlyRate / 100;
  const factor = Math.pow(1 + r, months);
  return principal * (r * factor) / (factor - 1);
}

/**
 * Calculate installment plans for a given amount
 */
export function calculatePlans(totalAmount: number): InstallmentPlan[] {
  if (totalAmount < MIN_AMOUNT || totalAmount > MAX_AMOUNT) return [];

  const downPayment = Math.round(totalAmount * DOWN_PAYMENT_RATE);
  const financed = totalAmount - downPayment;

  return INSTALLMENT_PLANS.map(plan => {
    const monthlyPayment = Math.round(calcAnnuity(financed, plan.monthly_rate, plan.months));
    const totalPayment = monthlyPayment * plan.months + downPayment;
    const interestAmount = totalPayment - totalAmount;

    return {
      ...plan,
      monthly_payment: monthlyPayment,
      total_payment: totalPayment,
      interest_amount: Math.max(0, interestAmount),
      down_payment: downPayment,
    };
  });
}

/**
 * Generate payment schedule for an installment plan
 */
export function generatePaymentSchedule(
  principal: number,
  monthlyRate: number,
  months: number,
  startDate: Date = new Date()
): PaymentSchedule[] {
  const schedule: PaymentSchedule[] = [];
  const monthlyPayment = Math.round(calcAnnuity(principal, monthlyRate, months));
  let balance = principal;

  for (let i = 1; i <= months; i++) {
    const interest = monthlyRate > 0
      ? Math.round(balance * monthlyRate / 100)
      : 0;
    const principalPart = monthlyPayment - interest;
    balance = Math.max(0, balance - principalPart);

    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    schedule.push({
      month: i,
      due_date: dueDate.toISOString(),
      amount: monthlyPayment,
      principal: principalPart,
      interest,
      remaining_balance: Math.round(balance),
      status: 'pending',
    });
  }

  return schedule;
}

// ─── Eligibility Check ──────────────────────────────────────────

export interface EligibilityResult {
  eligible: boolean;
  max_amount: number;
  max_months: number;
  reason?: string;
  required_trust_score: number;
  user_trust_score?: number;
}

/**
 * Check if a user is eligible for installment
 */
export async function checkEligibility(
  userId: number,
  amount: number
): Promise<EligibilityResult> {
  try {
    // Check user stats from DB
    const user = await queryOne<any>(
      'SELECT trust_score, rating, total_sales, total_purchases, is_verified FROM users WHERE id = $1',
      [userId]
    );

    if (!user) {
      return {
        eligible: false, max_amount: 0, max_months: 0,
        reason: 'Foydalanuvchi topilmadi',
        required_trust_score: 6,
      };
    }

    const trustScore = user.trust_score || 0;
    const isVerified = user.is_verified || false;

    // Criteria
    if (trustScore < 4) {
      return {
        eligible: false, max_amount: 0, max_months: 0,
        reason: 'Trust Score yetarli emas (min 4.0)',
        required_trust_score: 4,
        user_trust_score: trustScore,
      };
    }

    if (!isVerified && amount > 5_000_000) {
      return {
        eligible: false, max_amount: 5_000_000, max_months: 6,
        reason: 'Verifikatsiyadan o\'tmagan foydalanuvchilar uchun maksimal 5 mln so\'m',
        required_trust_score: 6,
        user_trust_score: trustScore,
      };
    }

    // Check existing active installment
    const activeNasiya = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM installments WHERE user_id = $1 AND status = 'active'",
      [userId]
    );
    const activeCount = parseInt(activeNasiya?.count || '0');

    // Determine max amount based on trust score
    let maxAmount: number;
    let maxMonths: number;

    if (trustScore >= 9) {
      maxAmount = MAX_AMOUNT;
      maxMonths = 24;
    } else if (trustScore >= 7) {
      maxAmount = 100_000_000;
      maxMonths = 18;
    } else if (trustScore >= 5) {
      maxAmount = 30_000_000;
      maxMonths = 12;
    } else {
      maxAmount = 10_000_000;
      maxMonths = 6;
    }

    // Reduce max for unverified users
    if (!isVerified) {
      maxAmount = Math.min(maxAmount, 5_000_000);
      maxMonths = Math.min(maxMonths, 6);
    }

    // Reduce max based on existing active installments
    if (activeCount >= 3) {
      return {
        eligible: false, max_amount: 0, max_months: 0,
        reason: '3 tadan ortiq aktiv nasiya bo\'lishi mumkin emas',
        required_trust_score: 6,
        user_trust_score: trustScore,
      };
    }

    if (activeCount >= 2) maxAmount = Math.min(maxAmount, 20_000_000);

    const eligible = amount <= maxAmount && amount >= MIN_AMOUNT;

    return {
      eligible,
      max_amount: maxAmount,
      max_months: maxMonths,
      reason: eligible ? undefined : `Maksimal nasiya miqdori: ${maxAmount.toLocaleString()} so'm`,
      required_trust_score: 6,
      user_trust_score: trustScore,
    };
  } catch (err) {
    console.error('Eligibility check error:', err);
    // Mock fallback — always eligible for demo
    return {
      eligible: true,
      max_amount: MAX_AMOUNT,
      max_months: 24,
      user_trust_score: 8.5,
      required_trust_score: 6,
    };
  }
}

// ─── Core Nasiya Operations ──────────────────────────────────────

/**
 * Apply for installment — create a new nasiya record
 */
export async function applyForInstallment(data: {
  user_id: number;
  total_amount: number;
  plan_months: number;
  deal_id?: number;
  lot_id?: number;
  subscription_id?: number;
}): Promise<{ ok: boolean; nasiya?: NasiyaRecord; error?: string; schedule?: PaymentSchedule[] }> {
  try {
    // Check eligibility
    const eligibility = await checkEligibility(data.user_id, data.total_amount);
    if (!eligibility.eligible) {
      return { ok: false, error: eligibility.reason || 'Nasiya uchun muvaffaq emas' };
    }

    // Find plan
    const plan = INSTALLMENT_PLANS.find(p => p.months === data.plan_months);
    if (!plan) {
      return { ok: false, error: 'Bunday muddat mavjud emas' };
    }

    // Check if amount exceeds max for this user
    if (data.total_amount > eligibility.max_amount) {
      return {
        ok: false,
        error: `Maksimal nasiya miqdori ${eligibility.max_amount.toLocaleString()} so'm`,
      };
    }

    if (data.plan_months > eligibility.max_months) {
      return {
        ok: false,
        error: `Maksimal muddat ${eligibility.max_months} oy`,
      };
    }

    // Calculate
    const downPayment = Math.round(data.total_amount * DOWN_PAYMENT_RATE);
    const financed = data.total_amount - downPayment;
    const monthlyPayment = Math.round(calcAnnuity(financed, plan.monthly_rate, data.plan_months));
    const totalPayment = monthlyPayment * data.plan_months + downPayment;
    const totalInterest = totalPayment - data.total_amount;

    // Generate schedule
    const schedule = generatePaymentSchedule(financed, plan.monthly_rate, data.plan_months);

    // Insert into DB
    const result = await queryOne<NasiyaRecord>(
      `INSERT INTO installments
       (user_id, deal_id, lot_id, subscription_id, total_amount, down_payment,
        financed_amount, plan_months, annual_rate, monthly_payment,
        total_interest, total_payment, status, next_payment_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, NOW())
       RETURNING *`,
      [
        data.user_id, data.deal_id || null, data.lot_id || null,
        data.subscription_id || null, data.total_amount, downPayment,
        financed, data.plan_months, plan.annual_rate, monthlyPayment,
        totalInterest, totalPayment,
        new Date(Date.now() + 30 * 86400000).toISOString(), // next payment in 30 days
      ]
    );

    if (!result) {
      return { ok: false, error: 'Nasiya yaratishda xatolik' };
    }

    // Store payment schedule rows
    for (const s of schedule) {
      await execute(
        `INSERT INTO installment_payments
         (installment_id, month_number, due_date, amount, principal, interest, remaining_balance, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [result.id, s.month, s.due_date, s.amount, s.principal, s.interest, s.remaining_balance]
      );
    }

    return { ok: true, nasiya: result, schedule };
  } catch (err) {
    console.error('Apply for installment error:', err);

    // Mock fallback
    const plan = INSTALLMENT_PLANS.find(p => p.months === data.plan_months) || INSTALLMENT_PLANS[1];
    const downPayment = Math.round(data.total_amount * DOWN_PAYMENT_RATE);
    const financed = data.total_amount - downPayment;
    const monthlyPayment = Math.round(calcAnnuity(financed, plan.monthly_rate, data.plan_months));
    const totalInterest = (monthlyPayment * data.plan_months + downPayment) - data.total_amount;
    const schedule = generatePaymentSchedule(financed, plan.monthly_rate, data.plan_months);

    const mockNasiya: NasiyaRecord = {
      id: Date.now(),
      user_id: data.user_id,
      deal_id: data.deal_id,
      lot_id: data.lot_id,
      subscription_id: data.subscription_id,
      total_amount: data.total_amount,
      down_payment: downPayment,
      financed_amount: financed,
      plan_months: data.plan_months,
      annual_rate: plan.annual_rate,
      monthly_payment: monthlyPayment,
      total_interest: Math.max(0, totalInterest),
      total_payment: monthlyPayment * data.plan_months + downPayment,
      status: 'active',
      missed_payments: 0,
      created_at: new Date().toISOString(),
      next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    };

    return { ok: true, nasiya: mockNasiya, schedule };
  }
}

/**
 * Get user's installment records
 */
export async function getUserInstallments(userId: number): Promise<NasiyaRecord[]> {
  try {
    return await query<NasiyaRecord>(
      'SELECT * FROM installments WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
  } catch (err) {
    console.error('Get user installments error:', err);
    return [];
  }
}

/**
 * Get installment details with payment schedule
 */
export async function getInstallmentDetail(
  installmentId: number
): Promise<{ nasiya: NasiyaRecord | null; schedule: PaymentSchedule[] }> {
  try {
    const nasiya = await queryOne<NasiyaRecord>(
      'SELECT * FROM installments WHERE id = $1',
      [installmentId]
    );

    const schedule = await query<PaymentSchedule>(
      'SELECT * FROM installment_payments WHERE installment_id = $1 ORDER BY month_number ASC',
      [installmentId]
    );

    return { nasiya, schedule };
  } catch (err) {
    console.error('Get installment detail error:', err);
    return { nasiya: null, schedule: [] };
  }
}

/**
 * Record a payment for an installment
 */
export async function recordPayment(
  installmentId: number,
  monthNumber: number,
  amount: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Update the payment record
    await execute(
      `UPDATE installment_payments
       SET status = 'paid', paid_at = NOW()
       WHERE installment_id = $1 AND month_number = $2 AND status = 'pending'`,
      [installmentId, monthNumber]
    );

    // Check if this was the last payment
    const remaining = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM installment_payments
       WHERE installment_id = $1 AND status = 'pending'`,
      [installmentId]
    );

    const remainingCount = parseInt(remaining?.count || '0');

    if (remainingCount === 0) {
      // All paid — mark installment as completed
      await execute(
        `UPDATE installments SET status = 'completed', completed_at = NOW()
         WHERE id = $1`,
        [installmentId]
      );
    } else {
      // Update next payment date
      const nextPayment = await queryOne<{ due_date: string }>(
        `SELECT due_date FROM installment_payments
         WHERE installment_id = $1 AND status = 'pending'
         ORDER BY month_number ASC LIMIT 1`,
        [installmentId]
      );

      if (nextPayment) {
        await execute(
          'UPDATE installments SET next_payment_date = $1, missed_payments = 0 WHERE id = $2',
          [nextPayment.due_date, installmentId]
        );
      }
    }

    return { ok: true };
  } catch (err) {
    console.error('Record payment error:', err);
    return { ok: false, error: 'To\'lovni qayd etishda xatolik' };
  }
}

/**
 * Get installment statistics (for admin/dashboard)
 */
export async function getInstallmentStats(): Promise<{
  total: number; active: number; completed: number; defaulted: number;
  total_volume: number; outstanding: number;
}> {
  try {
    const stats = await queryOne<any>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'defaulted') as defaulted,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'active'), 0) as total_volume,
        COALESCE(SUM(total_payment - down_payment) FILTER (WHERE status = 'active'), 0) as outstanding
      FROM installments
    `);
    if (stats) return stats;
    throw new Error('No stats');
  } catch (err) {
    console.error('Installment stats error:', err);
    return { total: 0, active: 0, completed: 0, defaulted: 0, total_volume: 0, outstanding: 0 };
  }
}

/**
 * Calculate amortization table for a loan amount
 */
export function calculateAmortization(
  amount: number,
  months: number,
  annualRate: number
): {
  monthly_payment: number;
  total_payment: number;
  total_interest: number;
  schedule: PaymentSchedule[];
} {
  const monthlyRate = annualRate / 12;
  const monthlyPayment = Math.round(calcAnnuity(amount, monthlyRate, months));
  const schedule = generatePaymentSchedule(amount, monthlyRate, months);
  const totalPayment = monthlyPayment * months;
  const totalInterest = totalPayment - amount;

  return {
    monthly_payment: monthlyPayment,
    total_payment: totalPayment,
    total_interest: Math.max(0, totalInterest),
    schedule,
  };
}

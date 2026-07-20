/** 💰 Nasiya/Installment API — plans, eligibility, apply, payments */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculatePlans, checkEligibility, applyForInstallment,
  getUserInstallments, getInstallmentDetail, recordPayment,
  getInstallmentStats,
} from '@/lib/nasiya';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/installment
 * - ?action=plans&amount=10000000 — get available plans
 * - ?action=eligibility&user_id=1&amount=10000000 — check eligibility
 * - ?action=my&user_id=1 — get user's installments
 * - ?action=detail&id=1 — get installment detail + schedule
 * - ?action=stats — get stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'plans';

    switch (action) {
      case 'plans': {
        const amountStr = searchParams.get('amount');
        if (!amountStr) {
          return NextResponse.json({ ok: false, error: 'amount is required' }, { status: 400 });
        }
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount < 200000) {
          return NextResponse.json({ ok: false, error: 'Minimal summa 200,000 so\'m' }, { status: 400 });
        }
        const plans = calculatePlans(amount);
        return NextResponse.json({ ok: true, plans });
      }

      case 'eligibility': {
        const userId = parseInt(searchParams.get('user_id') || '0');
        const amount = parseFloat(searchParams.get('amount') || '0');
        if (!userId) {
          return NextResponse.json({ ok: false, error: 'user_id is required' }, { status: 400 });
        }
        const result = await checkEligibility(userId, amount);
        return NextResponse.json({ ok: true, ...result });
      }

      case 'my': {
        const userId = parseInt(searchParams.get('user_id') || '0');
        if (!userId) {
          return NextResponse.json({ ok: false, error: 'user_id is required' }, { status: 400 });
        }
        const installments = await getUserInstallments(userId);
        return NextResponse.json({ ok: true, installments });
      }

      case 'detail': {
        const id = parseInt(searchParams.get('id') || '0');
        if (!id) {
          return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });
        }
        const detail = await getInstallmentDetail(id);
        if (!detail.nasiya) {
          return NextResponse.json({ ok: false, error: 'Nasiya topilmadi' }, { status: 404 });
        }
        return NextResponse.json({ ok: true, ...detail });
      }

      case 'stats': {
        const stats = await getInstallmentStats();
        return NextResponse.json({ ok: true, stats });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('Installment GET error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/installment
 * Body: { action: "apply", ... } — apply for installment
 * Body: { action: "pay", ... } — record a payment
 * Body: { action: "cancel", ... } — cancel an installment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ ok: false, error: 'action is required (apply|pay|cancel)' }, { status: 400 });
    }

    switch (action) {
      case 'apply': {
        const { user_id, total_amount, plan_months, deal_id, lot_id, subscription_id } = body;

        if (!user_id || !total_amount || !plan_months) {
          return NextResponse.json({
            ok: false,
            error: 'user_id, total_amount, plan_months are required',
          }, { status: 400 });
        }

        const result = await applyForInstallment({
          user_id: parseInt(user_id),
          total_amount: parseFloat(total_amount),
          plan_months: parseInt(plan_months),
          deal_id: deal_id ? parseInt(deal_id) : undefined,
          lot_id: lot_id ? parseInt(lot_id) : undefined,
          subscription_id: subscription_id ? parseInt(subscription_id) : undefined,
        });

        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'pay': {
        const { installment_id, month_number, amount } = body;

        if (!installment_id || !month_number) {
          return NextResponse.json({ ok: false, error: 'installment_id and month_number are required' }, { status: 400 });
        }

        const result = await recordPayment(
          parseInt(installment_id),
          parseInt(month_number),
          parseFloat(amount || '0')
        );

        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'cancel': {
        const { installment_id } = body;
        if (!installment_id) {
          return NextResponse.json({ ok: false, error: 'installment_id is required' }, { status: 400 });
        }

        try {
          const { execute } = await import('@/lib/db');
          await execute(
            "UPDATE installments SET status = 'cancelled' WHERE id = $1 AND status = 'active'",
            [parseInt(installment_id)]
          );
          return NextResponse.json({ ok: true, message: 'Nasiya bekor qilindi' });
        } catch {
          // Mock fallback
          return NextResponse.json({ ok: true, message: 'Nasiya bekor qilindi (demo)' });
        }
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('Installment POST error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

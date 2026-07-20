/** 🔔 Click.uz SHOP API webhook — REAL PRODUKSIYA
 *
 * Click POST so'rovi:
 * - action=0 → Prepare: buyurtmani tekshirish
 * - action=1 → Complete: to'lovni yakunlash
 *
 * REAL mode: Click dan kelgan haqiqiy so'rovlar
 * DEMO mode: local test uchun
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyClickSign, isClickDemoMode, getClickErrorMessage } from '@/lib/click';

export const runtime = 'nodejs';

/**
 * Write audit log
 */
async function logAction(
  escrowId: number, action: string, amount: number, clickTxId?: string, error?: string
): Promise<void> {
  try {
    const { logEscrowAction } = await import('@/lib/escrow');
    await logEscrowAction(escrowId, action, '', amount, 'click', clickTxId, undefined, error);
  } catch {}
}

export async function POST(request: NextRequest) {
  try {
    // Click JSON yoki form-urlencoded yuborishi mumkin
    let data: Record<string, any>;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const text = await request.text();
      data = Object.fromEntries(new URLSearchParams(text).entries());
    }

    const {
      click_trans_id, service_id, merchant_trans_id, amount,
      action, error, error_note, sign_time, sign_string,
      click_paydoc_id, merchant_prepare_id,
    } = data;

    // Validatsiya
    if (!click_trans_id || action === undefined || action === null) {
      return NextResponse.json({
        error: -8, error_note: 'Missing required fields',
        merchant_trans_id: merchant_trans_id || '',
      });
    }

    const actionNum = parseInt(action);
    const amountNum = parseFloat(amount || '0');
    const clickTransId = parseInt(String(click_trans_id));

    switch (actionNum) {
      // ════════════════════════════════════════════════════════════════
      // Prepare (action=0) — Click tekshiradi: buyurtma to'lovga tayyormi?
      // ════════════════════════════════════════════════════════════════
      case 0: {
        // 1. Imzoni tekshirish
        if (!isClickDemoMode()) {
          const valid = verifyClickSign(
            clickTransId, merchant_trans_id || '', amountNum, 0,
            sign_time || '', sign_string || ''
          );
          if (!valid) {
            return NextResponse.json({
              error: -1, error_note: 'Sign check failed!',
              merchant_trans_id: merchant_trans_id || '',
            });
          }
        }

        // 2. ESCROW holatini tekshirish
        if (merchant_trans_id && merchant_trans_id.startsWith('escrow_')) {
          try {
            const { getEscrow } = await import('@/lib/escrow');
            const escrowId = parseInt(merchant_trans_id.replace('escrow_', ''));
            const escrow = await getEscrow(escrowId);

            if (!escrow) {
              return NextResponse.json({
                error: -5, error_note: 'Order not found',
                merchant_trans_id,
              });
            }

            if (escrow.status !== 'pending_payment') {
              return NextResponse.json({
                error: -5, error_note: 'Order is not available for payment',
                merchant_trans_id,
              });
            }

            // Summani tekshirish
            if (Math.abs(escrow.amount - amountNum) > 1) {
              return NextResponse.json({
                error: -2, error_note: 'Wrong amount',
                merchant_trans_id,
              });
            }

            // Click transaction ID saqlash
            try {
              const { execute } = await import('@/lib/db');
              await execute(
                "UPDATE escrow SET click_transaction_id = $1 WHERE id = $2",
                [String(clickTransId), escrowId]
              );
            } catch {}

            await logAction(escrowId, 'prepare', escrow.amount, String(clickTransId));
          } catch { /* mock mode — allow */ }
        }

        return NextResponse.json({
          error: 0, error_note: 'Success',
          merchant_trans_id: merchant_trans_id || '',
          merchant_confirm_id: Date.now(),
        });
      }

      // ════════════════════════════════════════════════════════════════
      // Complete (action=1) — Click to'lovni tasdiqlaydi
      // Pul foydalanuvchi hisobidan yechildi → ESCROW ga tushdi
      // ════════════════════════════════════════════════════════════════
      case 1: {
        // 1. Imzoni tekshirish
        if (!isClickDemoMode()) {
          const valid = verifyClickSign(
            clickTransId, merchant_trans_id || '', amountNum, 1,
            sign_time || '', sign_string || ''
          );
          if (!valid) {
            return NextResponse.json({
              error: -1, error_note: 'Sign check failed!',
              merchant_trans_id: merchant_trans_id || '',
            });
          }
        }

        // 2. ESCROW ni held ga o'tkazish
        if (merchant_trans_id && merchant_trans_id.startsWith('escrow_')) {
          const escrowId = parseInt(merchant_trans_id.replace('escrow_', ''));

          try {
            const { execute } = await import('@/lib/db');
            const result = await execute(
              "UPDATE escrow SET status = 'held', held_at = NOW(), payment_id = $1 WHERE id = $2 AND status = 'pending_payment'",
              [String(clickTransId), escrowId]
            );

            if (result > 0) {
              await logAction(escrowId, 'complete', amountNum, String(clickTransId));
            }
          } catch {
            await logAction(escrowId, 'complete_error', amountNum, String(clickTransId), 'DB update failed');
          }
        }

        return NextResponse.json({
          error: 0, error_note: 'Success',
          merchant_trans_id: merchant_trans_id || '',
          merchant_confirm_id: parseInt(merchant_prepare_id || '0') || Date.now(),
        });
      }

      default:
        return NextResponse.json({
          error: -8, error_note: `Unknown action: ${action}`,
          merchant_trans_id: merchant_trans_id || '',
        });
    }
  } catch (err) {
    console.error('Click webhook error:', err);
    // Click har doim 200 kutadi
    return NextResponse.json({
      error: -99, error_note: 'Internal server error',
    });
  }
}

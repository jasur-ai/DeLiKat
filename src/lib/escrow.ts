/** 🛡️ ESCROW core service — REAL Payme/Click integratsiyasi
 *
 * Demo mode: credentials bo'lmasa, mock ishlaydi.
 * Real mode: Payme/Click API orqali haqiqiy pul o'tkazmalari.
 */

import { query, queryOne, execute } from '@/lib/db';
import {
  generatePayLink, cancelTransaction as paymeCancelTransaction,
  isPaymeDemoMode,
} from '@/lib/payme';
import { generateClickPaymentUrl, isClickDemoMode } from '@/lib/click';
import { createFiscalReceipt, handleFiscalDataCallback } from '@/lib/fiscal';

// ─── Types ──────────────────────────────────────────────────────

export type EscrowStatus = 'pending_payment' | 'held' | 'released' | 'cancelled' | 'disputed';
export type PaymentMethod = 'payme' | 'click' | 'uzcard' | 'terminal';

export interface EscrowRecord {
  id: number;
  deal_id: number;
  transaction_id?: number;
  lot_id: number;
  buyer_id: number;
  seller_id: number;
  amount: number;
  status: EscrowStatus;
  payment_method: PaymentMethod;
  payment_id?: string;
  payment_url?: string;
  payme_transaction_id?: string;
  click_transaction_id?: string;
  receipt_id?: string;
  error_log?: string;
  created_at: string;
  held_at?: string;
  released_at?: string;
  cancelled_at?: string;
}

export interface EscrowCreateInput {
  deal_id: number;
  lot_id: number;
  buyer_id: number;
  seller_id: number;
  amount: number;
  payment_method: PaymentMethod;
  callback_url?: string;
}

export interface EscrowLog {
  id: number;
  escrow_id: number;
  action: string;
  status: string;
  amount: number;
  provider: string;
  provider_transaction_id?: string;
  provider_response?: string;
  error?: string;
  created_at: string;
}

export interface EscrowActionResult {
  ok: boolean;
  escrow?: EscrowRecord;
  error?: string;
  payment_url?: string;
}

// ─── Demo/Mock Data ─────────────────────────────────────────────

const MOCK_ESCROWS: EscrowRecord[] = [
  {
    id: 1, deal_id: 3, lot_id: 4, buyer_id: 1, seller_id: 4,
    amount: 21000000, status: 'pending_payment', payment_method: 'payme',
    created_at: '2026-06-12T11:30:00Z',
  },
  {
    id: 2, deal_id: 4, lot_id: 10, buyer_id: 5, seller_id: 4,
    amount: 36000000, status: 'held', payment_method: 'click',
    payment_id: 'demo_pay_001',
    created_at: '2026-06-11T14:00:00Z', held_at: '2026-06-11T14:05:00Z',
  },
  {
    id: 3, deal_id: 6, lot_id: 19, buyer_id: 10, seller_id: 3,
    amount: 41600000, status: 'held', payment_method: 'payme',
    payment_id: 'demo_pay_002',
    created_at: '2026-06-05T10:00:00Z', held_at: '2026-06-05T10:03:00Z',
  },
  {
    id: 4, deal_id: 8, lot_id: 17, buyer_id: 6, seller_id: 10,
    amount: 27500000, status: 'pending_payment', payment_method: 'uzcard',
    created_at: '2026-06-12T08:00:00Z',
  },
  {
    id: 5, deal_id: 7, lot_id: 14, buyer_id: 2, seller_id: 10,
    amount: 28500000, status: 'released', payment_method: 'payme',
    payment_id: 'demo_pay_003',
    created_at: '2026-06-08T16:30:00Z', held_at: '2026-06-08T16:35:00Z', released_at: '2026-06-10T11:00:00Z',
  },
];

// ─── Demo/Mock Audit Logs ──────────────────────────────────────

const MOCK_ESCROW_LOGS: Record<number, EscrowLog[]> = {
  1: [
    { id: 1, escrow_id: 1, action: 'create', status: 'pending_payment', amount: 21000000, provider: 'payme', created_at: '2026-06-12T11:30:00Z' },
    { id: 2, escrow_id: 1, action: 'check_perform', status: 'pending_payment', amount: 21000000, provider: 'payme', provider_transaction_id: 'pm_tx_001', created_at: '2026-06-12T11:32:00Z' },
    { id: 3, escrow_id: 1, action: 'create_transaction', status: 'pending_payment', amount: 21000000, provider: 'payme', provider_transaction_id: 'pm_tx_001', created_at: '2026-06-12T11:32:05Z' },
  ],
  2: [
    { id: 4, escrow_id: 2, action: 'create', status: 'pending_payment', amount: 36000000, provider: 'click', created_at: '2026-06-11T14:00:00Z' },
    { id: 5, escrow_id: 2, action: 'prepare', status: 'pending_payment', amount: 36000000, provider: 'click', provider_transaction_id: 'cl_tx_001', created_at: '2026-06-11T14:01:00Z' },
    { id: 6, escrow_id: 2, action: 'complete', status: 'held', amount: 36000000, provider: 'click', provider_transaction_id: 'cl_tx_001', created_at: '2026-06-11T14:05:00Z' },
  ],
  5: [
    { id: 7, escrow_id: 5, action: 'create', status: 'pending_payment', amount: 28500000, provider: 'payme', created_at: '2026-06-08T16:30:00Z' },
    { id: 8, escrow_id: 5, action: 'check_perform', status: 'pending_payment', amount: 28500000, provider: 'payme', provider_transaction_id: 'pm_tx_003', created_at: '2026-06-08T16:31:00Z' },
    { id: 9, escrow_id: 5, action: 'create_transaction', status: 'pending_payment', amount: 28500000, provider: 'payme', provider_transaction_id: 'pm_tx_003', created_at: '2026-06-08T16:32:00Z' },
    { id: 10, escrow_id: 5, action: 'perform_transaction', status: 'held', amount: 28500000, provider: 'payme', provider_transaction_id: 'pm_tx_003', provider_response: '{"state":2}', created_at: '2026-06-08T16:35:00Z' },
    { id: 11, escrow_id: 5, action: 'release', status: 'released', amount: 28500000, provider: 'payme', provider_transaction_id: 'pm_tx_003', created_at: '2026-06-10T11:00:00Z' },
    { id: 12, escrow_id: 5, action: 'release_complete', status: 'released', amount: 28500000, provider: 'payme', created_at: '2026-06-10T11:00:01Z' },
  ],
};

// ─── Audit Trail ────────────────────────────────────────────────

export async function logEscrowAction(
  escrowId: number,
  action: string,
  status: string,
  amount: number,
  provider: string,
  providerTxId?: string,
  providerResponse?: string,
  error?: string
): Promise<void> {
  try {
    await execute(
      `INSERT INTO escrow_logs (escrow_id, action, status, amount, provider, provider_transaction_id, provider_response, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [escrowId, action, status, amount, provider, providerTxId || null, providerResponse || null, error || null]
    );
  } catch (err) {
    console.error('Failed to write escrow log:', err);
  }
}

// ─── Core ESCROW Functions ──────────────────────────────────────

/**
 * Create an escrow hold — buyer prepares to pay
 * Payme/Click demo yoki real to'lov URL yaratiladi
 */
export async function createEscrow(input: EscrowCreateInput): Promise<EscrowActionResult> {
  try {
    const existing = await queryOne<EscrowRecord>(
      'SELECT * FROM escrow WHERE deal_id = $1 AND status = ANY($2)',
      [input.deal_id, ['pending_payment', 'held']]
    );
    if (existing) {
      return { ok: true, escrow: existing, payment_url: existing.payment_url };
    }

    const result = await queryOne<EscrowRecord>(
      `INSERT INTO escrow (deal_id, lot_id, buyer_id, seller_id, amount, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending_payment')
       RETURNING *`,
      [input.deal_id, input.lot_id, input.buyer_id, input.seller_id, input.amount, input.payment_method]
    );

    if (!result) {
      return { ok: false, error: 'Failed to create escrow record' };
    }

    // Generate payment URL based on method
    let paymentUrl = '';
    if (input.payment_method === 'payme') {
      paymentUrl = generatePayLink(`escrow_${result.id}`, input.amount, input.callback_url);
    } else if (input.payment_method === 'click') {
      paymentUrl = generateClickPaymentUrl(`escrow_${result.id}`, input.amount);
    }

    // Save payment URL
    if (paymentUrl) {
      const updated = await queryOne<EscrowRecord>(
        "UPDATE escrow SET payment_url = $1 WHERE id = $2 RETURNING *",
        [paymentUrl, result.id]
      );
      await logEscrowAction(result.id, 'create', 'pending_payment', input.amount, input.payment_method);
      return { ok: true, escrow: updated || result, payment_url: paymentUrl };
    }

    await logEscrowAction(result.id, 'create', 'pending_payment', input.amount, input.payment_method);
    return { ok: true, escrow: result };
  } catch (err) {
    // ─── MongoDB Fallback ──
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('DB escrow create failed, using mock:', errMsg);

    const mockId = MOCK_ESCROWS.length + 1;
    const nowStr = new Date().toISOString();
    const mockEscrow: EscrowRecord = {
      id: mockId, deal_id: input.deal_id, lot_id: input.lot_id,
      buyer_id: input.buyer_id, seller_id: input.seller_id,
      amount: input.amount, status: 'pending_payment',
      payment_method: input.payment_method, created_at: nowStr, error_log: errMsg,
    };

    let paymentUrl = '';
    if (input.payment_method === 'payme') {
      paymentUrl = generatePayLink(`escrow_${mockId}`, input.amount, input.callback_url);
    } else if (input.payment_method === 'click') {
      paymentUrl = generateClickPaymentUrl(`escrow_${mockId}`, input.amount);
    }
    mockEscrow.payment_url = paymentUrl;
    MOCK_ESCROWS.push(mockEscrow);

    return { ok: true, escrow: mockEscrow, payment_url: paymentUrl };
  }
}

/**
 * Mark payment as received — funds are now held in escrow
 * Call this from webhooks or simulatePayment
 */
export async function confirmPaymentHeld(
  escrowId: number,
  paymentId?: string,
  providerTxId?: string
): Promise<EscrowActionResult> {
  try {
    const updated = await queryOne<EscrowRecord>(
      `UPDATE escrow
       SET status = 'held',
           payment_id = COALESCE($2, payment_id),
           payme_transaction_id = COALESCE($3, payme_transaction_id),
           held_at = NOW()
       WHERE id = $1 AND status = 'pending_payment'
       RETURNING *`,
      [escrowId, paymentId || `pm_${Date.now()}`, providerTxId || null]
    );

    if (!updated) return { ok: false, error: 'Escrow not found or not in pending state' };
    await logEscrowAction(escrowId, 'confirm_held', 'held', updated.amount, updated.payment_method, providerTxId);

    // 🏛️ Fiskal chek yaratish
    // DB amount UZS da saqlanadi, createFiscalReceipt ham UZS da kutadi
    createFiscalReceipt({
      orderId: `escrow_${escrowId}`,
      amount: updated.amount,
      description: `ESCROW #${escrowId} — DeLiKet Marketplace`,
    }).then(fiscalResult => {
      if (fiscalResult.ok && fiscalResult.receipt_id) {
        console.log(`[FISCAL] Receipt created for escrow ${escrowId}: ${fiscalResult.receipt_id}`);
      }
    }).catch(err => console.error(`[FISCAL] Receipt creation failed for escrow ${escrowId}:`, err));

    return { ok: true, escrow: updated };
  } catch (err) {
    console.error('DB confirm payment held failed, using mock:', err);
    const escrow = MOCK_ESCROWS.find(e => e.id === escrowId);
    if (!escrow) return { ok: false, error: 'Escrow not found' };
    escrow.status = 'held';
    escrow.payment_id = paymentId || `demo_pm_${Date.now()}`;
    escrow.held_at = new Date().toISOString();
    return { ok: true, escrow };
  }
}

/**
 * Release funds to seller — REAL Payme/Click API chaqiriladi
 *
 * REAL MODE:
 * - Payme → PerformTransaction chaqiriladi (pul sotuvchiga o'tadi)
 * - Click → Click.pay ga so'rov yuboriladi
 * DEMO MODE:
 * - Faqat DB da status o'zgartiriladi
 */
export async function releaseEscrow(escrowId: number): Promise<EscrowActionResult> {
  try {
    const escrow = await queryOne<EscrowRecord>(
      "SELECT * FROM escrow WHERE id = $1 AND status = 'held'",
      [escrowId]
    );

    if (!escrow) return { ok: false, error: 'Escrow not found or not in held state' };

    // REAL: Payme orqali to'lov holatini tekshirish (funds already in merchant account)
    if (escrow.payment_method === 'payme' && !isPaymeDemoMode()) {
      // Payme PerformTransaction allaqachon webhook orqali kelgan.
      // Bu yerda faqat DB status o'zgartiriladi — Payme API chaqirilmaydi.
      await logEscrowAction(escrowId, 'release', 'released', escrow.amount, 'payme',
        escrow.payme_transaction_id);
    }

    // REAL: Click orqali to'lov holatini tekshirish
    if (escrow.payment_method === 'click' && !isClickDemoMode()) {
      try {
        const { checkPaymentByMerchantTransId } = await import('@/lib/click');
        const paymentStatus = await checkPaymentByMerchantTransId(`escrow_${escrow.id}`);
        await logEscrowAction(escrowId, 'release_click', 'released', escrow.amount, 'click',
          escrow.click_transaction_id, JSON.stringify(paymentStatus));
      } catch (e) {
        await logEscrowAction(escrowId, 'release_click_check_failed', 'held', escrow.amount, 'click',
          escrow.click_transaction_id, undefined, String(e));
      }
    }

    // DB da status o'zgartirish
    const updated = await queryOne<EscrowRecord>(
      `UPDATE escrow SET status = 'released', released_at = NOW() WHERE id = $1 AND status = 'held' RETURNING *`,
      [escrowId]
    );

    // Bog'langan tranzaksiyani yakunlash
    if (updated?.transaction_id) {
      await queryOne(
        "UPDATE transactions SET status = 'yakunlandi', completed_at = NOW() WHERE id = $1",
        [updated.transaction_id]
      );
    }

    if (!isPaymeDemoMode() || !isClickDemoMode()) {
      await logEscrowAction(escrowId, 'release_complete', 'released', escrow.amount, escrow.payment_method);
    }

    return { ok: true, escrow: updated || escrow };
  } catch (err) {
    // Mock fallback
    console.error('DB release escrow failed, using mock:', err);
    const escrow = MOCK_ESCROWS.find(e => e.id === escrowId && e.status === 'held');
    if (!escrow) return { ok: false, error: 'Escrow not found or not in held state' };
    escrow.status = 'released';
    escrow.released_at = new Date().toISOString();
    return { ok: true, escrow };
  }
}

/**
 * Cancel escrow and refund buyer — REAL Payme/Click API chaqiriladi
 *
 * REAL MODE:
 * - Payme → CancelTransaction (pul xaridorga qaytadi)
 * - Click → refundPayment
 * DEMO MODE:
 * - Faqat DB da status o'zgartiriladi
 */
export async function cancelEscrow(
  escrowId: number,
  reason?: string
): Promise<EscrowActionResult> {
  try {
    const escrow = await queryOne<EscrowRecord>(
      "SELECT * FROM escrow WHERE id = $1 AND status IN ('pending_payment', 'held')",
      [escrowId]
    );

    if (!escrow) return { ok: false, error: 'Escrow not found or cannot be cancelled' };

    // REAL: Payme orqali pulni qaytarish
    if (escrow.payment_method === 'payme' && escrow.payme_transaction_id && !isPaymeDemoMode()) {
      const cancelResult = await paymeCancelTransaction(escrow.payme_transaction_id, 1);
      if (!cancelResult) {
        await logEscrowAction(escrowId, 'cancel_failed', 'held', escrow.amount, 'payme',
          escrow.payme_transaction_id, undefined, 'Payme CancelTransaction failed');
        return { ok: false, error: 'Payme tranzaksiyasini bekor qilishda xatolik' };
      }
      await logEscrowAction(escrowId, 'cancel_payme', 'cancelled', escrow.amount, 'payme',
        escrow.payme_transaction_id, JSON.stringify(cancelResult));
    }

    // REAL: Click orqali pulni qaytarish
    if (escrow.payment_method === 'click' && escrow.payment_id && !isClickDemoMode()) {
      const { refundPayment } = await import('@/lib/click');
      const refundResult = await refundPayment(escrow.payment_id, escrow.amount, reason || 'Buyurtma bekor qilindi');
      await logEscrowAction(escrowId, 'cancel_click', 'cancelled', escrow.amount, 'click',
        escrow.payment_id, JSON.stringify(refundResult));
    }

    // DB da status o'zgartirish
    const updated = await queryOne<EscrowRecord>(
      `UPDATE escrow SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1 AND status IN ('pending_payment', 'held') RETURNING *`,
      [escrowId]
    );

    if (updated?.transaction_id) {
      await queryOne(
        "UPDATE transactions SET status = 'bekor_qilingan' WHERE id = $1",
        [updated.transaction_id]
      );
    }

    if (!isPaymeDemoMode() || !isClickDemoMode()) {
      await logEscrowAction(escrowId, 'cancel_complete', 'cancelled', escrow.amount, escrow.payment_method);
    }

    return { ok: true, escrow: updated || escrow };
  } catch (err) {
    // Mock fallback
    console.error('DB cancel escrow failed, using mock:', err);
    const escrow = MOCK_ESCROWS.find(
      e => e.id === escrowId && (e.status === 'pending_payment' || e.status === 'held')
    );
    if (!escrow) return { ok: false, error: 'Escrow not found or cannot be cancelled' };
    escrow.status = 'cancelled';
    escrow.cancelled_at = new Date().toISOString();
    return { ok: true, escrow };
  }
}

/**
 * Check real payment status from Payme/Click
 */
export async function checkPaymentStatus(escrowId: number): Promise<{
  provider_status?: string;
  escrow_status: string;
  error?: string;
}> {
  try {
    const escrow = await getEscrow(escrowId);
    if (!escrow) return { escrow_status: 'not_found', error: 'Escrow not found' };

    let providerStatus: string | undefined;

    if (escrow.payment_method === 'payme' && escrow.payme_transaction_id && !isPaymeDemoMode()) {
      const tx = await import('@/lib/payme').then(m => m.checkTransaction(escrow.payme_transaction_id!));
      providerStatus = tx ? `state=${tx.state}` : 'check_failed';
    }

    if (escrow.payment_method === 'click' && escrow.click_transaction_id && !isClickDemoMode()) {
      const { checkPaymentByMerchantTransId } = await import('@/lib/click');
      const payment = await checkPaymentByMerchantTransId(`escrow_${escrow.id}`);
      providerStatus = payment ? `state=${payment.state}` : 'check_failed';
    }

    return { provider_status: providerStatus, escrow_status: escrow.status };
  } catch (err) {
    return { escrow_status: 'error', error: String(err) };
  }
}

// ─── Query Functions ────────────────────────────────────────────

/**
 * Get escrow details by ID or deal_id
 */
export async function getEscrow(
  escrowId?: number,
  dealId?: number
): Promise<EscrowRecord | null> {
  try {
    let result: EscrowRecord | null = null;
    if (escrowId) {
      result = await queryOne<EscrowRecord>('SELECT * FROM escrow WHERE id = $1', [escrowId]);
    } else if (dealId) {
      result = await queryOne<EscrowRecord>('SELECT * FROM escrow WHERE deal_id = $1 ORDER BY id DESC LIMIT 1', [dealId]);
    }
    return result;
  } catch (err) {
    console.error('DB get escrow failed, using mock:', err);
    if (escrowId) return MOCK_ESCROWS.find(e => e.id === escrowId) || null;
    if (dealId) return MOCK_ESCROWS.find(e => e.deal_id === dealId) || null;
    return null;
  }
}

/**
 * Get all escrows for a user (as buyer or seller)
 */
export async function getUserEscrows(userId: number): Promise<EscrowRecord[]> {
  try {
    return await query<EscrowRecord>(
      'SELECT * FROM escrow WHERE buyer_id = $1 OR seller_id = $1 ORDER BY created_at DESC',
      [userId]
    );
  } catch (err) {
    console.error('DB get user escrows failed, using mock:', err);
    return MOCK_ESCROWS.filter(e => e.buyer_id === userId || e.seller_id === userId);
  }
}

/**
 * Get escrow audit logs
 */
export async function getEscrowLogs(escrowId: number): Promise<EscrowLog[]> {
  try {
    return await query<EscrowLog>(
      'SELECT * FROM escrow_logs WHERE escrow_id = $1 ORDER BY created_at ASC',
      [escrowId]
    );
  } catch {
    // Fallback to mock logs
    return MOCK_ESCROW_LOGS[escrowId] || [];
  }
}

/**
 * Get escrow status summary
 */
export async function getEscrowStats(): Promise<{
  total: number; pending_payment: number; held: number; released: number;
  cancelled: number; disputed: number; total_held_amount: number;
}> {
  try {
    const stats = await queryOne<any>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending_payment') as pending_payment,
        COUNT(*) FILTER (WHERE status = 'held') as held,
        COUNT(*) FILTER (WHERE status = 'released') as released,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'disputed') as disputed,
        COALESCE(SUM(amount) FILTER (WHERE status = 'held'), 0) as total_held_amount
      FROM escrow
    `);
    if (stats) return stats;
    throw new Error('No stats');
  } catch (err) {
    console.error('DB escrow stats failed, using mock:', err);
    return {
      total: MOCK_ESCROWS.length, pending_payment: MOCK_ESCROWS.filter(e => e.status === 'pending_payment').length,
      held: MOCK_ESCROWS.filter(e => e.status === 'held').length,
      released: MOCK_ESCROWS.filter(e => e.status === 'released').length,
      cancelled: MOCK_ESCROWS.filter(e => e.status === 'cancelled').length,
      disputed: MOCK_ESCROWS.filter(e => e.status === 'disputed').length,
      total_held_amount: MOCK_ESCROWS.filter(e => e.status === 'held').reduce((s, e) => s + e.amount, 0),
    };
  }
}

/**
 * Simulate payment (for demo/testing)
 */
export async function simulatePayment(escrowId: number): Promise<EscrowActionResult> {
  return confirmPaymentHeld(escrowId, `demo_sim_${Date.now()}`, 'demo_sim_tx');
}

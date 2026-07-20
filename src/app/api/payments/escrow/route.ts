/** 🛡️ ESCROW API — create hold, release, cancel, get status */

import { NextRequest, NextResponse } from 'next/server';
import {
  createEscrow, releaseEscrow, cancelEscrow,
  getEscrow, getUserEscrows, getEscrowStats,
  getEscrowLogs,
  simulatePayment,
  EscrowCreateInput,
} from '@/lib/escrow';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/payments/escrow
 * - ?id=1 — get specific escrow
 * - ?deal_id=3 — get escrow for deal
 * - ?user_id=1 — get all escrows for user
 * - ?stats=true — get escrow statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const dealId = searchParams.get('deal_id');
    const userId = searchParams.get('user_id');
    const stats = searchParams.get('stats');
    const action = searchParams.get('action');
    const escrowId = searchParams.get('escrow_id');

    // Escrow audit logs
    if (action === 'logs' && escrowId) {
      const logs = await getEscrowLogs(parseInt(escrowId));
      return NextResponse.json({ ok: true, logs });
    }

    if (stats === 'true') {
      const escrowStats = await getEscrowStats();
      return NextResponse.json({ ok: true, stats: escrowStats });
    }

    if (id) {
      const escrow = await getEscrow(parseInt(id));
      if (!escrow) return NextResponse.json({ ok: false, error: 'Escrow not found' }, { status: 404 });
      return NextResponse.json({ ok: true, escrow });
    }

    if (dealId) {
      const escrow = await getEscrow(undefined, parseInt(dealId));
      if (!escrow) return NextResponse.json({ ok: false, error: 'No escrow found for this deal' }, { status: 404 });
      return NextResponse.json({ ok: true, escrow });
    }

    if (userId) {
      const escrows = await getUserEscrows(parseInt(userId));
      return NextResponse.json({ ok: true, escrows });
    }

    return NextResponse.json({ ok: false, error: 'Provide id, deal_id, user_id, or stats' }, { status: 400 });
  } catch (err) {
    console.error('Escrow GET error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/payments/escrow
 * Body: { action: "create", deal_id, lot_id, buyer_id, seller_id, amount, payment_method }
 * Body: { action: "release", escrow_id }
 * Body: { action: "cancel", escrow_id, reason? }
 * Body: { action: "simulate", escrow_id } — demo mode: directly confirm payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ ok: false, error: 'action is required (create|release|cancel|simulate)' }, { status: 400 });
    }

    switch (action) {
      case 'create': {
        // Create new escrow hold
        const { deal_id, lot_id, buyer_id, seller_id, amount, payment_method } = body;

        if (!deal_id || !lot_id || !buyer_id || !seller_id || !amount || !payment_method) {
          return NextResponse.json({
            ok: false,
            error: 'deal_id, lot_id, buyer_id, seller_id, amount, payment_method are required',
          }, { status: 400 });
        }

        const input: EscrowCreateInput = {
          deal_id: parseInt(deal_id),
          lot_id: parseInt(lot_id),
          buyer_id: parseInt(buyer_id),
          seller_id: parseInt(seller_id),
          amount: parseFloat(amount),
          payment_method,
          callback_url: body.callback_url || `${request.nextUrl.origin}/deal/${deal_id}`,
        };

        const result = await createEscrow(input);
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'release': {
        // Release funds to seller
        const { escrow_id } = body;
        if (!escrow_id) {
          return NextResponse.json({ ok: false, error: 'escrow_id is required' }, { status: 400 });
        }
        const result = await releaseEscrow(parseInt(escrow_id));
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'cancel': {
        // Cancel escrow and refund
        const { escrow_id, reason } = body;
        if (!escrow_id) {
          return NextResponse.json({ ok: false, error: 'escrow_id is required' }, { status: 400 });
        }
        const result = await cancelEscrow(parseInt(escrow_id), reason);
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'simulate': {
        // Demo mode — simulate payment received
        const { escrow_id } = body;
        if (!escrow_id) {
          return NextResponse.json({ ok: false, error: 'escrow_id is required' }, { status: 400 });
        }
        const result = await simulatePayment(parseInt(escrow_id));
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      default:
        return NextResponse.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('Escrow POST error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

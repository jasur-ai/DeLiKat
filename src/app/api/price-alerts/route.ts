/**
 * 🔔 Price Drop Alerts API
 *
 * GET  /api/price-alerts?user_id=X  → user alerts
 * POST /api/price-alerts            → { lot_id, target_price } create alert
 * DELETE /api/price-alerts?id=X     → delete alert
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory store (would be DB in production)
interface PriceAlert {
  id: number;
  user_id: number;
  lot_id: number;
  target_price: number;
  current_price: number;
  triggered: boolean;
  created_at: string;
}
let alertIdCounter = 1;
const alerts: Map<number, PriceAlert[]> = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = parseInt(searchParams.get('user_id') || '0');

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'user_id required' }, { status: 400 });
  }

  const userAlerts = alerts.get(userId) || [];
  return NextResponse.json({ ok: true, alerts: userAlerts });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lot_id, target_price, user_id } = body;

    if (!lot_id || !target_price) {
      return NextResponse.json({ ok: false, error: 'lot_id and target_price required' }, { status: 400 });
    }

    const uid = user_id || 1;
    if (!alerts.has(uid)) alerts.set(uid, []);

    const newAlert: PriceAlert = {
      id: alertIdCounter++,
      user_id: uid,
      lot_id,
      target_price,
      current_price: target_price,
      triggered: false,
      created_at: new Date().toISOString(),
    };

    alerts.get(uid)!.push(newAlert);

    return NextResponse.json({ ok: true, alert: newAlert });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get('id') || '0');
  const userId = parseInt(searchParams.get('user_id') || '1');

  const userAlerts = alerts.get(userId) || [];
  const filtered = userAlerts.filter(a => a.id !== id);
  alerts.set(userId, filtered);

  return NextResponse.json({ ok: true, deleted: true });
}

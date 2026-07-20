import { NextRequest, NextResponse } from 'next/server';
import { calculateTrustScoreFromDB } from '@/lib/trust-score';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id parameter required' }, { status: 400 });
  }

  const uid = parseInt(userId);

  // calculateTrustScoreFromDB has built-in mock fallback
  const result = await calculateTrustScoreFromDB(uid);
  return NextResponse.json({
    ok: true,
    user_id: uid,
    ...result,
  });
}

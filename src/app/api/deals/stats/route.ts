import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const total = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM transactions');
    const pending = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM transactions WHERE status = 'kutmoqda'");
    const completed = await queryOne<{ count: string }>("SELECT COUNT(*) as count FROM transactions WHERE status = 'yakunlandi'");
    const volume = await queryOne<{ total: string }>("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'yakunlandi'");

    return NextResponse.json({
      ok: true,
      stats: {
        total: parseInt(total?.count || '0'),
        pending: parseInt(pending?.count || '0'),
        completed: parseInt(completed?.count || '0'),
        total_volume: parseFloat(volume?.total || '0'),
      },
    });
  } catch (err) {
    console.error('Deal stats error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

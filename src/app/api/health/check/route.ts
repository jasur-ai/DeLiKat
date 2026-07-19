import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    await query('SELECT 1');
    results.database_connection = { status: 'ok', detail: 'Connected' };

    const tables = await query<{ tablename: string }>(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"
    );
    const tableNames = tables.map(t => t.tablename);
    const required = ['users', 'lots', 'bids', 'ratings', 'transactions'];
    const missing = required.filter(r => !tableNames.includes(r));
    results.database_tables = missing.length
      ? { status: 'fail', detail: `Missing: ${missing.join(', ')}` }
      : { status: 'ok', detail: `${required.length} core tables exist` };

    const userCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users');
    const lotCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM lots');
    const bidCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM bids');
    const uc = parseInt(userCount?.count || '0');
    results.seed_data = {
      status: uc >= 7 ? 'ok' : 'warning',
      detail: `${uc} users, ${parseInt(lotCount?.count || '0')} lots, ${parseInt(bidCount?.count || '0')} bids`,
    };
  } catch (e: any) {
    results.error = { status: 'fail', detail: e.message };
  }

  const okCount = Object.values(results).filter((r: any) => r.status === 'ok').length;
  const total = Object.keys(results).length;

  return NextResponse.json({
    status: okCount === total ? 'ok' : 'degraded',
    service: 'deliket',
    version: '0.4.0',
    timestamp: new Date().toISOString(),
    summary: { ok: okCount, total, score: Math.round((okCount / total) * 100) },
    results,
  });
}

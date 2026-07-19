import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path === '/api/health/check') {
    return healthCheck();
  }

  // Simple health
  try {
    await query('SELECT 1');
    return NextResponse.json({ status: 'ok', version: '0.4.0', db: 'connected' });
  } catch {
    return NextResponse.json({ status: 'degraded', version: '0.4.0', db: 'disconnected' });
  }
}

async function healthCheck() {
  const results: Record<string, any> = {};

  try {
    // DB connection
    await query('SELECT 1');
    results.database_connection = { status: 'ok', detail: 'Connected' };

    // Tables
    const tables = await query<{ tablename: string }>(
      "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"
    );
    const tableNames = tables.map(t => t.tablename);
    const required = ['users', 'lots', 'bids', 'ratings', 'transactions'];
    const missing = required.filter(r => !tableNames.includes(r));
    results.database_tables = missing.length
      ? { status: 'fail', detail: `Missing: ${missing.join(', ')}` }
      : { status: 'ok', detail: `${required.length} core tables exist` };

    // Seed data
    const userCount = await query<{ count: string }>('SELECT COUNT(*) as count FROM users');
    const lotCount = await query<{ count: string }>('SELECT COUNT(*) as count FROM lots');
    const bidCount = await query<{ count: string }>('SELECT COUNT(*) as count FROM bids');
    const uc = parseInt(userCount[0]?.count || '0');
    results.seed_data = {
      status: uc >= 7 ? 'ok' : 'warning',
      detail: `${uc} users, ${parseInt(lotCount[0]?.count || '0')} lots, ${parseInt(bidCount[0]?.count || '0')} bids`,
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

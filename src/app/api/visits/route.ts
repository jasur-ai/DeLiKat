import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

const ACTION_LABELS: Record<string, string> = {
  visited: '✅ Tashrif',
  signed: "📝 Ro'yxatdan o'tdi",
  lot: '📦 Lot yaratdi',
  deal: '💰 Bitim',
  reject: '❌ Rad etdi',
};

const DEAL_REVENUE_ESTIMATES: Record<string, number> = {
  smartfon: 5_000_000, notebook: 8_000_000, tv: 3_500_000,
  audio: 1_500_000, aksesuar: 500_000, kiyim: 300_000,
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '1'), 1), 90);
    const userId = searchParams.get('user_id');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));

    const startStr = startDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    // Build base filter
    let whereClause = 'WHERE sv.visit_date >= $1 AND sv.visit_date <= $2';
    const params: any[] = [startStr, todayStr];
    let paramIdx = 3;

    // Check if table exists
    let tableExists = false;
    try {
      await queryOne<any>('SELECT 1 FROM shop_visits LIMIT 1');
      tableExists = true;
    } catch {
      return NextResponse.json({
        ok: false,
        error: 'shop_visits table does not exist. Initialize database first.',
      });
    }

    // Total visits by action
    const actionRows = await query<{ action: string; cnt: string }>(
      `SELECT sv.action, COUNT(sv.id) as cnt FROM shop_visits sv ${whereClause} GROUP BY sv.action`,
      params
    );

    const actionCounts: Record<string, number> = { visited: 0, signed: 0, lot: 0, deal: 0, reject: 0 };
    let totalAll = 0;
    for (const row of actionRows) {
      const count = parseInt(row.cnt);
      actionCounts[row.action] = count;
      totalAll += count;
    }

    // Daily breakdown
    const dailyRows = await query<{ visit_date: string; action: string; cnt: string }>(
      `SELECT sv.visit_date, sv.action, COUNT(sv.id) as cnt
       FROM shop_visits sv ${whereClause}
       GROUP BY sv.visit_date, sv.action
       ORDER BY sv.visit_date DESC`,
      params
    );

    const dailyData: Record<string, any> = {};
    for (const d of dailyRows) {
      if (!dailyData[d.visit_date]) {
        dailyData[d.visit_date] = { date: d.visit_date, total: 0 };
      }
      dailyData[d.visit_date][d.action] = parseInt(d.cnt);
      dailyData[d.visit_date].total += parseInt(d.cnt);
    }

    // Unique shops
    let uniqueShops = 0;
    try {
      const usResult = await queryOne<{ cnt: string }>(
        `SELECT COUNT(DISTINCT sv.shop_name) as cnt FROM shop_visits sv ${whereClause}`,
        params
      );
      uniqueShops = parseInt(usResult?.cnt || '0');
    } catch { /* skip */ }

    // Conversion metrics
    const visitedCount = (actionCounts.visited || 0) + (actionCounts.signed || 0)
      + (actionCounts.lot || 0) + (actionCounts.deal || 0);
    const signedCount = (actionCounts.signed || 0) + (actionCounts.lot || 0)
      + (actionCounts.deal || 0);
    const lotCount = actionCounts.lot || 0;

    const conversionVisitedToSigned = visitedCount > 0
      ? Math.round((signedCount / visitedCount) * 100 * 10) / 10 : 0;
    const conversionSignedToLot = signedCount > 0
      ? Math.round((lotCount / signedCount) * 100 * 10) / 10 : 0;

    // Revenue potential
    const avgDealValue = 3_500_000;
    const estimatedRevenue = signedCount * 0.3 * avgDealValue;
    const potentialMonthly = (estimatedRevenue / days) * 22;

    // Recent shops
    let recentShops: any[] = [];
    try {
      const recent = await query<any>(
        `SELECT * FROM shop_visits sv ${whereClause} ORDER BY sv.created_at DESC LIMIT 20`,
        params
      );
      recentShops = recent.map((v: any) => ({
        id: v.id,
        shop_name: v.shop_name,
        action: v.action,
        action_label: ACTION_LABELS[v.action] || v.action,
        date: v.visit_date,
        time: v.created_at ? String(v.created_at).substring(11, 19) : '',
      }));
    } catch { /* skip */ }

    // Best day
    const values = Object.values(dailyData) as any[];
    const bestDay = values.length > 0
      ? values.reduce((best: any, curr: any) => curr.total > best.total ? curr : best)
      : null;

    return NextResponse.json({
      ok: true,
      report: {
        period: { from: startStr, to: todayStr, days },
        summary: { total_actions: totalAll, unique_shops: uniqueShops, ...actionCounts },
        conversion: {
          visited: visitedCount,
          signed: signedCount,
          lots_created: lotCount,
          visited_to_signed_pct: conversionVisitedToSigned,
          signed_to_lot_pct: conversionSignedToLot,
          funnel: [
            { stage: 'Tashrif', count: visitedCount, pct: 100 },
            { stage: "Ro'yxat", count: signedCount, pct: conversionVisitedToSigned },
            { stage: 'Lot yaratdi', count: lotCount, pct: conversionSignedToLot },
          ],
        },
        revenue: {
          estimated_revenue: Math.round(estimatedRevenue),
          potential_monthly: Math.round(potentialMonthly),
          avg_deal_value: avgDealValue,
          note: "Hisob: ro'yxatdan o'tganlar * 30% (lot yaratish ehtimoli) * o'rtacha 3.5M so'm",
        },
        daily_breakdown: values.sort((a, b) => b.date.localeCompare(a.date)),
        recent_shops: recentShops,
        best_day: bestDay?.date || null,
      },
    });
  } catch (err) {
    console.error('Visit report error:', err);
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

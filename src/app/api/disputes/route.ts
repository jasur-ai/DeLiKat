import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  ochiq: { label: 'Ochiq', color: 'orange', icon: '🔴' },
  "ko'rib_chiqilmoqda": { label: "Ko'rib chiqilmoqda", color: 'blue', icon: '🔵' },
  hal_qilingan: { label: 'Hal qilingan', color: 'green', icon: '✅' },
  rad_etilgan: { label: 'Rad etilgan', color: 'red', icon: '❌' },
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /api/disputes/stats
  if (pathname.endsWith('/stats')) {
    try {
      const { query: q } = await import('@/lib/db');

      // Check if table exists
      let total = 0, openC = 0, reviewing = 0, resolved = 0, rejected = 0;
      try {
        const totalRes = await queryOne<{ cnt: string }>('SELECT COUNT(*) as cnt FROM disputes');
        total = parseInt(totalRes?.cnt || '0');
        const openRes = await queryOne<{ cnt: string }>("SELECT COUNT(*) as cnt FROM disputes WHERE status = 'ochiq'");
        openC = parseInt(openRes?.cnt || '0');
        const reviewingRes = await queryOne<{ cnt: string }>("SELECT COUNT(*) as cnt FROM disputes WHERE status = 'ko''rib_chiqilmoqda'");
        reviewing = parseInt(reviewingRes?.cnt || '0');
        const resolvedRes = await queryOne<{ cnt: string }>("SELECT COUNT(*) as cnt FROM disputes WHERE status = 'hal_qilingan'");
        resolved = parseInt(resolvedRes?.cnt || '0');
        const rejectedRes = await queryOne<{ cnt: string }>("SELECT COUNT(*) as cnt FROM disputes WHERE status = 'rad_etilgan'");
        rejected = parseInt(rejectedRes?.cnt || '0');
      } catch {
        // Disputes table may not exist
        return NextResponse.json({
          total: 0, open: 0, reviewing: 0, resolved: 0, rejected: 0,
          resolution_rate: 0,
          note: 'Disputes table not yet created — run init_db()',
        });
      }

      return NextResponse.json({
        total,
        open: openC,
        reviewing,
        resolved,
        rejected,
        resolution_rate: total > 0 ? Math.round((resolved / total) * 100 * 10) / 10 : 0,
      });
    } catch (err) {
      console.error('Dispute stats error:', err);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  // /api/disputes/user/{userId}
  const userMatch = pathname.match(/\/user\/(\d+)$/);
  if (userMatch) {
    const userId = parseInt(userMatch[1]);
    try {
      const user = await queryOne<any>('SELECT id, name FROM users WHERE id = $1', [userId]);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const disputes = await query<any>(
        `SELECT d.*, t.amount as transaction_amount,
                tr.lot_id, l.title as lot_title,
                ini.name as initiator_name
         FROM disputes d
         LEFT JOIN transactions t ON d.transaction_id = t.id
         LEFT JOIN lots l ON t.lot_id = l.id
         LEFT JOIN users ini ON d.initiator_id = ini.id
         WHERE d.initiator_id = $1
         ORDER BY d.created_at DESC`,
        [userId]
      );

      const disputesData = disputes.map((d: any) => {
        const si = STATUS_MAP[d.status] || { label: d.status, color: 'gray', icon: '⚪' };
        let daysOpen: number | null = null;
        if (d.resolved_at && d.created_at) {
          daysOpen = Math.round(
            (new Date(d.resolved_at).getTime() - new Date(d.created_at).getTime()) / 86400000
          );
        }
        return {
          id: d.id,
          transaction_id: d.transaction_id,
          transaction_amount: d.transaction_amount,
          lot_title: d.lot_title || "Noma'lum",
          reason: d.reason ? (d.reason.length > 200 ? d.reason.substring(0, 200) + '...' : d.reason) : '',
          status: d.status,
          status_label: si.label,
          status_color: si.color,
          status_icon: si.icon,
          evidence: d.evidence,
          resolution: d.resolution,
          created_at: d.created_at || null,
          resolved_at: d.resolved_at || null,
          initiator_name: d.initiator_name || "Noma'lum",
          days_open: daysOpen,
        };
      });

      return NextResponse.json({
        disputes: disputesData,
        total: disputesData.length,
        open_count: disputesData.filter((d: any) => d.status === 'ochiq').length,
        resolved_count: disputesData.filter((d: any) => d.status === 'hal_qilingan').length,
      });
    } catch (err) {
      console.error('Disputes error:', err);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

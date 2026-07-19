import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query<{ category: string; count: string }>(
      "SELECT category, COUNT(*) as count FROM lots WHERE status = 'aktiv' GROUP BY category ORDER BY count DESC"
    );

    const total = rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    const labels: Record<string, string> = {
      smartfon: '📱 Smartfonlar', notebook: '💻 Notebooklar', tv: '📺 TV & Video',
      audio: '🎵 Audio', aksesuar: '🔌 Aksessuarlar', kiyim: '👕 Kiyim',
    };

    const categories = [
      { name: 'all', label: 'Barcha kategoriyalar', count: total },
      ...rows.map(r => ({
        name: r.category,
        label: labels[r.category] || r.category,
        count: parseInt(r.count),
      })),
    ];

    return NextResponse.json({ categories });
  } catch (err) {
    console.error('Categories error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

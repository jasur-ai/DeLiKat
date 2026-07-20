import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getMockCategories } from '@/lib/mock-data';

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
      ...rows.map(r => ({ name: r.category, label: labels[r.category] || r.category, count: parseInt(r.count) })),
    ];
    return NextResponse.json({ categories });
  } catch (err) {
    console.error('Categories error, using mock data:', err);
    const mockCats = getMockCategories();
    const total = Object.values(mockCats).reduce((s, c) => s + c, 0);
    const labels: Record<string, string> = {
      smartfon: '📱 Smartfonlar', notebook: '💻 Notebooklar', tv: '📺 TV & Video',
      audio: '🎵 Audio', aksesuar: '🔌 Aksessuarlar', kiyim: '👕 Kiyim',
    };
    const categories = [
      { name: 'all', label: 'Barcha kategoriyalar', count: total },
      ...Object.entries(mockCats).map(([name, count]) => ({ name, label: labels[name] || name, count })),
    ];
    return NextResponse.json({ categories });
  }
}

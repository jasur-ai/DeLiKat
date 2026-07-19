import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const CATEGORY_EMOJI: Record<string, string> = {
  "boshlang'ich": '🌱', "o'rta": '🌿', yuqori: '🌳', advanced: '🌳',
  beginner: '🌱', intermediate: '🌿',
};

const DEFAULT_LESSONS = [
  { order_num: 1, title: "DeLiKet'ga xush kelibsiz!", content: "DeLiKet — O'zbekistondagi eng yaxshi Telegram marketplace. Bu darsda platformadan foydalanishni o'rganasiz.", category: "boshlang'ich", xp_reward: 50, icon: '🚀' },
  { order_num: 2, title: 'Qanday qilib yaxshi lot yaratish?', content: "Sifatli lot yaratish — sotuvning kaliti. Mahsulot rasmi, to'liq tavsif va to'g'ri narx muhim.", category: "boshlang'ich", xp_reward: 100, icon: '📦' },
  { order_num: 3, title: 'Marketing va sotuv strategiyalari', content: "Lotingizni tez sotish uchun marketing strategiyalari: chegirmalar, aksiyalar va mijozlar bilan muloqot.", category: "o'rta", xp_reward: 150, icon: '📈' },
  { order_num: 4, title: 'Mijozlar bilan ishlash', content: "Tez javob berish, muloyim muloqot va nizolarni hal qilish — muvaffaqiyatli sotuvchining siri.", category: "o'rta", xp_reward: 200, icon: '💬' },
  { order_num: 5, title: 'Platformadan maksimal foydalanish', content: "Premium funksiyalar, analitika va AI yordamchidan foydalanib sotuvlarni oshiring. Cross-Border, AI Price Optimizer va boshqalar.", category: 'yuqori', xp_reward: 300, icon: '🏆' },
];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id');

    let lessons: any[];
    try {
      lessons = await query<any>('SELECT * FROM academy_lessons ORDER BY order_num ASC');
    } catch {
      // Table doesn't exist - use defaults
      const defaultData = DEFAULT_LESSONS.map((l, i) => ({
        id: 0,
        order_num: l.order_num,
        title: l.title,
        content: l.content,
        category: l.category,
        category_emoji: CATEGORY_EMOJI[l.category] || '📚',
        xp_reward: l.xp_reward,
        is_completed: false,
        completed_at: null,
        icon: l.icon,
      }));

      return NextResponse.json({
        lessons: defaultData,
        total_lessons: defaultData.length,
        total_xp: DEFAULT_LESSONS.reduce((s, l) => s + l.xp_reward, 0),
        categories: [...new Set(DEFAULT_LESSONS.map(l => l.category))],
      });
    }

    // Get user progress if requested
    let completedIds = new Set<number>();
    let progresses: any[] = [];
    if (userId) {
      try {
        progresses = await query<any>(
          'SELECT * FROM academy_progress WHERE user_id = $1',
          [parseInt(userId)]
        );
        completedIds = new Set(progresses.map((p: any) => p.lesson_id));
      } catch { /* skip */ }
    }

    let totalXp = 0;
    let completedXp = 0;
    const icons = ['🚀', '📦', '📈', '💬', '🏆'];

    const lessonsData = lessons.map((l: any, idx: number) => {
      totalXp += l.xp_reward;
      const isCompleted = completedIds.has(l.id);
      if (isCompleted) completedXp += l.xp_reward;
      return {
        id: l.id,
        order_num: l.order_num,
        title: l.title,
        content: l.content.length > 120 ? l.content.substring(0, 120) + '...' : l.content,
        category: l.category,
        category_emoji: CATEGORY_EMOJI[l.category] || '📚',
        xp_reward: l.xp_reward,
        is_completed: isCompleted,
        completed_at: progresses.find((p: any) => p.lesson_id === l.id)?.completed_at || null,
        icon: icons[Math.min(l.order_num - 1, 4)],
      };
    });

    const catCounter: Record<string, number> = {};
    for (const l of lessons) catCounter[l.category] = (catCounter[l.category] || 0) + 1;

    return NextResponse.json({
      lessons: lessonsData,
      total_lessons: lessonsData.length,
      total_xp: totalXp,
      completed_xp: completedXp,
      completed_count: completedIds.size,
      categories: Object.entries(catCounter).map(([name, count]) => ({
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        count,
        emoji: CATEGORY_EMOJI[name] || '📚',
      })),
    });
  } catch (err) {
    console.error('Academy lessons error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

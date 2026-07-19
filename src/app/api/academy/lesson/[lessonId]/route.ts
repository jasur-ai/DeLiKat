import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

const CATEGORY_EMOJI: Record<string, string> = {
  "boshlang'ich": '🌱', "o'rta": '🌿', yuqori: '🌳', advanced: '🌳',
  beginner: '🌱', intermediate: '🌿',
};
const ICONS = ['🚀', '📦', '📈', '💬', '🏆'];

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const id = parseInt(lessonId);
    const userId = request.nextUrl.searchParams.get('user_id');

    let lesson: any;
    try {
      lesson = await queryOne<any>('SELECT * FROM academy_lessons WHERE id = $1', [id]);
    } catch { lesson = null; }

    if (!lesson) {
      // Return default lesson if table doesn't exist
      const DEFAULT_LESSONS = [
        { order_num: 1, title: "DeLiKet'ga xush kelibsiz!", content: "DeLiKet — O'zbekistondagi eng yaxshi Telegram marketplace. Bu darsda platformadan foydalanishni o'rganasiz.", category: "boshlang'ich", xp_reward: 50 },
        { order_num: 2, title: 'Qanday qilib yaxshi lot yaratish?', content: "Sifatli lot yaratish — sotuvning kaliti. Mahsulot rasmi, to'liq tavsif va to'g'ri narx muhim.", category: "boshlang'ich", xp_reward: 100 },
        { order_num: 3, title: 'Marketing va sotuv strategiyalari', content: "Lotingizni tez sotish uchun marketing strategiyalari: chegirmalar, aksiyalar va mijozlar bilan muloqot.", category: "o'rta", xp_reward: 150 },
        { order_num: 4, title: 'Mijozlar bilan ishlash', content: "Tez javob berish, muloyim muloqot va nizolarni hal qilish — muvaffaqiyatli sotuvchining siri.", category: "o'rta", xp_reward: 200 },
        { order_num: 5, title: 'Platformadan maksimal foydalanish', content: "Premium funksiyalar, analitika va AI yordamchidan foydalanib sotuvlarni oshiring. Cross-Border, AI Price Optimizer va boshqalar.", category: 'yuqori', xp_reward: 300 },
      ];

      const dl = DEFAULT_LESSONS.find(l => l.order_num === id) || DEFAULT_LESSONS[0];
      return NextResponse.json({
        id: 0,
        order_num: dl.order_num,
        title: dl.title,
        content: dl.content,
        category: dl.category,
        category_emoji: CATEGORY_EMOJI[dl.category] || '📚',
        xp_reward: dl.xp_reward,
        is_completed: false,
        completed_at: null,
        icon: ICONS[Math.min(dl.order_num - 1, 4)],
      });
    }

    let isCompleted = false;
    let completedAt: string | null = null;
    if (userId) {
      try {
        const progress = await queryOne<any>(
          'SELECT * FROM academy_progress WHERE user_id = $1 AND lesson_id = $2',
          [parseInt(userId), id]
        );
        if (progress) {
          isCompleted = progress.completed;
          completedAt = progress.completed_at || null;
        }
      } catch { /* skip */ }
    }

    return NextResponse.json({
      id: lesson.id,
      order_num: lesson.order_num,
      title: lesson.title,
      content: lesson.content,
      category: lesson.category,
      category_emoji: CATEGORY_EMOJI[lesson.category] || '📚',
      xp_reward: lesson.xp_reward,
      is_completed: isCompleted,
      completed_at: completedAt,
      icon: ICONS[Math.min(lesson.order_num - 1, 4)],
    });
  } catch (err) {
    console.error('Academy lesson error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

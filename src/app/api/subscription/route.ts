import { NextRequest, NextResponse } from 'next/server';

const TIERS: Record<string, any> = {
  free: {
    id: 'free', name: 'Bepul', price: 0, currency: 'UZS', period: 'month',
    features: ['5 tagacha aktiv lot', 'Asosiy funksiyalar', 'Standart qidiruv', 'Oddiy statistikalar'],
    badge: '🆓', color: 'gray', popular: false,
  },
  basic: {
    id: 'basic', name: 'Basic', price: 50000, currency: 'UZS', period: 'month',
    features: ['50 tagacha aktiv lot', 'Kengaytirilgan analitika', 'Ekspert qo\'llab-quvvatlash', 'Narx trendlari', 'Sotuvchilar feed\'ida ko\'rinish', 'Telegram bildirishnomalar'],
    badge: '⚡', color: 'blue', popular: true,
  },
  pro: {
    id: 'pro', name: 'Pro', price: 150000, currency: 'UZS', period: 'month',
    features: ['Cheksiz aktiv lotlar', 'AI Price Optimizer', 'Visual Comparison (CLIP)', 'Cross-Border sotuv', 'Premium badge ✅', 'Shaxsiy do\'kon sahifasi', 'Market analytics dashboard', 'Smart Digest kundalik hisobot'],
    badge: '💎', color: 'violet', popular: false,
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', price: 500000, currency: 'UZS', period: 'month',
    features: ['Barcha Pro funksiyalar', 'Shaxsiy account menedjer', 'API orqali ulanish', 'Ommaviy lot boshqaruvi', 'Sotuvchilar akademiyasi', 'Dispute Center prioritet', 'Maxsus integrasiyalar', 'SLA 24/7 yordam'],
    badge: '👑', color: 'gold', popular: false,
  },
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // GET /api/subscription/plans
  if (pathname.endsWith('/plans')) {
    return NextResponse.json({
      plans: Object.values(TIERS),
      total_plans: Object.keys(TIERS).length,
    });
  }

  // GET /api/subscription/user/{user_id}
  const userMatch = pathname.match(/\/user\/(\d+)$/);
  if (userMatch) {
    const userId = parseInt(userMatch[1]);
    try {
      const { queryOne } = await import('@/lib/db');
      const user = await queryOne<any>('SELECT id, name FROM users WHERE id = $1', [userId]);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const sub = await queryOne<any>(
        'SELECT * FROM subscriptions WHERE user_id = $1',
        [userId]
      );

      if (!sub) {
        return NextResponse.json({
          user_id: userId,
          user_name: user.name,
          tier: 'free',
          is_active: true,
          features: TIERS.free.features,
          days_left: null,
          started_at: null,
          expires_at: null,
        });
      }

      let daysLeft: number | null = null;
      if (sub.expires_at) {
        const delta = new Date(sub.expires_at).getTime() - Date.now();
        daysLeft = Math.max(0, Math.floor(delta / 86400000));
      }

      const tierData = TIERS[sub.tier] || TIERS.free;

      return NextResponse.json({
        user_id: userId,
        user_name: user.name,
        tier: sub.tier,
        tier_name: tierData.name,
        tier_badge: tierData.badge,
        is_active: sub.is_active,
        features: tierData.features,
        days_left: daysLeft,
        started_at: sub.started_at || null,
        expires_at: sub.expires_at || null,
      });
    } catch (err) {
      console.error('Subscription user error:', err);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  // Default: return all plans
  return NextResponse.json({
    plans: Object.values(TIERS),
    total_plans: Object.keys(TIERS).length,
  });
}

export async function POST(request: NextRequest) {
  // For routes that need POST
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

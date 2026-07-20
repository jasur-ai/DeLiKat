/**
 * 🎫 Coupon/Discount System API
 *
 * GET  /api/coupons?code=X  → validate coupon
 * POST /api/coupons         → create coupon
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Coupon {
  code: string;
  discount_percent: number;
  max_usage: number;
  used_count: number;
  expires_at: string;
  is_active: boolean;
}

const coupons: Coupon[] = [
  {
    code: 'WELCOME10',
    discount_percent: 10,
    max_usage: 100,
    used_count: 12,
    expires_at: '2026-12-31T23:59:59Z',
    is_active: true,
  },
  {
    code: 'DEADSTOCK20',
    discount_percent: 20,
    max_usage: 50,
    used_count: 3,
    expires_at: '2026-09-30T23:59:59Z',
    is_active: true,
  },
  {
    code: 'BULK15',
    discount_percent: 15,
    max_usage: 200,
    used_count: 0,
    expires_at: '2026-12-31T23:59:59Z',
    is_active: true,
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({
      ok: true,
      coupons: coupons.filter(c => c.is_active).map(c => ({
        code: c.code,
        discount_percent: c.discount_percent,
        remaining: c.max_usage - c.used_count,
      })),
    });
  }

  const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());

  if (!coupon) {
    return NextResponse.json({ ok: false, error: 'Kupon topilmadi' }, { status: 404 });
  }

  if (!coupon.is_active) {
    return NextResponse.json({ ok: false, error: 'Kupon faol emas' }, { status: 400 });
  }

  if (new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: 'Kupon muddati tugagan' }, { status: 400 });
  }

  if (coupon.used_count >= coupon.max_usage) {
    return NextResponse.json({ ok: false, error: 'Kupon limiti tugagan' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    coupon: {
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      is_valid: true,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, discount_percent, max_usage } = body;

    if (!code || !discount_percent) {
      return NextResponse.json({ ok: false, error: 'code and discount_percent required' }, { status: 400 });
    }

    const existing = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Bu kod allaqachon mavjud' }, { status: 400 });
    }

    const newCoupon: Coupon = {
      code: code.toUpperCase(),
      discount_percent,
      max_usage: max_usage || 1,
      used_count: 0,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days
      is_active: true,
    };
    coupons.push(newCoupon);

    return NextResponse.json({ ok: true, coupon: newCoupon });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
}

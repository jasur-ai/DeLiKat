import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { generateToken, TOKEN_COOKIE, verifyPbkdf2 } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email va parol kiritilishi shart' },
        { status: 400 }
      );
    }

    const user = await queryOne<any>(
      "SELECT id, name, email, phone, role, rating, is_admin, is_verified, xp, level, trust_score, created_at, password_hash FROM users WHERE email = $1 AND is_active = true",
      [email]
    );

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { ok: false, error: 'Email yoki parol notogri' },
        { status: 401 }
      );
    }

    // Verify using PBKDF2-SHA256 (Python-compatible)
    if (!verifyPbkdf2(password, user.password_hash)) {
      return NextResponse.json(
        { ok: false, error: 'Email yoki parol notogri' },
        { status: 401 }
      );
    }

    const token = generateToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role || 'xaridor',
        rating: user.rating || 0,
        is_admin: user.is_admin || false,
        is_verified: user.is_verified || false,
        xp: user.xp || 0,
        level: user.level || 1,
      },
    });

    response.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

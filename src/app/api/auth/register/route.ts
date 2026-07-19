import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { generateToken, hashPbkdf2, TOKEN_COOKIE } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, phone, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ ok: false, error: 'Name, email va parol kiritilishi shart' }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ ok: false, error: 'Parol kamida 4 belgi' }, { status: 400 });
    }

    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Bu email allaqachon royxatdan otgan' }, { status: 409 });
    }

    const userId = Math.floor(Math.random() * 10**15);
    const token = generateToken({ userId, email });
    const passwordHash = hashPbkdf2(password);

    await queryOne(
      `INSERT INTO users (id, name, email, phone, role, password_hash, auth_token, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
      [userId, name, email, phone || '', role || 'xaridor', passwordHash, token]
    );

    const response = NextResponse.json({
      ok: true,
      user: { id: userId, name, email, phone: phone || '', role: role || 'xaridor' },
    });

    response.cookies.set(TOKEN_COOKIE, token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 30 * 24 * 60 * 60, path: '/',
    });

    return response;
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

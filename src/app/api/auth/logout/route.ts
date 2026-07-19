import { NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true, message: 'Chiqildi' });
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}

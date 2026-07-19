import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '0.4.0',
    stack: 'nextjs-typescript',
    timestamp: new Date().toISOString(),
  });
}

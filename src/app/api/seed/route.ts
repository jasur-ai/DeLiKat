import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    message: 'Seed endpoint — run via Python script: cd api && python3 -c "from data.seed import seed; seed()"',
    note: 'Database seeding requires Python SQLAlchemy. Run locally.',
  });
}

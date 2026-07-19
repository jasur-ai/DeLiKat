import { NextRequest, NextResponse } from 'next/server';
import { query, Lot } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const grade = searchParams.get('grade');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('min_price');
    const maxPrice = searchParams.get('max_price');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = 'WHERE l.status = $1';
    const params: any[] = ['aktiv'];
    let paramIndex = 2;

    if (category && category !== 'all') {
      whereClause += ` AND l.category = $${paramIndex++}`;
      params.push(category);
    }
    if (grade) {
      whereClause += ` AND l.grade = $${paramIndex++}`;
      params.push(grade);
    }
    if (search) {
      whereClause += ` AND (l.title ILIKE $${paramIndex} OR l.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (minPrice) {
      whereClause += ` AND l.price >= $${paramIndex++}`;
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      whereClause += ` AND l.price <= $${paramIndex++}`;
      params.push(parseFloat(maxPrice));
    }

    // Validate sort column (prevent SQL injection)
    const allowedSort = ['created_at', 'price', 'title', 'quantity', 'view_count'];
    const sortCol = allowedSort.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM lots l ${whereClause}`,
      params
    );
    const total = parseInt(countResult[0]?.count || '0');

    const lots = await query<Lot>(
      `SELECT l.*, u.name as seller_name, u.rating as seller_rating
       FROM lots l
       LEFT JOIN users u ON l.seller_id = u.id
       ${whereClause}
       ORDER BY l.${sortCol} ${sortOrder}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      ok: true,
      lots,
      total,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Lots API error:', err);
    return NextResponse.json(
      { ok: false, error: 'Server error loading lots' },
      { status: 500 }
    );
  }
}

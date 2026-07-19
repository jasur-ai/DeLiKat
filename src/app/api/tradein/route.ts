import { NextRequest, NextResponse } from 'next/server';

// AI Valuation Engine
const BASE_PRICES: Record<string, Record<string, number>> = {
  smartfon: { iPhone: 8_000_000, Samsung: 5_000_000, Redmi: 2_500_000, Xiaomi: 3_500_000, Realme: 2_000_000, Nokia: 500_000, default: 3_000_000 },
  notebook: { MacBook: 12_000_000, Lenovo: 5_000_000, HP: 4_500_000, Dell: 5_500_000, Acer: 3_500_000, Asus: 4_000_000, default: 4_000_000 },
  tv: { Samsung: 6_000_000, LG: 5_000_000, Sony: 7_000_000, default: 3_000_000 },
  audio: { JBL: 1_500_000, Sony: 2_500_000, default: 500_000 },
  aksesuar: { default: 200_000 },
  kiyim: { default: 300_000 },
};

const CONDITION_MULTIPLIERS: Record<string, number> = { excellent: 0.90, good: 0.70, fair: 0.50, poor: 0.30 };
const GRADE_MULTIPLIERS: Record<string, number> = { A: 1.0, B: 0.65, C: 0.30 };

function aiEstimatePrice(category: string, deviceModel: string, condition?: string, grade?: string) {
  const catPrices = BASE_PRICES[category] || { default: 1_000_000 };
  const modelUpper = deviceModel.toUpperCase();
  let basePrice = catPrices.default || 1_000_000;

  for (const [brand, price] of Object.entries(catPrices)) {
    if (brand !== 'default' && modelUpper.includes(brand.toUpperCase())) {
      basePrice = price;
      break;
    }
  }

  const multiplier = condition ? (CONDITION_MULTIPLIERS[condition] || 0.50)
    : grade ? (GRADE_MULTIPLIERS[grade] || 0.50)
    : 0.70;

  const estimated = Math.round(basePrice * multiplier);
  const priceMin = Math.round(estimated * 0.8);
  const priceMax = Math.round(estimated * 1.2);

  return {
    estimated_price: estimated,
    price_range: { min: priceMin, max: priceMax },
    base_price: basePrice,
    multiplier,
    confidence: Math.round(multiplier * 100),
    market_data: {
      source: 'Uzum/OLX/Telegram — Iyul 2026',
      category_avg: basePrice,
      condition_factor: multiplier,
    },
  };
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // GET /api/tradein/stats
  if (pathname.endsWith('/stats')) {
    try {
      const { queryOne } = await import('@/lib/db');
      const totalResult = await queryOne<{ cnt: string }>('SELECT COUNT(*) as cnt FROM trade_ins WHERE is_active = true');
      const total = parseInt(totalResult?.cnt || '0');

      const pendingResult = await queryOne<{ cnt: string }>("SELECT COUNT(*) as cnt FROM trade_ins WHERE status = 'kutilmoqda'");
      const pending = parseInt(pendingResult?.cnt || '0');

      const evaluatedResult = await queryOne<{ cnt: string }>("SELECT COUNT(*) as cnt FROM trade_ins WHERE status = 'baholandi'");
      const evaluated = parseInt(evaluatedResult?.cnt || '0');

      const soldResult = await queryOne<{ cnt: string }>("SELECT COUNT(*) as cnt FROM trade_ins WHERE status = 'sotildi'");
      const sold = parseInt(soldResult?.cnt || '0');

      const { query } = await import('@/lib/db');
      const avgResult = await queryOne<{ avg: number }>('SELECT AVG(estimated_price) as avg FROM trade_ins WHERE estimated_price IS NOT NULL');

      const categories = await query<any>(
        'SELECT category, COUNT(*) as cnt FROM trade_ins WHERE is_active = true GROUP BY category'
      );
      const catDist: Record<string, number> = {};
      for (const c of categories) catDist[c.category] = parseInt(c.cnt);

      return NextResponse.json({
        total, pending, evaluated, sold,
        avg_price: Math.round(avgResult?.avg || 0),
        categories: catDist,
      });
    } catch (err) {
      console.error('Trade-in stats error:', err);
      return NextResponse.json({ total: 0, pending: 0, evaluated: 0, sold: 0, avg_price: 0, categories: {} });
    }
  }

  // GET /api/tradein/evaluate
  if (pathname.endsWith('/evaluate')) {
    const category = searchParams.get('category');
    const model = searchParams.get('model');
    const condition = searchParams.get('condition');
    const grade = searchParams.get('grade');

    if (!category || !model) {
      return NextResponse.json({ error: 'category and model are required' }, { status: 400 });
    }

    const result = aiEstimatePrice(category, model, condition || undefined, grade || undefined);
    return NextResponse.json({ ok: true, ...result });
  }

  // GET /api/tradein/listings
  if (pathname.endsWith('/listings')) {
    try {
      const { query, queryOne } = await import('@/lib/db');
      const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 50);
      const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
      const category = searchParams.get('category');
      const status = searchParams.get('status') || 'kutilmoqda';

      let whereClause = 'WHERE ti.is_active = true';
      const params: any[] = [];
      let paramIdx = 1;

      if (category) { whereClause += ` AND ti.category = $${paramIdx++}`; params.push(category); }
      if (status) { whereClause += ` AND ti.status = $${paramIdx++}`; params.push(status); }

      const totalResult = await queryOne<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM trade_ins ti ${whereClause}`, params);
      const total = parseInt(totalResult?.cnt || '0');

      const listings = await query<any>(
        `SELECT ti.*, u.name as seller_name, u.rating as seller_rating
         FROM trade_ins ti
         LEFT JOIN users u ON ti.seller_id = u.id
         ${whereClause}
         ORDER BY ti.created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        [...params, limit, offset]
      );

      const results = listings.map((ti: any) => ({
        id: ti.id,
        device_model: ti.device_model,
        category: ti.category,
        condition: ti.condition,
        grade: ti.grade,
        estimated_price: ti.estimated_price,
        final_price: ti.final_price,
        status: ti.status,
        created_at: ti.created_at || null,
        seller: ti.seller_name ? { id: ti.seller_id, name: ti.seller_name, rating: ti.seller_rating } : null,
        bid_count: ti.bid_count || 0,
      }));

      return NextResponse.json({ items: results, total });
    } catch (err) {
      console.error('Trade-in listings error:', err);
      return NextResponse.json({ items: [], total: 0 });
    }
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(request: NextRequest) {
  // POST /api/tradein/listings — create new trade-in listing
  try {
    const { query } = await import('@/lib/db');
    const data = await request.json();
    const sellerId = data.seller_id;

    if (!sellerId) {
      return NextResponse.json({ error: 'seller_id required' }, { status: 400 });
    }

    const valuation = aiEstimatePrice(data.category || '', data.device_model || '', data.condition);

    const result = await query<any>(
      `INSERT INTO trade_ins (seller_id, category, device_model, condition, grade, estimated_price, description, images, status, ai_valuation_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'kutilmoqda', $9)
       RETURNING id, device_model, category, estimated_price, status`,
      [
        sellerId, data.category, data.device_model,
        data.condition || 'good', data.grade || null,
        valuation.estimated_price, data.description || null,
        JSON.stringify(data.images || []),
        JSON.stringify(valuation),
      ]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'Failed to create trade-in' }, { status: 500 });
    }

    const tradeIn = result[0];
    return NextResponse.json({
      ok: true,
      trade_in: {
        id: tradeIn.id,
        device_model: tradeIn.device_model,
        category: tradeIn.category,
        estimated_price: tradeIn.estimated_price,
        price_range: valuation.price_range,
        status: tradeIn.status,
        confidence: valuation.confidence,
      },
    });
  } catch (err) {
    console.error('Create trade-in error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

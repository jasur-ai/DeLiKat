/** 🖼️ AI Vision API — Mahsulot rasmini tahlil qilish
 *
 * POST /api/vision  → analyze product image (5 features)
 * Body: { image_url, brand?, category?, title? }
 *
 * DEMO mode: GOOGLE_VISION_API_KEY bo'lmasa, mock javob
 * REAL mode: Google Cloud Vision API ga so'rov yuboradi
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeImage, isVisionDemoMode } from '@/lib/vision-api';
import { detectCounterfeit, quickCounterfeitCheck } from '@/lib/counterfeit-detector';
import { detectBrand } from '@/lib/product-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/vision
 * Body: { image_url, brand?, category?, title? }
 *
 * Returns:
 *   { ok, analysis, counterfeit, mode: 'real'|'demo' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image_url, brand: explicitBrand, category, title } = body;

    if (!image_url) {
      return NextResponse.json({ ok: false, error: 'image_url is required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(image_url);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid image_url format' }, { status: 400 });
    }

    const mode = isVisionDemoMode() ? 'demo' : 'real';

    // 1. Run Vision API analysis
    const analysis = await analyzeImage(image_url);

    if (!analysis.ok) {
      return NextResponse.json({
        ok: false,
        error: analysis.error || 'Image analysis failed',
        mode,
      }, { status: 400 });
    }

    // 2. Detect brand if not provided
    const brand = explicitBrand || detectBrand(title || image_url);

    // 3. Run counterfeit detection
    const counterfeit = detectCounterfeit(analysis, brand, category || 'unknown', title || '');

    // 4. Quick check for compact display
    const quick = quickCounterfeitCheck(analysis, brand);

    return NextResponse.json({
      ok: true,
      mode,
      analysis: {
        labels: analysis.labels,
        logos: analysis.logos,
        texts: analysis.texts.slice(0, 10), // Limit to 10 texts
        safe_search: analysis.safeSearch,
        objects: analysis.objects,
      },
      counterfeit,
      quick,
      summary: counterfeit.summary,
      is_verified: !counterfeit.isCounterfeit && counterfeit.score >= 80,
    });
  } catch (err) {
    console.error('Vision API error:', err);
    return NextResponse.json({
      ok: false,
      error: 'Server error',
      mode: isVisionDemoMode() ? 'demo' : 'real',
    }, { status: 500 });
  }
}

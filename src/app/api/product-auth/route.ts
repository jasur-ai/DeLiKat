/** 🏷️ Mahsulot autentifikatsiyasi API — Serial/IMEI + AI rasm
 *
 * GET  /api/product-auth?lot_id=1       → lot verification status
 * GET  /api/product-auth?imei=356307...  → IMEI lookup across all products
 * GET  /api/product-auth?serial=SN123... → serial lookup
 * GET  /api/product-auth?recent=true     → recent verifications
 * POST /api/product-auth                 → verify product (IMEI/serial/image)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProductVerification,
  verifyProduct,
  saveVerification,
  detectBrand,
  getVerificationBadge,
  validateIMEI,
  validateSerialNumber,
} from '@/lib/product-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/product-auth
 * Query params: lot_id | imei | serial | recent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lot_id');
    const imei = searchParams.get('imei');
    const serial = searchParams.get('serial');
    const recent = searchParams.get('recent');

    // Recent verifications list — derived from MOCK_VERIFIED_PRODUCTS
    if (recent === 'true') {
      const { MOCK_VERIFIED_PRODUCTS } = await import('@/lib/product-auth');
      const recent = MOCK_VERIFIED_PRODUCTS.map(v => ({
        code: v.imei || v.serial_number || '',
        type: (v.imei ? 'imei' : 'serial') as 'imei' | 'serial',
        brand: v.brand,
        status: v.status,
        score: v.score,
        checked_at: v.checked_at,
      }));
      return NextResponse.json({ ok: true, recent });
    }

    // IMEI or Serial lookup (standalone, no lot_id needed)
    if (imei || serial) {
      if (imei) {
        const result = validateIMEI(imei);
        const badge = getVerificationBadge(result.valid ? 'verified' : 'failed', result.valid ? 95 : 10);
        return NextResponse.json({
          ok: true,
          lookup: { type: 'imei', code: imei, ...result },
          status: result.valid ? 'verified' : 'failed',
          score: result.valid ? 95 : 10,
          badge,
          // Generate a mock combined result for standalone lookup
          combined: result.valid
            ? { verified: true, confidence: 95, notes: `✅ IMEI raqam ${imei} muvaffaqiyatli tekshirildi. Luhn checksum: to'g'ri.` }
            : { verified: false, confidence: 10, notes: `❌ ${result.error}` },
          certificate_url: result.valid ? `/certificates/imei_${imei}.pdf` : undefined,
        });
      }
      if (serial) {
        const result = validateSerialNumber(serial);
        const badge = getVerificationBadge(result.valid ? 'verified' : 'failed', result.valid ? 90 : 15);
        return NextResponse.json({
          ok: true,
          lookup: { type: 'serial', code: serial, ...result },
          status: result.valid ? 'verified' : 'failed',
          score: result.valid ? 90 : 15,
          badge,
          combined: result.valid
            ? { verified: true, confidence: 90, notes: `✅ Serial raqam ${serial} muvaffaqiyatli tekshirildi. Brend: ${result.brand || 'unknown'}.` }
            : { verified: false, confidence: 15, notes: `❌ ${result.error}` },
          certificate_url: result.valid ? `/certificates/serial_${serial}.pdf` : undefined,
        });
      }
    }

    if (!lotId) {
      return NextResponse.json({ ok: false, error: 'lot_id, imei, serial, or recent=true required' }, { status: 400 });
    }

    const result = await getProductVerification(parseInt(lotId));

    if (result.verification) {
      const badge = getVerificationBadge(result.verification.status, result.verification.score);
      return NextResponse.json({ ...result, badge });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Product auth GET error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/product-auth
 * Body: { lot_id, title, imei?, serial_number?, image_urls? }
 * For standalone verify: { lot_id: 0, title: "IMEI: ...", imei: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lot_id, title, imei, serial_number, image_urls } = body;

    if (!title) {
      return NextResponse.json({ ok: false, error: 'title is required' }, { status: 400 });
    }

    const lotId = parseInt(lot_id || '0');

    // Run verification
    const result = await verifyProduct({
      lot_id: lotId,
      title,
      imei,
      serial_number,
      image_urls,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    // Save if lot_id is valid
    if (lotId > 0) {
      const brand = detectBrand(title);
      await saveVerification(lotId, result, brand, title);
    }

    // Add badge info
    const badge = getVerificationBadge(result.status, result.score);

    return NextResponse.json({ ...result, badge });
  } catch (err) {
    console.error('Product auth POST error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

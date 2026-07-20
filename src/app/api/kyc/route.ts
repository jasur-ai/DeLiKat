/** 🔐 KYC API — Identifikatsiya tizimi
 *
 * GET  /api/kyc?userId=1       → KYC status
 * POST /api/kyc                 → submit KYC application
 * POST /api/kyc?action=verify   → admin verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { getKyc, submitKyc, verifyKyc, getKycStats, KycSubmitInput } from '@/lib/kyc';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/kyc
 * - ?userId=1 — get KYC status for user
 * - ?stats=true — get KYC statistics
 * - ?all=true — get all KYC records (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const stats = searchParams.get('stats');

    if (stats === 'true') {
      const kycStats = await getKycStats();
      return NextResponse.json({ ok: true, ...kycStats });
    }

    if (userId) {
      const result = await getKyc(parseInt(userId));
      return NextResponse.json(result);
    }

    return NextResponse.json({ ok: false, error: 'userId or stats is required' }, { status: 400 });
  } catch (err) {
    console.error('KYC GET error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/kyc
 * Body: { user_id, full_name, document_type, document_number, phone, stir?, passport_photo_url?, selfie_url? }
 *
 * POST /api/kyc?action=verify
 * Body: { kyc_id, action: 'approve'|'reject', admin_notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    // ─── Admin verification ──────────────────────────────────
    if (action === 'verify') {
      const { kyc_id, verify_action, admin_notes } = body;

      if (!kyc_id || !verify_action) {
        return NextResponse.json({
          ok: false,
          error: 'kyc_id and verify_action (approve|reject) are required',
        }, { status: 400 });
      }

      if (verify_action !== 'approve' && verify_action !== 'reject') {
        return NextResponse.json({
          ok: false,
          error: 'verify_action must be "approve" or "reject"',
        }, { status: 400 });
      }

      const result = await verifyKyc(parseInt(kyc_id), verify_action, admin_notes);
      return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
    }

    // ─── Submit KYC application ───────────────────────────────
    const {
      user_id, full_name, document_type, document_number,
      phone, stir, passport_photo_url, selfie_url,
    } = body;

    if (!user_id || !full_name || !document_type || !document_number || !phone) {
      return NextResponse.json({
        ok: false,
        error: 'user_id, full_name, document_type, document_number, phone are required',
      }, { status: 400 });
    }

    const validDocTypes = ['passport', 'id_card', 'driver_license'];
    if (!validDocTypes.includes(document_type)) {
      return NextResponse.json({
        ok: false,
        error: 'document_type must be passport, id_card, or driver_license',
      }, { status: 400 });
    }

    const input: KycSubmitInput = {
      user_id: parseInt(user_id),
      full_name,
      document_type,
      document_number,
      phone,
      stir,
      passport_photo_url,
      selfie_url,
    };

    const result = await submitKyc(input);

    // Update user is_verified if approved automatically
    if (result.ok && result.kyc?.status === 'verified') {
      try {
        const { execute } = await import('@/lib/db');
        await execute('UPDATE users SET is_verified = true WHERE id = $1', [input.user_id]);
      } catch {
        // Mock mode — ignore DB error
      }
    }

    return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
  } catch (err) {
    console.error('KYC POST error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

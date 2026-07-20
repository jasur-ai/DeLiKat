/** 🏛️ Fiscal API — fiskal cheklarni boshqarish
 *
 * GET  /api/fiscal — fiskal statusni tekshirish
 * POST /api/fiscal — fiskal operatsiyalar
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createFiscalReceipt, payFiscalReceipt, confirmFiscalReceipt,
  getFiscalReceiptStatus, getFiscalByOrderId, getAllFiscalReceipts,
  getFiscalStats, handleFiscalDataCallback, cancelFiscalReceipt,
  processFiscalPayment, searchIkpu, lookupIkpu,
  CreateFiscalReceiptInput, FiscalDataCallback,
} from '@/lib/fiscal';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/fiscal
 * - ?receipt_id=X — specific receipt status
 * - ?order_id=X — get receipt by order
 * - ?stats=true — fiscal statistics
 * - ?list=true — all receipts
 * - ?search_ikpu=code — IKPU kod qidirish
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const receiptId = searchParams.get('receipt_id');
    const orderId = searchParams.get('order_id');
    const stats = searchParams.get('stats');
    const list = searchParams.get('list');
    const searchIkpuQ = searchParams.get('search_ikpu');
    const lookupIkpuQ = searchParams.get('lookup_ikpu');

    // IKPU kod qidirish
    if (searchIkpuQ) {
      const results = searchIkpu(searchIkpuQ);
      return NextResponse.json({ ok: true, results });
    }

    // IKPU kod bo'yicha ma'lumot
    if (lookupIkpuQ) {
      const info = lookupIkpu(lookupIkpuQ);
      return NextResponse.json({ ok: !!info, info });
    }

    // Fiskal statistika
    if (stats === 'true') {
      const fiscalStats = await getFiscalStats();
      return NextResponse.json({ ok: true, stats: fiscalStats });
    }

    // Barcha cheklar
    if (list === 'true') {
      const receipts = await getAllFiscalReceipts();
      return NextResponse.json({ ok: true, receipts });
    }

    // Bitta chek statusi
    if (receiptId) {
      const receipt = await getFiscalReceiptStatus(receiptId);
      if (!receipt) {
        return NextResponse.json({ ok: false, error: 'Fiskal chek topilmadi' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, receipt });
    }

    // Buyurtma bo'yicha
    if (orderId) {
      const receipt = await getFiscalByOrderId(orderId);
      if (!receipt) {
        return NextResponse.json({ ok: false, error: 'Fiskal chek topilmadi' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, receipt });
    }

    return NextResponse.json({
      ok: false,
      error: 'receipt_id, order_id, stats=true, list=true, search_ikpu yoki lookup_ikpu talab qilinadi',
    }, { status: 400 });
  } catch (err) {
    console.error('Fiscal GET error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/fiscal
 *
 * Fiskal operatsiyalar:
 * - { action: "create", order_id, amount, items?, description? }
 * - { action: "pay", receipt_id, token, phone }
 * - { action: "confirm", receipt_id }
 * - { action: "set_fiscal_data", receipt_id, fiscal_data }
 * - { action: "process_full", order_id, amount, token, phone, items? }
 * - { action: "cancel", receipt_id }
 * - { action: "handle_callback", receipt_id, fiscal_data }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({
        ok: false,
        error: 'action required: create, pay, confirm, set_fiscal_data, process_full, cancel, handle_callback',
      }, { status: 400 });
    }

    switch (action) {
      case 'create': {
        // Fiskal chek yaratish
        const { order_id, amount, items, description, shipping_title, shipping_price } = body;
        if (!order_id || !amount) {
          return NextResponse.json({ ok: false, error: 'order_id va amount talab qilinadi' }, { status: 400 });
        }

        const input: CreateFiscalReceiptInput = {
          orderId: order_id,
          amount: parseFloat(amount),
          description: description || undefined,
          shippingTitle: shipping_title || undefined,
          shippingPrice: shipping_price ? parseFloat(shipping_price) : undefined,
          items: items || undefined,
        };

        const result = await createFiscalReceipt(input);
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'pay': {
        // Fiskal chek bo'yicha to'lov
        const { receipt_id, token, phone } = body;
        if (!receipt_id || !token || !phone) {
          return NextResponse.json({ ok: false, error: 'receipt_id, token va phone talab qilinadi' }, { status: 400 });
        }

        const result = await payFiscalReceipt(receipt_id, token, phone);
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'confirm': {
        // Fiskal chekni tasdiqlash
        const { receipt_id } = body;
        if (!receipt_id) {
          return NextResponse.json({ ok: false, error: 'receipt_id talab qilinadi' }, { status: 400 });
        }

        const result = await confirmFiscalReceipt(receipt_id);
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'set_fiscal_data': {
        // OFD ma'lumotlarini Payme ga yuborish
        const { receipt_id, fiscal_data } = body;
        if (!receipt_id || !fiscal_data) {
          return NextResponse.json({ ok: false, error: 'receipt_id va fiscal_data talab qilinadi' }, { status: 400 });
        }

        const result = await handleFiscalDataCallback(receipt_id, fiscal_data);
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'process_full': {
        // To'liq fiskal sikl: create → pay → confirm
        const { order_id, amount, token, phone, items, description } = body;
        if (!order_id || !amount || !token || !phone) {
          return NextResponse.json({
            ok: false,
            error: 'order_id, amount, token va phone talab qilinadi',
          }, { status: 400 });
        }

        const input: CreateFiscalReceiptInput = {
          orderId: order_id,
          amount: parseFloat(amount),
          description: description || undefined,
          items: items || undefined,
        };

        const result = await processFiscalPayment(input, token, phone);
        return NextResponse.json({
          ok: result.ok,
          receipt: result.receipt,
          qr_code_url: result.qr_code_url,
          error: result.error,
        }, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'cancel': {
        // Fiskal chekni bekor qilish
        const { receipt_id } = body;
        if (!receipt_id) {
          return NextResponse.json({ ok: false, error: 'receipt_id talab qilinadi' }, { status: 400 });
        }

        const result = await cancelFiscalReceipt(receipt_id);
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      case 'handle_callback': {
        // OFD callback ni qabul qilish
        const { receipt_id, fiscal_data } = body;
        if (!receipt_id || !fiscal_data) {
          return NextResponse.json({ ok: false, error: 'receipt_id va fiscal_data talab qilinadi' }, { status: 400 });
        }

        const result = await handleFiscalDataCallback(receipt_id, fiscal_data as FiscalDataCallback['fiscal_data']);
        return NextResponse.json(result, result.ok ? { status: 200 } : { status: 400 });
      }

      default:
        return NextResponse.json({ ok: false, error: `Noma'lum action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('Fiscal POST error:', err);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

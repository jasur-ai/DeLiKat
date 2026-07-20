/** 💳 Click.uz Merchant API — REAL produksiya integratsiyasi
 *
 * SHOP API (Prepare/Complete) + Merchant REST API (Invoice/Payment/Refund).
 * Demo mode: agar CLICK_SERVICE_ID bo'lmasa, mock javob qaytaradi.
 * Real mode: CLICK_SERVICE_ID, CLICK_MERCHANT_ID, CLICK_SECRET_KEY talab qilinadi.
 */

import { createHash } from 'crypto';

// ─── Konstantalar ───────────────────────────────────────────────

const CLICK_BASE = 'https://api.click.uz/v2';

// ─── Turlar ─────────────────────────────────────────────────────

export interface ClickCredentials {
  serviceId: string;
  merchantId: string;
  secretKey: string;
  sandbox: boolean;
}

// SHOP API — Prepare so'rovi (Click sizni tekshiradi)
export interface ClickPrepareRequest {
  click_trans_id: number;
  service_id: number;
  merchant_trans_id: string;
  amount: number;
  action: 0;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
  click_paydoc_id: number;
}

// SHOP API — Complete so'rovi (Click to'lovni tasdiqlaydi)
export interface ClickCompleteRequest {
  click_trans_id: number;
  service_id: number;
  merchant_trans_id: string;
  amount: number;
  action: 1;
  error: number;
  error_note: string;
  sign_time: string;
  sign_string: string;
  click_paydoc_id: number;
  merchant_prepare_id: number;
}

// SHOP API — Javob formati
export interface ClickShopResponse {
  error: number;
  error_note: string;
  merchant_trans_id?: string;
  merchant_confirm_id?: number;
}

// Invoicing
export interface ClickInvoice {
  invoice_id: string;
  merchant_trans_id: string;
  amount: number;
  state: number;
  error: number;
  error_note: string;
}

// ─── Credentials ────────────────────────────────────────────────

const DEMO_SERVICE_ID = 'DEMO_SERVICE';
const DEMO_MERCHANT_ID = 'DEMO_MERCHANT';
const DEMO_SECRET_KEY = 'DEMO_SECRET';

export function getClickConfig(): ClickCredentials {
  return {
    serviceId: process.env.CLICK_SERVICE_ID || DEMO_SERVICE_ID,
    merchantId: process.env.CLICK_MERCHANT_ID || DEMO_MERCHANT_ID,
    secretKey: process.env.CLICK_SECRET_KEY || DEMO_SECRET_KEY,
    sandbox: process.env.CLICK_SANDBOX === 'true' || !process.env.CLICK_SERVICE_ID,
  };
}

export function isClickDemoMode(): boolean {
  return !process.env.CLICK_SERVICE_ID || process.env.CLICK_SERVICE_ID === DEMO_SERVICE_ID;
}

// ─── Signature handling ─────────────────────────────────────────

/**
 * Click so'rov imzosini generatsiya qilish
 * Formula: MD5(click_trans_id + secret_key + merchant_trans_id + amount + action + sign_time)
 */
export function generateClickSign(
  clickTransId: number,
  merchantTransId: string,
  amount: number,
  action: number,
  signTime: string
): string {
  const config = getClickConfig();
  return createHash('md5')
    .update(`${clickTransId}${config.secretKey}${merchantTransId}${amount}${action}${signTime}`)
    .digest('hex');
}

/**
 * Click so'rov imzosini tekshirish
 */
export function verifyClickSign(
  clickTransId: number,
  merchantTransId: string,
  amount: number,
  action: number,
  signTime: string,
  signString: string
): boolean {
  const expected = generateClickSign(clickTransId, merchantTransId, amount, action, signTime);
  return expected === signString;
}

// ─── SHOP API Handler'lar ───────────────────────────────────────

/**
 * Prepare (action=0) — Click tekshiradi: "Bu buyurtma to'lovga tayyormi?"
 *
 * @returns ClickShopResponse — error=0 bo'lsa muvaffaqiyatli
 */
export function handlePrepare(data: ClickPrepareRequest): ClickShopResponse {
  // 1. Imzoni tekshirish
  if (!isClickDemoMode()) {
    const valid = verifyClickSign(
      data.click_trans_id,
      data.merchant_trans_id,
      data.amount,
      0,
      data.sign_time,
      data.sign_string
    );
    if (!valid) {
      return {
        error: -1,
        error_note: 'Sign check failed!',
        merchant_trans_id: data.merchant_trans_id,
      };
    }
  }

  // 2. Muvaffaqiyatli — merchant_confirm_id qaytarish
  return {
    error: 0,
    error_note: 'Success',
    merchant_trans_id: data.merchant_trans_id,
    merchant_confirm_id: Date.now(),
  };
}

/**
 * Complete (action=1) — Click to'lovni tasdiqlaydi
 *
 * @returns ClickShopResponse — error=0 bo'lsa muvaffaqiyatli
 */
export function handleComplete(data: ClickCompleteRequest): ClickShopResponse {
  // 1. Imzoni tekshirish
  if (!isClickDemoMode()) {
    const valid = verifyClickSign(
      data.click_trans_id,
      data.merchant_trans_id,
      data.amount,
      1,
      data.sign_time,
      data.sign_string
    );
    if (!valid) {
      return {
        error: -1,
        error_note: 'Sign check failed!',
        merchant_trans_id: data.merchant_trans_id,
      };
    }
  }

  // 2. Muvaffaqiyatli
  return {
    error: 0,
    error_note: 'Success',
    merchant_trans_id: data.merchant_trans_id,
    merchant_confirm_id: data.merchant_prepare_id || Date.now(),
  };
}

// ─── Merchant REST API ──────────────────────────────────────────

/**
 * Click Merchant REST API ga so'rov yuborish
 * Autentifikatsiya: Basic Auth (merchant_id:secret_key base64)
 */
async function clickApiCall(
  endpoint: string,
  body: Record<string, any>
): Promise<Record<string, any>> {
  const config = getClickConfig();
  const url = `${CLICK_BASE}/merchant/${endpoint}`;

  // Basic Auth
  const auth = Buffer.from(`${config.merchantId}:${config.secretKey}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error && data.error !== 0) {
    console.error(`Click API error [${endpoint}]:`, data.error_note || data);
  }
  return data;
}

// ─── Invoice Management ─────────────────────────────────────────

/**
 * createInvoice — To'lov uchun invoice yaratish
 * Click orqali foydalanuvchiga to'lov havolasi yuborish
 *
 * @param merchantTransId - bizning tizimdagi tranzaksiya ID
 * @param amount - summa (UZS)
 * @param userId - foydalanuvchi ID (ixtiyoriy, Click profiling)
 */
export async function createInvoice(
  merchantTransId: string,
  amount: number,
  userId?: string
): Promise<ClickInvoice | null> {
  if (isClickDemoMode()) {
    return {
      invoice_id: `demo_invoice_${Date.now()}`,
      merchant_trans_id: merchantTransId,
      amount,
      state: 0,
      error: 0,
      error_note: 'Success (demo)',
    };
  }

  const data = await clickApiCall('invoice/create', {
    merchant_trans_id: merchantTransId,
    amount,
    user_id: userId || '0',
  });

  if (data.error && data.error !== 0) return null;
  return {
    invoice_id: data.invoice_id,
    merchant_trans_id: merchantTransId,
    amount,
    state: data.state || 0,
    error: data.error || 0,
    error_note: data.error_note || 'Success',
  };
}

/**
 * checkInvoice — Invoice holatini tekshirish
 */
export async function checkInvoice(invoiceId: string): Promise<ClickInvoice | null> {
  if (isClickDemoMode()) {
    return {
      invoice_id: invoiceId,
      merchant_trans_id: '',
      amount: 0,
      state: 2,
      error: 0,
      error_note: 'Success (demo)',
    };
  }

  const data = await clickApiCall('invoice/check', { invoice_id: invoiceId });
  if (data.error && data.error !== 0) return null;
  return data as ClickInvoice;
}

// ─── Payment Status ─────────────────────────────────────────────

/**
 * checkPaymentByMerchantTransId — Bizning ID bo'yicha to'lov holatini tekshirish
 */
export async function checkPaymentByMerchantTransId(
  merchantTransId: string
): Promise<{ payment_id: string; amount: number; state: number } | null> {
  if (isClickDemoMode()) {
    return {
      payment_id: `demo_payment_${Date.now()}`,
      amount: 0,
      state: 2,
    };
  }

  const data = await clickApiCall('payment/merchant_trans_id', { merchant_trans_id: merchantTransId });
  if (data.error && data.error !== 0) return null;
  return {
    payment_id: data.payment_id,
    amount: parseFloat(data.amount || '0'),
    state: data.state || 0,
  };
}

/**
 * checkPaymentById — Click payment ID bo'yicha tekshirish
 */
export async function checkPaymentById(paymentId: string): Promise<any> {
  if (isClickDemoMode()) {
    return { payment_id: paymentId, state: 2, error: 0, error_note: 'Success (demo)' };
  }
  return clickApiCall('payment/status', { payment_id: paymentId });
}

// ─── Refund ─────────────────────────────────────────────────────

/**
 * refundPayment — To'lovni qaytarish
 *
 * @param paymentId - Click to'lov ID
 * @param amount - qaytariladigan summa (UZS)
 * @param reason - qaytarish sababi
 */
export async function refundPayment(
  paymentId: string,
  amount: number,
  reason?: string
): Promise<{ error: number; error_note: string }> {
  if (isClickDemoMode()) {
    return { error: 0, error_note: 'Refund successful (demo)' };
  }

  return clickApiCall('cancel', {
    payment_id: paymentId,
    amount,
    reason: reason || 'Buyurtma bekor qilindi',
  }) as Promise<{ error: number; error_note: string }>;
}

// ─── Click Payment URL ──────────────────────────────────────────

/**
 * Click to'lov sahifasiga havola yaratish
 */
export function generateClickPaymentUrl(
  merchantTransId: string,
  amount: number,
  userId?: string
): string {
  const config = getClickConfig();
  const params = new URLSearchParams({
    service_id: config.serviceId,
    merchant_id: config.merchantId,
    merchant_trans_id: merchantTransId,
    amount: String(amount),
  });
  if (userId) params.set('user_id', userId);
  return `https://my.click.uz/auth?${params.toString()}`;
}

// ─── Click Error Codes Reference ────────────────────────────────

export const CLICK_ERROR_CODES: Record<number, string> = {
  [-99]: 'Ichki server xatoligi',
  [-8]: 'Noto\'g\'ri so\'rov parametrlari',
  [-5]: 'Buyurtma topilmadi',
  [-4]: 'Foydalanuvchi topilmadi',
  [-3]: 'Noto\'g\'ri autentifikatsiya',
  [-2]: 'Noto\'g\'ri summa',
  [-1]: 'So\'rov imzosi noto\'g\'ri',
  0: 'Muvaffaqiyatli',
};

export function getClickErrorMessage(code: number): string {
  return CLICK_ERROR_CODES[code] || `Noma'lum xatolik (${code})`;
}

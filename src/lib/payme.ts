/** 💳 Payme Merchant API — REAL produksiya integratsiyasi
 *
 * JSON-RPC 2.0 spec bo'yicha to'liq implementatsiya.
 * Demo mode: agar PAYME_MERCHANT_ID bo'lmasa, mock javob qaytaradi.
 * Real mode: PAYME_MERCHANT_ID va PAYME_MERCHANT_KEY talab qilinadi.
 */

// ─── Konstantalar ───────────────────────────────────────────────

const PAYME_BASE = 'https://checkout.paycom.uz';
const PAYME_SANDBOX = 'https://test.checkout.paycom.uz';

// ─── Turlar ─────────────────────────────────────────────────────

export interface PaymeCredentials {
  merchantId: string;
  merchantKey: string;
  sandbox: boolean;
}

// Payme JSON-RPC so'rov/javob
export interface PaymeRequest {
  id: number;
  method: string;
  params: Record<string, any>;
}

export interface PaymeResponse {
  id: number;
  result?: Record<string, any>;
  error?: { code: number; message: string | Record<string, string> };
}

// Payme tranzaksiya holati
export interface PaymeTransactionResult {
  transaction: string;    // payme_transaction_id
  state: number;          // 0=created, 1=reserved, 2=confirmed, -1=cancelled
  create_time: number;
  perform_time?: number;
  cancel_time?: number;
  reason?: number;
}

// Kartani tokenizatsiya qilish
export interface PaymeCardToken {
  card_token: string;
  phone: string;
  expire_date: string;
  recurrent: boolean;
  verify_code?: string;
}

// Fiskal ma'lumotlar
export interface PaymeFiscalData {
  receipt_type: number;      // 0=simple, 1=full
  tin: string;               // STIR
  tax_category: string;      // Soliq kategoriyasi
  items: Array<{
    title: string;
    price: number;           // tiyinda
    count: number;
    package_code: string;    // O'z DSt kod
    vat_percent: number;     // QQS (12%)
  }>;
}

// ─── Konfiguratsiya ─────────────────────────────────────────────

const DEMO_MERCHANT_ID = 'DEMO_MERCHANT';
const DEMO_MERCHANT_KEY = 'DEMO_KEY';

export function getPaymeConfig(): PaymeCredentials {
  return {
    merchantId: process.env.PAYME_MERCHANT_ID || DEMO_MERCHANT_ID,
    merchantKey: process.env.PAYME_MERCHANT_KEY || DEMO_MERCHANT_KEY,
    sandbox: process.env.PAYME_SANDBOX === 'true' || !process.env.PAYME_MERCHANT_ID,
  };
}

export function isPaymeDemoMode(): boolean {
  return process.env.PAYME_MERCHANT_ID === undefined || process.env.PAYME_MERCHANT_ID === DEMO_MERCHANT_ID;
}

// ─── Base API Call ──────────────────────────────────────────────

/**
 * Payme JSON-RPC API ga so'rov yuborish
 * Autentifikatsiya: Basic Auth (merchant_id:merchant_key base64)
 */
export async function paymeCall(method: string, params: Record<string, any>): Promise<PaymeResponse> {
  const config = getPaymeConfig();
  const baseUrl = config.sandbox ? PAYME_SANDBOX : PAYME_BASE;
  const url = `${baseUrl}/api`;

  const body: PaymeRequest = {
    id: Date.now(),
    method,
    params,
  };

  // Auth header: Payme expects raw merchant_id:merchant_key format
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth': `${config.merchantId}:${config.merchantKey}`,
    },
    body: JSON.stringify(body),
  });

  const data: PaymeResponse = await res.json();

  if (data.error) {
    console.error(`Payme API error [${method}]:`, data.error);
  }

  return data;
}

// ─── Merchant API Methods ──────────────────────────────────────

/**
 * CheckPerformTransaction — Payme sizning serverni tekshiradi:
 * "Bu buyurtma uchun to'lov qabul qilish mumkinmi?"
 *
 * @param orderId - buyurtma ID (escrow_123)
 * @param amount - summa (tiyinda: 10000 = 100 so'm)
 */
export async function checkPerformTransaction(
  orderId: string,
  amount: number
): Promise<{ allowed: boolean; error?: string }> {
  if (isPaymeDemoMode()) return { allowed: true };

  const res = await paymeCall('CheckPerformTransaction', {
    amount,
    account: { order_id: orderId },
  });

  if (res.error) {
    const msg = typeof res.error.message === 'string' ? res.error.message : res.error.message?.uz || 'Error';
    return { allowed: false, error: msg };
  }

  return { allowed: true };
}

/**
 * CreateTransaction — Payme tranzaksiyasini yaratish
 * Payme dan kelgan so'rov asosida tranzaksiyani ro'yxatga olish
 *
 * @param orderId - buyurtma ID
 * @param amount - summa (tiyinda)
 * @param transactionId - Payme tomonidan berilgan transaction ID
 * @param time - Payme tomonidan berilgan vaqt
 */
export async function createTransaction(
  orderId: string,
  amount: number,
  transactionId: string,
  time: number
): Promise<PaymeTransactionResult | null> {
  if (isPaymeDemoMode()) {
    return {
      transaction: `demo_${transactionId}`,
      state: 1,
      create_time: time,
    };
  }

  const res = await paymeCall('CreateTransaction', {
    id: transactionId,
    time,
    amount,
    account: { order_id: orderId },
  });

  if (res.error) return null;
  return res.result as PaymeTransactionResult;
}

/**
 * PerformTransaction — To'lovni yakunlash
 * Payme pulni harakatlantirgandan so'ng chaqiriladi
 *
 * @param transactionId - Payme transaction ID
 */
export async function performTransaction(
  transactionId: string
): Promise<PaymeTransactionResult | null> {
  if (isPaymeDemoMode()) {
    return {
      transaction: transactionId,
      state: 2,
      create_time: Date.now() - 60000,
      perform_time: Date.now(),
    };
  }

  const res = await paymeCall('PerformTransaction', { id: transactionId });
  if (res.error) return null;
  return res.result as PaymeTransactionResult;
}

/**
 * CancelTransaction — To'lovni bekor qilish / qaytarish
 *
 * @param transactionId - Payme transaction ID
 * @param reason - bekor qilish sababi:
 *   1= foydalanuvchi bekor qildi
 *   2= muddat o'tdi
 *   3= xatolik
 *   4= admin bekor qildi
 */
export async function cancelTransaction(
  transactionId: string,
  reason: number
): Promise<PaymeTransactionResult | null> {
  if (isPaymeDemoMode()) {
    return {
      transaction: transactionId,
      state: -1,
      create_time: Date.now() - 60000,
      perform_time: Date.now() - 30000,
      cancel_time: Date.now(),
      reason,
    };
  }

  const res = await paymeCall('CancelTransaction', { id: transactionId, reason });
  if (res.error) return null;
  return res.result as PaymeTransactionResult;
}

/**
 * CheckTransaction — Tranzaksiya holatini tekshirish
 */
export async function checkTransaction(
  transactionId: string
): Promise<PaymeTransactionResult | null> {
  if (isPaymeDemoMode()) {
    return {
      transaction: transactionId,
      state: 2,
      create_time: Date.now() - 60000,
      perform_time: Date.now(),
    };
  }

  const res = await paymeCall('CheckTransaction', { id: transactionId });
  if (res.error) return null;
  return res.result as PaymeTransactionResult;
}

// ─── Receipt API (kvitansiya boshqaruvi) ────────────────────────

/**
 * receipts_create — To'lov kvitansiyasini yaratish
 * Bu usul orqali Payme da to'lov uchun kvitansiya ochiladi
 *
 * @param amount - summa (tiyinda)
 * @param orderId - buyurtma ID
 * @param fiscalData - fiskal ma'lumotlar (ixtiyoriy)
 */
export async function createReceipt(
  amount: number,
  orderId: string,
  fiscalData?: PaymeFiscalData
): Promise<{ receipt_id: string; state: number } | null> {
  if (isPaymeDemoMode()) {
    return { receipt_id: `demo_receipt_${Date.now()}`, state: 0 };
  }

  const params: Record<string, any> = {
    amount,
    account: [{ field: 'order_id', value: orderId }],
    detail: {
      receipt_type: 0,
      shipping: { title: 'DeLiKet ESCROW', price: 0 },
      items: fiscalData?.items || [
        { title: 'DeLiKet Marketplace', price: amount, count: 1, package_code: '0000000', vat_percent: 0 },
      ],
    },
  };

  const res = await paymeCall('ReceiptsCreate', params);
  if (res.error) return null;
  return { receipt_id: res.result?.receipt_id, state: res.result?.state };
}

/**
 * receipts_pay — Kvitansiya bo'yicha to'lovni amalga oshirish
 * Card tokeni orqali to'lovni yakunlash
 *
 * @param receiptId - kvitansiya ID
 * @param token - karta tokeni
 * @param phone - telefon raqam
 */
export async function payReceipt(
  receiptId: string,
  token: string,
  phone: string
): Promise<{ state: number; perform_time: number } | null> {
  if (isPaymeDemoMode()) {
    return { state: 2, perform_time: Date.now() };
  }

  const res = await paymeCall('ReceiptsPay', {
    id: receiptId,
    token,
    phone,
  });

  if (res.error) return null;
  return { state: res.result?.state, perform_time: res.result?.perform_time };
}

/**
 * receipts_confirm — Kvitansiyani tasdiqlash
 * To'lov muvaffaqiyatli bo'lgandan so'ng tasdiqlash
 *
 * @param receiptId - kvitansiya ID
 */
export async function confirmReceipt(receiptId: string): Promise<{ state: number } | null> {
  if (isPaymeDemoMode()) {
    return { state: 2 };
  }

  const res = await paymeCall('ReceiptsConfirm', { id: receiptId });
  if (res.error) return null;
  return { state: res.result?.state };
}

// ─── Card Tokenization API ──────────────────────────────────────

/**
 * cards_create — Yangi karta tokenini yaratish
 * Foydalanuvchi kartasini xavfsiz saqlash uchun token
 *
 * @param cardNumber - karta raqami
 * @param expireDate - amal qilish muddati (MM/YY)
 */
export async function createCardToken(
  cardNumber: string,
  expireDate: string
): Promise<{ card_token: string; code?: string } | null> {
  if (isPaymeDemoMode()) {
    return { card_token: `demo_card_${Date.now()}` };
  }

  const res = await paymeCall('CardsCreate', {
    card: { number: cardNumber, expire: expireDate },
    save: true,
  });

  if (res.error) return null;
  return { card_token: res.result?.card_token, code: res.result?.code };
}

/**
 * cards_verify — Karta tokenini tasdiqlash (SMS kod orqali)
 */
export async function verifyCardToken(
  cardToken: string,
  code: string
): Promise<{ card_token: string; phone: string } | null> {
  if (isPaymeDemoMode()) {
    return { card_token: cardToken, phone: '+998901234567' };
  }

  const res = await paymeCall('CardsVerify', { token: cardToken, code });
  if (res.error) return null;
  return res.result as any;
}

// ─── Subscribe API (periodik to'lovlar) ─────────────────────────

/**
 * Recurring to'lovni amalga oshirish
 * Saqlangan karta tokeni orqali qayta to'lov
 *
 * @param token - karta tokeni
 * @param amount - summa (tiyinda)
 * @param orderId - buyurtma ID
 */
export async function recurringPayment(
  token: string,
  amount: number,
  orderId: string
): Promise<{ transaction_id: string; state: number } | null> {
  if (isPaymeDemoMode()) {
    return { transaction_id: `demo_recurring_${Date.now()}`, state: 2 };
  }

  const res = await paymeCall('RecurringPayment', {
    token,
    amount,
    account: { order_id: orderId },
  });

  if (res.error) return null;
  return { transaction_id: res.result?.transaction_id, state: res.result?.state };
}

// ─── Statement / Hisobot ────────────────────────────────────────

/**
 * GetStatement — Davr bo'yicha tranzaksiyalarni olish
 * Buxgalteriya uchun
 */
export async function getStatement(
  from: number,  // timestamp ms
  to: number     // timestamp ms
): Promise<PaymeTransactionResult[]> {
  if (isPaymeDemoMode()) return [];

  const res = await paymeCall('GetStatement', { from, to });
  if (res.error) return [];
  return (res.result as any)?.transactions || [];
}

// ─── Payme URL generatsiyasi ────────────────────────────────────

/**
 * Payme to'lov sahifasiga havola yaratish
 * Foydalanuvchi ushbu havola orqali to'lovni amalga oshiradi
 *
 * @param orderId - buyurtma identifikatori
 * @param amount - summa (UZS da)
 * @param callbackUrl - to'lovdan keyin qaytish URL
 */
export function generatePayLink(
  orderId: string,
  amount: number,
  callbackUrl?: string
): string {
  const config = getPaymeConfig();
  const baseUrl = config.sandbox ? PAYME_SANDBOX : PAYME_BASE;

  // Payme summani tiyinda qabul qiladi: 1 UZS = 100 tiyin
  const params = new URLSearchParams({
    m: config.merchantId,
    a: String(Math.round(amount * 100)),
    ac: `order_id=${orderId}`,
    l: 'uz',
  });

  if (callbackUrl) params.set('c', callbackUrl);

  return `${baseUrl}/pay?${params.toString()}`;
}

// ─── Payme Error Codes Reference ────────────────────────────────

export const PAYME_ERROR_CODES: Record<number, string> = {
  [-32700]: 'JSON format xatosi',
  [-32600]: 'So\'rov formati xato',
  [-32601]: 'Method topilmadi',
  [-32602]: 'Parametrlar xato',
  [-32603]: 'Ichki xatolik',
  [-31001]: 'Noto\'g\'ri summa',
  [-31008]: 'Buyurtma to\'lov uchun mavjud emas',
  [-31050]: 'Buyurtma topilmadi',
  [-31051]: 'Tranzaksiya topilmadi',
  [-31052]: 'Tranzaksiya uchun noto\'g\'ri state',
  [-31099]: 'Boshqa xatolik',
  [-32000]: 'Tizim xatoligi',
  [-32001]: 'Xavfsizlik xatosi - so\'rov imzosi noto\'g\'ri',
};

export function getPaymeErrorMessage(code: number): string {
  return PAYME_ERROR_CODES[code] || `Noma'lum xatolik (${code})`;
}

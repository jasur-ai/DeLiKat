/** 🔬 Payme/Click diagnostika — real credential'larni test qilish
 *
 * GET /api/diagnostics?provider=all
 * GET /api/diagnostics?provider=payme
 * GET /api/diagnostics?provider=click
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function testPaymeConnection(): Promise<{
  status: 'ok' | 'demo' | 'error';
  mode: string;
  env: { merchant_id: string; sandbox: boolean };
  check_perform?: { allowed?: boolean; error?: string };
  message: string;
}> {
  const merchantId = process.env.PAYME_MERCHANT_ID;
  const merchantKey = process.env.PAYME_MERCHANT_KEY;
  const sandbox = process.env.PAYME_SANDBOX === 'true' || !merchantId;

  const isDemo = !merchantId || merchantId === 'DEMO_MERCHANT';
  const baseUrl = sandbox ? 'https://test.checkout.paycom.uz' : 'https://checkout.paycom.uz';

  if (isDemo) {
    return {
      status: 'demo',
      mode: 'DEMO (mock)',
      env: { merchant_id: merchantId || 'not set', sandbox },
      message: 'PAYME_MERCHANT_ID yo\'q yoki DEMO. Real test uchun .env ga credential qo\'ying.',
    };
  }

  // Real test: CheckPerformTransaction ga so'rov
  try {
    const res = await fetch(`${baseUrl}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth': `${merchantId}:${merchantKey}`,
      },
      body: JSON.stringify({
        id: Date.now(),
        method: 'CheckPerformTransaction',
        params: {
          amount: 10000, // 100 so'm (tiyinda)
          account: { order_id: `test_diag_${Date.now()}` },
        },
      }),
    });

    const data = await res.json();

    if (data.error) {
      const errorCode = data.error.code;
      const errorMsg = typeof data.error.message === 'string'
        ? data.error.message
        : (data.error.message?.uz || data.error.message?.ru || JSON.stringify(data.error.message));

      // -31050 = buyurtma topilmadi — bu NORMAL, chunki test buyurtmasi yo'q
      // -31008 = buyurtma to'lov uchun ochiq emas — NORMAL
      if (errorCode === -31050 || errorCode === -31008) {
        return {
          status: 'ok',
          mode: `REAL (${sandbox ? 'sandbox' : 'production'})`,
          env: { merchant_id: merchantId.slice(0, 6) + '...', sandbox },
          check_perform: { allowed: true },
          message: `✅ Payme API ga ulanish muvaffaqiyatli! (${errorMsg}) — Bu kutilgan javob, chunki test buyurtmasi mavjud emas.`,
        };
      }

      return {
        status: 'error',
        mode: `REAL (${sandbox ? 'sandbox' : 'production'})`,
        env: { merchant_id: merchantId.slice(0, 6) + '...', sandbox },
        message: `❌ Payme API xatolik (${errorCode}): ${errorMsg}`,
      };
    }

    return {
      status: 'ok',
      mode: `REAL (${sandbox ? 'sandbox' : 'production'})`,
      env: { merchant_id: merchantId.slice(0, 6) + '...', sandbox },
      message: '✅ Payme API ga ulanish muvaffaqiyatli!',
    };
  } catch (err) {
    return {
      status: 'error',
      mode: `REAL (${sandbox ? 'sandbox' : 'production'})`,
      env: { merchant_id: merchantId.slice(0, 6) + '...', sandbox },
      message: `❌ Payme API ga ulanishda xatolik: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

async function testClickConnection(): Promise<{
  status: 'ok' | 'demo' | 'error';
  mode: string;
  env: { service_id: string; sandbox: boolean };
  message: string;
  diagnostics?: Record<string, any>;
}> {
  const serviceId = process.env.CLICK_SERVICE_ID;
  const merchantId = process.env.CLICK_MERCHANT_ID;
  const secretKey = process.env.CLICK_SECRET_KEY;
  const sandbox = process.env.CLICK_SANDBOX === 'true' || !serviceId;

  const isDemo = !serviceId || serviceId === 'DEMO_SERVICE';

  if (isDemo) {
    return {
      status: 'demo',
      mode: 'DEMO (mock)',
      env: { service_id: serviceId || 'not set', sandbox },
      message: 'CLICK_SERVICE_ID yo\'q yoki DEMO. Real test uchun .env ga credential qo\'ying.',
    };
  }

  // Click Merchant REST API test — create invoice (minimal)
  try {
    const auth = Buffer.from(`${merchantId}:${secretKey}`).toString('base64');
    const res = await fetch('https://api.click.uz/v2/merchant/invoice/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        merchant_trans_id: `test_diag_${Date.now()}`,
        amount: 100, // minimal summa
        user_id: '0',
      }),
    });

    const data = await res.json();

    if (data.error && data.error !== 0) {
      const errorCode = data.error;
      const errorNote = data.error_note || '';

      // -5 = buyurtma topilmadi → NORMAL, test buyurtmasi yo'q
      if (errorCode === -5) {
        return {
          status: 'ok',
          mode: `REAL (${sandbox ? 'sandbox' : 'production'})`,
          env: { service_id: serviceId.slice(0, 4) + '...', sandbox },
          message: `✅ Click API ga ulanish muvaffaqiyatli! (${errorNote}) — Test buyurtmasi yo'q, bu kutilgan.`,
          diagnostics: { error_code: errorCode, error_note: errorNote },
        };
      }

      return {
        status: 'error',
        mode: `REAL (${sandbox ? 'sandbox' : 'production'})`,
        env: { service_id: serviceId.slice(0, 4) + '...', sandbox },
        message: `❌ Click API xatolik (${errorCode}): ${errorNote}`,
        diagnostics: { error_code: errorCode, error_note: errorNote },
      };
    }

    return {
      status: 'ok',
      mode: `REAL (${sandbox ? 'sandbox' : 'production'})`,
      env: { service_id: serviceId.slice(0, 4) + '...', sandbox },
      message: '✅ Click API ga ulanish muvaffaqiyatli!',
      diagnostics: data,
    };
  } catch (err) {
    return {
      status: 'error',
      mode: `REAL (${sandbox ? 'sandbox' : 'production'})`,
      env: { service_id: serviceId.slice(0, 4) + '...', sandbox },
      message: `❌ Click API ga ulanishda xatolik: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

function checkFiscalConfig(): {
  status: 'ok' | 'partial' | 'not_configured';
  stir: string;
  terminal_id: string;
  message: string;
} {
  const stir = process.env.MERCHANT_STIR;
  const terminalId = process.env.FISCAL_TERMINAL_ID;
  const hasStir = !!stir;
  const hasTerminal = !!terminalId;

  if (!hasStir && !hasTerminal) {
    return { status: 'not_configured', stir: '—', terminal_id: '—', message: 'Fiskalizatsiya sozlanmagan. MERCHANT_STIR va FISCAL_TERMINAL_ID qo\'ying.' };
  }
  if (hasStir && hasTerminal) {
    return { status: 'ok', stir: stir!.slice(0, 4) + '...', terminal_id: terminalId!.slice(0, 6) + '...', message: '✅ Fiskalizatsiya sozlangan.' };
  }
  return { status: 'partial', stir: hasStir ? stir!.slice(0, 4) + '...' : '—', terminal_id: hasTerminal ? terminalId!.slice(0, 6) + '...' : '—', message: 'Qisman sozlangan. Ham STIR, ham terminal ID kerak.' };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const provider = searchParams.get('provider') || 'all';

  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    env_check: {
      payme_demo: !process.env.PAYME_MERCHANT_ID || process.env.PAYME_MERCHANT_ID === 'DEMO_MERCHANT',
      click_demo: !process.env.CLICK_SERVICE_ID || process.env.CLICK_SERVICE_ID === 'DEMO_SERVICE',
      fiscal_stir: !!process.env.MERCHANT_STIR,
      fiscal_terminal: !!process.env.FISCAL_TERMINAL_ID,
    },
  };

  if (provider === 'payme' || provider === 'all') {
    result.payme = await testPaymeConnection();
  }

  if (provider === 'click' || provider === 'all') {
    result.click = await testClickConnection();
  }

  if (provider === 'fiscal' || provider === 'all') {
    result.fiscal = checkFiscalConfig();
  }

  const allOk = !Object.values(result).some(
    (v: any) => v?.status === 'error'
  );

  return NextResponse.json({
    ok: allOk,
    ...result,
  });
}

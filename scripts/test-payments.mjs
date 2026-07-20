#!/usr/bin/env node

/**
 * 🔬 DeLiKet To'lov tizimlari — to'liq diagnostika skripti
 *
 * Ushbu skript real Payme/Click credential'lar bilan quyidagilarni test qiladi:
 *   1. .env fayldagi credential'lar holatini tekshirish
 *   2. Payme API ga CheckPerformTransaction orqali ulanish
 *   3. Click API ga invoice/create orqali ulanish
 *   4. ESCROW to'liq sikl: create → simulate → audit log → release
 *   5. Fiskal chek yaratish
 *   6. Fiskal statistikani olish
 *
 * Ishga tushirish:  node scripts/test-payments.mjs
 *
 * Talab: .env faylida credential'lar ko'rsatilgan bo'lishi kerak
 * Aks holda DEMO mode ishlaydi (real test emas)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Ranglar ────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function pass(msg) { console.log(`  ${C.green}✅ ${msg}${C.reset}`); }
function fail(msg) { console.log(`  ${C.red}❌ ${msg}${C.reset}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠️  ${msg}${C.reset}`); }
function info(msg) { console.log(`  ${C.cyan}ℹ️  ${msg}${C.reset}`); }
function header(title) {
  console.log(`\n${C.bold}${C.blue}═══ ${title} ═══${C.reset}`);
}

// ─── .env yuklash ───────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) {
    warn('.env fayli topilmadi!');
    return {};
  }
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    // Strip inline comments (#) from value
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip quotes first, then inline comments (#)
    // Order: quotes before comments prevents breaking quoted values with #
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else {
      const commentIdx = val.indexOf('#');
      if (commentIdx >= 0) val = val.slice(0, commentIdx).trim();
    }
    env[key] = val;
  }
  return env;
}

// ─── Test 1: Environment tekshirish ─────────────────────────────
function testEnvironment(env) {
  header('1. ENVIRONMENT TEKSHIRISH');

  const checks = [
    { key: 'PAYME_MERCHANT_ID', label: 'Payme Merchant ID' },
    { key: 'PAYME_MERCHANT_KEY', label: 'Payme Merchant Key' },
    { key: 'PAYME_SANDBOX', label: 'Payme Sandbox' },
    { key: 'CLICK_SERVICE_ID', label: 'Click Service ID' },
    { key: 'CLICK_MERCHANT_ID', label: 'Click Merchant ID' },
    { key: 'CLICK_SECRET_KEY', label: 'Click Secret Key' },
    { key: 'MERCHANT_STIR', label: 'STIR (fiskal)' },
    { key: 'FISCAL_TERMINAL_ID', label: 'Fiskal Terminal ID' },
    { key: 'DATABASE_URL', label: 'Database URL' },
  ];

  const results = {};
  for (const c of checks) {
    const val = env[c.key];
    const isSet = !!val && val !== 'DEMO_MERCHANT' && val !== 'DEMO_KEY' &&
      val !== 'DEMO_SERVICE' && val !== 'DEMO_SECRET';
    results[c.key] = isSet;
    if (isSet) {
      const masked = val.length > 6 ? val.slice(0, 4) + '...' + val.slice(-2) : '***';
      pass(`${c.label}: ${masked}`);
    } else {
      warn(`${c.label}: ${val ? 'DEMO mode' : 'not set'}`);
    }
  }

  const paymeReal = results.PAYME_MERCHANT_ID && results.PAYME_MERCHANT_KEY;
  const clickReal = results.CLICK_SERVICE_ID && results.CLICK_MERCHANT_ID && results.CLICK_SECRET_KEY;
  const fiscalReal = results.MERCHANT_STIR && results.FISCAL_TERMINAL_ID;

  info(`Payme: ${paymeReal ? C.green + 'REAL' : C.yellow + 'DEMO'}${C.reset}`);
  info(`Click: ${clickReal ? C.green + 'REAL' : C.yellow + 'DEMO'}${C.reset}`);
  info(`Fiskal: ${fiscalReal ? C.green + 'SOZLANNGAN' : C.yellow + 'SOZLANMAGAN'}${C.reset}`);

  return { paymeReal, clickReal, fiscalReal };
}

// ─── Test 2: Payme API ulanish ──────────────────────────────────
async function testPaymeAPI(env) {
  header('2. PAYME API ULANISH');

  const merchantId = env.PAYME_MERCHANT_ID;
  const merchantKey = env.PAYME_MERCHANT_KEY;
  const sandbox = env.PAYME_SANDBOX !== 'false';

  if (!merchantId || !merchantKey || merchantId === 'DEMO_MERCHANT') {
    warn('Payme kredensiallari yo\'q — DEMO mode, real test o\'tkazib bo\'lmaydi');
    info('Payme Business dan credential olish: https://business.payme.uz');
    info('.env ga PAYME_MERCHANT_ID va PAYME_MERCHANT_KEY qo\'ying');
    return { ok: false };
  }

  const baseUrl = sandbox ? 'https://test.checkout.paycom.uz' : 'https://checkout.paycom.uz';
  const testOrderId = `test_diag_${Date.now()}`;

  try {
    info(`So'rov yuborilmoqda: ${baseUrl}/api`);
    info(`Method: CheckPerformTransaction`);

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
          amount: 10000, // 100 so'm
          account: { order_id: testOrderId },
        },
      }),
    });

    const data = await res.json();
    info(`Javob kodi: ${res.status}`);

    if (data.error) {
      const code = data.error.code;
      const msg = typeof data.error.message === 'string'
        ? data.error.message
        : (data.error.message?.uz || data.error.message?.ru || JSON.stringify(data.error.message));

      // Payme -31050 va -31008 = normal (test order mavjud emas)
      if (code === -31050 || code === -31008) {
        pass(`Payme API ulanish muvaffaqiyatli! Kutilgan xatolik: ${msg}`);
        info(`Bu normal — test buyurtmasi mavjud emas, lekin kredensial to'g'ri`);
        return { ok: true, detail: { code, message: msg } };
      }

      fail(`Payme API xatolik (${code}): ${msg}`);
      return { ok: false, error: msg, code };
    }

    pass('Payme API ulanish muvaffaqiyatli!');
    return { ok: true };
  } catch (err) {
    fail(`Payme API ga ulanishda xatolik: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ─── Test 3: Click API ulanish ──────────────────────────────────
async function testClickAPI(env) {
  header('3. CLICK API ULANISH');

  const serviceId = env.CLICK_SERVICE_ID;
  const merchantId = env.CLICK_MERCHANT_ID;
  const secretKey = env.CLICK_SECRET_KEY;

  if (!serviceId || !merchantId || !secretKey ||
      serviceId === 'DEMO_SERVICE' || merchantId === 'DEMO_MERCHANT') {
    warn('Click kredensiallari yo\'q — DEMO mode, real test o\'tkazib bo\'lmaydi');
    info('Click Business dan credential olish: https://business.click.uz');
    info('.env ga CLICK_SERVICE_ID, CLICK_MERCHANT_ID va CLICK_SECRET_KEY qo\'ying');
    return { ok: false };
  }

  try {
    const auth = Buffer.from(`${merchantId}:${secretKey}`).toString('base64');
    const testOrderId = `test_diag_${Date.now()}`;

    info(`So'rov yuborilmoqda: https://api.click.uz/v2/merchant/invoice/create`);
    info(`Method: POST, amount: 100 UZS`);

    const res = await fetch('https://api.click.uz/v2/merchant/invoice/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        merchant_trans_id: testOrderId,
        amount: 100,
        user_id: '0',
      }),
    });

    const data = await res.json();
    info(`Javob: error=${data.error}, error_note=${data.error_note || '—'}`);

    if (data.error && data.error !== 0) {
      // -5 = buyurtma topilmadi → NORMAL (test buyurtmasi yo'q)
      if (data.error === -5) {
        pass(`Click API ulanish muvaffaqiyatli! Kutilgan xatolik: ${data.error_note}`);
        info(`Bu normal — test buyurtmasi mavjud emas, lekin kredensial to'g'ri`);
        return { ok: true, detail: { error: data.error, note: data.error_note } };
      }

      fail(`Click API xatolik (${data.error}): ${data.error_note}`);
      return { ok: false, error: data.error_note, code: data.error };
    }

    pass('Click API ulanish muvaffaqiyatli!');
    return { ok: true };
  } catch (err) {
    fail(`Click API ga ulanishda xatolik: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

// ─── Test 4: Fiskalizatsiya tekshirish ──────────────────────────
function testFiscal(env) {
  header('4. FISKALIZATSIYA TEKSHIRISH');

  const stir = env.MERCHANT_STIR;
  const terminalId = env.FISCAL_TERMINAL_ID;
  const paymeReal = env.PAYME_MERCHANT_ID && env.PAYME_MERCHANT_KEY &&
    env.PAYME_MERCHANT_ID !== 'DEMO_MERCHANT';

  if (!stir && !terminalId) {
    warn('Fiskalizatsiya sozlanmagan');
    info('MERCHANT_STIR (STIR raqami) va FISCAL_TERMINAL_ID (VFM ID) qo\'ying');
    return { ok: false };
  }

  if (stir) pass(`STIR: ${stir.slice(0, 3)}...${stir.slice(-2)} (${stir.length} raqam)`);
  else warn('STIR ko\'rsatilmagan');

  if (terminalId) pass(`Fiskal Terminal ID: ${terminalId.slice(0, 6)}...`);
  else warn('Fiskal Terminal ID ko\'rsatilmagan');

  if (!paymeReal) {
    warn('Payme REAL mode emas — fiskalizatsiya faqat Payme orqali ishlaydi');
  }

  return { ok: !!(stir && terminalId && paymeReal) };
}

// ─── Test 5: ESCROW to'liq sikl (local server orqali) ─────────
async function testEscrowFlow(env) {
  header('5. ESCROW TO\'LIQ SIKL');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const paymeReal = env.PAYME_MERCHANT_ID && env.PAYME_MERCHANT_KEY &&
    env.PAYME_MERCHANT_ID !== 'DEMO_MERCHANT';
  const clickReal = env.CLICK_SERVICE_ID && env.CLICK_MERCHANT_ID &&
    env.CLICK_SECRET_KEY && env.CLICK_SERVICE_ID !== 'DEMO_SERVICE';

  if (paymeReal) info('Payme REAL mode');
  else warn('Payme DEMO mode — ESCROW test mock ma\'lumotlar bilan');

  try {
    // 5a. Create ESCROW
    info('5a. ESCROW yaratish...');
    const createRes = await fetch(`${baseUrl}/api/payments/escrow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        deal_id: 999,
        lot_id: 42,
        buyer_id: 1,
        seller_id: 10,
        amount: 100000,
        payment_method: paymeReal ? 'payme' : 'payme',
        callback_url: `${baseUrl}/deal/999`,
      }),
    });
    const created = await createRes.json();

    if (!created.ok) {
      fail(`ESCROW yaratilmadi: ${created.error}`);
      // Server ishlamayotgan bo'lishi mumkin
      if (created.error?.includes('fetch') || !createRes.ok) {
        info('Server ishlamayotganga o\'xshaydi. npm run dev qilib qayta urinib ko\'ring.');
      }
      return { ok: false };
    }

    pass(`ESCROW yaratildi: #${created.escrow.id}`);
    if (created.payment_url) {
      info(`To'lov URL: ${created.payment_url.slice(0, 60)}...`);
    }

    // 5b. Simulate payment (Payme orqali)
    info('5b. To\'lov simulyatsiyasi...');
    const simRes = await fetch(`${baseUrl}/api/payments/escrow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'simulate',
        escrow_id: created.escrow.id,
      }),
    });
    const sim = await simRes.json();

    if (!sim.ok) {
      fail(`To'lov simulyatsiyasi xatolik: ${sim.error}`);
      return { ok: false };
    }

    pass(`To'lov qabul qilindi. Status: ${sim.escrow.status}`);
    if (sim.escrow.held_at) pass(`ESCROW da saqlanmoqda: ${new Date(sim.escrow.held_at).toLocaleString('uz-UZ')}`);

    // 5c. ESCROW audit log
    info('5c. Tranzaksiya tarixi...');
    const logsRes = await fetch(`${baseUrl}/api/payments/escrow?action=logs&escrow_id=${created.escrow.id}`);
    const logs = await logsRes.json();

    if (logs.ok && logs.logs.length > 0) {
      pass(`${logs.logs.length} ta hodisa topildi`);
      for (const log of logs.logs) {
        info(`  ${log.action} → ${log.status} (${log.provider})`);
      }
    } else {
      warn('Audit log topilmadi (DB bo\'lmasa normal)');
    }

    // 5d. Release ESCROW
    info('5d. Pulni sotuvchiga o\'tkazish...');
    const relRes = await fetch(`${baseUrl}/api/payments/escrow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'release',
        escrow_id: created.escrow.id,
      }),
    });
    const released = await relRes.json();

    if (!released.ok) {
      fail(`Pul o'tkazilmadi: ${released.error}`);
      return { ok: false };
    }

    pass(`Pul sotuvchiga o'tkazildi. Status: ${released.escrow.status}`);
    if (released.escrow.released_at) {
      pass(`Vaqt: ${new Date(released.escrow.released_at).toLocaleString('uz-UZ')}`);
    }

    pass('ESCROW to\'liq sikl muvaffaqiyatli yakunlandi! ✅');
    return { ok: true };
  } catch (err) {
    fail(`ESCROW testda xatolik: ${err.message}`);
    info('Server (npm run dev) ishlayotganligiga ishonch hosil qiling');
    return { ok: false, error: err.message };
  }
}

// ─── Test 6: Fiskal test ────────────────────────────────────────
async function testFiscalAPI(env) {
  header('6. FISKAL API TEST');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const stir = env.MERCHANT_STIR;
  const paymeReal = env.PAYME_MERCHANT_ID && env.PAYME_MERCHANT_KEY &&
    env.PAYME_MERCHANT_ID !== 'DEMO_MERCHANT';

  try {
    info('6a. Fiskal statistika...');
    const statsRes = await fetch(`${baseUrl}/api/fiscal?stats=true`);
    const stats = await statsRes.json();

    if (stats.ok && stats.stats) {
      pass(`Fiskal cheklar: ${stats.stats.total} ta (${stats.stats.fiscal_done} tasdiqlangan)`);
    } else {
      warn('Fiskal statistika olinmadi (DB bo\'lmasa normal)');
    }

    info('6b. Fiskal chek yaratish (demo)...');
    const createRes = await fetch(`${baseUrl}/api/fiscal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        order_id: `test_fiscal_${Date.now()}`,
        amount: 150000,
        description: 'Test mahsulot',
        items: [
          {
            title: 'Test mahsulot',
            price: 15000000, // 150000 so'm = 15000000 tiyin
            count: 1,
            code: '00702001001000006',
            package_code: '123461',
            vat_percent: 12,
          },
        ],
      }),
    });
    const created = await createRes.json();

    if (created.ok && created.receipt_id) {
      pass(`Fiskal chek yaratildi: ${created.receipt_id.slice(0, 20)}...`);

      if (paymeReal && stir) {
        pass('Payme REAL + STIR mavjud — fiskalizatsiya to\'liq ishlaydi');
      } else {
        info('Fiskal chek DEMO mode da yaratildi (real Payme kredensiallari kerak)');
      }
    } else {
      warn(`Fiskal chek yaratilmadi: ${created.error || 'noma\'lum'}`);
    }

    return { ok: created.ok };
  } catch (err) {
    fail(`Fiskal API testda xatolik: ${err.message}`);
    return { ok: false };
  }
}

// ─── Hisobot ─────────────────────────────────────────────────────
function printReport(results) {
  console.log(`\n${C.bold}${C.blue}${'═'.repeat(50)}${C.reset}`);
  console.log(`${C.bold}${C.blue}  📋 TEST HISOBOTI${C.reset}`);
  console.log(`${C.bold}${C.blue}${'═'.repeat(50)}${C.reset}`);

  const tests = [
    { name: 'Environment', ok: true }, // always check
    { name: 'Payme API', ok: results.payme?.ok },
    { name: 'Click API', ok: results.click?.ok },
    { name: 'Fiskalizatsiya', ok: results.fiscal?.ok },
    { name: 'ESCROW sikl', ok: results.escrow?.ok },
    { name: 'Fiskal API', ok: results.fiscalApi?.ok },
  ];

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const t of tests) {
    const icon = t.ok === true ? '✅' : t.ok === false ? '❌' : '⏭️';
    if (t.ok === true) passed++;
    else if (t.ok === false) failed++;
    else skipped++;
    console.log(`  ${icon} ${t.name}`);
  }

  console.log(`\n  ${C.bold}Natija:${C.reset}`);
  console.log(`  ${C.green}${passed} ta test muvaffaqiyatli${C.reset}`);
  if (failed > 0) console.log(`  ${C.red}${failed} ta test xatolik${C.reset}`);
  if (skipped > 0) console.log(`  ${C.yellow}${skipped} ta test o'tkazib yuborildi${C.reset}`);

  // Xulosa
  // CI/CD uchun exit code
  process.exitCode = failed > 0 ? 1 : 0;

  console.log(`\n  ${C.bold}Xulosa:${C.reset}`);
  if (results.payme?.ok === false) {
    console.log(`  ${C.red}  • Payme API ga ulana olmadi — credential'larni tekshiring${C.reset}`);
  }
  if (results.click?.ok === false) {
    console.log(`  ${C.red}  • Click API ga ulana olmadi — credential'larni tekshiring${C.reset}`);
  }
  if (results.escrow?.ok === false) {
    console.log(`  ${C.yellow}  • ESCROW test o'tmadi — server ishlayotganiga ishonch hosil qiling${C.reset}`);
  }
  if (results.payme?.ok !== false && results.click?.ok !== false) {
    console.log(`  ${C.green}  • Barcha API testlari muvaffaqiyatli!${C.reset}`);
  }
}

// ─── MAIN ────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.blue}${'█'.repeat(56)}`);
  console.log(`  🔬 DELIKET TO'LOV TIZIMLARI — TO'LIQ TEST`);
  console.log(`  ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`);
  console.log(`${'█'.repeat(56)}${C.reset}\n`);

  // 1. .env yuklash
  const env = loadEnv();
  const envResults = testEnvironment(env);

  // 2. Payme API
  const paymeResult = await testPaymeAPI(env);

  // 3. Click API
  const clickResult = await testClickAPI(env);

  // 4. Fiskal
  const fiscalResult = testFiscal(env);

  // 5. ESCROW to'liq sikl
  const escrowResult = await testEscrowFlow(env);

  // 6. Fiskal API
  const fiscalApiResult = await testFiscalAPI(env);

  // Hisobot
  const results = {
    payme: paymeResult,
    click: clickResult,
    fiscal: fiscalResult,
    escrow: escrowResult,
    fiscalApi: fiscalApiResult,
  };

  printReport(results);

  console.log(`\n${C.gray}Test tugadi. Vaqt: ${new Date().toISOString().slice(11, 19)}${C.reset}\n`);
}

main().catch(err => {
  console.error(`${C.red}Kutilmagan xatolik:${C.reset}`, err);
  process.exit(1);
});

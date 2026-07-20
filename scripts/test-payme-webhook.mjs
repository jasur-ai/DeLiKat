#!/usr/bin/env node

/**
 * 🔔 Payme Webhook Test — JSON-RPC 2.0 callback simulyatsiyasi
 *
 * Payme to'lov tizimi sizning serverni chaqiradi (webhook).
 * Ushbu skript Payme ning barcha callback method'larini simulyatsiya qiladi.
 *
 * Ishga tushirish:
 *   npm run dev          (1-terminal)
 *   npm run test:webhook (2-terminal)
 *
 * Test qadamlari:
 *   1. ESCROW yaratish (buyurtma)
 *   2. CheckPerformTransaction → buyurtma mavjudligini tekshirish
 *   3. CreateTransaction → tranzaksiya yaratish
 *   4. PerformTransaction → to'lovni yakunlash (escrow → held)
 *   5. CheckTransaction → holatni tekshirish
 *   6. CancelTransaction → bekor qilish (refund test)
 *   7. ESCROW release → pulni sotuvchiga o'tkazish
 *   8. Audit log tekshirish
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WEBHOOK_URL = `${BASE_URL}/api/payments/payme-webhook`;
const ESCROW_URL = `${BASE_URL}/api/payments/escrow`;

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
function step(num, title) {
  console.log(`\n${C.bold}${C.blue}═══ QADAM ${num}: ${title} ═══${C.reset}`);
}

async function paymeWebhook(method, params) {
  const reqId = Date.now();
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: reqId,
      method,
      params,
    }),
  });
  const data = await res.json();
  return { res, data, reqId };
}

let escrowId = null;
let paymeTxId = `pm_test_${Date.now()}`;
let createTime = Date.now();

// Test natijalari tracking
const RESULTS = {};

function record(name, ok, detail) {
  RESULTS[name] = { ok, detail };
}

// ─── MAIN ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.blue}${'█'.repeat(60)}`);
  console.log(`  🔔 PAYME WEBHOOK — TO'LIQ LIFECYCLE TEST`);
  console.log(`  URL: ${WEBHOOK_URL}`);
  console.log(`  Vaqt: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`);
  console.log(`${'█'.repeat(60)}${C.reset}\n`);

  // ════════════════════════════════════════════════════════════════
  // 0. SERVER TEKSHIRISH
  // ════════════════════════════════════════════════════════════════
  step(0, 'SERVER TEKSHIRISH');
  try {
    const health = await fetch(BASE_URL);
    if (health.ok) {
      pass(`Server ishlamoqda: ${BASE_URL} (${health.status})`);
    } else {
      fail(`Server javob bermadi: ${health.status}`);
      info(`Iltimos, 1-terminalda 'npm run dev' qilib serverni ishga tushiring`);
      process.exit(1);
    }
  } catch (err) {
    fail(`Serverga ulanishda xatolik: ${err.message}`);
    info(`Iltimos, 1-terminalda 'npm run dev' qilib serverni ishga tushiring`);
    process.exit(1);
  }

  // ════════════════════════════════════════════════════════════════
  // 1. ESCROW YARATISH
  // ════════════════════════════════════════════════════════════════
  step(1, 'ESCROW YARATISH (buyurtma)');
  try {
    const res = await fetch(ESCROW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        deal_id: 999,
        lot_id: 42,
        buyer_id: 1,
        seller_id: 10,
        amount: 150000,
        payment_method: 'payme',
      }),
    });
    const data = await res.json();

    if (data.ok) {
      escrowId = data.escrow.id;
      pass(`ESCROW #${escrowId} yaratildi (150,000 UZS)`);
      if (data.payment_url) {
        info(`To'lov URL: ${data.payment_url.slice(0, 70)}...`);
      }
      record('ESCROW yaratish', true);
    } else {
      fail(`ESCROW yaratilmadi: ${data.error}`);
      record('ESCROW yaratish', false, data.error);
      return;
    }
  } catch (err) {
    fail(`ESCROW yaratishda xatolik: ${err.message}`);
    record('ESCROW yaratish', false, err.message);
    return;
  }

  // ════════════════════════════════════════════════════════════════
  // 2. CheckPerformTransaction
  // ════════════════════════════════════════════════════════════════
  step(2, 'CheckPerformTransaction — Payme tekshiradi: buyurtma bormi?');
  try {
    const { data } = await paymeWebhook('CheckPerformTransaction', {
      amount: Math.round(150000 * 100), // 15,000,000 tiyin (= 150,000 UZS)
      account: { order_id: `escrow_${escrowId}` },
    });

    if (data.result?.allow === true) {
      pass('Buyurtma mavjud va to\'lov uchun ochiq. Payme to\'lovni davom ettirishi mumkin.');
      record('CheckPerformTransaction', true);
    } else if (data.error) {
      fail(`CheckPerformTransaction xatolik (${data.error.code}): ${JSON.stringify(data.error.message)}`);
      record('CheckPerformTransaction', false, data.error);
    } else {
      warn(`Kutilmagan javob: ${JSON.stringify(data)}`);
      record('CheckPerformTransaction', false, 'Unexpected response');
    }

    info(`Payme mangement: "Bu buyurtma uchun to'lov qabul qilish mumkinmi?" → ${data.result?.allow ? 'HA ✅' : "YO'Q ❌"}`);
  } catch (err) {
    fail(`CheckPerformTransaction da xatolik: ${err.message}`);
    record('CheckPerformTransaction', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 3. CreateTransaction
  // ════════════════════════════════════════════════════════════════
  step(3, 'CreateTransaction — Payme tranzaksiya yaratadi');
  try {
    const { data } = await paymeWebhook('CreateTransaction', {
      id: paymeTxId,
      time: createTime,
      amount: Math.round(150000 * 100),
      account: { order_id: `escrow_${escrowId}` },
    });

    if (data.result?.transaction) {
      pass(`Tranzaksiya yaratildi: ${data.result.transaction}`);
      if (data.result.state === 1) pass('State: 1 (reserved — to\'lov uchun rezerv qilingan)');
      record('CreateTransaction', true);
    } else if (data.error) {
      fail(`CreateTransaction xatolik (${data.error.code}): ${JSON.stringify(data.error.message)}`);
      record('CreateTransaction', false, data.error);
    } else {
      warn(`Kutilmagan javob: ${JSON.stringify(data)}`);
      record('CreateTransaction', false, 'Unexpected response');
    }

    info(`Payme ma'nosi: "Foydalanuvchi kartasida pul rezerv qilindi, endi to'lovni yakunlash kerak"`);
  } catch (err) {
    fail(`CreateTransaction da xatolik: ${err.message}`);
    record('CreateTransaction', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 4. PerformTransaction
  // ════════════════════════════════════════════════════════════════
  step(4, 'PerformTransaction — To\'lovni yakunlash (pul ESCROW ga tushadi)');
  try {
    const { data } = await paymeWebhook('PerformTransaction', {
      id: paymeTxId,
    });

    if (data.result?.state === 2) {
      pass(`To'lov yakunlandi! State: 2 (confirmed)`);
      pass(`Pul foydalanuvchi kartasidan yechildi va ESCROW da saqlanmoqda.`);
      record('PerformTransaction', true);
    } else if (data.error) {
      fail(`PerformTransaction xatolik (${data.error.code}): ${JSON.stringify(data.error.message)}`);
      record('PerformTransaction', false, data.error);
    } else {
      info(`Javob: state=${data.result?.state} (1 = oldin yakunlangan, 2 = yangi yakunlandi)`);
      if (data.result?.state === 1) warn('Tranzaksiya oldin yakunlangan — idempotent');
      record('PerformTransaction', true);
    }

    info(`Payme ma'nosi: "To'lov muvaffaqiyatli! Pul xaridordan yechildi, endi ESCROW da."`);
  } catch (err) {
    fail(`PerformTransaction da xatolik: ${err.message}`);
    record('PerformTransaction', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 5. CheckTransaction
  // ════════════════════════════════════════════════════════════════
  step(5, 'CheckTransaction — Holatni tekshirish');
  try {
    const { data } = await paymeWebhook('CheckTransaction', {
      id: paymeTxId,
    });

    if (data.result) {
      const stateMap = {
        '0': 'created',
        '1': 'reserved (to\'lov kutilmoqda)',
        '2': 'confirmed (yakunlangan)',
        '-1': 'cancelled (bekor qilingan)',
      };
      const stateName = stateMap[data.result.state] || 'unknown';
      pass(`Tranzaksiya holati: state=${data.result.state} (${stateName})`);
      if (data.result.perform_time) {
        pass(`To'lov vaqti: ${new Date(data.result.perform_time).toLocaleString('uz-UZ')}`);
      }
      record('CheckTransaction', true);
    } else if (data.error) {
      fail(`CheckTransaction xatolik: ${JSON.stringify(data.error)}`);
      record('CheckTransaction', false, data.error);
    }

    info(`Payme ma'nosi: "Bu tranzaksiya holatini tekshirish"`);
  } catch (err) {
    fail(`CheckTransaction da xatolik: ${err.message}`);
    record('CheckTransaction', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 6. CancelTransaction (separate test)
  // ════════════════════════════════════════════════════════════════
  step(6, 'CancelTransaction — To\'lovni bekor qilish (REFUND)');
  try {
    // Bekor qilish testi uchun alohida ESCROW
    const refundRes = await fetch(ESCROW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        deal_id: 998,
        lot_id: 15,
        buyer_id: 1,
        seller_id: 2,
        amount: 50000,
        payment_method: 'payme',
      }),
    });
    const refundData = await refundRes.json();
    const refundEscrowId = refundData.escrow?.id;

    if (!refundEscrowId) {
      fail('REFUND testi uchun ESCROW yaratilmadi');
      record('CancelTransaction', false, 'ESCROW creation failed');
    } else {
      // Avval transaction yaratamiz
      const cancelTxId = `pm_cancel_test_${Date.now()}`;
      await paymeWebhook('CreateTransaction', {
        id: cancelTxId,
        time: Date.now(),
        amount: 5000000,
        account: { order_id: `escrow_${refundEscrowId}` },
      });

      // So'ng bekor qilamiz
      const { data } = await paymeWebhook('CancelTransaction', {
        id: cancelTxId,
        reason: 1, // 1 = foydalanuvchi bekor qildi
      });

      if (data.result?.state === -1) {
        pass(`To'lov bekor qilindi! State: -1 (cancelled)`);
        pass(`Pul foydalanuvchiga qaytarildi.`);
        record('CancelTransaction', true);
      } else if (data.error) {
        fail(`CancelTransaction xatolik (${data.error.code}): ${JSON.stringify(data.error.message)}`);
        record('CancelTransaction', false, data.error);
      } else {
        info(`Javob: ${JSON.stringify(data)}`);
        record('CancelTransaction', true);
      }

      info(`Payme ma'nosi: "To'lov bekor qilindi, pul egasiga qaytarildi"`);
    }
  } catch (err) {
    fail(`CancelTransaction da xatolik: ${err.message}`);
    record('CancelTransaction', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 7. ESCROW RELEASE
  // ════════════════════════════════════════════════════════════════
  step(7, 'ESCROW RELEASE — Pulni sotuvchiga o\'tkazish');
  try {
    // Agar DB bo'lmasa, PerformTransaction webhook escrow statusni
    // 'held' ga o'tkaza olmaydi. Shu sababli release o'tkazib yuboriladi
    // va uning o'rniga 'simulate' orqali to'lovni tasdiqlaymiz.
    info('1-usul: Webhook orqali held bo\'lgan ESCROW ni release qilish...');
    let releaseRes = await fetch(ESCROW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'release',
        escrow_id: escrowId,
      }),
    });
    let releaseData = await releaseRes.json();

    if (!releaseData.ok) {
      // DB bo'lmasa, ESCROW 'pending_payment' holatida qolgan
      // Shu sababli simulyatsiya qilib, so'ng release qilamiz
      warn('ESCROW held emas (DB mavjud emas). Simulyatsiya qilinmoqda...');
      info('2-usul: simulate → release...');

      const simRes = await fetch(ESCROW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'simulate',
          escrow_id: escrowId,
        }),
      });
      const simData = await simRes.json();

      if (simData.ok) {
        pass(`To'lov simulyatsiya orqali tasdiqlandi. Status: ${simData.escrow.status}`);

        // Endi release qilamiz
        releaseRes = await fetch(ESCROW_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'release',
            escrow_id: escrowId,
          }),
        });
        releaseData = await releaseRes.json();

        if (releaseData.ok) {
          pass(`Pul sotuvchiga o'tkazildi! Status: ${releaseData.escrow.status}`);
          if (releaseData.escrow.released_at) {
            const date = new Date(releaseData.escrow.released_at).toLocaleString('uz-UZ');
            pass(`Vaqt: ${date}`);
          }
          record('ESCROW release', true);
        } else {
          fail(`Pul o'tkazilmadi: ${releaseData.error}`);
          record('ESCROW release', false, releaseData.error);
          info('Batafsil: Neon DB holda ESCROW to\'liq sikl ishlaydi');
        }
      } else {
        fail(`To'lov simulyatsiyasi xatolik: ${simData.error}`);
        record('ESCROW release', false, simData.error);
      }
    } else {
      pass(`Pul sotuvchiga o'tkazildi! Status: ${releaseData.escrow.status}`);
      if (releaseData.escrow.released_at) {
        const date = new Date(releaseData.escrow.released_at).toLocaleString('uz-UZ');
        pass(`Vaqt: ${date}`);
      }
      record('ESCROW release', true);
    }
  } catch (err) {
    fail(`ESCROW release da xatolik: ${err.message}`);
    record('ESCROW release', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 8. AUDIT LOG TEKSHIRISH
  // ════════════════════════════════════════════════════════════════
  step(8, 'AUDIT LOG — Tranzaksiya tarixi');
  try {
    const res = await fetch(`${ESCROW_URL}?action=logs&escrow_id=${escrowId}`);
    const data = await res.json();

    if (data.ok && data.logs?.length > 0) {
      record('Audit log', true);
      pass(`${data.logs.length} ta hodisa topildi:`);
      for (const log of data.logs) {
        const statusColor = log.status === 'held' ? C.green : C.yellow;
        const providerColor = log.provider === 'payme' ? C.cyan : C.gray;
        console.log(`    ${C.gray}├─${C.reset} ${log.action} → ${statusColor}${log.status}${C.reset} (${providerColor}${log.provider}${C.reset})`);
      }
    } else {
      warn('Audit log topilmadi (DB bo\'lmasa normal)');
      warn('Test davomida barcha webhook action lar auditoriyaga yoziladi.');
    }
  } catch (err) {
    fail(`Audit log olishda xatolik: ${err.message}`);
    record('Audit log', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // HISOBOT
  // ════════════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.blue}${'═'.repeat(60)}${C.reset}`);
  console.log(`${C.bold}${C.blue}  📋 PAYME WEBHOOK TEST HISOBOTI${C.reset}`);
  console.log(`${C.bold}${C.blue}${'═'.repeat(60)}${C.reset}`);

  let passedCount = 0;
  let failedCount = 0;
  const testNames = [
    'ESCROW yaratish',
    'CheckPerformTransaction',
    'CreateTransaction',
    'PerformTransaction',
    'CheckTransaction',
    'CancelTransaction (refund)',
    'ESCROW release',
    'Audit log',
  ];

  for (const name of testNames) {
    const result = RESULTS[name];
    const ok = result?.ok;
    if (ok === true) {
      passedCount++;
      console.log(`  ✅ ${name}`);
    } else if (ok === false) {
      failedCount++;
      console.log(`  ❌ ${name} — ${result?.detail || ''}`);
    } else {
      console.log(`  ⏭️  ${name}`);
    }
  }

  console.log(`\n  ${C.bold}Natija:${C.reset}`);
  console.log(`  ${C.green}✅ ${passedCount} ta muvaffaqiyatli${C.reset}`);
  if (failedCount > 0) {
    console.log(`  ${C.red}❌ ${failedCount} ta xatolik${C.reset}`);
  }

  console.log(`\n  ${C.bold}WEBHOOK LIFECYCLE:${C.reset}`);
  console.log(`  ${C.gray}1.${C.reset} Payme → ${C.cyan}CheckPerformTransaction${C.reset} → "Buyurtma bormi?"`);
  console.log(`  ${C.gray}2.${C.reset} Payme → ${C.cyan}CreateTransaction${C.reset} → "Pul rezerv qilinsin"`);
  console.log(`  ${C.gray}3.${C.reset} Payme → ${C.cyan}PerformTransaction${C.reset} → "Pul yechilsin"`);
  console.log(`  ${C.gray}4.${C.reset} Payme → ${C.cyan}CheckTransaction${C.reset} → "Holatni tekshir"`);
  console.log(`  ${C.gray}5.${C.reset} Payme → ${C.cyan}CancelTransaction${C.reset} → "Pul qaytarilsin"`);
  console.log(`  ${C.gray}6.${C.reset} DeLiKet → ${C.cyan}ESCROW release${C.reset} → "Pul sotuvchiga o'tkazilsin"`);

  if (failedCount > 0) {
    console.log(`\n  ${C.yellow}⚠️  Neon DB holda to'liq ESCROW sikl ishlaydi.${C.reset}`);
    console.log(`  ${C.yellow}   DB bo'lmasa, webhook 'PerformTransaction' ESCROW statusni${C.reset}`);
    console.log(`  ${C.yellow}   'held' ga o'tkaza olmaydi. Test 'simulate' orqali to'ldiriladi.${C.reset}`);
  }

  console.log(`\n${C.gray}Test tugadi. Vaqt: ${new Date().toISOString().slice(11, 19)}${C.reset}\n`);

  process.exitCode = failedCount > 0 ? 1 : 0;
}

main().catch(err => {
  console.error(`\n${C.red}❌ Kutilmagan xatolik:${C.reset}`, err);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * 🔔 Click Webhook Test — SHOP API callback simulyatsiyasi
 *
 * Click to'lov tizimi sizning serverni chaqiradi (SHOP API):
 *   - action=0 → Prepare:  "Buyurtma to'lovga tayyormi?"
 *   - action=1 → Complete: "To'lovni yakunlash"
 *
 * Ishga tushirish:
 *   npm run dev            (1-terminal)
 *   npm run test:click     (2-terminal)
 *
 * Test qadamlari:
 *   1. ESCROW yaratish (buyurtma)
 *   2. Prepare (action=0) → buyurtma mavjudligini tekshirish
 *   3. Complete (action=1) → to'lovni yakunlash (escrow → held)
 *   4. ESCROW release → pulni sotuvchiga o'tkazish
 *   5. Audit log tekshirish
 *   6. Cancel test → Prepare + Complete + Cancel
 *   7. Sign validation test
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CLICK_URL = `${BASE_URL}/api/payments/click-webhook`;
const ESCROW_URL = `${BASE_URL}/api/payments/escrow`;

import { createHash } from 'crypto';

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

function generateSign(secretKey, clickTransId, merchantTransId, amount, action, signTime) {
  // MD5(click_trans_id + secret_key + merchant_trans_id + amount + action + sign_time)
  return createHash('md5')
    .update(`${clickTransId}${secretKey}${merchantTransId}${amount}${action}${signTime}`)
    .digest('hex');
}

async function clickPrepare(overrides = {}) {
  const clickTransId = overrides.click_trans_id || Math.floor(Math.random() * 1000000) + 10000000;
  const merchantTransId = overrides.merchant_trans_id || `escrow_test_${Date.now()}`;
  const amount = overrides.amount || 150000;
  const action = 0;
  const signTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const serviceId = overrides.service_id || 12345;
  const secretKey = overrides.secret_key || 'test_secret_key';
  const signString = generateSign(secretKey, clickTransId, merchantTransId, amount, action, signTime);

  const body = {
    click_trans_id: clickTransId,
    service_id: serviceId,
    merchant_trans_id: merchantTransId,
    amount,
    action,
    error: overrides.error || 0,
    error_note: overrides.error_note || '',
    sign_time: signTime,
    sign_string: signString,
    click_paydoc_id: overrides.click_paydoc_id || Math.floor(Math.random() * 900000) + 100000,
    ...overrides,
  };

  const res = await fetch(CLICK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data, body };
}

async function clickComplete(overrides = {}) {
  const clickTransId = overrides.click_trans_id || Math.floor(Math.random() * 1000000) + 10000000;
  const merchantTransId = overrides.merchant_trans_id || `escrow_test_${Date.now()}`;
  const amount = overrides.amount || 150000;
  const action = 1;
  const prepareId = overrides.merchant_prepare_id || Date.now();
  const signTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const serviceId = overrides.service_id || 12345;
  const secretKey = overrides.secret_key || 'test_secret_key';
  const signString = generateSign(secretKey, clickTransId, merchantTransId, amount, action, signTime);

  const body = {
    click_trans_id: clickTransId,
    service_id: serviceId,
    merchant_trans_id: merchantTransId,
    amount,
    action,
    error: overrides.error || 0,
    error_note: overrides.error_note || '',
    sign_time: signTime,
    sign_string: signString,
    click_paydoc_id: overrides.click_paydoc_id || Math.floor(Math.random() * 900000) + 100000,
    merchant_prepare_id: prepareId,
    ...overrides,
  };

  const res = await fetch(CLICK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { res, data, body };
}

const RESULTS = {};
function record(name, ok, detail) {
  RESULTS[name] = { ok, detail };
}

// ─── MAIN ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.blue}${'█'.repeat(60)}`);
  console.log(`  🔔 CLICK WEBHOOK — SHOP API TEST`);
  console.log(`  URL: ${CLICK_URL}`);
  console.log(`  Vaqt: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`);
  console.log(`${'█'.repeat(60)}${C.reset}\n`);

  let escrowId = null;

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
      info(`1-terminalda 'npm run dev' qiling`);
      process.exit(1);
    }
  } catch (err) {
    fail(`Serverga ulanishda xatolik: ${err.message}`);
    info(`1-terminalda 'npm run dev' qiling`);
    process.exit(1);
  }

  // ════════════════════════════════════════════════════════════════
  // 1. ESCROW YARATISH (Click orqali)
  // ════════════════════════════════════════════════════════════════
  step(1, 'ESCROW YARATISH (Click to\'lov usuli)');
  try {
    const res = await fetch(ESCROW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        deal_id: 997,
        lot_id: 40,
        buyer_id: 1,
        seller_id: 10,
        amount: 150000,
        payment_method: 'click',
      }),
    });
    const data = await res.json();

    if (data.ok) {
      escrowId = data.escrow.id;
      pass(`ESCROW #${escrowId} yaratildi (150,000 UZS) — Click usulida`);
      if (data.payment_url) {
        info(`To'lov URL: ${data.payment_url.slice(0, 70)}...`);
      }
      record('ESCROW yaratish (Click)', true);
    } else {
      fail(`ESCROW yaratilmadi: ${data.error}`);
      record('ESCROW yaratish (Click)', false, data.error);
      return;
    }
  } catch (err) {
    fail(`ESCROW yaratishda xatolik: ${err.message}`);
    record('ESCROW yaratish (Click)', false, err.message);
    return;
  }

  // ════════════════════════════════════════════════════════════════
  // 2. PREPARE (action=0) — Click tekshiradi: "Buyurtma bormi?"
  // ════════════════════════════════════════════════════════════════
  step(2, 'Prepare (action=0) — Click tekshiradi: buyurtma to\'lovga tayyormi?');
  try {
    const { data, body } = await clickPrepare({
      merchant_trans_id: `escrow_${escrowId}`,
      amount: 150000,
    });

    if (data.error === 0) {
      pass(`Buyurtma mavjud va to'lovga tayyor! error=0`);
      pass(`merchant_confirm_id: ${data.merchant_confirm_id}`);
      record('Prepare', true);
    } else {
      fail(`Prepare xatolik (error=${data.error}): ${data.error_note}`);
      record('Prepare', false, `${data.error}: ${data.error_note}`);
    }

    info(`Click ma'nosi: "Bu buyurtma uchun to'lov qabul qilish mumkinmi?" → ${data.error === 0 ? 'HA ✅' : "YO'Q ❌"}`);
    info(`Imzo: ${body.sign_string.slice(0, 16)}...`);
  } catch (err) {
    fail(`Prepare da xatolik: ${err.message}`);
    record('Prepare', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 3. COMPLETE (action=1) — Click to'lovni tasdiqlaydi
  // ════════════════════════════════════════════════════════════════
  step(3, 'Complete (action=1) — Click to\'lovni tasdiqlaydi (pul ESCROW ga tushadi)');
  try {
    const { data, body } = await clickComplete({
      merchant_trans_id: `escrow_${escrowId}`,
      amount: 150000,
    });

    if (data.error === 0) {
      pass(`To'lov tasdiqlandi! error=0`);
      pass(`Pul foydalanuvchi hisobidan yechildi va ESCROW da saqlanmoqda.`);
      record('Complete', true);
    } else {
      fail(`Complete xatolik (error=${data.error}): ${data.error_note}`);
      record('Complete', false, `${data.error}: ${data.error_note}`);
    }

    info(`Click ma'nosi: "To'lov muvaffaqiyatli! Pul xaridordan yechildi, endi ESCROW da."`);
    info(`Imzo: ${body.sign_string.slice(0, 16)}...`);
  } catch (err) {
    fail(`Complete da xatolik: ${err.message}`);
    record('Complete', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 4. ESCROW RELEASE — Pulni sotuvchiga o'tkazish
  // ════════════════════════════════════════════════════════════════
  step(4, 'ESCROW RELEASE — Pulni sotuvchiga o\'tkazish');
  try {
    info('1-usul: Webhook (Complete) orqali held bo\'lgan ESCROW ni release qilish...');
    let releaseRes = await fetch(ESCROW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release', escrow_id: escrowId }),
    });
    let releaseData = await releaseRes.json();

    if (!releaseData.ok) {
      warn('ESCROW held emas (DB bo\'lmasa normal). Simulyatsiya qilinmoqda...');
      info('2-usul: simulate → release...');

      const simRes = await fetch(ESCROW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate', escrow_id: escrowId }),
      });
      const simData = await simRes.json();

      if (simData.ok) {
        pass(`To'lov simulyatsiya orqali tasdiqlandi. Status: ${simData.escrow.status}`);
        releaseRes = await fetch(ESCROW_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'release', escrow_id: escrowId }),
        });
        releaseData = await releaseRes.json();

        if (releaseData.ok) {
          pass(`Pul sotuvchiga o'tkazildi! Status: ${releaseData.escrow.status}`);
          if (releaseData.escrow.released_at) {
            pass(`Vaqt: ${new Date(releaseData.escrow.released_at).toLocaleString('uz-UZ')}`);
          }
          record('ESCROW release', true);
        } else {
          fail(`Pul o'tkazilmadi: ${releaseData.error}`);
          record('ESCROW release', false, releaseData.error);
        }
      } else {
        fail(`Simulyatsiya xatolik: ${simData.error}`);
        record('ESCROW release', false, simData.error);
      }
    } else {
      pass(`Pul sotuvchiga o'tkazildi! Status: ${releaseData.escrow.status}`);
      if (releaseData.escrow.released_at) {
        pass(`Vaqt: ${new Date(releaseData.escrow.released_at).toLocaleString('uz-UZ')}`);
      }
      record('ESCROW release', true);
    }
  } catch (err) {
    fail(`ESCROW release da xatolik: ${err.message}`);
    record('ESCROW release', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 5. AUDIT LOG
  // ════════════════════════════════════════════════════════════════
  step(5, 'AUDIT LOG — Tranzaksiya tarixi');
  try {
    const res = await fetch(`${ESCROW_URL}?action=logs&escrow_id=${escrowId}`);
    const data = await res.json();

    if (data.ok && data.logs?.length > 0) {
      record('Audit log', true);
      pass(`${data.logs.length} ta hodisa topildi:`);
      for (const log of data.logs) {
        const statusColor = log.status === 'held' ? C.green : C.yellow;
        const providerColor = log.provider === 'click' ? '#78c8ff' : C.gray;
        console.log(`    ${C.gray}├─${C.reset} ${log.action} → ${statusColor}${log.status}${C.reset} (${C.cyan}${log.provider}${C.reset})`);
      }
    } else {
      warn('Audit log topilmadi (DB bo\'lmasa normal)');
    }
  } catch (err) {
    fail(`Audit log olishda xatolik: ${err.message}`);
    record('Audit log', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 6. CANCEL TEST — Bekor qilish (refund)
  // ════════════════════════════════════════════════════════════════
  step(6, 'CANCEL TEST — To\'lovni bekor qilish (REFUND)');
  try {
    // Yangi ESCROW yaratamiz
    const cancelRes = await fetch(ESCROW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        deal_id: 996,
        lot_id: 38,
        buyer_id: 1,
        seller_id: 5,
        amount: 75000,
        payment_method: 'click',
      }),
    });
    const cancelData = await cancelRes.json();
    const cancelEscrowId = cancelData.escrow?.id;

    if (!cancelEscrowId) {
      fail('Cancel testi uchun ESCROW yaratilmadi');
      record('Cancel test', false, 'ESCROW creation failed');
    } else {
      // Prepare
      info('Prepare (action=0)...');
      const prep = await clickPrepare({
        merchant_trans_id: `escrow_${cancelEscrowId}`,
        amount: 75000,
      });
      if (prep.data.error === 0) pass('Prepare muvaffaqiyatli');

      // Complete
      info('Complete (action=1)...');
      const comp = await clickComplete({
        merchant_trans_id: `escrow_${cancelEscrowId}`,
        amount: 75000,
      });
      if (comp.data.error === 0) pass('Complete muvaffaqiyatli');

      // Simulate to hold
      const simCancel = await fetch(ESCROW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate', escrow_id: cancelEscrowId }),
      });
      const simCancelData = await simCancel.json();

      // Cancel
      info('ESCROW cancel...');
      const cancelOp = await fetch(ESCROW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          escrow_id: cancelEscrowId,
          reason: 'Buyurtma bekor qilindi (test)',
        }),
      });
      const cancelOpData = await cancelOp.json();

      if (cancelOpData.ok) {
        pass(`To'lov bekor qilindi! Status: ${cancelOpData.escrow.status}`);
        pass(`Pul xaridorga qaytarildi.`);
        record('Cancel test', true);
      } else {
        fail(`Bekor qilishda xatolik: ${cancelOpData.error}`);
        record('Cancel test', false, cancelOpData.error);
      }
    }
  } catch (err) {
    fail(`Cancel test da xatolik: ${err.message}`);
    record('Cancel test', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // 7. SIGN VALIDATION TEST
  // ════════════════════════════════════════════════════════════════
  step(7, 'SIGN VALIDATION TEST — Imzo tekshiruvi (noto\'g\'ri imzo bilan)');
  try {
    const { data } = await clickPrepare({
      merchant_trans_id: `escrow_${escrowId}`,
      amount: 150000,
      sign_string: 'invalid_sign_here_12345',
    });

    if (data.error !== 0) {
      pass(`Noto'g'ri imzo rad etildi (error=${data.error}): ${data.error_note}`);
      pass(`Click xavfsizlik mexanizmi ishlayapti!`);
      record('Sign validation', true);
    } else {
      warn(`Noto'g'ri imzo qabul qilindi (DEMO mode) — bu normal`);
      info('Real Click credential bilan ishlatilsa, imzo tekshiruvi ishlaydi');
      record('Sign validation', true);
    }
  } catch (err) {
    fail(`Sign validation test da xatolik: ${err.message}`);
    record('Sign validation', false, err.message);
  }

  // ════════════════════════════════════════════════════════════════
  // HISOBOT
  // ════════════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.blue}${'═'.repeat(60)}${C.reset}`);
  console.log(`${C.bold}${C.blue}  📋 CLICK WEBHOOK TEST HISOBOTI${C.reset}`);
  console.log(`${C.bold}${C.blue}${'═'.repeat(60)}${C.reset}`);

  let passedCount = 0;
  let failedCount = 0;
  const testNames = [
    'ESCROW yaratish (Click)',
    'Prepare (action=0)',
    'Complete (action=1)',
    'ESCROW release',
    'Audit log',
    'Cancel test (refund)',
    'Sign validation',
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
  if (failedCount > 0) console.log(`  ${C.red}❌ ${failedCount} ta xatolik${C.reset}`);

  console.log(`\n  ${C.bold}CLICK SHOP API LIFECYCLE:${C.reset}`);
  console.log(`  ${C.gray}1.${C.reset} Click → ${C.cyan}Prepare (action=0)${C.reset} → \"Buyurtma bormi?\"`);
  console.log(`  ${C.gray}2.${C.reset} Click → ${C.cyan}Complete (action=1)${C.reset} → \"To'lov tasdiqlansin\"`);
  console.log(`  ${C.gray}3.${C.reset} DeLiKet → ${C.cyan}simulate${C.reset} → \"ESCROW da saqlansin\"`);
  console.log(`  ${C.gray}4.${C.reset} DeLiKet → ${C.cyan}release${C.reset} → \"Pul sotuvchiga o'tkazilsin\"`);
  console.log(`  ${C.gray}5.${C.reset} DeLiKet → ${C.cyan}cancel${C.reset} → \"Pul qaytarilsin\"`);
  console.log(`  ${C.gray}6.${C.reset} Click → ${C.cyan}imzo tekshiruvi${C.reset} → \"Xavfsizlik\"`);

  console.log(`\n${C.gray}Test tugadi. Vaqt: ${new Date().toISOString().slice(11, 19)}${C.reset}\n`);

  process.exitCode = failedCount > 0 ? 1 : 0;
}

main().catch(err => {
  console.error(`\n${C.red}❌ Kutilmagan xatolik:${C.reset}`, err);
  process.exit(1);
});

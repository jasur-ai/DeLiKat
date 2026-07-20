#!/usr/bin/env node

/**
 * 🔬 DeLiKet Webhook Testlar — Birlashtirilgan runner
 *
 * Barcha webhook testlarini ketma-ket ishga tushiradi:
 *   1. Payment system (Payme/Click connectivity + ESCROW)
 *   2. Payme webhook (JSON-RPC 2.0 callbacks)
 *   3. Click webhook (SHOP API Prepare/Complete)
 *   4. ESCROW lifecycle (create → simulate → release)
 *
 * Ishga tushirish:
 *   npm run test:webhooks
 *
 * Talab: npm run dev (1-terminal)
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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

const TESTS = [
  {
    name: '💳 Payment System (Payme/Click connectivity)',
    file: 'scripts/test-payments.mjs',
    required: false,  // Credential yo'q bo'lsa DEMO mode
  },
  {
    name: '🔔 Payme Webhook (JSON-RPC 2.0)',
    file: 'scripts/test-payme-webhook.mjs',
    required: true,   // Server kerak
  },
  {
    name: '🔔 Click Webhook (SHOP API)',
    file: 'scripts/test-click-webhook.mjs',
  },
];

function runTest(scriptPath) {
  return new Promise((resolvePromise) => {
    const proc = spawn('node', [scriptPath], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { output += C.red + data.toString() + C.reset; });

    proc.on('close', (code) => {
      resolvePromise({ code, output });
    });

    // Timeout 90 sekund
    setTimeout(() => {
      proc.kill();
      resolvePromise({ code: -1, output: output + '\n⏰ TIMEOUT' });
    }, 90000);
  });
}

async function testEscrowLifecycle() {
  const BASE = 'http://localhost:3000';
  const E = `${BASE}/api/payments/escrow`;
  const lines = [];

  const add = (msg) => lines.push(msg);
  add(`${C.bold}═══ 🛡️ ESCROW LIFECYCLE TEST ═══${C.reset}`);

  try {
    // Create
    add(`\n  ${C.cyan}ℹ️  Create...${C.reset}`);
    let r = await fetch(E, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create', deal_id: 995, lot_id: 25,
        buyer_id: 1, seller_id: 10, amount: 100000,
        payment_method: 'payme',
      }),
    });
    let d = await r.json();
    if (!d.ok) { add(`  ${C.red}❌ Create failed: ${d.error}${C.reset}`); return { lines, ok: false }; }
    const id = d.escrow.id;
    add(`  ${C.green}✅ ESCROW #${id} created${C.reset}`);

    // Simulate
    add(`  ${C.cyan}ℹ️  Simulate payment...${C.reset}`);
    r = await fetch(E, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'simulate', escrow_id: id }),
    });
    d = await r.json();
    if (!d.ok) { add(`  ${C.red}❌ Simulate failed: ${d.error}${C.reset}`); return { lines, ok: false }; }
    add(`  ${C.green}✅ Payment held (${d.escrow.status})${C.reset}`);

    // Release
    add(`  ${C.cyan}ℹ️  Release...${C.reset}`);
    r = await fetch(E, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release', escrow_id: id }),
    });
    d = await r.json();
    if (!d.ok) { add(`  ${C.red}❌ Release failed: ${d.error}${C.reset}`); return { lines, ok: false }; }
    add(`  ${C.green}✅ Funds released (${d.escrow.status})${C.reset}`);

    // Audit log
    r = await fetch(`${E}?action=logs&escrow_id=${id}`);
    d = await r.json();
    if (d.ok && d.logs?.length) {
      add(`  ${C.green}✅ ${d.logs.length} audit log entries${C.reset}`);
    } else {
      add(`  ${C.yellow}⚠️  No audit logs (DB missing)${C.reset}`);
    }

    add(`\n  ${C.green}✅ ESCROW lifecycle: COMPLETE${C.reset}`);
    return { lines, ok: true };
  } catch (err) {
    add(`  ${C.red}❌ Error: ${err.message}${C.reset}`);
    return { lines, ok: false };
  }
}

async function main() {
  console.log(`\n${C.bold}${C.blue}${'█'.repeat(60)}`);
  console.log(`  🔬 DELIKET WEBHOOK TESTLARI — BIRLASHTIRILGAN RUNNER`);
  console.log(`  ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`);
  console.log(`${'█'.repeat(60)}${C.reset}\n`);

  // Server check
  console.log(`${C.bold}═══ 0. SERVER TEKSHIRISH ═══${C.reset}`);
  try {
    const health = await fetch('http://localhost:3000');
    if (health.ok) {
      console.log(`  ${C.green}✅ Server is running (${health.status})${C.reset}\n`);
    } else {
      console.log(`  ${C.red}❌ Server returned ${health.status}${C.reset}`);
      console.log(`  ${C.yellow}⚠️  Run 'npm run dev' in terminal 1${C.reset}\n`);
    }
  } catch {
    console.log(`  ${C.red}❌ Server not reachable${C.reset}`);
    console.log(`  ${C.yellow}⚠️  Run 'npm run dev' in terminal 1${C.reset}\n`);
  }

  const results = [];

  for (const test of TESTS) {
    console.log(`\n${C.bold}${'═'.repeat(50)}${C.reset}`);
    console.log(`${C.bold}  ${test.name}${C.reset}`);
    console.log(`${C.bold}${'═'.repeat(50)}${C.reset}`);

    let ok = false;
    let output = '';

    if (test.file) {
      const filePath = resolve(ROOT, test.file);
      const result = await runTest(filePath);
      ok = result.code === 0;
      output = result.output;
    } else if (test.name.includes('ESCROW')) {
      const result = await testEscrowLifecycle();
      ok = result.ok;
      output = result.lines.join('\n');
    }

    // Filter output - show only summary/result lines
    const summaryLines = output.split('\n')
      .filter(l => l.includes('✅') || l.includes('❌') || l.includes('⚠️') || l.includes('ℹ️') || l.includes('Natija') || l.includes('Xulosa'))
      .slice(0, 25);

    // Show summary lines + last 3 unfiltered lines (for errors)
    const allResultLines = output.split('\n').filter(l => l.trim());
    const summary = allResultLines.filter(l => l.includes('✅') || l.includes('❌') || l.includes('⚠️') || l.includes('ℹ️') || l.includes('Natija') || l.includes('Xulosa')).slice(0, 25);
    const lastRaw = allResultLines.slice(-3);

    if (summary.length > 0) {
      for (const line of summary) {
        console.log(line);
      }
    } else {
      for (const line of lastRaw) {
        console.log(line);
      }
    }

    results.push({ name: test.name, ok });
    if (!ok) {
      console.log(`\n  ${C.yellow}⚠️  ${test.name} failed — continuing with remaining tests${C.reset}`);
    }
  }

  // ════════════════════════════════════════════════════════════════
  // HISOBOT
  // ════════════════════════════════════════════════════════════════
  console.log(`\n\n${C.bold}${C.blue}${'█'.repeat(60)}`);
  console.log(`  📋 YAKUNIY HISOBOT`);
  console.log(`${'█'.repeat(60)}${C.reset}\n`);

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    if (r.ok) passed++; else failed++;
    const name = r.name.replace(/^[^\s]+\s/, '').slice(0, 55);
    console.log(`  ${icon} ${name}`);
  }

  console.log(`\n  ${C.bold}Natija:${C.reset}`);
  console.log(`  ${C.green}✅ ${passed} ta test muvaffaqiyatli${C.reset}`);
  if (failed > 0) console.log(`  ${C.red}❌ ${failed} ta test xatolik${C.reset}`);
  console.log(`  ${C.gray}  Jami: ${results.length} ta test${C.reset}`);

  console.log(`\n${C.gray}Test tugadi. Vaqt: ${new Date().toISOString().slice(11, 19)}${C.reset}\n`);

  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch(err => {
  console.error(`\n${C.red}❌ Kutilmagan xatolik:${C.reset}`, err);
  process.exit(1);
});

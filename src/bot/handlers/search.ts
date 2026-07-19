import { Composer } from 'telegraf';
import { query, queryOne } from '../../lib/db';
import { categoryKeyboard, paginatedLotKeyboard, lotDetailKeyboard, mybidsKeyboard, bidActionKeyboard, confirmCancelKeyboard, mainMenuKeyboard } from '../keyboards/menu';
import { sessionManager } from '../utils/session';
import { lotDetail, lotSummary, price, SEP } from '../utils/formatting';
import { CATEGORY_EMOJI } from '../utils/i18n';

const VALID_CATEGORIES = ['smartfon', 'notebook', 'tv', 'audio', 'aksesuar', 'kiyim'];
const PER_PAGE = 5;

export const searchCommands = new Composer();

// /search
searchCommands.command('search', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) {
    return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');
  }

  const args = ctx.message?.text?.split(' ').slice(1);
  const category = args?.[0]?.toLowerCase();

  if (category && VALID_CATEGORIES.includes(category)) {
    await showCategoryLots(ctx, category);
  } else {
    await ctx.replyWithHTML(
      '🔍 <b>Lot qidirish</b>\n\nKategoriya tanlang:\n' +
      '📱 smartfon • 💻 notebook • 📺 tv • 🎧 audio • 🔌 aksesuar • 👕 kiyim',
      { reply_markup: categoryKeyboard().reply_markup }
    );
  }
});

export async function showCategoryLots(ctx: any, category: string, page = 0, edit = false) {
  const lots = await query<any>(
    'SELECT * FROM lots WHERE category = $1 AND status = $2 ORDER BY created_at DESC',
    [category, 'aktiv']
  );
  const total = lots.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = page * PER_PAGE;

  if (total === 0) {
    const msg = `📭 <b>${category.toUpperCase()}</b> — hozircha aktiv lot yo'q.`;
    const kb = { reply_markup: categoryKeyboard().reply_markup };
    if (edit) return ctx.editMessageText(msg, { parse_mode: 'HTML', ...kb });
    return ctx.replyWithHTML(msg, kb);
  }

  const emoji = CATEGORY_EMOJI[category] || '📦';
  const pageIndicator = totalPages > 1 ? ` ${page + 1}/${totalPages}` : '';
  let msg = `${emoji} <b>${category.toUpperCase()}</b> (${total} ta lot)${pageIndicator}\n${SEP}\n\n`;

  for (const lot of lots.slice(start, start + PER_PAGE)) {
    msg += lotSummary(lot) + '\n\n';
  }

  const keyboard = paginatedLotKeyboard(lots.slice(start, start + PER_PAGE), page, totalPages, category);
  const extra = { parse_mode: 'HTML' as const, reply_markup: keyboard.reply_markup };
  if (edit) return ctx.editMessageText(msg, extra);
  await ctx.replyWithHTML(msg, extra);
}

// /bid
searchCommands.command('bid', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) {
    return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');
  }

  const args = ctx.message?.text?.split(' ').slice(1);
  if (args.length < 2) {
    return ctx.replyWithHTML(
      '❌ Noto\'g\'ri format.\n\nIshlatish: <b>/bid [lot_id] [narx]</b>\nMisol: <b>/bid 1 7500000</b>'
    );
  }

  const lotId = parseInt(args[0]);
  const bidPrice = parseFloat(args[1].replace(/\s/g, ''));
  const quantity = args[2] ? Math.max(1, parseInt(args[2])) : 1;

  if (isNaN(lotId) || isNaN(bidPrice) || bidPrice <= 0) {
    return ctx.reply('❌ Lot ID va narx raqam bo\'lishi kerak.');
  }

  try {
    const lot = await queryOne<any>('SELECT * FROM lots WHERE id = $1 AND status = $2', [lotId, 'aktiv']);
    if (!lot) return ctx.reply('❌ Bu lot topilmadi yoki aktiv emas.');
    if (lot.seller_id === userId) return ctx.reply('❌ O\'z lothingizga taklif yubora olmaysiz.');
    if (bidPrice > lot.price * 2) return ctx.reply(`❌ Taklif narxi lot narxidan 2 barobar ko'p bo'lmasligi kerak. Lot narxi: ${price(lot.price)}`);
    if (quantity > lot.quantity) return ctx.reply(`❌ Kiritilgan son (${quantity}) lot sonidan (${lot.quantity}) ko'p.`);

    // Check duplicate bid
    const existing = await queryOne<any>(
      'SELECT * FROM bids WHERE lot_id = $1 AND buyer_id = $2 AND status = $3',
      [lotId, userId, 'kutmoqda']
    );
    if (existing) {
      return ctx.replyWithHTML(
        `⚠️ Bu lotga avval taklif yuborgansiz (ID: #${existing.id}).\n\n` +
        `Avvalgi taklif: ${price(existing.price)}\nYangi taklif: ${price(bidPrice)}\n\n` +
        `Avvalgi taklifni bekor qilish: /cancelbid ${existing.id}\nYangi taklif yuborish: /bid ${lotId} ${bidPrice}`
      );
    }

    const result = await queryOne<any>(
      `INSERT INTO bids (lot_id, buyer_id, price, quantity, status) VALUES ($1, $2, $3, $4, 'kutmoqda') RETURNING id`,
      [lotId, userId, bidPrice, quantity]
    );

    // Notify seller
    try {
      const seller = await queryOne<any>('SELECT * FROM users WHERE id = $1', [lot.seller_id]);
      if (seller) {
        const total = bidPrice * quantity;
        await ctx.telegram.sendMessage(
          seller.id,
          `📩 <b>Yangi taklif!</b>\n${SEP}\n` +
          `  📦 Lot: <b>#${lot.id}</b> — ${lot.title}\n` +
          `  💰 Taklif: <b>${price(bidPrice)}</b> × ${quantity} dona\n` +
          `  💰 Jami: <b>${price(total)}</b>\n` +
          `${SEP}\n\nIltimos, taklifni qabul qiling yoki rad eting:`,
          { parse_mode: 'HTML', reply_markup: bidActionKeyboard(result.id).reply_markup }
        );
      }
    } catch { /* seller notifications off */ }

    await ctx.replyWithHTML(
      `✅ <b>Taklif #${result.id} yuborildi!</b>\n${SEP}\n` +
      `  📦 Lot: <b>#${lotId}</b> — ${lot.title}\n` +
      `  💰 Taklif: <b>${price(bidPrice)}</b> × ${quantity} dona\n` +
      `  💰 Jami: <b>${price(bidPrice * quantity)}</b>\n${SEP}\n\n` +
      `⏳ Sotuvchi javobini kuting.\n/myBids — Statusni kuzating`,
      { reply_markup: mainMenuKeyboard().reply_markup }
    );
  } catch (err) {
    console.error('Bid error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// /mybids
searchCommands.command('mybids', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) {
    return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');
  }

  const bids = await query<any>(
    `SELECT b.*, l.title as lot_title, l.price as lot_price
     FROM bids b LEFT JOIN lots l ON b.lot_id = l.id
     WHERE b.buyer_id = $1 ORDER BY b.created_at DESC LIMIT 10`,
    [userId]
  );

  if (bids.length === 0) {
    return ctx.replyWithHTML(
      '💰 <b>Takliflarim</b>\n\nHozircha takliflaringiz yo\'q.\nLotlarni /search orqali topishingiz mumkin.',
      mainMenuKeyboard()
    );
  }

  let msg = `💰 <b>Takliflarim (${bids.length} ta)</b>\n${SEP}\n\n`;
  for (const b of bids) {
    const statusEmoji: Record<string, string> = { kutmoqda: '⏳', qabul: '✅', rad: '❌' };
    msg += `${statusEmoji[b.status] || '⏳'} <b>#${b.id}</b> ${b.lot_title || '—'}\n  ${price(b.price)} × ${b.quantity} dona | <b>${b.status}</b>\n\n`;
  }

  await ctx.replyWithHTML(msg, { reply_markup: mybidsKeyboard(bids).reply_markup });
});

// /cancelbid
searchCommands.command('cancelbid', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const args = ctx.message?.text?.split(' ').slice(1);
  if (args.length < 1) {
    return ctx.reply('Ishlatish: <b>/cancelbid [bid_id]</b>\nTaklif ID larini /myBids orqali topishingiz mumkin.');
  }

  const bidId = parseInt(args[0]);
  const bid = await queryOne<any>('SELECT * FROM bids WHERE id = $1 AND buyer_id = $2', [bidId, userId]);
  if (!bid) return ctx.reply('❌ Bu taklif topilmadi yoki sizga tegishli emas.');
  if (bid.status !== 'kutmoqda') return ctx.reply(`❌ Bu taklifni bekor qilib bo'lmaydi. Status: ${bid.status}`);

  await query('UPDATE bids SET status = $1 WHERE id = $2', ['rad', bidId]);
  await ctx.replyWithHTML(`✅ <b>Taklif #${bidId} bekor qilindi</b>`);
});

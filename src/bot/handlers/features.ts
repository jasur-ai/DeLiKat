import { Composer, Markup } from 'telegraf';
import { query, queryOne } from '../../lib/db';
import { mainMenuKeyboard } from '../keyboards/menu';
import { sessionManager } from '../utils/session';
import { SEP, price } from '../utils/formatting';
import { CATEGORY_EMOJI, STATUS_EMOJI, GRADE_EMOJI, GRADE_LABELS } from '../utils/i18n';

const WEB_URL = process.env.WEB_URL || 'https://delikat.vercel.app';

export const featureCommands = new Composer();

// ============== FEATURE 1: /notifications ==============
featureCommands.command('notifications', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');

  try {
    const activeBids = (await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE buyer_id = $1 AND status = 'kutmoqda'", [userId]))?.cnt || 0;
    const activeAlerts = (await queryOne<any>("SELECT COUNT(*) as cnt FROM price_alerts WHERE user_id = $1 AND is_triggered = false", [userId]))?.cnt || 0;
    const savedSearches = (await queryOne<any>("SELECT COUNT(*) as cnt FROM saved_searches WHERE user_id = $1 AND is_active = true", [userId]))?.cnt || 0;

    await ctx.replyWithHTML(
      `🔔 <b>Bildirishnomalar</b>\n${SEP}\n\n` +
      `<b>📊 Faol bildirishnomalaringiz:</b>\n` +
      `  • ⏳ Kutilayotgan takliflar: <b>${activeBids} ta</b>\n` +
      `  • 📉 Narx kuzatuvlari: <b>${activeAlerts} ta</b>\n` +
      `  • 🔍 Saqlangan qidiruvlar: <b>${savedSearches} ta</b>\n\n` +
      `<b>Avtomatik bildirishnomalar:</b>\n` +
      `  ✅ Yangi taklif kelganda → darhol xabar\n` +
      `  ✅ Taklif qabul qilinganda/rad etilganda\n` +
      `  ✅ Lot narxi tushganda\n` +
      `  ✅ Saqlangan qidiruv bo'yicha yangi lot chiqsa\n\n` +
      `${SEP}\n<i>Bildirishnomalar Telegram orqali avtomatik yuboriladi</i>`
    );
  } catch (err) {
    console.error('Notifications error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// ============== FEATURE 2: /wishlist ==============
featureCommands.command('wishlist', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');

  try {
    const wishlist = await query<any>(
      `SELECT w.*, l.title, l.price, l.category, l.status, l.quantity
       FROM wishlist w LEFT JOIN lots l ON w.lot_id = l.id
       WHERE w.user_id = $1 ORDER BY w.created_at DESC`,
      [userId]
    );

    if (!wishlist || wishlist.length === 0) {
      return ctx.replyWithHTML(
        `❤️ <b>Sevimli lotlar</b>\n\nHozircha sevimli lotlar yo'q.\n\n` +
        `Lot detallarida ⭐ tugmasini bosib sevimlilarga qo'shing!\nLotlarni ko'rish: /search`,
        mainMenuKeyboard()
      );
    }

    let msg = `❤️ <b>Sevimli lotlar (${wishlist.length} ta)</b>\n${SEP}\n\n`;
    for (const item of wishlist) {
      const emoji = CATEGORY_EMOJI[item.category] || '📦';
      const statusEmoji = STATUS_EMOJI[item.status] || '⚪';
      msg += `${emoji} <b>#${item.lot_id}</b> — ${(item.title || '').slice(0, 50)}\n  💰 ${price(item.price)} | ${statusEmoji} ${item.status}\n\n`;
    }

    await ctx.replyWithHTML(msg, mainMenuKeyboard());
  } catch (err) {
    console.error('Wishlist error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// ============== FEATURE 3: /savesearch ==============
featureCommands.command('savesearch', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');

  const args = ctx.message?.text?.split(' ').slice(1) || [];

  try {
    if (args.length === 0 || args[0] === 'help') {
      return ctx.replyWithHTML(
        `🔍 <b>Saqlangan qidiruvlar</b>\n\n` +
        `Bu funksiya orqali qidiruvlaringizni saqlab, yangi mos lot chiqishi bilan bildirishnoma olishingiz mumkin.\n\n` +
        `<b>Buyruqlar:</b>\n` +
        `• /savesearch [so'z] — yangi qidiruv saqlash\n` +
        `• /savesearch list — barcha qidiruvlar\n` +
        `• /savesearch remove [id] — o'chirish\n\n` +
        `<b>Misol:</b>\n` +
        `/savesearch iPhone 13`,
        mainMenuKeyboard()
      );
    }

    if (args[0] === 'list') {
      const searches = await query<any>(
        `SELECT * FROM saved_searches WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC`,
        [userId]
      );
      if (!searches || searches.length === 0) {
        return ctx.replyWithHTML(
          `🔍 <b>Saqlangan qidiruvlar</b>\n\nHozircha saqlangan qidiruv yo'q.\n\n` +
          `Yangi qidiruv saqlash: /savesearch [so'z]\n` +
          `Misol: /savesearch iPhone 13`,
          mainMenuKeyboard()
        );
      }
      let msg = `🔍 <b>Saqlangan qidiruvlar (${searches.length} ta)</b>\n${SEP}\n\n`;
      for (const s of searches) {
        msg += `<b>#${s.id}</b> — ${(s.query || '').slice(0, 40)}\n` +
          `  /savesearch remove ${s.id} ❌ o'chirish\n\n`;
      }
      await ctx.replyWithHTML(msg, mainMenuKeyboard());
      return;
    }

    if (args[0] === 'remove' && args[1]) {
      const searchId = parseInt(args[1]);
      await query('UPDATE saved_searches SET is_active = false WHERE id = $1 AND user_id = $2', [searchId, userId]);
      await ctx.replyWithHTML(`✅ Qidiruv #${searchId} o'chirildi.`);
      return;
    }

    // Save new search
    const searchText = args.join(' ');
    const result = await queryOne<any>(
      `INSERT INTO saved_searches (user_id, query, is_active) VALUES ($1, $2, true) RETURNING id`,
      [userId, searchText]
    );

    await ctx.replyWithHTML(
      `✅ <b>Qidiruv saqlandi!</b>\n\n` +
      `🔍 <b>So'rov:</b> ${searchText.slice(0, 100)}\n\n` +
      `<i>Yangi mos lot chiqishi bilan xabar beramiz!</i>\n\n` +
      `Barcha qidiruvlar: /savesearch list`,
      mainMenuKeyboard()
    );
  } catch (err) {
    console.error('Savesearch error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// ============== FEATURE 4: /pricealert ==============
featureCommands.command('pricealert', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');

  const args = ctx.message?.text?.split(' ').slice(1) || [];

  try {
    if (args.length === 0 || args[0] === 'help') {
      return ctx.replyWithHTML(
        `📉 <b>Narx kuzatuvlari</b>\n\nLot narxi tushganda xabar olish imkoniyati!\n\n` +
        `<b>Buyruqlar:</b>\n` +
        `• /pricealert [lot_id] [narx] — yangi kuzatuv\n` +
        `• /pricealert list — barcha kuzatuvlar\n` +
        `• /pricealert remove [id] — o'chirish\n\n` +
        `<b>Misol:</b>\n` +
        `/pricealert 5 500000`,
        mainMenuKeyboard()
      );
    }

    if (args[0] === 'list') {
      const alerts = await query<any>(
        `SELECT pa.*, l.title, l.price as lot_price FROM price_alerts pa
         LEFT JOIN lots l ON pa.lot_id = l.id
         WHERE pa.user_id = $1 ORDER BY pa.created_at DESC`,
        [userId]
      );
      if (!alerts || alerts.length === 0) {
        return ctx.replyWithHTML(
          `📉 <b>Narx kuzatuvlari</b>\n\nHozircha narx kuzatuvlari yo'q.\n\n` +
          `Yangi qo'shish: /pricealert [lot_id] [maqsad_narx]\n` +
          `Misol: /pricealert 5 500000`,
          mainMenuKeyboard()
        );
      }
      let msg = `📉 <b>Narx kuzatuvlari (${alerts.length} ta)</b>\n${SEP}\n\n`;
      for (const a of alerts) {
        const status = a.is_triggered ? '✅ Ishga tushgan' : '⏳ Kuzatilmoqda';
        msg += `<b>#${a.id}</b> — ${a.title || "Noma'lum lot"}\n  🎯 Maqsad: ${price(a.target_price)} | ${status}\n  /pricealert remove ${a.id} ❌\n\n`;
      }
      await ctx.replyWithHTML(msg, mainMenuKeyboard());
      return;
    }

    if (args[0] === 'remove' && args[1]) {
      const alertId = parseInt(args[1]);
      await query('DELETE FROM price_alerts WHERE id = $1 AND user_id = $2', [alertId, userId]);
      await ctx.replyWithHTML(`✅ Kuzatuv #${alertId} o'chirildi.`);
      return;
    }

    // Create new alert
    const lotId = parseInt(args[0]);
    const targetPrice = parseFloat(args[1]);

    if (isNaN(lotId) || isNaN(targetPrice) || targetPrice <= 0) {
      return ctx.reply('❌ Noto\'g\'ri format. Misol: /pricealert 5 500000');
    }

    const lot = await queryOne<any>('SELECT * FROM lots WHERE id = $1', [lotId]);
    if (!lot) return ctx.reply('❌ Lot topilmadi.');
    if (targetPrice >= lot.price) {
      return ctx.reply(`❌ Maqsad narx hozirgi narxdan (${price(lot.price)}) past bo'lishi kerak.`);
    }

    const alert = await queryOne<any>(
      `INSERT INTO price_alerts (user_id, lot_id, target_price) VALUES ($1, $2, $3) RETURNING id`,
      [userId, lotId, targetPrice]
    );

    await ctx.replyWithHTML(
      `✅ <b>Narx kuzatuvi qo'shildi!</b>\n\n` +
      `📦 Lot: #${lotId} — ${lot.title}\n` +
      `💰 Hozirgi narx: ${price(lot.price)}\n` +
      `🎯 Maqsad narx: ${price(targetPrice)}\n\n` +
      `<i>Narx tushishi bilan darhol xabar beramiz!</i>\n\n` +
      `Barcha kuzatuvlar: /pricealert list`,
      mainMenuKeyboard()
    );
  } catch (err) {
    console.error('Pricealert error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// ============== FEATURE 5: /myanalytics ==============
featureCommands.command('myanalytics', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');

  try {
    const user = await queryOne<any>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) return ctx.reply('⚠️ Ro\'yxatdan o\'tmagansiz. /start');

    const totalBids = (await queryOne<any>('SELECT COUNT(*) as cnt FROM bids WHERE buyer_id = $1', [userId]))?.cnt || 0;
    const acceptedBids = (await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE buyer_id = $1 AND status = 'qabul'", [userId]))?.cnt || 0;
    const rejectedBids = (await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE buyer_id = $1 AND status = 'rad'", [userId]))?.cnt || 0;
    const pendingBids = (await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE buyer_id = $1 AND status = 'kutmoqda'", [userId]))?.cnt || 0;
    const totalLots = (await queryOne<any>('SELECT COUNT(*) as cnt FROM lots WHERE seller_id = $1', [userId]))?.cnt || 0;
    const soldLots = (await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE seller_id = $1 AND status = 'sotilgan'", [userId]))?.cnt || 0;
    const activeLots = (await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE seller_id = $1 AND status = 'aktiv'", [userId]))?.cnt || 0;
    const winRate = totalBids > 0 ? (acceptedBids / totalBids * 100).toFixed(1) : '0';

    const totalSpent = (await queryOne<any>("SELECT COALESCE(SUM(price * quantity), 0) as total FROM bids WHERE buyer_id = $1 AND status = 'qabul'", [userId]))?.total || 0;
    const totalEarned = (await queryOne<any>("SELECT COALESCE(SUM(price * quantity), 0) as total FROM lots WHERE seller_id = $1 AND status = 'sotilgan'", [userId]))?.total || 0;

    let trustMsg = '🟠 Yangi foydalanuvchi';
    if (user.trust_score >= 80) trustMsg = '🟢 Yuqori';
    else if (user.trust_score >= 50) trustMsg = '🟡 O\'rtacha';

    await ctx.replyWithHTML(
      `📊 <b>Shaxsiy analitika</b>\n${SEP}\n\n` +
      `<b>👤 Profil</b>\n` +
      `  Daraja: <b>Lv.${user.level || 1}</b> | XP: <b>${user.xp || 0}</b>\n` +
      `  Ishonch reytingi: ${trustMsg}\n\n` +
      `<b>💰 Xaridor sifatida</b>\n` +
      `  Jami takliflar: <b>${totalBids} ta</b>\n` +
      `  ✅ Qabul: ${acceptedBids}  |  ❌ Rad: ${rejectedBids}  |  ⏳ Kutilmoqda: ${pendingBids}\n` +
      `  🏆 G'alaba darajasi: <b>${winRate}%</b>\n` +
      `  💵 Sarflangan: <b>${price(totalSpent)}</b>\n\n` +
      `<b>📦 Sotuvchi sifatida</b>\n` +
      `  Jami lotlar: <b>${totalLots} ta</b>\n` +
      `  🟢 Aktiv: ${activeLots}  |  💰 Sotilgan: ${soldLots}\n` +
      `  💵 Daromad: <b>${price(totalEarned)}</b>\n\n` +
      `${SEP}\n<i>Statistika har safar yangilanadi</i>`,
      mainMenuKeyboard()
    );
  } catch (err) {
    console.error('Myanalytics error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// ============== FEATURE 7: /share ==============
featureCommands.command('share', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');

  const args = ctx.message?.text?.split(' ').slice(1) || [];
  if (args.length < 1) {
    return ctx.replyWithHTML(
      `📱 <b>Lotni ulashish</b>\n\nLotni do'stlaringizga yuborish uchun:\n` +
      `/share [lot_id]\n\nMisol: /share 5`,
      mainMenuKeyboard()
    );
  }

  const lotId = parseInt(args[0]);
  if (isNaN(lotId)) return ctx.reply('❌ Noto\'g\'ri lot ID.');

  try {
    const lot = await queryOne<any>('SELECT * FROM lots WHERE id = $1', [lotId]);
    if (!lot) return ctx.reply('❌ Lot topilmadi.');

    const seller = await queryOne<any>('SELECT name FROM users WHERE id = $1', [lot.seller_id]);
    const gradeLabel = GRADE_LABELS[lot.grade] || '';
    const webUrl = `${WEB_URL}/lot/${lot.id}`;

    const shareText =
      `📦 <b>#${lot.id} — ${lot.title}</b>\n` +
      `${'─'.repeat(32)}\n` +
      `💰 <b>Narx:</b> ${price(lot.price)}\n` +
      `📦 <b>Soni:</b> ${lot.quantity} dona\n` +
      `🏷️ <b>Grade:</b> ${gradeLabel}\n` +
      `👤 <b>Sotuvchi:</b> ${seller?.name || "Noma'lum"}\n` +
      `${'─'.repeat(32)}\n` +
      `🔗 <b>Havola:</b> ${webUrl}\n\n` +
      `💡 <i>DeLiKet — Ishonchli buy/sell platformasi</i>`;

    await ctx.replyWithHTML(
      `📱 <b>Lotni ulashish tayyor!</b>\n\nQuyidagi xabarni forward qiling:\n${SEP}`,
      mainMenuKeyboard()
    );
    await ctx.replyWithHTML(shareText, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.url('🌐 Web\'da ko\'rish', webUrl)],
      ]).reply_markup,
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error('Share error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// ============== FEATURE 9: /bulk ==============
featureCommands.command('bulk', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');

  const args = ctx.message?.text?.split(' ').slice(1) || [];

  try {
    if (args.length === 0) {
      const lots = await query<any>('SELECT * FROM lots WHERE seller_id = $1 ORDER BY created_at DESC', [userId]);
      const active = lots.filter((l: any) => l.status === 'aktiv');
      const archived = lots.filter((l: any) => l.status === 'arxiv');

      return ctx.replyWithHTML(
        `📋 <b>Ommaviy boshqaruv</b>\n${SEP}\n\n` +
        `Sizning lotlaringiz:\n` +
        `  🟢 Aktiv: <b>${active.length} ta</b>\n` +
        `  📦 Arxiv: <b>${archived.length} ta</b>\n` +
        `  Jami: <b>${lots.length} ta</b>\n\n` +
        `<b>Buyruqlar:</b>\n` +
        `• /bulk archive — barcha aktiv lotlarni arxivlash\n` +
        `• /bulk activate — barcha arxiv lotlarni aktivlashtirish\n` +
        `• /bulk list — lotlar ro'yxatini ko'rish\n\n` +
        `<i>⚠️ Diqqat: ommaviy amallarni qaytarib bo'lmaydi</i>`,
        mainMenuKeyboard()
      );
    }

    const action = args[0].toLowerCase();

    if (action === 'archive') {
      const result = await query<any>('UPDATE lots SET status = $1 WHERE seller_id = $2 AND status = $3 RETURNING id', ['arxiv', userId, 'aktiv']);
      const count = Array.isArray(result) ? result.length : 0;
      await ctx.replyWithHTML(count > 0 ? `✅ <b>${count} ta</b> lot arxivlandi.` : '📭 Arxivlanadigan aktiv lot yo\'q.', mainMenuKeyboard());
    } else if (action === 'activate') {
      const result = await query<any>('UPDATE lots SET status = $1 WHERE seller_id = $2 AND status = $3 RETURNING id', ['aktiv', userId, 'arxiv']);
      const count = Array.isArray(result) ? result.length : 0;
      await ctx.replyWithHTML(count > 0 ? `✅ <b>${count} ta</b> lot aktivlashtirildi.` : '📭 Aktivlashtiriladigan arxiv lot yo\'q.', mainMenuKeyboard());
    } else if (action === 'list') {
      const lots = await query<any>('SELECT * FROM lots WHERE seller_id = $1 ORDER BY created_at DESC', [userId]);
      if (!lots || lots.length === 0) return ctx.reply('📭 Sizning lotlaringiz yo\'q.');
      let msg = `📋 <b>Lotlaringiz (${lots.length} ta)</b>\n${SEP}\n\n`;
      for (const lot of lots) {
        const se = STATUS_EMOJI[lot.status] || '⚪';
        msg += `${se} <b>#${lot.id}</b> ${(lot.title || '').slice(0, 40)}\n  💰 ${price(lot.price)} | 📦 ${lot.quantity} dona\n\n`;
      }
      await ctx.replyWithHTML(msg, mainMenuKeyboard());
    } else {
      await ctx.reply('❌ Noto\'g\'ri buyruq. /bulk yordam', mainMenuKeyboard());
    }
  } catch (err) {
    console.error('Bulk error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// ============== FEATURE 10: /recommend ==============
featureCommands.command('recommend', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');

  try {
    // Find user's preferred categories from bids
    const userBids = await query<any>('SELECT lot_id FROM bids WHERE buyer_id = $1', [userId]);
    const bidLotIds = userBids.map((b: any) => b.lot_id);
    const preferredCats = new Set<string>();

    if (bidLotIds.length > 0) {
      const biddedLots = await query<any>(`SELECT DISTINCT category FROM lots WHERE id = ANY($1)`, [bidLotIds]);
      for (const l of biddedLots) if (l.category) preferredCats.add(l.category);
    }

    // Also check wishlist
    const wishlistItems = await query<any>('SELECT lot_id FROM wishlist WHERE user_id = $1', [userId]);
    const wishLotIds = wishlistItems.map((w: any) => w.lot_id);
    if (wishLotIds.length > 0) {
      const wishLots = await query<any>(`SELECT DISTINCT category FROM lots WHERE id = ANY($1)`, [wishLotIds]);
      for (const l of wishLots) if (l.category) preferredCats.add(l.category);
    }

    let recommended: any[] = [];
    if (preferredCats.size > 0) {
      recommended = await query<any>(
        `SELECT * FROM lots WHERE status = 'aktiv' AND seller_id != $1 AND category = ANY($2) ORDER BY created_at DESC LIMIT 10`,
        [userId, [...preferredCats]]
      );
    }

    if (!recommended || recommended.length === 0) {
      recommended = await query<any>(
        `SELECT * FROM lots WHERE status = 'aktiv' AND seller_id != $1 ORDER BY created_at DESC LIMIT 10`,
        [userId]
      );
    }

    if (!recommended || recommended.length === 0) {
      return ctx.replyWithHTML(
        `🎯 <b>Tavsiyalar</b>\n\nHozircha tavsiyalar yo'q. Lotlarni ko'rish: /search`,
        mainMenuKeyboard()
      );
    }

    let catsStr = preferredCats.size > 0 ? [...preferredCats].join(', ') : '—';
    let msg = `🎯 <b>Sizga tavsiyalar</b>\n${SEP}\n\n` +
      `📊 Sizning kategoryalaringiz: ${catsStr}\n\n<i>Eng oxirgi lotlar:</i>\n\n`;

    for (const lot of recommended.slice(0, 5)) {
      const emoji = CATEGORY_EMOJI[lot.category] || '📦';
      const gradeEmoji = GRADE_EMOJI[lot.grade] || '⚪';
      msg += `${emoji} <b>#${lot.id}</b> — ${(lot.title || '').slice(0, 50)}\n  💰 ${price(lot.price)} | ${gradeEmoji} ${GRADE_LABELS[lot.grade] || ''}\n\n`;
    }

    msg += `${SEP}\nBatafsil: /search\nSevimlilar: /wishlist`;
    await ctx.replyWithHTML(msg, mainMenuKeyboard());
  } catch (err) {
    console.error('Recommend error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// === Export callback handler for centralized dispatch ===
export async function handleFeatureCallback(ctx: any, data: string): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;

  // Wishlist toggle: wish_{lot_id}
  const wishMatch = data.match(/^wish_(\d+)$/);
  if (wishMatch) {
    await ctx.answerCbQuery();
    const lotId = parseInt(wishMatch[1]);
    try {
      const existing = await queryOne<any>('SELECT id FROM wishlist WHERE user_id = $1 AND lot_id = $2', [userId, lotId]);
      if (existing) {
        await query('DELETE FROM wishlist WHERE id = $1', [existing.id]);
        await ctx.answerCbQuery('⭐ Sevimlilardan olib tashlandi', { show_alert: true });
      } else {
        await query('INSERT INTO wishlist (user_id, lot_id) VALUES ($1, $2)', [userId, lotId]);
        await ctx.answerCbQuery('❤️ Sevimlilarga qo\'shildi!', { show_alert: true });
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
    }
    return true;
  }

  // Ask question: ask_{lot_id}
  const askMatch = data.match(/^ask_(\d+)$/);
  if (askMatch) {
    await ctx.answerCbQuery();
    const lotId = parseInt(askMatch[1]);
    await ctx.editMessageText(
      `💬 <b>Sotuvchiga savol</b>\n\nSavol yozish uchun buyruqdan foydalaning:\n\n` +
      `<code>/ask ${lotId} [savolingiz]</code>\n\n<b>Misol:</b>\n/ask ${lotId} Bu mahsulotning xolati qanday?`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  // Share callback: share_{lot_id}
  const shareMatch = data.match(/^share_(\d+)$/);
  if (shareMatch) {
    await ctx.answerCbQuery();
    const lotId = parseInt(shareMatch[1]);
    try {
      const lot = await queryOne<any>('SELECT * FROM lots WHERE id = $1', [lotId]);
      if (!lot) return true;
      const webUrl = `${WEB_URL}/lot/${lot.id}`;
      await ctx.editMessageText(
        `📱 <b>Lot ulashish tayyor!</b>\n\nForward qilish uchun xabar tayyor.\n\nYoki quyidagi havolani ulashing:\n🔗 ${webUrl}`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      console.error('Share callback error:', err);
    }
    return true;
  }

  // Alert callback: alert_{lot_id}
  const alertMatch = data.match(/^alert_(\d+)$/);
  if (alertMatch) {
    await ctx.answerCbQuery();
    const lotId = parseInt(alertMatch[1]);
    try {
      const lot = await queryOne<any>('SELECT * FROM lots WHERE id = $1', [lotId]);
      if (!lot) return true;
      const targetPrice = Math.round(lot.price * 0.8);
      await ctx.editMessageText(
        `📉 <b>Narx kuzatuvi</b>\n\n📦 #${lot.id} — ${lot.title}\n💰 Hozirgi narx: ${price(lot.price)}\n\n` +
        `Narx tushganda xabar olish uchun:\n<code>/pricealert ${lotId} ${targetPrice}</code>\n\n<b>Misol:</b>\n/pricealert ${lotId} ${targetPrice}`,
        { parse_mode: 'HTML' }
      );
    } catch (err) {
      console.error('Alert callback error:', err);
    }
    return true;
  }

  return false;
}

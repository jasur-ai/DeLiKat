import { Scenes } from 'telegraf';
import { query } from '../../lib/db';
import { categoryKeyboard, gradeKeyboard, confirmKeyboard, skipImageKeyboard, mainMenuKeyboard } from '../keyboards/menu';
import { sessionManager } from '../utils/session';
import { CATEGORY_NAMES, GRADE_LABELS } from '../utils/i18n';
import { price } from '../utils/formatting';

const VALID_CATEGORIES = new Set(['smartfon', 'notebook', 'tv', 'audio', 'aksesuar', 'kiyim']);

function checkCancel(ctx: any): boolean {
  if (ctx.message && 'text' in ctx.message && (ctx.message.text as string).startsWith('/cancel')) {
    ctx.reply('❌ Lot yaratish bekor qilindi.', mainMenuKeyboard()).catch(() => {});
    ctx.scene.leave();
    return true;
  }
  return false;
}

export const newlotWizard = new Scenes.WizardScene<any>(
  'newlot',
  // Step 1: Category
  async (ctx) => {
    if (checkCancel(ctx)) return;
    const userId = ctx.from?.id;
    if (!userId) return ctx.scene.leave();
    const session = sessionManager.getOrCreate(userId);
    if (!session.isAuthenticated) {
      await ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');
      return ctx.scene.leave();
    }

    session.data.newlot = {};
    await ctx.replyWithHTML(
      '🆕 <b>Yangi lot yaratish</b>\n\n<b>1-bosqich / 6: Kategoriyani tanlang</b>',
      { reply_markup: categoryKeyboard().reply_markup }
    );
    ctx.wizard.next();
  },
  // Step 2: Title
  async (ctx) => {
    if (checkCancel(ctx)) return;
    if (!ctx.callbackQuery) return;
    const data = (ctx.callbackQuery as any).data;
    await ctx.answerCbQuery();

    const cat = data.replace('cat_', '');
    if (!VALID_CATEGORIES.has(cat)) {
      await ctx.editMessageText('Iltimos, aniq kategoriya tanlang:', { reply_markup: categoryKeyboard().reply_markup });
      return;
    }

    const userId = ctx.from?.id;
    if (userId) {
      const session = sessionManager.getOrCreate(userId);
      session.data.newlot.category = cat;
    }

    await ctx.editMessageText(
      `✅ Kategoriya: <b>${CATEGORY_NAMES[cat] || cat}</b>\n\n<b>2/6: Mahsulot nomini yozing</b>\n\n` +
      `Misol: <i>iPhone 14 Pro 256GB</i>\nMaksimal 100 ta belgi.`,
      { parse_mode: 'HTML' }
    );
    ctx.wizard.next();
  },
  // Step 3: Image
  async (ctx) => {
    if (checkCancel(ctx)) return;
    const msg = ctx.message as any;
    if (!msg?.text) {
      await ctx.reply('❌ Iltimos, mahsulot nomini matn shaklida yozing:');
      return;
    }

    const title = msg.text.trim();
    if (title.length < 3 || title.length > 100) {
      await ctx.reply(`❌ Nomi ${title.length < 3 ? 'juda qisqa (kamida 3 belgi)' : 'juda uzun (maksimal 100 belgi)'}. Qaytadan yozing:`);
      return;
    }

    const userId = ctx.from?.id;
    if (userId) {
      const session = sessionManager.getOrCreate(userId);
      session.data.newlot.title = title;
    }

    await ctx.replyWithHTML(
      `✅ Nomi: <b>${title.slice(0, 60)}</b>\n\n<b>3/6: Mahsulot rasmini yuboring</b>\n\n` +
      `📸 Mahsulotingizning rasmini yuboring.\n<i>Agar rasm bo'lmasa — ⏭️ Rasmsiz davom etish</i>`,
      { reply_markup: skipImageKeyboard().reply_markup }
    );
    ctx.wizard.next();
  },
  // Step 4: Price
  async (ctx) => {
    if (checkCancel(ctx)) return;
    const update = ctx.update as any;
    let hasImage = false;

    if (update?.callback_query) {
      await ctx.answerCbQuery();
      // Skip image - continue
    } else if (update?.message?.photo) {
      const userId = ctx.from?.id;
      if (userId) {
        const session = sessionManager.getOrCreate(userId);
        const photo = update.message.photo[update.message.photo.length - 1];
        session.data.newlot.image_file_id = photo.file_id;
      }
      hasImage = true;
    } else {
      await ctx.reply('❌ Iltimos, mahsulot rasmini yuboring yoki ⏭️ tugmasini bosing.', { reply_markup: skipImageKeyboard().reply_markup });
      return;
    }

    await ctx.replyWithHTML(
      `${hasImage ? '✅ Rasm qabul qilindi! 📸' : '⏭️ Rasm yuklanmadi. Davom etamiz...'}\n\n<b>4/6: Mahsulot narxini yozing</b>\n\n` +
      `Bir dona uchun so'mda narx.\nMisol: <i>7500000</i> (7 500 000 so'm)`
    );
    ctx.wizard.next();
  },
  // Step 5: Quantity
  async (ctx) => {
    if (checkCancel(ctx)) return;
    const msg = ctx.message as any;
    const text = (msg?.text || '').replace(/\s/g, '').replace(/,/g, '');
    const p = parseFloat(text);

    if (isNaN(p) || p <= 0 || p > 1_000_000_000) {
      await ctx.reply('❌ Noto\'g\'ri narx. Iltimos, raqam yozing (masalan: 7500000):');
      return;
    }

    const userId = ctx.from?.id;
    if (userId) {
      const session = sessionManager.getOrCreate(userId);
      session.data.newlot.price = p;
    }

    await ctx.replyWithHTML(
      `✅ Narx: <b>${price(p)}</b>\n\n<b>5/6: Mahsulot sonini yozing</b>\n\nNechta dona bor?\nMisol: <i>5</i>`
    );
    ctx.wizard.next();
  },
  // Step 6: Grade
  async (ctx) => {
    if (checkCancel(ctx)) return;
    const msg = ctx.message as any;
    const text = (msg?.text || '').trim();
    const qty = parseInt(text);

    if (isNaN(qty) || qty <= 0 || qty > 100_000) {
      await ctx.reply('❌ Noto\'g\'ri son. Iltimos, butun son yozing (masalan: 5):');
      return;
    }

    const userId = ctx.from?.id;
    if (userId) {
      const session = sessionManager.getOrCreate(userId);
      session.data.newlot.quantity = qty;
    }

    await ctx.replyWithHTML(
      `✅ Soni: <b>${qty.toLocaleString()} dona</b>\n\n<b>6/6: Mahsulot holatini tanlang (Grade)</b>\n\n` +
      `• 🟢 <b>A</b> — Yangi, ochilmagan\n• 🟡 <b>B</b> — Ochilgan, ishlatilgan\n• 🔴 <b>C</b> — Nuqsonli, ehtiyot qism`,
      { reply_markup: gradeKeyboard().reply_markup }
    );
    ctx.wizard.next();
  },
  // Step 7: Confirm
  async (ctx) => {
    if (checkCancel(ctx)) return;
    if (!ctx.callbackQuery) return;
    const data = (ctx.callbackQuery as any).data;
    await ctx.answerCbQuery();

    const grade = data.replace('grade_', '');
    if (!['A', 'B', 'C'].includes(grade)) {
      await ctx.editMessageText('❌ Noto\'g\'ri tanlov. Qaytadan tanlang:', { reply_markup: gradeKeyboard().reply_markup });
      return;
    }

    const userId = ctx.from?.id;
    if (!userId) return ctx.scene.leave();

    const session = sessionManager.getOrCreate(userId);
    session.data.newlot.grade = grade;

    const nd = session.data.newlot;
    const imgIndicator = nd.image_file_id ? '✅ Rasm bor 📸' : '⏭️ Rasmsiz';
    const summary =
      `📋 <b>Lot ma'lumotlari</b>\n\n` +
      `📂 Kategoriya: <b>${CATEGORY_NAMES[nd.category] || nd.category}</b>\n` +
      `📛 Nomi: <b>${(nd.title || '').slice(0, 60)}</b>\n` +
      `🖼️ Rasm: <b>${imgIndicator}</b>\n` +
      `💰 Narx: <b>${price(nd.price)}</b>\n` +
      `📦 Soni: <b>${(nd.quantity || 0).toLocaleString()} dona</b>\n` +
      `🏷️ Grade: <b>${GRADE_LABELS[grade] || grade}</b>\n\nTasdiqlaysizmi?`;

    await ctx.editMessageText(summary, { parse_mode: 'HTML', reply_markup: confirmKeyboard('lot_').reply_markup });
    ctx.wizard.next();
  },
  // Step 8: Save or Cancel
  async (ctx) => {
    if (!ctx.callbackQuery) return;
    const data = (ctx.callbackQuery as any).data;
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;
    if (!userId) return ctx.scene.leave();

    const session = sessionManager.getOrCreate(userId);

    if (data === 'lot_no') {
      session.data.newlot = null;
      await ctx.editMessageText('❌ Lot bekor qilindi.', { reply_markup: mainMenuKeyboard().reply_markup });
      return ctx.scene.leave();
    }

    const nd = session.data.newlot;
    if (!nd?.category || !nd?.title || !nd?.price || !nd?.quantity || !nd?.grade) {
      await ctx.editMessageText('😔 Xatolik: ma\'lumotlar to\'liq emas. /newlot ni qayta boshlang.');
      session.data.newlot = null;
      return ctx.scene.leave();
    }

    try {
      const result = await query<any>(
        `INSERT INTO lots (seller_id, category, title, quantity, price, grade, image_file_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'aktiv')
         RETURNING id`,
        [userId, nd.category, nd.title, nd.quantity, nd.price, nd.grade, nd.image_file_id || null]
      );

      const lotId = result[0]?.id;
      session.data.newlot = null;

      await ctx.editMessageText(
        `✅ <b>Lot #${lotId} yaratildi!</b>\n\n` +
        `Kategoriya: ${CATEGORY_NAMES[nd.category]}\n` +
        `Narx: ${price(nd.price)}\n` +
        `Soni: ${nd.quantity} dona\n\n` +
        `Keyin: /mylots — lotlarim  |  /newlot — yangi lot`,
        { parse_mode: 'HTML', reply_markup: mainMenuKeyboard().reply_markup }
      );
    } catch (err) {
      console.error('Lot creation error:', err);
      await ctx.editMessageText('😔 Xatolik yuz berdi. /newlot ni qayta boshlang.');
    }

    return ctx.scene.leave();
  }
);

import { Telegraf, Scenes } from 'telegraf';
import { session as telegrafSession } from 'telegraf';
import { BotContext } from './types';

// Import handlers
import { startWizard } from './handlers/start';
import { newlotWizard } from './handlers/lot';
import { searchCommands } from './handlers/search';
import { profileCommands } from './handlers/profile';
import { helpCommands } from './handlers/help';
import { languageCommands, handleLanguageCallback } from './handlers/language';
import { ratingCommands, handleRatingCallback } from './handlers/rating';
import { syncCommands } from './handlers/sync';
import { adminCommands, handleAdminCallback } from './handlers/admin';
import { featureCommands, handleFeatureCallback } from './handlers/features';
import { mainMenuKeyboard, categoryKeyboard, confirmCancelKeyboard, lotDetailKeyboard, lotActionsKeyboard } from './keyboards/menu';
import { sessionManager } from './utils/session';
import { query, queryOne } from '../lib/db';
import { price, SEP, lotDetail } from './utils/formatting';
import { STATUS_EMOJI } from './utils/i18n';
import { showCategoryLots } from './handlers/search';
const VALID_CATEGORIES = new Set(['smartfon', 'notebook', 'tv', 'audio', 'aksesuar', 'kiyim']);

const TOKEN = process.env.BOT_TOKEN || '';
if (!TOKEN || TOKEN === '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11') {
  console.error(
    '❌ BOT_TOKEN not set. Set BOT_TOKEN environment variable.\n' +
    '   Get token from @BotFather on Telegram'
  );
  process.exit(1);
}

// Create bot
const bot = new Telegraf<BotContext>(TOKEN);

// Set up scene manager
const stage = new Scenes.Stage<BotContext>([
  startWizard as any,
  newlotWizard as any,
]);

// Middleware
bot.use(telegrafSession());
bot.use(stage.middleware());

// ========================
// COMMAND HANDLERS
// ========================

// Core handlers
bot.command('start', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);

  if (session.isAuthenticated) {
    await ctx.replyWithHTML(
      `👋 Xush kelibsiz, ${session.name || ctx.from?.first_name || 'Foydalanuvchi'}!`,
      mainMenuKeyboard()
    );
  } else {
    await ctx.scene.enter('registration' as any);
  }
});

bot.command('newlot', async (ctx) => {
  await ctx.scene.enter('newlot' as any);
});

// Bot Composer handlers
bot.use(helpCommands.middleware());
bot.use(profileCommands.middleware());
bot.use(searchCommands.middleware());
bot.use(languageCommands.middleware());
bot.use(ratingCommands.middleware());
bot.use(syncCommands.middleware());
bot.use(adminCommands.middleware());
bot.use(featureCommands.middleware());

// ========================
// /mylots command
// ========================
bot.command('mylots', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) {
    return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');
  }

  try {
    const lots = await query<any>('SELECT * FROM lots WHERE seller_id = $1 ORDER BY created_at DESC', [userId]);

    if (!lots || lots.length === 0) {
      return ctx.replyWithHTML(
        `📋 <b>Lotlarim</b>\n\nHozircha lotlaringiz yo'q.\nYangi lot: /newlot`,
        mainMenuKeyboard()
      );
    }

    // Send header
    await ctx.replyWithHTML(
      `📋 <b>Lotlaringiz (${lots.length} ta)</b>\n${SEP}\n\n<i>Har bir lot uchun amalni tanlang 👇</i>`
    );

    // Send each lot with action buttons
    for (const lot of lots) {
      const se = STATUS_EMOJI[lot.status] || '⚪';
      const lotMsg = `${se} <b>#${lot.id}</b> ${(lot.title || '').slice(0, 60)}\n  💰 ${price(lot.price)} | 📦 ${lot.quantity} dona | <b>${lot.status}</b>`;
      await ctx.replyWithHTML(lotMsg, { reply_markup: lotActionsKeyboard(lot.id, lot.status).reply_markup });
    }

    // Back to menu
    await ctx.replyWithHTML('🏪 <b>Asosiy menyu</b>', mainMenuKeyboard());
  } catch (err) {
    console.error('My lots error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// ========================
// CENTRALIZED CALLBACK QUERY DISPATCHER
// ========================
bot.on('callback_query', async (ctx) => {
  if (!ctx.callbackQuery) return;
  const data = (ctx.callbackQuery as any).data;
  await ctx.answerCbQuery();

  // 1. Try scene callbacks (registration / newlot wizards)
  // (handled by stage middleware automatically)

  // 1b. noop is always a no-op — handle early
  if (data === 'noop') return;

  // 2. Try admin callbacks
  if (data.startsWith('admin_') || data.startsWith('adm_')) {
    const handled = await handleAdminCallback(ctx, data);
    if (handled) return;
  }

  // 3. Try rating callbacks
  if (data.startsWith('rate_')) {
    const handled = await handleRatingCallback(ctx, data);
    if (handled) return;
  }

  // 4. Try language callbacks
  if (data.startsWith('lang_')) {
    const handled = await handleLanguageCallback(ctx, data);
    if (handled) return;
  }

  // 5. Try feature callbacks (wishlist, ask, share, alert)
  const featureHandled = await handleFeatureCallback(ctx, data);
  if (featureHandled) return;

  // 6. Try search-related callbacks
  if (data.startsWith('detail_') || data.startsWith('page_') || data.startsWith('cancel_bid_') || data.startsWith('confirm_cancel_') || data.startsWith('cat_') || data.startsWith('lot_archive_') || data.startsWith('lot_activate_')) {
    const handled = await handleSearchCallback(ctx, data);
    if (handled) return;
  }

  // 7. Main menu callbacks
  const handled = await handleMainMenuCallback(ctx, data);
  if (handled) return;
});

// Search-related callbacks
async function handleSearchCallback(ctx: any, data: string): Promise<boolean> {
  // Lot detail
  if (data.startsWith('detail_')) {
    const lotId = parseInt(data.replace('detail_', ''));
    const lot = await queryOne<any>('SELECT * FROM lots WHERE id = $1', [lotId]);
    if (!lot) {
      await ctx.editMessageText('❌ Lot topilmadi.');
      return true;
    }

    const seller = await queryOne<any>('SELECT * FROM users WHERE id = $1', [lot.seller_id]);
    await ctx.editMessageText(lotDetail(lot, seller), {
      parse_mode: 'HTML',
      reply_markup: lotDetailKeyboard(lot.id, lot.seller_id, ctx.from?.id || 0).reply_markup,
    });
    return true;
  }

  // Category callbacks (from category selection)
  if (data.startsWith('cat_')) {
    const category = data.replace('cat_', '');
    if (VALID_CATEGORIES.has(category)) {
      await showCategoryLots(ctx, category, 0, true);
    }
    return true;
  }

  // Pagination
  const pageMatch = data.match(/^page_(\w+)_(\d+)$/);
  if (pageMatch) {
    await showCategoryLots(ctx, pageMatch[1], parseInt(pageMatch[2]), true);
    return true;
  }

  // Cancel bid
  if (data.startsWith('cancel_bid_')) {
    const bidId = parseInt(data.replace('cancel_bid_', ''));
    await ctx.editMessageText(`⚠️ <b>Taklif #${bidId} ni bekor qilasizmi?</b>\n\nBu amalni qaytarib bo'lmaydi.`, {
      parse_mode: 'HTML',
      reply_markup: confirmCancelKeyboard(bidId).reply_markup,
    });
    return true;
  }

  if (data.startsWith('confirm_cancel_')) {
    const bidId = parseInt(data.replace('confirm_cancel_', ''));
    await query("UPDATE bids SET status = 'rad' WHERE id = $1", [bidId]);
    await ctx.editMessageText(`✅ <b>Taklif #${bidId} bekor qilindi</b>`, {
      reply_markup: mainMenuKeyboard().reply_markup,
    });
    return true;
  }

  // Lot archive / activate
  if (data.startsWith('lot_archive_')) {
    const lotId = parseInt(data.replace('lot_archive_', ''));
    const lot = await queryOne<any>('SELECT * FROM lots WHERE id = $1 AND seller_id = $2', [lotId, ctx.from?.id]);
    if (!lot) {
      await ctx.editMessageText('❌ Lot topilmadi yoki sizga tegishli emas.', { reply_markup: mainMenuKeyboard().reply_markup });
      return true;
    }
    if (lot.status !== 'aktiv') {
      await ctx.editMessageText('❌ Bu lot aktiv emas.', { reply_markup: mainMenuKeyboard().reply_markup });
      return true;
    }
    await query("UPDATE lots SET status = 'arxiv' WHERE id = $1", [lotId]);
    await ctx.editMessageText(
      `📦 <b>Lot #${lotId} arxivlandi</b>\n\n${lot.title}`,
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard().reply_markup }
    );
    return true;
  }

  if (data.startsWith('lot_activate_')) {
    const lotId = parseInt(data.replace('lot_activate_', ''));
    const lot = await queryOne<any>('SELECT * FROM lots WHERE id = $1 AND seller_id = $2', [lotId, ctx.from?.id]);
    if (!lot) {
      await ctx.editMessageText('❌ Lot topilmadi yoki sizga tegishli emas.', { reply_markup: mainMenuKeyboard().reply_markup });
      return true;
    }
    if (lot.status !== 'arxiv') {
      await ctx.editMessageText('❌ Bu lot arxivda emas.', { reply_markup: mainMenuKeyboard().reply_markup });
      return true;
    }
    await query("UPDATE lots SET status = 'aktiv' WHERE id = $1", [lotId]);
    await ctx.editMessageText(
      `🟢 <b>Lot #${lotId} aktivlashtirildi</b>\n\n${lot.title}`,
      { parse_mode: 'HTML', reply_markup: mainMenuKeyboard().reply_markup }
    );
    return true;
  }

  return false;
}



// Main menu callbacks
async function handleMainMenuCallback(ctx: any, data: string): Promise<boolean> {
  const menuActions: Record<string, string> = {
    'newlot': '/newlot',
    'search': '/search',
    'mylots': '/mylots',
    'mybids': '/mybids',
    'profile': '/profile',
    'help': '/help',
    'subscription': '/subscription',
    'leaderboard': '/leaderboard',
  };

  if (data in menuActions) {
    if (data === 'search') {
      await ctx.editMessageText('🔍 Kategoriya tanlang:', categoryKeyboard());
    } else {
      await ctx.editMessageText(
        `✅ <b>${menuActions[data]}</b>\n\nIltimos, <b>${menuActions[data]}</b> ni chatga yozing.`,
        { parse_mode: 'HTML', reply_markup: mainMenuKeyboard().reply_markup }
      );
    }
    return true;
  }

  if (data === 'back_main') {
    await ctx.editMessageText('🏪 <b>Asosiy menyu</b>', {
      parse_mode: 'HTML',
      reply_markup: mainMenuKeyboard().reply_markup,
    });
    return true;
  }

  if (data === 'back') {
    await ctx.editMessageText('◀️ Orqaga qaytildi.', {
      reply_markup: mainMenuKeyboard().reply_markup,
    });
    return true;
  }

  return false;
}

// ========================
// ERROR HANDLER
// ========================
bot.catch((err, ctx) => {
  console.error('Bot global error:', err);
  try {
    ctx.reply('😔 Kechirasiz, texnik xatolik yuz berdi. Iltimos, keyinroq urinib koring.');
  } catch { /* ignore */ }
});

// ========================
// STARTUP
// ========================
export async function startBot() {
  try {
    await bot.launch();
    console.log('✅ DeLiKet Bot initialized — handlers registered, session manager ready');
  } catch (err) {
    console.error('❌ Failed to start bot:', err);
    process.exit(1);
  }
}

// Graceful stop
process.once('SIGINT', () => {
  sessionManager.cleanupExpired();
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  sessionManager.cleanupExpired();
  bot.stop('SIGTERM');
});

// If run directly (not imported)
if (require.main === module) {
  startBot();
}

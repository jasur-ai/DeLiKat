import { Composer } from 'telegraf';
import { query, queryOne } from '../../lib/db';
import { mainMenuKeyboard } from '../keyboards/menu';
import { sessionManager } from '../utils/session';
import { profileDisplay } from '../utils/formatting';

export const profileCommands = new Composer();

profileCommands.command('profile', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) {
    return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');
  }

  try {
    const user = await queryOne<any>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) {
      return ctx.reply('⚠️ Siz ro\'yxatdan o\'tmagansiz. /start');
    }

    // Get stats
    const lotCount = await queryOne<any>('SELECT COUNT(*) as cnt FROM lots WHERE seller_id = $1', [userId]);
    const activeLots = await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE seller_id = $1 AND status = 'aktiv'", [userId]);
    const bidCount = await queryOne<any>('SELECT COUNT(*) as cnt FROM bids WHERE buyer_id = $1', [userId]);
    const pendingBids = await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE buyer_id = $1 AND status = 'kutmoqda'", [userId]);
    const ratingCount = await queryOne<any>('SELECT COUNT(*) as cnt FROM ratings WHERE rated_id = $1', [userId]);

    const stats = {
      total_lots: parseInt(lotCount?.cnt || '0'),
      active_lots: parseInt(activeLots?.cnt || '0'),
      bids_sent: parseInt(bidCount?.cnt || '0'),
      pending_bids: parseInt(pendingBids?.cnt || '0'),
    };

    await ctx.replyWithHTML(
      profileDisplay(user, stats),
      mainMenuKeyboard()
    );
  } catch (err) {
    console.error('Profile error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

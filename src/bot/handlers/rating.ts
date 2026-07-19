import { Composer, Markup } from 'telegraf';
import { query, queryOne } from '../../lib/db';
import { mainMenuKeyboard } from '../keyboards/menu';
import { sessionManager } from '../utils/session';

export const ratingCommands = new Composer();

function ratingKeyboard(ratedId: number, lotId: number) {
  const rows = [[
    Markup.button.callback('⭐', `rate_1_${ratedId}_${lotId}`),
    Markup.button.callback('⭐⭐', `rate_2_${ratedId}_${lotId}`),
    Markup.button.callback('⭐⭐⭐', `rate_3_${ratedId}_${lotId}`),
    Markup.button.callback('⭐⭐⭐⭐', `rate_4_${ratedId}_${lotId}`),
    Markup.button.callback('⭐⭐⭐⭐⭐', `rate_5_${ratedId}_${lotId}`),
  ]];
  return Markup.inlineKeyboard(rows);
}

async function updateUserRating(ratedId: number) {
  try {
    const result = await queryOne<any>(
      'SELECT AVG(score) as avg_score, COUNT(*) as cnt FROM ratings WHERE rated_id = $1',
      [ratedId]
    );
    if (result && result.avg_score) {
      await query('UPDATE users SET rating = $1 WHERE id = $2', [Math.round(result.avg_score * 10) / 10, ratedId]);
    }
  } catch { /* skip */ }
}

ratingCommands.command('rate', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) {
    return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');
  }

  const args = ctx.message?.text?.split(' ').slice(1);
  if (!args || args.length < 2) {
    return ctx.replyWithHTML(
      '❌ Noto\'g\'ri format.\n\nIshlatish: <b>/rate [user_id] [1-5]</b>\nMisol: <b>/rate 123456789 5</b>'
    );
  }

  const ratedId = parseInt(args[0]);
  const score = parseInt(args[1]);

  if (isNaN(ratedId) || isNaN(score) || score < 1 || score > 5) {
    return ctx.reply('❌ Baho 1 dan 5 gacha bo\'lishi kerak. Misol: /rate 123456789 5');
  }

  if (ratedId === userId) {
    return ctx.reply('😄 O\'zingizni baholay olmaysiz!');
  }

  try {
    const ratedUser = await queryOne<any>('SELECT * FROM users WHERE id = $1', [ratedId]);
    if (!ratedUser) return ctx.reply('❌ Foydalanuvchi topilmadi.');

    const existing = await queryOne<any>(
      'SELECT * FROM ratings WHERE rater_id = $1 AND rated_id = $2',
      [userId, ratedId]
    );

    if (existing) {
      await query('UPDATE ratings SET score = $1 WHERE id = $2', [score, existing.id]);
    } else {
      await query(
        'INSERT INTO ratings (rater_id, rated_id, lot_id, score) VALUES ($1, $2, 0, $3)',
        [userId, ratedId, score]
      );
    }

    await updateUserRating(ratedId);

    const stars = '⭐'.repeat(score);
    await ctx.replyWithHTML(
      `✅ <b>${ratedUser.name}</b> baholandi: ${stars} (${score}/5)`,
      mainMenuKeyboard()
    );
  } catch (err) {
    console.error('Rate error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// Export callback handler for centralized dispatch
export async function handleRatingCallback(ctx: any, data: string): Promise<boolean> {
  const match = data.match(/^rate_(\d+)_(\d+)_(\d+)$/);
  if (!match) return false;

  const score = parseInt(match[1]);
  const ratedId = parseInt(match[2]);
  const lotId = parseInt(match[3]);
  const raterId = ctx.from?.id;
  if (!raterId) return true;

  if (raterId === ratedId) {
    await ctx.editMessageText('😄 O\'zingizni baholay olmaysiz!', { reply_markup: mainMenuKeyboard().reply_markup });
    return true;
  }

  try {
    const existing = await queryOne<any>(
      'SELECT * FROM ratings WHERE rater_id = $1 AND rated_id = $2 AND lot_id = $3',
      [raterId, ratedId, lotId]
    );
    if (existing) {
      await ctx.editMessageText(
        `⚠️ Siz bu foydalanuvchini avval baholagansiz: ${'⭐'.repeat(existing.score)}`,
        { reply_markup: mainMenuKeyboard().reply_markup }
      );
      return true;
    }

    await query(
      'INSERT INTO ratings (rater_id, rated_id, lot_id, score) VALUES ($1, $2, $3, $4)',
      [raterId, ratedId, lotId, score]
    );
    await updateUserRating(ratedId);

    const ratedUser = await queryOne<any>('SELECT name FROM users WHERE id = $1', [ratedId]);
    const stars = '⭐'.repeat(score);
    await ctx.editMessageText(
      `✅ <b>${ratedUser?.name || 'Foydalanuvchi'}</b> baholandi: ${stars} (${score}/5)`,
      { reply_markup: mainMenuKeyboard().reply_markup }
    );
  } catch (err) {
    console.error('Rate callback error:', err);
    await ctx.editMessageText('😔 Xatolik yuz berdi.', { reply_markup: mainMenuKeyboard().reply_markup });
  }
  return true;
}

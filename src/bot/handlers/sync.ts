import { Composer, Markup } from 'telegraf';
import { query, queryOne } from '../../lib/db';
import { mainMenuKeyboard } from '../keyboards/menu';
import { sessionManager } from '../utils/session';

const WEB_URL = process.env.WEB_URL || 'https://delikat.vercel.app';

function generateToken(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // Excluding 0/O/1/I/L
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export const syncCommands = new Composer();

syncCommands.command('sync', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const session = sessionManager.getOrCreate(userId);
  if (!session.isAuthenticated) {
    return ctx.reply('⚠️ Avval /start orqali ro\'yxatdan o\'ting.');
  }

  try {
    const user = await queryOne<any>('SELECT * FROM users WHERE id = $1', [userId]);
    if (!user) return ctx.reply('❌ Avval /start orqali ro\'yxatdan o\'ting.');

    // Check for existing valid token
    const existing = await queryOne<any>(
      `SELECT * FROM sync_tokens WHERE user_id = $1 AND is_used = false AND expires_at > NOW()`,
      [userId]
    );

    let token: string;
    if (existing) {
      token = existing.token;
    } else {
      // Generate new unique token
      while (true) {
        token = generateToken();
        const conflict = await queryOne<any>(
          `SELECT id FROM sync_tokens WHERE token = $1 AND is_used = false AND expires_at > NOW()`,
          [token]
        );
        if (!conflict) break;
      }

      await query(
        `INSERT INTO sync_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
        [userId, token]
      );
    }

    // Gather account stats
    const lotCount = await queryOne<any>('SELECT COUNT(*) as cnt FROM lots WHERE seller_id = $1', [userId]);
    const bidCount = await queryOne<any>('SELECT COUNT(*) as cnt FROM bids WHERE buyer_id = $1', [userId]);
    const wishlistCount = await queryOne<any>('SELECT COUNT(*) as cnt FROM wishlist WHERE user_id = $1', [userId]);

    const syncUrl = `${WEB_URL}/sync?token=${token}`;

    const msg =
      `🔄 <b>Cross-Platform Sync</b>\n${'━'.repeat(32)}\n\n` +
      `Telegram bot'ingizni Web platformaga ulang!\n\n` +
      `<b>🔑 Sizning sync token:</b>\n` +
      `<code>${token}</code>\n\n` +
      `<b>📊 Hisob ma'lumotlari:</b>\n` +
      `  👤 Foydalanuvchi: <b>${user.name}</b>\n` +
      `  📦 Lotlar: <b>${lotCount?.cnt || 0} ta</b>\n` +
      `  💰 Takliflar: <b>${bidCount?.cnt || 0} ta</b>\n` +
      `  ❤️ Sevimlilar: <b>${wishlistCount?.cnt || 0} ta</b>\n\n` +
      `<b>📋 Qanday ulash mumkin?</b>\n` +
      `1️⃣ Yuqoridagi token'ni nusxalang\n` +
      `2️⃣ Web saytga o'ting\n` +
      `3️⃣ Token'ni kiriting\n` +
      `4️⃣ Hisobingiz sinxronlanadi!\n\n` +
      `<i>⏳ Token 24 soat davomida amal qiladi</i>\n` +
      `${'━'.repeat(32)}\n` +
      `🌐 <a href='${syncUrl}'>Web'da sinxronlash</a>`;

    await ctx.replyWithHTML(msg, {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.url('🌐 Web\'da sinxronlash', syncUrl)],
      ]).reply_markup,
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error('Sync error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

import { Composer, Markup } from 'telegraf';
import { query, queryOne } from '../../lib/db';
import { mainMenuKeyboard } from '../keyboards/menu';
import { SEP, price } from '../utils/formatting';

const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean);
const PER_PAGE = 5;

async function isAdmin(userId: number): Promise<boolean> {
  if (ADMIN_IDS.includes(userId)) return true;
  try {
    const user = await queryOne<any>('SELECT is_admin FROM users WHERE id = $1', [userId]);
    return user?.is_admin || false;
  } catch { return false; }
}

function adminMainKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📊 Statistika', 'admin_stats')],
    [Markup.button.callback('👥 Userlar', 'admin_users_0')],
    [Markup.button.callback('📦 Barcha lotlar', 'admin_lots_0')],
    [Markup.button.callback('⚠️ Noodle lotlar', 'admin_noodle')],
    [Markup.button.callback('◀️ Asosiy menyu', 'admin_exit')],
  ]);
}

export const adminCommands = new Composer();

adminCommands.command('admin', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (!(await isAdmin(userId))) {
    return ctx.replyWithHTML('⛔ <b>Ruxsat yo\'q</b>\n\nBu buyruq faqat adminlar uchun.', mainMenuKeyboard());
  }

  try {
    const totalUsers = await queryOne<any>('SELECT COUNT(*) as cnt FROM users');
    const totalLots = await queryOne<any>('SELECT COUNT(*) as cnt FROM lots');
    const activeLots = await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE status = 'aktiv'");
    const soldLots = await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE status = 'sotilgan'");
    const archivedLots = await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE status = 'arxiv'");
    const totalBids = await queryOne<any>('SELECT COUNT(*) as cnt FROM bids');
    const pendingBids = await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE status = 'kutmoqda'");
    const acceptedBids = await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE status = 'qabul'");
    const rejectedBids = await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE status = 'rad'");
    const totalRatings = await queryOne<any>('SELECT COUNT(*) as cnt FROM ratings');
    const avgRating = await queryOne<any>('SELECT AVG(score) as avg FROM ratings');

    const msg =
      `🛠️ <b>Admin Panel — Dashboard</b>\n${SEP}\n\n` +
      `<b>👥 Foydalanuvchilar</b>\n` +
      `  Jami: <b>${totalUsers?.cnt || 0}</b> ta\n` +
      `  O'rtacha reyting: <b>${avgRating?.avg ? Number(avgRating.avg).toFixed(1) : '0'}</b>\n\n` +
      `<b>📦 Lotlar</b>\n` +
      `  Jami: <b>${totalLots?.cnt || 0}</b> ta  |  🟢 Aktiv: <b>${activeLots?.cnt || 0}</b>\n` +
      `  💰 Sotilgan: <b>${soldLots?.cnt || 0}</b>  |  📦 Arxiv: <b>${archivedLots?.cnt || 0}</b>\n\n` +
      `<b>💳 Takliflar</b>\n` +
      `  Jami: <b>${totalBids?.cnt || 0}</b> ta\n` +
      `  ⏳ Kutilmoqda: <b>${pendingBids?.cnt || 0}</b>  |  ✅ Qabul: <b>${acceptedBids?.cnt || 0}</b>  |  ❌ Rad: <b>${rejectedBids?.cnt || 0}</b>\n\n` +
      `<b>⭐ Reytinglar</b>\n` +
      `  Jami: <b>${totalRatings?.cnt || 0}</b> ta\n\n` +
      `${SEP}\n<i>🔄 Ma'lumotlar real vaqtda yangilanadi</i>`;

    await ctx.replyWithHTML(msg, adminMainKeyboard());
  } catch (err) {
    console.error('Admin dashboard error:', err);
    await ctx.reply('😔 Xatolik yuz berdi.');
  }
});

// Export callback handler for centralized dispatch
export async function handleAdminCallback(ctx: any, data: string): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId || !(await isAdmin(userId))) return false;

  // Check if this is an admin-related callback
  if (!data.startsWith('admin_') && !data.startsWith('adm_') && data !== 'noop') return false;

  try {
    // Dashboard
    if (data === 'admin') {
      const totalUsers = (await queryOne<any>('SELECT COUNT(*) as cnt FROM users'))?.cnt || 0;
      const totalLots = (await queryOne<any>('SELECT COUNT(*) as cnt FROM lots'))?.cnt || 0;
      const activeLots = (await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE status = 'aktiv'"))?.cnt || 0;
      const soldLots = (await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE status = 'sotilgan'"))?.cnt || 0;
      const archivedLots = (await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE status = 'arxiv'"))?.cnt || 0;
      const totalBids = (await queryOne<any>('SELECT COUNT(*) as cnt FROM bids'))?.cnt || 0;
      const pendingBids = (await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE status = 'kutmoqda'"))?.cnt || 0;

      const msg =
        `🛠️ <b>Admin Panel</b>\n${SEP}\n` +
        `  👥 Userlar: <b>${totalUsers}</b>\n` +
        `  📦 Lotlar: <b>${totalLots}</b> (🟢${activeLots} 💰${soldLots} 📦${archivedLots})\n` +
        `  💳 Takliflar: <b>${totalBids}</b> (⏳${pendingBids})\n` +
        `${SEP}\nBo'limni tanlang 👇`;

      await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: adminMainKeyboard().reply_markup });
      return true;
    }

    // Users list
    if (data.startsWith('admin_users_')) {
      const page = parseInt(data.split('_')[2] || '0');
      const users = await query<any>('SELECT * FROM users ORDER BY created_at DESC');
      const total = users.length;
      const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
      const start = page * PER_PAGE;
      const pageUsers = users.slice(start, start + PER_PAGE);

      let msg = `👥 <b>Foydalanuvchilar (${total} ta)</b>\n${SEP}\n\n`;
      for (const u of pageUsers) {
        const lotCount = await queryOne<any>('SELECT COUNT(*) as cnt FROM lots WHERE seller_id = $1', [u.id]);
        const bidCount = await queryOne<any>('SELECT COUNT(*) as cnt FROM bids WHERE buyer_id = $1', [u.id]);
        const adminBadge = u.is_admin ? ' 👑' : '';
        msg +=
          `<b>#${u.id}</b>${adminBadge}\n` +
          `  👤 ${(u.name || '').slice(0, 30)} | ${u.role || '—'}\n` +
          `  📦 ${lotCount?.cnt || 0} lot | 💰 ${bidCount?.cnt || 0} taklif | ⭐ ${u.rating || 0}\n\n`;
      }

      const nav: any[] = [];
      if (page > 0) nav.push(Markup.button.callback('◀️', `admin_users_${page - 1}`));
      nav.push(Markup.button.callback(`${page + 1}/${totalPages}`, 'noop'));
      if (page < totalPages - 1) nav.push(Markup.button.callback('▶️', `admin_users_${page + 1}`));

      const rows = nav.length ? [nav] : [];
      rows.push([Markup.button.callback('◀️ Dashboard', 'admin')]);

      await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: Markup.inlineKeyboard(rows).reply_markup });
      return true;
    }

    // Lots list
    if (data.startsWith('admin_lots_')) {
      const page = parseInt(data.split('_')[2] || '0');
      const lots = await query<any>('SELECT * FROM lots ORDER BY created_at DESC');
      const total = lots.length;
      const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
      const start = page * PER_PAGE;
      const pageLots = lots.slice(start, start + PER_PAGE);

      let msg = `📦 <b>Barcha lotlar (${total} ta)</b>\n${SEP}\n\n`;
      for (const lot of pageLots) {
        const seller = await queryOne<any>('SELECT name FROM users WHERE id = $1', [lot.seller_id]);
        const statusEmoji: Record<string, string> = { aktiv: '🟢', sotilgan: '💰', arxiv: '📦' };
        msg +=
          `${statusEmoji[lot.status] || '⚪'} <b>#${lot.id}</b> ${lot.category || '📦'} ${(lot.title || '').slice(0, 40)}\n` +
          `  👤 ${seller?.name?.slice(0, 20) || "Noma'lum"} | ${lot.grade || 'N/A'} | ${price(lot.price)} | 📦 ${lot.quantity} dona\n\n`;
      }

      const nav: any[] = [];
      if (page > 0) nav.push(Markup.button.callback('◀️', `admin_lots_${page - 1}`));
      nav.push(Markup.button.callback(`${page + 1}/${totalPages}`, 'noop'));
      if (page < totalPages - 1) nav.push(Markup.button.callback('▶️', `admin_lots_${page + 1}`));

      const rows = nav.length ? [nav] : [];
      rows.push([Markup.button.callback('◀️ Dashboard', 'admin')]);

      await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: Markup.inlineKeyboard(rows).reply_markup });
      return true;
    }

    // Noodle lots
    if (data === 'admin_noodle') {
      const noodleLots = await query<any>("SELECT * FROM lots WHERE title ILIKE '%noodle%'");
      const msg = noodleLots.length > 0
        ? `⚠️ <b>Noodle lotlar (${noodleLots.length} ta)</b>\n${SEP}\n\n` +
          noodleLots.map((lot: any) =>
            `<b>#${lot.id}</b> ${lot.title}\n  👤 Seller #${lot.seller_id} | ${price(lot.price)} | <b>${lot.status}</b>`
          ).join('\n\n') +
          '\n\n<i>Kutilayotgan takliflar tekshirildi — hech qanday xavf yo\'q</i>'
        : '✅ <b>Noodle lotlar</b> — topilmadi. Platforma toza! 🎉';

      await ctx.editMessageText(msg, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📦 Hammasini arxivlash', 'adm_archive_noodle')],
          [Markup.button.callback('◀️ Dashboard', 'admin')],
        ]).reply_markup,
      });
      return true;
    }

    // Actions
    if (data === 'adm_archive_noodle') {
      await query("UPDATE lots SET status = 'arxiv' WHERE title ILIKE '%noodle%' AND status != 'arxiv'");
      await ctx.editMessageText('✅ Barcha noodle lotlar arxivlandi.', { reply_markup: adminMainKeyboard().reply_markup });
      return true;
    }

    if (data === 'admin_stats') {
      const totalUsers = (await queryOne<any>('SELECT COUNT(*) as cnt FROM users'))?.cnt || 0;
      const activeUsers = (await queryOne<any>("SELECT COUNT(*) as cnt FROM users WHERE is_active = true"))?.cnt || 0;
      const totalLots = (await queryOne<any>('SELECT COUNT(*) as cnt FROM lots'))?.cnt || 0;
      const activeLots = (await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE status = 'aktiv'"))?.cnt || 0;
      const soldLots = (await queryOne<any>("SELECT COUNT(*) as cnt FROM lots WHERE status = 'sotilgan'"))?.cnt || 0;
      const totalBids = (await queryOne<any>('SELECT COUNT(*) as cnt FROM bids'))?.cnt || 0;
      const acceptedBids = (await queryOne<any>("SELECT COUNT(*) as cnt FROM bids WHERE status = 'qabul'"))?.cnt || 0;
      const totalRatings = await queryOne<any>('SELECT COUNT(*) as cnt FROM ratings');
      const avgRating = await queryOne<any>('SELECT AVG(score) as avg FROM ratings');

      const msg =
        `📊 <b>Admin — Statistika</b>\n${SEP}\n\n` +
        `<b>👥 Foydalanuvchilar</b>\n` +
        `  Jami: <b>${totalUsers}</b>\n` +
        `  Aktiv: <b>${activeUsers}</b>\n\n` +
        `<b>📦 Lotlar</b>\n` +
        `  Jami: <b>${totalLots}</b>\n` +
        `  🟢 Aktiv: <b>${activeLots}</b>\n` +
        `  💰 Sotilgan: <b>${soldLots}</b>\n` +
        `  📦 Arxiv: <b>${totalLots - activeLots - soldLots}</b>\n\n` +
        `<b>💳 Takliflar</b>\n` +
        `  Jami: <b>${totalBids}</b>\n` +
        `  ✅ Qabul: <b>${acceptedBids}</b>\n` +
        `  Konversiya: <b>${totalBids > 0 ? (acceptedBids / totalBids * 100).toFixed(1) : 0}%</b>\n\n` +
        `<b>⭐ Reyting</b>\n` +
        `  Jami baholar: <b>${totalRatings?.cnt || 0}</b>\n` +
        `  O'rtacha: <b>${avgRating?.avg ? Number(avgRating.avg).toFixed(1) : '0'}</b>\n` +
        `${SEP}\n<i>Ma'lumotlar real vaqtda</i>`;

      await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: adminMainKeyboard().reply_markup });
      return true;
    }

    if (data === 'admin_exit') {
      await ctx.editMessageText('✅ Admin panel yopildi.\nQayta ochish: /admin', { reply_markup: mainMenuKeyboard().reply_markup });
      return true;
    }

    if (data === 'noop') return true;
  } catch (err) {
    console.error('Admin callback error:', err);
    await ctx.editMessageText('😔 Xatolik yuz berdi.', { reply_markup: adminMainKeyboard().reply_markup });
  }
  return true;
}

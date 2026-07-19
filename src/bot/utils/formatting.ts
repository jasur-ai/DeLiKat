export const SEP = '━'.repeat(32);
export const SEP_THIN = '─'.repeat(32);

export function price(amount: number): string {
  if (!amount && amount !== 0) return '—';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln so'm`;
  return `${amount.toLocaleString()} so'm`;
}

export function header(title: string, emoji = ''): string {
  return `<b>${emoji ? emoji + ' ' : ''}${title}</b>\n${SEP}`;
}

export function field(label: string, value: string): string {
  return `  ${label}: <b>${value}</b>`;
}

export function lotSummary(lot: any, lang = 'uz'): string {
  const { CATEGORY_EMOJI, GRADE_EMOJI } = require('./i18n');
  const gradeEmoji = GRADE_EMOJI[lot.grade] || '⚪';
  const catEmoji = CATEGORY_EMOJI[lot.category] || '📦';
  return `<b>#${lot.id}</b> ${catEmoji} ${(lot.title || '').slice(0, 55)}\n  ${gradeEmoji} ${lot.quantity || '?'} dona | ${price(lot.price)}`;
}

export function lotDetail(lot: any, seller?: any): string {
  const { CATEGORY_EMOJI, GRADE_EMOJI, GRADE_LABELS } = require('./i18n');
  const grade = lot.grade || '?';
  const gradeEmoji = GRADE_EMOJI[grade] || '⚪';
  const catEmoji = CATEGORY_EMOJI[lot.category] || '📦';
  const stars = '⭐'.repeat(Math.round(seller?.rating || 0));

  return (
    `<b>#${lot.id}</b> ${catEmoji} <b>${lot.title}</b>\n${SEP}\n` +
    field('Kategoriya', `${catEmoji} ${lot.category}`) + '\n' +
    `${gradeEmoji} Grade: <b>${grade}</b> — ${GRADE_LABELS[grade] || ''}\n` +
    field('Narx', price(lot.price)) + '\n' +
    field('Soni', `${lot.quantity} dona`) + '\n' +
    `  👤 Sotuvchi: <b>${seller?.name || "Noma'lum"}</b> ${stars}\n` +
    field('Takliflar', `${lot.bid_count || 0} ta`) + '\n' +
    `${SEP}`
  );
}

export function welcomeNew(name: string, stats: any, lang = 'uz'): string {
  const { getText } = require('./i18n');
  return (
    `${getText(lang, 'welcome', 'title', { name })}\n\n` +
    `${getText(lang, 'welcome', 'platform')}\n${SEP}\n\n` +
    `📦 ${stats?.lots || 21} ta lot\n` +
    `📂 ${stats?.categories || 6} ta kategoriya\n` +
    `👥 ${stats?.users || 7} ta foydalanuvchi\n\n` +
    `${SEP}\n<b>📝 Ro'yxatdan o'tish:</b>\nTelefon raqamingizni yuboring 👇`
  );
}

export function welcomeBack(name: string, role: string, rating: number, lang = 'uz'): string {
  const { getText } = require('./i18n');
  return (
    `${getText(lang, 'welcome', 'back', { name })}\n${SEP}\n` +
    `${getText(lang, 'role', role)}\n` +
    `⭐ Reyting: <b>${rating?.toFixed(1) || 0}</b>\n${SEP}\n\n` +
    `Asosiy menyudan foydalaning 👇`
  );
}

export function registrationComplete(name: string, phone: string, role: string, lang = 'uz'): string {
  const { getText } = require('./i18n');
  return (
    `${getText(lang, 'registration', 'title')}\n${SEP}\n` +
    `  👤 Ism: <b>${name}</b>\n` +
    `  📞 Telefon: <b>${phone}</b>\n` +
    `  🎯 Rol: <b>${getText(lang, 'role', role)}</b>\n${SEP}\n\n` +
    `<b>🚀 Endi nima qilish mumkin?</b>\n\n` +
    `• /newlot — Yangi lot\n• /search — Qidirish\n• /mylots — Lotlarim\n• /profile — Profil\n• /help — Yordam\n\n` +
    `${SEP_THIN}\n💡 <i>Sotuvchi bo'lsangiz — smartfon va notebook lotlari eng tez ketadi</i>`
  );
}

export function helpFull(lang = 'uz'): string {
  return (
    `🤖 <b>DeLiKet — To'liq qo'llanma</b>\n${SEP}\n\n` +
    `<b>📌 ASOSIY</b>\n  /start — Boshlash\n  /help — Yo'riqnoma\n\n` +
    `<b>📦 LOTLAR</b>\n  /newlot — Yangi lot (6 qadam)\n  /search — Qidirish\n  /mylots — Lotlarim\n  /bulk — Ommaviy boshqaruv\n\n` +
    `<b>💰 TAKLIFLAR</b>\n  /bid [id] [narx] — Taklif\n  /mybids — Takliflarim\n  /cancelbid [id] — Bekor qilish\n\n` +
    `<b>👤 PROFIL</b>\n  /profile — Profil\n  /leaderboard — Reyting\n  /wishlist — Sevimlilar\n\n` +
    `<b>🔧 PREMIUM</b>\n  /subscription — Tariflar\n  /academy — Akademiya\n  /tradein — Trade-In\n  /crossborder — Cross-Border\n  /dispute — Nizolar\n  /ai [savol] — AI yordamchi\n\n` +
    `${SEP_THIN}\n🌐 <a href='https://delikat.vercel.app'>Web platforma</a>`
  );
}

export function profileDisplay(user: any, stats: any, lang = 'uz'): string {
  const stars = '⭐'.repeat(Math.round(user.rating || 0));
  return (
    `<b>👤 Profil</b>\n${SEP}\n` +
    field('Ism', user.name || '—') + '\n' +
    field('Telefon', user.phone || '—') + '\n' +
    field('Rol', user.role || '—') + '\n' +
    `  ⭐ Reyting: ${stars || '—'} <b>${(user.rating || 0).toFixed(1)}</b>\n` +
    `${SEP}\n\n<b>📊 Statistika</b>\n` +
    field('Jami lotlar', String(stats?.total_lots || 0)) + '\n' +
    field('Aktiv lotlar', String(stats?.active_lots || 0)) + '\n' +
    field('Takliflar', String(stats?.bids_sent || 0)) + '\n' +
    `${SEP_THIN}\n<i>Ma'lumotlar real bozor tahliliga asoslangan</i>`
  );
}

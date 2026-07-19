import { Markup } from 'telegraf';

export function mainMenuKeyboard(lang = 'uz') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🆕 Yangi lot', 'newlot'), Markup.button.callback('🔍 Qidirish', 'search')],
    [Markup.button.callback('📋 Lotlarim', 'mylots'), Markup.button.callback('💰 Takliflarim', 'mybids')],
    [Markup.button.callback('👤 Profil', 'profile'), Markup.button.callback('❓ Yordam', 'help')],
    [Markup.button.callback('💎 Premium', 'subscription'), Markup.button.callback('🏆 Reyting', 'leaderboard')],
  ]);
}

export function contactKeyboard(lang = 'uz') {
  return Markup.keyboard([
    [Markup.button.contactRequest('📱 Telefon raqamni yuborish')],
  ]).resize().oneTime();
}

export function roleKeyboard(lang = 'uz') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🛒 Sotuvchi', 'role_sotuvchi')],
    [Markup.button.callback('🛍️ Xaridor', 'role_xaridor')],
    [Markup.button.callback('🔄 Ikkalasi', 'role_ikkalasi')],
  ]);
}

export function categoryKeyboard(lang = 'uz') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📱 Smartfonlar', 'cat_smartfon')],
    [Markup.button.callback('💻 Notebooklar', 'cat_notebook')],
    [Markup.button.callback('📺 TV & Video', 'cat_tv')],
    [Markup.button.callback('🎧 Audio', 'cat_audio')],
    [Markup.button.callback('🔌 Aksessuarlar', 'cat_aksesuar')],
    [Markup.button.callback('👕 Kiyim', 'cat_kiyim')],
    [Markup.button.callback('◀️ Orqaga', 'back_main')],
  ]);
}

export function gradeKeyboard(lang = 'uz') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🟢 A — Yangi', 'grade_A')],
    [Markup.button.callback('🟡 B — Ishlatilgan', 'grade_B')],
    [Markup.button.callback('🔴 C — Nuqsonli', 'grade_C')],
    [Markup.button.callback('❌ Bekor qilish', 'cancel')],
  ]);
}

export function confirmKeyboard(prefix = 'confirm_') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Ha', `${prefix}yes`), Markup.button.callback('❌ Yo\'q', `${prefix}no`)],
  ]);
}

export function skipImageKeyboard(lang = 'uz') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⏭️ Rasmsiz davom etish', 'skip_image')],
  ]);
}

export function lotDetailKeyboard(lotId: number, sellerId: number, userId: number) {
  const buttons = [
    [Markup.button.callback('💰 Taklif yuborish', `bid_${lotId}`)],
    [Markup.button.url('🌐 Web\'da ko\'rish', `https://delikat.vercel.app/lot/${lotId}`)],
  ];
  if (sellerId !== userId) {
    buttons.push([Markup.button.callback('📩 Sotuvchiga savol', `ask_${lotId}`)]);
  }
  buttons.push([Markup.button.callback('◀️ Orqaga', 'search')]);
  return Markup.inlineKeyboard(buttons);
}

export function lotActionsKeyboard(lotId: number, status: string) {
  if (status === 'aktiv') {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📦 Arxivlash', `lot_archive_${lotId}`)],
    ]);
  }
  return Markup.inlineKeyboard([
    [Markup.button.callback('🟢 Aktivlashtirish', `lot_activate_${lotId}`)],
  ]);
}

export function mybidsKeyboard(bids: any[]) {
  const rows = bids.slice(0, 5).map(b => [
    Markup.button.callback(`❌ #${b.id}`, `cancel_bid_${b.id}`),
  ]);
  return Markup.inlineKeyboard([...rows, [Markup.button.callback('◀️ Orqaga', 'back_main')]]);
}

export function paginatedLotKeyboard(lots: any[], page: number, totalPages: number, category: string) {
  const rows = lots.map(l => [
    Markup.button.callback(`#${l.id} ${(l.title || '').slice(0, 35)}`, `detail_${l.id}`),
  ]);
  const nav: any[] = [];
  if (page > 0) nav.push(Markup.button.callback('◀️', `page_${category}_${page - 1}`));
  nav.push(Markup.button.callback(`${page + 1}/${totalPages}`, 'noop'));
  if (page < totalPages - 1) nav.push(Markup.button.callback('▶️', `page_${category}_${page + 1}`));
  rows.push(nav);
  rows.push([Markup.button.callback('◀️ Kategoriyalar', 'search')]);
  return Markup.inlineKeyboard(rows);
}

export function bidActionKeyboard(bidId: number) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Qabul qilish', `bid_accept_${bidId}`)],
    [Markup.button.callback('❌ Rad etish', `bid_reject_${bidId}`)],
  ]);
}

export function confirmCancelKeyboard(bidId: number) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('✅ Ha, bekor qil', `confirm_cancel_${bidId}`)],
    [Markup.button.callback('❌ Yo\'q, qaytish', 'back')],
  ]);
}

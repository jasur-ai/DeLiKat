type Lang = 'uz' | 'ru' | 'en';

const TEXTS: Record<string, Record<string, any>> = {
  uz: {
    lang: { name: "🇺🇿 O'zbekcha", changed: "✅ Til o'zgartirildi: O'zbekcha", select: "Tilni tanlang:" },
    general: { yes: "✅ Ha", no: "❌ Yo'q", back: "◀️ Orqaga", cancel: "❌ Bekor qilish", error: "😔 Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.", not_found: "❌ Topilmadi.", loading: "⏳ Yuklanmoqda..." },
    role: { sotuvchi: "🛒 Sotuvchi", xaridor: "🛍️ Xaridor", ikkalasi: "🔄 Sotuvchi + Xaridor", seller_desc: "Mahsulotlaringizni sotasiz", buyer_desc: "Arzon partiya qidirasiz", both_desc: "Ham sotasiz, ham olasiz" },
    category: { smartfon: "📱 Smartfonlar", notebook: "💻 Notebooklar", tv: "📺 TV va video", audio: "🎧 Audio", aksesuar: "🔌 Aksessuarlar", kiyim: "👕 Kiyim" },
    grade: { a: "🟢 A — Yangi, ochilmagan", b: "🟡 B — Ochilgan, ishlatilgan", c: "🔴 C — Nuqsonli, ehtiyot qism", a_short: "Yangi", b_short: "Ishlatilgan", c_short: "Nuqsonli" },
    status: { aktiv: "🟢 Aktiv", sotilgan: "💰 Sotilgan", arxiv: "📦 Arxiv" },
    welcome: { title: "👋 Assalomu alaykum, {name}!", platform: "<b>🏪 DeLiKet</b> — Deadstock Liquidation Marketplace", back: "👋 Xush kelibsiz, {name}!", phone_received: "✅ <b>Telefon raqam qabul qilindi!</b>", role_prompt: "Endi ro'lingizni tanlay:", invalid_phone: "❌ Noto'g'ri format." },
    registration: { title: "✅ <b>Ro'yxatdan o'tdingiz!</b>", name: "👤 Ism", phone: "📞 Telefon", role: "🎯 Rol", error: "😔 Xatolik yuz berdi." },
    lot: { create: "🆕 Yangi lot yaratish", created: "✅ <b>Lot #{id} yaratildi!</b>", canceled: "❌ Lot bekor qilindi.", timeout: "⏳ Vaqt tugadi.", no_lots: "Hozircha lotlaringiz yo'q.", category_f: "📂 Kategoriya", title_f: "📛 Nomi", price_f: "💰 Narx", quantity_f: "📦 Soni", grade_f: "🏷️ Grade" },
    search: { title: "🔍 Lot qidirish", no_lots: "📭 Aktiv lot yo'q.", categories_title: "Mavjud kategoriyalar:" },
    bid: { sent: "✅ Taklif yuborildi!", my_bids: "💰 Takliflarim ({total} ta)", no_bids: "Hozircha takliflaringiz yo'q.", cancel_done: "✅ Taklif bekor qilindi." },
    profile: { title: "👤 Profil", name: "📛 Ism", phone: "📞 Telefon", role: "🎯 Rol", rating: "⭐ Reyting", not_registered: "⚠️ Siz ro'yxatdan o'tmagansiz." },
    help: { title: "📚 DeLiKet Bot — Qo'llanma" },
    button: { new_lot: "🆕 Yangi lot", search: "🔍 Lot qidirish", my_lots: "📋 Mening lotlarim", my_bids: "💰 Takliflarim", profile: "👤 Profil", help: "❓ Yordam", send_phone: "📱 Telefon raqamni yuborish", skip_image: "⏭️ Rasmsiz davom etish" },
    feature: { notifications: "📬 Bildirishnomalar", wishlist: "❤️ Sevimlilar", leaderboard: "🏆 Leaderboard", academy: "🎓 Academy", subscription: "💎 Premium", crossborder: "🌍 Cross-Border", tradein: "🔄 Trade-In", dispute: "⚖️ Dispute", ai: "🤖 AI yordamchi" },
  },

  ru: {
    lang: { name: "🇷🇺 Русский", changed: "✅ Язык изменен: Русский", select: "Выберите язык:" },
    general: { yes: "✅ Да", no: "❌ Нет", back: "◀️ Назад", cancel: "❌ Отмена", error: "😔 Произошла ошибка.", not_found: "❌ Не найдено.", loading: "⏳ Загрузка..." },
    role: { sotuvchi: "🛒 Продавец", xaridor: "🛍️ Покупатель", ikkalasi: "🔄 Продавец + Покупатель", seller_desc: "Продавайте товары", buyer_desc: "Ищите дешевые партии", both_desc: "И продаете, и покупаете" },
    category: { smartfon: "📱 Смартфоны", notebook: "💻 Ноутбуки", tv: "📺 TV и видео", audio: "🎧 Аудио", aksesuar: "🔌 Аксессуары", kiyim: "👕 Одежда" },
    grade: { a: "🟢 A — Новый", b: "🟡 B — Использованный", c: "🔴 C — Дефектный", a_short: "Новый", b_short: "Использованный", c_short: "Дефектный" },
    status: { aktiv: "🟢 Активен", sotilgan: "💰 Продан", arxiv: "📦 Архив" },
    welcome: { title: "👋 Здравствуйте, {name}!", platform: "<b>🏪 DeLiKet</b> — Deadstock Liquidation Marketplace", back: "👋 С возвращением, {name}!", phone_received: "✅ <b>Номер телефона принят!</b>", role_prompt: "Выберите роль:", invalid_phone: "❌ Неверный формат." },
    registration: { title: "✅ <b>Вы зарегистрированы!</b>", name: "👤 Имя", phone: "📞 Телефон", role: "🎯 Роль", error: "😔 Произошла ошибка." },
    lot: { create: "🆕 Создать новый лот", created: "✅ <b>Лот #{id} создан!</b>", canceled: "❌ Лот отменен.", timeout: "⏳ Время вышло.", no_lots: "У вас еще нет лотов.", category_f: "📂 Категория", title_f: "📛 Название", price_f: "💰 Цена", quantity_f: "📦 Количество", grade_f: "🏷️ Grade" },
    search: { title: "🔍 Поиск лотов", no_lots: "📭 Активных лотов нет.", categories_title: "Доступные категории:" },
    bid: { sent: "✅ Предложение отправлено!", my_bids: "💰 Мои предложения ({total})", no_bids: "У вас пока нет предложений.", cancel_done: "✅ Предложение отменено." },
    profile: { title: "👤 Профиль", name: "📛 Имя", phone: "📞 Телефон", role: "🎯 Роль", rating: "⭐ Рейтинг", not_registered: "⚠️ Вы не зарегистрированы." },
    help: { title: "📚 DeLiKet Bot — Справка" },
    button: { new_lot: "🆕 Новый лот", search: "🔍 Поиск", my_lots: "📋 Мои лоты", my_bids: "💰 Мои ставки", profile: "👤 Профиль", help: "❓ Помощь", send_phone: "📱 Отправить номер", skip_image: "⏭️ Без фото" },
    feature: { notifications: "📬 Уведомления", wishlist: "❤️ Избранное", leaderboard: "🏆 Таблица", academy: "🎓 Академия", subscription: "💎 Премиум", crossborder: "🌍 Cross-Border", tradein: "🔄 Trade-In", dispute: "⚖️ Споры", ai: "🤖 AI помощник" },
  },

  en: {
    lang: { name: "🇬🇧 English", changed: "✅ Language changed: English", select: "Select language:" },
    general: { yes: "✅ Yes", no: "❌ No", back: "◀️ Back", cancel: "❌ Cancel", error: "😔 An error occurred.", not_found: "❌ Not found.", loading: "⏳ Loading..." },
    role: { sotuvchi: "🛒 Seller", xaridor: "🛍️ Buyer", ikkalasi: "🔄 Both", seller_desc: "Sell your products", buyer_desc: "Find cheap batches", both_desc: "Both sell and buy" },
    category: { smartfon: "📱 Smartphones", notebook: "💻 Notebooks", tv: "📺 TV & Video", audio: "🎧 Audio", aksesuar: "🔌 Accessories", kiyim: "👕 Clothing" },
    grade: { a: "🟢 A — New, sealed", b: "🟡 B — Used, opened", c: "🔴 C — Defective, parts", a_short: "New", b_short: "Used", c_short: "Defective" },
    status: { aktiv: "🟢 Active", sotilgan: "💰 Sold", arxiv: "📦 Archived" },
    welcome: { title: "👋 Hello, {name}!", platform: "<b>🏪 DeLiKet</b> — Deadstock Liquidation Marketplace", back: "👋 Welcome back, {name}!", phone_received: "✅ <b>Phone number received!</b>", role_prompt: "Select your role:", invalid_phone: "❌ Invalid format." },
    registration: { title: "✅ <b>Registration complete!</b>", name: "👤 Name", phone: "📞 Phone", role: "🎯 Role", error: "😔 An error occurred." },
    lot: { create: "🆕 Create new lot", created: "✅ <b>Lot #{id} created!</b>", canceled: "❌ Lot cancelled.", timeout: "⏳ Time expired.", no_lots: "You have no lots yet.", category_f: "📂 Category", title_f: "📛 Title", price_f: "💰 Price", quantity_f: "📦 Quantity", grade_f: "🏷️ Grade" },
    search: { title: "🔍 Search lots", no_lots: "📭 No active lots.", categories_title: "Available categories:" },
    bid: { sent: "✅ Bid sent!", my_bids: "💰 My bids ({total})", no_bids: "You have no bids yet.", cancel_done: "✅ Bid cancelled." },
    profile: { title: "👤 Profile", name: "📛 Name", phone: "📞 Phone", role: "🎯 Role", rating: "⭐ Rating", not_registered: "⚠️ You are not registered." },
    help: { title: "📚 DeLiKet Bot — Help" },
    button: { new_lot: "🆕 New lot", search: "🔍 Search", my_lots: "📋 My lots", my_bids: "💰 My bids", profile: "👤 Profile", help: "❓ Help", send_phone: "📱 Send phone", skip_image: "⏭️ Skip image" },
    feature: { notifications: "📬 Notifications", wishlist: "❤️ Wishlist", leaderboard: "🏆 Leaderboard", academy: "🎓 Academy", subscription: "💎 Premium", crossborder: "🌍 Cross-Border", tradein: "🔄 Trade-In", dispute: "⚖️ Dispute", ai: "🤖 AI assistant" },
  },
};

export function t(lang: Lang | string, ...keys: string[]): string {
  let obj: any = TEXTS[lang] || TEXTS.uz;
  for (const key of keys) {
    obj = obj?.[key];
    if (obj === undefined) return `{${keys.join('.')}}`;
  }
  return typeof obj === 'string' ? obj : `{${keys.join('.')}}`;
}

export function getText(lang: Lang | string, section: string, key: string, vars?: Record<string, any>): string {
  let text = t(lang, section, key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export const CATEGORY_EMOJI: Record<string, string> = { smartfon: '📱', notebook: '💻', tv: '📺', audio: '🎧', aksesuar: '🔌', kiyim: '👕' };
export const GRADE_EMOJI: Record<string, string> = { A: '🟢', B: '🟡', C: '🔴' };
export const STATUS_EMOJI: Record<string, string> = { aktiv: '🟢', sotilgan: '💰', arxiv: '📦' };
export const CATEGORY_NAMES: Record<string, string> = { smartfon: 'Smartfonlar', notebook: 'Notebooklar', tv: 'TV & Video', audio: 'Audio', aksesuar: 'Aksessuarlar', kiyim: 'Kiyim' };
export const GRADE_LABELS: Record<string, string> = { A: 'Yangi, ochilmagan', B: 'Ochilgan, ishlatilgan', C: 'Nuqsonli, ehtiyot qism' };

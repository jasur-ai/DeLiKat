"""
DeLiKet Bot — Message Formatting Utilities
Professional, polished, consistent message styling for all bot messages.
All text strings are translated via i18n system.
"""

from typing import Optional, List, Dict, Any
from bot.utils.i18n import get_text, get_category_name, get_role_name

# ─── Style Constants ───────────────────────────────────

SEP = "━" * 32
SEP_THIN = "─" * 32
DOT = "•"

CATEGORY_EMOJI = {
    "smartfon": "📱", "notebook": "💻", "tv": "📺",
    "audio": "🎧", "aksesuar": "🔌", "kiyim": "👕",
}

CATEGORY_NAMES = {
    "smartfon": "Smartfonlar", "notebook": "Notebooklar",
    "tv": "TV & Video", "audio": "Audio",
    "aksesuar": "Aksessuarlar", "kiyim": "Kiyim",
}

GRADE_EMOJI = {"A": "🟢", "B": "🟡", "C": "🔴"}

STATUS_EMOJI = {"aktiv": "🟢", "sotilgan": "💰", "arxiv": "📦"}
BID_STATUS_EMOJI = {"kutmoqda": "⏳", "qabul": "✅", "rad": "❌"}

GRADE_LABELS = {"A": "Yangi, ochilmagan", "B": "Ochilgan, ishlatilgan", "C": "Nuqsonli, ehtiyot qism"}

ROLE_NAMES = {
    "sotuvchi": "🛒 Sotuvchi",
    "xaridor": "🛍️ Xaridor",
    "ikkalasi": "🔄 Sotuvchi + Xaridor",
}


def rol_nomi(role: str, lang: str = "uz") -> str:
    """Rol nomini chiroyli ko'rsatish (translated)"""
    return get_text(lang, "role", role)

# ─── Builders ──────────────────────────────────────────

def header(title: str, emoji: str = "") -> str:
    """Bold header with optional emoji and separator"""
    e = f"{emoji} " if emoji else ""
    return f"<b>{e}{title}</b>\n{SEP}"


def section(title: str, emoji: str = "") -> str:
    """Section header"""
    e = f"{emoji} " if emoji else ""
    return f"\n{e}<b>{title}</b>"


def field(label: str, value: str, inline: bool = False) -> str:
    """Key-value field"""
    return f"  {label}: <b>{value}</b>"


def bullet(text: str, indent: int = 0) -> str:
    """Bullet point"""
    prefix = "  " * indent + f"{DOT} "
    return f"{prefix}{text}"


def listing(items: List[str], ordered: bool = False) -> str:
    """Numbered or bulleted list"""
    result = []
    for i, item in enumerate(items, 1):
        prefix = f"{i}. " if ordered else f"{DOT} "
        result.append(f"{prefix}{item}")
    return "\n".join(result)


def price(amount: float) -> str:
    """Format price: 7,500,000 so'm"""
    if amount is None:
        return "—"
    if amount >= 1_000_000:
        return f"{amount:,.0f} so'm ({amount/1_000_000:.1f} mln)"
    return f"{amount:,.0f} so'm"


# ─── Complex Templates ─────────────────────────────────

def welcome_new(user_name: str, stats: Dict[str, Any], lang: str = "uz") -> str:
    """New user welcome message"""
    return (
        f"{get_text(lang, 'welcome', 'title', name=user_name)}\n\n"
        f"{get_text(lang, 'welcome', 'platform')}\n"
        f"{SEP}\n\n"
        f"{get_text(lang, 'welcome', 'stats_title')}\n"
        f"  {get_text(lang, 'welcome', 'lots', count=stats.get('lots', 21))}\n"
        f"  {get_text(lang, 'welcome', 'categories', count=stats.get('categories', 6))}\n"
        f"  {get_text(lang, 'welcome', 'users', count=stats.get('users', 7))}\n"
        f"\n"
        f"{get_text(lang, 'welcome', 'realtime')}\n\n"
        f"{SEP}\n"
        f"{get_text(lang, 'welcome', 'register_title')}\n"
        f"{get_text(lang, 'welcome', 'phone_prompt')}"
    )


def welcome_back(name: str, role: str, rating: float, lang: str = "uz") -> str:
    """Returning user welcome"""
    return (
        f"{get_text(lang, 'welcome', 'back', name=name)}\n"
        f"{SEP}\n"
        f"  {get_text(lang, 'role', role)}\n"
        f"  {get_text(lang, 'welcome', 'rating', rating=rating)}\n"
        f"{SEP}\n\n"
        f"{get_text(lang, 'welcome', 'menu_prompt')}"
    )


def registration_complete(name: str, phone: str, role: str, lang: str = "uz") -> str:
    """After successful registration"""
    return (
        f"{get_text(lang, 'registration', 'title')}\n"
        f"{SEP}\n"
        f"  {get_text(lang, 'registration', 'name')}:    <b>{name}</b>\n"
        f"  {get_text(lang, 'registration', 'phone')}: <b>{phone}</b>\n"
        f"  {get_text(lang, 'registration', 'role')}:    <b>{get_text(lang, 'role', role)}</b>\n"
        f"{SEP}\n\n"
        f"{get_text(lang, 'registration', 'what_next')}\n\n"
        f"{DOT} <b>/newlot</b>  — {get_text(lang, 'button', 'new_lot')}\n"
        f"{DOT} <b>/search</b> — {get_text(lang, 'button', 'search')}\n"
        f"{DOT} <b>/mylots</b> — {get_text(lang, 'button', 'my_lots')}\n"
        f"{DOT} <b>/profile</b>— {get_text(lang, 'button', 'profile')}\n"
        f"{DOT} <b>/help</b>   — {get_text(lang, 'button', 'help')}\n\n"
        f"{SEP_THIN}\n"
        f"{get_text(lang, 'registration', 'tip')}"
    )


def lot_summary(lot: Dict[str, Any], lang: str = "uz") -> str:
    """One lot in a list (compact)"""
    grade_e = GRADE_EMOJI.get(lot.get("grade", ""), "⚪")
    cat_e = CATEGORY_EMOJI.get(lot.get("category", ""), "📦")
    return (
        f"<b>#{lot['id']}</b> {cat_e} {lot['title'][:55]}\n"
        f"  {grade_e} {lot.get('quantity', '?')} dona | "
        f"{price(lot.get('price', 0))}"
    )


def lot_detail(lot: Dict[str, Any], lang: str = "uz") -> str:
    """Full lot detail view"""
    grade = lot.get("grade", "?")
    grade_e = GRADE_EMOJI.get(grade, "⚪")
    grade_label = get_text(lang, "grade", f"{grade.lower()}_short") if grade else ""
    cat_e = CATEGORY_EMOJI.get(lot.get("category", ""), "📦")
    status_e = STATUS_EMOJI.get(lot.get("status", ""), "")
    seller = lot.get("seller", {})
    seller_name = seller.get("name", get_text(lang, "general", "not_found"))
    seller_rating = seller.get("rating", 0)
    stars = "⭐" * int(seller_rating) if seller_rating else "—"

    return (
        f"<b>#{lot['id']}</b> {cat_e} <b>{lot['title']}</b>\n"
        f"{SEP}\n"
        f"  {get_text(lang, 'lot', 'category_f')}:  <b>{get_category_name(lot.get('category', ''), lang)}</b>\n"
        f"  {grade_e} Grade:        <b>{grade}</b> — {grade_label}\n"
        f"  {get_text(lang, 'lot', 'price_f')}:         <b>{price(lot.get('price', 0))}</b>\n"
        f"  {get_text(lang, 'lot', 'quantity_f')}:         <b>{lot.get('quantity', '?')} dona</b>\n"
        f"  {status_e} {get_text(lang, 'lot', 'grade_f')}:        <b>{lot.get('status', '?')}</b>\n"
        f"  👤 Sotuvchi:     <b>{seller_name}</b> {stars}\n"
        f"  💬 Takliflar:    <b>{lot.get('bid_count', 0)} ta</b>\n"
        f"  📅 Qo'shilgan:   <b>{lot.get('created_at', '—')[:10] if lot.get('created_at') else '—'}</b>\n"
        f"{SEP}"
    )


def bid_receipt(bid_id: int, lot_id: int, title: str, price_amount: float,
                quantity: int, grade: str, seller_name: str, lang: str = "uz") -> str:
    """After sending a bid"""
    grade_e = GRADE_EMOJI.get(grade, "⚪")
    total = price_amount * quantity
    return (
        f"{get_text(lang, 'bid', 'sent', bid_id=bid_id)}\n"
        f"{SEP}\n"
        f"  📦 Lot:      <b>#{lot_id}</b> — {title[:50]}\n"
        f"  {grade_e} Grade:    <b>{grade}</b>\n"
        f"  💰 Taklif:   <b>{price(price_amount)}</b> × {quantity} dona\n"
        f"  💰 Jami:     <b>{price(total)}</b>\n"
        f"  👤 Sotuvchi: <b>{seller_name}</b>\n"
        f"{SEP}\n\n"
        f"⏳ Sotuvchi javobini kuting.\n"
        f"📋 /mybids — Statusni kuzating\n"
        f"❌ /cancelbid {bid_id} — {get_text(lang, 'bid', 'cancel_btn')}"
    )


def help_full(lang: str = "uz") -> str:
    """Full help text — 20+ features (2026)"""
    return (
        f"🤖 <b>DeLiKet — To'liq qo'llanma</b>\n"
        f"{SEP}\n\n"
        f"<b>📌 ASOSIY BUYRUQLAR</b>\n"
        f"  /start — Botni boshlash / Ro'yxatdan o'tish\n"
        f"  /help — Bu qo'llanma\n"
        f"  /language — Tilni o'zgartirish (uz/ru/en)\n\n"
        f"<b>📦 LOTLAR</b>\n"
        f"  /newlot — Yangi lot yaratish\n"
        f"  /search — Lot qidirish (kategoriya bo'yicha)\n"
        f"  /mylots — Mening lotlarim\n"
        f"  /bulk — Ommaviy lot boshqaruvi (arxiv/aktiv/list)\n"
        f"  /share [id] — Lotni Telegram'da ulashish\n"
        f"  /recommend — Shaxsiy tavsiyalar\n\n"
        f"<b>💰 TAKLIFLAR</b>\n"
        f"  /bid [id] [narx] — Taklif yuborish\n"
        f"  /mybids — Takliflarim\n"
        f"  /cancelbid [id] — Taklifni bekor qilish\n"
        f"  /pricealert [id] [narx] — Narx tushganda xabar olish\n"
        f"  /escrow — Xaridor himoyasi (Escrow)\n\n"
        f"<b>🔍 AQLLI FUNKSIYALAR</b>\n"
        f"  /wishlist — Sevimli lotlar\n"
        f"  /savesearch — Qidiruvni saqlash (--cat --min --max)\n"
        f"  /notifications — Bildirishnomalar sozlamalari\n"
        f"  /marketprice [kat] — Bozor narxlari tahlili\n"
        f"  /ai [so'rov] — AI yordamchi (tabiiy tilda qidiruv)\n"
        f"  /myanalytics — Shaxsiy statistika\n\n"
        f"<b>👤 PROFIL & ISHONCH</b>\n"
        f"  /profile — Kengaytirilgan profil (XP, Level, Badge'lar)\n"
        f"  /leaderboard — Reyting jadvali\n"
        f"  /trustscore [id] — Ishonch reytingi\n"
        f"  /review [user] [lot] [baho] — Sharh qoldirish\n"
        f"  /report [lot] — Shubhali lotni xabar qilish\n"
        f"  /ask [lot] [savol] — Sotuvchiga savol berish\n"
        f"  /answer [id] [javob] — Savolga javob berish\n\n"
        f"<b>🎮 PREMIUM</b>\n"
        f"  /theme — Mavzuni o'zgartirish (dark/light)\n"
        f"  /crypto — Kripto to'lov imkoniyati\n"
        f"  /profile — XP, Level, Badge'lar\n"
        f"  /leaderboard — Top reyting\n\n"
        f"<b>🔧 ADMIN</b>\n"
        f"  /admin — Admin panel\n"
        f"  @DeLiKatbot [query] — Inline qidiruv\n\n"
        f"<b>📖 MISOLLAR</b>\n"
        f"  /search notebook — Notebooklarni ko'rish\n"
        f"  /bid 5 750000 — 5-lotga 750k so'm taklif\n"
        f"  /savesearch iPhone 13 --min 300 --max 500\n"
        f"  /ai menga 400 dollargacha notebook kerak\n"
        f"  /pricealert 5 500000 — Narx 500k dan tushsa xabar\n"
        f"  /marketprice smartfon — Smartfon bozor tahlili\n"
        f"{SEP_THIN}\n"
        f"🌐 <a href='https://delikat.vercel.app'>Web platforma</a>"
    )


def stars_display(score: float, count: int = 0, lang: str = "uz") -> str:
    """Star rating visual: ⭐⭐⭐⭐½ (4.5)"""
    full = int(score)
    half = 1 if score - full >= 0.5 else 0
    empty = 5 - full - half
    stars = "⭐" * full + "🌟" * half + "☆" * empty
    if count:
        return f"{stars} <b>{score:.1f}</b> ({count} ta baho)"
    return f"{stars} <b>{score:.1f}</b>"


def profile_display(user: Dict[str, Any], lang: str = "uz") -> str:
    """User profile with stats"""
    rating = user.get('rating', 0)
    rating_count = user.get('rating_count', 0)
    no_rating_text = get_text(lang, 'profile', 'no_rating')
    rating_str = stars_display(rating, rating_count, lang) if rating_count > 0 else f"<b>{rating:.1f}</b> / 5.0 ({no_rating_text})"
    return (
        f"{get_text(lang, 'profile', 'title')}\n"
        f"{SEP}\n"
        f"  {get_text(lang, 'profile', 'name')}:         <b>{user.get('name', '—')}</b>\n"
        f"  {get_text(lang, 'profile', 'phone')}:     <b>{user.get('phone', '—')}</b>\n"
        f"  {get_text(lang, 'profile', 'role')}:         <b>{get_text(lang, 'role', user.get('role', ''))}</b>\n"
        f"  {get_text(lang, 'profile', 'rating')}:     {rating_str}\n"
        f"  {get_text(lang, 'profile', 'date')}:     <b>{user.get('created_at', '—')[:10] if user.get('created_at') else '—'}</b>\n"
        f"{SEP}\n\n"
        f"{get_text(lang, 'profile', 'stats_title')}\n"
        f"  {get_text(lang, 'profile', 'total_lots')}:         <b>{user.get('lot_count', 0)}</b>\n"
        f"  {get_text(lang, 'profile', 'active_lots')}:        <b>{user.get('active_lots', 0)}</b>\n"
        f"  {get_text(lang, 'profile', 'bids_sent')}: <b>{user.get('bid_count', 0)}</b>\n"
        f"  {get_text(lang, 'profile', 'pending')}:      <b>{user.get('pending_bids', 0)}</b>\n"
        f"{SEP_THIN}\n"
        f"{get_text(lang, 'profile', 'disclaimer')}"
    )

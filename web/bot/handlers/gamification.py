"""
DeLiKet Bot — Gamification & Premium Features (Feature 16-20)
XP, Levels, Badges, Leaderboard, Dark Mode, Crypto, AI Assistant
"""

import logging
import os
import re
from datetime import datetime, timezone, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from api.database import SessionLocal
from api.database.models import User, Lot, Bid, Achievement, Transaction, Rating
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.decorators import auth_required
from bot.utils.formatting import SEP, SEP_THIN, price as fmt_price, stars_display
from bot.utils.i18n import get_text

logger = logging.getLogger(__name__)
WEB_URL = os.getenv("WEB_URL", "https://delikat.vercel.app")

# Badge definitions
BADGES = {
    'first_bid': {'title': 'Birinchi taklif', 'emoji': '🎯', 'desc': 'Birinchi taklifingizni yuboring', 'xp': 50},
    'first_sale': {'title': 'Birinchi sotuv', 'emoji': '💰', 'desc': 'Birinchi lotingizni soting', 'xp': 100},
    'five_bids': {'title': 'Faol xaridor', 'emoji': '🔥', 'desc': '5 ta taklif yuboring', 'xp': 200},
    'ten_sales': {'title': 'Tajribali sotuvchi', 'emoji': '🏪', 'desc': '10 ta lot soting', 'xp': 500},
    'top_rated': {'title': 'Eng yaxshi', 'emoji': '⭐', 'desc': "Reyting 4.5+ bo'lsin", 'xp': 300},
    'fast_responder': {'title': 'Tez javob', 'emoji': '⚡', 'desc': 'Savollarga 1 soat ichida javob bering', 'xp': 150},
    'verified': {'title': 'Tasdiqlangan', 'emoji': '🟦', 'desc': "ID tekshiruvidan o'ting", 'xp': 400},
    'collector': {'title': 'Kolleksioner', 'emoji': '🏛️', 'desc': '10 ta lotni sevimlilarga qo\'shing', 'xp': 100},
    'super_buyer': {'title': 'Super xaridor', 'emoji': '👑', 'desc': '10 marta muvaffaqiyatli xarid', 'xp': 1000},
    'super_seller': {'title': 'Super sotuvchi', 'emoji': '💎', 'desc': '10 marta muvaffaqiyatli sotuv', 'xp': 1000},
}

LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500]
LEVEL_NAMES = [
    "Yangi boshlovchi", "O'rganuvchi", "Faol", "Mutaxassis",
    "Tajribali", "Usta", "Ekspert", "Legend", "Master", "DeLiKet Elchisi", "🏆 DeLiKet Qiroli"
]


def get_level(xp: int) -> tuple:
    """XP asosida level va level nomini qaytaradi"""
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if xp >= threshold:
            level = i + 1
        else:
            break
    level = min(level, len(LEVEL_NAMES))
    next_xp = LEVEL_THRESHOLDS[min(level, len(LEVEL_THRESHOLDS) - 1)]
    current_xp = LEVEL_THRESHOLDS[level - 1] if level > 1 else 0
    return level, LEVEL_NAMES[level - 1], current_xp, next_xp


def award_xp(user_id: int, xp_amount: int, db=None):
    """XP qo'shish va level o'zgarishini tekshirish"""
    if db is None:
        db = SessionLocal()
        close_db = True
    else:
        close_db = False

    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, 0, 0

        old_level = user.level
        user.xp = (user.xp or 0) + xp_amount
        new_level, _, _, _ = get_level(user.xp)
        user.level = new_level
        db.commit()

        leveled_up = new_level > old_level
        return leveled_up, new_level, user.xp
    finally:
        if close_db:
            db.close()


def check_and_award_badge(user_id: int, badge_key: str, db=None):
    """Badge ni tekshirish va berish"""
    if db is None:
        db = SessionLocal()
        close_db = True
    else:
        close_db = False

    try:
        existing = db.query(Achievement).filter(
            Achievement.user_id == user_id,
            Achievement.badge == badge_key
        ).first()
        if existing:
            return False

        badge = BADGES.get(badge_key)
        if not badge:
            return False

        achievement = Achievement(
            user_id=user_id,
            badge=badge_key,
            title=badge['title'],
            description=badge['desc'],
            xp_reward=badge['xp'],
        )
        db.add(achievement)
        db.commit()
        return True
    finally:
        if close_db:
            db.close()


# ═══════════════════════════════════════════════
# FEATURE 16: /profile — Gamification profile
# ═══════════════════════════════════════════════

@auth_required
async def profile_extended_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Kengaytirilgan profil — XP, Level, Badges"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    args = context.args

    db = SessionLocal()
    try:
        # Check other user's profile
        if args:
            try:
                target_id = int(args[0])
            except ValueError:
                await update.message.reply_html("❌ Noto'g'ri ID.")
                return
        else:
            target_id = user_id

        target = db.query(User).filter(User.id == target_id).first()
        if not target:
            await update.message.reply_html("❌ Foydalanuvchi topilmadi.")
            return

        # XP & Level
        level, level_name, current_xp, next_xp = get_level(target.xp or 0)
        xp_progress = ((target.xp or 0) - current_xp) / (next_xp - current_xp) * 100 if next_xp > current_xp else 100

        # Badges
        achievements = db.query(Achievement).filter(
            Achievement.user_id == target_id
        ).order_by(Achievement.unlocked_at.desc()).all()

        # Stats
        total_lots = db.query(Lot).filter(Lot.seller_id == target_id).count()
        total_bids = db.query(Bid).filter(Bid.buyer_id == target_id).count()
        active_lots = db.query(Lot).filter(Lot.seller_id == target_id, Lot.status == 'aktiv').count()
        sold_lots = db.query(Lot).filter(Lot.seller_id == target_id, Lot.status == 'sotilgan').count()

        # Badge showcase
        badge_show = ""
        if achievements:
            for a in achievements[:5]:  # Show top 5
                badge_info = BADGES.get(a.badge, {})
                badge_show += f"  {badge_info.get('emoji', '🏅')} <b>{a.title}</b>\n"
        else:
            badge_show = "  Hali badge yo'q — faol bo'ling!\n"

        # XP bar (visual)
        bar_len = 12
        filled = int(xp_progress / 100 * bar_len)
        bar = "█" * filled + "░" * (bar_len - filled)

        # Trust badge
        trust_badge = "🟦 Tasdiqlangan" if target.is_verified else "⬜ Tasdiqlanmagan"

        msg = (
            f"👤 <b>{target.name}</b>\n{SEP}\n\n"
            f"<b>📊 Daraja</b>\n"
            f"  Lv.<b>{level}</b> {level_name}\n"
            f"  XP: {bar} <b>{int(target.xp or 0)}</b> / {next_xp}\n\n"
            f"<b>🏅 Badge'lar ({len(achievements)} ta)</b>\n"
            f"{badge_show}\n"
            f"<b>📊 Statistika</b>\n"
            f"  📦 Lotlar: {total_lots} (🟢{active_lots} 💰{sold_lots})\n"
            f"  💰 Takliflar: {total_bids} ta\n"
            f"  ⭐ Reyting: {stars_display(target.rating)}\n"
            f"  {trust_badge}\n"
            f"{SEP}\n"
            f"<i>Faol bo'ling ko'proq badge va XP oling!</i>"
        )

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ═══════════════════════════════════════════════
# /leaderboard — Reyting jadvali
# ═══════════════════════════════════════════════

@auth_required
async def leaderboard_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Top foydalanuvchilar reytingi"""
    lang = context.user_data.get("lang", "uz")
    db = SessionLocal()
    try:
        # Top by XP
        top_xp = db.query(User).order_by(User.xp.desc()).limit(10).all()
        # Top by sales
        top_sales = db.query(User).order_by(User.total_sales.desc()).limit(5).all()

        msg = "🏆 <b>DeLiKet Reytingi</b>\n" + SEP + "\n\n"

        msg += "<b>XP bo'yicha top 10:</b>\n"
        if top_xp:
            for i, user in enumerate(top_xp, 1):
                medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, f"{i}.")
                level, level_name, _, _ = get_level(user.xp or 0)
                msg += f"  {medal} <b>{user.name[:20]}</b> — Lv.{level} ({user.xp or 0} XP)\n"
        else:
            msg += "  Ma'lumot yo'q\n"

        msg += f"\n<b>💰 Sotuv bo'yicha top 5:</b>\n"
        if top_sales:
            for i, user in enumerate(top_sales, 1):
                medal = {1: "🥇", 2: "🥈", 3: "🥉"}.get(i, f"{i}.")
                msg += f"  {medal} <b>{user.name[:20]}</b> — {user.total_sales} ta\n"
        else:
            msg += "  Ma'lumot yo'q\n"

        msg += f"\n{SEP}\n<i>Reyting har kuni yangilanadi</i>"
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 17: Theme toggle — Dark/Light mode
# ═══════════════════════════════════════════════

@auth_required
async def theme_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Interfeys mavzusini o'zgartirish"""
    lang = context.user_data.get("lang", "uz")

    current_theme = context.user_data.get("theme", "light")
    new_theme = "dark" if current_theme == "light" else "light"
    context.user_data["theme"] = new_theme

    theme_name = "🌙 Dark" if new_theme == "dark" else "☀️ Light"
    theme_desc = "Qorong'i" if new_theme == "dark" else "Yorug'"

    await update.message.reply_html(
        f"🎨 <b>Mavzu o'zgartirildi!</b>\n\n"
        f"Yangi mavzu: <b>{theme_name}</b> ({theme_desc})\n\n"
        f"<i>Bu sozlama faqat Telegram interfeysiga ta'sir qiladi.\n"
        f"Web interfeysda mavzuni saytning o'zida o'zgartirishingiz mumkin.</i>",
        reply_markup=main_menu_keyboard()
    )


# ═══════════════════════════════════════════════
# FEATURE 19: /crypto — Crypto to'lov ma'lumot
# ═══════════════════════════════════════════════

@auth_required
async def crypto_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Crypto to'lov imkoniyati"""
    lang = context.user_data.get("lang", "uz")

    msg = (
        f"🔗 <b>Crypto to'lovlar</b>\n{SEP}\n\n"
        f"DeLiKet platformasida katta summalar uchun "
        f"kriptovalyuta to'lovlarini qabul qilamiz!\n\n"
        f"<b>Qabul qilinadigan:</b>\n"
        f"  • USDT (TRC-20)\n"
        f"  • USDC (ERC-20)\n"
        f"  • BTC (Bitcoin)\n\n"
        f"<b>Afzalliklari:</b>\n"
        f"  ✅ Minimal komissiya (1%)\n"
        f"  ✅ Tezkor o'tkazma (5-30 daqiqa)\n"
        f"  ✅ Xalqaro o'tkazmalar\n\n"
        f"<b>Qanday ishlaydi?</b>\n"
        f"1️⃣ Lotni toping /search\n"
        f"2️⃣ Sotuvchi bilan kelishing\n"
        f"3️⃣ /crypto orqali to'lov ma'lumotini oling\n\n"
        f"{SEP}\n"
        f"<i>Funksiya rivojlanish bosqichida.\n"
        f"Tez orada to'liq ishga tushadi!</i>"
    )
    await update.message.reply_html(msg, reply_markup=main_menu_keyboard())


# ═══════════════════════════════════════════════
# FEATURE 20: /ai — AI Shopping Assistant
# ═══════════════════════════════════════════════

@auth_required
async def ai_assistant_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """AI yordamchi — natural language qidiruv"""
    lang = context.user_data.get("lang", "uz")
    args = context.args

    if not args:
        await update.message.reply_html(
            "🤖 <b>AI Shopping Assistant</b>\n\n"
            "Tabiiy tilda lot qidirish!\n\n"
            "<b>Misol:</b>\n"
            "• /ai menga 400 dollargacha yaxshi notebook kerak\n"
            "• /ai iPhone 13 128GB qancha turadi?\n"
            "• /ai arzon smartfonlar\n"
            "• /ai eng qimmat lotlar\n\n"
            "<i>AI assistant eng mos lotlarni topib beradi</i>",
            reply_markup=main_menu_keyboard()
        )
        return

    query = " ".join(args).lower()
    db = SessionLocal()
    try:
        # Simple keyword-based search (AI simulation)
        # Extract price if mentioned
        price_keywords = re.findall(r'(\d+)\s*(?:dollar|\$|so\'?m|ming|million)', query)
        max_price = None
        if price_keywords:
            val = float(price_keywords[0])
            if 'million' in query:
                max_price = val * 1000000
            elif 'ming' in query:
                max_price = val * 1000
            elif 'dollar' in query or '$' in query:
                max_price = val * 12800  # approx USD to UZS
            else:
                max_price = val

        # Determine category from keywords
        cat_map = {
            'smartfon': ['iphone', 'samsung', 'redmi', 'xiaomi', 'phone', 'telefon', 'smartfon', 'galaxy', 'pixel'],
            'notebook': ['notebook', 'laptop', 'macbook', 'thinkpad', 'asus', 'acer', 'dell', 'hp'],
            'tv': ['tv', 'televizor', 'television', 'samsung tv', 'lg tv'],
            'audio': ['airpods', 'jbl', 'headphone', 'quloqchin', 'kolonka', 'speaker'],
            'aksesuar': ['chexol', 'powerbank', 'kabel', 'charger', 'zaryad', 'case'],
            'kiyim': ['ko\'ylak', 'formula', 'kiyim', 'dress', 'shirt'],
        }

        category = None
        for cat, keywords in cat_map.items():
            if any(kw in query for kw in keywords):
                category = cat
                break

        # Build query
        lots = db.query(Lot).filter(Lot.status == 'aktiv')
        if category:
            lots = lots.filter(Lot.category == category)
        if max_price:
            lots = lots.filter(Lot.price <= max_price)

        # Order by relevance (price match or newest)
        lots = lots.order_by(Lot.created_at.desc()).limit(10).all()

        if not lots:
            # Try broader search
            lots = db.query(Lot).filter(Lot.status == 'aktiv')\
                .order_by(Lot.created_at.desc()).limit(5).all()
            if not lots:
                await update.message.reply_html(
                    "🤖 <b>AI Assistant</b>\n\n"
                    f"'{query}' bo'yicha hech narsa topilmadi.\n\n"
                    "Boshqa so'zlar bilan urinib ko'ring yoki /search",
                    reply_markup=main_menu_keyboard()
                )
                return
            prefix = f"🔍 '{query}' bo'yicha topilmadi. Eng so'nggi lotlar:\n\n"
        else:
            prefix = f"🤖 <b>'{query}' bo'yicha topilmalar:</b>\n\n"

        from bot.utils.formatting import CATEGORY_EMOJI, GRADE_EMOJI, GRADE_LABELS
        msg = prefix
        for lot in lots:
            emoji = CATEGORY_EMOJI.get(lot.category, "📦")
            msg += (
                f"{emoji} <b>#{lot.id}</b> — {lot.title[:50]}\n"
                f"  💰 {fmt_price(lot.price)} | 📦 {lot.quantity} dona\n\n"
            )

        msg += f"<i>AI Assistant — natijani yaxshilash ustida ishlaymiz</i>"
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()

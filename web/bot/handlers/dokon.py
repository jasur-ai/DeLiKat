"""
DeLiKet Bot — /dokon B2B Sotuvchi Onboarding
Maxsus: Fleshka bozori va Toshkent do'konlari uchun
- Tez ro'yxat (Telegram ID bilan)
- Soddalashtirilgan lot yaratish
- 0% komissiya va ESCROW haqida tushuntirish
- Web landing page link (/dokonlar)
- Maxsus Reply keyboard: Lot yaratish, Lotlarim, Do'konlar, Yordam
"""

import logging
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler, CommandHandler, MessageHandler, CallbackQueryHandler, filters

from api.database import SessionLocal
from api.database.models import User, Lot
from bot.keyboards.menu import main_menu_keyboard, dokon_main_menu_keyboard
from bot.utils.session import session_manager
from bot.utils.i18n import get_text
from bot.utils.formatting import (
    CATEGORY_EMOJI, CATEGORY_NAMES, GRADE_EMOJI, GRADE_LABELS,
    price as fmt_price, SEP, SEP_THIN
)

logger = logging.getLogger(__name__)

WEB_URL = os.getenv("WEB_URL", "https://delikat.vercel.app")

# ── Conversation states ──
# Registration flow
REG_FULLNAME, REG_PHONE, REG_ROLE, REG_CONFIRM = range(4)
# Simplified lot creation flow (after registration)
SIMPLOT_START, SIMPLOT_CATEGORY, SIMPLOT_DETAILS, SIMPLOT_IMAGE, SIMPLOT_GRADE, SIMPLOT_CONFIRM, SIMPLOT_AGAIN = range(4, 11)


# ══════════════════════════════════════════════
# /dokon — B2B Seller Onboarding Command
# ══════════════════════════════════════════════

async def dokon_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Entry point: /dokon — Fleshka va do'konlar uchun onboarding"""
    user = update.effective_user
    user_id = user.id
    lang = context.user_data.get("lang", "uz")

    # Check if already registered
    db = SessionLocal()
    existing = db.query(User).filter(User.id == user_id).first()
    db.close()

    if existing:
        # Already registered — go directly to seller menu with dokon keyboard
        session = session_manager.get_or_create(user_id)
        session.is_authenticated = True
        session.role = existing.role
        session.name = existing.name

        await update.message.reply_html(
            f"🏪 <b>Xush kelibsiz, {existing.name}!</b>\n\n"
            f"Siz allaqachon ro'yxatdan o'tgansiz. "
            f"Do'kon menyusidan foydalaning.\n\n"
            f"📊 <b>Statistika:</b>\n"
            f"  • Reyting: {existing.rating or 0} ★\n"
            f"  • Rol: {existing.role or 'xaridor'}\n\n"
            f"🌐 Web: <a href='{WEB_URL}/seller-onboarding'>Sotuvchi qo'llanma</a>\n"
            f"📱 Web: <a href='{WEB_URL}/dokonlar'>Do'konlar sahifasi</a>",
            reply_markup=dokon_main_menu_keyboard()
        )
        return ConversationHandler.END

    # New seller — start B2B onboarding
    session = session_manager.get_or_create(user_id)
    session.data["dokon_flow"] = {}
    session.state = "dokon_reg"

    msg = (
        "🏪 <b>DeLiKet — Do'kon sotuvchilari uchun!</b>\n\n"
        "Siz <b>Fleshka</b>, <b>Abulay</b> yoki Toshkentdagi boshqa "
        "elektronika do'konidanmisiz?\n\n"
        "<b>DeLiKet'da siz:</b>\n"
        "  ✅ 0% komissiya bilan sotasiz (Uzum 15-25%)\n"
        "  ✅ Ortiqcha stokni partiyalab sotasiz\n"
        "  ✅ ESCROW himoya bilan xavfsiz bitim\n"
        "  ✅ 1 daqiqada lot yaratasiz\n\n"
        "Boshlash uchun <b>ismingizni</b> yozing:"
    )

    await update.message.reply_html(msg)
    return REG_FULLNAME


async def dokon_fullname(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive full name → ask phone"""
    name = update.message.text.strip()
    if len(name) < 2:
        await update.message.reply_text("❌ Iltimos, ismingizni to'g'ri yozing (kamida 2 belgi):")
        return REG_FULLNAME

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["dokon_flow"]["name"] = name[:100]

    await update.message.reply_html(
        f"✅ Ism: <b>{name[:50]}</b>\n\n"
        "📞 <b>Telefon raqamingizni yozing</b>\n\n"
        "Misol: <code>+998901234567</code>\n"
        "28+ xonali bo'lsin."
    )
    return REG_PHONE


async def dokon_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive phone → ask role"""
    phone = update.message.text.strip()
    # Simple validation
    if not phone.startswith("+") or len(phone) < 10:
        await update.message.reply_text(
            "❌ Telefon raqam noto'g'ri. + bilan boshlanib, kamida 10 raqam bo'lsin.\n"
            "Misol: <code>+998901234567</code>"
        )
        return REG_PHONE

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["dokon_flow"]["phone"] = phone

    keyboard = [
        [InlineKeyboardButton("🏪 Sotuvchi", callback_data="dokon_role_sotuvchi")],
        [InlineKeyboardButton("🛍️ Xaridor", callback_data="dokon_role_xaridor")],
        [InlineKeyboardButton("🤝 Ikkalasi", callback_data="dokon_role_ikkalasi")],
    ]

    await update.message.reply_html(
        "✅ Telefon qabul qilindi!\n\n"
        "👤 <b>Kim bo'lib qo'shilasiz?</b>\n\n"
        "  🏪 <b>Sotuvchi</b> — O'z mahsulotlaringizni sotasiz\n"
        "  🛍️ <b>Xaridor</b> — Deadstock xarid qilasiz\n"
        "  🤝 <b>Ikkalasi</b> — Sotasiz va xarid qilasiz",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return REG_ROLE


async def dokon_role(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive role → confirm registration"""
    query = update.callback_query
    await query.answer()

    role = query.data.replace("dokon_role_", "")
    if role not in ("sotuvchi", "xaridor", "ikkalasi"):
        await query.edit_message_text("❌ Noto'g'ri tanlov. Qaytadan:")
        return REG_ROLE

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["dokon_flow"]["role"] = role
    session.data["dokon_flow"]["username"] = update.effective_user.username or ""

    data = session.data["dokon_flow"]

    role_labels = {"sotuvchi": "🏪 Sotuvchi", "xaridor": "🛍️ Xaridor", "ikkalasi": "🤝 Ikkalasi"}

    msg = (
        "📋 <b>Ma'lumotlaringizni tekshiring:</b>\n\n"
        f"  👤 Ism: <b>{data['name'][:50]}</b>\n"
        f"  📞 Telefon: <b>{data['phone']}</b>\n"
        f"  🆔 Telegram: @{data['username'] or '—'}\n"
        f"  🏪 Rol: <b>{role_labels.get(role, role)}</b>\n\n"
        "Tasdiqlaysizmi?"
    )

    keyboard = [
        [InlineKeyboardButton("✅ Tasdiqlash", callback_data="dokon_confirm_yes")],
        [InlineKeyboardButton("❌ Bekor qilish", callback_data="dokon_confirm_no")],
    ]
    await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))
    return REG_CONFIRM


async def dokon_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Confirm registration → save to DB → ask to create first lot"""
    query = update.callback_query
    await query.answer()

    if query.data == "dokon_confirm_no":
        await query.edit_message_text(
            "❌ Ro'yxatdan o'tish bekor qilindi.\n\n"
            "Qayta boshlash: /dokon\n"
            "Bosh sahifa: /start",
        )
        return ConversationHandler.END

    if query.data != "dokon_confirm_yes":
        return REG_CONFIRM

    user = update.effective_user
    user_id = user.id
    session = session_manager.get_or_create(user_id)
    data = session.data.get("dokon_flow", {})

    if not data.get("name") or not data.get("role"):
        await query.edit_message_text("😔 Xatolik: ma'lumotlar to'liq emas. /dokon ni qayta boshlang.")
        return ConversationHandler.END

    db = SessionLocal()
    try:
        new_user = User(
            id=user_id,
            username=data.get("username", user.username or ""),
            phone=data.get("phone", ""),
            name=data["name"],
            role=data["role"],
            rating=0.0,
            lang=context.user_data.get("lang", "uz"),
        )
        db.add(new_user)
        db.commit()

        session.is_authenticated = True
        session.role = data["role"]
        session.name = data["name"]
        session.state = "idle"
        session.data.pop("dokon_flow", None)

        # Ask if user wants to create first lot now
        await query.edit_message_text(
            f"✅ <b>Muvaffaqiyatli ro'yxatdan o'tdingiz!</b>\n\n"
            f"  👤 {data['name']}\n"
            f"  🏪 Rol: {data['role']}\n\n"
            f"<b>Birinchi lotingizni yaratamizmi?</b>\n\n"
            f"Bu soddalashtirilgan jarayon — atigi <b>4 qadam</b> 👇",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("✅ Ha, lot yarataman", callback_data="simplot_yes")],
                [InlineKeyboardButton("⏭️ Keyinroq", callback_data="simplot_no")],
            ]),
            disable_web_page_preview=True,
        )
        return SIMPLOT_START

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Dokon registration error: {e}", exc_info=True)
        await query.edit_message_text(
            "😔 Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.\n\n"
            "/dokon ni qayta boshlang."
        )
        return ConversationHandler.END
    finally:
        db.close()


# ══════════════════════════════════════════════
# Simplified Lot Creation (after dokon registration)
# ══════════════════════════════════════════════

VALID_CATEGORIES = {"smartfon", "notebook", "tv", "audio", "aksesuar", "kiyim"}


async def simplot_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ask if user wants to create a lot → yes/no"""
    query = update.callback_query
    await query.answer()

    if query.data == "simplot_no":
        await query.edit_message_text(
            f"✅ Ro'yxatdan o'tish yakunlandi!\n\n"
            f"Do'kon menyusidagi tugmalardan foydalaning.\n\n"
            f"<b>⚠️ Esingizda bo'lsin:</b>\n"
            f"  • DeLiKet'da <b>0% komissiya</b>\n"
            f"  • Uzum'da 15-25% to'laysiz\n"
            f"  • ESCROW himoya — xavfsiz bitim",
            reply_markup=dokon_main_menu_keyboard(),
            disable_web_page_preview=True,
        )
        return ConversationHandler.END

    if query.data != "simplot_yes":
        return SIMPLOT_START

    # Start simplified lot creation
    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["simplot"] = {}

    await query.edit_message_text(
        "<b>🆕 Soddalashtirilgan lot yaratish</b>\n\n"
        "<b>1/5: Kategoriya tanlang</b>\n\n"
        "Mahsulotingiz qaysi turga kiradi?",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("📱 Smartfon", callback_data="simplot_cat_smartfon")],
            [InlineKeyboardButton("💻 Notebook", callback_data="simplot_cat_notebook")],
            [InlineKeyboardButton("📺 TV & Video", callback_data="simplot_cat_tv")],
            [InlineKeyboardButton("🎧 Audio", callback_data="simplot_cat_audio")],
            [InlineKeyboardButton("🔌 Aksessuarlar", callback_data="simplot_cat_aksesuar")],
            [InlineKeyboardButton("👕 Kiyim", callback_data="simplot_cat_kiyim")],
        ])
    )
    return SIMPLOT_CATEGORY


async def simplot_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Category selected → ask title + price + quantity"""
    query = update.callback_query
    await query.answer()

    cat = query.data.replace("simplot_cat_", "")
    if cat not in VALID_CATEGORIES:
        await query.edit_message_text(
            "❌ Noto'g'ri kategoriya. Qaytadan tanlang:",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("📱 Smartfon", callback_data="simplot_cat_smartfon")],
                [InlineKeyboardButton("💻 Notebook", callback_data="simplot_cat_notebook")],
                [InlineKeyboardButton("📺 TV & Video", callback_data="simplot_cat_tv")],
                [InlineKeyboardButton("🎧 Audio", callback_data="simplot_cat_audio")],
                [InlineKeyboardButton("🔌 Aksessuarlar", callback_data="simplot_cat_aksesuar")],
                [InlineKeyboardButton("👕 Kiyim", callback_data="simplot_cat_kiyim")],
            ])
        )
        return SIMPLOT_CATEGORY

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["simplot"]["category"] = cat

    cat_emoji = {"smartfon": "📱", "notebook": "💻", "tv": "📺", "audio": "🎧", "aksesuar": "🔌", "kiyim": "👕"}
    cat_name = {"smartfon": "Smartfonlar", "notebook": "Notebooklar", "tv": "TV & Video", "audio": "Audio", "aksesuar": "Aksessuarlar", "kiyim": "Kiyim"}

    await query.edit_message_text(
        f"✅ Kategoriya: <b>{cat_emoji.get(cat, '')} {cat_name.get(cat, cat)}</b>\n\n"
        "<b>2/5: Mahsulot ma'lumotlari</b>\n\n"
        "Quyidagi formatda yozing (bir qatorda):\n\n"
        "<code>Nomi / narx / soni</code>\n\n"
        "<b>Misol:</b>\n"
        "<code>iPhone 14 Pro 256GB / 7500000 / 5</code>\n\n"
        "📛 Nomi — mahsulot to'liq nomi\n"
        "💰 Narx — dona uchun so'mda (raqam)\n"
        "📦 Soni — nechta dona (butun son)"
    )
    return SIMPLOT_DETAILS


async def simplot_details(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Parse name/price/quantity → ask grade"""
    text = update.message.text.strip()

    # Try to parse: format "Nomi / narx / soni"
    parts = [p.strip() for p in text.split("/")]

    if len(parts) < 3:
        await update.message.reply_text(
            "❌ Format noto'g'ri. Quyidagicha yozing:\n\n"
            "<code>Nomi / narx / soni</code>\n\n"
            "<b>Misol:</b> <code>iPhone 14 Pro 256GB / 7500000 / 5</code>"
        )
        return SIMPLOT_DETAILS

    title = parts[0].strip()
    if len(title) < 3:
        await update.message.reply_text(
            "❌ Nomi juda qisqa (kamida 3 belgi). Qaytadan yozing."
        )
        return SIMPLOT_DETAILS
    if len(title) > 100:
        await update.message.reply_text(
            "❌ Nomi juda uzun (maksimal 100 belgi). Qaytadan yozing."
        )
        return SIMPLOT_DETAILS

    # Parse price
    price_str = parts[1].strip().replace(" ", "").replace(",", "")
    try:
        price = float(price_str)
    except ValueError:
        await update.message.reply_text(
            "❌ Narx noto'g'ri. Raqam yozing.\n"
            "Misol: <code>iPhone 14 Pro / 7500000 / 5</code>"
        )
        return SIMPLOT_DETAILS

    if price <= 0:
        await update.message.reply_text("❌ Narx 0 dan katta bo'lishi kerak.")
        return SIMPLOT_DETAILS
    if price > 1_000_000_000:
        await update.message.reply_text("❌ Narx juda katta (maksimal 1 mlrd so'm).")
        return SIMPLOT_DETAILS

    # Parse quantity
    qty_str = parts[2].strip().replace(" ", "")
    try:
        quantity = int(qty_str)
    except ValueError:
        await update.message.reply_text(
            "❌ Soni noto'g'ri. Butun son yozing.\n"
            "Misol: <code>iPhone 14 Pro / 7500000 / 5</code>"
        )
        return SIMPLOT_DETAILS

    if quantity <= 0:
        await update.message.reply_text("❌ Soni 0 dan katta bo'lishi kerak.")
        return SIMPLOT_DETAILS
    if quantity > 100_000:
        await update.message.reply_text("❌ Juda ko'p (maksimal 100 000 dona).")
        return SIMPLOT_DETAILS

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["simplot"]["title"] = title
    session.data["simplot"]["price"] = price
    session.data["simplot"]["quantity"] = quantity

    await update.message.reply_text(
        f"✅ <b>{title[:50]}</b> | {price:,.0f} so'm | {quantity} dona\n\n"
        "<b>3/5: Mahsulot rasmi (ixtiyoriy)</b>\n\n"
        "📸 Mahsulotingizning rasmini yuboring.\n"
        "Bu xaridorlarga mahsulotni ko'rishga yordam beradi.\n\n"
        "<i>Agar rasm bo'lmasa — tugmani bosing ⏭️</i>",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("⏭️ Rasmsiz davom etish", callback_data="simplot_skip_image")],
        ])
    )
    return SIMPLOT_IMAGE


async def simplot_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive photo (optional) → ask grade"""
    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)

    # Check if it's a photo message
    if update.message and update.message.photo:
        photo = update.message.photo[-1]
        session.data["simplot"]["image_file_id"] = photo.file_id
        await update.message.reply_text(
            "✅ Rasm qabul qilindi! 📸\n\n"
            "<b>4/5: Mahsulot holati (Grade)</b>\n\n"
            "  🟢 <b>A</b> — Yangi, ochilmagan\n"
            "  🟡 <b>B</b> — Ochilgan, ishlatilgan\n"
            "  🔴 <b>C</b> — Nuqsonli, ehtiyot qism\n\n"
            "Holatni tanlang:",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🟢 A — Yangi", callback_data="simplot_grade_A")],
                [InlineKeyboardButton("🟡 B — Ishla", callback_data="simplot_grade_B")],
                [InlineKeyboardButton("🔴 C — Nuqson", callback_data="simplot_grade_C")],
            ])
        )
        return SIMPLOT_GRADE

    # If it's text that's not a command (fallback)
    await update.message.reply_text(
        "❌ Iltimos, rasm yuboring yoki ⏭️ <b>Rasmsiz davom etish</b> tugmasini bosing.",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("⏭️ Rasmsiz davom etish", callback_data="simplot_skip_image")],
        ])
    )
    return SIMPLOT_IMAGE


async def simplot_skip_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Skip photo → ask grade"""
    query = update.callback_query
    await query.answer()

    await query.edit_message_text(
        "⏭️ Rasmsiz davom etamiz...\n\n"
        "<b>4/5: Mahsulot holati (Grade)</b>\n\n"
        "  🟢 <b>A</b> — Yangi, ochilmagan\n"
        "  🟡 <b>B</b> — Ochilgan, ishlatilgan\n"
        "  🔴 <b>C</b> — Nuqsonli, ehtiyot qism\n\n"
        "Holatni tanlang:",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🟢 A — Yangi", callback_data="simplot_grade_A")],
            [InlineKeyboardButton("🟡 B — Ishla", callback_data="simplot_grade_B")],
            [InlineKeyboardButton("🔴 C — Nuqson", callback_data="simplot_grade_C")],
        ])
    )
    return SIMPLOT_GRADE


async def simplot_grade(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Grade selected → confirm lot"""
    query = update.callback_query
    await query.answer()

    grade = query.data.replace("simplot_grade_", "")
    if grade not in ("A", "B", "C"):
        await query.edit_message_text(
            "❌ Noto'g'ri tanlov. Qaytadan:",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🟢 A — Yangi", callback_data="simplot_grade_A")],
                [InlineKeyboardButton("🟡 B — Ishla", callback_data="simplot_grade_B")],
                [InlineKeyboardButton("🔴 C — Nuqson", callback_data="simplot_grade_C")],
            ])
        )
        return SIMPLOT_GRADE

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["simplot"]["grade"] = grade

    data = session.data["simplot"]
    cat_emoji = {"smartfon": "📱", "notebook": "💻", "tv": "📺", "audio": "🎧", "aksesuar": "🔌", "kiyim": "👕"}
    cat_name = {"smartfon": "Smartfonlar", "notebook": "Notebooklar", "tv": "TV & Video", "audio": "Audio", "aksesuar": "Aksessuarlar", "kiyim": "Kiyim"}
    grade_labels = {"A": "Yangi, ochilmagan 🟢", "B": "Ochilgan, ishlatilgan 🟡", "C": "Nuqsonli, ehtiyot qism 🔴"}
    total = data["price"] * data["quantity"]
    img_indicator = "✅ Rasm bor 📸" if data.get("image_file_id") else "⏭️ Rasmsiz"

    summary = (
        "📋 <b>Lot ma'lumotlari</b>\n\n"
        f"  {cat_emoji.get(data['category'], '')} Kategoriya: <b>{cat_name.get(data['category'], data['category'])}</b>\n"
        f"  📛 Nomi: <b>{data['title'][:60]}</b>\n"
        f"  🖼️ Rasm: <b>{img_indicator}</b>\n"
        f"  💰 Narx: <b>{data['price']:,.0f} so'm/dona</b>\n"
        f"  📦 Soni: <b>{data['quantity']:,} dona</b>\n"
        f"  💵 Jami: <b>{total:,.0f} so'm</b>\n"
        f"  🏷️ Grade: <b>{grade}</b> — {grade_labels.get(grade, '')}\n\n"
        "Tasdiqlaysizmi?"
    )

    await query.edit_message_text(
        summary,
        reply_markup=InlineKeyboardMarkup([
            [
                InlineKeyboardButton("✅ Tasdiqlash", callback_data="simplot_confirm_yes"),
                InlineKeyboardButton("❌ Bekor qilish", callback_data="simplot_confirm_no"),
            ]
        ])
    )
    return SIMPLOT_CONFIRM


async def simplot_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Confirm → save lot to DB → done"""
    query = update.callback_query
    await query.answer()

    if query.data == "simplot_confirm_no":
        user_id = update.effective_user.id
        session = session_manager.get(user_id)
        if session:
            session.data.pop("simplot", None)

        await query.edit_message_text(
            f"❌ Lot bekor qilindi.\n\n"
            f"Do'kon menyusidagi tugmalardan foydalaning.",
            reply_markup=dokon_main_menu_keyboard(),
            disable_web_page_preview=True,
        )
        return ConversationHandler.END

    if query.data != "simplot_confirm_yes":
        return SIMPLOT_CONFIRM

    user = update.effective_user
    user_id = user.id
    session = session_manager.get_or_create(user_id)
    data = session.data.get("simplot", {})

    if not all(k in data for k in ("category", "title", "price", "quantity", "grade")):
        await query.edit_message_text(
            "😔 Xatolik: ma'lumotlar to'liq emas. /newlot ni ishlating."
        )
        session.data.pop("simplot", None)
        return ConversationHandler.END

    db = SessionLocal()
    try:
        lot = Lot(
            seller_id=user_id,
            category=data["category"],
            title=data["title"],
            description="",
            quantity=data["quantity"],
            price=data["price"],
            grade=data["grade"],
            image_file_id=data.get("image_file_id"),
            status="aktiv",
        )
        db.add(lot)
        db.commit()
        db.refresh(lot)

        session.data.pop("simplot", None)

        cat_emoji = {"smartfon": "📱", "notebook": "💻", "tv": "📺", "audio": "🎧", "aksesuar": "🔌", "kiyim": "👕"}
        cat_name = {"smartfon": "Smartfonlar", "notebook": "Notebooklar", "tv": "TV & Video", "audio": "Audio", "aksesuar": "Aksessuarlar", "kiyim": "Kiyim"}
        grade_e = {"A": "🟢", "B": "🟡", "C": "🔴"}

        await query.edit_message_text(
            f"✅ <b>Lot #{lot.id} yaratildi!</b>\n"
            f"{'─' * 32}\n"
            f"  {cat_emoji.get(data['category'], '')} Kategoriya: <b>{cat_name.get(data['category'], data['category'])}</b>\n"
            f"  📛 Nomi: <b>{data['title'][:55]}</b>\n"
            f"  💰 Narx: <b>{data['price']:,.0f} so'm</b>\n"
            f"  📦 Soni: <b>{data['quantity']:,} dona</b>\n"
            f"  {grade_e.get(data['grade'], '')} Grade: <b>{data['grade']}</b>\n"
            f"{'─' * 32}\n\n"
            f"<b>Yana lot yaratasizmi?</b>",
            reply_markup=InlineKeyboardMarkup([
                [
                    InlineKeyboardButton("✅ Ha, yana lot", callback_data="simplot_again_yes"),
                    InlineKeyboardButton("⏭️ Do'kon menyusi", callback_data="simplot_again_no"),
                ]
            ]),
            disable_web_page_preview=True,
        )

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Simplot creation error: {e}", exc_info=True)
        await query.edit_message_text(
            "😔 Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.\n"
            "/newlot ni ishlating."
        )
        return ConversationHandler.END
    finally:
        db.close()

    return SIMPLOT_AGAIN


async def simplot_again(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle 'Yana lot yaratasizmi?' response"""
    query = update.callback_query
    await query.answer()

    if query.data == "simplot_again_yes":
        # Clear old data and start a new lot from category selection
        user_id = update.effective_user.id
        session = session_manager.get_or_create(user_id)
        session.data["simplot"] = {}

        await query.edit_message_text(
            "<b>🆕 Yana lot yaratish</b>\n\n"
            "<b>1/5: Kategoriya tanlang</b>\n\n"
            "Mahsulotingiz qaysi turga kiradi?",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("📱 Smartfon", callback_data="simplot_cat_smartfon")],
                [InlineKeyboardButton("💻 Notebook", callback_data="simplot_cat_notebook")],
                [InlineKeyboardButton("📺 TV & Video", callback_data="simplot_cat_tv")],
                [InlineKeyboardButton("🎧 Audio", callback_data="simplot_cat_audio")],
                [InlineKeyboardButton("🔌 Aksessuarlar", callback_data="simplot_cat_aksesuar")],
                [InlineKeyboardButton("👕 Kiyim", callback_data="simplot_cat_kiyim")],
            ])
        )
        return SIMPLOT_CATEGORY

    # simplot_again_no — go to dokon main menu
    await query.edit_message_text(
        f"✅ Lot yaratish yakunlandi.\n\n"
        f"Do'kon menyusidagi tugmalardan foydalaning.\n\n"
        f"<b>⚠️ Esingizda bo'lsin:</b>\n"
        f"  • DeLiKet'da <b>0% komissiya</b>\n"
        f"  • Uzum'da 15-25% to'laysiz\n"
        f"  • ESCROW himoya — xavfsiz bitim\n\n"
        f"🌐 <a href='{WEB_URL}/dokonlar'>Do'konlar web sahifasi</a>",
        reply_markup=dokon_main_menu_keyboard(),
        disable_web_page_preview=True,
    )
    return ConversationHandler.END


async def simplot_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel simplified lot creation"""
    user_id = update.effective_user.id
    session = session_manager.get(user_id)
    if session:
        session.data.pop("simplot", None)

    await update.message.reply_text(
        f"❌ Lot yaratish bekor qilindi.\n\n"
        f"Do'kon menyusidagi tugmalardan foydalaning.",
        reply_markup=dokon_main_menu_keyboard(),
        disable_web_page_preview=True,
    )
    return ConversationHandler.END


async def simplot_timeout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Timeout handler for simplified lot creation"""
    user_id = update.effective_user.id
    session = session_manager.get(user_id)
    if session:
        session.data.pop("simplot", None)

    await update.message.reply_text(
        "⏳ Vaqt tugadi. Lot yaratish bekor qilindi.\n\n"
        "Qayta boshlash: /dokon",
        reply_markup=dokon_main_menu_keyboard(),
    )
    return ConversationHandler.END


async def dokon_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel dokon onboarding"""
    user_id = update.effective_user.id
    session = session_manager.get(user_id)
    if session:
        session.data.pop("dokon_flow", None)

    await update.message.reply_text(
        "❌ Ro'yxatdan o'tish bekor qilindi.\n\n"
        "Qayta boshlash: /dokon"
    )
    return ConversationHandler.END


async def dokon_timeout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Timeout handler"""
    user_id = update.effective_user.id
    session = session_manager.get(user_id)
    if session:
        session.data.pop("dokon_flow", None)

    await update.message.reply_text(
        "⏳ Vaqt tugadi. Ro'yxatdan o'tish bekor qilindi.\n\n"
        "Qayta boshlash: /dokon"
    )
    return ConversationHandler.END


# ══════════════════════════════════════════════
# Dokon mode — Reply Keyboard Text Handler
# ══════════════════════════════════════════════

# Button texts for the dokon main menu keyboard
DOKON_MENU_BUTTONS = {
    "📦 Lot yaratish",
    "📋 Lotlarim",
    "🏪 Do'konlar",
    "❓ Yordam",
}


async def dokon_menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle dokon main menu keyboard button presses"""
    text = update.message.text.strip()

    if text == "📦 Lot yaratish":
        # Ask user to use /newlot command
        await update.message.reply_html(
            "📦 <b>Yangi lot yaratish</b>\n\n"
            "Iltimos, <b>/newlot</b> buyrug'ini yozing yoki quyidagi tugmani bosing.\n\n"
            "Bu sizga to'liq lot yaratish jarayonidan o'tishga yordam beradi.",
            reply_markup=dokon_main_menu_keyboard(),
        )

    elif text == "📋 Lotlarim":
        # Show my lots — redirect to /mylots
        from bot.handlers.lot import my_lots_handler
        return await my_lots_handler(update, context)

    elif text == "🏪 Do'konlar":
        # Show dokon info page
        await update.message.reply_html(
            f"🏪 <b>DeLiKet Do'konlar</b>\n\n"
            f"Do'konlar va lotlar bilan tanishish uchun web sahifaga o'ting:\n\n"
            f"🌐 <a href='{WEB_URL}/dokonlar'>Do'konlar sahifasi</a>\n\n"
            f"📊 <b>Statistika:</b>\n"
            f"  • 0% komissiya\n"
            f"  • ESCROW himoya\n"
            f"  • Partiyaviy savdo\n\n"
            f"Yangi lot yaratish uchun <b>📦 Lot yaratish</b> tugmasini bosing.",
            reply_markup=dokon_main_menu_keyboard(),
            disable_web_page_preview=True,
        )

    elif text == "❓ Yordam":
        # Show help info
        await update.message.reply_html(
            "❓ <b>DeLiKet Do'kon — Yordam</b>\n\n"
            "<b>Mavjud buyruqlar:</b>\n\n"
            "📦 <b>Lot yaratish</b> — yangi lot qo'shish (soddalashtirilgan)\n"
            "📋 <b>Lotlarim</b> — lotlaringiz ro'yxati\n"
            "🏪 <b>Do'konlar</b> — do'konlar web sahifasi\n"
            "❓ <b>Yordam</b> — ushbu yordam\n\n"
            "<b>Boshqa buyruqlar:</b>\n"
            "  /newlot — lot yaratish\n"
            "  /mylots — lotlarim\n"
            "  /search — qidirish\n"
            "  /mybids — takliflarim\n"
            "  /profile — profil\n"
            "  /dokon — do'kon rejimi\n"
            "  /dokoninfo — ma'lumot\n\n"
            "💡 <b>Maslahat:</b> 0% komissiya bilan soting!",
            reply_markup=dokon_main_menu_keyboard(),
        )


# ══════════════════════════════════════════════
# /dokoninfo — B2B ma'lumot komandasi
# ══════════════════════════════════════════════

async def dokon_info(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show B2B info for Fleshka sellers"""
    await update.message.reply_html(
        "🏪 <b>DeLiKet — Do'kon sotuvchilari uchun!</b>\n\n"
        "<b>Nega aynan DeLiKet?</b>\n\n"
        "💰 <b>0% komissiya</b>\n"
        "  Uzum'da 15-25% to'laysiz. DeLiKet'da nol.\n"
        "  Barcha daromad sizniki.\n\n"
        "📦 <b>Partiyaviy savdo</b>\n"
        "  10 dona yoki 1000 dona — farqi yo'q.\n"
        "  Birma-bir emas, partiyalab soting.\n\n"
        "🛡️ <b>ESCROW himoya</b>\n"
        "  Xaridor to'laydi, siz jo'natasiz.\n"
        "  Mahsulot yetib borgach pul tushadi.\n\n"
        "⚡ <b>1 daqiqada lot yarating</b>\n"
        "  Telegram bot orqali — tez va qulay.\n\n"
        "🌐 <b>Web platforma:</b>\n"
        f"  <a href='{WEB_URL}/dokonlar'>Do'konlar sahifasi</a>\n"
        f"  <a href='{WEB_URL}/seller-onboarding'>Sotuvchi qo'llanma</a>\n\n"
        "/dokon — ro'yxatdan o'tish\n"
        "/newlot — lot yaratish",
        disable_web_page_preview=True,
    )


# ══════════════════════════════════════════════
# Conversation handler definition
# ══════════════════════════════════════════════

dokon_conv = ConversationHandler(
    entry_points=[CommandHandler("dokon", dokon_start)],
    states={
        REG_FULLNAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, dokon_fullname)],
        REG_PHONE: [MessageHandler(filters.TEXT & ~filters.COMMAND, dokon_phone)],
        REG_ROLE: [CallbackQueryHandler(dokon_role, pattern="^dokon_role_")],
        REG_CONFIRM: [CallbackQueryHandler(dokon_confirm, pattern="^dokon_confirm_")],
        # Simplified lot creation states
        SIMPLOT_START: [CallbackQueryHandler(simplot_start, pattern="^simplot_yes$|^simplot_no$")],
        SIMPLOT_CATEGORY: [CallbackQueryHandler(simplot_category, pattern="^simplot_cat_")],
        SIMPLOT_DETAILS: [MessageHandler(filters.TEXT & ~filters.COMMAND, simplot_details)],
        SIMPLOT_IMAGE: [
            MessageHandler(filters.PHOTO, simplot_image),
            CallbackQueryHandler(simplot_skip_image, pattern="^simplot_skip_image$"),
            MessageHandler(filters.TEXT & ~filters.COMMAND, simplot_image),
        ],
        SIMPLOT_GRADE: [CallbackQueryHandler(simplot_grade, pattern="^simplot_grade_")],
        SIMPLOT_CONFIRM: [CallbackQueryHandler(simplot_confirm, pattern="^simplot_confirm_")],
        SIMPLOT_AGAIN: [CallbackQueryHandler(simplot_again, pattern="^simplot_again_")],
    },
    fallbacks=[
        CommandHandler("cancel", dokon_cancel),
        CommandHandler("start", dokon_timeout),
    ],
    name="dokon_onboarding",
)

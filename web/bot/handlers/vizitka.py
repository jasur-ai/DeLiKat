"""
DeLiKet Bot — /vizitka Business Card Generator
Bot orqali vizitka yaratish: do'kon nomi, ism, telefon, rol, rang tanlash
QR kod bilan birga chiroyli vizitka matni yuboriladi
"""

import logging
import urllib.parse
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler, CommandHandler, MessageHandler, CallbackQueryHandler, filters

logger = logging.getLogger(__name__)

# ── Conversation states ──
VIZITKA_SHOP, VIZITKA_NAME, VIZITKA_PHONE, VIZITKA_ROLE, VIZITKA_TEMPLATE = range(5)

# ── Role options ──
ROLE_OPTIONS = {
    "sotuvchi": "🏪 Sotuvchi",
    "xaridor": "🛍️ Xaridor",
    "ikkalasi": "🤝 Ikkalasi",
}

ROLE_OPTIONS_RU = {
    "sotuvchi": "🏪 Продавец",
    "xaridor": "🛍️ Покупатель",
    "ikkalasi": "🤝 Оба",
}

ROLE_OPTIONS_EN = {
    "sotuvchi": "🏪 Seller",
    "xaridor": "🛍️ Buyer",
    "ikkalasi": "🤝 Both",
}

# ── Template options ──
TEMPLATE_OPTIONS = {
    "dark": "🌑 To'q",
    "blue": "🔵 Ko'k",
    "green": "🟢 Yashil",
    "light": "⬜ Oq",
}

TEMPLATE_OPTIONS_RU = {
    "dark": "🌑 Тёмный",
    "blue": "🔵 Синий",
    "green": "🟢 Зелёный",
    "light": "⬜ Светлый",
}

TEMPLATE_OPTIONS_EN = {
    "dark": "🌑 Dark",
    "blue": "🔵 Blue",
    "green": "🟢 Green",
    "light": "⬜ Light",
}

WEB_URL = "https://delikat.vercel.app"


def detect_lang(context) -> str:
    """Detect user language from context."""
    return context.user_data.get("lang", "uz")


# ══════════════════════════════════════════════
# /vizitka — Start
# ══════════════════════════════════════════════

async def vizitka_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Entry point: /vizitka — start business card creation"""
    lang = detect_lang(context)

    if lang == "ru":
        msg = (
            "🪪 <b>Генератор визиток DeLiKet</b>\n\n"
            "Создайте личную визитку для вашего магазина!\n"
            "QR-код будет привязан к вашему магазину. 👇\n\n"
            "<b>Введите название магазина:</b>"
        )
    elif lang == "en":
        msg = (
            "🪪 <b>DeLiKet Business Card Generator</b>\n\n"
            "Create a personal business card for your shop!\n"
            "QR code will be linked to your shop. 👇\n\n"
            "<b>Enter your shop name:</b>"
        )
    else:
        msg = (
            "🪪 <b>DeLiKet Vizitka Generator</b>\n\n"
            "Do'koningiz uchun shaxsiy vizitka yarating!\n"
            "QR kod do'koningizga bog'lanadi. 👇\n\n"
            "<b>Do'kon nomini yozing:</b>"
        )

    await update.message.reply_html(msg)
    return VIZITKA_SHOP


# ══════════════════════════════════════════════
# Step 1: Shop Name
# ══════════════════════════════════════════════

async def vizitka_shop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive shop name → ask seller name"""
    shop = update.message.text.strip()
    if len(shop) < 2:
        lang = detect_lang(context)
        err = "❌ Do'kon nomi juda qisqa. Kamida 2 belgi kiriting." if lang == "uz" else \
              "❌ Название магазина слишком короткое. Введите минимум 2 символа." if lang == "ru" else \
              "❌ Shop name is too short. Enter at least 2 characters."
        await update.message.reply_text(err)
        return VIZITKA_SHOP
    if len(shop) > 40:
        lang = detect_lang(context)
        err = "❌ Do'kon nomi juda uzun. Maksimal 40 belgi." if lang == "uz" else \
              "❌ Название слишком длинное. Максимум 40 символов." if lang == "ru" else \
              "❌ Name too long. Maximum 40 characters."
        await update.message.reply_text(err)
        return VIZITKA_SHOP

    context.user_data["vizitka_shop"] = shop[:40]

    lang = detect_lang(context)
    prompt = "✅ Do'kon nomi qabul qilindi!\\n\\n<b>Sotuvchi ismini yozing:</b>" if lang == "uz" else \
             "✅ Название магазина принято!\\n\\n<b>Введите имя продавца:</b>" if lang == "ru" else \
             "✅ Shop name saved!\\n\\n<b>Enter your seller name:</b>"
    await update.message.reply_html(prompt)
    return VIZITKA_NAME


# ══════════════════════════════════════════════
# Step 2: Seller Name
# ══════════════════════════════════════════════

async def vizitka_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive seller name → ask phone"""
    name = update.message.text.strip()
    if len(name) < 2:
        lang = detect_lang(context)
        err = "❌ Ism juda qisqa. Kamida 2 belgi." if lang == "uz" else \
              "❌ Имя слишком короткое. Минимум 2 символа." if lang == "ru" else \
              "❌ Name is too short. Minimum 2 characters."
        await update.message.reply_text(err)
        return VIZITKA_NAME
    if len(name) > 30:
        lang = detect_lang(context)
        err = "❌ Ism juda uzun. Maksimal 30 belgi." if lang == "uz" else \
              "❌ Имя слишком длинное. Максимум 30 символов." if lang == "ru" else \
              "❌ Name too long. Maximum 30 characters."
        await update.message.reply_text(err)
        return VIZITKA_NAME

    context.user_data["vizitka_name"] = name[:30]

    lang = detect_lang(context)
    prompt = "✅ Ism qabul qilindi!\\n\\n<b>Telefon raqamingizni yozing:</b>\\n\\nMisol: <code>+998 90 123 45 67</code>" if lang == "uz" else \
             "✅ Имя принято!\\n\\n<b>Введите номер телефона:</b>\\n\\nПример: <code>+998 90 123 45 67</code>" if lang == "ru" else \
             "✅ Name saved!\\n\\n<b>Enter your phone number:</b>\\n\\nExample: <code>+998 90 123 45 67</code>"

    await update.message.reply_html(prompt)
    return VIZITKA_PHONE


# ══════════════════════════════════════════════
# Step 3: Phone
# ══════════════════════════════════════════════

async def vizitka_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive phone → ask role"""
    phone = update.message.text.strip()
    if len(phone) < 5:
        lang = detect_lang(context)
        err = "❌ Telefon raqam noto'g'ri. Kamida 5 belgi." if lang == "uz" else \
              "❌ Неверный номер телефона. Минимум 5 символов." if lang == "ru" else \
              "❌ Invalid phone number. Minimum 5 characters."
        await update.message.reply_text(err)
        return VIZITKA_PHONE
    if len(phone) > 25:
        lang = detect_lang(context)
        err = "❌ Telefon raqam juda uzun. Maksimal 25 belgi." if lang == "uz" else \
              "❌ Номер слишком длинный. Максимум 25 символов." if lang == "ru" else \
              "❌ Phone number too long. Maximum 25 characters."
        await update.message.reply_text(err)
        return VIZITKA_PHONE

    context.user_data["vizitka_phone"] = phone[:25]

    lang = detect_lang(context)
    roles = ROLE_OPTIONS_RU if lang == "ru" else ROLE_OPTIONS_EN if lang == "en" else ROLE_OPTIONS
    title = "Rolni tanlang:" if lang == "uz" else "Выберите роль:" if lang == "ru" else "Select your role:"

    keyboard = []
    for key, label in roles.items():
        keyboard.append([InlineKeyboardButton(label, callback_data=f"viz_role_{key}")])

    await update.message.reply_html(
        f"✅ Telefon qabul qilindi!\\n\\n<b>{title}</b>",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return VIZITKA_ROLE


# ══════════════════════════════════════════════
# Step 4: Role (callback)
# ══════════════════════════════════════════════

async def vizitka_role(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive role via callback → ask template color"""
    query = update.callback_query
    await query.answer()

    role = query.data.replace("viz_role_", "")
    if role not in ("sotuvchi", "xaridor", "ikkalasi"):
        lang = detect_lang(context)
        err = "❌ Noto'g'ri tanlov. Qaytadan urinib ko'ring." if lang == "uz" else \
              "❌ Неверный выбор. Попробуйте снова." if lang == "ru" else \
              "❌ Invalid choice. Try again."
        await query.edit_message_text(err)
        return VIZITKA_ROLE

    context.user_data["vizitka_role"] = role

    lang = detect_lang(context)
    templates = TEMPLATE_OPTIONS_RU if lang == "ru" else TEMPLATE_OPTIONS_EN if lang == "en" else TEMPLATE_OPTIONS
    title = "Vizitka rangini tanlang:" if lang == "uz" else "Выберите цвет визитки:" if lang == "ru" else "Choose card color:"

    keyboard = []
    for key, label in templates.items():
        keyboard.append([InlineKeyboardButton(label, callback_data=f"viz_temp_{key}")])

    await query.edit_message_text(
        f"✅ Rol qabul qilindi!\\n\\n<b>{title}</b>",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )
    return VIZITKA_TEMPLATE


# ══════════════════════════════════════════════
# Step 5: Template (callback) → Generate Card
# ══════════════════════════════════════════════

async def vizitka_template(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive template color → generate and send the business card"""
    query = update.callback_query
    await query.answer()

    template = query.data.replace("viz_temp_", "")
    if template not in ("dark", "blue", "green", "light"):
        template = "dark"

    context.user_data["vizitka_template"] = template

    # Gather all data
    shop = context.user_data.get("vizitka_shop", "Do'kon")
    name = context.user_data.get("vizitka_name", "Sotuvchi")
    phone = context.user_data.get("vizitka_phone", "+998 XX XXX XX XX")
    role = context.user_data.get("vizitka_role", "ikkalasi")
    lang = detect_lang(context)

    # Role labels
    role_labels_uz = {"sotuvchi": "🏪 Sotuvchi", "xaridor": "🛍️ Xaridor", "ikkalasi": "🤝 Ikkalasi"}
    role_labels_ru = {"sotuvchi": "🏪 Продавец", "xaridor": "🛍️ Покупатель", "ikkalasi": "🤝 Оба"}
    role_labels_en = {"sotuvchi": "🏪 Seller", "xaridor": "🛍️ Buyer", "ikkalasi": "🤝 Both"}
    role_labels = role_labels_ru if lang == "ru" else role_labels_en if lang == "en" else role_labels_uz
    role_label = role_labels.get(role, "🤝 Ikkalasi")

    # Template colors (as emoji indicators for the card text)
    template_names_uz = {"dark": "🌑 To'q", "blue": "🔵 Ko'k", "green": "🟢 Yashil", "light": "⬜ Oq"}
    template_names_ru = {"dark": "🌑 Тёмный", "blue": "🔵 Синий", "green": "🟢 Зелёный", "light": "⬜ Светлый"}
    template_names_en = {"dark": "🌑 Dark", "blue": "🔵 Blue", "green": "🟢 Green", "light": "⬜ Light"}
    template_names = template_names_ru if lang == "ru" else template_names_en if lang == "en" else template_names_uz
    template_label = template_names.get(template, "🌑 To'q")

    # Footer messages
    footer_uz = "0% komissiya ⚡"
    footer_ru = "0% комиссия ⚡"
    footer_en = "0% commission ⚡"
    footer = footer_ru if lang == "ru" else footer_en if lang == "en" else footer_uz

    # Title
    title_uz = "🪪 Vizitka tayyor!"
    title_ru = "🪪 Визитка готова!"
    title_en = "🪪 Card is ready!"
    card_title = title_ru if lang == "ru" else title_en if lang == "en" else title_uz

    # Build the card text (like a monospace-style card)
    card_text = (
        f"<b>{card_title}</b>\\n"
        f"{'▔' * 28}\\n"
        f"\\n"
        f"  👤 <b>{name}</b>\\n"
        f"  🏪 {shop}\\n"
        f"  {role_label}\\n"
        f"  🎨 {template_label}\\n"
        f"\\n"
        f"{'─' * 28}\\n"
        f"  📞 {phone}\\n"
        f"  🤖 @DeLiKatbot\\n"
        f"  🌐 {WEB_URL}\\n"
        f"  {footer}\\n"
        f"{'▁' * 28}\\n"
        f"\\n"
        f"📸 <b>QR kod:</b>"
    )

    # Generate QR code URL
    bot_url = f"https://t.me/DeLiKatbot?start=shop_{urllib.parse.quote(shop)}"
    qr_img_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={urllib.parse.quote(bot_url)}"

    # Build the "open web" button
    web_url = f"{WEB_URL}/vizitka"
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("🌐 Vizitka Generator", url=web_url)],
        [InlineKeyboardButton("📱 Botda start", url=bot_url)],
    ])

    # Edit the template selection message to show the card
    await query.edit_message_text(card_text, reply_markup=keyboard)

    # Send the QR code as a photo
    try:
        await context.bot.send_photo(
            chat_id=update.effective_chat.id,
            photo=qr_img_url,
            caption=(
                f"<b>{name}</b> | {shop}\\n"
                f"{role_label} | {footer}"
            ),
            parse_mode="HTML",
            reply_markup=keyboard,
        )
    except Exception as e:
        logger.warning(f"Failed to send QR photo: {e}")
        # Fallback: just send the QR URL as text
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text=(
                f"📸 <b>QR kod:</b>\\n"
                f"<code>{bot_url}</code>\\n\\n"
                f"🌐 QR rasm: {qr_img_url}"
            ),
            parse_mode="HTML",
        )

    # Clean up session data
    for key in ["vizitka_shop", "vizitka_name", "vizitka_phone", "vizitka_role", "vizitka_template"]:
        context.user_data.pop(key, None)

    return ConversationHandler.END


# ══════════════════════════════════════════════
# Cancel handler
# ══════════════════════════════════════════════

async def vizitka_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel vizitka creation"""
    lang = detect_lang(context)
    for key in ["vizitka_shop", "vizitka_name", "vizitka_phone", "vizitka_role", "vizitka_template"]:
        context.user_data.pop(key, None)

    msg_uz = "❌ Vizitka yaratish bekor qilindi.\\n\\nQayta boshlash: /vizitka"
    msg_ru = "❌ Создание визитки отменено.\\n\\nНачать заново: /vizitka"
    msg_en = "❌ Card creation cancelled.\\n\\nStart again: /vizitka"
    msg = msg_ru if lang == "ru" else msg_en if lang == "en" else msg_uz

    await update.message.reply_html(msg)
    return ConversationHandler.END


# ══════════════════════════════════════════════
# Conversation Handler Definition
# ══════════════════════════════════════════════

vizitka_conv = ConversationHandler(
    entry_points=[CommandHandler("vizitka", vizitka_start)],
    states={
        VIZITKA_SHOP: [MessageHandler(filters.TEXT & ~filters.COMMAND, vizitka_shop)],
        VIZITKA_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, vizitka_name)],
        VIZITKA_PHONE: [MessageHandler(filters.TEXT & ~filters.COMMAND, vizitka_phone)],
        VIZITKA_ROLE: [CallbackQueryHandler(vizitka_role, pattern="^viz_role_")],
        VIZITKA_TEMPLATE: [CallbackQueryHandler(vizitka_template, pattern="^viz_temp_")],
    },
    fallbacks=[
        CommandHandler("cancel", vizitka_cancel),
        CommandHandler("vizitka", vizitka_start),
    ],
    name="vizitka",
)

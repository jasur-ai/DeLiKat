"""
DeLiKet Bot — /language command
Switch language between O'zbek, Русский, English
"""

import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from api.database import SessionLocal
from api.database.models import User
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.i18n import get_text

logger = logging.getLogger(__name__)

LANGUAGE_FLAGS = {"uz": "🇺🇿", "ru": "🇷🇺", "en": "🇺🇸"}
LANGUAGE_NAMES = {"uz": "O'zbekcha", "ru": "Русский", "en": "English"}


def language_keyboard(current_lang: str = "uz"):
    """Til tanlash keyboard"""
    keyboard = []
    for lang_code in ("uz", "ru", "en"):
        prefix = "✅ " if lang_code == current_lang else ""
        name = LANGUAGE_NAMES[lang_code]
        flag = LANGUAGE_FLAGS[lang_code]
        keyboard.append([
            InlineKeyboardButton(
                f"{prefix}{flag} {name}",
                callback_data=f"lang_{lang_code}"
            )
        ])
    keyboard.append([InlineKeyboardButton("◀️ Back", callback_data="done")])
    return InlineKeyboardMarkup(keyboard)


async def language_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Switch language"""
    user_id = update.effective_user.id
    current_lang = context.user_data.get("lang", "uz")

    await update.message.reply_text(
        "🌐 <b>Tilni tanlang / Выберите язык / Select language:</b>",
        reply_markup=language_keyboard(current_lang)
    )


async def language_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle language selection callback"""
    query = update.callback_query
    await query.answer()

    if query.data == "done":
        lang = context.user_data.get("lang", "uz")
        await query.edit_message_text(get_text(lang, "lang", "changed", parse_mode='HTML'),
            reply_markup=main_menu_keyboard()
        )
        return

    new_lang = query.data.replace("lang_", "")
    if new_lang not in ("uz", "ru", "en"):
        return

    # Save to context
    context.user_data["lang"] = new_lang

    # Save to DB
    user_id = update.effective_user.id
    try:
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.lang = new_lang
            db.commit()
        db.close()
    except Exception as e:
        logger.warning(f"Could not save language to DB: {e}")

    await query.edit_message_text(get_text(new_lang, "lang", "changed", parse_mode='HTML'),
        reply_markup=main_menu_keyboard()
    )

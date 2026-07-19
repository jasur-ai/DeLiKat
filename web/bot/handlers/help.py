"""
DeLiKet Bot — /help command
Professional guide with examples
"""

from telegram import Update
from telegram.ext import ContextTypes
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.formatting import help_full
from bot.utils.i18n import get_user_lang


async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """To'liq yordam — barcha komandalar + misollar"""
    lang = await get_user_lang(update, context)
    await update.message.reply_html(
        help_full(lang),
        reply_markup=main_menu_keyboard(lang)
    )

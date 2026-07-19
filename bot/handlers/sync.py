"""
DeLiKet Bot — Feature 18: Cross-platform Sync
/sync — Generate a 6-digit token to link Telegram with Web UI
"""

import logging
import random
import string
from datetime import datetime, timezone, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from api.database import SessionLocal
from api.database.models import User, Lot, Bid, SyncToken, Wishlist
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.decorators import auth_required
from bot.utils.formatting import SEP, price as fmt_price
import os

logger = logging.getLogger(__name__)
WEB_URL = os.getenv("WEB_URL", "https://delikat.vercel.app")


def generate_token() -> str:
    """Generate a unique 6-digit alphanumeric token"""
    chars = string.ascii_uppercase + string.digits
    # Remove confusing chars: 0/O, 1/I/L
    chars = chars.translate(str.maketrans('', '', '0O1IL'))
    return ''.join(random.choices(chars, k=6))


@auth_required
async def sync_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Generate a sync token and show instructions"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await update.message.reply_html("❌ Avval /start orqali ro'yxatdan o'ting.")
            return

        # Check for existing valid token
        existing = db.query(SyncToken).filter(
            SyncToken.user_id == user_id,
            SyncToken.is_used == False,
            SyncToken.expires_at > datetime.now(timezone.utc)
        ).first()

        if existing:
            token = existing.token
        else:
            # Generate new unique token
            while True:
                token = generate_token()
                conflict = db.query(SyncToken).filter(
                    SyncToken.token == token,
                    SyncToken.is_used == False,
                    SyncToken.expires_at > datetime.now(timezone.utc)
                ).first()
                if not conflict:
                    break

            sync_token = SyncToken(
                user_id=user_id,
                token=token,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            )
            db.add(sync_token)
            db.commit()

        # Gather account stats
        lot_count = db.query(Lot).filter(Lot.seller_id == user_id).count()
        bid_count = db.query(Bid).filter(Bid.buyer_id == user_id).count()
        wishlist_count = db.query(Wishlist).filter(Wishlist.user_id == user_id).count()

        sync_url = f"{WEB_URL}/sync?token={token}"

        msg = (
            f"🔄 <b>Cross-Platform Sync</b>\n{SEP}\n\n"
            f"Telegram bot'ingizni Web platformaga ulang!\n\n"
            f"<b>🔑 Sizning sync token:</b>\n"
            f"<code>{token}</code>\n\n"
            f"<b>📊 Hisob ma'lumotlari:</b>\n"
            f"  👤 Foydalanuvchi: <b>{user.name}</b>\n"
            f"  📦 Lotlar: <b>{lot_count} ta</b>\n"
            f"  💰 Takliflar: <b>{bid_count} ta</b>\n"
            f"  ❤️ Sevimlilar: <b>{wishlist_count} ta</b>\n\n"
            f"<b>📋 Qanday ulash mumkin?</b>\n"
            f"1️⃣ Yuqoridagi token'ni nusxalang\n"
            f"2️⃣ Web saytga o'ting\n"
            f"3️⃣ Token'ni kiriting\n"
            f"4️⃣ Hisobingiz sinxronlanadi!\n\n"
            f"<i>⏳ Token 24 soat davomida amal qiladi</i>\n"
            f"{SEP}\n"
            f"🌐 <a href='{sync_url}'>Web'da sinxronlash</a>"
        )

        await update.message.reply_html(
            msg,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🌐 Web'da sinxronlash", url=sync_url)],
                [InlineKeyboardButton("📋 Token nusxalash", callback_data=f"sync_copy_{token}")],
            ]),
            disable_web_page_preview=True
        )

    finally:
        db.close()


async def sync_copy_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Callback for copy token button"""
    query = update.callback_query
    await query.answer(
        f"Token: {query.data.replace('sync_copy_', '')}\n"
        f"Web'ga o'ting va token'ni joylang!",
        show_alert=True
    )

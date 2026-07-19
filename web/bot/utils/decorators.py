"""
DeLiKet Bot — Decorators
Auth check, rate limiting, error handling
"""

import functools
from telegram import Update
from telegram.ext import ContextTypes

from bot.utils.session import session_manager


def auth_required(func):
    """Foydalanuvchi ro'yxatdan o'tganligini tekshirish"""
    @functools.wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        user_id = update.effective_user.id
        session = session_manager.get(user_id)
        
        if not session or not session.is_authenticated:
            await update.message.reply_text(
                "⚠️ Avval ro'yxatdan o'ting!\n\n"
                "Iltimos, /start komandasini bosing."
            )
            return
        
        return await func(update, context)
    return wrapper


def rate_limit(max_per_minute: int = 10):
    """Rate limiting — 1 minutda maksimal so'rov"""
    def decorator(func):
        requests = {}
        
        @functools.wraps(func)
        async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
            import time
            user_id = update.effective_user.id
            now = time.time()
            
            # Cleanup old entries
            requests.clear() if len(requests) > 10000 else None
            
            if user_id in requests:
                window = requests[user_id]
                window = [t for t in window if now - t < 60]
                if len(window) >= max_per_minute:
                    await update.message.reply_text(
                        "⏳ Juda ko'p so'rov yubordingiz. "
                        "Biroz kuting va qayta urinib ko'ring."
                    )
                    return
                window.append(now)
                requests[user_id] = window
            else:
                requests[user_id] = [now]
            
            return await func(update, context)
        return wrapper
    return decorator


def error_handler(func):
    """Global error handling — bot ishdan chiqmasligi uchun"""
    @functools.wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        try:
            return await func(update, context)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Handler error: {e}", exc_info=True)
            try:
                await update.message.reply_text(
                    "😔 Kechirasiz, texnik xatolik yuz berdi. "
                    "Iltimos, keyinroq urinib ko'ring."
                )
            except Exception:
                pass
    return wrapper

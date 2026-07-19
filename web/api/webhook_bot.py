"""
DeLiKet — Telegram Bot Webhook Mode
Initializes the python-telegram-bot Application for serverless (Vercel) usage.

Instead of app.run_polling(), this module:
1. Creates the Application with all handlers
2. Exports process_update() for the FastAPI webhook endpoint
3. Manages Application lifecycle (initialize/start on first call)

Usage:
    from api.webhook_bot import get_bot_application
    app = await get_bot_application()
    await app.process_update(update)
"""

import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    filters,
    ConversationHandler,
)

load_dotenv()

logger = logging.getLogger(__name__)

# ── Conversation states ──
from bot.handlers.start import PHONE, ROLE
from bot.handlers.lot import (
    STEP_CATEGORY, STEP_TITLE, STEP_PRICE, STEP_QUANTITY, STEP_GRADE, STEP_CONFIRM,
)

# Lazy-loaded application singleton
_application = None


async def get_bot_application() -> Application:
    """Get or create the bot Application singleton.

    Vercel keeps warm instances, so the Application persists across invocations.
    """
    global _application
    if _application is not None:
        return _application

    TOKEN = os.getenv("BOT_TOKEN")
    if not TOKEN or TOKEN.startswith("123456"):
        logger.warning("BOT_TOKEN not configured — bot webhook disabled")
        _application = None
        return None

    print("🤖 Initializing Telegram bot (webhook mode)...")

    # ── Handlers ──
    from bot.handlers.start import (
        start_handler,
        phone_received,
        role_selected,
        role_fallback,
    )
    from bot.handlers.help import help_handler
    from bot.handlers.lot import (
        newlot_start,
        newlot_category,
        newlot_title,
        newlot_price,
        newlot_quantity,
        newlot_grade,
        newlot_confirm,
        newlot_cancel,
        newlot_timeout,
        _title_fallback,
        _price_fallback,
        _quantity_fallback,
        my_lots_handler,
        lot_action_callback,
    )
    from bot.handlers.search import (
        search_handler,
        bid_handler,
        my_bids_handler,
        cancel_bid_handler,
        lot_detail_callback,
        cancel_bid_callback,
        bid_action_callback,
        lot_bid_callback,
        search_callback,
    )
    from bot.handlers.profile import profile_handler
    from bot.handlers.dokon import dokon_conv, dokon_info, dokon_menu_handler, DOKON_MENU_BUTTONS
    from bot.handlers.vizitka import vizitka_conv
    from bot.keyboards.menu import main_menu_keyboard

    # Build application
    app = (
        Application.builder()
        .token(TOKEN)
        .build()
    )

    # ── 1. Registration conversation ──
    reg_conv = ConversationHandler(
        entry_points=[CommandHandler("start", start_handler)],
        states={
            PHONE: [
                MessageHandler(
                    filters.CONTACT | filters.TEXT & ~filters.COMMAND,
                    phone_received,
                )
            ],
            ROLE: [
                CallbackQueryHandler(role_selected, pattern="^role_"),
                CallbackQueryHandler(role_fallback, pattern="^.*$"),
            ],
        },
        fallbacks=[CommandHandler("start", start_handler)],
        name="registration",
        persistent=False,
    )
    app.add_handler(reg_conv)

    # ── 2. New lot conversation ──
    newlot_conv = ConversationHandler(
        entry_points=[CommandHandler("newlot", newlot_start)],
        states={
            STEP_CATEGORY: [CallbackQueryHandler(newlot_category, pattern="^cat_")],
            STEP_TITLE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, newlot_title),
                MessageHandler(filters.ALL & ~filters.COMMAND, _title_fallback),
            ],
            STEP_PRICE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, newlot_price),
                MessageHandler(filters.ALL & ~filters.COMMAND, _price_fallback),
            ],
            STEP_QUANTITY: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, newlot_quantity),
                MessageHandler(filters.ALL & ~filters.COMMAND, _quantity_fallback),
            ],
            STEP_GRADE: [CallbackQueryHandler(newlot_grade, pattern="^grade_")],
            STEP_CONFIRM: [CallbackQueryHandler(newlot_confirm, pattern="^lot_")],
        },
        fallbacks=[
            CommandHandler("cancel", newlot_cancel),
            CommandHandler("start", newlot_timeout),
        ],
        name="create_lot",
        persistent=False,
    )
    app.add_handler(newlot_conv)

    # ── 3. /vizitka — Business Card Generator ──
    app.add_handler(vizitka_conv)

    # ── 4. Dokon (Fleshka) Onboarding Conversation ──
    app.add_handler(CommandHandler("dokoninfo", dokon_info))
    app.add_handler(MessageHandler(filters.Text(list(DOKON_MENU_BUTTONS)), dokon_menu_handler))

    # ── 5. Command handlers ──
    app.add_handler(CommandHandler("help", help_handler))
    app.add_handler(CommandHandler("mylots", my_lots_handler))
    app.add_handler(CommandHandler("search", search_handler))
    app.add_handler(CommandHandler("bid", bid_handler))
    app.add_handler(CommandHandler("mybids", my_bids_handler))
    app.add_handler(CommandHandler("cancelbid", cancel_bid_handler))
    app.add_handler(CommandHandler("profile", profile_handler))

    # ── 6. Callback query handlers ──
    async def main_menu_callback(update, context):
        query = update.callback_query
        await query.answer()
        data = query.data
        handlers_map = {
            "newlot": "🆕 Yangi lot yaratish",
            "search": "🔍 Kategoriya tanlang:",
            "mylots": "📋 Lotlarim",
            "mybids": "💰 Takliflarim",
            "profile": "👤 Profil",
            "help": "❓ Yordam",
        }
        if data in handlers_map:
            await query.edit_message_text(
                handlers_map[data] + "\n\nIltimos, <b>/" + data + "</b> ni chatga yozing.",
                reply_markup=main_menu_keyboard(),
            )

    callback_handlers = [
        ("^newlot$|^search$|^mylots$|^mybids$|^profile$|^help$", main_menu_callback),
        ("^cat_", search_callback),
        ("^detail_", lot_detail_callback),
        ("^cancel_bid_|^cancel_yes_|^cancel_no_", cancel_bid_callback),
        ("^bid_accept_|^bid_reject_", bid_action_callback),
        ("^bid_", lot_bid_callback),
        ("^lot_archive_|^lot_activate_", lot_action_callback),
    ]
    for pattern, handler in callback_handlers:
        app.add_handler(CallbackQueryHandler(handler, pattern=pattern))

    # ── 7. Error handler ──
    async def error_handler(update, context):
        logger.error(f"Update {update} caused error {context.error}", exc_info=True)
        try:
            if update and update.effective_message:
                await update.effective_message.reply_text(
                    "😔 Kechirasiz, texnik xatolik yuz berdi."
                )
        except Exception:
            pass

    app.add_error_handler(error_handler)

    # Initialize async components
    await app.initialize()
    await app.start()

    _application = app
    logger.info("✅ Bot webhook application initialized")
    print("✅ Bot webhook application initialized")
    return _application


async def send_deal_notification(
    deal_id: int,
    old_status: str,
    new_status: str,
    buyer_id: int,
    seller_id: int,
    lot_title: str = "",
    amount: float = 0,
) -> None:
    """Send Telegram notification to buyer and seller when deal status changes.

    Fire-and-forget background task — errors are logged but not raised.
    """
    try:
        app = await get_bot_application()
        if app is None:
            logger.warning(f"Bot not available — cannot send deal #{deal_id} notification")
            return

        # ── Status labels in Uzbek ──
        status_labels = {
            "kutmoqda": "⏳ Kutmoqda",
            "yigilmoqda": "📦 Yig'ilmoqda",
            "jo'natildi": "🚚 Jo'natildi",
            "yetkazildi": "✅ Yetkazildi",
            "yakunlandi": "🎉 Yakunlandi",
            "bahslashilgan": "⚠️ Bahslashilgan",
            "bekor_qilindi": "❌ Bekor qilindi",
        }

        old_label = status_labels.get(old_status, old_status)
        new_label = status_labels.get(new_status, new_status)
        lot_info = f"<b>{lot_title}</b>" if lot_title else f"#{deal_id}"
        amount_str = f"<b>{amount:,.0f} UZS</b>" if amount else ""

        # ── Buyer messages per status ──
        buyer_messages = {
            "jo'natildi": (
                f"🚚 <b>Mahsulotingiz jo'natildi!</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Holat: {old_label} → {new_label}\n"
                f"Summa: {amount_str}\n\n"
                f"📦 Sotuvchi mahsulotingizni jo'natdi. Yetkazilgandan so'ng "
                f"<b>Yetkazildi</b> tugmasini bosing."
            ),
            "yetkazildi": (
                f"✅ <b>Mahsulot yetkazildi!</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Holat: {old_label} → {new_label}\n"
                f"Summa: {amount_str}\n\n"
                f"🎉 Agar hamma narsa yaxshi bo'lsa, <b>Yakunlandi</b> tugmasini bosing. "
                f"Pul sotuvchiga o'tkaziladi."
            ),
            "yakunlandi": (
                f"🎉 <b>Bitim muvaffaqiyatli yakunlandi!</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Summa: {amount_str}\n\n"
                f"📝 Iltimos, sotuvchiga <b>baholash</b> qoldiring!"
            ),
            "bahslashilgan": (
                f"⚠️ <b>Bitim bahslashilgan holatda</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Holat: {old_label} → {new_label}\n"
                f"Summa: {amount_str}\n\n"
                f"🆘 Administrator muammoni ko'rib chiqmoqda. Tez orada aloqaga chiqamiz."
            ),
            "bekor_qilindi": (
                f"❌ <b>Bitim bekor qilindi</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Holat: {old_label} → {new_label}\n"
                f"Summa: {amount_str}\n\n"
                f"Agar savollaringiz bo'lsa, /help yozing."
            ),
        }

        # ── Seller messages per status ──
        seller_messages = {
            "jo'natildi": (
                f"✅ <b>Mahsulot jo'natilgani belgilandi</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Holat: {old_label} → {new_label}\n"
                f"Summa: {amount_str}\n\n"
                f"📬 Xaridorni yetkazilishni tasdiqlashini kuting."
            ),
            "yetkazildi": (
                f"✅ <b>Xaridor mahsulotni qabul qildi</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Holat: {old_label} → {new_label}\n"
                f"Summa: {amount_str}\n\n"
                f"💰 Xaridor <b>Yakunlandi</b> tugmasini bossa, pul hisobingizga o'tkaziladi."
            ),
            "yakunlandi": (
                f"🎉 <b>Bitim muvaffaqiyatli yakunlandi!</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Summa: {amount_str}\n\n"
                f"💰 Pul mablag'lari hisobingizga o'tkazildi. /profile orqali tekshiring."
            ),
            "bahslashilgan": (
                f"⚠️ <b>Bitim bahslashilgan holatda</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Holat: {old_label} → {new_label}\n"
                f"Summa: {amount_str}\n\n"
                f"🆘 Administrator muammoni ko'rib chiqmoqda. Tez orada aloqaga chiqamiz."
            ),
            "bekor_qilindi": (
                f"❌ <b>Bitim bekor qilindi</b>\n\n"
                f"Bitim #{deal_id}: {lot_info}\n"
                f"Holat: {old_label} → {new_label}\n"
                f"Summa: {amount_str}\n\n"
                f"Agar savollaringiz bo'lsa, /help yozing."
            ),
        }

        # Send to buyer
        if new_status in buyer_messages:
            try:
                await app.bot.send_message(
                    chat_id=buyer_id,
                    text=buyer_messages[new_status],
                    parse_mode="HTML",
                )
                logger.info(f"📨 Deal #{deal_id} notification sent to buyer {buyer_id}")
            except Exception as e:
                logger.warning(f"Failed to notify buyer {buyer_id} for deal #{deal_id}: {e}")

        # Send to seller
        if new_status in seller_messages:
            try:
                await app.bot.send_message(
                    chat_id=seller_id,
                    text=seller_messages[new_status],
                    parse_mode="HTML",
                )
                logger.info(f"📨 Deal #{deal_id} notification sent to seller {seller_id}")
            except Exception as e:
                logger.warning(f"Failed to notify seller {seller_id} for deal #{deal_id}: {e}")

    except Exception as e:
        logger.error(f"send_deal_notification error: {e}", exc_info=True)


async def shutdown_application():
    """Clean shutdown of the bot application."""
    global _application
    if _application is not None:
        try:
            await _application.stop()
            await _application.shutdown()
        except Exception:
            pass
        _application = None
        print("👋 Bot application shut down")

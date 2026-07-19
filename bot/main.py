"""
DeLiKet Bot — python-telegram-bot asosiy fayl
Application class + handler registratsiyasi

Week 5 — Kun 4: Professional qidirish + taklif tizimi
- Registration conversation (/start)
- Lot creation conversation (/newlot — 5 steps)
- Search with lot detail view (/search, detail callbacks)
- Bid management (/bid, /mybids, /cancelbid)
- Lot management (/mylots, archive/activate)
- Error handler + session cleanup
"""

import os
import logging
from dotenv import load_dotenv
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    InlineQueryHandler,
    filters,
    ConversationHandler,
)

from bot.handlers.start import (
    start_handler,
    phone_received,
    role_selected,
    role_fallback,
    PHONE,
    ROLE,
)
from bot.handlers.help import help_handler
from bot.handlers.lot import (
    newlot_start,
    newlot_category,
    newlot_title,
    newlot_image,
    newlot_skip_image,
    newlot_price,
    newlot_quantity,
    newlot_grade,
    newlot_confirm,
    newlot_cancel,
    newlot_timeout,
    _title_fallback,
    _image_fallback,
    _price_fallback,
    _quantity_fallback,
    my_lots_handler,
    lot_action_callback,
    STEP_CATEGORY,
    STEP_TITLE,
    STEP_IMAGE,
    STEP_PRICE,
    STEP_QUANTITY,
    STEP_GRADE,
    STEP_CONFIRM,
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
from bot.handlers.rating import rate_handler, rate_callback
from bot.handlers.admin import admin_handler, admin_callback
from bot.handlers.language import language_handler, language_callback

# ── Feature handlers (20 ta yangi feature) ──
from bot.handlers.features import (
    notifications_handler,
    wishlist_handler, wishlist_toggle_callback,
    savesearch_handler,
    pricealert_handler,
    myanalytics_handler,
    share_handler, share_callback,
    ask_callback, alert_callback,
    bulk_handler,
    recommend_handler,
)
from bot.handlers.trust import (
    ask_handler, answer_handler, answer_callback,
    escrow_handler,
    trustscore_handler,
    report_handler,
    marketprice_handler,
    review_handler,
)
from bot.handlers.gamification import (
    profile_extended_handler,
    leaderboard_handler,
    theme_handler,
    crypto_handler,
    ai_assistant_handler,
)
from bot.handlers.visual import (
    visualsearch_start, visualsearch_photo, visualsearch_direct,
    visualsearch_cancel, PHOTO as VS_PHOTO,
)
from bot.handlers.sync import sync_handler, sync_copy_callback
from bot.handlers.dokon import dokon_conv, dokon_info, dokon_menu_handler, DOKON_MENU_BUTTONS
from bot.handlers.tashrif import tashrif_start, tashrif_conv, visit_callback
from bot.handlers.vizitka import vizitka_conv
from bot.handlers.tradein import tradein_conv, my_tradeins_handler

# ── 20 New Feature handlers ──
from bot.handlers.new_features import (
    offer_handler, counter_handler, accept_offer_handler,
    savetemplate_handler, mytemplates_handler, usetemplate_handler,
    autorelist_handler,
    compare_handler,
    follow_handler, unfollow_handler, myfeed_handler,
    shoplist_handler, myshoplists_handler,
    pricetrend_handler,
    share_lot_handler,
    digest_handler,
    store_handler,
    expert_handler,
    visualcompare_handler,
    marketanalytics_handler,
    optimize_handler,
    chat_handler,
    academy_handler, lesson_handler,
    dispute_handler,
    crossborder_handler,
    subscription_handler, subscribe_handler,
    trustedreview_handler, lotreviews_handler,
)

# ── Patch: edit_message_text always uses HTML ──
from telegram import CallbackQuery
_original_edit = CallbackQuery.edit_message_text


async def _patched_edit(self, text=None, **kwargs):
    if 'parse_mode' not in kwargs:
        kwargs['parse_mode'] = 'HTML'
    return await _original_edit(self, text, **kwargs)


CallbackQuery.edit_message_text = _patched_edit
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.session import session_manager

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def main_menu_callback(update, context):
    """Asosiy menyu callback handler"""
    query = update.callback_query
    await query.answer()

    data = query.data
    handlers = {
        "newlot": ("🆕 Yangi lot yaratish", None, "/newlot"),
        "search": ("🔍 Kategoriya tanlang:", "category_keyboard", None),
        "mylots": ("📋 Lotlarim", None, "/mylots"),
        "mybids": ("💰 Takliflarim", None, "/mybids"),
        "profile": ("👤 Profil", None, "/profile"),
        "help": ("❓ Yordam", None, "/help"),
    }

    if data in handlers:
        text, keyboard_type, command = handlers[data]
        if keyboard_type == "category_keyboard":
            from bot.keyboards.menu import category_keyboard
            await query.edit_message_text(text, reply_markup=category_keyboard())
        elif command:
            await query.edit_message_text(
                f"✅ {text}\n\n"
                f"Iltimos, <b>{command}</b> ni chatga yozing.",
                reply_markup=main_menu_keyboard(),
            )


async def noop_callback(update, context):
    """Hech narsa qilmaydigan callback (sahifa indikatori bosilganda)"""
    query = update.callback_query
    await query.answer()


async def error_handler(update, context):
    """Global error handler — bot ishdan chiqmasligi uchun"""
    logger.error(f"Update {update} caused error {context.error}", exc_info=True)
    try:
        if update and update.effective_message:
            await update.effective_message.reply_text(
                "😔 Kechirasiz, texnik xatolik yuz berdi.\n"
                "Iltimos, keyinroq urinib koring yoki /help buyrugini bosing."
            )
    except Exception:
        pass


async def post_init(app):
    """Bot ishga tushganda bir marta ishlaydi"""
    logger.info("🤖 DeLiKet Bot initialized successfully")
    print("✅ Bot initialised — handlers registered, session manager ready")


async def post_shutdown(app):
    """Bot to'xtaganda sessionlarni tozalash"""
    session_manager.cleanup_expired()
    logger.info("👋 DeLiKet Bot stopped. Sessions cleaned.")


def main():
    TOKEN = os.getenv("BOT_TOKEN")
    if not TOKEN or TOKEN == "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11":
        print("❌ BOT_TOKEN not set. Copy .env.example to .env and add your token.")
        print("   Get token from @BotFather on Telegram")
        return

    # Build application
    app = (
        Application.builder()
        .token(TOKEN)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
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
    )
    app.add_handler(reg_conv)

    # ── 2. New lot conversation ──
    newlot_conv = ConversationHandler(
        entry_points=[CommandHandler("newlot", newlot_start)],
        states={
            STEP_CATEGORY: [
                CallbackQueryHandler(newlot_category, pattern="^cat_"),
            ],
            STEP_TITLE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, newlot_title),
                MessageHandler(filters.ALL & ~filters.COMMAND, _title_fallback),
            ],
            STEP_IMAGE: [
                MessageHandler(filters.PHOTO, newlot_image),
                CallbackQueryHandler(newlot_skip_image, pattern="^skip_image$"),
                MessageHandler(filters.ALL, _image_fallback),
            ],
            STEP_PRICE: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, newlot_price),
                MessageHandler(filters.ALL & ~filters.COMMAND, _price_fallback),
            ],
            STEP_QUANTITY: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, newlot_quantity),
                MessageHandler(filters.ALL & ~filters.COMMAND, _quantity_fallback),
            ],
            STEP_GRADE: [
                CallbackQueryHandler(newlot_grade, pattern="^grade_"),
            ],
            STEP_CONFIRM: [
                CallbackQueryHandler(newlot_confirm, pattern="^lot_"),
            ],
        },
        fallbacks=[
            CommandHandler("cancel", newlot_cancel),
            CommandHandler("start", newlot_timeout),
        ],
        name="create_lot",
    )
    app.add_handler(newlot_conv)

    # ── 3. Command handlers ──
    app.add_handler(CommandHandler("help", help_handler))
    app.add_handler(CommandHandler("mylots", my_lots_handler))
    app.add_handler(CommandHandler("search", search_handler))
    app.add_handler(CommandHandler("bid", bid_handler))
    app.add_handler(CommandHandler("mybids", my_bids_handler))
    app.add_handler(CommandHandler("cancelbid", cancel_bid_handler))
    app.add_handler(CommandHandler("rate", rate_handler))

    # ── B2B DOKON (Fleshka) Onboarding ──
    app.add_handler(dokon_conv)
    app.add_handler(CommandHandler("dokoninfo", dokon_info))
    # Dokon mode reply keyboard text handler — catches button presses
    app.add_handler(MessageHandler(filters.Text(list(DOKON_MENU_BUTTONS)), dokon_menu_handler))

    # ── FEATURE: Fleshka Tashrif / Visit Tracker ──
    app.add_handler(CommandHandler("tashrif", tashrif_start))
    app.add_handler(tashrif_conv)

    # ── /vizitka — Business Card Generator ──
    app.add_handler(vizitka_conv)

    # ── TRADE-IN / Eski qurilmani baholash ──
    app.add_handler(tradein_conv)
    app.add_handler(CommandHandler("mytradeins", my_tradeins_handler))

    # ── FEATURE 18: Cross-Platform Sync ──
    app.add_handler(CommandHandler("sync", sync_handler))

    # ── FEATURE 1: Counter-Offer ──
    app.add_handler(CommandHandler("offer", offer_handler))
    app.add_handler(CommandHandler("counter", counter_handler))
    app.add_handler(CommandHandler("accept", accept_offer_handler))

    # ── FEATURE 2: Lot Templates ──
    app.add_handler(CommandHandler("savetemplate", savetemplate_handler))
    app.add_handler(CommandHandler("mytemplates", mytemplates_handler))
    app.add_handler(CommandHandler("usetemplate", usetemplate_handler))

    # ── FEATURE 3: Auto-Relist ──
    app.add_handler(CommandHandler("autorelist", autorelist_handler))

    # ── FEATURE 4: Lot Comparison ──
    app.add_handler(CommandHandler("compare", compare_handler))

    # ── FEATURE 5: Saved Sellers ──
    app.add_handler(CommandHandler("follow", follow_handler))
    app.add_handler(CommandHandler("unfollow", unfollow_handler))
    app.add_handler(CommandHandler("myfeed", myfeed_handler))

    # ── FEATURE 6: Shopping List ──
    app.add_handler(CommandHandler("shoplist", shoplist_handler))
    app.add_handler(CommandHandler("myshoplists", myshoplists_handler))

    # ── FEATURE 7: Price History ──
    app.add_handler(CommandHandler("pricetrend", pricetrend_handler))

    # ── FEATURE 8: Quick Share ──
    app.add_handler(CommandHandler("sharelot", share_lot_handler))

    # ── FEATURE 9: Smart Digest ──
    app.add_handler(CommandHandler("digest", digest_handler))

    # ── FEATURE 10: Seller Store ──
    app.add_handler(CommandHandler("store", store_handler))

    # ── FEATURE 11: Expert Verification ──
    app.add_handler(CommandHandler("expert", expert_handler))

    # ── FEATURE 12: Visual Comparison ──
    app.add_handler(CommandHandler("visualcompare", visualcompare_handler))

    # ── FEATURE 13: Market Analytics ──
    app.add_handler(CommandHandler("marketanalytics", marketanalytics_handler))

    # ── FEATURE 14: AI Price Optimizer ──
    app.add_handler(CommandHandler("optimize", optimize_handler))

    # ── FEATURE 15: Private Mode ──
    app.add_handler(CommandHandler("chat", chat_handler))

    # ── FEATURE 16: Seller Academy ──
    app.add_handler(CommandHandler("academy", academy_handler))
    app.add_handler(CommandHandler("lesson", lesson_handler))

    # ── FEATURE 17: Dispute Center ──
    app.add_handler(CommandHandler("dispute", dispute_handler))

    # ── FEATURE 18: Cross-Border ──
    app.add_handler(CommandHandler("crossborder", crossborder_handler))

    # ── FEATURE 19: Seller Subscription ──
    app.add_handler(CommandHandler("subscription", subscription_handler))
    app.add_handler(CommandHandler("subscribe", subscribe_handler))

    # ── FEATURE 20: Trusted Reviews ──
    app.add_handler(CommandHandler("trustedreview", trustedreview_handler))
    app.add_handler(CommandHandler("lotreviews", lotreviews_handler))

    # ── 4. Admin panel (Feature 9) ──
    app.add_handler(CommandHandler("admin", admin_handler))

    # ── 5. Language / til (Feature 10) ──
    app.add_handler(CommandHandler("language", language_handler))

    # ── FEATURE PACK 1: User-friendly features ──
    app.add_handler(CommandHandler("notifications", notifications_handler))
    app.add_handler(CommandHandler("wishlist", wishlist_handler))
    app.add_handler(CommandHandler("savesearch", savesearch_handler))
    app.add_handler(CommandHandler("pricealert", pricealert_handler))
    app.add_handler(CommandHandler("myanalytics", myanalytics_handler))
    app.add_handler(CommandHandler("share", share_handler))
    app.add_handler(CommandHandler("bulk", bulk_handler))
    app.add_handler(CommandHandler("recommend", recommend_handler))

    # ── FEATURE PACK 2: Trust & Safety ──
    app.add_handler(CommandHandler("ask", ask_handler))
    app.add_handler(CommandHandler("answer", answer_handler))
    app.add_handler(CommandHandler("escrow", escrow_handler))
    app.add_handler(CommandHandler("trustscore", trustscore_handler))
    app.add_handler(CommandHandler("report", report_handler))
    app.add_handler(CommandHandler("marketprice", marketprice_handler))
    app.add_handler(CommandHandler("review", review_handler))

    # ── FEATURE PACK 3: Gamification & Premium ──
    app.add_handler(CommandHandler("profile_extended", profile_extended_handler))
    app.add_handler(CommandHandler("profile", profile_extended_handler))  # Extended profile replaces old
    app.add_handler(CommandHandler("leaderboard", leaderboard_handler))
    app.add_handler(CommandHandler("theme", theme_handler))
    app.add_handler(CommandHandler("crypto", crypto_handler))
    app.add_handler(CommandHandler("ai", ai_assistant_handler))

    # Alias commands for easy access
    app.add_handler(CommandHandler("wish", wishlist_handler))
    app.add_handler(CommandHandler("alerts", pricealert_handler))
    app.add_handler(CommandHandler("stats", myanalytics_handler))

    # ── FEATURE 11: AI Visual Search ──
    vs_conv = ConversationHandler(
        entry_points=[
            CommandHandler("visualsearch", visualsearch_start),
            CommandHandler("vs", visualsearch_direct),
        ],
        states={
            VS_PHOTO: [
                MessageHandler(filters.PHOTO & ~filters.COMMAND, visualsearch_photo),
                MessageHandler(filters.TEXT & ~filters.COMMAND, visualsearch_photo),
                MessageHandler(filters.ALL & ~filters.COMMAND, visualsearch_photo),
            ],
        },
        fallbacks=[CommandHandler("cancel", visualsearch_cancel)],
        name="visual_search",
    )
    app.add_handler(vs_conv)

    # ── 6. Inline query handler (Feature: @DeLiKatbot search) ──
    from bot.handlers.search import inline_search_handler
    app.add_handler(InlineQueryHandler(inline_search_handler))

    # ── 6. Callback query handlers ──
    callback_handlers = [
        ("^newlot$|^search$|^mylots$|^mybids$|^profile$|^help$", main_menu_callback),
        ("^cat_|^page_", search_callback),
        ("^noop$", noop_callback),
        ("^detail_", lot_detail_callback),
        ("^cancel_bid_|^mcb_|^confirm_cancel_", cancel_bid_callback),
        ("^bid_accept_|^bid_reject_", bid_action_callback),
        ("^bid_", lot_bid_callback),
        ("^lot_archive_|^lot_activate_", lot_action_callback),
        ("^rate_", rate_callback),
        ("^admin_|^adm_", admin_callback),
        ("^lang_", language_callback),
        # ── NEW FEATURE callbacks ──
        ("^wish_", wishlist_toggle_callback),
        ("^ask_", ask_callback),
        ("^share_", share_callback),
        ("^alert_", alert_callback),
        ("^ans_", answer_callback),
        ("^sync_copy_", sync_copy_callback),
        # ── Tashrif callbacks — handled in visit_callback
        ("^visit_kpi$|^visit_checklist$|^visit_menu$|^visit_cancel_add$|^visit_back$", visit_callback),
    ]
    for pattern, handler in callback_handlers:
        app.add_handler(CallbackQueryHandler(handler, pattern=pattern))

    # ── 5. Error handler ──
    app.add_error_handler(error_handler)

    logger.info("🤖 DeLiKet Bot started — all handlers registered")
    print("🤖 DeLiKet Bot is running... Press Ctrl+C to stop")
    print("   Commands: start, help, newlot, mylots, search, bid, mybids, cancelbid, profile, admin, language")
    app.run_polling(allowed_updates=["message", "callback_query"])


if __name__ == "__main__":
    main()

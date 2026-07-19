"""
DeLiKet Bot — /tradein handler
Eski qurilmani baholash va trade-in listing yaratish

Flow:
1. Kategoriya tanlash
2. Qurilma modeli (brand + model nomi)
3. Holat tanlash (excellent/good/fair/poor)
4. AI baholash natijasini ko'rsatish
5. Tasdiqlash / rad etish
"""

import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ContextTypes, ConversationHandler, CommandHandler,
    CallbackQueryHandler, MessageHandler, filters
)

from api.database import SessionLocal
from api.database.models import TradeIn, User
from api.routes.tradein import ai_estimate_price
from bot.utils.decorators import auth_required
from bot.utils.session import session_manager
from bot.utils.formatting import SEP, SEP_THIN, price as fmt_price
from bot.keyboards.menu import main_menu_keyboard

logger = logging.getLogger(__name__)

# Conversation states
(CAT, MODEL, CONDITION, CONFIRM) = range(4)

WEB_URL = os.getenv("WEB_URL", "https://delikat.vercel.app")

# Category display
CATEGORIES = {
    "smartfon": "📱 Smartfon",
    "notebook": "💻 Notebook",
    "tv": "📺 TV",
    "audio": "🎧 Audio",
    "aksesuar": "🔌 Aksessuar",
    "kiyim": "👕 Kiyim",
}

CONDITIONS = {
    "excellent": "🟢 A'lo — Yangidek, minimal foydalanilgan",
    "good": "🟡 Yaxshi — Oddiy foydalanilgan, bir oz eskirgan",
    "fair": "🟠 Qoniqarli — Ko'rinadigan izlar bor, ishlaydi",
    "poor": "🔴 Yomon — Shikastlangan, ta'mir kerak",
}


@auth_required
async def tradein_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """1-qadam: Kategoriya tanlash"""
    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["tradein"] = {}

    keyboard = [
        [InlineKeyboardButton(label, callback_data=f"ticat_{key}")]
        for key, label in CATEGORIES.items()
    ]
    keyboard.append([InlineKeyboardButton("❌ Bekor qilish", callback_data="ticat_cancel")])

    await update.message.reply_text(
        "🔄 <b>Trade-In — Eski qurilmangizni baholating</b>\n\n"
        "DeLiKet AI qurilmangizni baholaydi va real bozor narxini taklif qiladi!\n\n"
        "<b>1/4: Qurilma turini tanlang</b>",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return CAT


async def tradein_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """2-qadam: Model nomini kiritish"""
    query = update.callback_query
    await query.answer()

    data = query.data.replace("ticat_", "")
    if data == "cancel":
        await query.edit_message_text("❌ Trade-in bekor qilindi.", reply_markup=main_menu_keyboard())
        return ConversationHandler.END

    if data not in CATEGORIES:
        await query.edit_message_text("❌ Noto'g'ri kategoriya. Qaytadan tanlang:")
        return CAT

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["tradein"]["category"] = data

    await query.edit_message_text(
        f"✅ Kategoriya: <b>{CATEGORIES[data]}</b>\n\n"
        "<b>2/4: Qurilma modelini yozing</b>\n\n"
        "Misol: <i>iPhone 14 Pro 256GB</i>\n"
        "Yoki: <i>Samsung Galaxy S24 Ultra</i>\n\n"
        "Brand va model nomini aniq yozing — AI bahosi shunchalik aniq bo'ladi!"
    )
    return MODEL


async def tradein_model(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """3-qadam: Holat tanlash"""
    model = update.message.text.strip()

    if len(model) < 3:
        await update.message.reply_text(
            "❌ Model nomi juda qisqa (kamida 3 belgi). Qaytadan yozing:"
        )
        return MODEL
    if len(model) > 100:
        await update.message.reply_text(
            "❌ Model nomi juda uzun (maksimal 100 belgi). Qaytadan yozing:"
        )
        return MODEL

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["tradein"]["device_model"] = model

    keyboard = [
        [InlineKeyboardButton(label, callback_data=f"ticond_{key}")]
        for key, label in CONDITIONS.items()
    ]
    keyboard.append([InlineKeyboardButton("❌ Bekor qilish", callback_data="ticond_cancel")])

    await update.message.reply_text(
        f"✅ Model: <b>{model[:60]}</b>\n\n"
        "<b>3/4: Qurilma holatini tanlang</b>\n\n"
        "Qurilmangizning hozirgi holatini to'g'ri tanlang — bu AI bahosiga ta'sir qiladi.",
        reply_markup=InlineKeyboardMarkup(keyboard),
    )
    return CONDITION


async def tradein_condition(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """4-qadam: AI baholash natijasini ko'rsatish + tasdiqlash"""
    query = update.callback_query
    await query.answer()

    data = query.data.replace("ticond_", "")
    if data == "cancel":
        await query.edit_message_text("❌ Trade-in bekor qilindi.", reply_markup=main_menu_keyboard())
        return ConversationHandler.END

    if data not in CONDITIONS:
        await query.edit_message_text("❌ Noto'g'ri holat. Qaytadan tanlang:")
        return CONDITION

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["tradein"]["condition"] = data

    # AI baholash (direct import — no HTTP call needed)
    tradein_data = session.data["tradein"]
    valuation = ai_estimate_price(
        tradein_data["category"], tradein_data["device_model"], condition=data
    )

    session.data["tradein"]["valuation"] = valuation
    estimated = valuation["estimated_price"]

    msg = (
        "🤖 <b>AI Baholash natijasi</b>\n"
        f"{SEP}\n"
        f"  {CATEGORIES.get(tradein_data['category'], tradein_data['category'])}\n"
        f"  📱 <b>{tradein_data['device_model'][:60]}</b>\n"
        f"  {CONDITIONS.get(data, data)}\n"
        f"{SEP_THIN}\n"
        f"  💰 <b>Taxminiy narx: {fmt_price(estimated)}</b>\n"
        f"  📊 Oraliq: {fmt_price(valuation['price_range']['min'])} — {fmt_price(valuation['price_range']['max'])}\n"
        f"  📈 Ishonchlilik: {valuation.get('confidence', 70)}%\n"
        f"{SEP}\n\n"
        "Tasdiqlaysizmi? Listing yaratilgandan so'ng xaridorlar taklif yuborishi mumkin."
    )

    keyboard = [
        [
            InlineKeyboardButton("✅ Tasdiqlash", callback_data="ticonf_yes"),
            InlineKeyboardButton("❌ Rad etish", callback_data="ticonf_no"),
        ],
        [InlineKeyboardButton("💰 Narxni o'zgartirish", callback_data="ticonf_edit")],
    ]
    await query.edit_message_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))
    return CONFIRM


async def tradein_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Tasdiqlash — DB ga saqlash"""
    query = update.callback_query
    await query.answer()

    data = query.data
    if data == "ticonf_no":
        await query.edit_message_text("❌ Trade-in bekor qilindi.", reply_markup=main_menu_keyboard())
        return ConversationHandler.END

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    tradein_data = session.data.get("tradein", {})

    if data == "ticonf_edit":
        await query.edit_message_text(
            "💰 <b>Yangi narxni yozing</b> (so'mda)\n\n"
            "Misol: <i>5000000</i> (5 000 000 so'm)\n\n"
            "<i>0 yozsangiz, AI taklif qilgan narx qoldiriladi.</i>"
        )
        return CONFIRM  # Stay in same state, waiting for text

    if data == "ticonf_yes":
        if not all(k in tradein_data for k in ("category", "device_model", "condition")):
            await query.edit_message_text(
                "😔 Xatolik: ma'lumotlar to'liq emas. /tradein ni qayta boshlang."
            )
            session.data.pop("tradein", None)
            return ConversationHandler.END

        # Save to DB
        db = SessionLocal()
        try:
            valuation = tradein_data.get("valuation", {})
            trade_in = TradeIn(
                seller_id=user_id,
                category=tradein_data["category"],
                device_model=tradein_data["device_model"],
                condition=tradein_data["condition"],
                estimated_price=valuation.get("estimated_price"),
                description=tradein_data.get("description", ""),
                status="kutilmoqda",
                ai_valuation_data=valuation,
            )

            # If user provided custom price
            if "final_price" in tradein_data:
                trade_in.final_price = tradein_data["final_price"]
                trade_in.status = "baholandi"

            db.add(trade_in)
            db.commit()
            db.refresh(trade_in)

            session.data.pop("tradein", None)

            web_link = f"{WEB_URL}/tradein?id={trade_in.id}"
            await query.edit_message_text(
                f"✅ <b>Trade-in #{trade_in.id} yaratildi!</b>\n{SEP}\n"
                f"  {CATEGORIES.get(trade_in.category, trade_in.category)}\n"
                f"  📱 <b>{trade_in.device_model[:55]}</b>\n"
                f"  💰 AI bahosi: <b>{fmt_price(trade_in.estimated_price)}</b>\n"
                f"  📊 Holat: <b>Kutilmoqda</b>\n"
                f"{SEP}\n\n"
                f"🌐 <a href='{web_link}'>Web'da ko'rish</a>\n\n"
                f"<b>Keyin:</b>\n"
                f"  /tradein — Yangi trade-in\n"
                f"  /mytradeins — Trade-in larim",
                reply_markup=main_menu_keyboard(),
                disable_web_page_preview=True,
            )

        except Exception as e:
            db.rollback()
            logger.error(f"Trade-in save error: {e}", exc_info=True)
            await query.edit_message_text(
                "😔 Xatolik yuz berdi. Iltimos, /tradein ni qayta boshlang."
            )
        finally:
            db.close()

        return ConversationHandler.END


async def tradein_custom_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Custom price input handler"""
    text = update.message.text.strip().replace(" ", "").replace(",", "")

    try:
        price = float(text)
    except ValueError:
        await update.message.reply_text(
            "❌ Noto'g'ri format. Iltimos, raqam yozing.\n"
            "Misol: <i>5000000</i>"
        )
        return CONFIRM

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)

    if price > 0:
        session.data["tradein"]["final_price"] = price

    # Show confirmation with price
    tradein_data = session.data.get("tradein", {})
    valuation = tradein_data.get("valuation", {})
    final_price = tradein_data.get("final_price", valuation.get("estimated_price", 0))

    msg = (
        "📋 <b>Trade-in ma'lumotlari</b>\n"
        f"{SEP}\n"
        f"  {CATEGORIES.get(tradein_data.get('category', ''), tradein_data.get('category', ''))}\n"
        f"  📱 <b>{tradein_data.get('device_model', '')[:50]}</b>\n"
        f"  💰 <b>Narx: {fmt_price(final_price)}</b>\n"
        f"{SEP}\n\n"
        "Tasdiqlaysizmi?"
    )
    keyboard = [
        [
            InlineKeyboardButton("✅ Tasdiqlash", callback_data="ticonf_yes"),
            InlineKeyboardButton("❌ Bekor qilish", callback_data="ticonf_no"),
        ],
    ]
    await update.message.reply_text(msg, reply_markup=InlineKeyboardMarkup(keyboard))
    return CONFIRM


async def tradein_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bekor qilish"""
    user_id = update.effective_user.id
    session = session_manager.get(user_id)
    if session:
        session.data.pop("tradein", None)

    await update.message.reply_text("❌ Trade-in bekor qilindi.", reply_markup=main_menu_keyboard())
    return ConversationHandler.END


async def tradein_timeout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Timeout"""
    user_id = update.effective_user.id
    session = session_manager.get(user_id)
    if session:
        session.data.pop("tradein", None)

    await update.message.reply_text(
        "⏳ Vaqt tugadi. Trade-in bekor qilindi.\n"
        "Qayta boshlash: /tradein",
        reply_markup=main_menu_keyboard(),
    )
    return ConversationHandler.END


# ── /mytradeins — my trade-in listings ──

@auth_required
async def my_tradeins_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Foydalanuvchining trade-in listinglari"""
    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        listings = (
            db.query(TradeIn)
            .filter(TradeIn.seller_id == user_id)
            .order_by(TradeIn.created_at.desc())
            .all()
        )

        if not listings:
            await update.message.reply_text(
                "🔄 <b>Trade-In larim</b>\n\n"
                "Hozircha trade-in listinglaringiz yo'q.\n\n"
                "Yangi trade-in qo'shish: /tradein\n"
                "Eski qurilmangizni AI baholab, soting!",
                reply_markup=main_menu_keyboard(),
            )
            return

        total = len(listings)
        msg = f"🔄 <b>Trade-In larim ({total} ta)</b>\n{SEP}\n\n"

        STATUS_LABELS = {
            "kutilmoqda": "⏳ Kutilmoqda",
            "baholandi": "💰 Baholandi",
            "qabul": "✅ Qabul qilindi",
            "qaytarildi": "📦 Qaytarildi",
            "sotildi": "🎉 Sotildi",
        }

        for ti in listings[:10]:
            status_label = STATUS_LABELS.get(ti.status, ti.status)
            msg += (
                f"  <b>#{ti.id}</b> {ti.device_model[:55]}\n"
                f"    {CATEGORIES.get(ti.category, ti.category)} | "
                f"{fmt_price(ti.estimated_price or 0)} | {status_label}\n\n"
            )

        if total > 10:
            msg += f"<i>... va yana {total - 10} ta listing</i>\n\n"

        msg += f"🆕 /tradein — Yangi trade-in qo'shish"

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())

    except Exception as e:
        logger.error(f"My tradeins error: {e}", exc_info=True)
        await update.message.reply_text(
            "😔 Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
        )
    finally:
        db.close()


# ── Conversation handler ──

tradein_conv = ConversationHandler(
    entry_points=[CommandHandler("tradein", tradein_start)],
    states={
        CAT: [CallbackQueryHandler(tradein_category, pattern="^ticat_")],
        MODEL: [
            MessageHandler(filters.TEXT & ~filters.COMMAND, tradein_model),
        ],
        CONDITION: [CallbackQueryHandler(tradein_condition, pattern="^ticond_")],
        CONFIRM: [
            CallbackQueryHandler(tradein_confirm, pattern="^ticonf_"),
            MessageHandler(filters.TEXT & ~filters.COMMAND, tradein_custom_price),
        ],
    },
    fallbacks=[
        CommandHandler("cancel", tradein_cancel),
        CommandHandler("start", tradein_timeout),
    ],
    name="tradein",
)

"""
DeLiKet Bot — /tashrif Fleshka Bozor Tashrifi
Checklist va KPI monitoringni bot orqali boshqarish
- Dashboard: KPI stats, kunlik tashriflar
- Tashrif qo'shish: do'kon nomi + action
- Checklist ko'rish: tayyorgarlik, bozorda, tashrifdan keyin
- Web sahifaga link
"""

import logging
from datetime import datetime, timezone, date
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ContextTypes, ConversationHandler, CommandHandler,
    MessageHandler, CallbackQueryHandler, filters
)

from api.database import SessionLocal
from api.database.models import User, ShopVisit
from bot.keyboards.menu import dokon_main_menu_keyboard
from bot.utils.session import session_manager

logger = logging.getLogger(__name__)

WEB_URL = "https://delikat.vercel.app"

# Conversation states for adding a visit
VISIT_SHOP_NAME, VISIT_ACTION = range(1, 3)

# ── KPI Targets ──
KPI_TARGETS = {"visited": 30, "signed": 10, "lots": 5, "deals": 2}

ACTION_LABELS = {
    "visited": "✅ Tashrif",
    "signed": "📝 Ro'yxatdan o'tdi",
    "lot": "📦 Lot yaratdi",
    "deal": "💰 Bitim",
    "reject": "❌ Rad etdi",
}


# ══════════════════════════════════════════════
# /tashrif — Main Dashboard
# ══════════════════════════════════════════════

async def tashrif_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show visit dashboard with KPI stats and recent visits"""
    user_id = update.effective_user.id
    today = date.today()

    db = SessionLocal()
    try:
        # Get today's visits
        today_visits = db.query(ShopVisit).filter(
            ShopVisit.user_id == user_id,
            ShopVisit.visit_date == today
        ).order_by(ShopVisit.created_at.desc()).all()

        # Calculate KPI
        kpi = {"visited": 0, "signed": 0, "lots": 0, "deals": 0, "reject": 0}
        for v in today_visits:
            if v.action in kpi:
                kpi[v.action] += 1

        # Build dashboard message
        msg = (
            f"🏪 <b>Fleshka Tashrifi — {today.strftime('%d.%m.%Y')}</b>\n"
            f"{'─' * 32}\n\n"
            f"<b>📊 KPI:</b>\n"
            f"  ✅ Do'konlar:    <b>{kpi['visited']}</b> / {KPI_TARGETS['visited']}\n"
            f"  📝 Ro'yxat:      <b>{kpi['signed']}</b> / {KPI_TARGETS['signed']}\n"
            f"  📦 Yangi lotlar: <b>{kpi['lots']}</b> / {KPI_TARGETS['lots']}\n"
            f"  💰 Bitimlar:     <b>{kpi['deals']}</b> / {KPI_TARGETS['deals']}\n"
            f"  ❌ Rad etgan:    <b>{kpi['reject']}</b>\n\n"
        )

        if today_visits:
            msg += f"<b>📋 So'nggi tashriflar ({len(today_visits)}):</b>\n"
            for v in today_visits[:10]:
                action_emoji = ACTION_LABELS.get(v.action, v.action).split(" ")[0]
                msg += f"  {action_emoji} <b>{v.shop_name[:25]}</b>\n"
        else:
            msg += "Hali tashriflar yo'q. Kunni boshlang!\n"

        msg += f"\n{'─' * 32}\n🌐 <a href='{WEB_URL}/fleshka-checklist'>Web sahifa</a>"

        keyboard = [
            [InlineKeyboardButton("✅ Tashrif qo'shish", callback_data="visit_add")],
            [InlineKeyboardButton("📊 KPI batafsil", callback_data="visit_kpi")],
            [InlineKeyboardButton("📋 Checklist", callback_data="visit_checklist")],
            [InlineKeyboardButton("🌐 Web sahifa", url=f"{WEB_URL}/fleshka-checklist")],
            [InlineKeyboardButton("🏪 Do'kon menyusi", callback_data="visit_menu")],
        ]

        await update.message.reply_html(
            msg,
            reply_markup=InlineKeyboardMarkup(keyboard),
            disable_web_page_preview=True,
        )

    except Exception as e:
        logger.error(f"Tashrif error: {e}", exc_info=True)
        await update.message.reply_text(
            "😔 Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
        )
    finally:
        db.close()


# ══════════════════════════════════════════════
# Callback handlers
# ══════════════════════════════════════════════

async def visit_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle visit dashboard callback buttons"""
    query = update.callback_query
    await query.answer()
    data = query.data

    if data == "visit_add":
        # Start add visit conversation
        await query.edit_message_text(
            "🏪 <b>Yangi tashrif qo'shish</b>\n\n"
            "Do'kon nomini yozing:",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("❌ Bekor qilish", callback_data="visit_cancel_add")],
            ])
        )
        return VISIT_SHOP_NAME

    elif data == "visit_kpi":
        # Show detailed KPI
        await show_kpi_detail(query, update.effective_user.id)

    elif data == "visit_checklist":
        await show_checklist(query)

    elif data == "visit_menu":
        # Go back to dokon menu
        await query.edit_message_text(
            "🏪 Do'kon menyusiga qaytdingiz.\n\n"
            "/tashrif — tashrif dashboard\n"
            "/dokon — do'kon rejimi",
            reply_markup=dokon_main_menu_keyboard(),
        )

    elif data == "visit_cancel_add":
        await query.edit_message_text(
            "❌ Tashrif qo'shish bekor qilindi.\n\n"
            "Qayta boshlash: /tashrif"
        )


async def show_kpi_detail(query, user_id):
    """Show detailed KPI breakdown"""
    today = date.today()
    db = SessionLocal()
    try:
        all_visits = db.query(ShopVisit).filter(
            ShopVisit.user_id == user_id,
            ShopVisit.visit_date == today
        ).all()

        kpi = {"visited": 0, "signed": 0, "lots": 0, "deals": 0, "reject": 0}
        for v in all_visits:
            if v.action in kpi:
                kpi[v.action] += 1

        msg = (
            "📊 <b>KPI batafsil</b>\n"
            f"{'─' * 32}\n\n"
        )

        targets = [
            ("✅ Do'konlar", "visited", 30, "🇺"),
            ("📝 Ro'yxatdan o'tgan", "signed", 10, "🇺"),
            ("📦 Yangi lotlar", "lots", 5, "🇺"),
            ("💰 Bitimlar", "deals", 2, "💰"),
            ("❌ Rad etgan", "reject", None, "🇺"),
        ]

        for label, key, target, emoji in targets:
            current = kpi.get(key, 0)
            bar_len = 16
            if target:
                ratio = min(current / target, 1.0)
                filled = round(ratio * bar_len)
                bar = "█" * filled + "░" * (bar_len - filled)
                pct = round(ratio * 100)
                msg += f"  {label}: <b>{current}/{target}</b> ({pct}%)\n"
                msg += f"  {bar}\n\n"
            else:
                msg += f"  {label}: <b>{current}</b>\n\n"

        msg += f"{'─' * 32}\n/tashrif — orqaga"

        await query.edit_message_text(
            msg,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("⬅️ Orqaga", callback_data="visit_back")],
            ])
        )
    finally:
        db.close()


async def show_checklist(query):
    """Show checklist summary"""
    checklist_text = (
        "📋 <b>Fleshka Tashrif Checklist</b>\n"
        f"{'─' * 32}\n\n"
        "<b>🔧 Tayyorgarlik (10):</b>\n"
        "  • Vizitkalar (50 dona)\n"
        "  • QR stikerlar (30 dona)\n"
        "  • Powerbank + zaryad\n"
        "  • Pitch skript yod\n"
        "  • Bot tekshirish\n"
        "  • Web sahifa tekshirish\n"
        "  • Namuna lot tayyor\n"
        "  • Yengil kiyim\n"
        "  • Bloknot + ruchka\n"
        "  • Brend kiyim\n\n"
        "<b>🏪 Bozorda (10):</b>\n"
        "  • Salom + tabassum\n"
        "  • Pitch aytish\n"
        "  • Vizitka + QR berish\n"
        "  • Do'kon nomini yozish\n"
        "  • Mahsulotlarni o'rganish\n"
        "  • Deadstock so'rash\n"
        "  • Uzum komissiyasi so'rash\n"
        "  • Bot orqali ro'yxat taklif\n"
        "  • Joyida ro'yxatdan o'tkazish\n"
        "  • Telegram follow-up\n\n"
        "<b>📞 Tashrifdan keyin (6):</b>\n"
        "  • KPI yangilash\n"
        "  • Follow-up xabar\n"
        "  • Ro'yxat tuzish\n"
        "  • Lotlarni tekshirish\n"
        "  • Ijtimoiy tarmoqlar\n"
        "  • 2-kun rejasi\n\n"
        f"{'─' * 32}\n"
        f"🌐 <a href='{WEB_URL}/fleshka-checklist'>Web'da to'liq checklist</a>"
    )

    await query.edit_message_text(
        checklist_text,
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("⬅️ Orqaga", callback_data="visit_back")],
        ]),
        disable_web_page_preview=True,
    )


# ══════════════════════════════════════════════
# Add visit conversation
# ══════════════════════════════════════════════

async def visit_get_shop_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Receive shop name → choose action"""
    shop_name = update.message.text.strip()
    if len(shop_name) < 2:
        await update.message.reply_text(
            "❌ Do'kon nomi juda qisqa (kamida 2 belgi). Qaytadan yozing:"
        )
        return VISIT_SHOP_NAME

    context.user_data["visit_shop_name"] = shop_name[:100]

    action_keyboard = [
        [InlineKeyboardButton("✅ Tashrif qildim", callback_data="visit_act_visited")],
        [InlineKeyboardButton("📝 Ro'yxatdan o'tdi", callback_data="visit_act_signed")],
        [InlineKeyboardButton("📦 Lot yaratdi", callback_data="visit_act_lot")],
        [InlineKeyboardButton("💰 Bitim tuzdi", callback_data="visit_act_deal")],
        [InlineKeyboardButton("❌ Rad etdi", callback_data="visit_act_reject")],
        [InlineKeyboardButton("🔙 Bekor qilish", callback_data="visit_cancel_add")],
    ]

    await update.message.reply_text(
        f"🏪 <b>{shop_name[:50]}</b>\n\n"
        f"Nima bo'ldi?",
        reply_markup=InlineKeyboardMarkup(action_keyboard),
    )
    return VISIT_ACTION


async def visit_save_action(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Save the visit to database"""
    query = update.callback_query
    await query.answer()

    action = query.data.replace("visit_act_", "")
    if action not in ACTION_LABELS:
        await query.edit_message_text("❌ Noto'g'ri tanlov. Qaytadan:")
        return VISIT_ACTION

    shop_name = context.user_data.get("visit_shop_name", "Noma'lum")
    user_id = update.effective_user.id
    today = date.today()

    db = SessionLocal()
    try:
        visit = ShopVisit(
            user_id=user_id,
            shop_name=shop_name,
            action=action,
            visit_date=today,
        )
        db.add(visit)
        db.commit()

        # Get updated KPI for confirmation
        today_visits = db.query(ShopVisit).filter(
            ShopVisit.user_id == user_id,
            ShopVisit.visit_date == today
        ).count()

        action_emoji = ACTION_LABELS.get(action, action).split(" ")[0]

        await query.edit_message_text(
            f"✅ <b>Tashrif qo'shildi!</b>\n"
            f"{'─' * 32}\n"
            f"  🏪 Do'kon: <b>{shop_name[:40]}</b>\n"
            f"  {action_emoji} Holat: <b>{ACTION_LABELS.get(action, action)}</b>\n"
            f"  📊 Kunlik tashrif: <b>{today_visits}</b>\n"
            f"{'─' * 32}\n\n"
            f"Yana tashrif qo'shish uchun /tashrif ni bosing.",
            reply_markup=dokon_main_menu_keyboard(),
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Visit save error: {e}", exc_info=True)
        await query.edit_message_text("😔 Xatolik yuz berdi.")
    finally:
        db.close()

    context.user_data.pop("visit_shop_name", None)
    return ConversationHandler.END


async def visit_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel add visit"""
    context.user_data.pop("visit_shop_name", None)
    await update.message.reply_text(
        "❌ Tashrif qo'shish bekor qilindi.\n\n"
        "/tashrif — dashboard",
        reply_markup=dokon_main_menu_keyboard(),
    )
    return ConversationHandler.END


# ══════════════════════════════════════════════
# Conversation handler definition
# ══════════════════════════════════════════════

tashrif_conv = ConversationHandler(
    entry_points=[CallbackQueryHandler(visit_callback, pattern="^visit_add$")],
    states={
        VISIT_SHOP_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, visit_get_shop_name)],
        VISIT_ACTION: [CallbackQueryHandler(visit_save_action, pattern="^visit_act_")],
    },
    fallbacks=[
        CommandHandler("cancel", visit_cancel),
        CommandHandler("tashrif", tashrif_start),
        CallbackQueryHandler(visit_callback, pattern="^visit_cancel_add$"),
    ],
    name="tashrif_visit",
)

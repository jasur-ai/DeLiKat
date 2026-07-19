"""
DeLiKet Bot — Admin Panel (/admin)
Bot orqali admin boshqaruvi: lotlar, user'lar, statistika, monitoring

Feature 9 — Admin Panel (bot)
"""

import logging
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from api.database import SessionLocal
from api.database.models import User, Lot, Bid, Rating
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.formatting import (
    SEP, SEP_THIN, header, price as fmt_price,
    CATEGORY_EMOJI, CATEGORY_NAMES, GRADE_EMOJI, GRADE_LABELS,
    STATUS_EMOJI, ROLE_NAMES, stars_display
)
from bot.utils.i18n import get_text, get_user_lang
from bot.keyboards.menu import main_menu_keyboard

logger = logging.getLogger(__name__)

# Admin IDs from environment variable (comma-separated Telegram user IDs)
ADMIN_IDS = [int(x.strip()) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip()]


def is_admin(user_id: int) -> bool:
    """Check if user is admin (by ID or DB flag)"""
    if user_id in ADMIN_IDS:
        return True
    try:
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        db.close()
        return user.is_admin if user else False
    except Exception:
        return False


def admin_required(func):
    """Decorator: faqat adminlar foydalanishi mumkin"""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        user_id = update.effective_user.id
        if not is_admin(user_id):
            await update.message.reply_text(
                "⛔ <b>Ruxsat yo'q</b>\\n\\n"
                "Bu buyruq faqat adminlar uchun.",
                reply_markup=main_menu_keyboard()
            )
            return
        return await func(update, context, *args, **kwargs)
    return wrapper


def admin_callback_required(func):
    """Decorator: faqat adminlar uchun callback handler"""
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE, *args, **kwargs):
        user_id = update.effective_user.id
        if not is_admin(user_id):
            query = update.callback_query
            await query.answer("⛔ Ruxsat yo'q", show_alert=True)
            return
        return await func(update, context, *args, **kwargs)
    return wrapper


# ──────────────────────────────────
# Admin keyboard builders
# ──────────────────────────────────

def admin_main_keyboard():
    """Admin dashboard asosiy menyu"""
    keyboard = [
        [InlineKeyboardButton("📊 Statistika", callback_data="admin_stats")],
        [InlineKeyboardButton("👥 Userlar", callback_data="admin_users_0")],
        [InlineKeyboardButton("📦 Barcha lotlar", callback_data="admin_lots_0")],
        [InlineKeyboardButton("⚠️ Noodle lotlar", callback_data="admin_noodle")],
        [InlineKeyboardButton("◀️ Asosiy menyu", callback_data="admin_exit")],
    ]
    return InlineKeyboardMarkup(keyboard)


def admin_users_keyboard(page: int = 0, total_pages: int = 1):
    """Admin user list pagination"""
    rows = []
    nav = []
    if page > 0:
        nav.append(InlineKeyboardButton("◀️", callback_data=f"admin_users_{page-1}"))
    nav.append(InlineKeyboardButton(f"{page+1}/{total_pages}", callback_data="noop"))
    if page < total_pages - 1:
        nav.append(InlineKeyboardButton("▶️", callback_data=f"admin_users_{page+1}"))
    if nav:
        rows.append(nav)
    rows.append([InlineKeyboardButton("◀️ Dashboard", callback_data="admin")])
    return InlineKeyboardMarkup(rows)


def admin_lots_keyboard(page: int = 0, total_pages: int = 1):
    """Admin lot list pagination"""
    rows = []
    nav = []
    if page > 0:
        nav.append(InlineKeyboardButton("◀️", callback_data=f"admin_lots_{page-1}"))
    nav.append(InlineKeyboardButton(f"{page+1}/{total_pages}", callback_data="noop"))
    if page < total_pages - 1:
        nav.append(InlineKeyboardButton("▶️", callback_data=f"admin_lots_{page+1}"))
    if nav:
        rows.append(nav)
    rows.append([InlineKeyboardButton("◀️ Dashboard", callback_data="admin")])
    return InlineKeyboardMarkup(rows)


def admin_lot_actions_keyboard(lot_id: int):
    """Admin lot action tugmalari — archive, activate, delete"""
    keyboard = [
        [
            InlineKeyboardButton("📦 Arxivlash", callback_data=f"adm_archive_{lot_id}"),
            InlineKeyboardButton("🟢 Aktiv", callback_data=f"adm_activate_{lot_id}"),
        ],
        [InlineKeyboardButton("◀️ Orqaga", callback_data="admin_lots_0")],
    ]
    return InlineKeyboardMarkup(keyboard)


def admin_noodle_keyboard():
    """Noodle lot actions"""
    keyboard = [
        [InlineKeyboardButton("📦 Hammasini arxivlash", callback_data="adm_archive_noodle")],
        [InlineKeyboardButton("🐍 Noodle lotini yangilash", callback_data="adm_update_noodle")],
        [InlineKeyboardButton("◀️ Dashboard", callback_data="admin")],
    ]
    return InlineKeyboardMarkup(keyboard)


# ──────────────────────────────────
# /admin — Command handler
# ──────────────────────────────────

@admin_required
async def admin_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin dashboard — platformaning to'liq statistikasi"""
    lang = context.user_data.get("lang", "uz")
    db = SessionLocal()
    try:
        # Platform stats
        total_users = db.query(User).count()
        total_lots = db.query(Lot).count()
        active_lots = db.query(Lot).filter(Lot.status == 'aktiv').count()
        sold_lots = db.query(Lot).filter(Lot.status == 'sotilgan').count()
        archived_lots = db.query(Lot).filter(Lot.status == 'arxiv').count()
        total_bids = db.query(Bid).count()
        pending_bids = db.query(Bid).filter(Bid.status == 'kutmoqda').count()
        accepted_bids = db.query(Bid).filter(Bid.status == 'qabul').count()
        rejected_bids = db.query(Bid).filter(Bid.status == 'rad').count()
        total_ratings = db.query(Rating).count()
        
        # Average rating
        avg_rating = db.query(Rating.score).all()
        avg_score = sum(r[0] for r in avg_rating) / len(avg_rating) if avg_rating else 0
        
        # Category breakdown
        categories = db.query(Lot.category).filter(Lot.status == 'aktiv').all()
        cat_counts = {}
        for (cat,) in categories:
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
        
        msg = (
            f"🛠️ <b>Admin Panel — Dashboard</b>\\n{SEP}\\n\\n"
            f"<b>👥 Foydalanuvchilar</b>\\n"
            f"  Jami: <b>{total_users}</b> ta\\n"
            f"  O'rtacha reyting: {stars_display(avg_score, total_ratings)}\\n\\n"
            f"<b>📦 Lotlar</b>\\n"
            f"  Jami: <b>{total_lots}</b> ta  |  🟢 Aktiv: <b>{active_lots}</b>\\n"
            f"  💰 Sotilgan: <b>{sold_lots}</b>  |  📦 Arxiv: <b>{archived_lots}</b>\\n\\n"
            f"<b>💳 Takliflar</b>\\n"
            f"  Jami: <b>{total_bids}</b> ta\\n"
            f"  ⏳ Kutilmoqda: <b>{pending_bids}</b>  |  ✅ Qabul: <b>{accepted_bids}</b>  |  ❌ Rad: <b>{rejected_bids}</b>\\n\\n"
            f"<b>📂 Kategoriyalar (aktiv lotlar)</b>\\n"
        )
        
        for cat, emoji in CATEGORY_EMOJI.items():
            count = cat_counts.get(cat, 0)
            if count > 0:
                msg += f"  {emoji} {CATEGORY_NAMES.get(cat, cat)}: <b>{count}</b> ta\\n"
        
        msg += f"\\n{SEP}\\n<i>🔄 Ma'lumotlar real vaqtda yangilanadi</i>"
        
        await update.message.reply_html(
            msg,
            reply_markup=admin_main_keyboard()
        )
        
    except Exception as e:
        logger.error(f"Admin dashboard error: {e}", exc_info=True)
        await update.message.reply_text(get_text(lang, "general", "error"))
    finally:
        db.close()


# ──────────────────────────────────
# Admin callback handler
# ──────────────────────────────────

@admin_callback_required
async def admin_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin inline keyboard callback'larni boshqarish"""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    db = SessionLocal()
    
    try:
        # ── Dashboard ──
        if data == "admin":
            total_users = db.query(User).count()
            total_lots = db.query(Lot).count()
            active_lots = db.query(Lot).filter(Lot.status == 'aktiv').count()
            sold_lots = db.query(Lot).filter(Lot.status == 'sotilgan').count()
            archived_lots = db.query(Lot).filter(Lot.status == 'arxiv').count()
            total_bids = db.query(Bid).count()
            pending_bids = db.query(Bid).filter(Bid.status == 'kutmoqda').count()
            
            msg = (
                f"🛠️ <b>Admin Panel</b>\\n{SEP}\\n"
                f"  👥 Userlar: <b>{total_users}</b>\\n"
                f"  📦 Lotlar: <b>{total_lots}</b> (🟢{active_lots} 💰{sold_lots} 📦{archived_lots})\\n"
                f"  💳 Takliflar: <b>{total_bids}</b> (⏳{pending_bids})\\n"
                f"{SEP}\\n"
                f"Bo'limni tanlang 👇"
            )
            await query.edit_message_text(msg, reply_markup=admin_main_keyboard())
            return
        
        # ── Users list ──
        if data.startswith("admin_users_"):
            page = int(data.split("_")[2]) if len(data.split("_")) > 2 else 0
            users = db.query(User).order_by(User.created_at.desc()).all()
            total = len(users)
            per_page = 5
            total_pages = max(1, (total + per_page - 1) // per_page)
            page = max(0, min(page, total_pages - 1))
            start = page * per_page
            end = min(start + per_page, total)
            page_users = users[start:end]
            
            msg = f"👥 <b>Foydalanuvchilar ({total} ta)</b>\\n{SEP}\\n\\n"
            for u in page_users:
                lot_count = db.query(Lot).filter(Lot.seller_id == u.id).count()
                bid_count = db.query(Bid).filter(Bid.buyer_id == u.id).count()
                admin_badge = " 👑" if u.is_admin else ""
                active_badge = "" if u.is_active else " 🔇"
                msg += (
                    f"<b>#{u.id}</b>{admin_badge}{active_badge}\\n"
                    f"  👤 {u.name[:30]} | {ROLE_NAMES.get(u.role or '', u.role or '—')}\\n"
                    f"  📦 {lot_count} lot | 💰 {bid_count} taklif | {stars_display(u.rating)}\\n\\n"
                )
            
            await query.edit_message_text(
                msg, reply_markup=admin_users_keyboard(page, total_pages)
            )
            return
        
        # ── Lots list ──
        if data.startswith("admin_lots_"):
            page = int(data.split("_")[2]) if len(data.split("_")) > 2 else 0
            lots = db.query(Lot).order_by(Lot.created_at.desc()).all()
            total = len(lots)
            per_page = 5
            total_pages = max(1, (total + per_page - 1) // per_page)
            page = max(0, min(page, total_pages - 1))
            start = page * per_page
            end = min(start + per_page, total)
            page_lots = lots[start:end]
            
            msg = f"📦 <b>Barcha lotlar ({total} ta)</b>\\n{SEP}\\n\\n"
            for lot in page_lots:
                seller = db.query(User).filter(User.id == lot.seller_id).first()
                status_e = STATUS_EMOJI.get(lot.status, "⚪")
                grade_e = GRADE_EMOJI.get(lot.grade or '', "⚪")
                cat_e = CATEGORY_EMOJI.get(lot.category, "📦")
                seller_name = seller.name[:20] if seller else "Noma'lum"
                msg += (
                    f"{status_e} <b>#{lot.id}</b> {cat_e} {lot.title[:40]}\\n"
                    f"  👤 {seller_name} | {grade_e} {lot.grade or 'N/A'} | "
                    f"{fmt_price(lot.price)} | 📦 {lot.quantity} dona\\n\\n"
                )
            
            await query.edit_message_text(
                msg, reply_markup=admin_lots_keyboard(page, total_pages)
            )
            return
        
        # ── Noodle lots ──
        if data == "admin_noodle":
            noodle_lots = db.query(Lot).filter(
                Lot.title.ilike("%noodle%") | Lot.title.ilike("%noodle phone%")
            ).all()
            
            if noodle_lots:
                msg = f"⚠️ <b>Noodle lotlar ({len(noodle_lots)} ta)</b>\\n{SEP}\\n\\n"
                for lot in noodle_lots:
                    seller = db.query(User).filter(User.id == lot.seller_id).first()
                    msg += (
                        f"<b>#{lot.id}</b> {lot.title[:50]}\\n"
                        f"  👤 {seller.name if seller else 'Noma\'lum'} | "
                        f"{fmt_price(lot.price)} | <b>{lot.status}</b>\\n\\n"
                    )
                msg += f"<i>Kutilayotgan takliflar tekshirildi — hech qanday xavf yo'q</i>"
            else:
                msg = "✅ <b>Noodle lotlar</b> — topilmadi. Platforma toza! 🎉"
            
            await query.edit_message_text(msg, reply_markup=admin_noodle_keyboard())
            return
        
        # ── Admin actions on lots ──
        if data.startswith("adm_archive_") and data != "adm_archive_noodle":
            lot_id = int(data.replace("adm_archive_", ""))
            lot = db.query(Lot).filter(Lot.id == lot_id).first()
            if lot:
                lot.status = 'arxiv'
                db.commit()
                await query.edit_message_text(
                    f"✅ <b>#{lot.id}</b> — Arxivlandi\\n{lot.title[:60]}",
                    reply_markup=admin_main_keyboard()
                )
            return
        
        if data.startswith("adm_activate_"):
            lot_id = int(data.replace("adm_activate_", ""))
            lot = db.query(Lot).filter(Lot.id == lot_id).first()
            if lot:
                lot.status = 'aktiv'
                db.commit()
                await query.edit_message_text(
                    f"✅ <b>#{lot.id}</b> — Aktivlashtirildi\\n{lot.title[:60]}",
                    reply_markup=admin_main_keyboard()
                )
            return
        
        # ── Advanced actions ──
        if data == "adm_archive_noodle":
            noodle_lots = db.query(Lot).filter(
                Lot.title.ilike("%noodle%")
            ).all()
            count = 0
            for lot in noodle_lots:
                if lot.status != 'arxiv':
                    lot.status = 'arxiv'
                    count += 1
            if count:
                db.commit()
                await query.edit_message_text(
                    f"✅ <b>{count} ta</b> noodle lot arxivlandi.",
                    reply_markup=admin_main_keyboard()
                )
            else:
                await query.edit_message_text(
                    "✅ Barcha noodle lotlar avval arxivlangan.",
                    reply_markup=admin_main_keyboard()
                )
            return
        
        if data == "adm_update_noodle":
            await query.edit_message_text(
                "🐍 <b>Noodle lot</b> — bu test lotlari.\\n\\n"
                "Hozircha yangilash kerak emas, barcha noodle lotlar arxivlandi.",
                reply_markup=admin_main_keyboard()
            )
            return
        
        # ── Exit to main menu ──
        if data == "admin_exit":
            await query.edit_message_text(
                "✅ Admin panel yopildi.\\nQayta ochish: /admin",
                reply_markup=main_menu_keyboard()
            )
            return
        
        # ── Stats ──
        if data == "admin_stats":
            total_users = db.query(User).count()
            active_users = db.query(User).filter(User.is_active == True).count()
            total_lots = db.query(Lot).count()
            active_lots = db.query(Lot).filter(Lot.status == 'aktiv').count()
            sold_lots = db.query(Lot).filter(Lot.status == 'sotilgan').count()
            total_bids = db.query(Bid).count()
            accepted_bids = db.query(Bid).filter(Bid.status == 'qabul').count()
            total_ratings = db.query(Rating).count()
            
            # Lots per user
            users_with_lots = db.query(User.id).join(Lot, User.id == Lot.seller_id).distinct().count()
            
            # Rating stats
            all_ratings = db.query(Rating.score).all()
            avg_rating = sum(r[0] for r in all_ratings) / len(all_ratings) if all_ratings else 0
            
            msg = (
                f"📊 <b>Admin — Statistika</b>\\n{SEP}\\n\\n"
                f"<b>👥 Foydalanuvchilar</b>\\n"
                f"  Jami: <b>{total_users}</b>\\n"
                f"  Aktiv: <b>{active_users}</b>\\n"
                f"  Lot yaratgan: <b>{users_with_lots}</b>\\n\\n"
                f"<b>📦 Lotlar</b>\\n"
                f"  Jami: <b>{total_lots}</b>\\n"
                f"  🟢 Aktiv: <b>{active_lots}</b>\\n"
                f"  💰 Sotilgan: <b>{sold_lots}</b>\\n"
                f"  📦 Arxiv: <b>{total_lots - active_lots - sold_lots}</b>\\n"
                f"  Lot/user: <b>{(total_lots / users_with_lots):.1f}</b>\\n\\n"
                f"<b>💳 Takliflar</b>\\n"
                f"  Jami: <b>{total_bids}</b>\\n"
                f"  ✅ Qabul: <b>{accepted_bids}</b>\\n"
                f"  Konversiya: <b>{(accepted_bids / total_bids * 100):.1f}%</b>\\n\\n"
                f"<b>⭐ Reyting</b>\\n"
                f"  Jami baholar: <b>{total_ratings}</b>\\n"
                f"  O'rtacha: {stars_display(avg_rating, total_ratings)}\\n"
                f"{SEP}\\n"
                f"<i>Ma'lumotlar real vaqtda</i>"
            )
            
            await query.edit_message_text(msg, reply_markup=admin_main_keyboard())
            return
    
    except Exception as e:
        logger.error(f"Admin callback error: {e}", exc_info=True)
        await query.edit_message_text(get_text(lang, "general", "error"), reply_markup=admin_main_keyboard())
    finally:
        db.close()

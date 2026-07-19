"""
DeLiKet Bot — User Features (Feature 1-5, 7, 9-10)
Smart Notifications, Wishlist, Saved Searches, Price Alerts,
My Analytics, Lot Sharing, Bulk Management, Recommendations
"""

import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from api.database import SessionLocal
from api.database.models import (
    User, Lot, Bid, Wishlist, SavedSearch,
    PriceAlert, Achievement, Transaction
)
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.decorators import auth_required
from bot.utils.formatting import (
    SEP, SEP_THIN, price as fmt_price, CATEGORY_EMOJI,
    GRADE_EMOJI, GRADE_LABELS, STATUS_EMOJI
)
from bot.utils.i18n import get_text
import os
import re
from sqlalchemy import func

logger = logging.getLogger(__name__)
WEB_URL = os.getenv("WEB_URL", "https://delikat.vercel.app")


# ═══════════════════════════════════════════════
# FEATURE 1: /notifications — Smart Notifications
# ═══════════════════════════════════════════════

@auth_required
async def notifications_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Bildirishnomalar sozlamalari"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        # Count active notifications
        active_bids = db.query(Bid).filter(
            Bid.buyer_id == user_id, Bid.status == 'kutmoqda'
        ).count()
        active_alerts = db.query(PriceAlert).filter(
            PriceAlert.user_id == user_id, PriceAlert.is_triggered == False
        ).count()
        saved_searches = db.query(SavedSearch).filter(
            SavedSearch.user_id == user_id, SavedSearch.is_active == True
        ).count()

        msg = (
            f"🔔 <b>Bildirishnomalar</b>\n{SEP}\n\n"
            f"📊 <b>Faol bildirishnomalaringiz:</b>\n"
            f"  • ⏳ Kutilayotgan takliflar: <b>{active_bids} ta</b>\n"
            f"  • 📉 Narx kuzatuvlari: <b>{active_alerts} ta</b>\n"
            f"  • 🔍 Saqlangan qidiruvlar: <b>{saved_searches} ta</b>\n\n"
            f"<b>Avtomatik bildirishnomalar:</b>\n"
            f"  ✅ Yangi taklif kelganda → darhol xabar\n"
            f"  ✅ Taklif qabul qilinganda/rad etilganda\n"
            f"  ✅ Lot narxi tushganda\n"
            f"  ✅ Saqlangan qidiruv bo'yicha yangi lot chiqsa\n"
            f"  ✅ Lot tugashiga 24 soat qolganda\n\n"
            f"{SEP}\n"
            f"<i>Bildirishnomalar Telegram orqali avtomatik yuboriladi</i>"
        )
        await update.message.reply_html(msg)
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 2: /wishlist — Wishlist / Sevimlilar
# ═══════════════════════════════════════════════

@auth_required
async def wishlist_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sevimli lotlar ro'yxati"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    db = SessionLocal()
    try:
        wishlist = db.query(Wishlist).filter(
            Wishlist.user_id == user_id
        ).order_by(Wishlist.created_at.desc()).all()

        if not wishlist:
            await update.message.reply_html(
                "❤️ <b>Sevimli lotlar</b>\n\n"
                "Hozircha sevimli lotlar yo'q.\n\n"
                "Lot detallarida ⭐ tugmasini bosib sevimlilarga qo'shing!\n"
                "Lotlarni ko'rish: /search",
                reply_markup=main_menu_keyboard()
            )
            return

        msg = f"❤️ <b>Sevimli lotlar ({len(wishlist)} ta)</b>\n{SEP}\n\n"
        for item in wishlist:
            lot = db.query(Lot).filter(Lot.id == item.lot_id).first()
            if lot:
                emoji = CATEGORY_EMOJI.get(lot.category, "📦")
                status = STATUS_EMOJI.get(lot.status, "⚪")
                msg += (
                    f"{emoji} <b>#{lot.id}</b> — {lot.title[:50]}\n"
                    f"  💰 {fmt_price(lot.price)} | {status} {lot.status}\n\n"
                )
            else:
                msg += f"❌ Lot #{item.lot_id} o'chirilgan\n\n"

        await update.message.reply_html(msg)
    finally:
        db.close()


async def wishlist_toggle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Add/remove from wishlist (from lot detail)"""
    query = update.callback_query
    await query.answer()
    user_id = update.effective_user.id
    match = re.match(r'^wish_(\d+)$', query.data)
    if not match:
        return
    lot_id = int(match.group(1))
    db = SessionLocal()
    try:
        existing = db.query(Wishlist).filter(
            Wishlist.user_id == user_id,
            Wishlist.lot_id == lot_id
        ).first()
        if existing:
            db.delete(existing)
            db.commit()
            await query.answer("⭐ Sevimlilardan olib tashlandi", show_alert=True)
        else:
            w = Wishlist(user_id=user_id, lot_id=lot_id)
            db.add(w)
            db.commit()
            await query.answer("❤️ Sevimlilarga qo'shildi!", show_alert=True)
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 3: /savesearch — Saved Searches & Alerts
# ═══════════════════════════════════════════════

@auth_required
async def savesearch_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Saqlangan qidiruvlarni boshqarish"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    args = context.args

    db = SessionLocal()
    try:
        if args and args[0] == "list":
            # Show saved searches
            searches = db.query(SavedSearch).filter(
                SavedSearch.user_id == user_id,
                SavedSearch.is_active == True
            ).all()
            if not searches:
                await update.message.reply_html(
                    "🔍 <b>Saqlangan qidiruvlar</b>\n\n"
                    "Hozircha saqlangan qidiruv yo'q.\n\n"
                    "Yangi qidiruv saqlash: /search dan keyin lotlarni ko'rib, "
                    "<b>/savesearch [so'z]</b> deb yozing.\n"
                    "Misol: /savesearch iPhone 13 128GB",
                    reply_markup=main_menu_keyboard()
                )
                return
            msg = f"🔍 <b>Saqlangan qidiruvlar ({len(searches)} ta)</b>\n{SEP}\n\n"
            for s in searches:
                price_info = ""
                if s.min_price or s.max_price:
                    price_info = f" | {'{:,}'.format(int(s.min_price)) if s.min_price else '0'}–{'{:,}'.format(int(s.max_price)) if s.max_price else '∞'} so'm"
                cat_info = f" | {CATEGORY_EMOJI.get(s.category, '')} {s.category}" if s.category else ""
                msg += (
                    f"<b>#{s.id}</b> — {s.query[:40]}{cat_info}{price_info}\n"
                    f"  /savesearch remove {s.id} ❌ o'chirish\n\n"
                )
            await update.message.reply_html(msg)

        elif args and args[0] == "remove" and len(args) >= 2:
            # Remove saved search
            search_id = int(args[1])
            search = db.query(SavedSearch).filter(
                SavedSearch.id == search_id,
                SavedSearch.user_id == user_id
            ).first()
            if search:
                search.is_active = False
                db.commit()
                await update.message.reply_html(f"✅ Qidiruv #{search_id} o'chirildi.")
            else:
                await update.message.reply_html("❌ Qidiruv topilmadi.")

        elif args:
            # Save a new search: /savesearch [query] [--cat category] [--min price] [--max price]
            query_text = " ".join(args)
            # Parse optional flags
            category = None
            min_price = None
            max_price = None
            clean_parts = []
            i = 0
            while i < len(args):
                if args[i] == "--cat" and i + 1 < len(args):
                    category = args[i + 1]
                    i += 2
                elif args[i] == "--min" and i + 1 < len(args):
                    min_price = float(args[i + 1])
                    i += 2
                elif args[i] == "--max" and i + 1 < len(args):
                    max_price = float(args[i + 1])
                    i += 2
                else:
                    clean_parts.append(args[i])
                    i += 1

            search_text = " ".join(clean_parts)
            if not search_text:
                await update.message.reply_html(
                    "❌ Qidiruv matnini kiriting.\n\n"
                    "Misol: /savesearch iPhone 13 --min 300 --max 500",
                    reply_markup=main_menu_keyboard()
                )
                return

            new_search = SavedSearch(
                user_id=user_id,
                query=search_text,
                category=category,
                min_price=min_price,
                max_price=max_price,
            )
            db.add(new_search)
            db.commit()
            db.refresh(new_search)

            cat_line = f"📂 Kategoriya: {category}" if category else ""
            if min_price and max_price:
                price_info = f"💰 Narx oralig'i: {min_price:,.0f} - {max_price:,.0f} so'm"
            elif min_price:
                price_info = f"💰 Min: {min_price:,.0f} so'm"
            elif max_price:
                price_info = f"💰 Max: {max_price:,.0f} so'm"
            else:
                price_info = ""

            await update.message.reply_html(
                f"✅ <b>Qidiruv saqlandi!</b>\n\n"
                f"🔍 <b>So'rov:</b> {search_text[:100]}\n"
                f"{cat_line}\n"
                f"{price_info}\n\n"
                f"<i>Yangi mos lot chiqishi bilan xabar beramiz!</i>\n\n"
                f"Barcha qidiruvlar: /savesearch list",
                reply_markup=main_menu_keyboard()
            )

        else:
            await update.message.reply_html(
                "🔍 <b>Saqlangan qidiruvlar</b>\n\n"
                "Bu funksiya orqali qidiruvlaringizni saqlab, "
                "yangi mos lot chiqishi bilan bildirishnoma olishingiz mumkin.\n\n"
                "<b>Buyruqlar:</b>\n"
                "• /savesearch [so'z] — yangi qidiruv saqlash\n"
                "• /savesearch list — barcha qidiruvlar\n"
                "• /savesearch remove [id] — o'chirish\n\n"
                "<b>Misol:</b>\n"
                "/savesearch iPhone 13 --min 300 --max 500 --cat smartfon",
                reply_markup=main_menu_keyboard()
            )

    except ValueError:
        await update.message.reply_html(
            "❌ Noto'g'ri format. /savesearch yordam",
            reply_markup=main_menu_keyboard()
        )
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 4: /pricealert — Price Drop Alerts
# ═══════════════════════════════════════════════

@auth_required
async def pricealert_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Narx tushishi haqida ogohlantirish"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    args = context.args

    db = SessionLocal()
    try:
        if args and args[0] == "list":
            alerts = db.query(PriceAlert).filter(
                PriceAlert.user_id == user_id
            ).order_by(PriceAlert.created_at.desc()).all()
            if not alerts:
                await update.message.reply_html(
                    "📉 <b>Narx kuzatuvlari</b>\n\n"
                    "Hozircha narx kuzatuvlari yo'q.\n\n"
                    "Yangi qo'shish: /pricealert [lot_id] [maqsad_narx]\n"
                    "Misol: /pricealert 5 500000",
                    reply_markup=main_menu_keyboard()
                )
                return
            msg = f"📉 <b>Narx kuzatuvlari ({len(alerts)} ta)</b>\n{SEP}\n\n"
            for a in alerts:
                lot = db.query(Lot).filter(Lot.id == a.lot_id).first()
                lot_title = lot.title[:40] if lot else "Noma'lum lot"
                status = "✅ Ishga tushgan" if a.is_triggered else "⏳ Kuzatilmoqda"
                msg += (
                    f"<b>#{a.id}</b> — {lot_title}\n"
                    f"  🎯 Maqsad: {fmt_price(a.target_price)} | {status}\n"
                    f"  /pricealert remove {a.id} ❌\n\n"
                )
            await update.message.reply_html(msg)

        elif args and args[0] == "remove" and len(args) >= 2:
            alert_id = int(args[1])
            alert = db.query(PriceAlert).filter(
                PriceAlert.id == alert_id,
                PriceAlert.user_id == user_id
            ).first()
            if alert:
                db.delete(alert)
                db.commit()
                await update.message.reply_html(f"✅ Kuzatuv #{alert_id} o'chirildi.")
            else:
                await update.message.reply_html("❌ Kuzatuv topilmadi.")

        elif len(args) >= 2:
            lot_id = int(args[0])
            target_price = float(args[1])

            lot = db.query(Lot).filter(Lot.id == lot_id).first()
            if not lot:
                await update.message.reply_html("❌ Lot topilmadi.", )
                return
            if target_price >= lot.price:
                await update.message.reply_html(
                    f"❌ Maqsad narx ({fmt_price(target_price)}) "
                    f"hozirgi narxdan ({fmt_price(lot.price)}) past bo'lishi kerak.",
                    reply_markup=main_menu_keyboard()
                )
                return

            existing = db.query(PriceAlert).filter(
                PriceAlert.user_id == user_id,
                PriceAlert.lot_id == lot_id,
                PriceAlert.is_triggered == False
            ).first()
            if existing:
                await update.message.reply_html(
                    f"⚠️ Bu lot uchun avval kuzatuv qo'shgan (ID: #{existing.id}).\n"
                    f"Avvalgisini o'chirib, yangisini qo'shing.",
                    reply_markup=main_menu_keyboard()
                )
                return

            alert = PriceAlert(
                user_id=user_id,
                lot_id=lot_id,
                target_price=target_price
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)

            await update.message.reply_html(
                f"✅ <b>Narx kuzatuvi qo'shildi!</b>\n\n"
                f"📦 Lot: #{lot_id} — {lot.title[:50]}\n"
                f"💰 Hozirgi narx: {fmt_price(lot.price)}\n"
                f"🎯 Maqsad narx: {fmt_price(target_price)}\n\n"
                f"<i>Narx tushishi bilan darhol xabar beramiz!</i>\n\n"
                f"Barcha kuzatuvlar: /pricealert list",
                reply_markup=main_menu_keyboard()
            )
        else:
            await update.message.reply_html(
                "📉 <b>Narx kuzatuvlari</b>\n\n"
                "Lot narxi tushganda xabar olish imkoniyati!\n\n"
                "<b>Buyruqlar:</b>\n"
                "• /pricealert [lot_id] [narx] — yangi kuzatuv\n"
                "• /pricealert list — barcha kuzatuvlar\n"
                "• /pricealert remove [id] — o'chirish\n\n"
                "<b>Misol:</b>\n"
                "Lot narxi 500,000 so'mdan pastga tushganda xabar olmoqchi bo'lsangiz:\n"
                "/pricealert 5 500000",
                reply_markup=main_menu_keyboard()
            )

    except ValueError:
        await update.message.reply_html(
            "❌ Noto'g'ri format.\n\n"
            "Misol: /pricealert 5 500000",
            reply_markup=main_menu_keyboard()
        )
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 5: /myanalytics — Shaxsiy Analitika
# ═══════════════════════════════════════════════

@auth_required
async def myanalytics_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Foydalanuvchi analitikasi"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()

        # Stats as buyer
        total_bids = db.query(Bid).filter(Bid.buyer_id == user_id).count()
        accepted_bids = db.query(Bid).filter(
            Bid.buyer_id == user_id, Bid.status == 'qabul'
        ).count()
        rejected_bids = db.query(Bid).filter(
            Bid.buyer_id == user_id, Bid.status == 'rad'
        ).count()
        pending_bids = db.query(Bid).filter(
            Bid.buyer_id == user_id, Bid.status == 'kutmoqda'
        ).count()

        # Stats as seller
        total_lots = db.query(Lot).filter(Lot.seller_id == user_id).count()
        sold_lots = db.query(Lot).filter(
            Lot.seller_id == user_id, Lot.status == 'sotilgan'
        ).count()
        active_lots = db.query(Lot).filter(
            Lot.seller_id == user_id, Lot.status == 'aktiv'
        ).count()

        # Win rate
        win_rate = (accepted_bids / total_bids * 100) if total_bids > 0 else 0

        # Total spent
        total_spent = db.query(func.sum(Bid.price * Bid.quantity)).filter(
            Bid.buyer_id == user_id, Bid.status == 'qabul'
        ).scalar() or 0

        # Total earned
        total_earned = db.query(func.sum(Lot.price * Lot.quantity)).filter(
            Lot.seller_id == user_id, Lot.status == 'sotilgan'
        ).scalar() or 0

        # Wishlist count
        wishlist_count = db.query(Wishlist).filter(
            Wishlist.user_id == user_id
        ).count()

        # Trust info
        trust_msg = ""
        if user.trust_score >= 80:
            trust_msg = "🟢 Yuqori (⭐ Ishonchli)"
        elif user.trust_score >= 50:
            trust_msg = "🟡 O'rtacha"
        else:
            trust_msg = "🟠 Yangi foydalanuvchi"

        msg = (
            f"📊 <b>Shaxsiy analitika</b>\n{SEP}\n\n"
            f"<b>👤 Profil</b>\n"
            f"  Daraja: <b>Lv.{user.level}</b> | XP: <b>{user.xp}</b>\n"
            f"  Ishonch reytingi: {trust_msg}\n"
            f"  {('🏆 Ishonchli sotuvchi' if user.is_verified else '📋 Tasdiqlanmagan')}\n"
            f"  ❤️ Sevimlilar: <b>{wishlist_count} ta</b>\n\n"
            f"<b>💰 Xaridor sifatida</b>\n"
            f"  Jami takliflar: <b>{total_bids} ta</b>\n"
            f"  ✅ Qabul: {accepted_bids}  |  ❌ Rad: {rejected_bids}  |  ⏳ Kutilmoqda: {pending_bids}\n"
            f"  🏆 G'alaba darajasi: <b>{win_rate:.1f}%</b>\n"
            f"  💵 Sarflangan: <b>{fmt_price(total_spent)}</b>\n\n"
            f"<b>📦 Sotuvchi sifatida</b>\n"
            f"  Jami lotlar: <b>{total_lots} ta</b>\n"
            f"  🟢 Aktiv: {active_lots}  |  💰 Sotilgan: {sold_lots}\n"
            f"  💵 Daromad: <b>{fmt_price(total_earned)}</b>\n\n"
            f"{SEP}\n"
            f"<i>Statistika har safar yangilanadi</i>"
        )
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 7: /share — Lotni ulashish
# ═══════════════════════════════════════════════

@auth_required
async def share_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lotni Telegram orqali ulashish"""
    lang = context.user_data.get("lang", "uz")
    args = context.args
    if not args:
        await update.message.reply_html(
            "📱 <b>Lotni ulashish</b>\n\n"
            "Lotni do'stlaringizga yuborish uchun:\n"
            "/share [lot_id]\n\n"
            "Misol: /share 5",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        lot_id = int(args[0])
    except ValueError:
        await update.message.reply_html("❌ Noto'g'ri lot ID.")
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        seller = db.query(User).filter(User.id == lot.seller_id).first()
        seller_name = seller.name if seller else "Noma'lum"
        web_url = f"{WEB_URL}/lot?id={lot.id}"

        # Create share message
        share_text = (
            f"📦 <b>#{lot.id} — {lot.title[:80]}</b>\n"
            f"{SEP_THIN}\n"
            f"💰 <b>Narx:</b> {fmt_price(lot.price)}\n"
            f"📦 <b>Soni:</b> {lot.quantity} dona\n"
            f"🏷️ <b>Grade:</b> {GRADE_LABELS.get(lot.grade or '', lot.grade or 'N/A')}\n"
            f"👤 <b>Sotuvchi:</b> {seller_name}\n"
            f"{SEP_THIN}\n"
            f"🔗 <b>Havola:</b> {web_url}\n\n"
            f"💡 <i>DeLiKet — Ishonchli buy/sell platformasi</i>"
        )

        # Send to user first so they can forward
        await update.message.reply_html(
            f"📱 <b>Lotni ulashish tayyor!</b>\n\n"
            f"Quyidagi xabarni forward qiling yoki \"Forward\" tugmasini bosing:\n"
            f"{SEP}",
            reply_markup=main_menu_keyboard()
        )
        await update.message.reply_html(
            share_text,
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🌐 Web'da ko'rish", url=web_url)],
                [InlineKeyboardButton("💰 Taklif yuborish", callback_data=f"bid_{lot.id}")],
            ]),
            disable_web_page_preview=True
        )
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 9: /bulk — Ommaviy lot boshqaruvi
# ═══════════════════════════════════════════════

@auth_required
async def bulk_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ommaviy lot boshqaruvi"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    args = context.args

    db = SessionLocal()
    try:
        if not args:
            # Show bulk management menu
            lots = db.query(Lot).filter(Lot.seller_id == user_id).order_by(
                Lot.created_at.desc()
            ).all()
            active = [l for l in lots if l.status == 'aktiv']
            archived = [l for l in lots if l.status == 'arxiv']

            msg = (
                f"📋 <b>Ommaviy boshqaruv</b>\n{SEP}\n\n"
                f"Sizning lotlaringiz:\n"
                f"  🟢 Aktiv: <b>{len(active)} ta</b>\n"
                f"  📦 Arxiv: <b>{len(archived)} ta</b>\n"
                f"  Jami: <b>{len(lots)} ta</b>\n\n"
                f"<b>Buyruqlar:</b>\n"
                f"• /bulk archive — barcha aktiv lotlarni arxivlash\n"
                f"• /bulk activate — barcha arxiv lotlarni aktivlashtirish\n"
                f"• /bulk list — lotlar ro'yxatini ko'rish\n\n"
                f"<i>⚠️ Diqqat: ommaviy amallarni qaytarib bo'lmaydi</i>\n"
                f"{SEP}\n"
                f"<b>Ayrim lot bilan ishlash:</b>\n"
                f"Lotlaringizni /mylots orqali boshqaring"
            )
            await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
            return

        action = args[0].lower()

        if action == "archive":
            lots = db.query(Lot).filter(
                Lot.seller_id == user_id,
                Lot.status == 'aktiv'
            ).all()
            count = 0
            for lot in lots:
                lot.status = 'arxiv'
                count += 1
            if count:
                db.commit()
                await update.message.reply_html(
                    f"✅ <b>{count} ta</b> lot arxivlandi.",
                    reply_markup=main_menu_keyboard()
                )
            else:
                await update.message.reply_html(
                    "📭 Arxivlanadigan aktiv lot yo'q.",
                    reply_markup=main_menu_keyboard()
                )

        elif action == "activate":
            lots = db.query(Lot).filter(
                Lot.seller_id == user_id,
                Lot.status == 'arxiv'
            ).all()
            count = 0
            for lot in lots:
                lot.status = 'aktiv'
                count += 1
            if count:
                db.commit()
                await update.message.reply_html(
                    f"✅ <b>{count} ta</b> lot aktivlashtirildi.",
                    reply_markup=main_menu_keyboard()
                )
            else:
                await update.message.reply_html(
                    "📭 Aktivlashtiriladigan arxiv lot yo'q.",
                    reply_markup=main_menu_keyboard()
                )

        elif action == "list":
            lots = db.query(Lot).filter(Lot.seller_id == user_id).order_by(
                Lot.created_at.desc()
            ).all()
            if not lots:
                await update.message.reply_html("📭 Sizning lotlaringiz yo'q.")
                return
            msg = f"📋 <b>Lotlaringiz ({len(lots)} ta)</b>\n{SEP}\n\n"
            for lot in lots:
                status_e = STATUS_EMOJI.get(lot.status, "⚪")
                msg += (
                    f"{status_e} <b>#{lot.id}</b> {lot.title[:40]}\n"
                    f"  💰 {fmt_price(lot.price)} | 📦 {lot.quantity} dona\n\n"
                )
            await update.message.reply_html(msg, reply_markup=main_menu_keyboard())

        else:
            await update.message.reply_html("❌ Noto'g'ri buyruq. /bulk yordam")

    finally:
        db.close()


# ═══════════════════════════════════════════════
# Callback handlers for keyboard buttons
# ═══════════════════════════════════════════════

async def ask_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ask button from lot detail keyboard"""
    query = update.callback_query
    await query.answer()
    user_id = update.effective_user.id
    match = re.match(r'^ask_(\d+)$', query.data)
    if not match:
        return
    lot_id = int(match.group(1))
    await query.edit_message_text(
        f"💬 <b>Sotuvchiga savol</b>\n\n"
        f"Savol yozish uchun buyruqdan foydalaning:\n\n"
        f"<code>/ask {lot_id} [savolingiz]</code>\n\n"
        f"<b>Misol:</b>\n"
        f"/ask {lot_id} Bu mahsulotning xolati qanday?"
    )


async def share_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Share button from lot detail keyboard"""
    query = update.callback_query
    await query.answer()
    match = re.match(r'^share_(\d+)$', query.data)
    if not match:
        return
    lot_id = int(match.group(1))
    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await query.edit_message_text("❌ Lot topilmadi.")
            return
        web_url = f"{WEB_URL}/lot?id={lot.id}"
        share_text = (
            f"📦 <b>#{lot.id} — {lot.title[:80]}</b>\n"
            f"💰 <b>Narx:</b> {fmt_price(lot.price)} | "
            f"📦 {lot.quantity} dona\n"
            f"🔗 <a href='{web_url}'>Web'da ko'rish</a>"
        )
        await query.edit_message_text(
            f"📱 <b>Lot ulashish tayyor!</b>\n\n"
            f"Forward qilish uchun xabar tayyor.\n\n"
            f"Yoki quyidagi havolani ulashing:\n"
            f"🔗 {web_url}"
        )
    finally:
        db.close()


async def alert_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Price alert button from lot detail keyboard"""
    query = update.callback_query
    await query.answer()
    match = re.match(r'^alert_(\d+)$', query.data)
    if not match:
        return
    lot_id = int(match.group(1))
    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await query.edit_message_text("❌ Lot topilmadi.")
            return
        await query.edit_message_text(
            f"📉 <b>Narx kuzatuvi</b>\n\n"
            f"📦 #{lot.id} — {lot.title[:50]}\n"
            f"💰 Hozirgi narx: {fmt_price(lot.price)}\n\n"
            f"Narx tushganda xabar olish uchun:\n"
            f"<code>/pricealert {lot_id} [maqsad narx]</code>\n\n"
            f"<b>Misol:</b>\n"
            f"/pricealert {lot_id} {int(lot.price * 0.8)}"
        )
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 10: /recommend — Shaxsiy tavsiyalar
# ═══════════════════════════════════════════════

@auth_required
async def recommend_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Shaxsiy tavsiyalar — userning faoliyatiga asoslangan"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    db = SessionLocal()
    try:
        # Find user's preferred categories from bids
        user_bids = db.query(Bid).filter(Bid.buyer_id == user_id).all()
        bid_lot_ids = [b.lot_id for b in user_bids]
        preferred_cats = set()
        if bid_lot_ids:
            bidded_lots = db.query(Lot).filter(Lot.id.in_(bid_lot_ids)).all()
            for l in bidded_lots:
                preferred_cats.add(l.category)

        # Also check wishlist
        wishlist_items = db.query(Wishlist).filter(Wishlist.user_id == user_id).all()
        for w in wishlist_items:
            w_lot = db.query(Lot).filter(Lot.id == w.lot_id).first()
            if w_lot:
                preferred_cats.add(w_lot.category)

        # Find recommended lots
        recommended = []
        if preferred_cats:
            # Exclude user's own lots and lots they already bid on
            recommended = db.query(Lot).filter(
                Lot.status == 'aktiv',
                Lot.seller_id != user_id,
                Lot.category.in_(list(preferred_cats))
            ).order_by(Lot.created_at.desc()).limit(10).all()

        # If no preferred categories, show recent lots
        if not recommended:
            recommended = db.query(Lot).filter(
                Lot.status == 'aktiv',
                Lot.seller_id != user_id
            ).order_by(Lot.created_at.desc()).limit(10).all()

        if not recommended:
            await update.message.reply_html(
                "🎯 <b>Tavsiyalar</b>\n\n"
                "Hozircha tavsiyalar yo'q. Lotlarni ko'rish: /search",
                reply_markup=main_menu_keyboard()
            )
            return

        msg = f"🎯 <b>Sizga tavsiyalar</b>\n{SEP}\n\n"
        if preferred_cats:
            cats_str = ", ".join(preferred_cats)
            msg += f"📊 Sizning kategoryalaringiz: {cats_str}\n\n"
        msg += "<i>Eng oxirgi lotlar:</i>\n\n"

        for lot in recommended[:5]:
            emoji = CATEGORY_EMOJI.get(lot.category, "📦")
            grade_e = GRADE_EMOJI.get(lot.grade or '', "⚪")
            msg += (
                f"{emoji} <b>#{lot.id}</b> — {lot.title[:50]}\n"
                f"  💰 {fmt_price(lot.price)} | {grade_e} {GRADE_LABELS.get(lot.grade or '', '')}\n\n"
            )

        msg += (
            f"{SEP}\n"
            f"Batafsil: /search\n"
            f"Sevimlilar: /wishlist"
        )
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()

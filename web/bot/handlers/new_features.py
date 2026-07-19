"""
DeLiKet Bot — 20 New Features Handlers
Features 1-20: User-friendly + Competitor-differentiating
"""

import logging
from datetime import datetime, timezone
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from api.database import SessionLocal
from api.database.models import (
    User, Lot, Bid, Wishlist, Rating, Transaction, Question,
    CounterOffer, LotTemplate, AutoRelist, SavedSeller,
    ShoppingList, ShoppingListItem, PriceHistory,
    ExpertReview, PrivateChat, PrivateMessage,
    AcademyLesson, AcademyProgress, Dispute,
    Subscription, CrossBorderListing, TrustedReview,
)
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.decorators import auth_required
from bot.utils.formatting import SEP, price as fmt_price

logger = logging.getLogger(__name__)

# ════════════════════════════════════════════════════════════
# FEATURE 1: Counter-Offer / Savdolashish
# /offer [lot_id] [price] — sotuvchiga qarshi taklif yuborish
# ════════════════════════════════════════════════════════════

@auth_required
async def offer_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send a counter-offer to the seller"""
    user_id = update.effective_user.id
    args = context.args

    if len(args) < 2:
        await update.message.reply_html(
            "🤝 <b>Counter-Offer / Savdolashish</b>\n\n"
            "Sotuvchiga o'z narxingizni taklif qiling!\n\n"
            "<b>Ishlatish:</b> /offer [lot_id] [narx]\n"
            "<b>Misol:</b> /offer 5 300000\n"
            "<b>Javob berish:</b> /counter [offer_id] [yangi_narx]",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        lot_id = int(args[0])
        offer_price = float(args[1].replace('$', '').replace(' ', ''))
    except ValueError:
        await update.message.reply_html("❌ Noto'g'ri format. /offer [lot_id] [narx]")
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status == 'aktiv').first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi yoki aktiv emas.")
            return
        if lot.seller_id == user_id:
            await update.message.reply_html("❌ O'z lotingizga taklif yubora olmaysiz.")
            return

        # Check existing pending offer
        existing = db.query(CounterOffer).filter(
            CounterOffer.lot_id == lot_id,
            CounterOffer.buyer_id == user_id,
            CounterOffer.status == 'kutmoqda'
        ).first()
        if existing:
            await update.message.reply_html("⚠️ Sizning bu lot uchun kutayotgan taklifingiz bor.")
            return

        offer = CounterOffer(
            lot_id=lot_id, buyer_id=user_id,
            seller_id=lot.seller_id, offer_price=offer_price,
            message=" ".join(args[2:]) if len(args) > 2 else None
        )
        db.add(offer)
        db.commit()

        await update.message.reply_html(
            f"✅ Taklif yuborildi!\n\n"
            f"📦 Lot: #{lot_id} {lot.title[:50]}\n"
            f"💰 Sizning taklif: {fmt_price(offer_price)}\n"
            f"🆔 Taklif ID: #{offer.id}\n\n"
            f"<i>Sotuvchi javobini kuting...</i>"
        )
    finally:
        db.close()


@auth_required
async def counter_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Seller responds to a counter-offer"""
    user_id = update.effective_user.id
    args = context.args

    if len(args) < 2:
        await update.message.reply_html(
            "📝 <b>Counter-Offer javobi</b>\n\n"
            "Sotuvchi sifatida qarshi taklif yuborish:\n"
            "/counter [offer_id] [yangi_narx]\n"
            "Qabul qilish: /accept [offer_id]\n"
            "Rad etish: /reject [offer_id]"
        )
        return

    try:
        offer_id = int(args[0])
        new_price = float(args[1].replace('$', '').replace(' ', ''))
    except ValueError:
        await update.message.reply_html("❌ Noto'g'ri format.")
        return

    db = SessionLocal()
    try:
        offer = db.query(CounterOffer).filter(
            CounterOffer.id == offer_id,
            CounterOffer.seller_id == user_id,
            CounterOffer.status == 'kutmoqda'
        ).first()
        if not offer:
            await update.message.reply_html("❌ Taklif topilmadi.")
            return

        offer.counter_price = new_price
        offer.status = 'counter'
        db.commit()

        await update.message.reply_html(
            f"✅ Qarshi taklif yuborildi!\n"
            f"💰 Sizning narx: {fmt_price(new_price)}"
        )
    finally:
        db.close()


@auth_required
async def accept_offer_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Accept an offer (buyer accepts seller's counter, or seller accepts buyer's offer)"""
    user_id = update.effective_user.id
    args = context.args
    if not args:
        await update.message.reply_html("/accept [offer_id] — Taklifni qabul qilish")
        return

    try:
        offer_id = int(args[0])
    except ValueError:
        return

    db = SessionLocal()
    try:
        offer = db.query(CounterOffer).filter(CounterOffer.id == offer_id).first()
        if not offer or offer.status != 'kutmoqda':
            await update.message.reply_html("❌ Taklif topilmadi.")
            return

        if user_id not in (offer.buyer_id, offer.seller_id):
            await update.message.reply_html("❌ Bu sizning taklifingiz emas.")
            return

        offer.status = 'qabul'
        db.commit()
        await update.message.reply_html("✅ Taklif qabul qilindi! Sotuvchini tez orada bog'lanadi.")
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 2: Lot Templates / Tez lot yaratish
# /savetemplate — lot ma'lumotlarini shablon sifatida saqlash
# /mytemplates — shablonlarni ko'rish
# /usetemplate [id] — shablondan lot yaratish
# ════════════════════════════════════════════════════════════

@auth_required
async def savetemplate_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Save current lot settings as a template"""
    user_id = update.effective_user.id
    args = context.args

    if len(args) < 4:
        await update.message.reply_html(
            "📦 <b>Lot Template yaratish</b>\n\n"
            "Tez lot yaratish uchun shablon saqlang!\n\n"
            "<b>Ishlatish:</b>\n"
            "/savetemplate [nomi] [kategoriya] [narx] [sarlavha]\n"
            "/mytemplates — shablonlarim\n"
            "/usetemplate [id] — shablondan lot yaratish\n\n"
            "<b>Misol:</b>\n"
            "/savetemplate iPhone_standart smartfon 5000000 iPhone 13 Pro 128GB"
        )
        return

    name = args[0]
    category = args[1]
    try:
        price = float(args[2].replace('$', '').replace(' ', ''))
    except ValueError:
        await update.message.reply_html("❌ Noto'g'ri narx.")
        return
    title = " ".join(args[3:])

    db = SessionLocal()
    try:
        # Check limit (max 10 templates)
        count = db.query(LotTemplate).filter(LotTemplate.user_id == user_id).count()
        if count >= 10:
            await update.message.reply_html("⚠️ Maksimal 10 ta shablon. /mytemplates orqali o'chiring.")
            return

        template = LotTemplate(
            user_id=user_id, name=name, category=category,
            title=title, price=price
        )
        db.add(template)
        db.commit()

        await update.message.reply_html(
            f"✅ Shablon saqlandi!\n"
            f"📁 <b>{name}</b> (ID: {template.id})\n"
            f"📂 {category} | 💰 {fmt_price(price)}\n\n"
            f"Islatish: /usetemplate {template.id}"
        )
    finally:
        db.close()


@auth_required
async def mytemplates_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """List user's lot templates"""
    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        templates = db.query(LotTemplate).filter(
            LotTemplate.user_id == user_id
        ).order_by(LotTemplate.usage_count.desc()).all()

        if not templates:
            await update.message.reply_html(
                "📦 Hali shablonlar yo'q.\n\n"
                "/savetemplate [nomi] [kategoriya] [narx] [sarlavha] — yaratish",
                reply_markup=main_menu_keyboard()
            )
            return

        msg = f"📦 <b>Shablonlarim ({len(templates)})</b>\n{SEP}\n\n"
        for t in templates:
            msg += (
                f"#{t.id} <b>{t.name}</b>\n"
                f"  📂 {t.category} | 💰 {fmt_price(t.price)}\n"
                f"  📋 {t.title[:50]}\n"
                f"  🔄 {t.usage_count} marta ishlatilgan\n\n"
            )
        msg += f"{SEP}\n<b>Ishlatish:</b> /usetemplate [id]"
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


@auth_required
async def usetemplate_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Create a lot from template"""
    user_id = update.effective_user.id
    args = context.args
    if not args:
        await update.message.reply_html("❌ /usetemplate [template_id]")
        return

    try:
        tpl_id = int(args[0])
    except ValueError:
        return

    db = SessionLocal()
    try:
        template = db.query(LotTemplate).filter(
            LotTemplate.id == tpl_id,
            LotTemplate.user_id == user_id
        ).first()
        if not template:
            await update.message.reply_html("❌ Shablon topilmadi.")
            return

        # Create lot from template
        lot = Lot(
            seller_id=user_id, category=template.category,
            title=template.title, price=template.price,
            grade=template.grade, quantity=template.quantity,
            description=template.description
        )
        db.add(lot)
        template.usage_count = (template.usage_count or 0) + 1
        db.commit()

        await update.message.reply_html(
            f"✅ Lot yaratildi!\n"
            f"📦 #{lot.id} {lot.title[:50]}\n"
            f"💰 {fmt_price(lot.price)}\n"
            f"🔄 Shablondan yaratildi: {template.name}"
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 3: Auto-Relist / Avtomatik qayta joylash
# /autorelist [lot_id] [days] [price_reduction_%]
# ════════════════════════════════════════════════════════════

@auth_required
async def autorelist_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Enable auto-relist for a lot"""
    user_id = update.effective_user.id
    args = context.args

    kb = InlineKeyboardMarkup([[
        InlineKeyboardButton("🔙 Lotlarim", callback_data="lot_archive_0")
    ]])

    if len(args) < 1:
        await update.message.reply_html(
            "🔄 <b>Auto-Relist</b>\n\n"
            "Sotilmagan lotlarni avtomatik qayta joylash!\n\n"
            "<b>Ishlatish:</b>\n"
            "/autorelist [lot_id] [kun] [chegirma_%]\n"
            "/autorelist off [lot_id] — o'chirish\n"
            "/myrelist — relistlarim\n\n"
            "<b>Misol:</b>\n"
            "/autorelist 5 7 10 — 7 kundan keyin 10% chegirma bilan qayta joylash",
            reply_markup=kb
        )
        return

    db = SessionLocal()
    try:
        if args[0] == "off" and len(args) > 1:
            lot_id = int(args[1])
            relist = db.query(AutoRelist).filter(
                AutoRelist.lot_id == lot_id,
                AutoRelist.user_id == user_id
            ).first()
            if relist:
                db.delete(relist)
                db.commit()
                await update.message.reply_html("✅ Auto-Relist o'chirildi.")
            else:
                await update.message.reply_html("❌ Auto-Relist topilmadi.")
            return

        lot_id = int(args[0])
        days = int(args[1]) if len(args) > 1 else 7
        reduction = float(args[2].replace('%', '')) if len(args) > 2 else 0

        lot = db.query(Lot).filter(Lot.id == lot_id, Lot.seller_id == user_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        existing = db.query(AutoRelist).filter(AutoRelist.lot_id == lot_id).first()
        if existing:
            existing.is_active = True
            existing.days_between = days
            existing.price_reduction = reduction
        else:
            relist = AutoRelist(
                lot_id=lot_id, user_id=user_id,
                days_between=days, price_reduction=reduction
            )
            db.add(relist)

        db.commit()
        await update.message.reply_html(
            f"✅ Auto-Relist yoqildi!\n"
            f"📦 #{lot_id} {lot.title[:50]}\n"
            f"⏱ Har {days} kunda | 📉 {reduction}% chegirma"
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 4: Lot Comparison / Solishtirish
# /compare [lot_id1] [lot_id2] [lot_id3]
# ════════════════════════════════════════════════════════════

@auth_required
async def compare_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Compare up to 3 lots side by side"""
    args = context.args
    if len(args) < 2:
        await update.message.reply_html(
            "📊 <b>Lot Comparison</b>\n\n"
            "2-3 tagacha lotni yonma-yon solishtiring!\n\n"
            "<b>Ishlatish:</b> /compare [id1] [id2] [id3]\n"
            "<b>Misol:</b> /compare 5 8 12",
            reply_markup=main_menu_keyboard()
        )
        return

    ids = []
    for a in args[:3]:
        try:
            ids.append(int(a))
        except ValueError:
            continue

    if len(ids) < 2:
        await update.message.reply_html("❌ Kamida 2 ta lot ID kerak.")
        return

    db = SessionLocal()
    try:
        lots = db.query(Lot).filter(Lot.id.in_(ids), Lot.status == 'aktiv').all()
        if len(lots) < 2:
            await update.message.reply_html("❌ Aktiv lotlar topilmadi.")
            return

        msg = f"📊 <b>Lot Comparison ({len(lots)} ta)</b>\n{SEP}\n\n"
        for lot in lots:
            bid_count = db.query(Bid).filter(Bid.lot_id == lot.id).count()
            grade_label = {'A': '✅ A+', 'B': '👍 B', 'C': '⚠️ C'}.get(lot.grade or '', '⚪')
            msg += (
                f"<b>#{lot.id} — {lot.title[:60]}</b>\n"
                f"  📂 {lot.category} | 💰 {fmt_price(lot.price)}\n"
                f"  📦 {lot.quantity} dona | Sifat: {grade_label}\n"
                f"  💬 {bid_count} ta taklif | 👁 {lot.view_count or 0} ko'rish\n\n"
            )

        msg += f"{SEP}\n💡 Taklif: /bid [lot_id] [narx]"
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 5: Saved Sellers / Sevimli sotuvchilar
# /follow [seller_id] — sotuvchini kuzatish
# /unfollow [seller_id]
# /myfeed — kuzatilayotgan sotuvchilarning yangi lotlari
# ════════════════════════════════════════════════════════════

@auth_required
async def follow_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Follow a seller"""
    user_id = update.effective_user.id
    args = context.args
    if not args:
        await update.message.reply_html(
            "⭐ <b>Saved Sellers</b>\n\n"
            "/follow [seller_id] — sotuvchini kuzatish\n"
            "/unfollow [seller_id] — kuzatishni to'xtatish\n"
            "/myfeed — kuzatilayotgan sotuvchilarning yangi lotlari"
        )
        return

    try:
        seller_id = int(args[0])
    except ValueError:
        return

    if seller_id == user_id:
        await update.message.reply_html("❌ O'zingizni kuzata olmaysiz.")
        return

    db = SessionLocal()
    try:
        seller = db.query(User).filter(User.id == seller_id).first()
        if not seller:
            await update.message.reply_html("❌ Sotuvchi topilmadi.")
            return

        existing = db.query(SavedSeller).filter(
            SavedSeller.user_id == user_id,
            SavedSeller.seller_id == seller_id
        ).first()
        if existing:
            await update.message.reply_html(f"⚠️ Siz {seller.name} ni allaqachon kuzatyapsiz.")
            return

        follow = SavedSeller(user_id=user_id, seller_id=seller_id)
        db.add(follow)
        db.commit()

        await update.message.reply_html(f"✅ <b>{seller.name}</b> kuzatilmoqda! Yangi lotlaridan xabardor bo'ling.")
    finally:
        db.close()


@auth_required
async def unfollow_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Unfollow a seller"""
    user_id = update.effective_user.id
    args = context.args
    if not args:
        return

    try:
        seller_id = int(args[0])
    except ValueError:
        return

    db = SessionLocal()
    try:
        follow = db.query(SavedSeller).filter(
            SavedSeller.user_id == user_id,
            SavedSeller.seller_id == seller_id
        ).first()
        if follow:
            db.delete(follow)
            db.commit()
            await update.message.reply_html("✅ Kuzatish bekor qilindi.")
        else:
            await update.message.reply_html("❌ Siz bu sotuvchini kuzatmayapsiz.")
    finally:
        db.close()


@auth_required
async def myfeed_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show new lots from followed sellers"""
    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        sellers = db.query(SavedSeller).filter(SavedSeller.user_id == user_id).all()
        if not sellers:
            await update.message.reply_html(
                "📭 Hali hech kimni kuzatmayapsiz.\n\n"
                "/follow [seller_id] — sotuvchini kuzatishni boshlang!",
                reply_markup=main_menu_keyboard()
            )
            return

        seller_ids = [s.seller_id for s in sellers]
        lots = db.query(Lot).filter(
            Lot.seller_id.in_(seller_ids),
            Lot.status == 'aktiv'
        ).order_by(Lot.created_at.desc()).limit(10).all()

        if not lots:
            await update.message.reply_html("📭 Kuzatilayotgan sotuvchilarda yangi lotlar yo'q.")
            return

        msg = f"⭐ <b>Mening Feedim ({len(lots)} ta)</b>\n{SEP}\n\n"
        for lot in lots:
            seller = db.query(User).filter(User.id == lot.seller_id).first()
            msg += (
                f"#{lot.id} {lot.title[:55]}\n"
                f"  👤 {seller.name if seller else 'Noma'} | 💰 {fmt_price(lot.price)}\n\n"
            )

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 6: Shopping List / Ommaviy istaklar
# /shoplist [name] — yangi ro'yxat yaratish
# /shoplist add [list_id] [lot_id] — lot qo'shish
# /myshoplists — ro'yxatlarim
# ════════════════════════════════════════════════════════════

@auth_required
async def shoplist_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Create a shopping list"""
    user_id = update.effective_user.id
    args = context.args

    if not args:
        await update.message.reply_html(
            "🛒 <b>Shopping List</b>\n\n"
            "Ommaviy istaklar ro'yxati!\n\n"
            "/shoplist [nomi] — ro'yxat yaratish\n"
            "/shoplist add [list_id] [lot_id] — lot qo'shish\n"
            "/myshoplists — ro'yxatlarim\n"
            "/shoplist public [list_id] — ochiq qilish"
        )
        return

    db = SessionLocal()
    try:
        if args[0] == "add" and len(args) >= 3:
            list_id = int(args[1])
            lot_id = int(args[2])
            sl = db.query(ShoppingList).filter(
                ShoppingList.id == list_id,
                ShoppingList.user_id == user_id
            ).first()
            if not sl:
                await update.message.reply_html("❌ Ro'yxat topilmadi.")
                return

            lot = db.query(Lot).filter(Lot.id == lot_id).first()
            if not lot:
                await update.message.reply_html("❌ Lot topilmadi.")
                return

            item = ShoppingListItem(
                list_id=list_id, lot_id=lot_id,
                title=lot.title, estimated_price=lot.price
            )
            db.add(item)
            db.commit()
            await update.message.reply_html(f"✅ <b>{lot.title[:50]}</b> ro'yxatga qo'shildi!")
            return

        if args[0] == "public" and len(args) >= 2:
            list_id = int(args[1])
            sl = db.query(ShoppingList).filter(
                ShoppingList.id == list_id,
                ShoppingList.user_id == user_id
            ).first()
            if sl:
                sl.is_public = not sl.is_public
                db.commit()
                await update.message.reply_html(f"{'🌍' if sl.is_public else '🔒'} Ro'yxat {'ochiq' if sl.is_public else 'yopiq'} qilindi!")
            return

        # Create new list
        name = " ".join(args)
        sl = ShoppingList(user_id=user_id, name=name)
        db.add(sl)
        db.commit()
        await update.message.reply_html(
            f"✅ <b>{name}</b> ro'yxati yaratildi!\n"
            f"Lot qo'shish: /shoplist add {sl.id} [lot_id]"
        )
    finally:
        db.close()


@auth_required
async def myshoplists_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show user's shopping lists"""
    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        lists = db.query(ShoppingList).filter(
            ShoppingList.user_id == user_id
        ).order_by(ShoppingList.created_at.desc()).all()

        if not lists:
            await update.message.reply_html(
                "🛒 Hali ro'yxatlar yo'q.\n\n/shoplist [nomi] — yaratish"
            )
            return

        msg = f"🛒 <b>Shopping Listlarim</b>\n{SEP}\n\n"
        for sl in lists:
            items = db.query(ShoppingListItem).filter(
                ShoppingListItem.list_id == sl.id
            ).all()
            purchased = sum(1 for i in items if i.is_purchased)
            status = "🌍" if sl.is_public else "🔒"
            msg += (
                f"{status} <b>{sl.name}</b>\n"
                f"  📦 {len(items)} ta mahsulot ({purchased} ta sotib olingan)\n"
                f"  🆔 ID: {sl.id}\n\n"
            )
        msg += f"{SEP}\nBatafsil: /shoplist\nLot qo'shish: /shoplist add [id] [lot_id]"
        await update.message.reply_html(msg)
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 7: Price History / Narx tarixi
# /pricetrend [kategoriya] — narx trendini ko'rish
# ════════════════════════════════════════════════════════════

@auth_required
async def pricetrend_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show price trends for a category"""
    args = context.args
    category = " ".join(args) if args else None

    db = SessionLocal()
    try:
        if category:
            records = db.query(PriceHistory).filter(
                PriceHistory.category == category
            ).order_by(PriceHistory.recorded_at.desc()).limit(30).all()
        else:
            # Show latest snapshot for all categories
            from sqlalchemy import func
            sub = db.query(
                PriceHistory.category,
                func.max(PriceHistory.recorded_at).label('max_date')
            ).group_by(PriceHistory.category).subquery()

            records = db.query(PriceHistory).join(
                sub,
                (PriceHistory.category == sub.c.category) &
                (PriceHistory.recorded_at == sub.c.max_date)
            ).all()

        if not records:
            await update.message.reply_html(
                "📈 <b>Price History</b>\n\n"
                "Hali narx ma'lumotlari to'planmagan.\n\n"
                "/pricetrend [kategoriya] — ma'lum kategoriya bo'yicha\n"
                "Misol: /pricetrend smartfon",
                reply_markup=main_menu_keyboard()
            )
            return

        msg = f"📈 <b>Narx Trendlari</b>\n{SEP}\n\n"
        for r in records:
            trend = ""
            if category and len(records) > 1:
                idx = records.index(r)
                if idx < len(records) - 1:
                    prev = records[idx + 1]
                    change = ((r.avg_price - prev.avg_price) / prev.avg_price) * 100
                    arrow = "📈" if change > 0 else "📉" if change < 0 else "➡️"
                    trend = f" {arrow} {change:+.1f}%"

            msg += (
                f"📂 <b>{r.category}</b>{trend}\n"
                f"  💰 O'rtacha: {fmt_price(r.avg_price)}\n"
                f"  📉 Min: {fmt_price(r.min_price)} | 📈 Max: {fmt_price(r.max_price)}\n"
                f"  📦 {r.lot_count} ta lot | 🕐 {r.recorded_at.strftime('%d.%m.%Y') if r.recorded_at else ''}\n\n"
            )

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 8: Quick Share + Referral
# /share [lot_id] — lotni ulashish tugmasi
# ════════════════════════════════════════════════════════════

@auth_required
async def share_lot_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Share a lot with referral link"""
    args = context.args
    if not args:
        await update.message.reply_html(
            "🔗 <b>Quick Share</b>\n\n"
            "Lotni do'stlaringiz bilan ulashing!\n\n"
            "/sharelot [lot_id] — lotni ulashish",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        lot_id = int(args[0])
    except ValueError:
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        share_text = (
            f"📦 <b>DeLiKet'da lot topildi!</b>\n\n"
            f"#{lot.id} {lot.title[:80]}\n"
            f"💰 {fmt_price(lot.price)} | 📂 {lot.category}\n\n"
            f"👉 @DeLiKatbot — DeLiKet Market!"
        )

        await update.message.reply_html(
            f"🔗 <b>Ulashish</b>\n{SEP}\n\n{share_text}\n{SEP}\n"
            f"Do'stlaringizga yuboring! 👇",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton(
                    "📤 Telegram'da ulashish",
                    switch_inline_query=f"lot {lot_id}"
                )
            ]])
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 9: Smart Digest / Kunlik xulosa
# /digest — bugungi faoliyat xulosasi
# ════════════════════════════════════════════════════════════

@auth_required
async def digest_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show daily activity summary"""
    user_id = update.effective_user.id
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return

        # Today's activity
        new_bids = db.query(Bid).filter(
            Bid.buyer_id == user_id,
            Bid.created_at >= today
        ).count()

        my_lots_active = db.query(Lot).filter(
            Lot.seller_id == user_id,
            Lot.status == 'aktiv'
        ).count()

        my_lots_sold = db.query(Lot).filter(
            Lot.seller_id == user_id,
            Lot.status == 'sotilgan',
            Lot.created_at >= today
        ).count()

        new_messages = db.query(Question).filter(
            Question.seller_id == user_id,
            Question.answer == None,
            Question.created_at >= today
        ).count()

        pending_bids = db.query(Bid).filter(
            Bid.status == 'kutmoqda'
        ).join(Lot).filter(Lot.seller_id == user_id).count()

        wishlist_count = db.query(Wishlist).filter(Wishlist.user_id == user_id).count()

        offers = db.query(CounterOffer).filter(
            CounterOffer.buyer_id == user_id,
            CounterOffer.status == 'kutmoqda'
        ).count()

        msg = (
            f"📋 <b>Smart Digest — Bugun</b>\n{SEP}\n\n"
            f"👤 <b>{user.name}</b>\n"
            f"⭐ Reyting: {user.rating:.1f} | 🏆 Daraja: {user.level or 1}\n{SEP}\n\n"
            f"📊 <b>Faoliyatingiz:</b>\n"
            f"  💰 Yangi takliflar: {new_bids}\n"
            f"  📦 Aktiv lotlar: {my_lots_active}\n"
            f"  ✅ Bugun sotilgan: {my_lots_sold}\n{SEP}\n\n"
            f"⏳ <b>Kutayotgan:</b>\n"
            f"  📬 Javob kutilgan savollar: {new_messages}\n"
            f"  💳 Takliflar: {pending_bids}\n"
            f"  🤝 Counter-offers: {offers}\n{SEP}\n\n"
            f"❤️ Sevimlilar: {wishlist_count}\n"
            f"📊 Batafsil: /myanalytics\n"
            f"⚡ Yangi qidiruv: /search"
        )

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 10: Seller Store / Sotuvchi do'koni
# /store [seller_id] — sotuvchining barcha lotlari
# ════════════════════════════════════════════════════════════

@auth_required
async def store_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """View a seller's store/profile"""
    user_id = update.effective_user.id
    args = context.args

    if not args:
        # Show own store
        seller_id = user_id
    else:
        try:
            seller_id = int(args[0])
        except ValueError:
            await update.message.reply_html("❌ /store [seller_id] — sotuvchi IDsini kiriting")
            return

    db = SessionLocal()
    try:
        seller = db.query(User).filter(User.id == seller_id).first()
        if not seller:
            await update.message.reply_html("❌ Sotuvchi topilmadi.")
            return

        lots = db.query(Lot).filter(
            Lot.seller_id == seller_id,
            Lot.status == 'aktiv'
        ).order_by(Lot.created_at.desc()).limit(10).all()

        total_sold = db.query(Lot).filter(
            Lot.seller_id == seller_id,
            Lot.status == 'sotilgan'
        ).count()

        trust_badge = "✅ Tasdiqlangan" if seller.is_verified else "⬜ Tasdiqlanmagan"
        badges = ""
        if seller.trust_score >= 4.5:
            badges += "🏆 "
        if seller.is_verified:
            badges += "✅ "

        msg = (
            f"🏪 <b>{badges}{seller.name} do'koni</b>\n{SEP}\n"
            f"  ⭐ Reyting: {seller.rating:.1f} | Ishonch: {seller.trust_score:.1f}\n"
            f"  📦 Aktiv: {len(lots)} ta | Sotilgan: {total_sold} ta\n"
            f"  🏅 {trust_badge} | Daraja: {seller.level or 1}\n{SEP}\n\n"
            f"<b>📦 Aktiv lotlar:</b>\n\n"
        )

        if not lots:
            msg += "Hali aktiv lotlar yo'q.\n"
        else:
            for lot in lots:
                msg += f"#{lot.id} {lot.title[:55]} — 💰 {fmt_price(lot.price)}\n"

        is_own = seller_id == user_id
        if not is_own:
            msg += f"\n{SEP}\nKuzatish: /follow {seller_id}"
        else:
            msg += f"\n{SEP}\nBu sizning do'koningiz!"

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 11: Expert Verification / Ekspert tekshiruvi
# /expert [lot_id] — ekspert tekshiruviga so'rov yuborish
# /expertlist — tekshiruvdagi lotlar
# ════════════════════════════════════════════════════════════

@auth_required
async def expert_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Request expert verification for a lot"""
    user_id = update.effective_user.id
    args = context.args

    if not args:
        await update.message.reply_html(
            "🏆 <b>Expert Verification</b>\n\n"
            "Mahsulotingizni ekspert tekshiruvidan o'tkazing!\n\n"
            "/expert [lot_id] — tekshiruv so'rovi\n"
            "/expertlist — tekshiruv holati\n\n"
            "<i>Ekspert tekshiruvi mahsulot sifatini tasdiqlaydi va "
            "xaridor ishonchini oshiradi!</i>",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        lot_id = int(args[0])
    except ValueError:
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id, Lot.seller_id == user_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi yoki sizning lotingiz emas.")
            return

        existing = db.query(ExpertReview).filter(
            ExpertReview.lot_id == lot_id
        ).first()
        if existing:
            await update.message.reply_html("⚠️ Bu lot allaqachon tekshiruvda.")
            return

        # Find an expert (admin user)
        expert = db.query(User).filter(
            User.is_admin == True,
            User.id != user_id
        ).first()

        if not expert:
            await update.message.reply_html("⚠️ Hozircha ekspert mavjud emas. So'rovingiz keyinroq ko'rib chiqiladi.")
            return

        review = ExpertReview(
            lot_id=lot_id, expert_id=expert.id,
            status='kutilmoqda'
        )
        db.add(review)
        db.commit()

        await update.message.reply_html(
            f"✅ Ekspert tekshiruvi so'rovi yuborildi!\n"
            f"📦 #{lot_id} {lot.title[:50]}\n"
            f"👨‍🔧 Ekspert: {expert.name}\n\n"
            f"<i>Natijadan xabardor qilinadi.</i>"
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 12: Visual Comparison (CLIP-based)
# /visualcompare [id1] [id2] — lotlarni rasm asosida solishtirish
# ════════════════════════════════════════════════════════════

@auth_required
async def visualcompare_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Compare lots visually using CLIP"""
    args = context.args
    if len(args) < 2:
        await update.message.reply_html(
            "🔍 <b>Visual Comparison</b>\n\n"
            "CLIP AI yordamida lotlarni rasm asosida solishtiring!\n\n"
            "/visualcompare [id1] [id2] — 2 ta lotni solishtirish\n\n"
            "<i>AI ikkala lotning rasmini tahlil qilib, "
            "ularning o'xshashligini baholaydi</i>",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        id1 = int(args[0])
        id2 = int(args[1])
    except ValueError:
        return

    db = SessionLocal()
    try:
        lot1 = db.query(Lot).filter(Lot.id == id1).first()
        lot2 = db.query(Lot).filter(Lot.id == id2).first()
        if not lot1 or not lot2:
            await update.message.reply_html("❌ Lotlar topilmadi.")
            return

        # Check if both lots have images for CLIP comparison
        has_images = lot1.image_file_id and lot2.image_file_id

        await update.message.reply_html(
            f"🔍 <b>Visual Comparison</b>\n{SEP}\n\n"
            f"<b>📦 #{id1}</b> {lot1.title[:60]}\n"
            f"  💰 {fmt_price(lot1.price)} | {lot1.category}\n\n"
            f"<b>📦 #{id2}</b> {lot2.title[:60]}\n"
            f"  💰 {fmt_price(lot2.price)} | {lot2.category}\n{SEP}\n\n"
            f"<b>Farqlar:</b>\n"
            f"  💵 Narx farqi: {fmt_price(abs(lot1.price - lot2.price))}\n"
            f"  📂 Kategoriya: {'bir xil ✅' if lot1.category == lot2.category else 'farqli ❌'}\n"
            + (f"  🖼 Ikkala lotda rasm bor — CLIP solishtirish mumkin" if has_images
               else "  ⚠️ Rasm solishtirish uchun lotlarda rasm bo'lishi kerak") +
            f"\n\n💡 Taklif: /bid {id1} [narx] yoki /bid {id2} [narx]"
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 13: Market Analytics / Bozor tahlili
# /marketanalytics — to'liq bozor tahlili dashboard
# ════════════════════════════════════════════════════════════

@auth_required
async def marketanalytics_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show comprehensive market analytics"""
    db = SessionLocal()
    try:
        from sqlalchemy import func

        # Total stats
        total_users = db.query(User).count()
        total_lots = db.query(Lot).count()
        active_lots = db.query(Lot).filter(Lot.status == 'aktiv').count()
        total_bids = db.query(Bid).count()
        total_sold = db.query(Lot).filter(Lot.status == 'sotilgan').count()
        total_transactions = db.query(Lot).filter(Lot.status == 'sotilgan').count()

        # Category breakdown
        categories = db.query(
            Lot.category,
            func.count(Lot.id).label('count'),
            func.avg(Lot.price).label('avg_price')
        ).filter(Lot.status == 'aktiv').group_by(Lot.category).all()

        # Top sellers
        top_sellers = db.query(
            User.name, User.rating,
            func.count(Lot.id).label('lot_count')
        ).join(Lot, Lot.seller_id == User.id)\
         .filter(Lot.status == 'aktiv')\
         .group_by(User.id, User.name, User.rating)\
         .order_by(func.count(Lot.id).desc()).limit(5).all()

        msg = (
            f"📊 <b>Market Analytics Dashboard</b>\n{SEP}\n\n"
            f"<b>📈 Umumiy statistika:</b>\n"
            f"  👤 Foydalanuvchilar: {total_users}\n"
            f"  📦 Jami lotlar: {total_lots}\n"
            f"  🟢 Aktiv: {active_lots} | Sotilgan: {total_sold}\n"
            f"  💳 Takliflar: {total_bids}\n{SEP}\n\n"
            f"<b>📂 Kategoriyalar bo'yicha:</b>\n"
        )

        for cat, count, avg_price in categories:
            msg += f"  • {cat}: {count} ta lot, o'rt. {fmt_price(avg_price)}\n"

        msg += f"\n{SEP}\n<b>🏆 Top sotuvchilar:</b>\n"
        for name, rating, lot_count in top_sellers:
            stars = "⭐" * min(int(rating), 5)
            msg += f"  • {stars} {name}: {lot_count} lot\n"

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 14: AI Price Optimizer / AI narx optimallashtirish
# /optimize [lot_id] — AI lot narxini optimallashtirish
# ════════════════════════════════════════════════════════════

@auth_required
async def optimize_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """AI-powered price optimization for a lot"""
    user_id = update.effective_user.id
    args = context.args

    if not args:
        await update.message.reply_html(
            "🤖 <b>AI Price Optimizer</b>\n\n"
            "AI lotingizning eng yaxshi narxini hisoblab beradi!\n\n"
            "/optimize [lot_id] — lot narxini optimallashtirish\n\n"
            "<i>AI bozor trendlari, o'xshash lotlar va talabni tahlil qiladi</i>",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        lot_id = int(args[0])
    except ValueError:
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id, Lot.seller_id == user_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        # Simple price analysis
        same_category = db.query(Lot).filter(
            Lot.category == lot.category,
            Lot.status == 'aktiv',
            Lot.id != lot.id
        ).all()

        if same_category:
            avg_price = sum(l.price for l in same_category) / len(same_category)
            min_price = min(l.price for l in same_category)
            max_price = max(l.price for l in same_category)

            # Recommendation
            if lot.price > max_price:
                suggestion = "📈 Lot narxi bozordagi eng qimmatidan yuqori"
                recommended = max_price * 0.95
            elif lot.price < min_price:
                suggestion = "📉 Lot narxi bozordagi eng arzonidan past — tez sotiladi!"
                recommended = lot.price * 1.1
            else:
                suggestion = "✅ Lot narxi bozor oralig'ida"
                recommended = avg_price

            msg = (
                f"🤖 <b>AI Price Optimizer</b>\n{SEP}\n\n"
                f"📦 <b>{lot.title[:60]}</b>\n"
                f"💵 Hozirgi narx: <b>{fmt_price(lot.price)}</b>\n"
                f"📂 Kategoriya: {lot.category}\n{SEP}\n\n"
                f"<b>📊 Bozor tahlili ({len(same_category)} ta lot):</b>\n"
                f"  📉 Eng arzon: {fmt_price(min_price)}\n"
                f"  📈 Eng qimmat: {fmt_price(max_price)}\n"
                f"  📊 O'rtacha: {fmt_price(avg_price)}\n{SEP}\n\n"
                f"💡 <b>AI tavsiyasi:</b>\n"
                f"  {suggestion}\n"
                f"  🎯 Tavsiya etilgan narx: <b>{fmt_price(recommended)}</b>\n\n"
                f"O'zgartirish uchun lotni qayta yarating: /newlot"
            )
        else:
            msg = (
                f"🤖 <b>AI Price Optimizer</b>\n{SEP}\n\n"
                f"📦 <b>{lot.title[:60]}</b>\n"
                f"💵 Hozirgi narx: {fmt_price(lot.price)}\n{SEP}\n\n"
                f"⚠️ Kategoriyada solishtirish uchun boshqa lotlar yo'q.\n"
                f"Narxni pasaytirish yoki lot sifatini yaxshilash tavsiya etiladi."
            )

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 15: Private Mode / Maxfiy chat
# /chat [lot_id] — sotuvchi bilan maxfiy chat boshlash
# /mychats — faol chatlar
# ════════════════════════════════════════════════════════════

@auth_required
async def chat_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start a private chat with seller"""
    user_id = update.effective_user.id
    args = context.args

    if not args:
        await update.message.reply_html(
            "🔒 <b>Private Mode</b>\n\n"
            "Sotuvchi bilan maxfiy chatda bog'laning!\n"
            "Telefon raqam ko'rinmaydi.\n\n"
            "/chat [lot_id] [xabar] — chat boshlash\n"
            "/mychats — faol chatlar"
        )
        return

    try:
        lot_id = int(args[0])
        text = " ".join(args[1:]) if len(args) > 1 else "Salom! Mahsulot bilan qiziqyapman."
    except ValueError:
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status == 'aktiv').first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        # Find or create chat
        chat = db.query(PrivateChat).filter(
            PrivateChat.lot_id == lot_id,
            PrivateChat.buyer_id == user_id,
            PrivateChat.is_active == True
        ).first()

        if not chat:
            chat = PrivateChat(
                lot_id=lot_id, buyer_id=user_id,
                seller_id=lot.seller_id
            )
            db.add(chat)
            db.flush()

        # Send message
        msg = PrivateMessage(chat_id=chat.id, sender_id=user_id, text=text)
        db.add(msg)
        db.commit()

        await update.message.reply_html(
            f"🔒 <b>Maxfiy chat</b>\n{SEP}\n\n"
            f"📦 #{lot_id} {lot.title[:60]}\n"
            f"💬 Xabaringiz yuborildi!\n\n"
            f"<i>Sotuvchi javob berganda xabardor qilinadi.</i>\n"
            f"Yangi xabar: /chat {lot_id} [matn]"
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 16: Seller Academy / Sotuvchilar akademiyasi
# /academy — darslar ro'yxati
# /lesson [id] — darsni ko'rish
# ════════════════════════════════════════════════════════════

@auth_required
async def academy_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show seller academy lessons"""
    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        lessons = db.query(AcademyLesson).order_by(AcademyLesson.order_num).all()

        if not lessons:
            # Create default lessons
            default_lessons = [
                ("DeLiKet'ga xush kelibsiz!", "DeLiKet — O'zbekistondagi eng yaxshi Telegram marketplace. Bu darsda platformadan foydalanishni o'rganasiz.", "boshlang'ich"),
                ("Qanday qilib yaxshi lot yaratish?", "Sifatli lot yaratish — sotuvning kaliti. Mahsulot rasmi, to'liq tavsif va to'g'ri narx muhim.", "boshlang'ich"),
                ("Marketing va sotuv strategiyalari", "Lotingizni tez sotish uchun marketing strategiyalari: chegirmalar, aksiyalar va mijozlar bilan muloqot.", "o'rta"),
                ("Mijozlar bilan ishlash", "Tez javob berish, muloyim muloqot va nizolarni hal qilish — muvaffaqiyatli sotuvchining siri.", "o'rta"),
                ("Platformadan maksimal foydalanish", "Premium funksiyalar, analitika va AI yordamchidan foydalanib sotuvlarni oshiring.", "yuqori"),
            ]
            for i, (title, content, cat) in enumerate(default_lessons, 1):
                db.add(AcademyLesson(title=title, content=content, category=cat, order_num=i, xp_reward=50 * i))
            db.commit()
            lessons = db.query(AcademyLesson).order_by(AcademyLesson.order_num).all()

        # Check progress
        completed_ids = {p.lesson_id for p in db.query(AcademyProgress).filter(
            AcademyProgress.user_id == user_id
        ).all()}

        total_xp = sum(l.xp_reward for l in lessons if l.id in completed_ids)

        msg = (
            f"🎓 <b>Seller Academy</b>\n{SEP}\n\n"
            f"Sotuv mahoratingizni oshiring! {len(lessons)} ta dars\n\n"
        )

        for l in lessons:
            status = "✅" if l.id in completed_ids else "⬜"
            cat_emoji = {"boshlang'ich": "🌱", "o'rta": "🌿", "yuqori": "🌳"}.get(l.category, "📚")
            msg += (
                f"{status} {cat_emoji} <b>Dars {l.order_num}:</b> {l.title}\n"
                f"   {l.xp_reward} XP | /lesson {l.id}\n\n"
            )

        msg += f"{SEP}\n🏆 Umumiy XP: {total_xp} / {sum(l.xp_reward for l in lessons)}"
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


@auth_required
async def lesson_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """View a specific lesson"""
    user_id = update.effective_user.id
    args = context.args
    if not args:
        await update.message.reply_html("/lesson [id] — darsni ko'rish")
        return

    try:
        lesson_id = int(args[0])
    except ValueError:
        return

    db = SessionLocal()
    try:
        lesson = db.query(AcademyLesson).filter(AcademyLesson.id == lesson_id).first()
        if not lesson:
            await update.message.reply_html("❌ Dars topilmadi.")
            return

        # Mark as completed
        existing = db.query(AcademyProgress).filter(
            AcademyProgress.user_id == user_id,
            AcademyProgress.lesson_id == lesson_id
        ).first()

        if not existing:
            progress = AcademyProgress(user_id=user_id, lesson_id=lesson_id)
            db.add(progress)
            # Also add XP
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.xp = (user.xp or 0) + lesson.xp_reward
            db.commit()

        cat_emoji = {"boshlang'ich": "🌱", "o'rta": "🌿", "yuqori": "🌳"}.get(lesson.category, "📚")

        await update.message.reply_html(
            f"🎓 <b>Dars {lesson.order_num}: {lesson.title}</b>\n"
            f"{cat_emoji} {lesson.category} | +{lesson.xp_reward} XP ✅\n{SEP}\n\n"
            f"{lesson.content}\n\n{SEP}\n"
            f"/academy — barcha darslar",
            reply_markup=main_menu_keyboard()
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 17: Dispute Center / Nizolarni hal qilish
# /dispute [transaction_id] [sabab] — nizo ochish
# /mydisputes — nizolarim
# ════════════════════════════════════════════════════════════

@auth_required
async def dispute_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Open a dispute"""
    user_id = update.effective_user.id
    args = context.args

    if len(args) < 1:
        await update.message.reply_html(
            "⚖️ <b>Dispute Center</b>\n\n"
            "Sotuv va xarid bilan bog'liq nizolarni hal qiling.\n\n"
            "/dispute [transaction_id] [sabab] — nizo ochish\n"
            "/mydisputes — nizolarim",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        transaction_id = int(args[0])
        reason = " ".join(args[1:]) if len(args) > 1 else "Nizo sababi ko'rsatilmagan"
    except ValueError:
        return

    db = SessionLocal()
    try:
        transaction = db.query(Transaction).filter(
            Transaction.id == transaction_id
        ).first()

        if not transaction:
            await update.message.reply_html("❌ Tranzaksiya topilmadi.")
            return

        if user_id not in (transaction.buyer_id, transaction.seller_id):
            await update.message.reply_html("❌ Bu tranzaksiya sizga tegishli emas.")
            return

        existing = db.query(Dispute).filter(
            Dispute.transaction_id == transaction_id,
            Dispute.status == 'ochiq'
        ).first()

        if existing:
            await update.message.reply_html("⚠️ Bu tranzaksiya bo'yicha nizo allaqachon ochilgan.")
            return

        dispute = Dispute(
            transaction_id=transaction_id,
            initiator_id=user_id,
            reason=reason
        )
        db.add(dispute)

        # Mark transaction as disputed
        transaction.status = 'bahslashilgan'
        db.commit()

        await update.message.reply_html(
            f"⚖️ Nizo ochildi! 🆔 #{dispute.id}\n\n"
            f"📦 Tranzaksiya: #{transaction_id}\n"
            f"📝 Sabab: {reason}\n\n"
            f"<i>Admin tez orada ko'rib chiqadi.</i>"
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 18: Cross-Border / Chegara ortidan sotish
# /crossborder [lot_id] [country] [shipping_cost]
# ════════════════════════════════════════════════════════════

@auth_required
async def crossborder_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Enable cross-border selling"""
    user_id = update.effective_user.id
    args = context.args

    if len(args) < 1:
        await update.message.reply_html(
            "🌍 <b>Cross-Border</b>\n\n"
            "Lotlaringizni qo'shni davlatlarga ham sotish imkoniyati!\n\n"
            "/crossborder [lot_id] [country] [shipping_cost]\n"
            "/mycrossborder — chegaradosh lotlarim\n\n"
            "<b>Mamlakatlar:</b> KGZ, TJK, KAZ, RUS\n"
            "<b>Misol:</b> /crossborder 5 KAZ 50000",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        lot_id = int(args[0])
        country = args[1].upper()
        shipping_cost = float(args[2]) if len(args) > 2 else 0
    except (ValueError, IndexError):
        await update.message.reply_html("❌ Noto'g'ri format. /crossborder [lot_id] [mamlakat] [yetkazish_narxi]")
        return

    if country not in ('KGZ', 'TJK', 'KAZ', 'RUS'):
        await update.message.reply_html("❌ Mamlakat: KGZ, TJK, KAZ yoki RUS")
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id, Lot.seller_id == user_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        existing = db.query(CrossBorderListing).filter(
            CrossBorderListing.lot_id == lot_id,
            CrossBorderListing.target_country == country
        ).first()

        if existing:
            existing.is_active = not existing.is_active
            status = "yoqildi ✅" if existing.is_active else "o'chirildi ❌"
        else:
            listing = CrossBorderListing(
                lot_id=lot_id, seller_id=user_id,
                target_country=country, shipping_cost=shipping_cost
            )
            db.add(listing)
            status = "yaratildi ✅"
            existing = listing

        db.commit()

        await update.message.reply_html(
            f"🌍 Cross-Border {status}\n"
            f"📦 #{lot_id} {lot.title[:50]}\n"
            f"🌏 Mamlakat: {country}\n"
            f"🚚 Yetkazish: {fmt_price(shipping_cost)}"
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 19: Seller Subscription / Premium sotuvchi
# /subscription — obuna ma'lumotlari
# /subscribe [tier] — obuna bo'lish
# ════════════════════════════════════════════════════════════

@auth_required
async def subscription_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Manage seller subscription"""
    user_id = update.effective_user.id
    args = context.args

    db = SessionLocal()
    try:
        sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()

        tiers = {
            "free": {"name": "Bepul", "price": 0, "features": "5 tagacha lot, asosiy funksiyalar"},
            "basic": {"name": "Basic", "price": 50000, "features": "50 tagacha lot, analitika, ekspert qo'llab-quvvatlash"},
            "pro": {"name": "Pro", "price": 150000, "features": "Cheksiz lot, AI optimizatsiya, cross-border, premium badge"},
            "enterprise": {"name": "Enterprise", "price": 500000, "features": "Barcha funksiyalar, shaxsiy menedjer, API ulanish"},
        }

        current_tier = sub.tier if sub else "free"
        current = tiers.get(current_tier, tiers["free"])

        msg = (
            f"💎 <b>Seller Subscription</b>\n{SEP}\n\n"
            f"Sizning obunangiz: <b>{current['name']}</b>\n"
            f"{current['features']}\n{SEP}\n\n"
            f"<b>Tariflar:</b>\n\n"
        )

        for key, tier in tiers.items():
            is_current = "✅ " if key == current_tier else ""
            price_str = "🆓" if tier['price'] == 0 else f"💰 {fmt_price(tier['price'])}/oy"
            msg += (
                f"{is_current}<b>{tier['name']}</b>"
                f"{' (hozirgi)' if key == current_tier else ''}\n"
                f"  {tier['features']}\n"
                f"  {price_str}\n\n"
            )

        msg += f"{SEP}\nObuna bo'lish: /subscribe [tarif]\nMisol: /subscribe basic"
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


@auth_required
async def subscribe_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Subscribe to a tier"""
    user_id = update.effective_user.id
    args = context.args

    if not args or args[0] not in ('basic', 'pro', 'enterprise'):
        await update.message.reply_html("❌ Tarif: basic, pro yoki enterprise\nBatafsil: /subscription")
        return

    tier = args[0]
    db = SessionLocal()
    try:
        sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if sub:
            sub.tier = tier
            sub.is_active = True
            sub.started_at = datetime.now(timezone.utc)
        else:
            sub = Subscription(user_id=user_id, tier=tier)
            db.add(sub)
        db.commit()

        await update.message.reply_html(
            f"✅ <b>{tier.capitalize()}</b> obunasi faollashtirildi!\n\n"
            f"Endi barcha premium funksiyalardan foydalanishingiz mumkin."
        )
    finally:
        db.close()


# ════════════════════════════════════════════════════════════
# FEATURE 20: Trusted Reviews / Video+Rasmli sharhlar
# /trustedreview [lot_id] [rating] [text]
# /lotreviews [lot_id] — lotning barcha sharhlari
# ════════════════════════════════════════════════════════════

@auth_required
async def trustedreview_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Leave a trusted review with media"""
    user_id = update.effective_user.id
    args = context.args
    if len(args) < 2:
        await update.message.reply_html(
            "⭐ <b>Trusted Reviews</b>\n\n"
            "Haqiqiy xaridor sifatida baho bering!\n\n"
            "/trustedreview [lot_id] [baho] [sharh]\n"
            "/lotreviews [lot_id] — lotning barcha sharhlari\n\n"
            "<b>Baho:</b> 1-5\n"
            "<b>Misol:</b> /trustedreview 5 5 Ajoyib mahsulot!",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        lot_id = int(args[0])
        rating = int(args[1])
        text = " ".join(args[2:]) if len(args) > 2 else ""
    except ValueError:
        await update.message.reply_html("❌ Noto'g'ri format.")
        return

    if rating < 1 or rating > 5:
        await update.message.reply_html("❌ Baho 1 dan 5 gacha bo'lishi kerak.")
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        # Check if user bought this lot
        purchase = db.query(Bid).filter(
            Bid.lot_id == lot_id,
            Bid.buyer_id == user_id,
            Bid.status == 'qabul'
        ).first()

        if not purchase:
            await update.message.reply_html(
                "⚠️ Faqat haqiqiy xaridorlar sharh qoldirishi mumkin.\n"
                "Avval lotni sotib oling!"
            )
            return

        existing = db.query(TrustedReview).filter(
            TrustedReview.lot_id == lot_id,
            TrustedReview.buyer_id == user_id
        ).first()

        if existing:
            await update.message.reply_html("⚠️ Siz bu lotga allaqachon sharh qoldirgansiz.")
            return

        review = TrustedReview(
            lot_id=lot_id, buyer_id=user_id,
            seller_id=lot.seller_id,
            rating=rating, text=text
        )
        db.add(review)

        # Also add to Rating table
        rating_obj = Rating(
            rater_id=user_id, rated_id=lot.seller_id,
            lot_id=lot_id, score=rating, comment=text
        )
        db.add(rating_obj)
        db.commit()

        stars = "⭐" * rating + "☆" * (5 - rating)
        await update.message.reply_html(
            f"✅ <b>Trusted Review qoldirildi!</b>\n\n"
            f"{stars}\n"
            f"📦 #{lot_id} {lot.title[:60]}\n"
            f"💬 {text[:200] if text else 'Sharsiz'}\n\n"
            f"<i>✅ Sotib olinganligi tasdiqlangan</i>"
        )
    finally:
        db.close()


@auth_required
async def lotreviews_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show all trusted reviews for a lot"""
    args = context.args
    if not args:
        await update.message.reply_html("/lotreviews [lot_id] — lot sharhlari")
        return

    try:
        lot_id = int(args[0])
    except ValueError:
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        reviews = db.query(TrustedReview).filter(
            TrustedReview.lot_id == lot_id
        ).order_by(TrustedReview.created_at.desc()).all()

        if not reviews:
            await update.message.reply_html(
                f"📦 <b>{lot.title[:60]}</b>\n\n"
                "⭐ Hali sharhlar yo'q.\n"
                "Birinchi bo'lib baho bering: /trustedreview"
            )
            return

        avg_rating = sum(r.rating for r in reviews) / len(reviews)
        stars = "⭐" * round(avg_rating)

        msg = (
            f"⭐ <b>Sharhlar — #{lot_id}</b>\n"
            f"{stars} {avg_rating:.1f} ({len(reviews)} ta sharh)\n{SEP}\n\n"
        )

        for r in reviews:
            buyer = db.query(User).filter(User.id == r.buyer_id).first()
            media = "📸" if r.media_file_id else ""
            msg += (
                f"<b>{'⭐' * r.rating}</b> {media}\n"
                f"  👤 {buyer.name if buyer else 'Noma'}\n"
                f"  💬 {r.text or ''}\n"
                f"  🕐 {r.created_at.strftime('%d.%m.%Y') if r.created_at else ''}\n\n"
            )

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()

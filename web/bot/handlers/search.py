"""
DeLiKet Bot — /search, /bid, /mybids, /cancelbid
Kun 4: Professional qidirish + taklif tizimi

Features:
- Kategoriya boyicha lot qidirish
- Lot detallarini chiroyli formatda korsatish
- /bid [lot_id] [narx] — taklif yuborish (duplicate check)
- /mybids — takliflarim royhati (inline cancel)
- /cancelbid [bid_id] — taklifni bekor qilish
- Inline lot detail + bid buttons
"""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, InlineQueryResultArticle, InputTextMessageContent
from telegram.ext import ContextTypes, InlineQueryHandler

from api.database import SessionLocal
from api.database.models import Lot, Bid, User
from bot.keyboards.menu import (
    category_keyboard, main_menu_keyboard,
    lot_detail_keyboard,
    confirm_cancel_keyboard, bid_action_keyboard,
    mybids_keyboard
)
from bot.handlers.rating import rating_keyboard, stars_display
from bot.utils.decorators import auth_required, rate_limit
from bot.utils.formatting import (
    lot_summary, lot_detail as fmt_lot_detail,
    bid_receipt, SEP, CATEGORY_EMOJI, GRADE_EMOJI,
    BID_STATUS_EMOJI, GRADE_LABELS, price as fmt_price
)
from bot.utils.i18n import get_text, get_user_lang
import os
import re
import logging

logger = logging.getLogger(__name__)

# Web platform URL (from .env or default)
WEB_URL = os.getenv("WEB_URL", "https://delikat.vercel.app")

VALID_CATEGORIES = {"smartfon", "notebook", "tv", "audio", "aksesuar", "kiyim"}

PER_PAGE = 5  # Lotlar soni har bir sahifada


# ──────────────────────────────────
# /search — Lot qidirish
# ──────────────────────────────────

@auth_required
@rate_limit(3)
async def search_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lot qidirish — kategoriya boyicha"""
    lang = context.user_data.get("lang", "uz")
    args = context.args
    category = args[0].lower() if args else None

    if category and category in VALID_CATEGORIES:
        await _show_category_lots(update, category)
    else:
        await update.message.reply_text(
            "🔍 <b>Lot qidirish</b>\n\n"
            "Kategoriya tanlang yoki <b>/search [kategoriya]</b> deb yozing.\n"
            f"Masalan: <b>/search smartfon</b>\n\n"
            f"<b>Mavjud kategoriyalar:</b>\n"
            f"📱 smartfon — iPhone, Samsung, Redmi\n"
            f"💻 notebook — MacBook, ThinkPad, ASUS ROG\n"
            f"📺 tv — Samsung, LG, kamera\n"
            f"🎧 audio — AirPods, JBL\n"
            f"🔌 aksesuar — Chexol, powerbank, kabel\n"
            f"👕 kiyim — Ko'ylak, kombinezon, forma\n\n"
            f"<i>Lot raqamini bosing → batafsil ma'lumot</i>",
            reply_markup=category_keyboard()
        )


async def _show_category_lots(update: Update, category: str,
                                edit: bool = False, query=None,
                                page: int = 0):
    """Kategoriya boyicha lotlarni korsatish (pagination bilan)"""
    db = SessionLocal()
    try:
        lots = db.query(Lot).filter(
            Lot.category == category,
            Lot.status == 'aktiv'
        ).order_by(Lot.created_at.desc()).all()

        total = len(lots)
        total_pages = max(1, (total + PER_PAGE - 1) // PER_PAGE)
        page = max(0, min(page, total_pages - 1))
        start = page * PER_PAGE
        end = min(start + PER_PAGE, total)

        if not lots:
            msg = f"📭 <b>{category.upper()}</b> — hozircha aktiv lot yo'q."
            if edit and query:
                await query.edit_message_text(msg, reply_markup=category_keyboard())
            else:
                await update.message.reply_text(msg, reply_markup=category_keyboard())
            return

        emoji = CATEGORY_EMOJI.get(category, "📦")
        page_indicator = f" {page+1}/{total_pages}" if total_pages > 1 else ""
        msg = f"{emoji} <b>{category.upper()}</b> ({total} ta lot){page_indicator}\n{SEP}\n\n"

        page_lots = lots[start:end]
        for lot in page_lots:
            lot_dict = {
                "id": lot.id, "title": lot.title,
                "grade": lot.grade, "quantity": lot.quantity,
                "price": lot.price, "category": lot.category,
            }
            msg += lot_summary(lot_dict) + "\n"

        keyboard = _paginated_lot_keyboard(page_lots, category, page, total_pages)
        if edit and query:
            await query.edit_message_text(msg, reply_markup=keyboard)
        else:
            await update.message.reply_text(msg, reply_markup=keyboard)

    finally:
        db.close()


def _paginated_lot_keyboard(lots: list, category: str,
                             page: int, total_pages: int):
    """Lot listidagi har bir lot uchun detail tugmasi + pagination"""
    rows = []
    for lot in lots:
        rows.append([InlineKeyboardButton(
            f"#{lot.id} — {lot.title[:40]}",
            callback_data=f"detail_{lot.id}"
        )])
    # Navigation row
    nav = []
    prefix = f"page_{category}_"
    if page > 0:
        nav.append(InlineKeyboardButton("◀️", callback_data=f"{prefix}{page-1}"))
    nav.append(InlineKeyboardButton(f"{page+1}/{total_pages}", callback_data="noop"))
    if page < total_pages - 1:
        nav.append(InlineKeyboardButton("▶️", callback_data=f"{prefix}{page+1}"))
    if nav:
        rows.append(nav)
    rows.append([InlineKeyboardButton("◀️ Orqaga", callback_data="search")])
    return InlineKeyboardMarkup(rows)


# ──────────────────────────────────
# Lot detail view
# ──────────────────────────────────

async def lot_detail_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lot detallarini korsatish (inline callback)"""
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "uz")

    lot_id = int(query.data.replace("detail_", ""))
    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await query.edit_message_text("❌ Lot topilmadi.")
            return

        seller = db.query(User).filter(User.id == lot.seller_id).first()
        seller_name = seller.name if seller else "Noma'lum"

        bid_count = db.query(Bid).filter(
            Bid.lot_id == lot.id, Bid.status == 'kutmoqda'
        ).count()

        web_link = f"{WEB_URL}/lot?id={lot.id}"

        lot_dict = {
            "id": lot.id, "title": lot.title,
            "category": lot.category, "price": lot.price,
            "quantity": lot.quantity, "grade": lot.grade,
            "status": lot.status, "bid_count": bid_count,
            "created_at": lot.created_at.strftime('%d.%m.%Y') if lot.created_at else None,
            "seller": {"name": seller_name, "rating": seller.rating if seller else 0},
        }

        detail = fmt_lot_detail(lot_dict)

        if lot.image_file_id:
            detail = f"🖼️ <b>Rasm mavjud</b>\n\n" + detail

        if lot.description:
            detail += f"\n📝 <b>Tavsif:</b>\n{lot.description[:200]}\n"

        detail += f"\n🌐 <a href='{web_link}'>Web'da ko'rish</a>"

        # Send photo first if available, then the detail text
        if lot.image_file_id:
            try:
                await context.bot.send_photo(
                    chat_id=user_id,
                    photo=lot.image_file_id,
                    caption=f"📸 <b>#{lot.id}</b> — {lot.title[:50]}"
                )
            except Exception:
                pass  # Photo failed to send, still show text

        await query.edit_message_text(
            detail,
            reply_markup=lot_detail_keyboard(
                lot.id, lot.seller_id, user_id
            ),
            disable_web_page_preview=True
        )

    except Exception:
        await query.edit_message_text("😔 Xatolik yuz berdi.")
    finally:
        db.close()


# ──────────────────────────────────
# /bid — Taklif yuborish
# ──────────────────────────────────

@auth_required
@rate_limit(3)
async def bid_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lotga taklif yuborish: /bid [lot_id] [narx]"""
    lang = context.user_data.get("lang", "uz")
    args = context.args

    if len(args) < 2:
        await update.message.reply_text(
            "❌ Notori format.\n\n"
            "Ishlatish: <b>/bid [lot_id] [narx]</b>\n"
            "Misol: <b>/bid 1 7500000</b>\n\n"
            "Lot raqamlarini /search orqali topishingiz mumkin.\n"
            "Lot detallarini korish: lot raqamini bosing."
        )
        return

    try:
        lot_id = int(args[0])
        price = float(args[1])
    except ValueError:
        await update.message.reply_text(
            "❌ Lot ID va narx raqam bolishi kerak.\n"
            "Misol: /bid 1 7500000"
        )
        return

    # Quantity check (optional)
    quantity = 1
    if len(args) >= 3:
        try:
            quantity = int(args[2])
            if quantity < 1:
                quantity = 1
        except ValueError:
            pass

    buyer_id = update.effective_user.id

    db = SessionLocal()
    try:
        # Check lot exists and active
        lot = db.query(Lot).filter(
            Lot.id == lot_id, Lot.status == 'aktiv'
        ).first()
        if not lot:
            await update.message.reply_text(
                "❌ Bu lot topilmadi yoki aktiv emas.\n"
                "Aktiv lotlarni /search orqali toping."
            )
            return

        # Check own lot
        if lot.seller_id == buyer_id:
            await update.message.reply_text(
                "❌ Oz lothingizga taklif yubora olmaysiz."
            )
            return

        # Price validation
        if price <= 0:
            await update.message.reply_text(
                "❌ Narx 0 dan katta bolishi kerak."
            )
            return
        if price > lot.price * 2:
            await update.message.reply_text(
                "❌ Taklif narxi lot narxidan 2 barobar kop bolmasligi kerak.\n"
                f"Lot narxi: {lot.price:,.0f} som"
            )
            return

        # Quantity validation
        if quantity > lot.quantity:
            await update.message.reply_text(
                f"❌ Kiritilgan son ({quantity}) lot sonidan ({lot.quantity}) kop.\n"
                f"Iltimos, togri son kiriting."
            )
            return

        # Check for duplicate pending bid
        existing = db.query(Bid).filter(
            Bid.lot_id == lot_id,
            Bid.buyer_id == buyer_id,
            Bid.status == 'kutmoqda'
        ).first()
        if existing:
            await update.message.reply_text(
                f"⚠️ Bu lotga avval taklif yuborgansiz (ID: #{existing.id}).\n\n"
                f"Avvalgi taklif: {existing.price:,.0f} som\n"
                f"Yangi taklif: {price:,.0f} som\n\n"
                f"Avvalgi taklifni bekor qilish: /cancelbid {existing.id}\n"
                f"Yangi taklif yuborish: /bid {lot_id} {price:,.0f}"
            )
            return

        # Create bid
        new_bid = Bid(
            lot_id=lot_id,
            buyer_id=buyer_id,
            price=price,
            quantity=quantity,
            status='kutmoqda'
        )
        db.add(new_bid)
        db.commit()
        db.refresh(new_bid)

        # Get seller info
        seller = db.query(User).filter(User.id == lot.seller_id).first()
        seller_name = seller.name if seller else "Noma'lum"

        web_link = f"{WEB_URL}/lot?id={lot_id}"

        receipt = bid_receipt(
            new_bid.id, lot_id, lot.title, price,
            quantity, lot.grade, seller_name
        )
        await update.message.reply_text(
            f"{receipt}\n\n"
            f"🌐 <a href='{web_link}'>Lotni web'da ko'rish</a>",
            reply_markup=main_menu_keyboard(),
            disable_web_page_preview=True
        )

        # ── KUN 5: Sotuvchiga xabarnoma ──
        try:
            seller_notification = (
                f"📩 <b>Yangi taklif!</b>\n{SEP}\n"
                f"  📦 Lot:     <b>#{lot_id}</b> — {lot.title[:50]}\n"
                f"  💰 Taklif:  <b>{fmt_price(price)}</b> × {quantity} dona\n"
                f"  💰 Jami:    <b>{fmt_price(price * quantity)}</b>\n"
                f"  👤 Xaridor: <b>ID {buyer_id}</b>\n"
                f"  📊 Lot narxi: <b>{fmt_price(lot.price)}</b>\n"
                f"{SEP}\n\n"
                f"Iltimos, taklifni qabul qiling yoki rad eting:"
            )
            await context.bot.send_message(
                chat_id=lot.seller_id,
                text=seller_notification,
                reply_markup=bid_action_keyboard(new_bid.id)
            )
        except Exception as notify_err:
            logger.warning(f"Could not notify seller {lot.seller_id}: {notify_err}")

    except Exception as e:
        db.rollback()
        await update.message.reply_text(
            "😔 Xatolik yuz berdi. Iltimos, keyinroq urinib koring."
        )
    finally:
        db.close()


# ──────────────────────────────────
# /mybids — Takliflarim
# ──────────────────────────────────

@auth_required
async def my_bids_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Mening takliflarim — bitta chiroyli xabarda + inline cancel"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        bids = db.query(Bid).filter(Bid.buyer_id == user_id).order_by(
            Bid.created_at.desc()
        ).all()

        if not bids:
            await update.message.reply_text(
                "💰 <b>Takliflarim</b>\n\n"
                "Hozircha takliflaringiz yo'q.\n"
                "Lotlarni /search orqali topishingiz mumkin.",
                reply_markup=main_menu_keyboard()
            )
            return

        pending = sum(1 for b in bids if b.status == 'kutmoqda')
        accepted = sum(1 for b in bids if b.status == 'qabul')
        rejected = sum(1 for b in bids if b.status == 'rad')

        msg = (
            f"💰 <b>Takliflarim ({len(bids)} ta)</b>\n{SEP}\n"
            f"  ⏳ Kutilayotgan: {pending}  |  ✅ Qabul: {accepted}  |  ❌ Rad: {rejected}\n"
            f"{SEP}\n\n"
        )

        # Build keyboard data for mybids_keyboard
        kb_data = []

        for bid in bids:
            lot = db.query(Lot).filter(Lot.id == bid.lot_id).first()
            status_e = BID_STATUS_EMOJI.get(bid.status, "❓")
            lot_title = lot.title[:40] if lot else "Noma'lum lot"

            if bid.status == 'kutmoqda':
                msg += (
                    f"{status_e} <b>#{bid.id}</b> — {lot_title}\n"
                    f"  Taklif: {fmt_price(bid.price)}  ×  {bid.quantity} dona\n"
                    f"  Jami: {fmt_price(bid.price * bid.quantity)}\n"
                    f"  ❌ <i>Bekor qilish uchun tugmani bosing</i>\n\n"
                )
                kb_data.append((bid.id, lot_title, bid.price, bid.status))
            else:
                status_label = {
                    'qabul': '✅ Qabul qilingan',
                    'rad': '❌ Rad etilgan',
                }.get(bid.status, '')
                msg += (
                    f"{status_e} <b>#{bid.id}</b> — {lot_title}\n"
                    f"  Taklif: {fmt_price(bid.price)}  ×  {bid.quantity} dona\n"
                    f"  Jami: {fmt_price(bid.price * bid.quantity)}  |  <i>{status_label}</i>\n\n"
                )

        msg += f"🆕 Yangi taklif: /bid [lot_id] [narx]"

        # Send single message with inline cancel buttons for pending bids
        if kb_data:
            await update.message.reply_html(
                msg,
                reply_markup=mybids_keyboard(kb_data)
            )
        else:
            await update.message.reply_html(msg, reply_markup=main_menu_keyboard())

    finally:
        db.close()


# ──────────────────────────────────
# /cancelbid — Taklifni bekor qilish
# ──────────────────────────────────

@auth_required
async def cancel_bid_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Taklifni bekor qilish: /cancelbid [bid_id] — inline cancel bilan bir xil flow"""
    lang = context.user_data.get("lang", "uz")
    args = context.args

    if not args:
        await update.message.reply_text(
            "❌ Notori format.\n\n"
            "Ishlatish: <b>/cancelbid [bid_id]</b>\n"
            "Misol: <b>/cancelbid 3</b>\n\n"
            "Taklif ID larini /mybids orqali topishingiz mumkin."
        )
        return

    try:
        bid_id = int(args[0])
    except ValueError:
        await update.message.reply_text(
            "❌ Taklif ID raqam bolishi kerak.\n"
            "Misol: /cancelbid 3"
        )
        return

    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        bid = db.query(Bid).filter(Bid.id == bid_id, Bid.buyer_id == user_id).first()

        if not bid:
            await update.message.reply_text(
                "❌ Bu taklif topilmadi yoki sizga tegishli emas.\n"
                "Takliflaringizni /mybids orqali koring."
            )
            return

        if bid.status != 'kutmoqda':
            await update.message.reply_text(
                f"❌ Bu taklifni bekor qilib bolmaydi. Status: {bid.status}"
            )
            return

        lot = db.query(Lot).filter(Lot.id == bid.lot_id).first()
        lot_title = lot.title[:50] if lot else "Noma lum lot"

        # Mark as cancelled (status='rad') — directly, no confirm for command (intentional)
        bid.status = 'rad'
        db.commit()

        await update.message.reply_text(
            f"✅ <b>Taklif #{bid.id} bekor qilindi</b>\n\n"
            f"📦 Lot: {lot_title}\n"
            f"💰 Taklif: {bid.price:,.0f} som\n\n"
            f"Yangi taklif yuborish: /bid {bid.lot_id} [narx]",
            reply_markup=main_menu_keyboard()
        )

    except Exception as e:
        db.rollback()
        await update.message.reply_text(
            "😔 Xatolik yuz berdi. Iltimos, keyinroq urinib koring."
        )
    finally:
        db.close()


# ──────────────────────────────────
# Bid cancel callback
# ──────────────────────────────────

async def cancel_bid_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inline cancel tugmasi — race condition'siz (bid_id callback_data da)"""
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "uz")

    # Match both old (cancel_bid_) and new (mcb_) patterns
    match = re.match(r'^(cancel_bid_|mcb_)(\d+)$', query.data)
    confirm_match = re.match(r'^(confirm_cancel_yes_|confirm_cancel_no_)(\d+)$', query.data)

    if match:
        action = match.group(1)
        bid_id = int(match.group(2))
        user_id = update.effective_user.id

        # Step 1: Show confirm dialog
        db = SessionLocal()
        try:
            bid = db.query(Bid).filter(
                Bid.id == bid_id, Bid.buyer_id == user_id
            ).first()

            if not bid:
                await query.edit_message_text("❌ Taklif topilmadi.")
                return
            if bid.status != 'kutmoqda':
                await query.edit_message_text(
                    f"❌ Bu taklifni bekor qilib bo'lmaydi. Status: {bid.status}"
                )
                return

            lot = db.query(Lot).filter(Lot.id == bid.lot_id).first()
            lot_title = lot.title[:50] if lot else "Noma'lum lot"

            await query.edit_message_text(
                f"⚠️ <b>Taklif #{bid.id} ni bekor qilasizmi?</b>\n\n"
                f"📦 Lot: {lot_title}\n"
                f"💰 Taklif: {bid.price:,.0f} som\n\n"
                f"Bu amalni qaytarib bo'lmaydi.",
                reply_markup=confirm_cancel_keyboard(bid_id)
            )
        finally:
            db.close()
        return

    if confirm_match:
        action = confirm_match.group(1)
        bid_id = int(confirm_match.group(2))
        user_id = update.effective_user.id

        if action == "confirm_cancel_yes_":
            # Step 2: Confirm cancel
            db = SessionLocal()
            try:
                bid = db.query(Bid).filter(
                    Bid.id == bid_id, Bid.buyer_id == user_id
                ).first()
                if bid and bid.status == 'kutmoqda':
                    bid.status = 'rad'
                    db.commit()
                    await query.edit_message_text(
                        f"✅ <b>Taklif #{bid_id} bekor qilindi.</b>",
                        reply_markup=main_menu_keyboard()
                    )
                else:
                    await query.edit_message_text(
                        "❌ Taklif topilmadi yoki avval bekor qilingan.",
                        reply_markup=main_menu_keyboard()
                    )
            finally:
                db.close()
            return

        elif action == "confirm_cancel_no_":
            # Step 2: Abort cancel
            db = SessionLocal()
            try:
                bid = db.query(Bid).filter(Bid.id == bid_id).first()
                lot_title = bid.lot.title[:50] if bid and bid.lot else "Noma'lum lot"
                await query.edit_message_text(
                    f"✅ Bekor qilish bekor qilindi (tushunarli 😄).\n\n"
                    f"Taklif #{bid_id} — {lot_title}",
                    reply_markup=main_menu_keyboard()
                )
            finally:
                db.close()
            return


# ──────────────────────────────────
# Quick bid from lot detail
# ──────────────────────────────────

async def lot_bid_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lot detail dan "Taklif yuborish" bosilganda"""
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "uz")

    lot_id = int(query.data.replace("bid_", ""))
    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id, Lot.status == 'aktiv').first()
        if not lot:
            await query.edit_message_text(
                "❌ Bu lot topilmadi yoki aktiv emas.",
                reply_markup=main_menu_keyboard()
            )
            return

        if lot.seller_id == user_id:
            await query.edit_message_text(
                "❌ O z lothingizga taklif yubora olmaysiz.",
                reply_markup=main_menu_keyboard()
            )
            return

        await query.edit_message_text(
            f"💰 <b>Taklif yuborish</b>\n\n"
            f"📦 <b>Lot:</b> #{lot.id} — {lot.title[:60]}\n"
            f"💰 <b>Lot narxi:</b> {lot.price:,.0f} som\n\n"
            f"Taklif yuborish uchun quyidagi buyruqni yozing:\n\n"
            f"<code>/bid {lot.id} [narx] [son]</code>\n\n"
            f"Misol: <code>/bid {lot.id} 7000000 2</code>\n\n"
            f"Yoki lotlarni qayta ko'rish: /search",
            reply_markup=main_menu_keyboard()
        )
    finally:
        db.close()


# ──────────────────────────────────
# KUN 5: Bid action (accept/reject)
# ──────────────────────────────────

async def bid_action_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvchi taklifni qabul qiladi yoki rad etadi"""
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "uz")

    match = re.match(r'^(bid_accept_|bid_reject_)(\d+)$', query.data)
    if not match:
        await query.edit_message_text("❌ Xatolik: notori callback.")
        return

    action = match.group(1)
    bid_id = int(match.group(2))
    seller_id = update.effective_user.id

    db = SessionLocal()
    try:
        bid = db.query(Bid).filter(Bid.id == bid_id).first()
        if not bid:
            await query.edit_message_text("❌ Taklif topilmadi.")
            return

        lot = db.query(Lot).filter(Lot.id == bid.lot_id).first()
        if not lot:
            await query.edit_message_text("❌ Lot topilmadi.")
            return

        # Check ownership
        if lot.seller_id != seller_id:
            await query.edit_message_text("❌ Bu lot sizga tegishli emas.")
            return

        # Check bid status
        if bid.status != 'kutmoqda':
            await query.edit_message_text(
                f"❌ Bu taklif avval {bid.status} qilingan."
            )
            return

        buyer = db.query(User).filter(User.id == bid.buyer_id).first()
        buyer_name = buyer.name if buyer else "Noma lum"
        seller = db.query(User).filter(User.id == lot.seller_id).first()
        seller_name = seller.name if seller else "Noma lum"

        if action == "bid_accept_":
            # ── QABUL QILISH ──
            bid.status = 'qabul'
            lot.status = 'sotilgan'
            db.commit()

            # Get phone numbers
            buyer_phone = buyer.phone if buyer and buyer.phone else "(ko'rsatilmagan)"
            seller_phone = seller.phone if seller and seller.phone else "(ko'rsatilmagan)"

            web_link = f"{WEB_URL}/lot?id={lot.id}"
            # Seller confirmation with buyer phone
            await query.edit_message_text(
                f"✅ <b>Taklif #{bid_id} qabul qilindi!</b>\n\n"
                f"📦 <b>Lot:</b> #{lot.id} — {lot.title[:50]}\n"
                f"💰 <b>Narx:</b> {bid.price:,.0f} som x {bid.quantity} dona\n"
                f"👤 <b>Xaridor:</b> {buyer_name}\n"
                f"📞 <b>Telefon:</b> <code>{buyer_phone}</code>\n\n"
                f"<b>🔗 Xaridor bilan bog'laning!</b>\n"
                f"🌐 <a href='{web_link}'>Lotni web'da ko'rish</a>\n\n"
                f"Lot statusi <b>sotilgan</b> ga o'zgartirildi.",
                reply_markup=main_menu_keyboard(),
                disable_web_page_preview=True
            )

            # Notify buyer with seller phone
            try:
                buyer_notification = (
                    f"🎉 <b>Taklifingiz qabul qilindi!</b>\n\n"
                    f"📦 <b>Lot:</b> #{lot.id} — {lot.title[:50]}\n"
                    f"💰 <b>Taklif:</b> {bid.price:,.0f} som x {bid.quantity} dona\n"
                    f"💰 <b>Jami:</b> {bid.price * bid.quantity:,.0f} som\n"
                    f"👤 <b>Sotuvchi:</b> {seller.name}\n"
                    f"📞 <b>Telefon:</b> <code>{seller_phone}</code>\n\n"
                    f"<b>🔗 Sotuvchi bilan bog'laning!</b>\n"
                    f"🌐 <a href='{web_link}'>Lotni web'da ko'rish</a>"
                )
                await context.bot.send_message(
                    chat_id=bid.buyer_id,
                    text=buyer_notification,
                    disable_web_page_preview=True
                )
                # ⭐ Buyer rates seller
                await context.bot.send_message(
                    chat_id=bid.buyer_id,
                    text=f"⭐ <b>Sotuvchini baholang!</b>\n\n"
                         f"Bitim yakunlandi! Sotuvchi {seller.name} ni baholang:",
                    reply_markup=rating_keyboard(lot.seller_id, lot.id)
                )
                # ⭐ Seller rates buyer
                await context.bot.send_message(
                    chat_id=lot.seller_id,
                    text=f"⭐ <b>Xaridorni baholang!</b>\n\n"
                         f"Bitim yakunlandi! Xaridor {buyer_name} ni baholang:",
                    reply_markup=rating_keyboard(bid.buyer_id, lot.id)
                )
            except Exception as e:
                logger.warning(f"Could not notify buyer {bid.buyer_id}: {e}")

        elif action == "bid_reject_":
            # ── RAD ETISH ──
            bid.status = 'rad'
            db.commit()

            # Seller confirmation
            await query.edit_message_text(
                f"❌ <b>Taklif #{bid_id} rad etildi.</b>\n\n"
                f"📦 <b>Lot:</b> #{lot.id} — {lot.title[:50]}\n"
                f"💰 <b>Taklif:</b> {bid.price:,.0f} som\n\n"
                f"Lot aktivligicha qolmoqda.",
                reply_markup=main_menu_keyboard()
            )

            # Notify buyer
            try:
                web_link = f"{WEB_URL}/"
                buyer_notification = (
                    f"😔 <b>Taklifingiz rad etildi</b>\n\n"
                    f"📦 <b>Lot:</b> #{lot.id} — {lot.title[:50]}\n"
                    f"💰 <b>Taklif:</b> {bid.price:,.0f} som\n\n"
                    f"Boshqa lotlarni topish:\n"
                    f"🔍 /search — Telegram orqali\n"
                    f"🌐 <a href='{web_link}'>Web platformada</a>"
                )
                await context.bot.send_message(
                    chat_id=bid.buyer_id,
                    text=buyer_notification,
                    disable_web_page_preview=True
                )
            except Exception as e:
                logger.warning(f"Could not notify buyer {bid.buyer_id}: {e}")

    except Exception as e:
        db.rollback()
        await query.edit_message_text("😔 Xatolik yuz berdi.")
    finally:
        db.close()


# ──────────────────────────────────
# Search callback (category selection)
# ──────────────────────────────────

async def search_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inline keyboard callback — kategoriya tanlash va pagination"""
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "uz")

    data = query.data

    # Handle pagination: page_{category}_{page_num}
    if data.startswith("page_"):
        parts = data.split("_", 2)  # ["page", "smartfon", "0"] or ["page", "all", "0"]
        if len(parts) == 3:
            _, cat, page_str = parts
            page = int(page_str)
            if cat == "all":
                await _show_all_lots(query, page=page)
            else:
                await _show_category_lots(None, cat, edit=True, query=query, page=page)
        return

    if data.startswith("cat_"):
        category = data.replace("cat_", "")
        if category == "all":
            await _show_all_lots(query)
        else:
            await _show_category_lots(None, category, edit=True, query=query)

    elif data == "search":
        await query.edit_message_text(
            "🔍 Kategoriya tanlang:",
            reply_markup=category_keyboard()
        )
    elif data == "noop":
        # no-operation button (current page indicator)
        pass


# ──────────────────────────────────
# Inline search (@DeLiKatbot query)
# ──────────────────────────────────

async def inline_search_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """@DeLiKatbot — istalgan chatda lot qidirish"""
    query_text = update.inline_query.query.strip().lower()

    db = SessionLocal()
    try:
        if query_text and len(query_text) >= 2:
            # Search by title OR category
            search_term = f"%{query_text}%"
            lots = db.query(Lot).filter(
                Lot.status == 'aktiv',
                (Lot.title.ilike(search_term) | Lot.category.ilike(search_term))
            ).order_by(Lot.created_at.desc()).limit(20).all()
        else:
            # No query — show recent lots
            lots = db.query(Lot).filter(
                Lot.status == 'aktiv'
            ).order_by(Lot.created_at.desc()).limit(10).all()

        results = []
        CATEGORY_ICONS = {'smartfon': '📱', 'notebook': '💻', 'tv': '📺', 'audio': '🎧', 'aksesuar': '🔌', 'kiyim': '👕'}

        for lot in lots:
            icon = CATEGORY_ICONS.get(lot.category, '📦')
            web_url = f"{WEB_URL}/lot?id={lot.id}"

            description = (
                f"💰 {lot.price:,.0f} so'm"
                f"  |  📦 {lot.quantity} dona"
                f"  |  🏷️ {lot.grade or 'N/A'}"
            )

            msg_content = (
                f"<b>{icon} #{lot.id} — {lot.title}</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"💰 Narx:       <b>{lot.price:,.0f} so'm</b>\n"
                f"📦 Soni:       <b>{lot.quantity} dona</b>\n"
                f"🏷️ Grade:      <b>{lot.grade or 'N/A'}</b>\n"
                f"📂 Kategoriya: <b>{lot.category}</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"🌐 <a href='{web_url}'>Web'da ko'rish</a>\n"
                f"💬 Taklif yuborish: /bid {lot.id} [narx]"
            )

            results.append(InlineQueryResultArticle(
                id=str(lot.id),
                title=f"{icon} #{lot.id} {lot.title[:42]}",
                description=description[:100],
                input_message_content=InputTextMessageContent(
                    msg_content,
                    parse_mode='HTML',
                    disable_web_page_preview=True
                ),
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton(
                        "🌐 Web'da ko'rish", url=web_url
                    )],
                    [InlineKeyboardButton(
                        "💰 Taklif yuborish", callback_data=f"bid_{lot.id}"
                    )],
                ])
            ))

        await update.inline_query.answer(results, cache_time=30, is_personal=True)

    except Exception as e:
        logger.error(f"Inline search error: {e}")
        await update.inline_query.answer([], cache_time=10)
    finally:
        db.close()


async def _show_all_lots(query, page: int = 0):
    """Barcha aktiv lotlarni korsatish (pagination bilan)"""
    db = SessionLocal()
    try:
        lots = db.query(Lot).filter(Lot.status == 'aktiv')\
            .order_by(Lot.created_at.desc()).all()

        total = len(lots)
        total_pages = max(1, (total + PER_PAGE - 1) // PER_PAGE)
        page = max(0, min(page, total_pages - 1))
        start = page * PER_PAGE
        end = min(start + PER_PAGE, total)

        if not lots:
            await query.edit_message_text("📭 Hozircha aktiv lotlar yo'q.")
            return

        page_indicator = f" ({page+1}/{total_pages})" if total_pages > 1 else ""
        msg = f"📦 <b>Barcha aktiv lotlar</b>{page_indicator}\n{SEP}\n\n"

        page_lots = lots[start:end]
        for lot in page_lots:
            lot_dict = {
                "id": lot.id, "title": lot.title,
                "grade": lot.grade, "quantity": lot.quantity,
                "price": lot.price, "category": lot.category,
            }
            msg += lot_summary(lot_dict) + "\n"

        keyboard = _paginated_lot_keyboard(page_lots, "all", page, total_pages)
        await query.edit_message_text(msg, reply_markup=keyboard)
    finally:
        db.close()

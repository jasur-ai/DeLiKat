"""
DeLiKet Bot — /newlot and /mylots
Full ConversationHandler for lot creation + status management

Steps:
1. CATEGORY — inline keyboard tanlash
2. TITLE — text input (nomi)
3. IMAGE — photo yuklash (YANGI!)
4. PRICE — number input (narx)
5. QUANTITY — number input (soni)
6. GRADE — inline keyboard (A/B/C)
7. CONFIRM — tasdiqlash/bekor qilish
"""

from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler

from api.database import SessionLocal
from api.database.models import Lot, Bid
from bot.keyboards.menu import (
    category_keyboard, main_menu_keyboard, grade_keyboard,
    confirm_keyboard, lot_actions_keyboard, skip_image_keyboard
)
from bot.utils.decorators import auth_required
from bot.utils.session import session_manager
from bot.utils.formatting import (
    header, SEP, SEP_THIN, price as fmt_price,
    CATEGORY_EMOJI, CATEGORY_NAMES, GRADE_EMOJI, GRADE_LABELS
)
from bot.utils.i18n import get_text

import os

# Web platform URL (from .env or default)
WEB_URL = os.getenv("WEB_URL", "https://delikat.vercel.app")

# Conversation states — 7 states (1 new: STEP_IMAGE)
STEP_CATEGORY, STEP_TITLE, STEP_IMAGE, STEP_PRICE, STEP_QUANTITY, STEP_GRADE, STEP_CONFIRM = range(7)

VALID_CATEGORIES = {"smartfon", "notebook", "tv", "audio", "aksesuar", "kiyim"}


# ──────────────────────────────────
# /newlot — ConversationHandler
# ──────────────────────────────────

@auth_required
async def newlot_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """1-bosqich: Kategoriya tanlash"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["newlot"] = {}

    await update.message.reply_text(
        f"🆕 <b>{get_text(lang, 'lot', 'create')}</b>\n\n"
        f"{get_text(lang, 'lot', 'step_category')}\n\n"
        f"Mahsulotingiz qaysi kategoriyaga tegishli?",
        reply_markup=category_keyboard(lang)
    )
    return STEP_CATEGORY


async def newlot_category(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """2-bosqich: Mahsulot nomi"""
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "uz")

    data = query.data.replace("cat_", "")
    if data == "all":
        await query.edit_message_text(
            "Iltimos, aniq kategoriya tanlang:",
            reply_markup=category_keyboard()
        )
        return STEP_CATEGORY

    if data not in VALID_CATEGORIES:
        await query.edit_message_text(
            "❌ Noto'g'ri kategoriya. Qaytadan tanlang:",
            reply_markup=category_keyboard()
        )
        return STEP_CATEGORY

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["newlot"]["category"] = data

    await query.edit_message_text(
        f"✅ Kategoriya: <b>{CATEGORY_NAMES.get(data, data)}</b>\n\n"
        "<b>2/6: Mahsulot nomini yozing</b>\n\n"
        "Misol: <i>iPhone 14 Pro 256GB Deep Purple</i>\n"
        "Maksimal 100 ta belgi.",
        reply_markup=None
    )
    return STEP_TITLE


async def newlot_title(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """2-bosqich: Nomi qabul qilindi → 3-bosqich: Rasm so'rash"""
    title = update.message.text.strip()

    if len(title) < 3:
        await update.message.reply_text(
            "❌ Nomi juda qisqa (kamida 3 belgi). Qaytadan yozing:"
        )
        return STEP_TITLE
    if len(title) > 100:
        await update.message.reply_text(
            "❌ Nomi juda uzun (maksimal 100 belgi). Qaytadan yozing:"
        )
        return STEP_TITLE

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["newlot"]["title"] = title

    await update.message.reply_text(
        f"✅ Nomi: <b>{title[:60]}</b>\n\n"
        "<b>3/6: Mahsulot rasmini yuboring</b>\n\n"
        "📸 Mahsulotingizning rasmini yuboring.\n"
        "Bu xaridorlarga mahsulotni ko'rishga yordam beradi.\n\n"
        "<i>Agar rasm bo'lmasa — ⏭️ Rasmsiz davom etish</i>",
        reply_markup=skip_image_keyboard()
    )
    return STEP_IMAGE


async def newlot_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """3-bosqich: Rasm qabul qilindi → 4-bosqich: Narx"""
    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)

    # Get the largest photo (filters.PHOTO ensures we only get photos)
    photo = update.effective_message.photo[-1]
    file_id = photo.file_id
    session.data["newlot"]["image_file_id"] = file_id

    await update.message.reply_text(
        "✅ Rasm qabul qilindi! 📸\n\n"
        "<b>4/6: Mahsulot narxini yozing</b>\n\n"
        "Bir dona uchun so'mda narx.\n"
        "Misol: <i>7500000</i> (7 500 000 so'm)",
    )
    return STEP_PRICE


async def newlot_skip_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """3-bosqich: Rasmni o'tkazib yuborish → 4-bosqich: Narx"""
    query = update.callback_query
    await query.answer()

    await query.edit_message_text(
        "⏭️ Rasm yuklanmadi. Davom etamiz...\n\n"
        "<b>4/6: Mahsulot narxini yozing</b>\n\n"
        "Bir dona uchun so'mda narx.\n"
        "Misol: <i>7500000</i> (7 500 000 so'm)",
    )
    return STEP_PRICE


async def newlot_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """4-bosqich: Narx qabul qilindi → 5-bosqich: Soni"""
    text = update.message.text.strip()
    # Remove spaces and commas
    text = text.replace(" ", "").replace(",", "")

    try:
        price = float(text)
    except ValueError:
        await update.message.reply_text(
            "❌ Noto'g'ri format. Iltimos, raqam yozing.\n"
            "Misol: <i>7500000</i> (7 500 000 so'm)"
        )
        return STEP_PRICE

    if price <= 0:
        await update.message.reply_text(
            "❌ Narx 0 dan katta bo'lishi kerak.\n"
            "Iltimos, to'g'ri narx yozing:"
        )
        return STEP_PRICE
    if price > 1_000_000_000:
        await update.message.reply_text(
            "❌ Narx juda katta (maksimal 1 mlrd so'm).\n"
            "Iltimos, to'g'ri narx yozing:"
        )
        return STEP_PRICE

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["newlot"]["price"] = price

    await update.message.reply_text(
        f"✅ Narx: <b>{price:,.0f} so'm</b>\n\n"
        "<b>5/6: Mahsulot sonini yozing</b>\n\n"
        "Nechta dona bor? (butun son)\n"
        "Misol: <i>5</i>",
    )
    return STEP_QUANTITY


async def newlot_quantity(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """5-bosqich: Soni qabul qilindi → 6-bosqich: Grade tanlash"""
    text = update.message.text.strip()

    try:
        quantity = int(text)
    except ValueError:
        await update.message.reply_text(
            "❌ Noto'g'ri format. Iltimos, butun son yozing.\n"
            "Misol: <i>5</i> (besh dona)"
        )
        return STEP_QUANTITY

    if quantity <= 0:
        await update.message.reply_text(
            "❌ Soni 0 dan katta bo'lishi kerak.\n"
            "Iltimos, to'g'ri son yozing:"
        )
        return STEP_QUANTITY
    if quantity > 100_000:
        await update.message.reply_text(
            "❌ Juda ko'p (maksimal 100 000 dona).\n"
            "Iltimos, to'g'ri son yozing:"
        )
        return STEP_QUANTITY

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["newlot"]["quantity"] = quantity

    await update.message.reply_text(
        f"✅ Soni: <b>{quantity:,} dona</b>\n\n"
        "<b>6/6: Mahsulot holatini tanlang (Grade)</b>\n\n"
        "• 🟢 <b>A</b> — Yangi, ochilmagan\n"
        "• 🟡 <b>B</b> — Ochilgan, ishlatilgan\n"
        "• 🔴 <b>C</b> — Nuqsonli, ehtiyot qism",
        reply_markup=grade_keyboard()
    )
    return STEP_GRADE


async def newlot_grade(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """6-bosqich: Grade tanlandi → Yakuniy tasdiqlash"""
    query = update.callback_query
    await query.answer()

    grade = query.data.replace("grade_", "")

    if grade not in ("A", "B", "C"):
        await query.edit_message_text(
            "❌ Noto'g'ri tanlov. Qaytadan tanlang:",
            reply_markup=grade_keyboard()
        )
        return STEP_GRADE

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["newlot"]["grade"] = grade

    # Show summary with image indicator
    data = session.data["newlot"]
    img_indicator = "✅ Rasm bor 📸" if data.get("image_file_id") else "⏭️ Rasmsiz"
    summary = (
        "📋 <b>Lot ma'lumotlari</b>\n\n"
        f"📂 Kategoriya: <b>{CATEGORY_NAMES.get(data['category'], data['category'])}</b>\n"
        f"📛 Nomi: <b>{data['title'][:60]}</b>\n"
        f"🖼️ Rasm: <b>{img_indicator}</b>\n"
        f"💰 Narx: <b>{data['price']:,.0f} so'm</b>\n"
        f"📦 Soni: <b>{data['quantity']:,} dona</b>\n"
        f"🏷️ Grade: <b>{GRADE_LABELS.get(grade, grade)}</b>\n\n"
        "Tasdiqlaysizmi?"
    )

    await query.edit_message_text(summary, reply_markup=confirm_keyboard("lot_"))
    return STEP_CONFIRM


async def newlot_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Tasdiqlash → DB ga saqlash"""
    query = update.callback_query
    await query.answer()

    if query.data == "lot_no":
        user_id = update.effective_user.id
        session = session_manager.get_or_create(user_id)
        session.data.pop("newlot", None)

        await query.edit_message_text(
            f"❌ Lot bekor qilindi.\n{SEP_THIN}\n"
            f"Yangi lot yaratish: /newlot",
            reply_markup=main_menu_keyboard()
        )
        return ConversationHandler.END

    if query.data != "lot_yes":
        await query.edit_message_text(
            "❌ Noto'g'ri tanlov. Iltimos tugmalardan foydalaning.",
            reply_markup=confirm_keyboard("lot_")
        )
        return STEP_CONFIRM

    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    data = session.data.get("newlot", {})

    if not all(k in data for k in ("category", "title", "price", "quantity", "grade")):
        await query.edit_message_text(
            "😔 Xatolik: ma'lumotlar to'liq emas. Iltimos, /newlot ni qayta boshlang."
        )
        session.data.pop("newlot", None)
        return ConversationHandler.END

    # Save to DB
    db = SessionLocal()
    try:
        lot = Lot(
            seller_id=user_id,
            category=data["category"],
            title=data["title"],
            description=data.get("description", ""),
            quantity=data["quantity"],
            price=data["price"],
            grade=data["grade"],
            image_file_id=data.get("image_file_id"),
            status="aktiv",
        )
        db.add(lot)
        db.commit()
        db.refresh(lot)

        session.data.pop("newlot", None)

        grade_e = GRADE_EMOJI.get(data['grade'], "⚪")
        cat_e = CATEGORY_EMOJI.get(data['category'], "📦")
        web_link = f"{WEB_URL}/lot?id={lot.id}"
        # If there's an image, try to send it with the lot
        if data.get("image_file_id"):
            try:
                await context.bot.send_photo(
                    chat_id=user_id,
                    photo=data["image_file_id"],
                    caption=f"📸 <b>#{lot.id}</b> — {lot.title[:50]}"
                )
                img_line = f"🖼️ Rasm:      ✅ yuklandi\n"
            except Exception:
                img_line = ""
        else:
            img_line = ""

        await query.edit_message_text(
            f"✅ <b>Lot #{lot.id} yaratildi!</b>\n{SEP}\n"
            f"  {cat_e} Kategoriya: <b>{CATEGORY_NAMES.get(data['category'], data['category'])}</b>\n"
            f"  📛 Nomi:        <b>{data['title'][:55]}</b>\n"
            f"{img_line}"
            f"  💰 Narx:        <b>{fmt_price(data['price'])}</b>\n"
            f"  📦 Soni:        <b>{data['quantity']:,} dona</b>\n"
            f"  {grade_e} Grade:       <b>{data['grade']}</b> — {GRADE_LABELS.get(data['grade'], '')}\n"
            f"{SEP}\n\n"
            f"🌐 <a href='{web_link}'>Web'da ko'rish</a>\n\n"
            f"<b>Keyin:</b> /mylots — lotlarim  |  /newlot — yangi lot",
            reply_markup=main_menu_keyboard(),
            disable_web_page_preview=True
        )

    except Exception as e:
        db.rollback()
        await query.edit_message_text(
            "😔 Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.\n"
            "/newlot ni qayta boshlang."
        )
    finally:
        db.close()

    return ConversationHandler.END


async def newlot_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/cancel — lot yaratishni bekor qilish"""
    user_id = update.effective_user.id
    session = session_manager.get(user_id)
    if session:
        session.data.pop("newlot", None)

    await update.message.reply_text(
        "❌ Lot yaratish bekor qilindi.",
        reply_markup=main_menu_keyboard()
    )
    return ConversationHandler.END


async def newlot_timeout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Timeout — 5 daqiqa harakatsizlik"""
    user_id = update.effective_user.id
    session = session_manager.get(user_id)
    if session:
        session.data.pop("newlot", None)

    await update.message.reply_text(
        "⏳ Vaqt tugadi. Lot yaratish bekor qilindi.\n"
        "Qayta boshlash: /newlot",
        reply_markup=main_menu_keyboard()
    )
    return ConversationHandler.END


async def _title_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Noto'g'ri turdagi xabar — STEP_TITLE da qayta so'rash"""
    await update.message.reply_text(
        "❌ Iltimos, mahsulot nomini matn shaklida yozing:"
    )
    return STEP_TITLE


async def _image_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Noto'g'ri turdagi xabar — STEP_IMAGE da qayta so'rash"""
    await update.message.reply_text(
        "❌ Iltimos, mahsulot rasmini yuboring yoki ⏭️ <b>Rasmsiz davom etish</b> tugmasini bosing.",
        reply_markup=skip_image_keyboard()
    )
    return STEP_IMAGE


async def _price_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Noto'g'ri turdagi xabar — STEP_PRICE da qayta so'rash"""
    await update.message.reply_text(
        "❌ Iltimos, narxni raqam shaklida yozing:\n"
        "Misol: <i>7500000</i>"
    )
    return STEP_PRICE


async def _quantity_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Noto'g'ri turdagi xabar — STEP_QUANTITY da qayta so'rash"""
    await update.message.reply_text(
        "❌ Iltimos, sonni butun raqam shaklida yozing:\n"
        "Misol: <i>5</i>"
    )
    return STEP_QUANTITY


# ──────────────────────────────────
# /mylots — lotlarim ro'yxati
# ──────────────────────────────────

@auth_required
async def my_lots_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvchining lotlarini DB dan o'qib ko'rsatish"""
    user_id = update.effective_user.id

    db = SessionLocal()
    try:
        lots = db.query(Lot).filter(Lot.seller_id == user_id).order_by(
            Lot.created_at.desc()
        ).all()

        if not lots:
            await update.message.reply_text(
                "📋 <b>Lotlarim</b>\n\n"
                "Hozircha lotlaringiz yo'q.\n\n"
                "Yangi lot qo'shish: /newlot\n"
                "Boshqa sotuvchilarning lotlarini ko'rish: /search",
                reply_markup=main_menu_keyboard()
            )
            return

        total = len(lots)
        active = sum(1 for l in lots if l.status == 'aktiv')
        sold = sum(1 for l in lots if l.status == 'sotilgan')
        archived = sum(1 for l in lots if l.status == 'arxiv')

        msg = (
            f"📋 <b>Lotlarim ({total} ta)</b>\n{SEP}\n"
            f"  🟢 Aktiv: {active}  |  💰 Sotilgan: {sold}  |  📦 Arxiv: {archived}\n"
            f"{SEP}\n\n"
        )

        STATUS_EMOJI = {"aktiv": "🟢", "sotilgan": "💰", "arxiv": "📦"}

        for i, lot in enumerate(lots[:10]):
            s_e = STATUS_EMOJI.get(lot.status, "⚪")
            g_e = GRADE_EMOJI.get(lot.grade, "⚪")
            msg += (
                f"{s_e} <b>#{lot.id}</b> {lot.title[:50]}\n"
                f"  {g_e} {CATEGORY_NAMES.get(lot.category, lot.category)} | "
                f"{lot.quantity} dona | {fmt_price(lot.price)} | <b>{lot.status}</b>\n"
            )

            bid_count = db.query(Bid).filter(
                Bid.lot_id == lot.id, Bid.status == 'kutmoqda'
            ).count()
            if bid_count > 0:
                msg += f"  💬 <b>{bid_count}</b> ta taklif kutilmoqda\n"
            msg += "\n"

        if total > 10:
            msg += f"<i>... va yana {total - 10} ta lot</i>\n\n"

        msg += f"🆕 /newlot  —  Yangi lot qo'shish"

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())

        # Send action buttons for first 3 lots
        shown_actions = 0
        for lot in lots:
            if shown_actions >= 3:
                break
            action_msg = (
                f"<b>#{lot.id}</b> {lot.title[:50]}\n"
                f"Status: <b>{lot.status}</b>"
            )
            await update.message.reply_html(
                action_msg,
                reply_markup=lot_actions_keyboard(lot.id, lot.status)
            )
            shown_actions += 1

    except Exception as e:
        await update.message.reply_text(
            "😔 Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring."
        )
    finally:
        db.close()


# ──────────────────────────────────
# Lot status o'zgartirish (callback)
# ──────────────────────────────────

async def lot_action_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Lot action callback (arxivlash, aktivlashtirish)"""
    query = update.callback_query
    await query.answer()

    data = query.data
    if data.startswith("lot_archive_"):
        lot_id = int(data.replace("lot_archive_", ""))
        new_status = "arxiv"
    elif data.startswith("lot_activate_"):
        lot_id = int(data.replace("lot_activate_", ""))
        new_status = "aktiv"
    else:
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await query.edit_message_text("❌ Lot topilmadi.")
            return

        # Check ownership
        if lot.seller_id != update.effective_user.id:
            await query.edit_message_text("❌ Bu lot sizga tegishli emas.")
            return

        lot.status = new_status
        db.commit()

        status_text = "📦 Arxivlandi" if new_status == "arxiv" else "🟢 Aktivlashtirildi"
        await query.edit_message_text(
            f"✅ <b>#{lot.id}</b> {status_text}\n{SEP_THIN}\n"
            f"{lot.title[:60]}",
            reply_markup=main_menu_keyboard()
        )

    except Exception as e:
        await query.edit_message_text("😔 Xatolik yuz berdi.")
    finally:
        db.close()

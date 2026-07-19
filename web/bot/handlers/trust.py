"""
DeLiKet Bot — Trust & Safety Features (Feature 6, 8, 12-15)
Questions, Escrow, Trust Score, Anti-Fraud, Price Intelligence, Reviews
"""

import logging
import re
from datetime import datetime, timezone
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from api.database import SessionLocal
from api.database.models import (
    User, Lot, Bid, Question, Transaction,
    Rating, PriceAlert, SavedSearch
)
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.decorators import auth_required
from bot.utils.formatting import (
    SEP, SEP_THIN, price as fmt_price, CATEGORY_EMOJI,
    stars_display, GRADE_EMOJI, GRADE_LABELS
)
from bot.utils.i18n import get_text
import os

logger = logging.getLogger(__name__)
WEB_URL = os.getenv("WEB_URL", "https://delikat.vercel.app")


# ═══════════════════════════════════════════════
# FEATURE 6: /ask — Sotuvchiga savol berish
# ═══════════════════════════════════════════════

@auth_required
async def ask_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Sotuvchiga savol berish: /ask [lot_id] [savol]"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    args = context.args

    if len(args) < 2:
        await update.message.reply_html(
            "💬 <b>Sotuvchiga savol</b>\n\n"
            "Lot haqida savol berish uchun:\n"
            "/ask [lot_id] [savolingiz]\n\n"
            "<b>Misol:</b>\n"
            "/ask 5 Bu notebookning batareyasi qancha turadi?",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        lot_id = int(args[0])
        question_text = " ".join(args[1:])[:500]
    except ValueError:
        await update.message.reply_html("❌ Noto'g'ri lot ID.")
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        if lot.seller_id == user_id:
            await update.message.reply_html("❌ O'z lothingizga savol bera olmaysiz.")
            return

        question = Question(
            lot_id=lot_id,
            buyer_id=user_id,
            seller_id=lot.seller_id,
            question=question_text,
        )
        db.add(question)
        db.commit()
        db.refresh(question)

        seller = db.query(User).filter(User.id == lot.seller_id).first()
        seller_name = seller.name if seller else "Noma'lum"
        buyer = db.query(User).filter(User.id == user_id).first()
        buyer_name = buyer.name if buyer else "Noma'lum"

        # Confirm to buyer
        await update.message.reply_html(
            f"✅ <b>Savol yuborildi!</b>\n\n"
            f"📦 #{lot.id} — {lot.title[:50]}\n"
            f"👤 Sotuvchi: {seller_name}\n"
            f"💬 Savol: {question_text[:200]}\n\n"
            f"<i>Javob kelishi bilan xabar beramiz</i>",
            reply_markup=main_menu_keyboard()
        )

        # Forward to seller
        try:
            seller_msg = (
                f"💬 <b>Yangi savol!</b>\n{SEP}\n"
                f"📦 <b>Lot:</b> #{lot.id} — {lot.title[:50]}\n"
                f"👤 <b>Kimdan:</b> {buyer_name}\n"
                f"💬 <b>Savol:</b>\n{question_text}\n\n"
                f"Javob berish uchun /answer {question.id} [javob]",
            )
            await context.bot.send_message(
                chat_id=lot.seller_id,
                text=seller_msg,
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton(
                        "💬 Javob berish",
                        callback_data=f"ans_{question.id}"
                    )]
                ])
            )
        except Exception as e:
            logger.warning(f"Could not notify seller {lot.seller_id}: {e}")

    finally:
        db.close()


# ═══════════════════════════════════════════════
# /answer — Savolga javob berish
# ═══════════════════════════════════════════════

@auth_required
async def answer_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Savolga javob berish: /answer [question_id] [javob]"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    args = context.args

    if len(args) < 2:
        await update.message.reply_html(
            "Javob berish: /answer [savol_id] [javobingiz]\n"
            "Misol: /answer 3 Batareyasi 2 soat turadi"
        )
        return

    try:
        q_id = int(args[0])
        answer_text = " ".join(args[1:])[:1000]
    except ValueError:
        await update.message.reply_html("❌ Noto'g'ri savol ID.")
        return

    db = SessionLocal()
    try:
        question = db.query(Question).filter(Question.id == q_id).first()
        if not question:
            await update.message.reply_html("❌ Savol topilmadi.")
            return

        if question.seller_id != user_id:
            await update.message.reply_html("❌ Bu savol sizga tegishli emas.")
            return

        if question.answer:
            await update.message.reply_html("⚠️ Bu savolga avval javob berilgan.")
            return

        question.answer = answer_text
        question.answered_at = datetime.now(timezone.utc)
        db.commit()

        lot = db.query(Lot).filter(Lot.id == question.lot_id).first()
        buyer = db.query(User).filter(User.id == question.buyer_id).first()

        await update.message.reply_html(f"✅ Javob yuborildi.")

        # Notify buyer
        try:
            await context.bot.send_message(
                chat_id=question.buyer_id,
                text=(
                    f"💬 <b>Savolingizga javob keldi!</b>\n{SEP}\n"
                    f"📦 <b>Lot:</b> #{lot.id} — {lot.title[:50] if lot else ''}\n"
                    f"💬 <b>Savol:</b> {question.question[:200]}\n"
                    f"💬 <b>Javob:</b> {answer_text}\n\n"
                    f"Taklif yuborish: /bid {question.lot_id} [narx]"
                ),
                reply_markup=InlineKeyboardMarkup([
                    [InlineKeyboardButton(
                        "💰 Taklif yuborish",
                        callback_data=f"bid_{question.lot_id}"
                    )]
                ])
            )
        except Exception as e:
            logger.warning(f"Could not notify buyer: {e}")

    finally:
        db.close()


# ═══════════════════════════════════════════════
# Answer callback
# ═══════════════════════════════════════════════

async def answer_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Savolga javob berish callback"""
    query = update.callback_query
    await query.answer()
    match = re.match(r'^ans_(\d+)$', query.data)
    if not match:
        return
    q_id = int(match.group(1))
    db = SessionLocal()
    try:
        q = db.query(Question).filter(Question.id == q_id).first()
        if not q:
            await query.edit_message_text("❌ Savol topilmadi.")
            return
        await query.edit_message_text(
            f"💬 <b>Savol #{q_id}</b>\n{SEP}\n"
            f"💬 {q.question[:300]}\n\n"
            f"Javob yozish: /answer {q_id} [javobingiz]",
            reply_markup=main_menu_keyboard()
        )
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 8: /escrow — Transaction/Escrow
# ═══════════════════════════════════════════════

@auth_required
async def escrow_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Xaridor himoyasi — transaksiya statusi"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    db = SessionLocal()
    try:
        # Find active transactions for user
        transactions = db.query(Transaction).filter(
            (Transaction.buyer_id == user_id) | (Transaction.seller_id == user_id)
        ).order_by(Transaction.created_at.desc()).all()

        if not transactions:
            await update.message.reply_html(
                "🔐 <b>Xaridor himoyasi</b>\n\n"
                "Hozircha faol transaksiyalar yo'q.\n\n"
                "<b>Escrow tizimi</b> — xaridoringizni himoya qiladi:\n"
                "1️⃣ Siz to'laysiz (platformada saqlanadi)\n"
                "2️⃣ Sotuvchi mahsulotni jo'natadi\n"
                "3️⃣ Siz mahsulotni qabul qilasiz\n"
                "4️⃣ To'lov sotuvchiga o'tkaziladi\n\n"
                "<i>Hozircha escrow tizimi test rejimida</i>",
                reply_markup=main_menu_keyboard()
            )
            return

        msg = f"🔐 <b>Transaksiyalar ({len(transactions)} ta)</b>\n{SEP}\n\n"
        for t in transactions:
            status_map = {
                'kutmoqda': '⏳ Kutilmoqda',
                'yakunlandi': '✅ Yakunlangan',
                'bahslashilgan': '⚠️ Bahs',
            }
            status = status_map.get(t.status, t.status)
            role = "Sotuvchi" if t.seller_id == user_id else "Xaridor"
            other_id = t.seller_id if t.buyer_id == user_id else t.buyer_id

            msg += (
                f"<b>#{t.id}</b> | {status}\n"
                f"  Siz: {role} | Narx: {fmt_price(t.amount)}\n"
                f"  {SEP_THIN}\n\n"
            )
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 12: Trust Score System
# ═══════════════════════════════════════════════

@auth_required
async def trustscore_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ishonch reytingi"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    args = context.args

    db = SessionLocal()
    try:
        # Check other user's trust if provided
        if args:
            try:
                target_id = int(args[0])
            except ValueError:
                await update.message.reply_html("❌ Noto'g'ri user ID.")
                return
        else:
            target_id = user_id

        target = db.query(User).filter(User.id == target_id).first()
        if not target:
            await update.message.reply_html("❌ Foydalanuvchi topilmadi.")
            return

        # Calculate trust components
        total_deals = target.total_sales + target.total_purchases
        completed_deals = db.query(Transaction).filter(
            (Transaction.buyer_id == target_id) | (Transaction.seller_id == target_id),
            Transaction.status == 'yakunlandi'
        ).count() if not target.total_sales else min(target.total_sales, target.total_purchases)

        # Rating stats
        ratings = db.query(Rating).filter(Rating.rated_id == target_id).all()
        avg_rating = sum(r.score for r in ratings) / len(ratings) if ratings else 0
        rating_count = len(ratings)

        # Response time
        response_time = target.response_time_min or 0

        # Determine trust level
        trust_score = target.trust_score or 0
        if trust_score >= 80:
            level = "🏆 Yuqori ishonch"
            color = "🟢"
        elif trust_score >= 50:
            level = "👍 Ishonchli"
            color = "🟡"
        elif trust_score >= 20:
            level = "📈 O'sib bormoqda"
            color = "🟠"
        else:
            level = "🆕 Yangi foydalanuvchi"
            color = "⚪"

        msg = (
            f"🏆 <b>Ishonch reytingi</b>\n{SEP}\n\n"
            f"👤 <b>{target.name}</b>\n"
            f"  Daraja: {level}\n"
            f"  Ball: <b>{trust_score:.0f}/100</b>\n\n"
            f"<b>Komponentlar:</b>\n"
            f"  ⭐ Reyting: {stars_display(avg_rating, rating_count)}\n"
            f"  📊 Bitimlar: {total_deals} ta\n"
            f"  ✅ Yakunlangan: {completed_deals} ta\n"
            f"  ⏱ Javob vaqti: {response_time:.0f} min\n\n"
            f"{'🟦 <b>Tasdiqlangan foydalanuvchi</b>' if target.is_verified else '⬜ <b>Tasdiqlanmagan</b>'}\n"
            f"{SEP}\n"
            f"<i>Ishonch reytingi bitimlar va faollik asosida hisoblanadi</i>"
        )
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard() if target_id == user_id else None)
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 13: /report — Shubhali lotni xabar qilish
# ═══════════════════════════════════════════════

@auth_required
async def report_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Shubhali lot haqida xabar qilish"""
    lang = context.user_data.get("lang", "uz")
    args = context.args
    if not args:
        await update.message.reply_html(
            "🛡️ <b>Shubhali lotni xabar qilish</b>\n\n"
            "Agar lotda firibgarlik, soxta mahsulot yoki "
            "shubhali narsa sezsangiz, xabar qiling:\n\n"
            "/report [lot_id] [sabab]\n\n"
            "<b>Misol:</b>\n"
            "/report 10 Bu lot juda arzon, firibgarlik bo'lishi mumkin",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        lot_id = int(args[0])
        reason = " ".join(args[1:])[:500] if len(args) > 1 else "Sabab ko'rsatilmagan"
    except ValueError:
        await update.message.reply_html("❌ Noto'g'ri lot ID.")
        return

    db = SessionLocal()
    try:
        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        # Log report (in real app, save to DB and notify admins)
        logger.warning(
            f"🚨 REPORT: Lot #{lot_id} '{lot.title[:50]}' "
            f"by user {update.effective_user.id}: {reason}"
        )

        # Notify all admins
        admins = db.query(User).filter(User.is_admin == True).all()
        reporter = update.effective_user
        for admin in admins:
            try:
                await context.bot.send_message(
                    chat_id=admin.id,
                    text=(
                        f"🚨 <b>Shubhali lot xabar qilindi!</b>\n{SEP}\n"
                        f"📦 <b>Lot:</b> #{lot.id} — {lot.title[:60]}\n"
                        f"💰 <b>Narx:</b> {fmt_price(lot.price)}\n"
                        f"👤 <b>Sotuvchi:</b> ID {lot.seller_id}\n"
                        f"🚩 <b>Sabab:</b> {reason[:200]}\n"
                        f"{SEP}\n"
                        f"<b>Admin tekshiruvi kerak!</b>"
                    ),
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton(
                            "📦 Arxivlash", callback_data=f"adm_archive_{lot.id}"
                        )],
                        [InlineKeyboardButton(
                            "👤 Sotuvchini tekshirish",
                            callback_data=f"admin_users_0"
                        )],
                    ])
                )
            except Exception:
                pass

        await update.message.reply_html(
            f"✅ <b>Rahmat!</b> Xabaringiz qabul qilindi.\n"
            f"Adminlar tomonidan tekshiriladi.\n\n"
            f"📦 #{lot.id} — {lot.title[:50]}\n"
            f"🚩 Sabab: {reason[:200]}",
            reply_markup=main_menu_keyboard()
        )
    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 14: /marketprice — Bozor narxlari intellekti
# ═══════════════════════════════════════════════

@auth_required
async def marketprice_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Kategoriya bo'yicha bozor narxlari tahlili"""
    lang = context.user_data.get("lang", "uz")
    args = context.args

    VALID_CATEGORIES = {"smartfon", "notebook", "tv", "audio", "aksesuar", "kiyim"}

    db = SessionLocal()
    try:
        if args and args[0] in VALID_CATEGORIES:
            category = args[0].lower()
        else:
            # Show overview
            msg = (
                f"📈 <b>Bozor narxlari intellekti</b>\n{SEP}\n\n"
                f"Kategoriyalar bo'yicha o'rtacha narxlar:\n\n"
            )
            for cat in ["smartfon", "notebook", "tv", "audio", "aksesuar", "kiyim"]:
                lots = db.query(Lot).filter(
                    Lot.category == cat,
                    Lot.status == 'aktiv'
                ).all()
                if lots:
                    prices = [l.price for l in lots]
                    avg = sum(prices) / len(prices)
                    min_p = min(prices)
                    max_p = max(prices)
                    emoji = CATEGORY_EMOJI.get(cat, "📦")
                    msg += (
                        f"{emoji} <b>{cat}</b>\n"
                        f"  O'rtacha: {fmt_price(avg)}\n"
                        f"  Oraliq: {fmt_price(min_p)} — {fmt_price(max_p)}\n"
                        f"  Lotlar: {len(lots)} ta\n\n"
                    )
                else:
                    emoji = CATEGORY_EMOJI.get(cat, "📦")
                    msg += f"{emoji} <b>{cat}</b> — ma'lumot yo'q\n\n"

            msg += (
                f"{SEP}\n"
                f"Batafsil: /marketprice [kategoriya]\n"
                f"Misol: /marketprice smartfon"
            )
            await update.message.reply_html(msg, reply_markup=main_menu_keyboard())
            return

        # Detailed category analysis
        lots = db.query(Lot).filter(
            Lot.category == args[0].lower(),
            Lot.status == 'aktiv'
        ).order_by(Lot.price.asc()).all()

        if not lots:
            await update.message.reply_html(
                f"📈 <b>{args[0].upper()}</b> — ma'lumot yo'q.",
                reply_markup=main_menu_keyboard()
            )
            return

        prices = [l.price for l in lots]
        avg = sum(prices) / len(prices)
        min_p = min(prices)
        max_p = max(prices)

        # Grade breakdown
        grades = {'A': [], 'B': [], 'C': []}
        for l in lots:
            if l.grade in grades:
                grades[l.grade].append(l.price)

        emoji = CATEGORY_EMOJI.get(args[0].lower(), "📦")
        msg = (
            f"{emoji} <b>{args[0].upper()}</b> — Bozor tahlili\n{SEP}\n\n"
            f"<b>Umumiy:</b>\n"
            f"  Aktiv lotlar: <b>{len(lots)} ta</b>\n"
            f"  O'rtacha narx: <b>{fmt_price(avg)}</b>\n"
            f"  Minimal: {fmt_price(min_p)}\n"
            f"  Maksimal: {fmt_price(max_p)}\n"
            f"  Oraliq: {fmt_price(min_p)} — {fmt_price(max_p)}\n\n"
            f"<b>Grade bo'yicha:</b>\n"
        )

        for grade, g_prices in grades.items():
            if g_prices:
                g_avg = sum(g_prices) / len(g_prices)
                msg += (
                    f"  {GRADE_EMOJI.get(grade, '')} <b>{GRADE_LABELS.get(grade, grade)}</b>:\n"
                    f"    O'rtacha: {fmt_price(g_avg)} ({len(g_prices)} ta)\n"
                )

        msg += (
            f"\n{SEP}\n"
            f"<i>Ma'lumot faqat aktiv lotlar asosida</i>\n\n"
            f"Lotlarni ko'rish: /search {args[0].lower()}"
        )
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())

    finally:
        db.close()


# ═══════════════════════════════════════════════
# FEATURE 15: /review — Batafsil sharh qoldirish
# ═══════════════════════════════════════════════

@auth_required
async def review_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Batafsil sharh qoldirish: /review [user_id] [lot_id] [baho(1-5)] [sharh]"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id
    args = context.args

    if len(args) < 3:
        await update.message.reply_html(
            "✍️ <b>Sharh qoldirish</b>\n\n"
            "Bitim yakunlangandan so'ng foydalanuvchini baholang:\n\n"
            "/review [user_id] [lot_id] [baho(1-5)] [sharh]\n\n"
            "<b>Misol:</b>\n"
            "/review 123456789 5 5 Ajoyib sotuvchi, tez va sifatli",
            reply_markup=main_menu_keyboard()
        )
        return

    try:
        target_id = int(args[0])
        lot_id = int(args[1])
        score = int(args[2])
        comment = " ".join(args[3:])[:500] if len(args) > 3 else ""
    except ValueError:
        await update.message.reply_html("❌ Noto'g'ri format.")
        return

    if score < 1 or score > 5:
        await update.message.reply_html("❌ Baho 1 dan 5 gacha bo'lishi kerak.")
        return

    if target_id == user_id:
        await update.message.reply_html("❌ O'zingizni baholay olmaysiz.")
        return

    db = SessionLocal()
    try:
        target = db.query(User).filter(User.id == target_id).first()
        if not target:
            await update.message.reply_html("❌ Foydalanuvchi topilmadi.")
            return

        lot = db.query(Lot).filter(Lot.id == lot_id).first()
        if not lot:
            await update.message.reply_html("❌ Lot topilmadi.")
            return

        # Check existing review
        existing = db.query(Rating).filter(
            Rating.rater_id == user_id,
            Rating.rated_id == target_id,
            Rating.lot_id == lot_id
        ).first()
        if existing:
            await update.message.reply_html(
                f"⚠️ Siz bu foydalanuvchini bu lot uchun avval baholagansiz.\n"
                f"Baho: {existing.score}/5\n"
                f"Sharh: {(existing.comment or '')[:200]}",
                reply_markup=main_menu_keyboard()
            )
            return

        rating = Rating(
            rater_id=user_id,
            rated_id=target_id,
            lot_id=lot_id,
            score=score,
            comment=comment,
        )
        db.add(rating)
        db.commit()

        # Update user's average rating
        all_ratings = db.query(Rating).filter(Rating.rated_id == target_id).all()
        target.rating = sum(r.score for r in all_ratings) / len(all_ratings)
        db.commit()

        await update.message.reply_html(
            f"✅ <b>Sharh qoldirildi!</b>\n\n"
            f"👤 <b>{target.name}</b>\n"
            f"⭐ Baho: <b>{score}/5</b>\n"
            f"💬 {comment[:200]}\n\n"
            f"Foydalanuvchining umumiy reytingi: "
            f"{stars_display(target.rating, len(all_ratings))}",
            reply_markup=main_menu_keyboard()
        )

        # Notify rated user
        rater = db.query(User).filter(User.id == user_id).first()
        rater_name = rater.name if rater else "Foydalanuvchi"
        try:
            await context.bot.send_message(
                chat_id=target_id,
                text=(
                    f"⭐ <b>Sizga baho berildi!</b>\n{SEP}\n"
                    f"👤 <b>Kimdan:</b> {rater_name}\n"
                    f"⭐ <b>Baho:</b> {score}/5\n"
                    f"💬 <b>Sharh:</b> {comment[:200]}\n\n"
                    f"<i>Rahmat! Ishonch reytingingiz oshdi</i>"
                )
            )
        except Exception as e:
            logger.warning(f"Could not notify rated user: {e}")

    finally:
        db.close()

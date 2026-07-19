"""
DeLiKet Bot — /rate and Rating System
⭐ Sotuvchi/xaridorni 1-5 yulduz bilan baholash
"""

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from api.database import SessionLocal
from api.database.models import Rating, User, Lot, Bid
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.decorators import auth_required
from bot.utils.formatting import SEP, SEP_THIN, stars_display
from bot.utils.i18n import get_text, get_user_lang

import re
import logging
from sqlalchemy import func as sa_func

logger = logging.getLogger(__name__)


def rating_keyboard(rated_id: int, lot_id: int) -> InlineKeyboardMarkup:
    """Inline star rating keyboard (1-5 yulduz)"""
    keyboard = [[
        InlineKeyboardButton("⭐", callback_data=f"rate_1_{rated_id}_{lot_id}"),
        InlineKeyboardButton("⭐⭐", callback_data=f"rate_2_{rated_id}_{lot_id}"),
        InlineKeyboardButton("⭐⭐⭐", callback_data=f"rate_3_{rated_id}_{lot_id}"),
        InlineKeyboardButton("⭐⭐⭐⭐", callback_data=f"rate_4_{rated_id}_{lot_id}"),
        InlineKeyboardButton("⭐⭐⭐⭐⭐", callback_data=f"rate_5_{rated_id}_{lot_id}"),
    ]]
    return InlineKeyboardMarkup(keyboard)


@auth_required
async def rate_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """/rate [user_id] [score] — Foydalanuvchini baholash"""
    lang = context.user_data.get("lang", "uz")
    args = context.args

    if len(args) < 2:
        await update.message.reply_text(
            f"❌ {get_text(lang, 'rating', 'invalid_format')}\n\n"
            f"{get_text(lang, 'rating', 'usage')}\n"
            f"{get_text(lang, 'rating', 'invalid_score')}\n\n"
            f"Yoki lot detalidan ⭐ tugmasini bosing."
        )
        return

    try:
        rated_id = int(args[0])
        score = int(args[1])
    except ValueError:
        await update.message.reply_text(
            f"❌ {get_text(lang, 'rating', 'invalid_format')}\n"
            f"Misol: /rate 123456789 5"
        )
        return

    if score < 1 or score > 5:
        await update.message.reply_text(get_text(lang, "rating", "invalid_score"))
        return

    rater_id = update.effective_user.id

    if rater_id == rated_id:
        await update.message.reply_text(get_text(lang, "rating", "self_rating"))
        return

    db = SessionLocal()
    try:
        rated_user = db.query(User).filter(User.id == rated_id).first()
        if not rated_user:
            await update.message.reply_text(get_text(lang, "rating", "user_not_found"))
            return

        rater = db.query(User).filter(User.id == rater_id).first()
        if not rater:
            await update.message.reply_text(
                f"⚠️ {get_text(lang, 'profile', 'not_registered')}"
            )
            return

        existing = db.query(Rating).filter(
            Rating.rater_id == rater_id,
            Rating.rated_id == rated_id,
        ).first()
        if existing:
            await update.message.reply_text(
                f"{get_text(lang, 'rating', 'existing_rating', score=existing.score)}\n\n"
                f"{get_text(lang, 'rating', 'updated', score=score)}"
            )
            existing.score = score
            db.commit()
        else:
            rating = Rating(
                rater_id=rater_id,
                rated_id=rated_id,
                lot_id=0,
                score=score,
            )
            db.add(rating)
            db.commit()

        _update_user_rating(db, rated_id)

        await update.message.reply_text(
            get_text(lang, "rating", "rated", name=rated_user.name, score=score,
                     stars=stars_display(score)),
            reply_markup=main_menu_keyboard(lang)
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Rate error: {e}")
        await update.message.reply_text(get_text(lang, "general", "error"))
    finally:
        db.close()


def _update_user_rating(db, user_id: int):
    """Update user average rating from all ratings"""
    result = db.query(
        sa_func.avg(Rating.score), sa_func.count(Rating.id)
    ).filter(Rating.rated_id == user_id).first()
    if result and result[0]:
        avg = round(result[0], 1)
        count = result[1]
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.rating = avg
            db.commit()


async def rate_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inline star rate callback: rate_{score}_{rated_id}_{lot_id}"""
    query = update.callback_query
    await query.answer()
    lang = context.user_data.get("lang", "uz")

    match = re.match(r'^rate_(\d+)_(\d+)_(\d+)$', query.data)
    if not match:
        await query.edit_message_text(get_text(lang, "bid_action", "invalid_callback"))
        return

    score = int(match.group(1))
    rated_id = int(match.group(2))
    lot_id = int(match.group(3))
    rater_id = update.effective_user.id

    if rater_id == rated_id:
        await query.edit_message_text(
            f"😄 {get_text(lang, 'rating', 'self_rating')}!",
            reply_markup=main_menu_keyboard(lang)
        )
        return

    db = SessionLocal()
    try:
        existing = db.query(Rating).filter(
            Rating.rater_id == rater_id,
            Rating.rated_id == rated_id,
            Rating.lot_id == lot_id,
        ).first()
        if existing:
            await query.edit_message_text(
                f"{get_text(lang, 'rating', 'existing_rating', score=existing.score)}",
                reply_markup=main_menu_keyboard(lang)
            )
            return

        bid = db.query(Bid).filter(
            Bid.lot_id == lot_id,
            Bid.buyer_id == rater_id,
            Bid.status == 'qabul',
        ).first()
        if not bid:
            lot = db.query(Lot).filter(
                Lot.id == lot_id,
                Lot.seller_id == rater_id,
            ).first()
            if not lot:
                await query.edit_message_text(
                    get_text(lang, "rating", "deal_required"),
                    reply_markup=main_menu_keyboard(lang)
                )
                return

        rating = Rating(
            rater_id=rater_id,
            rated_id=rated_id,
            lot_id=lot_id,
            score=score,
        )
        db.add(rating)
        db.commit()
        _update_user_rating(db, rated_id)

        rated_user = db.query(User).filter(User.id == rated_id).first()
        rated_name = rated_user.name if rated_user else "Foydalanuvchi"

        await query.edit_message_text(
            get_text(lang, "rating", "rated", name=rated_name, score=score,
                     stars=stars_display(score, lang=lang)),
            reply_markup=main_menu_keyboard(lang)
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Rate callback error: {e}")
        await query.edit_message_text(get_text(lang, "general", "error"))
    finally:
        db.close()

"""
DeLiKet Bot — /profile
Full profile with real stats from DB
"""

from telegram import Update
from telegram.ext import ContextTypes

from api.database import SessionLocal
from api.database.models import User, Lot, Bid, Rating
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.decorators import auth_required
from bot.utils.formatting import profile_display
from bot.utils.i18n import get_text, get_user_lang


@auth_required
async def profile_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Foydalanuvchi profilini ko'rsatish — real DB statistikasi"""
    user_id = update.effective_user.id
    lang = await get_user_lang(update, context)
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            await update.message.reply_text(
                get_text(lang, "profile", "not_registered")
            )
            return
        
        # Get stats
        lot_count = db.query(Lot).filter(Lot.seller_id == user_id).count()
        active_lots = db.query(Lot).filter(
            Lot.seller_id == user_id, Lot.status == 'aktiv'
        ).count()
        bid_count = db.query(Bid).filter(Bid.buyer_id == user_id).count()
        pending_bids = db.query(Bid).filter(
            Bid.buyer_id == user_id, Bid.status == 'kutmoqda'
        ).count()
        rating_count = db.query(Rating).filter(Rating.rated_id == user_id).count()
        
        user_dict = {
            "name": user.name,
            "phone": user.phone,
            "role": user.role,
            "rating": user.rating,
            "rating_count": rating_count,
            "created_at": user.created_at.strftime('%d.%m.%Y') if user.created_at else None,
            "lot_count": lot_count,
            "active_lots": active_lots,
            "bid_count": bid_count,
            "pending_bids": pending_bids,
        }
        
        await update.message.reply_html(
            profile_display(user_dict, lang),
            reply_markup=main_menu_keyboard(lang)
        )
        
    except Exception as e:
        await update.message.reply_text(get_text(lang, "general", "error"))
    finally:
        db.close()

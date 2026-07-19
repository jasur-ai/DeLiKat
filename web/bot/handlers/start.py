"""
DeLiKet Bot — /start command
Full registration flow:
1. Welcome + phone request
2. Role selection (sotuvchi/xaridor)
3. Save to DB
4. Main menu (if returning user, skip to menu)

Integration: api/database/models.py (User)
Session: bot/utils/session.py
Language: bot/utils/i18n.py
"""

import logging
from telegram import Update, ReplyKeyboardRemove
from telegram.ext import ContextTypes, ConversationHandler

from api.database import SessionLocal
from api.database.models import User, Lot
from bot.keyboards.menu import main_menu_keyboard, contact_keyboard, role_keyboard
from bot.utils.session import session_manager
from bot.utils.formatting import (
    welcome_new, welcome_back, registration_complete,
    rol_nomi
)
from bot.utils.i18n import get_text, get_user_lang

logger = logging.getLogger(__name__)

# Conversation states
PHONE, ROLE = range(2)


def get_platform_stats():
    """Get live platform stats for welcome message"""
    try:
        db = SessionLocal()
        lots = db.query(Lot).count() or 0
        users = db.query(User).count() or 0
        db.close()
        return {"lots": lots, "users": users, "categories": 6}
    except Exception:
        return {"lots": 21, "users": 7, "categories": 6}


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    /start — Botni ishga tushirish.
    Deep link qo'llab-quvvatlanadi:
      /start shop_Do'konNomi → QR skanerdan, do'kon rejimiga o'tadi
    
    Agar user allaqachon ro'yxatdan o'tgan bo'lsa → main menu.
    Agar yangi user bo'lsa → telefon raqam so'rash.
    """
    user = update.effective_user
    user_id = user.id

    # Get user's language
    lang = await get_user_lang(update, context)

    # ── Deep link: start=shop_Do'konNomi (QR code vizitkadan) ──
    shop_name = None

    # Open DB session early — both deep-link handlers and normal flow need it
    db = SessionLocal()
    existing_user = db.query(User).filter(User.id == user_id).first()

    if context.args and len(context.args) > 0:
        payload = context.args[0]
        if payload.startswith("tradein_"):
            # Deep link from web trade-in page → redirect to /tradein
            model_hint = payload[8:]  # Extract model name after "tradein_"
            try:
                model_hint = __import__('urllib.parse', fromlist=['unquote_plus']).unquote_plus(model_hint)
            except Exception:
                pass
            
            db.close()
            from bot.handlers.tradein import tradein_start
            session = session_manager.get_or_create(user_id)
            session.data["tradein"] = {"device_model": model_hint if model_hint and len(model_hint) > 3 else ""}
            
            if existing_user:
                if existing_user.lang:
                    context.user_data["lang"] = existing_user.lang
                session.is_authenticated = True
                session.role = existing_user.role
                session.name = existing_user.name
                
                await update.message.reply_html(
                    f"🔄 <b>Trade-In</b>\n\n"
                    f"Web sahifadan trade-in so'rovi qabul qilindi. "
                    f"Qurilmangizni baholashni boshlaymiz..."
                )
                return await tradein_start(update, context)
            # If not registered, register first, then tradein
            session.data["post_reg_action"] = "tradein"
            stats = get_platform_stats()
            msg = welcome_new(user.first_name or "Foydalanuvchi", stats, lang)
            await update.message.reply_html(msg, reply_markup=contact_keyboard(lang))
            return PHONE
            
        if payload.startswith("shop_"):
            shop_name = payload[5:]  # Extract shop name after "shop_"
            try:
                shop_name = __import__('urllib.parse', fromlist=['unquote_plus']).unquote_plus(shop_name)
            except Exception:
                pass

    # Check if user already registered in DB (db already open)
    db.close()

    if existing_user:
        # Use existing user's language
        if existing_user.lang:
            lang = existing_user.lang
            context.user_data["lang"] = lang

        # Returning user — set up session
        session = session_manager.get_or_create(user_id)
        session.is_authenticated = True
        session.role = existing_user.role
        session.name = existing_user.name

        # If deep link with shop_ → redirect to dokon (seller) mode
        if shop_name:
            session.data["qr_shop"] = shop_name
            from bot.handlers.dokon import dokon_start
            await update.message.reply_html(
                f"📸 <b>Vizitka skanerdan o'tdi!</b>\n\n"
                f"Do'kon: <b>{shop_name}</b>\n\n"
                f"Siz allaqachon ro'yxatdan o'tgansiz. "
                f"Do'kon menyusiga o'tmoqdamiz...",
            )
            # Call dokon_start to show dokon menu
            return await dokon_start(update, context)

        # Normal start — show main menu
        msg = welcome_back(existing_user.name, existing_user.role, existing_user.rating, lang)
        await update.message.reply_html(msg, reply_markup=main_menu_keyboard(lang))
        return

    # New user — start registration
    session = session_manager.get_or_create(user_id)
    session.state = "awaiting_phone"

    # Store shop deep link info for after registration
    if shop_name:
        session.data["qr_shop"] = shop_name

    stats = get_platform_stats()
    msg = welcome_new(user.first_name or "Foydalanuvchi", stats, lang)

    # If QR scan, show shop info in welcome
    if shop_name:
        msg += f"\n\n📸 <b>Vizitka orqali keldiz</b>\n" \
               f"🏪 Do'kon: <b>{shop_name}</b>\n\n" \
               f"Ro'yxatdan o'ting va do'kon menyusiga o'ting!"

    await update.message.reply_html(msg, reply_markup=contact_keyboard(lang))
    return PHONE


async def phone_received(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Telefon raqam qabul qilindi → rol tanlash.
    """
    user_id = update.effective_user.id
    lang = context.user_data.get("lang", "uz")
    contact = update.effective_message.contact
    
    if contact and contact.user_id == user_id:
        phone = contact.phone_number
    else:
        # User typed phone manually
        phone = update.message.text.strip()
        # Simple validation
        if not phone.startswith("+") or len(phone) < 10:
            await update.message.reply_text(
                get_text(lang, "welcome", "invalid_phone"),
                reply_markup=contact_keyboard(lang)
            )
            return PHONE
    
    # Save phone to session
    session = session_manager.get_or_create(user_id)
    session.data["phone"] = phone
    session.state = "awaiting_role"
    
    await update.message.reply_text(
        f"{get_text(lang, 'welcome', 'phone_received')}\n\n"
        f"{get_text(lang, 'welcome', 'role_prompt')}\n\n"
        f"{get_text(lang, 'role', 'sotuvchi')} — {get_text(lang, 'role', 'seller_desc')}\n"
        f"   {get_text(lang, 'role', 'xaridor')} — {get_text(lang, 'role', 'buyer_desc')}\n"
        f"   {get_text(lang, 'role', 'ikkalasi')} — {get_text(lang, 'role', 'both_desc')}",
        reply_markup=role_keyboard(lang)
    )
    # Remove any remaining reply keyboard
    try:
        await update.message.reply_text(
            ".",
            reply_markup=ReplyKeyboardRemove()
        )
    except Exception:
        pass
    return ROLE


async def role_selected(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Rol tanlandi → user ma'lumotlarini DB ga saqlash → main menu.
    """
    query = update.callback_query
    await query.answer()
    
    user = update.effective_user
    user_id = user.id
    lang = context.user_data.get("lang", "uz")
    session = session_manager.get_or_create(user_id)
    
    # Map callback data to role
    role_map = {
        "role_sotuvchi": "sotuvchi",
        "role_xaridor": "xaridor", 
        "role_ikkalasi": "ikkalasi",
    }
    role = role_map.get(query.data, "ikkalasi")
    phone = session.data.get("phone", "")
    
    # Save to database
    db = SessionLocal()
    try:
        new_user = User(
            id=user_id,
            username=user.username or "",
            phone=phone,
            name=user.first_name or "Foydalanuvchi",
            role=role,
            rating=0.0,
            lang=lang
        )
        db.add(new_user)
        db.commit()
        
        session.is_authenticated = True
        session.role = role
        session.name = user.first_name
        session.state = "idle"

        # ── If user came via QR code (shop_ deep link) → redirect to dokon ──
        qr_shop = session.data.pop("qr_shop", None)
        if qr_shop:
            from bot.keyboards.menu import dokon_main_menu_keyboard
            await query.edit_message_text(
                f"✅ <b>Muvaffaqiyatli ro'yxatdan o'tdingiz!</b>\n\n"
                f"📸 <b>Vizitka:</b> {qr_shop}\n"
                f"  👤 {user.first_name or 'Foydalanuvchi'}\n"
                f"  📞 {phone}\n"
                f"  🏪 Rol: {role}\n\n"
                f"<b>🏪 Do'kon menyusiga xush kelibsiz!</b>\n"
                f"Mahsulotlaringizni lot qilib joylang va 0% komissiya bilan soting!",
                reply_markup=dokon_main_menu_keyboard(),
            )
            try:
                await context.bot.send_message(
                    chat_id=user_id,
                    text=".",
                    reply_markup=ReplyKeyboardRemove()
                )
            except Exception:
                pass
            return ConversationHandler.END

        # Check for post-registration action (e.g., from tradein_ deep link)
        post_action = session.data.pop("post_reg_action", None)
        if post_action == "tradein":
            await query.edit_message_text(
                f"✅ <b>Muvaffaqiyatli ro'yxatdan o'tdingiz!</b>\n\n"
                f"Endi eski qurilmangizni baholashni boshlashingiz mumkin.\n"
                f"Iltimos, <b>/tradein</b> buyrug'ini yozing.",
                reply_markup=main_menu_keyboard(lang),
            )
        else:
            # Normal registration complete → show main menu
            msg = registration_complete(user.first_name or "Foydalanuvchi", phone, role, lang)
            await query.edit_message_text(msg, reply_markup=main_menu_keyboard(lang), parse_mode='HTML')
        
        # Remove any remaining reply keyboard from the chat
        try:
            await context.bot.send_message(
                chat_id=user_id,
                text=".",
                reply_markup=ReplyKeyboardRemove()
            )
        except Exception:
            pass
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Registration error: {e}", exc_info=True)
        await query.edit_message_text(
                get_text(lang, "registration", "error"),
                parse_mode='HTML'
            )
    finally:
        db.close()
    
    return -1  # End conversation


async def fallback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """PHONE state — timeout yoki kutilmagan xabar"""
    lang = context.user_data.get("lang", "uz")
    await update.message.reply_text(
        f"⏳ {get_text(lang, 'welcome', 'phone_prompt')} "
        f"yoki /start ni qayta bosing.",
        reply_markup=contact_keyboard(lang)
    )
    return PHONE


async def role_fallback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """ROLE state — noto'g'ri callback bo'lsa, rolni qayta tanlash"""
    lang = context.user_data.get("lang", "uz")
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
            get_text(lang, "welcome", "role_prompt"),
            reply_markup=role_keyboard(lang),
            parse_mode='HTML'
        )
    return ROLE


def rol_nomi(role: str, lang: str = "uz") -> str:
    """Rol nomini chiroyli ko'rsatish (translated)"""
    from bot.utils.formatting import rol_nomi as _rol_nomi
    return _rol_nomi(role, lang)

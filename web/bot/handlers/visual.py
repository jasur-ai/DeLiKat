"""
DeLiKet Bot — Feature 11: AI Visual Search
Rasm yuborish → o'xshash lotlarni topish
"""

import logging
import re
from typing import Optional
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler, MessageHandler, filters, CommandHandler

# AI Vision Service (CLIP — optional, falls back gracefully)
try:
    from bot.services.vision_service import (
        is_available as vision_available,
        generate_image_embedding,
        generate_text_embedding as clip_text_embedding,
        generate_multimodal_embedding,
        find_similar_lots,
    )
    HAS_VISION = True
except ImportError:
    HAS_VISION = False

from api.database import SessionLocal
from api.database.models import Lot, Bid
from bot.keyboards.menu import main_menu_keyboard
from bot.utils.decorators import auth_required
from bot.utils.formatting import (
    SEP, SEP_THIN, price as fmt_price, CATEGORY_EMOJI,
    GRADE_EMOJI, GRADE_LABELS
)
from bot.utils.i18n import get_text
import os

logger = logging.getLogger(__name__)
WEB_URL = os.getenv("WEB_URL", "https://delikat.vercel.app")

# Conversation states
PHOTO, = range(1)

# Category keyword mapping for semantic search
CATEGORY_KEYWORDS = {
    'smartfon': ['iphone', 'samsung', 'redmi', 'xiaomi', 'phone', 'telefon', 'smartfon',
                 'galaxy', 'pixel', 'oneplus', 'oppo', 'vivo', 'huawei', 'honor', 'realme',
                 'nokia', 'motorola', 'smart phone', 'mobile', 'g-smart'],
    'notebook': ['notebook', 'laptop', 'macbook', 'thinkpad', 'asus', 'acer', 'dell', 'hp',
                 'lenovo', 'rog', 'vivobook', 'ideapad', 'surface', 'notebook computer'],
    'tv': ['tv', 'televizor', 'television', 'samsung tv', 'lg tv', 'monitor', 'display'],
    'audio': ['airpods', 'jbl', 'headphone', 'quloqchin', 'kolonka', 'speaker', 'earphone',
              'headset', 'sound', 'audio', 'music', 'bluetooth speaker'],
    'aksesuar': ['chexol', 'powerbank', 'kabel', 'charger', 'zaryad', 'case', 'cover',
                 'screen protector', 'sim kart', 'sticker', 'aksesuar', 'accessory'],
    'kiyim': ["ko'ylak", 'formula', 'kiyim', 'dress', 'shirt', 't-shirt', 'pants', 'shoes',
              'sneakers', 'jaket', 'kurtka', 'futbolka', 'sport'],
}


def detect_category_from_text(text: str) -> Optional[str]:
    """Detect product category from text keywords"""
    text_lower = text.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                return cat
    return None


def extract_price(text: str) -> Optional[float]:
    """Extract price mentions from text (USD or UZS)"""
    # Match patterns like "500$", "$500", "500 dollar", "1 million", "500000 som"
    patterns = [
        (r'(\d+(?:[.,]\d+)?)\s*\$\s*', lambda m: float(m.group(1).replace(',', '')) * 12800),  # $500 → UZS
        (r'\$\s*(\d+(?:[.,]\d+)?)', lambda m: float(m.group(1).replace(',', '')) * 12800),  # $500
        (r'(\d+(?:[.,]\d+)?)\s*(?:dollar|usd)', lambda m: float(m.group(1).replace(',', '')) * 12800),
        (r'(\d+(?:[.,]\d+)?)\s*(?:million|mln)', lambda m: float(m.group(1).replace(',', '')) * 1000000),
        (r'(\d+(?:[.,]\d+)?)\s*(?:ming|ming so\'?m)', lambda m: float(m.group(1).replace(',', '')) * 1000),
        (r'(\d{4,})\s*(?:so\'?m|som)', lambda m: float(m.group(1).replace(',', ''))),
    ]
    for pattern, converter in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return converter(match)
    return None


# ═══════════════════════════════════════════════
# /vs or /visualsearch — AI Visual Search
# ═══════════════════════════════════════════════

@auth_required
async def visualsearch_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Step 1: Ask for a photo or description"""
    lang = context.user_data.get("lang", "uz")
    await update.message.reply_html(
        "📸 <b>AI Visual Search</b>\n\n"
        "Menga mahsulot rasmini yuboring yoki qidiruv matnini yozing.\n"
        "Men AI yordamida eng mos lotlarni topib beraman!\n\n"
        "<b>Masalan:</b>\n"
        "• 📱 iPhone rasmini yuboring → o'xshash smartfonlar\n"
        "• 💻 \"menega 400$ gacha notebook kerak\" deb yozing\n"
        "• 🎧 \"AirPods Pro arzon\" deb yozing\n\n"
        "<i>Rasm yuborishingiz shart emas, matn ham yetarli</i>\n"
        "Bekor qilish: /cancel",
        reply_markup=InlineKeyboardMarkup([[
            InlineKeyboardButton("❌ Bekor qilish", callback_data="noop")
        ]])
    )
    return PHOTO


async def visualsearch_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Step 2: Process photo + caption or text search"""
    lang = context.user_data.get("lang", "uz")
    user_id = update.effective_user.id

    # Extract text from caption or message
    text = ""
    has_photo = False

    if update.message.text:
        text = update.message.text.strip()
        # Check if it's a direct search like "iPhone 13 500$"
        # If it's a command-like text, treat as search query
        if len(text) < 3:
            await update.message.reply_html(
                "📸 Iltimos, mahsulot nomi yoki rasm yuboring.\n"
                "Masalan: \"iPhone 13 Pro\" yoki notebook rasmi",
                reply_markup=main_menu_keyboard()
            )
            return PHOTO
    elif update.message.photo:
        has_photo = True
        photo = update.message.photo[-1]  # Largest size
        file_id = photo.file_id
        context.user_data["search_photo_id"] = file_id
        text = update.message.caption or ""
        if not text:
            await update.message.reply_html(
                "📸 Rasm qabul qilindi! Endi qisqacha tavsif yozing.\n"
                "Masalan: \"Bu iPhone 13 Pro, 128GB\"",
                reply_markup=main_menu_keyboard()
            )
            return PHOTO

    if not text and not has_photo:
        await update.message.reply_html(
            "📸 Iltimos, rasm yoki matn yuboring.",
            reply_markup=main_menu_keyboard()
        )
        return PHOTO

    # Perform search
    await update.message.reply_html("🔍 <i>Qidirilmoqda...</i>")

    db = SessionLocal()
    try:
        # ── Try CLIP AI-powered search ──
        ai_results = None
        clip_available = HAS_VISION and vision_available()

        if clip_available:
            try:
                if has_photo:
                    # Download photo from Telegram
                    photo = update.message.photo[-1]
                    file = await photo.get_file()
                    image_bytes = await file.download_as_bytearray()

                    if text.strip():
                        # Multimodal: image + text description combined (CLIP)
                        embedding = generate_multimodal_embedding(
                            image_data=bytes(image_bytes),
                            text=text,
                            weights=(0.6, 0.4)  # Image slightly more weight
                        )
                        logger.info(f"CLIP multimodal search: image + '{text[:50]}'")
                    else:
                        # Image-only search (CLIP vision)
                        embedding = generate_image_embedding(bytes(image_bytes))
                else:
                    # Text-only search using CLIP semantic understanding
                    # This finds by meaning, not just keywords!
                    embedding = clip_text_embedding(text)
                    logger.info(f"CLIP text search: '{text[:50]}'")

                if embedding is not None:
                    ai_results = find_similar_lots(embedding, db, limit=8)
                    if ai_results:
                        logger.info(f"CLIP found {len(ai_results)} results")
            except Exception as e:
                logger.warning(f"CLIP search failed, falling back: {e}")

        # ── Build keyword-based search (fallback) ──
        lots = db.query(Lot).filter(Lot.status == 'aktiv')

        # Detect category
        category = detect_category_from_text(text)
        if category:
            lots = lots.filter(Lot.category == category)

        # Extract price
        price = extract_price(text)
        if price:
            lots = lots.filter(Lot.price <= price * 1.2)  # Allow 20% margin

        # Title keyword search
        keywords = [w.lower() for w in text.split() if len(w) > 2]
        if keywords:
            from sqlalchemy import or_
            filters_list = []
            for kw in keywords:
                filters_list.append(Lot.title.ilike(f'%{kw}%'))
            lots = lots.filter(or_(*filters_list))

        results = lots.order_by(Lot.created_at.desc()).limit(8).all()

        # ── Merge CLIP AI results with keyword results ──
        if ai_results:
            seen_ids = {lot.id for lot, _ in ai_results}
            merged = [lot for lot, _ in ai_results]
            for lot in results:
                if lot.id not in seen_ids and len(merged) < 8:
                    merged.append(lot)
                    seen_ids.add(lot.id)
            results = merged

        # Build response
        ai_label = "🤖 " if clip_available and ai_results else ""
        search_mode = (
            "Rasm" if has_photo and not text.strip() else
            "Rasm+Matn" if has_photo else
            "CLIP" if ai_results else
            "Kalit so'z"
        )
        photo_note = "📸 <b>Rasm asosida</b>\n" if has_photo else ""
        cat_note = f"📂 Kategoriya: {category}" if category else "📂 Barcha kategoriyalar"
        price_note = f"💰 Narx: ~{fmt_price(price)} gacha" if price else ""

        if not results:
            # Try without keyword filter
            if keywords:
                lots2 = db.query(Lot).filter(Lot.status == 'aktiv')
                if category:
                    lots2 = lots2.filter(Lot.category == category)
                if price:
                    lots2 = lots2.filter(Lot.price <= price * 1.2)
                results = lots2.order_by(Lot.created_at.desc()).limit(8).all()

        if not results:
            # Show recent lots as fallback
            results = db.query(Lot).filter(Lot.status == 'aktiv')\
                .order_by(Lot.created_at.desc()).limit(5).all()

        if not results:
            await update.message.reply_html(
                "😔 Hech narsa topilmadi.\n\n"
                "Boshqa so'zlar bilan urinib ko'ring yoki /search",
                reply_markup=main_menu_keyboard()
            )
            return -1

        # Send photo first if available (for visual context)
        if has_photo and context.user_data.get("search_photo_id"):
            try:
                await update.message.reply_photo(
                    photo=context.user_data["search_photo_id"],
                    caption="📸 <b>Sizning rasmingiz</b> — shunga o'xshash lotlar topilmoqda"
                )
            except Exception:
                pass

        # Show results
        msg = (
            f"📸 <b>AI Visual Search — Natijalar</b>\n"
            f"{ai_label}🧠 <b>{search_mode}</b> qidiruv\n"
            f"{SEP}\n"
            f"{photo_note}"
            f"  {cat_note}\n"
            f"  {price_note}\n"
            f"  🔍 So'rov: <b>{text[:80]}</b>\n"
            f"  📦 Topildi: <b>{len(results)} ta</b>\n"
            f"{SEP}\n\n"
        )

        for lot in results:
            emoji = CATEGORY_EMOJI.get(lot.category, "📦")
            grade_e = GRADE_EMOJI.get(lot.grade or '', "⚪")
            msg += (
                f"{emoji} <b>#{lot.id}</b> — {lot.title[:55]}\n"
                f"  💰 {fmt_price(lot.price)} | {grade_e} {GRADE_LABELS.get(lot.grade or '', '')}\n\n"
            )

        msg += (
            f"{SEP}\n"
            f"💡 <b>Taklif yuborish:</b> /bid [lot_id] [narx]\n"
            f"🔍 <b>Batafsil qidiruv:</b> /search\n"
            f"📸 <b>Yangi rasm bilan:</b> /visualsearch"
        )

        await update.message.reply_html(msg, reply_markup=main_menu_keyboard())

    finally:
        db.close()

    return -1  # End conversation


async def visualsearch_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel visual search"""
    lang = context.user_data.get("lang", "uz")
    await update.message.reply_html(
        "❌ Qidiruv bekor qilindi.\n\n"
        "Yangi qidiruv: /visualsearch\n"
        "Oddiy qidiruv: /search",
        reply_markup=main_menu_keyboard()
    )
    return -1


# ── Direct search without conversation ──

@auth_required
async def visualsearch_direct(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle direct visual search with args: /vs [query]"""
    args = context.args
    if not args:
        return await visualsearch_start(update, context)

    text = " ".join(args)
    # Simulate photo search with text only
    update.message.text = text
    return await visualsearch_photo(update, context)

"""
DeLiKet Bot — Keyboard builders
Main menu, category selection, role selection, lot creation, bid actions
All button texts are translated via i18n system.
"""

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton
from bot.utils.i18n import get_text


def main_menu_keyboard(lang: str = "uz"):
    """Asosiy menu — har doim ishlatiladi"""
    keyboard = [
        [InlineKeyboardButton(get_text(lang, "button", "new_lot"), callback_data="newlot")],
        [InlineKeyboardButton(get_text(lang, "button", "search"), callback_data="search")],
        [InlineKeyboardButton(get_text(lang, "button", "my_lots"), callback_data="mylots")],
        [InlineKeyboardButton(get_text(lang, "button", "my_bids"), callback_data="mybids")],
        [InlineKeyboardButton(get_text(lang, "button", "profile"), callback_data="profile")],
        [InlineKeyboardButton(get_text(lang, "button", "help"), callback_data="help")],
    ]
    return InlineKeyboardMarkup(keyboard)


def contact_keyboard(lang: str = "uz"):
    """Telefon raqam so'rash — ContactRequestButton"""
    keyboard = [[KeyboardButton(get_text(lang, "button", "send_phone"), request_contact=True)]]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True, one_time_keyboard=True)


def role_keyboard(lang: str = "uz"):
    """Rol tanlash inline keyboard"""
    keyboard = [
        [InlineKeyboardButton(get_text(lang, "button", "role_seller"), callback_data="role_sotuvchi")],
        [InlineKeyboardButton(get_text(lang, "button", "role_buyer"), callback_data="role_xaridor")],
        [InlineKeyboardButton(get_text(lang, "button", "role_both"), callback_data="role_ikkalasi")],
    ]
    return InlineKeyboardMarkup(keyboard)


def category_keyboard(lang: str = "uz"):
    """Kategoriya tanlash"""
    keyboard = [
        [InlineKeyboardButton(get_text(lang, "category", "smartfon"), callback_data="cat_smartfon")],
        [InlineKeyboardButton(get_text(lang, "category", "notebook"), callback_data="cat_notebook")],
        [InlineKeyboardButton(get_text(lang, "category", "tv"), callback_data="cat_tv")],
        [InlineKeyboardButton(get_text(lang, "category", "audio"), callback_data="cat_audio")],
        [InlineKeyboardButton(get_text(lang, "category", "aksesuar"), callback_data="cat_aksesuar")],
        [InlineKeyboardButton(get_text(lang, "category", "kiyim"), callback_data="cat_kiyim")],
        [InlineKeyboardButton(get_text(lang, "category", "all"), callback_data="cat_all")],
    ]
    return InlineKeyboardMarkup(keyboard)


def grade_keyboard(lang: str = "uz"):
    """Grade tanlash (A/B/C)"""
    keyboard = [
        [InlineKeyboardButton(get_text(lang, "grade", "a"), callback_data="grade_A")],
        [InlineKeyboardButton(get_text(lang, "grade", "b"), callback_data="grade_B")],
        [InlineKeyboardButton(get_text(lang, "grade", "c"), callback_data="grade_C")],
    ]
    return InlineKeyboardMarkup(keyboard)


def confirm_keyboard(prefix: str = "", lang: str = "uz"):
    """Tasdiqlash / bekor qilish — ixtiyoriy prefix bilan"""
    keyboard = [
        [
            InlineKeyboardButton(get_text(lang, "general", "yes"), callback_data=f"{prefix}yes"),
            InlineKeyboardButton(get_text(lang, "general", "no"), callback_data=f"{prefix}no"),
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


def lot_actions_keyboard(lot_id: int, current_status: str = "aktiv", lang: str = "uz"):
    """Lot action tugmalari (arxivlash/aktivlashtirish)"""
    keyboard = []
    if current_status == "aktiv":
        keyboard.append([
            InlineKeyboardButton(get_text(lang, "lot", "archive"), callback_data=f"lot_archive_{lot_id}")
        ])
    elif current_status == "arxiv":
        keyboard.append([
            InlineKeyboardButton(get_text(lang, "lot", "activate"), callback_data=f"lot_activate_{lot_id}")
        ])
    keyboard.append([InlineKeyboardButton(get_text(lang, "general", "back"), callback_data="mylots")])
    return InlineKeyboardMarkup(keyboard)


def lot_detail_keyboard(lot_id: int, seller_id: int = None, current_user_id: int = None, lang: str = "uz"):
    """Lot detali uchun action tugmalari (wishlist + share + ask qo'shildi)"""
    keyboard = []
    if current_user_id and seller_id and current_user_id != seller_id:
        keyboard.append([
            InlineKeyboardButton(get_text(lang, "bid", "btn_send_bid"), callback_data=f"bid_{lot_id}"),
            InlineKeyboardButton("❤️", callback_data=f"wish_{lot_id}"),
        ])
        keyboard.append([
            InlineKeyboardButton("💬 Savol", callback_data=f"ask_{lot_id}"),
            InlineKeyboardButton("📱 Ulashish", callback_data=f"share_{lot_id}"),
        ])
        keyboard.append([
            InlineKeyboardButton("📉 Narx kuzatish", callback_data=f"alert_{lot_id}"),
        ])
    keyboard.append([InlineKeyboardButton(get_text(lang, "general", "back"), callback_data="search")])
    return InlineKeyboardMarkup(keyboard)


def bid_cancel_keyboard(bid_id: int, lang: str = "uz"):
    """Taklifni bekor qilish tugmasi"""
    keyboard = [
        [InlineKeyboardButton(get_text(lang, "bid", "cancel_btn"), callback_data=f"cancel_bid_{bid_id}")],
        [InlineKeyboardButton(get_text(lang, "general", "back"), callback_data="mybids")],
    ]
    return InlineKeyboardMarkup(keyboard)


def confirm_cancel_keyboard(bid_id: int, lang: str = "uz"):
    """Bekor qilishni tasdiqlash"""
    keyboard = [
        [
            InlineKeyboardButton(get_text(lang, "bid", "confirm_yes"), callback_data=f"confirm_cancel_yes_{bid_id}"),
            InlineKeyboardButton(get_text(lang, "bid", "confirm_no"), callback_data=f"confirm_cancel_no_{bid_id}"),
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


def mybids_keyboard(bids: list, lang: str = "uz") -> InlineKeyboardMarkup:
    """Takliflarim — har bir pending bid yonida inline cancel tugmasi"""
    rows = []
    for bid_id, lot_title, price, status in bids:
        if status == 'kutmoqda':
            rows.append([InlineKeyboardButton(
                get_text(lang, "bid", "btn_cancel", bid_id=bid_id, title=lot_title[:35], price=f"{price:,.0f}"),
                callback_data=f"mcb_{bid_id}"
            )])
    rows.append([InlineKeyboardButton(get_text(lang, "bid", "btn_new_bid"), callback_data="newlot")])
    rows.append([InlineKeyboardButton(get_text(lang, "general", "back"), callback_data="search")])
    return InlineKeyboardMarkup(rows)


def skip_image_keyboard(lang: str = "uz"):
    """Rasm yuklashni o'tkazib yuborish tugmasi"""
    keyboard = [[
        InlineKeyboardButton(get_text(lang, "button", "skip_image"), callback_data="skip_image"),
    ]]
    return InlineKeyboardMarkup(keyboard)


def bid_action_keyboard(bid_id: int, lang: str = "uz"):
    """Sotuvchi uchun: taklifni qabul qilish yoki rad etish"""
    keyboard = [
        [
            InlineKeyboardButton(get_text(lang, "button", "accept"), callback_data=f"bid_accept_{bid_id}"),
            InlineKeyboardButton(get_text(lang, "button", "reject"), callback_data=f"bid_reject_{bid_id}"),
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


def dokon_main_menu_keyboard(lang: str = "uz"):
    """Do'kon mode uchun maxsus Reply keyboard — Lot yaratish, Lotlarim, Do'konlar, Yordam"""
    keyboard = [
        [KeyboardButton("📦 Lot yaratish")],
        [KeyboardButton("📋 Lotlarim")],
        [KeyboardButton("🏪 Do'konlar")],
        [KeyboardButton("❓ Yordam")],
    ]
    return ReplyKeyboardMarkup(keyboard, resize_keyboard=True)

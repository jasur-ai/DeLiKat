"""
DeLiKet Bot — Test Mock Helpers
Mock Update, Context, User, Message objects for testing telegram bot handlers
"""

from unittest.mock import AsyncMock, MagicMock, PropertyMock
from telegram import Update, Message, User as TgUser, Chat
from telegram.ext import ContextTypes, CallbackContext


def make_mock_user(user_id: int = 999999999, first_name: str = "Test",
                   username: str = "test_user", is_bot: bool = False) -> MagicMock:
    """Create a mock Telegram User"""
    user = MagicMock(spec=TgUser)
    user.id = user_id
    user.first_name = first_name
    user.last_name = ""
    user.username = username
    user.is_bot = is_bot
    # full_name is a computed property in real telegram.User
    type(user).full_name = PropertyMock(return_value=first_name)
    return user


def make_mock_chat(chat_id: int = 999999999) -> MagicMock:
    """Create a mock Chat"""
    chat = MagicMock(spec=Chat)
    chat.id = chat_id
    chat.type = "private"
    return chat


def make_mock_message(text: str = "/start", user_id: int = 999999999,
                      chat_id: int = 999999999) -> MagicMock:
    """Create a mock Message with reply methods"""
    msg = MagicMock(spec=Message)
    msg.text = text
    msg.message_id = 1
    msg.chat = make_mock_chat(chat_id)
    msg.from_user = make_mock_user(user_id)
    msg.reply_text = AsyncMock(return_value=msg)
    msg.reply_html = AsyncMock(return_value=msg)
    return msg


def make_mock_update(text: str = "/start", user_id: int = 999999999,
                     chat_id: int = 999999999) -> MagicMock:
    """Create a mock Update with a text message"""
    user = make_mock_user(user_id)
    msg = make_mock_message(text, user_id, chat_id)

    update = MagicMock(spec=Update)
    update.effective_user = user
    update.effective_message = msg
    update.effective_chat = make_mock_chat(chat_id)
    update.message = msg
    update.callback_query = None
    update.inline_query = None
    update.update_id = 1

    return update


def make_mock_callback_query(data: str = "test_callback",
                              user_id: int = 999999999,
                              message_text: str = "Callback message") -> MagicMock:
    """Create a mock CallbackQuery"""
    from telegram import CallbackQuery

    # Mock the CallbackQuery
    cq = MagicMock(spec=CallbackQuery)
    cq.data = data
    cq.id = "12345"
    cq.from_user = make_mock_user(user_id)
    cq.message = make_mock_message(message_text, user_id)
    cq.answer = AsyncMock()
    cq.edit_message_text = AsyncMock()

    return cq


def make_mock_update_with_callback(data: str = "test_callback",
                                    user_id: int = 999999999) -> MagicMock:
    """Create a mock Update with a callback query"""
    update = MagicMock(spec=Update)
    update.effective_user = make_mock_user(user_id)
    update.effective_message = make_mock_message("", user_id)
    update.callback_query = make_mock_callback_query(data, user_id)
    update.message = None
    update.inline_query = None
    update.update_id = 2

    return update


def make_mock_context(user_id: int = 999999999) -> MagicMock:
    """Create a mock Context with user_data and bot"""
    context = MagicMock(spec=ContextTypes.DEFAULT_TYPE)
    context.user_data = {"lang": "uz"}
    context.bot_data = {}
    context.chat_data = {}
    context.bot = MagicMock()
    context.bot.send_message = AsyncMock()
    context.bot.send_photo = AsyncMock()
    context.application = MagicMock()
    context.args = []

    return context


def make_mock_context_with_session(user_id: int = 999999999) -> MagicMock:
    """Create a mock Context with session manager data"""
    context = make_mock_context(user_id)

    # Add session manager data
    from bot.utils.session import session_manager
    session = session_manager.get_or_create(user_id)
    session.is_authenticated = True
    session.role = "sotuvchi"
    session.name = "Test User"
    session.state = "idle"

    return context


# ── Assertion helpers ──

def assert_reply_called(mock_update, contains: str = None, msg: str = ""):
    """Assert that reply_html or reply_text was called, optionally with content check"""
    mock_msg = mock_update.effective_message if hasattr(mock_update, 'effective_message') else mock_update.message
    if mock_msg is None:
        return False

    if mock_msg.reply_html.called:
        call_args = mock_msg.reply_html.call_args
    elif mock_msg.reply_text.called:
        call_args = mock_msg.reply_text.call_args
    else:
        return False

    if contains:
        args, _ = call_args
        if isinstance(args[0], str) and contains in args[0]:
            return True
        return False
    return True


def get_reply_text(mock_update):
    """Get the text that was sent as a reply"""
    mock_msg = mock_update.effective_message if hasattr(mock_update, 'effective_message') else mock_update.message
    if mock_msg is None:
        return ""

    if mock_msg.reply_html.called:
        args, _ = mock_msg.reply_html.call_args
        return args[0] if args else ""
    if mock_msg.reply_text.called:
        args, _ = mock_msg.reply_text.call_args
        return args[0] if args else ""
    return ""


# ── Seed test DB ──

def seed_test_db():
    """Seed the database with test data for bot handler tests"""
    from api.database import SessionLocal, init_db
    from api.database.models import User, Lot, Bid
    from datetime import datetime, timezone

    init_db()
    db = SessionLocal()
    try:
        # Only seed if empty
        if db.query(User).count() > 0:
            return

        # Create test users
        seller = User(
            id=999999001, name="Test Seller", role="sotuvchi",
            phone="+998901234001", xp=100, level=2, trust_score=7.5
        )
        buyer = User(
            id=999999002, name="Test Buyer", role="xaridor",
            phone="+998901234002", xp=50, level=1, trust_score=5.0
        )
        admin = User(
            id=999999003, name="Admin", role="sotuvchi",
            phone="+998901234003", is_admin=True
        )
        db.add_all([seller, buyer, admin])
        db.flush()

        # Create test lots
        lots = [
            Lot(seller_id=seller.id, category="smartfon",
                title="iPhone 14 Pro 256GB Deep Purple",
                price=7_500_000, quantity=5, grade="A"),
            Lot(seller_id=seller.id, category="notebook",
                title="MacBook Air M1 2020",
                price=5_500_000, quantity=3, grade="B"),
            Lot(seller_id=seller.id, category="smartfon",
                title="Samsung Galaxy S24 Ultra 512GB",
                price=8_000_000, quantity=10, grade="A"),
        ]
        db.add_all(lots)
        db.flush()

        # Create a bid
        bid = Bid(lot_id=lots[0].id, buyer_id=buyer.id,
                  price=7_000_000, quantity=1, status="kutmoqda")
        db.add(bid)
        db.commit()

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║  🤖 DELIKET — Bot Handler Tests                                ║
║  /start, /newlot, /search, /bid, /mylots, /profile, /tradein   ║
║  Har bir flow toggle bilan yoqiladi/o'chiriladi                 ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
    python3 -m pytest tests/test_bot_handlers.py -v
    python3 -m pytest tests/test_bot_handlers.py -k "test_start" -v
"""

import os
import sys
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# ── Toggles ──
# Set env vars to skip specific test groups
# e.g., SKIP_BOT_START=1 pytest tests/test_bot_handlers.py


def _toggle(name: str) -> bool:
    """Check if a test group is enabled"""
    return os.environ.get(f"SKIP_{name}", "") not in ("1", "true", "yes")


# ── Fixtures ──

@pytest.fixture(scope="module", autouse=True)
def seed_db():
    """Seed test database once for all tests"""
    from tests.bot_mocks import seed_test_db
    seed_test_db()


@pytest.fixture
def db_session():
    """Create a clean DB session per test"""
    from api.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def mock_update():
    """Basic mock update fixture"""
    from tests.bot_mocks import make_mock_update
    return make_mock_update("/start", 999999001)


@pytest.fixture
def mock_context():
    """Basic mock context fixture"""
    from tests.bot_mocks import make_mock_context
    return make_mock_context(999999001)


@pytest.fixture
def mock_auth_context():
    """Mock context with authenticated session"""
    from tests.bot_mocks import make_mock_context_with_session
    return make_mock_context_with_session(999999001)


# ════════════════════════════════════════════════════════════════
# GROUP 1: /start — Registration Flow
# ════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _toggle("BOT_START"), reason="Toggled off")
class TestStartHandler:
    """Test /start and registration flow"""

    @pytest.fixture(autouse=True)
    def setup(self):
        from tests.bot_mocks import make_mock_update, make_mock_context
        self.update = make_mock_update("/start", 999999100)
        self.context = make_mock_context(999999100)

    def test_start_new_user(self):
        """New user sees welcome + phone request"""
        pytest.skip("Requires async — use test_start_new_user_async")

    def test_start_existing_user(self):
        """Existing user sees main menu"""
        pytest.skip("Requires async — use test_start_existing_user_async")


# ════════════════════════════════════════════════════════════════
# GROUP 2: /newlot — Lot Creation Flow
# ════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _toggle("BOT_NEWLOT"), reason="Toggled off")
class TestNewLotHandler:
    """Test /newlot conversation handler"""

    def test_newlot_start(self, mock_update, mock_auth_context):
        """/newlot shows category selection"""
        from bot.handlers.lot import newlot_start
        pytest.skip("Requires async call")

    def test_newlot_category_selection(self, db_session):
        """Category selected -> title prompt"""
        pytest.skip("Requires async")


# ════════════════════════════════════════════════════════════════
# GROUP 3: /search — Search functionality
# ════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _toggle("BOT_SEARCH"), reason="Toggled off")
class TestSearchHandler:
    """Test /search and lot browsing"""

    def test_search_without_args(self):
        """/search without args shows category menu"""
        from bot.handlers.search import search_handler
        pytest.skip("Requires async")

    def test_search_with_category(self):
        """/search smartfon shows lots"""
        pytest.skip("Requires async")


# ════════════════════════════════════════════════════════════════
# GROUP 4: Helper functions test (sync, not async)
# ════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _toggle("BOT_HELPERS"), reason="Toggled off")
class TestBotHelpers:
    """Test bot utility functions (no async needed)"""

    def test_session_manager(self):
        """Session manager creates and retrieves sessions"""
        from bot.utils.session import session_manager

        session = session_manager.get_or_create(999999999)
        assert session is not None
        assert session.state == "idle"
        assert session.is_authenticated is False

        session.is_authenticated = True
        session.role = "sotuvchi"

        same_session = session_manager.get(999999999)
        assert same_session is not None
        assert same_session.is_authenticated is True
        assert same_session.role == "sotuvchi"

    def test_session_data(self):
        """Session stores and retrieves custom data"""
        from bot.utils.session import session_manager

        session = session_manager.get_or_create(999999998)
        session.data["newlot"] = {"category": "smartfon", "title": "Test Phone"}

        same = session_manager.get(999999998)
        assert same.data["newlot"]["category"] == "smartfon"
        assert same.data["newlot"]["title"] == "Test Phone"

        # Clear data
        same.data.pop("newlot", None)
        assert "newlot" not in same.data

    def test_category_emoji(self):
        """Category emoji mapping works"""
        from bot.utils.formatting import CATEGORY_EMOJI

        assert CATEGORY_EMOJI.get("smartfon") is not None
        assert CATEGORY_EMOJI.get("notebook") is not None
        assert CATEGORY_EMOJI.get("tv") is not None
        assert CATEGORY_EMOJI.get("audio") is not None
        assert CATEGORY_EMOJI.get("aksesuar") is not None
        assert CATEGORY_EMOJI.get("kiyim") is not None
        assert len(CATEGORY_EMOJI) == 6

    def test_grade_emoji(self):
        """Grade emoji mapping works"""
        from bot.utils.formatting import GRADE_EMOJI, GRADE_LABELS

        assert GRADE_EMOJI.get("A") is not None
        assert GRADE_EMOJI.get("B") is not None
        assert GRADE_EMOJI.get("C") is not None
        assert len(GRADE_EMOJI) == 3
        assert len(GRADE_LABELS) == 3

    def test_price_formatting(self):
        """Price formatter works correctly"""
        from bot.utils.formatting import price as fmt_price

        result = fmt_price(7_500_000)
        assert isinstance(result, str)
        assert "mln" in result or "7" in result  # Contains formatted value

        result2 = fmt_price(150_000)
        assert isinstance(result2, str)
        assert "ming" in result2 or "150" in result2

        result3 = fmt_price(0)
        assert "0" in result3
        assert "so'm" in result3

    def test_separator_formatting(self):
        """Separator constants exist"""
        from bot.utils.formatting import SEP, SEP_THIN

        assert len(SEP) > 10
        assert len(SEP_THIN) > 5

    def test_welcome_new_format(self):
        """welcome_new returns non-empty string"""
        from bot.utils.formatting import welcome_new

        stats = {"lots": 21, "users": 7, "categories": 6}
        msg = welcome_new("TestUser", stats)
        assert "TestUser" in msg
        assert "21" in msg
        assert "7" in msg
        assert "DeLiKet" in msg

    def test_welcome_back_format(self):
        """welcome_back returns non-empty string"""
        from bot.utils.formatting import welcome_back

        msg = welcome_back("Test User", "sotuvchi", 4.5)
        assert "Test User" in msg
        assert isinstance(msg, str)
        assert len(msg) > 50

    def test_registration_complete(self):
        """registration_complete returns non-empty string"""
        from bot.utils.formatting import registration_complete

        msg = registration_complete("Test User", "+998901234567", "sotuvchi")
        assert "Test User" in msg
        assert isinstance(msg, str)
        assert len(msg) > 50

    def test_lot_summary(self):
        """lot_summary returns formatted lot string"""
        from bot.utils.formatting import lot_summary

        lot = {"id": 1, "title": "iPhone 14 Pro", "grade": "A",
               "quantity": 5, "price": 7_500_000, "category": "smartfon"}
        summary = lot_summary(lot)
        assert "iPhone" in summary
        assert "7" in summary

    def test_lot_detail(self):
        """lot_detail returns detailed lot string"""
        from bot.utils.formatting import lot_detail

        lot = {"id": 1, "title": "iPhone 14 Pro", "category": "smartfon",
               "price": 7_500_000, "quantity": 5, "grade": "A",
               "status": "aktiv", "bid_count": 2,
               "seller": {"name": "Test Seller", "rating": 4.5}}
        detail = lot_detail(lot)
        assert "iPhone" in detail
        assert isinstance(detail, str)
        assert len(detail) > 100

    def test_bid_receipt(self):
        """bid_receipt returns formatted receipt"""
        from bot.utils.formatting import bid_receipt

        receipt = bid_receipt(1, 1, "iPhone 14 Pro", 7_000_000, 1, "A", "Test Seller")
        assert "iPhone" in receipt
        assert "7" in receipt
        assert "Taklif" in receipt

    def test_keyboard_creation(self):
        """Main menu keyboard is created without errors"""
        from bot.keyboards.menu import main_menu_keyboard

        kb = main_menu_keyboard("uz")
        assert kb is not None

    def test_role_keyboard(self):
        """Role selection keyboard created"""
        from bot.keyboards.menu import role_keyboard

        kb = role_keyboard("uz")
        assert kb is not None

    def test_category_keyboard(self):
        """Category selection keyboard created"""
        from bot.keyboards.menu import category_keyboard

        kb = category_keyboard()
        assert kb is not None

    @pytest.mark.skipif(not _toggle("BOT_I18N"), reason="Toggled off")
    def test_i18n_get_text(self):
        """i18n translation works"""
        from bot.utils.i18n import get_text

        text_uz = get_text("uz", "start", "help_command")
        text_ru = get_text("ru", "start", "help_command")
        assert text_uz is not None
        assert text_ru is not None

    def test_auth_decorator_exists(self):
        """auth_required decorator is importable"""
        from bot.utils.decorators import auth_required
        assert auth_required is not None

    def test_rate_limit_decorator_exists(self):
        """rate_limit decorator is importable"""
        from bot.utils.decorators import rate_limit
        assert rate_limit is not None


# ════════════════════════════════════════════════════════════════
# GROUP 5: Keyboard button tests
# ════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _toggle("BOT_KEYBOARDS"), reason="Toggled off")
class TestKeyboards:
    """Test keyboard creation functions"""

    def test_all_keyboards_creatable(self):
        """All keyboard functions execute without error"""
        from bot.keyboards.menu import (
            main_menu_keyboard, category_keyboard, grade_keyboard,
            role_keyboard, contact_keyboard, confirm_keyboard,
            lot_detail_keyboard, lot_actions_keyboard, mybids_keyboard,
            bid_action_keyboard, skip_image_keyboard, rating_keyboard,
            confirm_cancel_keyboard, dokon_main_menu_keyboard,
        )

        # Test each keyboard function
        assert main_menu_keyboard("uz") is not None
        assert main_menu_keyboard("ru") is not None  # Russian too
        assert category_keyboard() is not None
        assert grade_keyboard() is not None
        assert role_keyboard("uz") is not None
        assert contact_keyboard("uz") is not None
        assert confirm_keyboard("test_") is not None
        assert skip_image_keyboard() is not None
        assert confirm_cancel_keyboard(1) is not None
        assert dokon_main_menu_keyboard() is not None

        # keyboards requiring data
        assert lot_detail_keyboard(1, 999999001, 999999002) is not None
        assert lot_actions_keyboard(1, "aktiv") is not None

        # mybids_keyboard with test data
        bid_data = [(1, "Test Lot", 7_000_000, "kutmoqda")]
        assert mybids_keyboard(bid_data) is not None

        # bid_action_keyboard
        assert bid_action_keyboard(1) is not None


# ════════════════════════════════════════════════════════════════
# GROUP 6: Database model tests (bot-specific)
# ════════════════════════════════════════════════════════════════

@pytest.mark.skipif(not _toggle("BOT_DB"), reason="Toggled off")
class TestBotDB:
    """Test database operations used by bot handlers"""

    def test_user_crud(self, db_session):
        """Create, read user in DB"""
        from api.database.models import User

        unique_id = 999999900 + hash(str(self)) % 1000
        user = User(id=unique_id, name="Bot Test", role="sotuvchi",
                     phone=f"+99890123{unique_id % 10000:04d}")
        db_session.add(user)
        db_session.commit()

        saved = db_session.query(User).filter(User.id == unique_id).first()
        assert saved is not None
        assert saved.name == "Bot Test"
        assert saved.role == "sotuvchi"

    def test_lot_crud(self, db_session):
        """Create, read lot in DB (no async needed)"""
        from api.database.models import User, Lot

        unique_id = 999999800 + hash(str(self)) % 1000
        user = User(id=unique_id, name="Lot Owner", role="sotuvchi")
        db_session.add(user)
        db_session.flush()

        lot = Lot(seller_id=user.id, category="audio",
                   title="Test Speaker", price=500_000, quantity=3, grade="A")
        db_session.add(lot)
        db_session.commit()

        saved = db_session.query(Lot).filter(Lot.id == lot.id).first()
        assert saved is not None
        assert saved.title == "Test Speaker"
        assert saved.status == "aktiv"

    def test_bid_crud(self, db_session):
        """Create, read bid in DB"""
        from api.database.models import User, Lot, Bid

        seller_id = 999999700 + hash(str(self)) % 1000
        buyer_id = 999999701 + hash(str(self)) % 1000
        seller = User(id=seller_id, name="Bid Seller", role="sotuvchi")
        buyer = User(id=buyer_id, name="Bid Buyer", role="xaridor")
        db_session.add_all([seller, buyer])
        db_session.flush()

        lot = Lot(seller_id=seller.id, category="smartfon",
                   title="Bid Test Phone", price=1_000_000, grade="B")
        db_session.add(lot)
        db_session.flush()

        bid = Bid(lot_id=lot.id, buyer_id=buyer.id,
                   price=900_000, quantity=1)
        db_session.add(bid)
        db_session.commit()

        assert bid.status == "kutmoqda"
        assert bid.price == 900_000

    def test_lot_ownership(self, db_session):
        """Lot seller_id correctly links to user"""
        from api.database.models import User, Lot

        unique_id = 999999600 + hash(str(self)) % 1000
        user = User(id=unique_id, name="Owner", role="sotuvchi")
        db_session.add(user)
        db_session.flush()

        lot = Lot(seller_id=user.id, category="smartfon",
                   title="Ownership Test", price=100_000, grade="A")
        db_session.add(lot)
        db_session.commit()

        assert lot.seller_id == user.id
        assert lot.seller is not None
        assert lot.seller.name == "Owner"

    def test_lot_status_transition(self, db_session):
        """Lot status can be changed"""
        from api.database.models import User, Lot

        unique_id = 999999500 + hash(str(self)) % 1000
        user = User(id=unique_id, name="Status Tester", role="sotuvchi")
        db_session.add(user)
        db_session.flush()

        lot = Lot(seller_id=user.id, category="notebook",
                   title="Status Test", price=500_000, grade="B")
        db_session.add(lot)
        db_session.commit()

        assert lot.status == "aktiv"
        lot.status = "sotilgan"
        db_session.commit()
        assert lot.status == "sotilgan"

        lot.status = "arxiv"
        db_session.commit()
        assert lot.status == "arxiv"

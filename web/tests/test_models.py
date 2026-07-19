"""
DeLiKet — Model testlari
User, Lot, Bid SQLAlchemy modellarini tekshirish
"""

import pytest
from sqlalchemy import exc
from api.database.models import User, Lot, Bid
from datetime import datetime, timezone
from tests.conftest import create_test_user, create_test_lot, create_test_bid


class TestUser:
    """User model testlari"""

    def test_create_user(self, db_session, sample_user_data):
        """User yaratish va o'qish"""
        user = User(**sample_user_data)
        db_session.add(user)
        db_session.commit()

        saved = db_session.query(User).filter(User.id == sample_user_data["id"]).first()
        assert saved is not None
        assert saved.name == "Test User"
        assert saved.role == "sotuvchi"
        assert saved.rating == 4.5
        assert saved.is_active is True

    def test_user_defaults(self, db_session):
        """Default qiymatlar"""
        user = User(id=111, name="Default User", role="xaridor")
        db_session.add(user)
        db_session.commit()

        assert user.rating == 0.0
        assert user.is_active is True
        assert user.created_at is not None

    def test_user_role_constraint(self, db_session):
        """Notori role kiritilsa, IntegrityError"""
        user = User(id=222, name="Bad Role", role="admin")
        db_session.add(user)
        with pytest.raises(exc.IntegrityError):
            db_session.flush()

    def test_user_lots_relationship(self, db_session, sample_user_data):
        """User va Lot orasidagi relationship"""
        user = User(**sample_user_data)
        db_session.add(user)
        db_session.flush()

        lot = create_test_lot(db_session, user.id)
        db_session.commit()

        db_session.refresh(user)
        assert len(user.lots) == 1
        assert user.lots[0].title == "Test Lot"


class TestLot:
    """Lot model testlari"""

    def test_create_lot(self, db_session, sample_user_data):
        """Lot yaratish va oqish"""
        user = User(**sample_user_data)
        db_session.add(user)
        db_session.flush()

        lot = create_test_lot(db_session, user.id)
        db_session.commit()

        saved = db_session.query(Lot).filter(Lot.id == lot.id).first()
        assert saved is not None
        assert saved.price == 1_000_000
        assert saved.status == "aktiv"
        assert saved.quantity == 5

    def test_lot_status_choices(self, db_session):
        """Status CHECK constraint (barcha qiymatlar to'g'ri)"""
        user = create_test_user(db_session)
        db_session.flush()

        for status in ["aktiv", "sotilgan", "arxiv"]:
            lot = create_test_lot(db_session, user.id, status=status)

        db_session.commit()
        count = db_session.query(Lot).count()
        assert count == 3

    def test_lot_categories(self, db_session):
        """6 xil kategoriya"""
        user = create_test_user(db_session)
        db_session.flush()

        categories = ["smartfon", "notebook", "tv", "audio", "aksesuar", "kiyim"]
        for cat in categories:
            lot = create_test_lot(db_session, user.id, category=cat,
                                   title=f"Test {cat}")
        db_session.commit()

        count = db_session.query(Lot).count()
        assert count == len(categories)


class TestBid:
    """Bid model testlari"""

    def test_create_bid(self, db_session):
        """Bid yaratish va oqish"""
        seller = create_test_user(db_session)
        buyer = create_test_user(db_session, id=987654321, name="Buyer", role="xaridor")
        db_session.flush()

        lot = create_test_lot(db_session, seller.id)
        db_session.flush()

        bid = create_test_bid(db_session, lot.id, buyer.id)
        db_session.commit()

        saved = db_session.query(Bid).filter(Bid.id == bid.id).first()
        assert saved is not None
        assert saved.status == "kutmoqda"
        assert saved.price == 900_000

    def test_bid_status_transitions(self, db_session):
        """Bid status ozgarishlari (kutmoqda -> qabul/rad)"""
        seller = create_test_user(db_session)
        buyer = create_test_user(db_session, id=987654321, name="Buyer", role="xaridor")
        db_session.flush()

        lot = create_test_lot(db_session, seller.id)
        db_session.flush()

        bid = create_test_bid(db_session, lot.id, buyer.id)
        db_session.commit()

        # kutmoqda -> qabul
        bid.status = "qabul"
        db_session.commit()
        assert bid.status == "qabul"

    def test_bid_relations(self, db_session):
        """Bid lot va buyerga bog'langan"""
        seller = create_test_user(db_session)
        buyer = create_test_user(db_session, id=987654321, name="Buyer", role="xaridor")
        db_session.flush()

        lot = create_test_lot(db_session, seller.id)
        db_session.flush()

        bid = create_test_bid(db_session, lot.id, buyer.id)
        db_session.commit()

        assert bid.lot.title == "Test Lot"
        assert bid.buyer.name == "Buyer"

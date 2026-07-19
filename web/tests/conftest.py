"""
DeLiKet — Pytest konfiguratsiya
Test database + session fixtures
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api.database.models import Base

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = sessionmaker(bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Har bir test uchun yangi database session"""
    Base.metadata.create_all(bind=test_engine)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def sample_user_data():
    return {
        "id": 123456789,
        "username": "test_user",
        "phone": "+998901234567",
        "name": "Test User",
        "role": "sotuvchi",
        "rating": 4.5,
    }


@pytest.fixture
def sample_lot_data():
    return {
        "seller_id": 123456789,
        "category": "smartfon",
        "title": "iPhone 14 Pro 256GB",
        "description": "Test description",
        "quantity": 5,
        "price": 7_500_000,
        "grade": "A",
        "status": "aktiv",
    }


@pytest.fixture
def sample_bid_data():
    """sample_bid_data is NOT a standalone fixture. Use create_test_bid() instead."""
    return None


def create_test_user(session, **overrides):
    """Test user yaratish uchun helper"""
    data = {
        "id": 123456789, "username": "seller",
        "phone": "+998901234001", "name": "Test Seller",
        "role": "sotuvchi", "rating": 0.0,
    }
    data.update(overrides)
    user = User(**data)
    session.add(user)
    return user


def create_test_lot(session, seller_id, **overrides):
    """Test lot yaratish uchun helper"""
    data = {
        "seller_id": seller_id, "category": "smartfon",
        "title": "Test Lot", "quantity": 5,
        "price": 1_000_000, "grade": "A", "status": "aktiv",
    }
    data.update(overrides)
    lot = Lot(**data)
    session.add(lot)
    return lot


def create_test_bid(session, lot_id, buyer_id, **overrides):
    """Test bid yaratish uchun helper"""
    data = {
        "lot_id": lot_id, "buyer_id": buyer_id,
        "price": 900_000, "quantity": 1, "status": "kutmoqda",
    }
    data.update(overrides)
    bid = Bid(**data)
    session.add(bid)
    return bid


# Import models at module level for the helper functions
from api.database.models import User, Lot, Bid

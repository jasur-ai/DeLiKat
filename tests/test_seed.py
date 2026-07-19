"""
DeLiKet — Seed data testlari
Week 1 real deadstock ma'lumotlarini tekshirish
"""

import pytest
from api.database import init_db, SessionLocal
from api.database.models import User, Lot, Bid
from data.seed import seed
from collections import Counter


class TestSeedData:
    """Seed ma'lumotlar to'g'riligini tekshirish"""

    def setup_method(self):
        """Har bir test oldidan DB ni tozalab, seed qilish"""
        import os
        if os.path.exists("data/deliket.db"):
            os.remove("data/deliket.db")

    def test_users_count(self):
        """7 ta user bo'lishi kerak"""
        init_db()
        seed()
        db = SessionLocal()
        count = db.query(User).count()
        db.close()
        assert count == 7, f"Expected 7 users, got {count}"

    def test_lots_count(self):
        """21 ta lot bo'lishi kerak"""
        init_db()
        seed()
        db = SessionLocal()
        count = db.query(Lot).count()
        db.close()
        assert count == 21, f"Expected 21 lots, got {count}"

    def test_bids_count(self):
        """5 ta bid bo'lishi kerak"""
        init_db()
        seed()
        db = SessionLocal()
        count = db.query(Bid).count()
        db.close()
        assert count == 5, f"Expected 5 bids, got {count}"

    def test_categories(self):
        """6 xil kategoriya bo'lishi kerak"""
        init_db()
        seed()
        db = SessionLocal()
        categories = set(r.category for r in db.query(Lot.category).all())
        db.close()
        expected = {"smartfon", "notebook", "tv", "audio", "aksesuar", "kiyim"}
        assert categories == expected, f"Expected {expected}, got {categories}"

    def test_category_distribution(self):
        """Har bir kategoriyada kamida 3 tadan lot"""
        init_db()
        seed()
        db = SessionLocal()
        counts = Counter(r.category for r in db.query(Lot.category).all())
        db.close()
        for cat, count in counts.items():
            assert count >= 3, f"Category {cat} has only {count} lots"

    def test_lot_grades(self):
        """Barcha grade lar A, B yoki C bo'lishi kerak"""
        init_db()
        seed()
        db = SessionLocal()
        grades = set(r.grade for r in db.query(Lot.grade).all())
        db.close()
        assert grades.issubset({"A", "B", "C"}), f"Invalid grades: {grades}"

    def test_user_roles(self):
        """User role lar to'g'ri bo'lishi kerak"""
        init_db()
        seed()
        db = SessionLocal()
        roles = set(r.role for r in db.query(User.role).all())
        db.close()
        assert roles.issubset({"sotuvchi", "xaridor", "ikkalasi"})

    def test_bid_statuses(self):
        """Bid status lari to'g'ri bo'lishi kerak"""
        init_db()
        seed()
        db = SessionLocal()
        statuses = set(r.status for r in db.query(Bid.status).all())
        db.close()
        assert statuses.issubset({"kutmoqda", "qabul", "rad"})

    def test_lot_statuses(self):
        """Lot status lari to'g'ri bo'lishi kerak"""
        init_db()
        seed()
        db = SessionLocal()
        statuses = set(r.status for r in db.query(Lot.status).all())
        db.close()
        assert statuses.issubset({"aktiv", "sotilgan", "arxiv"})

    def test_foreign_keys(self):
        """Foreign key lar to'g'ri bog'langan"""
        init_db()
        seed()
        db = SessionLocal()
        lots = db.query(Lot).all()
        for lot in lots:
            user = db.query(User).filter(User.id == lot.seller_id).first()
            assert user is not None, f"Lot #{lot.id} has invalid seller_id"
        bids = db.query(Bid).all()
        for bid in bids:
            lot = db.query(Lot).filter(Lot.id == bid.lot_id).first()
            assert lot is not None, f"Bid #{bid.id} has invalid lot_id"
            buyer = db.query(User).filter(User.id == bid.buyer_id).first()
            assert buyer is not None, f"Bid #{bid.id} has invalid buyer_id"
        db.close()

    def test_idempotent_seed(self):
        """Seed ikki marta chaqirilsa, duplicate yaratmasligi kerak"""
        init_db()
        seed()
        seed()  # Second call should not add duplicate data
        db = SessionLocal()
        count = db.query(User).count()
        db.close()
        assert count == 7, f"Idempotent seed failed: {count} users"

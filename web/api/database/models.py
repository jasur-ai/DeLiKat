"""
DeLiKet — SQLAlchemy modellari
users, lots, bids + Feature models (Wishlist, SavedSearch, PriceAlert, Escrow, Trust, Gamification)
"""

from sqlalchemy import (Column, Integer, BigInteger, String, Float, Boolean, JSON,
                        Text, DateTime, ForeignKey, CheckConstraint, PickleType)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone
from sqlalchemy import Date

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'

    id = Column(BigInteger, primary_key=True)
    username = Column(String(32))
    phone = Column(String(20))
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    auth_token = Column(String(64), nullable=True, index=True)
    email_verified = Column(Boolean, default=False)
    email_verify_token = Column(String(64), nullable=True)
    reset_token = Column(String(64), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    role = Column(String(20), CheckConstraint("role IN ('sotuvchi','xaridor','ikkalasi')"))
    rating = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    lang = Column(String(5), default='uz')
    # Feature 12: Trust Score
    trust_score = Column(Float, default=0.0)
    is_verified = Column(Boolean, default=False)
    # Feature 16: Gamification
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    # Stats
    total_sales = Column(Integer, default=0)
    total_purchases = Column(Integer, default=0)
    response_time_min = Column(Float, default=0.0)

    lots = relationship('Lot', back_populates='seller')
    bids = relationship('Bid', back_populates='buyer')
    wishlist = relationship('Wishlist', back_populates='user', cascade='all, delete-orphan')
    saved_searches = relationship('SavedSearch', back_populates='user', cascade='all, delete-orphan')
    price_alerts = relationship('PriceAlert', back_populates='user', cascade='all, delete-orphan')
    achievements = relationship('Achievement', back_populates='user', cascade='all, delete-orphan')


class Lot(Base):
    __tablename__ = 'lots'

    id = Column(Integer, primary_key=True, autoincrement=True)
    seller_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    category = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)
    grade = Column(String(1), CheckConstraint("grade IN ('A','B','C')"))
    status = Column(String(20), CheckConstraint("status IN ('aktiv','sotilgan','arxiv')"), default='aktiv')
    image_file_id = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    # Feature 14: Price Intelligence
    view_count = Column(Integer, default=0)
    bid_count = Column(Integer, default=0)

    seller = relationship('User', back_populates='lots')
    bids = relationship('Bid', back_populates='lot')
    transactions = relationship('Transaction', back_populates='lot')


class UserSession(Base):
    __tablename__ = 'user_sessions'

    user_id = Column(BigInteger, primary_key=True)
    state = Column(String(50), default='idle')
    data = Column(JSON, default=dict)
    last_activity = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_authenticated = Column(Boolean, default=False)
    role = Column(String(20), nullable=True)
    name = Column(String(100), nullable=True)


class Rating(Base):
    __tablename__ = 'ratings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    rater_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    rated_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    score = Column(Integer, CheckConstraint("score >= 1 AND score <= 5"), nullable=False)
    comment = Column(Text, nullable=True)
    # Feature 15: Detailed Reviews
    image_file_id = Column(String(500), nullable=True)
    response_time_rating = Column(Integer, nullable=True)
    delivery_rating = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    rater = relationship('User', foreign_keys=[rater_id])
    rated = relationship('User', foreign_keys=[rated_id])
    lot = relationship('Lot')


class Bid(Base):
    __tablename__ = 'bids'

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    buyer_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    status = Column(String(20), CheckConstraint("status IN ('kutmoqda','qabul','rad')"), default='kutmoqda')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lot = relationship('Lot', back_populates='bids')
    buyer = relationship('User', back_populates='bids')


# ═══════════════════════════════════════════════
# FEATURE 2: Wishlist / Sevimlilar
# ═══════════════════════════════════════════════

class Wishlist(Base):
    """User's favourite/watched lots"""
    __tablename__ = 'wishlist'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='wishlist')
    lot = relationship('Lot')


# ═══════════════════════════════════════════════
# FEATURE 3: Saved Searches & Alerts
# ═══════════════════════════════════════════════

class SavedSearch(Base):
    """User's saved search queries with notification"""
    __tablename__ = 'saved_searches'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    query = Column(String(500), nullable=False)
    category = Column(String(50), nullable=True)
    min_price = Column(Float, nullable=True)
    max_price = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    last_notified = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='saved_searches')


# ═══════════════════════════════════════════════
# FEATURE 4: Price Drop Alerts
# ═══════════════════════════════════════════════

class PriceAlert(Base):
    """User sets target price, gets notified when lot price drops"""
    __tablename__ = 'price_alerts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    target_price = Column(Float, nullable=False)
    is_triggered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='price_alerts')
    lot = relationship('Lot')


# ═══════════════════════════════════════════════
# FEATURE 8: Escrow / Buyer Protection (Transaction)
# ═══════════════════════════════════════════════

class Transaction(Base):
    """Escrow-based transaction — payment held until buyer confirms"""
    __tablename__ = 'transactions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    buyer_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    seller_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(20), default='kutmoqda')  # kutmoqda -> yakunlandi -> bahslashilgan
    buyer_confirmed = Column(Boolean, default=False)
    seller_confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    lot = relationship('Lot', back_populates='transactions')
    buyer = relationship('User', foreign_keys=[buyer_id])
    seller = relationship('User', foreign_keys=[seller_id])


# ═══════════════════════════════════════════════
# FEATURE 16: Gamification (Achievements & Badges)
# ═══════════════════════════════════════════════

class Achievement(Base):
    """User achievements, badges, XP tracking"""
    __tablename__ = 'achievements'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    badge = Column(String(50), nullable=False)  # e.g. 'first_sale', 'top_rated', 'fast_shipper'
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    xp_reward = Column(Integer, default=0)
    unlocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='achievements')


# ═══════════════════════════════════════════════
# FEATURE 6: Questions to Seller
# ═══════════════════════════════════════════════

# ═══════════════════════════════════════════════
# FEATURE 18: Cross-Platform Sync (Web + Telegram)
# ═══════════════════════════════════════════════

class SyncToken(Base):
    """Temporary sync token for linking Web and Telegram accounts"""
    __tablename__ = 'sync_tokens'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    token = Column(String(6), nullable=False, unique=True, index=True)
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User', foreign_keys=[user_id])


class Question(Base):
    """Buyer asks seller about a lot"""
    __tablename__ = 'questions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    buyer_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    seller_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=True)
    answered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lot = relationship('Lot')
    buyer = relationship('User', foreign_keys=[buyer_id])
    seller = relationship('User', foreign_keys=[seller_id])


# ═══════════════════════════════════════════════
# FEATURE 11: AI Image Embeddings (Visual Search)
# ═══════════════════════════════════════════════

class ImageEmbedding(Base):
    """AI-generated CLIP embeddings for visual + text similarity search"""
    __tablename__ = 'image_embeddings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False, unique=True)
    embedding = Column(PickleType, nullable=False)
    model_name = Column(String(100), default='Qdrant/clip-ViT-B-32-vision')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lot = relationship('Lot')


# ═══════════════════════════════════════════════
# NEW FEATURE 1: Counter-Offer / Savdolashish
# ═══════════════════════════════════════════════

class CounterOffer(Base):
    """Buyer and seller negotiate price via counter-offers"""
    __tablename__ = 'counter_offers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    buyer_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    seller_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    offer_price = Column(Float, nullable=False)
    counter_price = Column(Float, nullable=True)
    status = Column(String(20), default='kutmoqda')
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lot = relationship('Lot')
    buyer = relationship('User', foreign_keys=[buyer_id])
    seller = relationship('User', foreign_keys=[seller_id])


# ═══════════════════════════════════════════════
# NEW FEATURE 2: Lot Templates / Tez lot yaratish
# ═══════════════════════════════════════════════

class LotTemplate(Base):
    """Saved templates for quick lot creation"""
    __tablename__ = 'lot_templates'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    grade = Column(String(1), nullable=True)
    quantity = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    usage_count = Column(Integer, default=0)

    user = relationship('User')


# ═══════════════════════════════════════════════
# NEW FEATURE 3: Auto-Relist / Avtomatik qayta joylash
# ═══════════════════════════════════════════════

class AutoRelist(Base):
    """Auto-relist configuration for unsold lots"""
    __tablename__ = 'auto_relist'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False, unique=True)
    is_active = Column(Boolean, default=True)
    max_relist = Column(Integer, default=3)  # Max relist count
    relist_count = Column(Integer, default=0)  # Current count
    days_between = Column(Integer, default=7)  # Wait days before relist
    price_reduction = Column(Float, default=0.0)  # Price reduction % per relist
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_relisted = Column(DateTime, nullable=True)

    user = relationship('User')
    lot = relationship('Lot')


# ═══════════════════════════════════════════════
# NEW FEATURE 5: Saved Sellers / Sevimli sotuvchilar
# ═══════════════════════════════════════════════

class SavedSeller(Base):
    """User follows their favorite sellers"""
    __tablename__ = 'saved_sellers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    seller_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    notify_new = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User', foreign_keys=[user_id])
    seller = relationship('User', foreign_keys=[seller_id])


# ═══════════════════════════════════════════════
# NEW FEATURE 6: Shopping List / Ommaviy istaklar
# ═══════════════════════════════════════════════

class ShoppingList(Base):
    """Public wishlist that friends can see"""
    __tablename__ = 'shopping_lists'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User')
    items = relationship('ShoppingListItem', back_populates='list', cascade='all, delete-orphan')


class ShoppingListItem(Base):
    """Items within a shopping list"""
    __tablename__ = 'shopping_list_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    list_id = Column(Integer, ForeignKey('shopping_lists.id'), nullable=False)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=True)
    title = Column(String(200), nullable=False)
    estimated_price = Column(Float, nullable=True)
    priority = Column(Integer, default=1)  # 1-5
    is_purchased = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    list = relationship('ShoppingList', back_populates='items')
    lot = relationship('Lot')


# ═══════════════════════════════════════════════
# NEW FEATURE 7: Price History / Narx tarixi
# ═══════════════════════════════════════════════

class PriceHistory(Base):
    """Daily price snapshots by category for trend analysis"""
    __tablename__ = 'price_history'

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(50), nullable=False)
    avg_price = Column(Float, nullable=False)
    min_price = Column(Float, nullable=False)
    max_price = Column(Float, nullable=False)
    lot_count = Column(Integer, default=0)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ═══════════════════════════════════════════════
# NEW FEATURE 11: Expert Verification
# ═══════════════════════════════════════════════

class ExpertReview(Base):
    """Technical expert verifies product quality/authenticity"""
    __tablename__ = 'expert_reviews'

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    expert_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    status = Column(String(20), default='kutilmoqda')
    grade_verified = Column(String(1), nullable=True)
    is_authentic = Column(Boolean, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    lot = relationship('Lot')
    expert = relationship('User', foreign_keys=[expert_id])


# ═══════════════════════════════════════════════
# NEW FEATURE 15: Private Mode / Maxfiy chat
# ═══════════════════════════════════════════════

class PrivateChat(Base):
    """In-app anonymous chat between buyer and seller"""
    __tablename__ = 'private_chats'

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    buyer_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    seller_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lot = relationship('Lot')
    buyer = relationship('User', foreign_keys=[buyer_id])
    seller = relationship('User', foreign_keys=[seller_id])
    messages = relationship('PrivateMessage', back_populates='chat', cascade='all, delete-orphan')


class PrivateMessage(Base):
    """Messages within a private chat"""
    __tablename__ = 'private_messages'

    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(Integer, ForeignKey('private_chats.id'), nullable=False)
    sender_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    chat = relationship('PrivateChat', back_populates='messages')
    sender = relationship('User')


# ═══════════════════════════════════════════════
# NEW FEATURE 16: Seller Academy
# ═══════════════════════════════════════════════

class AcademyLesson(Base):
    """Lessons for seller education program"""
    __tablename__ = 'academy_lessons'

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)
    order_num = Column(Integer, default=0)
    xp_reward = Column(Integer, default=50)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AcademyProgress(Base):
    """User's progress through academy lessons"""
    __tablename__ = 'academy_progress'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    lesson_id = Column(Integer, ForeignKey('academy_lessons.id'), nullable=False)
    completed = Column(Boolean, default=True)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User')
    lesson = relationship('AcademyLesson')


# ═══════════════════════════════════════════════
# NEW FEATURE 17: Dispute Center
# ═══════════════════════════════════════════════

class Dispute(Base):
    """Formal dispute resolution between buyer and seller"""
    __tablename__ = 'disputes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_id = Column(Integer, ForeignKey('transactions.id'), nullable=False)
    initiator_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    reason = Column(Text, nullable=False)
    evidence = Column(Text, nullable=True)
    status = Column(String(20), default='ochiq')
    resolution = Column(Text, nullable=True)
    resolved_by = Column(BigInteger, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)

    transaction = relationship('Transaction')
    initiator = relationship('User', foreign_keys=[initiator_id])
    resolver = relationship('User', foreign_keys=[resolved_by])


# ═══════════════════════════════════════════════
# NEW FEATURE 19: Seller Subscription / Premium
# ═══════════════════════════════════════════════

class Subscription(Base):
    """Premium seller subscription tiers"""
    __tablename__ = 'subscriptions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False, unique=True)
    tier = Column(String(20), default='free')  # free, basic, pro, enterprise
    features = Column(JSON, default=dict)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship('User')


# ═══════════════════════════════════════════════
# FEATURE 18: Cross-Border / Chegara ortidan sotish
# ═══════════════════════════════════════════════

class CrossBorderListing(Base):
    """Listings available for cross-border sale"""
    __tablename__ = 'cross_border_listings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False, unique=True)
    seller_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    target_country = Column(String(50), nullable=False)
    shipping_cost = Column(Float, nullable=False)
    currency = Column(String(10), default='UZS')
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lot = relationship('Lot')
    seller = relationship('User', foreign_keys=[seller_id])


# ═══════════════════════════════════════════════
# FEATURE: Fleshka tashrif / Shop Visit
# ═══════════════════════════════════════════════

# ═══════════════════════════════════════════════
# FEATURE: Trade-In / Eski qurilmani baholash va almashtirish
# ═══════════════════════════════════════════════

class TradeIn(Base):
    """Trade-in listing — user offers old device for valuation + resale"""
    __tablename__ = 'trade_ins'

    id = Column(Integer, primary_key=True, autoincrement=True)
    seller_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    category = Column(String(50), nullable=False)
    device_model = Column(String(200), nullable=False)
    condition = Column(String(20), nullable=False)  # excellent, good, fair, poor
    grade = Column(String(1), CheckConstraint("grade IN ('A','B','C')"), nullable=True)
    estimated_price = Column(Float, nullable=True)  # AI bahosi
    final_price = Column(Float, nullable=True)  # Sotuvchi tasdiqlagan narx
    description = Column(Text, nullable=True)
    images = Column(JSON, default=list)  # List of Telegram file_ids
    status = Column(String(20), default='kutilmoqda')  # kutilmoqda -> baholandi -> qabul/qaytarildi -> sotildi
    ai_valuation_data = Column(JSON, nullable=True)  # AI baholash ma'lumotlari
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    evaluated_at = Column(DateTime, nullable=True)
    sold_at = Column(DateTime, nullable=True)

    seller = relationship('User', foreign_keys=[seller_id])
    bids = relationship('TradeInBid', back_populates='trade_in', cascade='all, delete-orphan')


class TradeInBid(Base):
    """Buyer makes an offer on a trade-in device"""
    __tablename__ = 'trade_in_bids'

    id = Column(Integer, primary_key=True, autoincrement=True)
    trade_in_id = Column(Integer, ForeignKey('trade_ins.id'), nullable=False)
    buyer_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    price = Column(Float, nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String(20), default='kutmoqda')  # kutmoqda -> qabul -> rad
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    trade_in = relationship('TradeIn', back_populates='bids')
    buyer = relationship('User', foreign_keys=[buyer_id])


class ShopVisit(Base):
    """Fleshka bozori tashriflari — checklist va KPI tracking"""
    __tablename__ = 'shop_visits'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    shop_name = Column(String(200), nullable=False)
    action = Column(String(20), nullable=False)  # visited, signed, lot, deal, reject
    note = Column(Text, nullable=True)
    visit_date = Column(Date, default=lambda: datetime.now(timezone.utc).date())
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User')


# ═══════════════════════════════════════════════
# FEATURE 20: Trusted Reviews / Video+Rasmli sharhlar
# ═══════════════════════════════════════════════

class TrustedReview(Base):
    """Verified buyer reviews with photo/video evidence"""
    __tablename__ = 'trusted_reviews'

    id = Column(Integer, primary_key=True, autoincrement=True)
    lot_id = Column(Integer, ForeignKey('lots.id'), nullable=False)
    buyer_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    seller_id = Column(BigInteger, ForeignKey('users.id'), nullable=False)
    rating = Column(Integer, CheckConstraint("rating >= 1 AND rating <= 5"), nullable=False)
    text = Column(Text, nullable=True)
    media_file_id = Column(String(500), nullable=True)
    media_type = Column(String(10), default='photo')
    is_verified_purchase = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    lot = relationship('Lot')
    buyer = relationship('User', foreign_keys=[buyer_id])
    seller = relationship('User', foreign_keys=[seller_id])

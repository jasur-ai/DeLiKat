"""
DeLiKet API — Feature 19: Seller Subscription / Premium
GET /api/subscription/plans — plans + features comparison
GET /api/subscription/user/{user_id} — user subscription status
"""

import logging
from fastapi import APIRouter, HTTPException
from api.database import SessionLocal
from api.database.models import User, Subscription

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/subscription", tags=["subscription"])

TIERS = {
    "free": {
        "id": "free",
        "name": "Bepul",
        "price": 0,
        "currency": "UZS",
        "period": "month",
        "features": [
            "5 tagacha aktiv lot",
            "Asosiy funksiyalar",
            "Standart qidiruv",
            "Oddiy statistikalar",
        ],
        "badge": "🆓",
        "color": "gray",
        "popular": False,
    },
    "basic": {
        "id": "basic",
        "name": "Basic",
        "price": 50000,
        "currency": "UZS",
        "period": "month",
        "features": [
            "50 tagacha aktiv lot",
            "Kengaytirilgan analitika",
            "Ekspert qo'llab-quvvatlash",
            "Narx trendlari",
            "Sotuvchilar feed'ida ko'rinish",
            "Telegram bildirishnomalar",
        ],
        "badge": "⚡",
        "color": "blue",
        "popular": True,
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "price": 150000,
        "currency": "UZS",
        "period": "month",
        "features": [
            "Cheksiz aktiv lotlar",
            "AI Price Optimizer",
            "Visual Comparison (CLIP)",
            "Cross-Border sotuv",
            "Premium badge ✅",
            "Shaxsiy do'kon sahifasi",
            "Market analytics dashboard",
            "Smart Digest kundalik hisobot",
        ],
        "badge": "💎",
        "color": "violet",
        "popular": False,
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "price": 500000,
        "currency": "UZS",
        "period": "month",
        "features": [
            "Barcha Pro funksiyalar",
            "Shaxsiy account menedjer",
            "API orqali ulanish",
            "Ommaviy lot boshqaruvi",
            "Sotuvchilar akademiyasi",
            "Dispute Center prioritet",
            "Maxsus integrasiyalar",
            "SLA 24/7 yordam",
        ],
        "badge": "👑",
        "color": "gold",
        "popular": False,
    },
}


@router.get("/plans")
async def get_subscription_plans():
    """Get all subscription plans with features"""
    return {
        "plans": list(TIERS.values()),
        "total_plans": len(TIERS),
    }


@router.get("/user/{user_id}")
async def get_user_subscription(user_id: int):
    """Get user's current subscription status"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        sub = db.query(Subscription).filter(Subscription.user_id == user_id).first()

        if not sub:
            return {
                "user_id": user_id,
                "user_name": user.name,
                "tier": "free",
                "is_active": True,
                "features": TIERS["free"]["features"],
                "days_left": None,
                "started_at": None,
                "expires_at": None,
            }

        days_left = None
        if sub.expires_at:
            from datetime import datetime, timezone
            delta = sub.expires_at - datetime.now(timezone.utc)
            days_left = max(0, delta.days)

        tier_data = TIERS.get(sub.tier, TIERS["free"])

        return {
            "user_id": user_id,
            "user_name": user.name,
            "tier": sub.tier,
            "tier_name": tier_data["name"],
            "tier_badge": tier_data["badge"],
            "is_active": sub.is_active,
            "features": tier_data["features"],
            "days_left": days_left,
            "started_at": sub.started_at.isoformat() if sub.started_at else None,
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subscription error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        db.close()

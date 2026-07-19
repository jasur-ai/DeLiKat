"""
DeLiKet API — Feature 18: Cross-platform Sync endpoint
Validates sync token from Telegram bot and returns user profile + lots + bids
"""

import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Query, HTTPException
from api.database import SessionLocal
from api.database.models import User, Lot, Bid, SyncToken, Wishlist, Achievement

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["sync"])


@router.get("/sync")
async def sync_account(token: str = Query("", description="6-digit sync token from Telegram bot")):
    """Validate sync token and return user data"""
    if not token or len(token) != 6:
        raise HTTPException(status_code=400, detail="Invalid token format (6 characters required)")

    db = SessionLocal()
    try:
        # Find valid token
        sync = db.query(SyncToken).filter(
            SyncToken.token == token.upper(),
            SyncToken.is_used == False,
            SyncToken.expires_at > datetime.now(timezone.utc)
        ).first()

        if not sync:
            raise HTTPException(status_code=404, detail="Token not found or expired. Generate a new one with /sync in Telegram bot.")

        # Mark token as used
        sync.is_used = True
        db.commit()

        # Get user data
        user = db.query(User).filter(User.id == sync.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get user's lots
        lots = db.query(Lot).filter(Lot.seller_id == user.id).order_by(Lot.created_at.desc()).all()
        lots_data = []
        for lot in lots:
            bid_count = db.query(Bid).filter(Bid.lot_id == lot.id).count()
            lots_data.append({
                "id": lot.id,
                "title": lot.title,
                "category": lot.category,
                "price": lot.price,
                "quantity": lot.quantity,
                "grade": lot.grade,
                "status": lot.status,
                "bid_count": bid_count,
                "created_at": lot.created_at.isoformat() if lot.created_at else None,
            })

        # Get user's bids
        bids = db.query(Bid).filter(Bid.buyer_id == user.id).order_by(Bid.created_at.desc()).all()
        bids_data = []
        for bid in bids:
            lot = db.query(Lot).filter(Lot.id == bid.lot_id).first()
            bids_data.append({
                "id": bid.id,
                "lot_id": bid.lot_id,
                "lot_title": lot.title if lot else "Noma'lum",
                "price": bid.price,
                "quantity": bid.quantity,
                "status": bid.status,
                "created_at": bid.created_at.isoformat() if bid.created_at else None,
            })

        # Get wishlist
        wishlist = db.query(Wishlist).filter(Wishlist.user_id == user.id).all()
        wishlist_data = []
        for w in wishlist:
            lot = db.query(Lot).filter(Lot.id == w.lot_id).first()
            if lot:
                wishlist_data.append({
                    "id": w.id,
                    "lot_id": w.lot_id,
                    "lot_title": lot.title[:60],
                    "lot_price": lot.price,
                    "lot_status": lot.status,
                })

        # Get achievements
        achievements = db.query(Achievement).filter(Achievement.user_id == user.id).all()
        achievements_data = [{
            "badge": a.badge,
            "title": a.title,
            "xp_reward": a.xp_reward,
            "unlocked_at": a.unlocked_at.isoformat() if a.unlocked_at else None,
        } for a in achievements]

        return {
            "status": "ok",
            "message": f"✅ Hisob sinxronlandi! Xush kelibsiz, {user.name}!",
            "user": {
                "id": user.id,
                "name": user.name,
                "phone": user.phone,
                "role": user.role,
                "rating": user.rating,
                "is_verified": user.is_verified,
                "xp": user.xp or 0,
                "level": user.level or 1,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            },
            "stats": {
                "total_lots": len(lots_data),
                "active_lots": sum(1 for l in lots_data if l["status"] == "aktiv"),
                "sold_lots": sum(1 for l in lots_data if l["status"] == "sotilgan"),
                "total_bids": len(bids_data),
                "pending_bids": sum(1 for b in bids_data if b["status"] == "kutmoqda"),
                "wishlist_count": len(wishlist_data),
                "achievements_count": len(achievements_data),
            },
            "lots": lots_data,
            "bids": bids_data,
            "wishlist": wishlist_data,
            "achievements": achievements_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sync error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Server error during sync")
    finally:
        db.close()

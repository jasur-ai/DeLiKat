"""DeLiKet API — Reviews (Trusted Reviews with ratings)"""

import logging
from fastapi import APIRouter, Query
from sqlalchemy import desc
from api.database import SessionLocal
from api.database.models import TrustedReview, Lot, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["reviews"])


@router.get("/reviews")
async def get_reviews(
    limit: int = Query(30, ge=1, le=100),
    seller_id: int = Query(None, description="Filter by seller"),
    min_rating: int = Query(None, ge=1, le=5),
):
    """Get recent trusted reviews with lot and seller info."""
    db = SessionLocal()
    try:
        q = db.query(TrustedReview).filter(TrustedReview.is_verified_purchase == True)

        if seller_id:
            q = q.filter(TrustedReview.seller_id == seller_id)
        if min_rating:
            q = q.filter(TrustedReview.rating >= min_rating)

        reviews = q.order_by(desc(TrustedReview.created_at)).limit(limit).all()

        results = []
        for r in reviews:
            lot = db.query(Lot).filter(Lot.id == r.lot_id).first()
            buyer = db.query(User).filter(User.id == r.buyer_id).first()
            seller = db.query(User).filter(User.id == r.seller_id).first()

            results.append({
                "id": r.id,
                "rating": r.rating,
                "text": r.text or "",
                "media_type": r.media_type or "photo",
                "is_verified_purchase": r.is_verified_purchase,
                "created_at": str(r.created_at) if r.created_at else "",
                "lot": {
                    "id": lot.id if lot else None,
                    "title": lot.title[:100] if lot and lot.title else "Noma'lum lot",
                    "category": lot.category if lot else "",
                } if lot else None,
                "buyer": {
                    "name": buyer.name if buyer else "Noma'lum",
                } if buyer else {"name": "Noma'lum"},
                "seller": {
                    "id": seller.id if seller else None,
                    "name": seller.name if seller else "Noma'lum",
                    "rating": round(seller.rating or 0, 1) if seller else 0,
                    "is_verified": seller.is_verified or False if seller else False,
                } if seller else None,
            })

        # Stats
        total_count = db.query(TrustedReview).filter(TrustedReview.is_verified_purchase == True).count()
        avg_rating = (
            db.query(TrustedReview.rating)
            .filter(TrustedReview.is_verified_purchase == True)
            .all()
        )
        avg_rating_val = round(sum(r[0] for r in avg_rating) / len(avg_rating), 1) if avg_rating else 0

        # Rating distribution
        dist = {i: 0 for i in range(1, 6)}
        for r in avg_rating:
            dist[r[0]] = dist.get(r[0], 0) + 1

        return {
            "ok": True,
            "count": len(results),
            "total": total_count,
            "avg_rating": avg_rating_val,
            "rating_distribution": dist,
            "reviews": results,
        }
    except Exception as e:
        logger.error(f"Reviews error: {e}", exc_info=True)
        return {"ok": False, "count": 0, "reviews": []}
    finally:
        db.close()

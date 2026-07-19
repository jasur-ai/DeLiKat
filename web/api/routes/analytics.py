"""DeLiKet API — Comprehensive Analytics Dashboard"""

import logging
from fastapi import APIRouter
from sqlalchemy import func as sa_func
from api.database import SessionLocal
from api.database.models import User, Lot, Bid, PriceHistory, Rating

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/analytics")
async def get_analytics():
    """Return all analytics data in one call: stats, trends, distribution."""
    db = SessionLocal()
    try:
        # ── Basic Stats ──
        total_users = db.query(User).count()
        total_lots = db.query(Lot).count()
        active_lots = db.query(Lot).filter(Lot.status == "aktiv").count()
        sold_lots = db.query(Lot).filter(Lot.status == "sotilgan").count()
        total_bids = db.query(Bid).count()
        pending_bids = db.query(Bid).filter(Bid.status == "kutmoqda").count()

        # ── Price Range ──
        price_stats = db.query(
            sa_func.min(Lot.price), sa_func.max(Lot.price), sa_func.avg(Lot.price)
        ).filter(Lot.status == "aktiv").first()

        min_p = round(price_stats[0] or 0)
        max_p = round(price_stats[1] or 0)
        avg_p = round(price_stats[2] or 0)

        # ── Category Distribution ──
        cat_rows = db.query(Lot.category, sa_func.count(Lot.id)).filter(
            Lot.status == "aktiv"
        ).group_by(Lot.category).all()

        categories = {cat: count for cat, count in cat_rows}

        # ── Category Price Averages ──
        cat_prices_rows = db.query(
            Lot.category,
            sa_func.avg(Lot.price),
            sa_func.min(Lot.price),
            sa_func.max(Lot.price),
            sa_func.count(Lot.id),
        ).filter(Lot.status == "aktiv").group_by(Lot.category).all()

        category_prices = []
        for c, avg, mn, mx, cnt in cat_prices_rows:
            category_prices.append({
                "name": c,
                "avg_price": round(avg or 0),
                "min_price": round(mn or 0),
                "max_price": round(mx or 0),
                "count": cnt,
            })

        # ── Grade Distribution ──
        grade_rows = db.query(Lot.grade, sa_func.count(Lot.id)).filter(
            Lot.status == "aktiv"
        ).group_by(Lot.grade).all()

        grade_distribution = {g: count for g, count in grade_rows if g}

        # ── Users by Role ──
        role_rows = db.query(User.role, sa_func.count(User.id)).filter(
            User.is_active == True
        ).group_by(User.role).all()

        role_distribution = {r: count for r, count in role_rows if r}

        # ── Top Sellers (by lot count) ──
        top_sellers_rows = db.query(
            User.id, User.name, User.rating, User.trust_score,
            User.is_verified, User.total_sales,
            sa_func.count(Lot.id).label("lot_count")
        ).join(Lot, Lot.seller_id == User.id).filter(
            Lot.status == "aktiv"
        ).group_by(User.id).order_by(sa_func.count(Lot.id).desc()).limit(10).all()

        top_sellers = [
            {
                "id": s.id,
                "name": s.name,
                "rating": round(s.rating or 0, 1),
                "trust_score": round(s.trust_score or 0, 1),
                "is_verified": s.is_verified or False,
                "total_sales": s.total_sales or 0,
                "active_lots": s.lot_count,
            }
            for s in top_sellers_rows
        ]

        # ── Price History (Trends) ──
        price_history_rows = db.query(
            PriceHistory.category,
            PriceHistory.avg_price,
            PriceHistory.min_price,
            PriceHistory.max_price,
            PriceHistory.lot_count,
            PriceHistory.recorded_at,
        ).order_by(PriceHistory.recorded_at.asc()).all()

        price_history = {}
        for ph in price_history_rows:
            if ph.category not in price_history:
                price_history[ph.category] = []
            price_history[ph.category].append({
                "date": str(ph.recorded_at)[:10] if ph.recorded_at else "",
                "avg_price": round(ph.avg_price or 0),
                "min_price": round(ph.min_price or 0),
                "max_price": round(ph.max_price or 0),
                "count": ph.lot_count or 0,
            })

        # ── Recent Activity ──
        recent_lots = db.query(Lot).order_by(Lot.created_at.desc()).limit(5).all()
        recent_activity = [
            {
                "type": "new_lot",
                "title": l.title[:80],
                "price": l.price,
                "category": l.category,
                "time": str(l.created_at)[:19] if l.created_at else "",
            }
            for l in recent_lots
        ]

        return {
            "ok": True,
            "stats": {
                "users": total_users,
                "total_lots": total_lots,
                "active_lots": active_lots,
                "sold_lots": sold_lots,
                "total_bids": total_bids,
                "pending_bids": pending_bids,
                "price_range": {
                    "min": min_p,
                    "max": max_p,
                    "avg": avg_p,
                    "spread": max_p - min_p,
                },
            },
            "categories": categories,
            "category_prices": category_prices,
            "grade_distribution": grade_distribution,
            "role_distribution": role_distribution,
            "top_sellers": top_sellers,
            "price_history": price_history,
            "recent_activity": recent_activity,
        }

    except Exception as e:
        logger.error(f"Analytics error: {e}", exc_info=True)
        return {"ok": False, "error": str(e)}
    finally:
        db.close()

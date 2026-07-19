"""
DeLiKet API — Lots endpoints
List, filter, search, detail, categories, seed
"""

import os
import logging
from fastapi import APIRouter, Query, HTTPException
from sqlalchemy.orm import joinedload
from sqlalchemy import func as sa_func
from api.database import SessionLocal
from api.database.models import Lot, User, Bid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["lots"])


@router.get("/lots")
async def list_lots(
    category: str = Query(None, description="Category filter"),
    grade: str = Query(None, description="Grade filter (A, B, C)"),
    status: str = Query("aktiv", description="Status filter"),
    search: str = Query(None, description="Search in title/description"),
    min_price: float = Query(None, description="Minimum price"),
    max_price: float = Query(None, description="Maximum price"),
    sort: str = Query("created_at", description="Sort field"),
    order: str = Query("desc", description="Sort order (asc/desc)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List lots with optional filters"""
    db = SessionLocal()
    try:
        query = db.query(Lot).options(joinedload(Lot.seller))

        # Filters
        if category and category != "all":
            query = query.filter(Lot.category == category)
        if grade:
            query = query.filter(Lot.grade == grade)
        if status:
            query = query.filter(Lot.status == status)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                Lot.title.ilike(search_term) | Lot.description.ilike(search_term)
            )
        if min_price is not None:
            query = query.filter(Lot.price >= min_price)
        if max_price is not None:
            query = query.filter(Lot.price <= max_price)

        # Sort
        sort_field = getattr(Lot, sort, Lot.created_at)
        if order == "asc":
            query = query.order_by(sort_field.asc())
        else:
            query = query.order_by(sort_field.desc())

        total = query.count()
        lots = query.offset(offset).limit(limit).all()

        # Get bid counts in ONE query instead of N+1
        lot_ids = [l.id for l in lots]
        bid_counts = dict(
            db.query(Bid.lot_id, sa_func.count(Bid.id))
            .filter(Bid.lot_id.in_(lot_ids))
            .group_by(Bid.lot_id)
            .all()
        )

        results = []
        for lot in lots:
            results.append({
                "id": lot.id,
                "title": lot.title,
                "description": lot.description,
                "category": lot.category,
                "price": lot.price,
                "quantity": lot.quantity,
                "grade": lot.grade,
                "status": lot.status,
                "created_at": lot.created_at.isoformat() if lot.created_at else None,
                "seller": {
                    "id": lot.seller.id,
                    "name": lot.seller.name,
                    "rating": lot.seller.rating,
                } if lot.seller else None,
                "bid_count": bid_counts.get(lot.id, 0),
            })

        return {
            "items": results,
            "total": total,
            "offset": offset,
            "limit": limit,
        }
    finally:
        db.close()


@router.get("/lots/{lot_id}")
async def get_lot(lot_id: int):
    """Get lot detail with all bids"""
    db = SessionLocal()
    try:
        lot = (
            db.query(Lot)
            .options(joinedload(Lot.seller), joinedload(Lot.bids).joinedload(Bid.buyer))
            .filter(Lot.id == lot_id)
            .first()
        )
        if not lot:
            raise HTTPException(status_code=404, detail="Lot not found")

        bids_data = []
        for bid in lot.bids:
            bids_data.append({
                "id": bid.id,
                "price": bid.price,
                "quantity": bid.quantity,
                "status": bid.status,
                "created_at": bid.created_at.isoformat() if bid.created_at else None,
                "buyer": {
                    "id": bid.buyer.id,
                    "name": bid.buyer.name,
                    "rating": bid.buyer.rating,
                } if bid.buyer else None,
            })

        return {
            "id": lot.id,
            "title": lot.title,
            "description": lot.description,
            "category": lot.category,
            "price": lot.price,
            "quantity": lot.quantity,
            "grade": lot.grade,
            "status": lot.status,
            "created_at": lot.created_at.isoformat() if lot.created_at else None,
            "seller": {
                "id": lot.seller.id,
                "name": lot.seller.name,
                "phone": lot.seller.phone,
                "rating": lot.seller.rating,
                "role": lot.seller.role,
            } if lot.seller else None,
            "bids": bids_data,
        }
    finally:
        db.close()


@router.get("/categories")
async def get_categories():
    """Get categories with lot counts"""
    db = SessionLocal()
    try:
        results = (
            db.query(Lot.category, sa_func.count(Lot.id))
            .filter(Lot.status == "aktiv")
            .group_by(Lot.category)
            .all()
        )

        categories = [
            {"name": "all", "label": "Barcha kategoriyalar", "count": sum(r[1] for r in results)}
        ]
        for cat, count in results:
            labels = {
                "smartfon": "📱 Smartfonlar",
                "notebook": "💻 Notebooklar",
                "tv": "📺 TV & Video",
                "audio": "🎵 Audio",
                "aksesuar": "🔌 Aksessuarlar",
                "kiyim": "👕 Kiyim",
            }
            categories.append({
                "name": cat,
                "label": labels.get(cat, cat),
                "count": count,
            })

        return {"categories": categories}
    finally:
        db.close()


@router.get("/stats")
async def get_stats():
    """Dashboard statistics"""
    db = SessionLocal()
    try:
        total_users = db.query(User).count()
        total_lots = db.query(Lot).count()
        active_lots = db.query(Lot).filter(Lot.status == "aktiv").count()
        total_bids = db.query(Bid).count()
        pending_bids = db.query(Bid).filter(Bid.status == "kutmoqda").count()

        # Price range
        price_stats = db.query(
            sa_func.min(Lot.price), sa_func.max(Lot.price), sa_func.avg(Lot.price)
        ).filter(Lot.status == "aktiv").first()

        # Category distribution
        categories = (
            db.query(Lot.category, sa_func.count(Lot.id))
            .filter(Lot.status == "aktiv")
            .group_by(Lot.category)
            .all()
        )

        return {
            "users": total_users,
            "lots": total_lots,
            "active_lots": active_lots,
            "bids": total_bids,
            "pending_bids": pending_bids,
            "price_range": {
                "min": round(price_stats[0] or 0),
                "max": round(price_stats[1] or 0),
                "avg": round(price_stats[2] or 0),
            },
            "categories": {cat: count for cat, count in categories},
        }
    finally:
        db.close()


@router.post("/seed")
async def seed_database():
    """Seed DB with Week 1-4 research data (24 sectors, 10,000+ data points)."""
    from api.database import init_db
    from data.seed import seed
    init_db()
    seed()
    db = SessionLocal()
    try:
        users = db.query(User).count()
        lots = db.query(Lot).count()
        bids = db.query(Bid).count()
        return {
            "status": "ok",
            "message": "Database seeded with Week 1-4 deadstock research data",
            "data_source": {
                "research": "4 haftalik tadqiqot (Iyul 2026)",
                "sectors": 24,
                "data_points": 10000,
                "manbalar": ["Uzum ($500M+ GMV)", "OLX (5.4M+ MAU)", "Telegram (25-30M foydalanuvchi)", "SPIN suhbatlar", "Mom Test", "Bozor monitoringi"],
                "methods": ["Week 1: Og'riq tahlili (10,000+ nuqta)", "Week 2: Yechim tadqiqoti (18 platforma)", "Week 3: Real data metodologiyasi", "Week 4: MVP RICE prioritet"],
                "report": "DeLiKet Hisoboti — Deliket_Hisoboti.html",
            },
            "stats": {"users": users, "lots": lots, "bids": bids}
        }
    finally:
        db.close()

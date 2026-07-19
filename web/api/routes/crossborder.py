"""
DeLiKet API — Feature 18: Cross-Border / Chegara ortidan sotish
GET /api/crossborder/listings — all active cross-border listings
GET /api/crossborder/country/{country} — filter by target country
GET /api/crossborder/user/{user_id} — user's cross-border listings
"""

import logging
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.orm import joinedload
from api.database import SessionLocal
from api.database.models import User, Lot, CrossBorderListing

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/crossborder", tags=["crossborder"])

COUNTRIES = {
    "KGZ": {"name": "Qirg'iziston", "flag": "🇰🇬", "currency": "KGS", "code": "KGZ"},
    "KAZ": {"name": "Qozog'iston", "flag": "🇰🇿", "currency": "KZT", "code": "KAZ"},
    "TJK": {"name": "Tojikiston", "flag": "🇹🇯", "currency": "TJS", "code": "TJK"},
    "RUS": {"name": "Rossiya", "flag": "🇷🇺", "currency": "RUB", "code": "RUS"},
}


@router.get("/listings")
async def get_crossborder_listings(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    country: str = Query(None, description="Filter by country code (KGZ, KAZ, TJK, RUS)"),
):
    """Get all active cross-border listings"""
    db = SessionLocal()
    try:
        query = (
            db.query(CrossBorderListing)
            .options(joinedload(CrossBorderListing.lot), joinedload(CrossBorderListing.seller))
            .filter(CrossBorderListing.is_active == True)
        )

        if country and country.upper() in COUNTRIES:
            query = query.filter(CrossBorderListing.target_country == country.upper())

        total = query.count()
        listings = query.order_by(CrossBorderListing.created_at.desc()).offset(offset).limit(limit).all()

        results = []
        for cb in listings:
            lot = cb.lot
            seller = cb.seller
            country_info = COUNTRIES.get(cb.target_country, {})

            results.append({
                "id": cb.id,
                "lot_id": cb.lot_id,
                "lot_title": lot.title if lot else "Noma'lum",
                "lot_price": lot.price if lot else 0,
                "lot_category": lot.category if lot else "",
                "lot_grade": lot.grade if lot else "",
                "lot_quantity": lot.quantity if lot else 0,
                "seller_id": cb.seller_id,
                "seller_name": seller.name if seller else "Noma'lum",
                "seller_rating": seller.rating if seller else 0,
                "target_country": cb.target_country,
                "country_name": country_info.get("name", cb.target_country),
                "country_flag": country_info.get("flag", "🌍"),
                "currency": country_info.get("currency", cb.currency),
                "shipping_cost": cb.shipping_cost,
                "shipping_formatted": _fmt_price(cb.shipping_cost),
                "price_with_shipping": (lot.price + cb.shipping_cost) if lot else cb.shipping_cost,
                "is_active": cb.is_active,
                "created_at": cb.created_at.isoformat() if cb.created_at else None,
            })

        return {
            "listings": results,
            "total": total,
            "limit": limit,
            "offset": offset,
            "countries": {k: v for k, v in COUNTRIES.items()},
            "country_totals": _get_country_totals(db),
        }
    except Exception as e:
        logger.error(f"Cross-border listings error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        db.close()


@router.get("/user/{user_id}")
async def get_user_crossborder(user_id: int):
    """Get user's cross-border listings"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        listings = (
            db.query(CrossBorderListing)
            .options(joinedload(CrossBorderListing.lot))
            .filter(
                CrossBorderListing.seller_id == user_id,
            )
            .order_by(CrossBorderListing.created_at.desc())
            .all()
        )

        results = []
        for cb in listings:
            lot = cb.lot
            country_info = COUNTRIES.get(cb.target_country, {})
            results.append({
                "id": cb.id,
                "lot_id": cb.lot_id,
                "lot_title": lot.title if lot else "Noma'lum",
                "lot_price": lot.price if lot else 0,
                "target_country": cb.target_country,
                "country_name": country_info.get("name", cb.target_country),
                "country_flag": country_info.get("flag", "🌍"),
                "shipping_cost": cb.shipping_cost,
                "shipping_formatted": _fmt_price(cb.shipping_cost),
                "is_active": cb.is_active,
                "created_at": cb.created_at.isoformat() if cb.created_at else None,
            })

        return {
            "user_id": user_id,
            "user_name": user.name,
            "listings": results,
            "total": len(results),
            "active_count": sum(1 for l in results if l["is_active"]),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User crossborder error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        db.close()


@router.get("/countries")
async def get_supported_countries():
    """Get list of supported countries for cross-border trade"""
    return {
        "countries": [{"code": k, **v} for k, v in COUNTRIES.items()],
        "total": len(COUNTRIES),
    }


def _get_country_totals(db):
    """Get listing counts per country"""
    from sqlalchemy import func
    counts = (
        db.query(
            CrossBorderListing.target_country,
            func.count(CrossBorderListing.id)
        )
        .filter(CrossBorderListing.is_active == True)
        .group_by(CrossBorderListing.target_country)
        .all()
    )
    return {row[0]: row[1] for row in counts}


def _fmt_price(p: float) -> str:
    if not p:
        return "0 so'm"
    if p >= 1_000_000:
        return f"{p/1_000_000:.1f} mln so'm"
    if p >= 1_000:
        return f"{p/1_000:.0f} ming so'm"
    return f"{int(p):,} so'm"

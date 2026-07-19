"""
Health check endpoint — MllyCore monitoring uchun
"""

from fastapi import APIRouter
from api.database import SessionLocal
from api.database.models import User, Lot, Bid

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check — monitoring va Vercel uptime tracking"""
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        lot_count = db.query(Lot).count()
        bid_count = db.query(Bid).count()
        return {
            "status": "ok",
            "service": "deliket",
            "version": "0.3.0",
            "database": "connected",
            "stats": {
                "users": user_count,
                "lots": lot_count,
                "bids": bid_count,
            }
        }
    except Exception as e:
        return {
            "status": "degraded",
            "service": "deliket",
            "database": f"error: {str(e)}",
        }
    finally:
        db.close()

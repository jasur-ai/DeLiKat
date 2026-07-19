"""
DeLiKet API — Feature 17: Dispute Center
GET /api/disputes/user/{user_id} — user's disputes
GET /api/disputes/{dispute_id} — single dispute detail
"""

import logging
from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import joinedload
from api.database import SessionLocal
from api.database.models import User, Dispute, Transaction, Lot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/disputes", tags=["disputes"])

STATUS_MAP = {
    "ochiq": {"label": "Ochiq", "color": "orange", "icon": "🔴"},
    "ko'rib_chiqilmoqda": {"label": "Ko'rib chiqilmoqda", "color": "blue", "icon": "🔵"},
    "hal_qilingan": {"label": "Hal qilingan", "color": "green", "icon": "✅"},
    "rad_etilgan": {"label": "Rad etilgan", "color": "red", "icon": "❌"},
}


@router.get("/user/{user_id}")
async def get_user_disputes(user_id: int):
    """Get all disputes for a user (as initiator or participant via transaction)"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        disputes = (
            db.query(Dispute)
            .options(joinedload(Dispute.transaction), joinedload(Dispute.initiator))
            .filter(Dispute.initiator_id == user_id)
            .order_by(Dispute.created_at.desc())
            .all()
        )

        disputes_data = []
        for d in disputes:
            status_info = STATUS_MAP.get(d.status, {"label": d.status, "color": "gray", "icon": "⚪"})
            transaction = d.transaction

            disputes_data.append({
                "id": d.id,
                "transaction_id": d.transaction_id,
                "transaction_amount": transaction.amount if transaction else None,
                "lot_title": transaction.lot.title if transaction and transaction.lot else "Noma'lum",
                "reason": d.reason[:200] + "..." if len(d.reason) > 200 else d.reason,
                "status": d.status,
                "status_label": status_info["label"],
                "status_color": status_info["color"],
                "status_icon": status_info["icon"],
                "evidence": d.evidence,
                "resolution": d.resolution,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
                "initiator_name": d.initiator.name if d.initiator else "Noma'lum",
                "days_open": (
                    (d.resolved_at - d.created_at).days
                    if d.resolved_at and d.created_at
                    else None
                ),
            })

        return {
            "disputes": disputes_data,
            "total": len(disputes_data),
            "open_count": sum(1 for d in disputes_data if d["status"] == "ochiq"),
            "resolved_count": sum(1 for d in disputes_data if d["status"] == "hal_qilingan"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Disputes error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        db.close()


@router.get("/stats")
async def get_dispute_stats():
    """Get overall dispute statistics"""
    db = SessionLocal()
    try:
        # Safely check if disputes table exists
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        tables = inspector.get_table_names()
        if "disputes" not in tables:
            return {
                "total": 0, "open": 0, "reviewing": 0,
                "resolved": 0, "rejected": 0, "resolution_rate": 0.0,
                "note": "Disputes table not yet created — run init_db()",
            }
        total = db.query(Dispute).count()
        open_d = db.query(Dispute).filter(Dispute.status == "ochiq").count()
        reviewing = db.query(Dispute).filter(Dispute.status == "ko'rib_chiqilmoqda").count()
        resolved = db.query(Dispute).filter(Dispute.status == "hal_qilingan").count()
        rejected = db.query(Dispute).filter(Dispute.status == "rad_etilgan").count()

        return {
            "total": total,
            "open": open_d,
            "reviewing": reviewing,
            "resolved": resolved,
            "rejected": rejected,
            "resolution_rate": round((resolved / total * 100) if total > 0 else 0, 1),
        }
    except Exception as e:
        logger.error(f"Dispute stats error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        db.close()

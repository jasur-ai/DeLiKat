"""
DeLiKet API — Tashrif / Visit Tracking Report
Daily report: shop visits, conversion rate %, revenue potential
"""

import logging
from datetime import date, timedelta, datetime, timezone
from fastapi import APIRouter, Query
from sqlalchemy import func as sa_func
from api.database import SessionLocal
from api.database.models import ShopVisit, Lot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/visits", tags=["visits"])

# Average revenue per deal tier (so'm)
DEAL_REVENUE_ESTIMATES = {
    "smartfon": 5_000_000,
    "notebook": 8_000_000,
    "tv": 3_500_000,
    "audio": 1_500_000,
    "aksesuar": 500_000,
    "kiyim": 300_000,
}

ACTION_LABELS = {
    "visited": "✅ Tashrif",
    "signed": "📝 Ro'yxatdan o'tdi",
    "lot": "📦 Lot yaratdi",
    "deal": "💰 Bitim",
    "reject": "❌ Rad etdi",
}


@router.get("/report")
async def get_visit_report(
    days: int = Query(1, ge=1, le=90, description="Necha kunlik hisobot"),
    user_id: int = Query(None, description="Foydalanuvchi ID (None = barcha)"),
):
    """Return daily visit report with KPIs, conversion rates, and revenue estimates."""
    db = SessionLocal()
    try:
        today = date.today()
        start_date = today - timedelta(days=days - 1)

        # ── Base query filter ──
        base_filter = [ShopVisit.visit_date >= start_date, ShopVisit.visit_date <= today]
        if user_id:
            base_filter.append(ShopVisit.user_id == user_id)

        # ── Total visits by action ──
        action_rows = db.query(
            ShopVisit.action,
            sa_func.count(ShopVisit.id)
        ).filter(*base_filter).group_by(ShopVisit.action).all()

        action_counts = {a: 0 for a in ACTION_LABELS}
        total_all = 0
        for action, count in action_rows:
            action_counts[action] = count
            total_all += count

        # ── Daily breakdown ──
        daily_rows = db.query(
            ShopVisit.visit_date,
            ShopVisit.action,
            sa_func.count(ShopVisit.id)
        ).filter(*base_filter).group_by(
            ShopVisit.visit_date,
            ShopVisit.action
        ).order_by(
            ShopVisit.visit_date.desc()
        ).all()

        daily_data = {}
        for d, action, count in daily_rows:
            day_str = str(d)
            if day_str not in daily_data:
                daily_data[day_str] = {"date": day_str, "total": 0}
            daily_data[day_str][action] = count
            daily_data[day_str]["total"] += count

        # ── Unique shops visited ──
        unique_shops = db.query(
            ShopVisit.shop_name
        ).filter(*base_filter).distinct().count()

        # ── Conversion metrics ──
        visited_count = action_counts.get("visited", 0) + action_counts.get("signed", 0) \
            + action_counts.get("lot", 0) + action_counts.get("deal", 0)
        signed_count = action_counts.get("signed", 0) + action_counts.get("lot", 0) \
            + action_counts.get("deal", 0)
        lot_count = action_counts.get("lot", 0)

        conversion_visited_to_signed = round((signed_count / visited_count * 100), 1) if visited_count > 0 else 0
        conversion_signed_to_lot = round((lot_count / signed_count * 100), 1) if signed_count > 0 else 0

        # ── Revenue potential ──
        # Estimate: signed users * 30% likely to create a lot * avg deal value
        avg_deal_value = 3_500_000  # conservative average
        estimated_revenue = signed_count * 0.3 * avg_deal_value
        potential_monthly = (estimated_revenue / days) * 22  # Normalize daily → monthly (22 ish kuni)

        # ── Recent shops ──
        recent_visits = db.query(ShopVisit).filter(*base_filter).order_by(
            ShopVisit.created_at.desc()
        ).limit(20).all()

        recent_shops = [
            {
                "id": v.id,
                "shop_name": v.shop_name,
                "action": v.action,
                "action_label": ACTION_LABELS.get(v.action, v.action),
                "date": str(v.visit_date),
                "time": str(v.created_at)[11:19] if v.created_at else "",
            }
            for v in recent_visits
        ]

        # ── Best day ──
        best_day = max(daily_data.values(), key=lambda x: x["total"]) if daily_data else None

        return {
            "ok": True,
            "report": {
                "period": {
                    "from": str(start_date),
                    "to": str(today),
                    "days": days,
                },
                "summary": {
                    "total_actions": total_all,
                    "unique_shops": unique_shops,
                    **action_counts,
                },
                "conversion": {
                    "visited": visited_count,
                    "signed": signed_count,
                    "lots_created": lot_count,
                    "visited_to_signed_pct": conversion_visited_to_signed,
                    "signed_to_lot_pct": conversion_signed_to_lot,
                    "funnel": [
                        {"stage": "Tashrif", "count": visited_count, "pct": 100},
                        {"stage": "Ro'yxat", "count": signed_count, "pct": conversion_visited_to_signed},
                        {"stage": "Lot yaratdi", "count": lot_count, "pct": conversion_signed_to_lot},
                    ],
                },
                "revenue": {
                    "estimated_revenue": round(estimated_revenue),
                    "potential_monthly": round(potential_monthly),
                    "avg_deal_value": avg_deal_value,
                    "note": "Hisob: ro'yxatdan o'tganlar * 30% (lot yaratish ehtimoli) * o'rtacha 3.5M so'm",
                },
                "daily_breakdown": sorted(daily_data.values(), key=lambda x: x["date"], reverse=True),
                "recent_shops": recent_shops,
                "best_day": best_day["date"] if best_day else None,
            },
        }

    except Exception as e:
        logger.error(f"Visit report error: {e}", exc_info=True)
        return {"ok": False, "error": str(e)}
    finally:
        db.close()

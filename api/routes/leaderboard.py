"""DeLiKet API — Leaderboard (XP, Level, Achievements)"""

import logging
from fastapi import APIRouter, Query
from sqlalchemy import desc
from api.database import SessionLocal
from api.database.models import User, Achievement

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["leaderboard"])


@router.get("/leaderboard")
async def get_leaderboard(limit: int = Query(50, ge=1, le=200)):
    """Get top users by XP (descending) with level and achievements."""
    db = SessionLocal()
    try:
        users = (
            db.query(User)
            .filter(User.is_active == True)
            .order_by(desc(User.xp), desc(User.level))
            .limit(limit)
            .all()
        )

        results = []
        for i, u in enumerate(users, 1):
            # Get user's achievements
            achievements = (
                db.query(Achievement)
                .filter(Achievement.user_id == u.id)
                .order_by(Achievement.unlocked_at.desc())
                .all()
            )

            results.append({
                "rank": i,
                "user_id": u.id,
                "name": u.name or "Noma'lum",
                "username": u.username or "",
                "role": u.role or "xaridor",
                "xp": u.xp or 0,
                "level": u.level or 1,
                "rating": round(u.rating or 0, 1),
                "trust_score": round(u.trust_score or 0, 1),
                "is_verified": u.is_verified or False,
                "total_sales": u.total_sales or 0,
                "total_purchases": u.total_purchases or 0,
                "achievements": [
                    {
                        "badge": a.badge,
                        "title": a.title,
                        "xp_reward": a.xp_reward,
                    }
                    for a in achievements
                ],
                "achievement_count": len(achievements),
            })

        return {
            "ok": True,
            "count": len(results),
            "leaderboard": results,
        }
    except Exception as e:
        logger.error(f"Leaderboard error: {e}", exc_info=True)
        return {"ok": False, "count": 0, "leaderboard": []}
    finally:
        db.close()

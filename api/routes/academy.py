"""
DeLiKet API — Feature 16: Seller Academy
GET /api/academy/lessons — all lessons with user progress
GET /api/academy/lesson/{lesson_id} — single lesson detail
"""

import logging
from collections import Counter
from fastapi import APIRouter, HTTPException, Query
from api.database import SessionLocal
from api.database.models import AcademyLesson, AcademyProgress

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/academy", tags=["academy"])

CATEGORY_EMOJI = {
    "boshlang'ich": "🌱",
    "o'rta": "🌿",
    "yuqori": "🌳",
    "advanced": "🌳",
    "beginner": "🌱",
    "intermediate": "🌿",
}


@router.get("/lessons")
async def get_academy_lessons(user_id: int = Query(None, description="User ID for progress tracking")):
    """Get all academy lessons, optionally with user's completion status"""
    db = SessionLocal()
    try:
        lessons = db.query(AcademyLesson).order_by(AcademyLesson.order_num).all()

        if not lessons:
            # Return default lesson structure
            default_lessons = [
                {
                    "id": 0,
                    "order_num": 1,
                    "title": "DeLiKet'ga xush kelibsiz!",
                    "content": "DeLiKet — O'zbekistondagi eng yaxshi Telegram marketplace. Bu darsda platformadan foydalanishni o'rganasiz.",
                    "category": "boshlang'ich",
                    "category_emoji": "🌱",
                    "xp_reward": 50,
                    "icon": "🚀",
                },
                {
                    "id": 0,
                    "order_num": 2,
                    "title": "Qanday qilib yaxshi lot yaratish?",
                    "content": "Sifatli lot yaratish — sotuvning kaliti. Mahsulot rasmi, to'liq tavsif va to'g'ri narx muhim.",
                    "category": "boshlang'ich",
                    "category_emoji": "🌱",
                    "xp_reward": 100,
                    "icon": "📦",
                },
                {
                    "id": 0,
                    "order_num": 3,
                    "title": "Marketing va sotuv strategiyalari",
                    "content": "Lotingizni tez sotish uchun marketing strategiyalari: chegirmalar, aksiyalar va mijozlar bilan muloqot.",
                    "category": "o'rta",
                    "category_emoji": "🌿",
                    "xp_reward": 150,
                    "icon": "📈",
                },
                {
                    "id": 0,
                    "order_num": 4,
                    "title": "Mijozlar bilan ishlash",
                    "content": "Tez javob berish, muloyim muloqot va nizolarni hal qilish — muvaffaqiyatli sotuvchining siri.",
                    "category": "o'rta",
                    "category_emoji": "🌿",
                    "xp_reward": 200,
                    "icon": "💬",
                },
                {
                    "id": 0,
                    "order_num": 5,
                    "title": "Platformadan maksimal foydalanish",
                    "content": "Premium funksiyalar, analitika va AI yordamchidan foydalanib sotuvlarni oshiring. Cross-Border, AI Price Optimizer va boshqalar.",
                    "category": "yuqori",
                    "category_emoji": "🌳",
                    "xp_reward": 300,
                    "icon": "🏆",
                },
            ]
            return {
                "lessons": default_lessons,
                "total_lessons": len(default_lessons),
                "total_xp": sum(l["xp_reward"] for l in default_lessons),
                "categories": ["boshlang'ich", "o'rta", "yuqori"],
            }

        # Get user progress if requested
        completed_ids = set()
        if user_id:
            progresses = db.query(AcademyProgress).filter(
                AcademyProgress.user_id == user_id
            ).all()
            completed_ids = {p.lesson_id for p in progresses}

        lessons_data = []
        total_xp = 0
        completed_xp = 0

        for l in lessons:
            total_xp += l.xp_reward
            is_completed = l.id in completed_ids
            if is_completed:
                completed_xp += l.xp_reward

            lessons_data.append({
                "id": l.id,
                "order_num": l.order_num,
                "title": l.title,
                "content": l.content[:120] + "..." if len(l.content) > 120 else l.content,
                "category": l.category,
                "category_emoji": CATEGORY_EMOJI.get(l.category, "📚"),
                "xp_reward": l.xp_reward,
                "is_completed": is_completed,
                "completed_at": next(
                    (p.completed_at.isoformat() for p in progresses if p.lesson_id == l.id),
                    None,
                ) if user_id else None,
                "icon": ["🚀", "📦", "📈", "💬", "🏆"][min(l.order_num - 1, 4)],
            })

        # Categories with counts
        cat_counter = Counter(l.category for l in lessons)

        return {
            "lessons": lessons_data,
            "total_lessons": len(lessons_data),
            "total_xp": total_xp,
            "completed_xp": completed_xp if user_id else 0,
            "completed_count": len(completed_ids) if user_id else 0,
            "categories": [
                {"name": cat, "label": cat.capitalize(), "count": count, "emoji": CATEGORY_EMOJI.get(cat, "📚")}
                for cat, count in cat_counter.items()
            ],
        }
    except Exception as e:
        logger.error(f"Academy lessons error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        db.close()


@router.get("/lesson/{lesson_id}")
async def get_academy_lesson(lesson_id: int, user_id: int = Query(None)):
    """Get single lesson detail with full content"""
    db = SessionLocal()
    try:
        lesson = db.query(AcademyLesson).filter(AcademyLesson.id == lesson_id).first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")

        is_completed = False
        completed_at = None
        if user_id:
            progress = db.query(AcademyProgress).filter(
                AcademyProgress.user_id == user_id,
                AcademyProgress.lesson_id == lesson_id
            ).first()
            if progress:
                is_completed = progress.completed
                completed_at = progress.completed_at.isoformat() if progress.completed_at else None

        return {
            "id": lesson.id,
            "order_num": lesson.order_num,
            "title": lesson.title,
            "content": lesson.content,
            "category": lesson.category,
            "category_emoji": CATEGORY_EMOJI.get(lesson.category, "📚"),
            "xp_reward": lesson.xp_reward,
            "is_completed": is_completed,
            "completed_at": completed_at,
            "icon": ["🚀", "📦", "📈", "💬", "🏆"][min(lesson.order_num - 1, 4)],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Academy lesson error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Server error")
    finally:
        db.close()

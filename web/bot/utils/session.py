"""
DeLiKet Bot — DB-backed Session management
Har bir user uchun conversation state + 5 daqiqa timeout
PostgreSQL orqali saqlanadi — bot restartda session o'chmaydi!

Naive UTC: SQLite timezone saqlamaydi, shuning uchun hamma vaqt
    datetime.utcnow() bilan (timezone-naive) ishlaymiz.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from api.database import SessionLocal
from api.database.models import UserSession as UserSessionModel

SESSION_TIMEOUT_MINUTES = 5


def _utcnow() -> datetime:
    """Naive UTC datetime — SQLite va PostgreSQL ga mos"""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _ensure_dict(data) -> dict:
    """JSON column None bo'lsa ham dict qaytaradi"""
    return dict(data) if data else {}


class SessionManager:
    """Session manager with DB storage + in-memory cache
    - In-memory cache: tez ishlash uchun
    - DB flush: har bir get_or_create() da avtomatik saqlanadi
    - Bot restartda ma'lumot yo'qolmaydi
    """

    def __init__(self):
        self._cache: Dict[int, UserSessionModel] = {}

    # ── Internal helpers ──

    def _load(self, db, user_id: int) -> Optional[UserSessionModel]:
        """DB dan session olish"""
        return db.query(UserSessionModel).filter(
            UserSessionModel.user_id == user_id
        ).first()

    def _flush(self, user_id: int):
        """Cached sessionni DB ga yozish"""
        cached = self._cache.get(user_id)
        if cached is None:
            return

        now = _utcnow()
        db = SessionLocal()
        try:
            row = self._load(db, user_id)
            if row:
                row.state = cached.state
                row.data = _ensure_dict(cached.data)
                row.last_activity = now
                row.is_authenticated = cached.is_authenticated
                row.role = cached.role
                row.name = cached.name
            else:
                row = UserSessionModel(
                    user_id=user_id,
                    state=cached.state,
                    data=_ensure_dict(cached.data),
                    last_activity=now,
                    is_authenticated=cached.is_authenticated,
                    role=cached.role,
                    name=cached.name,
                )
                db.add(row)
            db.commit()
            cached.last_activity = now
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def _timeout_check(self, last_activity) -> bool:
        """Session eskirganmi?"""
        if not last_activity:
            return True
        return _utcnow() - last_activity > timedelta(minutes=SESSION_TIMEOUT_MINUTES)

    # ── Public API ──

    def get_or_create(self, user_id: int) -> UserSessionModel:
        """Session olish yoki yangi yaratish
        - Cache da bo'lsa, avval DB ga flush qiladi
        - Yangi bo'lsa, DB da yaratib cache ga oladi
        """
        # 1) Cache hit → flush to DB, return cached
        if user_id in self._cache:
            self._flush(user_id)
            return self._cache[user_id]

        # 2) Load from DB (or create)
        db = SessionLocal()
        try:
            session = self._load(db, user_id)
            if session and self._timeout_check(session.last_activity):
                db.delete(session)
                db.commit()
                session = None

            if not session:
                session = UserSessionModel(
                    user_id=user_id,
                    state="idle",
                    data={},
                    last_activity=_utcnow(),
                )
                db.add(session)
                db.commit()
                db.refresh(session)

            self._cache[user_id] = session
            return session
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def get(self, user_id: int) -> Optional[UserSessionModel]:
        """Session olish (yaratmasdan)"""
        if user_id in self._cache:
            return self._cache[user_id]

        db = SessionLocal()
        try:
            session = self._load(db, user_id)
            if session:
                if self._timeout_check(session.last_activity):
                    db.delete(session)
                    db.commit()
                    return None
                self._cache[user_id] = session
            return session
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def set_state(self, user_id: int, state: str, data: Optional[Dict] = None):
        """Session state + data o'zgartirish va DB ga yozish"""
        now = _utcnow()

        # Update cache
        cached = self._cache.get(user_id)
        if cached:
            cached.state = state
            cached.last_activity = now
            if data:
                current = _ensure_dict(cached.data)
                current.update(data)
                cached.data = current
        else:
            cached = UserSessionModel(
                user_id=user_id,
                state=state,
                data=_ensure_dict(data),
                last_activity=now,
            )
            self._cache[user_id] = cached

        # Write to DB
        self._flush(user_id)

    def clear(self, user_id: int):
        """Session tozalash (logout / cancel)"""
        self._cache.pop(user_id, None)
        db = SessionLocal()
        try:
            db.query(UserSessionModel).filter(
                UserSessionModel.user_id == user_id
            ).delete()
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def cleanup_expired(self):
        """Barcha eskirgan sessionlarni tozalash (cache + DB)"""
        cutoff = _utcnow() - timedelta(minutes=SESSION_TIMEOUT_MINUTES)

        # Clean cache
        expired_ids = [
            uid for uid, s in self._cache.items()
            if s.last_activity and s.last_activity < cutoff
        ]
        for uid in expired_ids:
            self._cache.pop(uid, None)

        # Clean DB
        db = SessionLocal()
        try:
            expired = db.query(UserSessionModel).filter(
                UserSessionModel.last_activity < cutoff
            ).all()
            for s in expired:
                db.delete(s)
            db.commit()
            if expired:
                print(f"🧹 Cleaned {len(expired)} expired sessions")
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


# Global session manager instance
session_manager = SessionManager()

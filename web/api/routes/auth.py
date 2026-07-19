"""DeLiKet API — Web Auth (Register, Login, Me, Logout)"""

import hashlib
import os
import secrets
import logging
import hmac
import time
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from api.database import SessionLocal
from api.database.models import User, SyncToken

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Bearer token scheme for Swagger UI ──
bearer_scheme = HTTPBearer(auto_error=False)

TOKEN_COOKIE = "deliket_token"
TOKEN_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


# ── FastAPI Dependencies ──

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User:
    """Extract authenticated user from cookie or Bearer token.

    Usage in routes:
        @router.get("/protected")
        async def protected(user: User = Depends(get_current_user)):
            return {"user": user.name}
    """
    token = request.cookies.get(TOKEN_COOKIE, "")

    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(status_code=401, detail="Avtorizatsiya talab qilinadi")

    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token noto'g'ri yoki muddati o'tgan")

    return user


async def get_current_user_optional(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> User | None:
    """Optional auth — returns None instead of 401 if no valid token.

    Usage in public endpoints:
        @router.get("/public")
        async def public(user: User | None = Depends(get_current_user_optional)):
            return {"user": user.name if user else "anonymous"}
    """
    token = request.cookies.get(TOKEN_COOKIE, "")

    if not token and credentials:
        token = credentials.credentials

    if not token:
        return None

    return get_user_by_token(token)


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Require the authenticated user to be an admin."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Faqat adminlar uchun")
    return user


# ── Helpers ──

def hash_password(password: str) -> str:
    """Hash password with PBKDF2-HMAC-SHA256 and random salt."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
    return salt.hex() + ':' + key.hex()


def verify_password(password: str, stored: str) -> bool:
    """Verify password against stored hash."""
    try:
        salt_hex, key_hex = stored.split(':')
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(key_hex)
        actual = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100_000)
        return actual == expected
    except (ValueError, Exception):
        return False


def generate_token() -> str:
    """Generate a secure random auth token."""
    return secrets.token_hex(32)


def get_user_by_token(token: str):
    """Look up user by auth token."""
    if not token:
        return None
    db = SessionLocal()
    try:
        return db.query(User).filter(User.auth_token == token, User.is_active == True).first()
    finally:
        db.close()


# ── Schemas ──

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str = ""
    role: str = "xaridor"  # sotuvchi, xaridor, ikkalasi


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


class TelegramLoginRequest(BaseModel):
    token: str


class TelegramWidgetData(BaseModel):
    """Data received from Telegram Login Widget callback."""
    id: int
    first_name: str = ""
    last_name: str = ""
    username: str = ""
    photo_url: str = ""
    auth_date: int = 0
    hash: str = ""


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    role: str
    rating: float
    is_admin: bool
    is_verified: bool
    xp: int
    level: int
    trust_score: float
    created_at: str


def user_to_response(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email or "",
        "phone": u.phone or "",
        "role": u.role or "xaridor",
        "rating": u.rating or 0.0,
        "is_admin": u.is_admin or False,
        "is_verified": u.is_verified or False,
        "xp": u.xp or 0,
        "level": u.level or 1,
        "trust_score": u.trust_score or 0.0,
        "created_at": str(u.created_at) if u.created_at else "",
    }


# ── Endpoints ──

@router.post("/register")
async def register(req: RegisterRequest, response: Response, request: Request):
    """Register a new web user."""
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Parol kamida 4 belgidan iborat bo'lishi kerak")

    if req.role not in ("sotuvchi", "xaridor", "ikkalasi"):
        raise HTTPException(status_code=400, detail="Noto'g'ri rol")

    db = SessionLocal()
    try:
        # Check if email already exists
        existing = db.query(User).filter(User.email == req.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Bu email allaqachon ro'yxatdan o'tgan")

        # Generate random user ID for web users (Telegram IDs are 9-10 digits)
        user_id = secrets.randbelow(10**15)

        token = generate_token()
        user = User(
            id=user_id,
            name=req.name,
            email=req.email,
            phone=req.phone,
            password_hash=hash_password(req.password),
            auth_token=token,
            role=req.role,
        )
        db.add(user)
        db.commit()

        is_https = os.getenv("VERCEL", "") == "1" or request.url.scheme == "https"
        response.set_cookie(
            key=TOKEN_COOKIE,
            value=token,
            max_age=TOKEN_MAX_AGE,
            httponly=True,
            samesite="lax",
            secure=is_https,
        )

        logger.info(f"✅ New user registered: {req.email}")
        return {"ok": True, "user": user_to_response(user)}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Register error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Ro'yxatdan o'tishda xatolik")
    finally:
        db.close()


@router.post("/login")
async def login(req: LoginRequest, response: Response, request: Request):
    """Login with email and password."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
        if not user or not user.password_hash:
            raise HTTPException(status_code=401, detail="Email yoki parol noto'g'ri")

        if not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Email yoki parol noto'g'ri")

        # Generate new token
        token = generate_token()
        user.auth_token = token
        db.commit()

        is_https = os.getenv("VERCEL", "") == "1" or request.url.scheme == "https"
        response.set_cookie(
            key=TOKEN_COOKIE,
            value=token,
            max_age=TOKEN_MAX_AGE,
            httponly=True,
            samesite="lax",
            secure=is_https,
        )

        logger.info(f"✅ User logged in: {req.email}")
        return {"ok": True, "user": user_to_response(user)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Kirishda xatolik")
    finally:
        db.close()


@router.get("/me")
async def me(request: Request):
    """Get current user info from auth token (cookie or header)."""
    token = request.cookies.get(TOKEN_COOKIE, "")

    # Also allow Authorization header
    auth_header = request.headers.get("Authorization", "")
    if not token and auth_header.startswith("Bearer "):
        token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Avtorizatsiya talab qilinadi")

    user = get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Token noto'g'ri yoki muddati o'tgan")

    return {"ok": True, "user": user_to_response(user)}


@router.post("/logout")
async def logout(response: Response):
    """Logout — clear auth cookie."""
    response.delete_cookie(key=TOKEN_COOKIE, path="/")
    return {"ok": True, "message": "Chiqildi"}


# ── Telegram Login Widget (one-click) ──

@router.post("/telegram-widget-login")
async def telegram_widget_login(request: Request, response: Response, body: TelegramWidgetData):
    """Login/Register via Telegram Login Widget.

    Receives auth data from Telegram Login Widget, verifies HMAC-SHA256
    signature, and auto-creates or logs in the user.

    Prerequisite: Bot owner must configure @BotFather:
      /setdomain → select bot → enter website domain (e.g. delikat.vercel.app)
    """
    bot_token = os.getenv("BOT_TOKEN", "")
    if not bot_token:
        raise HTTPException(status_code=500, detail="BOT_TOKEN not configured on server")

    # ── HMAC-SHA256 verification ──
    # Build data-check-string: all fields alphabetically, key=value, joined by \n
    raw = body.model_dump()
    hash_received = raw.pop("hash", "")
    items = sorted(raw.items())
    data_check_string = "\n".join(f"{k}={v}" for k, v in items)

    # Secret key = SHA256(bot_token)
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_hash, hash_received):
        logger.warning(f"Telegram widget HMAC mismatch: got {hash_received[:16]}..., expected {expected_hash[:16]}...")
        raise HTTPException(status_code=403, detail="Noto'g'ri Telegram ma'lumotlari")

    # Prevent replay attacks — check auth_date freshness (24h max)
    if time.time() - body.auth_date > 86400:
        raise HTTPException(status_code=403, detail="Avtorizatsiya muddati o'tgan. Qayta urinib ko'ring")

    # ── Create or login user ──
    telegram_id = body.id
    first_name = body.first_name or ""
    last_name = body.last_name or ""
    username = body.username or ""

    name = f"{first_name} {last_name}".strip() or first_name or username or "Telegram User"

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == telegram_id).first()
        is_new = False

        if user:
            # Existing user — update username, generate new token
            user.auth_token = generate_token()
            if username:
                user.username = username
            auth_token = user.auth_token
            logger.info(f"ℹ️ Telegram widget login (existing): {name} (ID: {telegram_id})")
        else:
            # New user — auto-register with Telegram data
            auth_token = generate_token()
            user = User(
                id=telegram_id,
                username=username,
                name=name[:100],
                auth_token=auth_token,
            )
            db.add(user)
            is_new = True
            logger.info(f"🆕 Telegram widget auto-register: {name} (ID: {telegram_id})")

        db.commit()

        is_https = os.getenv("VERCEL", "") == "1" or request.url.scheme == "https"
        response.set_cookie(
            key=TOKEN_COOKIE,
            value=auth_token,
            max_age=TOKEN_MAX_AGE,
            httponly=True,
            samesite="lax",
            secure=is_https,
        )

        return {"ok": True, "user": user_to_response(user), "is_new": is_new}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Telegram widget login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Kirishda xatolik yuz berdi")
    finally:
        db.close()


# ── Telegram Login (6-digit sync token) ──

@router.post("/telegram-login")
async def telegram_login(request: Request, response: Response, body: TelegramLoginRequest):
    """Login using 6-digit sync token from Telegram bot."""
    token = body.token
    if not token or len(token) != 6:
        raise HTTPException(status_code=400, detail="6 xonali kod kiriting")

    db = SessionLocal()
    try:
        from datetime import datetime, timezone

        sync = db.query(SyncToken).filter(
            SyncToken.token == token,
            SyncToken.is_used == False,
        ).first()

        if not sync:
            raise HTTPException(status_code=400, detail="Noto'g'ri kod")

        if sync.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Kod muddati o'tgan. Botda /web_login ni qayta yuboring")

        # Mark token as used
        sync.is_used = True

        # Get the user
        user = db.query(User).filter(User.id == sync.user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

        # Generate auth token and set cookie
        auth_token = generate_token()
        user.auth_token = auth_token
        db.commit()

        is_https = os.getenv("VERCEL", "") == "1" or request.url.scheme == "https"
        response.set_cookie(
            key=TOKEN_COOKIE,
            value=auth_token,
            max_age=TOKEN_MAX_AGE,
            httponly=True,
            samesite="lax",
            secure=is_https,
        )

        logger.info(f"✅ Telegram login: {user.name} (ID: {user.id})")
        return {"ok": True, "user": user_to_response(user)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Telegram login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Kirishda xatolik")
    finally:
        db.close()


# ── Email Verification ──

@router.post("/send-verification")
async def send_verification(request: Request):
    """Generate email verification token (no real email — shows link in response)."""
    token = request.cookies.get(TOKEN_COOKIE, "")
    auth_header = request.headers.get("Authorization", "")
    if not token and auth_header.startswith("Bearer "):
        token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Avtorizatsiya talab qilinadi")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.auth_token == token, User.is_active == True).first()
        if not user:
            raise HTTPException(status_code=401, detail="Token noto'g'ri")
        if user.email_verified:
            return {"ok": True, "verified": True, "message": "Email allaqachon tasdiqlangan"}

        verify_token = secrets.token_hex(32)
        user.email_verify_token = verify_token
        db.commit()

        base_url = str(request.base_url).rstrip("/")
        verify_link = f"{base_url}/verify-email?token={verify_token}"

        logger.info(f"Email verification link for {user.email}: {verify_link}")
        return {
            "ok": True,
            "verified": False,
            "message": "Emailni tasdiqlash uchun havola yaratildi",
            "verify_link": verify_link,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send verification error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


@router.get("/verify-email")
async def verify_email(token: str):
    """Verify email with token."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.email_verify_token == token,
            User.is_active == True,
        ).first()
        if not user:
            raise HTTPException(status_code=400, detail="Noto'g'ri yoki muddati o'tgan token")

        user.email_verified = True
        user.email_verify_token = None
        db.commit()

        logger.info(f"✅ Email verified: {user.email}")
        return {"ok": True, "message": "Email tasdiqlandi"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verify email error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


# ── Password Reset ──

@router.post("/forgot-password")
async def forgot_password(req: "ForgotPasswordRequest", request: Request):
    """Generate password reset token (no real email — shows link in response)."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == req.email, User.is_active == True).first()
        if not user:
            # Don't reveal if email exists
            return {"ok": True, "message": "Agar bu email ro'yxatdan o'tgan bo'lsa, parolni tiklash havolasi yuborildi"}

        from datetime import datetime, timedelta, timezone
        reset_token = secrets.token_hex(32)
        user.reset_token = reset_token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()

        base_url = str(request.base_url).rstrip("/")
        reset_link = f"{base_url}/reset-password?token={reset_token}"

        logger.info(f"Password reset link for {user.email}: {reset_link}")
        return {
            "ok": True,
            "message": "Parolni tiklash havolasi yaratildi",
            "reset_link": reset_link,
        }
    except Exception as e:
        logger.error(f"Forgot password error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()


@router.post("/reset-password")
async def reset_password(req: "ResetPasswordRequest"):
    """Reset password with token."""
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Parol kamida 4 belgidan iborat bo'lishi kerak")

    db = SessionLocal()
    try:
        from datetime import datetime, timezone

        user = db.query(User).filter(
            User.reset_token == req.token,
            User.is_active == True,
        ).first()

        if not user:
            raise HTTPException(status_code=400, detail="Noto'g'ri token")

        if not user.reset_token_expires or user.reset_token_expires < datetime.now(timezone.utc):
            user.reset_token = None
            user.reset_token_expires = None
            db.commit()
            raise HTTPException(status_code=400, detail="Token muddati o'tgan. Qayta urinib ko'ring")

        user.password_hash = hash_password(req.password)
        user.reset_token = None
        user.reset_token_expires = None
        user.auth_token = generate_token()  # Invalidate existing sessions
        db.commit()

        logger.info(f"✅ Password reset: {user.email}")
        return {"ok": True, "message": "Parol muvaffaqiyatli o'zgartirildi"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Xatolik yuz berdi")
    finally:
        db.close()

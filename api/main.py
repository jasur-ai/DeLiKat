"""
DeLiKet API — FastAPI asosiy fayl + Static frontend + Bot webhook
Deployed on Vercel via GitHub Actions.
"""

import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from datetime import datetime, timezone
from fastapi.responses import FileResponse, JSONResponse

load_dotenv()

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# ── Resilient imports — each wrapped individually so a single failure
#    doesn't take down the entire API on Vercel.
_routers = {}
for _name, _mod in [
    ('health', 'api.routes.health'),
    ('lots', 'api.routes.lots'),
    ('sync', 'api.routes.sync'),
    ('visual', 'api.routes.visual'),
    ('subscription', 'api.routes.subscription'),
    ('academy', 'api.routes.academy'),
    ('dispute', 'api.routes.dispute'),
    ('crossborder', 'api.routes.crossborder'),
    ('auth', 'api.routes.auth'),
    ('leaderboard', 'api.routes.leaderboard'),
    ('reviews', 'api.routes.reviews'),
    ('analytics', 'api.routes.analytics'),
    ('deals', 'api.routes.deals'),
    ('visits', 'api.routes.visits'),
    ('tradein', 'api.routes.tradein'),
]:
    try:
        _routers[_name] = __import__(_mod, fromlist=['router']).router
        logger.info(f"✅ Route loaded: {_mod}")
    except Exception as e:
        logger.error(f"❌ Route FAILED: {_mod}: {e}", exc_info=True)
        _routers[_name] = None

health_router = _routers['health']
lots_router = _routers['lots']
sync_router = _routers['sync']
visual_router = _routers['visual']
subscription_router = _routers['subscription']
academy_router = _routers['academy']
dispute_router = _routers['dispute']
crossborder_router = _routers['crossborder']
auth_router = _routers['auth']
leaderboard_router = _routers['leaderboard']
reviews_router = _routers['reviews']
analytics_router = _routers['analytics']
deals_router = _routers['deals']
visits_router = _routers['visits']
tradein_router = _routers['tradein']

# Database import (also wrapped — Vercel environment may have DB issues)
try:
    from api.database import init_db
    logger.info("✅ Database module loaded")
except Exception as e:
    logger.error(f"❌ Database module FAILED: {e}", exc_info=True)
    # Create a dummy init_db that logs the error instead of crashing
    def init_db():
        logger.warning("⚠️ Database unavailable — using stub")

# ── Lifespan management ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # Startup
    init_db()

    # Auto-seed if database is empty (Neon DB data may be lost on redeploy)
    try:
        from api.database import SessionLocal
        from api.database.models import User
        db = SessionLocal()
        user_count = db.query(User).count()
        db.close()
        if user_count == 0:
            from data.seed import seed
            seed()
            logger.info("🌱 Auto-seeded database (was empty)")
        else:
            logger.info(f"✅ Database has {user_count} users — seed skipped")
    except Exception as e:
        logger.warning(f"⚠️ Auto-seed check failed (non-fatal): {e}")

    logger.info("🚀 DeLiKet API started")

    # Initialize bot webhook (lazy — only if BOT_TOKEN is set)
    webhook_url = os.getenv("WEBHOOK_URL", "")
    secret_token = os.getenv("WEBHOOK_SECRET_TOKEN", "")
    bot_token = os.getenv("BOT_TOKEN", "")
    if bot_token and not bot_token.startswith("123456"):
        from api.webhook_bot import get_bot_application
        try:
            bot_app = await get_bot_application()
            if bot_app and webhook_url:
                full_url = f"{webhook_url.rstrip('/')}/webhook"
                kwargs = {"url": full_url}
                if secret_token:
                    kwargs["secret_token"] = secret_token
                await bot_app.bot.set_webhook(**kwargs)
                logger.info(f"🤖 Bot webhook set to {full_url}")
                print(f"✅ Bot webhook → {full_url}")
            elif bot_app:
                logger.info("🤖 Bot app initialized (no webhook URL set — /webhook endpoint ready)")
                print("✅ Bot app ready — /webhook endpoint active")
        except Exception as e:
            logger.warning(f"Bot webhook init skipped: {e}")

    yield

    # Shutdown
    try:
        from api.webhook_bot import shutdown_application
        await shutdown_application()
    except Exception:
        pass
    logger.info("👋 DeLiKet API stopped")


app = FastAPI(
    title="DeLiKet",
    description="Deadstock Liquidation Marketplace — Web + Telegram Bot",
    version="0.3.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes (only include if import succeeded)
for _name, _router in [
    ('health', health_router),
    ('lots', lots_router),
    ('sync', sync_router),
    ('visual', visual_router),
    ('subscription', subscription_router),
    ('academy', academy_router),
    ('dispute', dispute_router),
    ('crossborder', crossborder_router),
    ('auth', auth_router),
    ('leaderboard', leaderboard_router),
    ('reviews', reviews_router),
    ('analytics', analytics_router),
    ('deals', deals_router),
    ('visits', visits_router),
    ('tradein', tradein_router),
]:
    if _router is not None:
        app.include_router(_router)
        logger.info(f"✅ Router registered: {_name}")
    else:
        logger.warning(f"⚠️ Router SKIPPED: {_name} (failed to load)")

# ── Lot detail page ──
@app.get("/lot/{lot_id}")
async def lot_page(lot_id: int):
    """Serve the lot detail static page. JS reads the URL to fetch lot data."""
    if not (STATIC_DIR / "lot.html").exists():
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    return FileResponse(str(STATIC_DIR / "lot.html"))


# ── Shop profile page ──
@app.get("/shop/{shop_id}")
async def shop_page(shop_id: int):
    """Serve the shop profile static page. JS reads the URL to fetch seller data."""
    if not (STATIC_DIR / "shop.html").exists():
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    return FileResponse(str(STATIC_DIR / "shop.html"))


# ── Deal detail page ──
@app.get("/deal/{deal_id}")
async def deal_page(deal_id: int):
    """Serve the deal detail static page. JS reads the URL to fetch deal data."""
    if not (STATIC_DIR / "deal.html").exists():
        return JSONResponse({"detail": "Not Found"}, status_code=404)
    return FileResponse(str(STATIC_DIR / "deal.html"))


# ── Health check ──
@app.get("/api/ping")
async def ping():
    return {"status": "ok", "version": "0.3.0"}


# ── Comprehensive health check ──
@app.get("/api/health/check")
async def full_health_check():
    """Full system health check — tests DB, tables, seed data, FK integrity.

    Returns a detailed report — no external HTTP calls to avoid Vercel timeout.
    Used by the health dashboard (static/health.html).
    """
    from api.database import SessionLocal
    from api.database.models import User, Lot, Bid
    from collections import Counter

    results = {}
    overall_status = "ok"

    # ── 1. Database connection ──
    try:
        db = SessionLocal()
        # Simple query to verify connection
        db.query(User).first()
        results["database_connection"] = {"status": "ok", "detail": "Connected"}
        db.close()
    except Exception as e:
        results["database_connection"] = {"status": "fail", "detail": str(e)[:100]}
        overall_status = "degraded"

    # ── 2. Database tables ──
    try:
        db = SessionLocal()
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        tables = inspector.get_table_names()
        required = ["users", "lots", "bids", "ratings", "transactions", "disputes", "user_sessions", "sync_tokens"]
        missing = [t for t in required if t not in tables]
        if missing:
            results["database_tables"] = {"status": "fail", "detail": f"Missing: {missing}"}
            overall_status = "degraded"
        else:
            results["database_tables"] = {"status": "ok", "detail": f"{len(required)}/{len(tables)} core tables exist"}
        db.close()
    except Exception as e:
        results["database_tables"] = {"status": "fail", "detail": str(e)[:100]}
        overall_status = "degraded"

    # ── 3. Seed data ──
    try:
        db = SessionLocal()
        user_count = db.query(User).count()
        lot_count = db.query(Lot).count()
        bid_count = db.query(Bid).count()
        db.close()

        if user_count >= 7:
            results["seed_data"] = {"status": "ok", "detail": f"{user_count} users, {lot_count} lots, {bid_count} bids"}
        else:
            results["seed_data"] = {"status": "warning", "detail": f"Only {user_count} users — may need re-seed"}
    except Exception as e:
        results["seed_data"] = {"status": "fail", "detail": str(e)[:100]}
        overall_status = "degraded"

    # ── 4. Category distribution ──
    try:
        db = SessionLocal()
        cats = Counter(r.category for r in db.query(Lot.category).all())
        db.close()
        expected = {"smartfon", "notebook", "tv", "audio", "aksesuar", "kiyim"}
        found = set(cats.keys())
        if found == expected:
            results["categories"] = {"status": "ok", "detail": f"6/6: {dict(cats)}"}
        else:
            missing = expected - found
            results["categories"] = {"status": "warning", "detail": f"Missing: {missing}, Have: {dict(cats)}"}
    except Exception as e:
        results["categories"] = {"status": "fail", "detail": str(e)[:100]}

    # ── 5. Grade distribution ──
    try:
        db = SessionLocal()
        grades = Counter(r.grade for r in db.query(Lot.grade).all())
        db.close()
        valid = all(g in ("A", "B", "C") for g in grades.keys())
        results["grades"] = {"status": "ok" if valid else "warning", "detail": f"{dict(grades)}"}
    except Exception as e:
        results["grades"] = {"status": "fail", "detail": str(e)[:100]}

    # ── 6. Roles ──
    try:
        db = SessionLocal()
        roles = Counter(r.role for r in db.query(User.role).all())
        db.close()
        valid = all(r in ("sotuvchi", "xaridor", "ikkalasi") for r in roles.keys())
        results["roles"] = {"status": "ok" if valid else "warning", "detail": f"{dict(roles)}"}
    except Exception as e:
        results["roles"] = {"status": "fail", "detail": str(e)[:100]}

    # ── 7. Foreign key integrity ──
    try:
        db = SessionLocal()
        orphan_lots = db.query(Lot).filter(~Lot.seller_id.in_(db.query(User.id))).count()
        orphan_bids = db.query(Bid).filter(~Bid.lot_id.in_(db.query(Lot.id))).count()
        db.close()
        if orphan_lots == 0 and orphan_bids == 0:
            results["foreign_keys"] = {"status": "ok", "detail": "All references valid"}
        else:
            results["foreign_keys"] = {"status": "warning", "detail": f"Orphan lots: {orphan_lots}, orphan bids: {orphan_bids}"}
    except Exception as e:
        results["foreign_keys"] = {"status": "fail", "detail": str(e)[:100]}

    # ── 8. Active/Inactive lot ratio ──
    try:
        db = SessionLocal()
        active = db.query(Lot).filter(Lot.status == "aktiv").count()
        total = db.query(Lot).count()
        db.close()
        if total > 0:
            results["lot_status"] = {"status": "ok", "detail": f"{active}/{total} active"}
        else:
            results["lot_status"] = {"status": "warning", "detail": "No lots in DB"}
    except Exception as e:
        results["lot_status"] = {"status": "fail", "detail": str(e)[:100]}

    # ── 9. Price range available ──
    try:
        db = SessionLocal()
        from sqlalchemy import func as sa_func
        price_stats = db.query(
            sa_func.min(Lot.price),
            sa_func.max(Lot.price),
            sa_func.avg(Lot.price)
        ).filter(Lot.status == "aktiv").first()
        db.close()
        min_p = price_stats[0] if price_stats else None
        max_p = price_stats[1] if price_stats else None
        if min_p is not None and max_p is not None:
            results["price_data"] = {"status": "ok", "detail": f"{int(min_p):,} - {int(max_p):,} UZS"}
        else:
            results["price_data"] = {"status": "warning", "detail": "No active lots with prices"}
    except Exception as e:
        results["price_data"] = {"status": "fail", "detail": str(e)[:100]}

    # ── 10. Ping test (self-contained) ──
    results["api_ping"] = {"status": "ok", "detail": "v0.3.0"}

    # ── Summary ──
    ok_count = sum(1 for r in results.values() if r["status"] == "ok")
    warn_count = sum(1 for r in results.values() if r["status"] == "warning")
    fail_count = sum(1 for r in results.values() if r["status"] == "fail")
    total = len(results)
    score = round(ok_count / max(total, 1) * 100, 1)

    return {
        "status": overall_status,
        "service": "deliket",
        "version": "0.3.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "ok": ok_count,
            "warning": warn_count,
            "fail": fail_count,
            "total": total,
            "score": score,
        },
        "results": results,
        "note": "No external HTTP calls — tests run via direct DB queries. Use /health.html for interactive dashboard.",
        "test_suite": "python3 tests/test_comprehensive.py for full endpoint-level tests",
    }


# ── Telegram bot webhook endpoint ──
@app.post("/webhook")
async def telegram_webhook(request: Request):
    """Receive Telegram updates via webhook and process them.

    Security: Validates X-Telegram-Bot-Api-Secret-Token if WEBHOOK_SECRET_TOKEN is set.
    """
    from telegram import Update
    from api.webhook_bot import get_bot_application

    # Validate secret token (if configured)
    secret_token = os.getenv("WEBHOOK_SECRET_TOKEN", "")
    if secret_token:
        received = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if received != secret_token:
            logger.warning(f"Invalid webhook secret token received: {received}")
            raise HTTPException(status_code=403, detail="Invalid secret token")

    bot_app = await get_bot_application()
    if bot_app is None:
        return {"ok": False, "error": "Bot not configured"}

    try:
        data = await request.json()
        update = Update.de_json(data, bot_app.bot)
        await bot_app.process_update(update)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Webhook processing error: {e}", exc_info=True)
        return {"ok": False, "error": str(e)}


# ── Static frontend ──
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

async def _resolve_frontend(path: str):
    # Health dashboard — special case to ensure it's always accessible
    if path == "health.html":
        file_path = STATIC_DIR / "health.html"
        if not file_path.exists():
            return JSONResponse({
                "status": "fallback",
                "message": "health.html not found — run test suite instead",
                "test_suite": "/tests/test_comprehensive.py",
                "health_checks": "/api/health/check",
            })
        return FileResponse(str(file_path))
    """Resolve a frontend path to a file, returns FileResponse or None."""
    if not STATIC_DIR.exists():
        return None

    # Try exact file first (e.g., /style.css)
    file_path = STATIC_DIR / (path if path else "index.html")
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))

    # Try with .html extension (e.g., /analytics → analytics.html)
    if path and not path.endswith(".html"):
        file_path = STATIC_DIR / f"{path}.html"
        if file_path.exists():
            return FileResponse(str(file_path))

    # Try index.html inside directory (e.g., /analytics/ → analytics/index.html)
    file_path = STATIC_DIR / path / "index.html"
    if file_path.exists():
        return FileResponse(str(file_path))

    # Fallback to main index.html (SPA support)
    file_path = STATIC_DIR / "index.html"
    if file_path.exists():
        return FileResponse(str(file_path))

    return None


@app.get("/{path:path}")
async def serve_frontend(path: str):
    resp = await _resolve_frontend(path)
    if resp:
        return resp
    return JSONResponse({"detail": "Not Found"}, status_code=404)


@app.head("/{path:path}")
async def head_frontend(path: str):
    """HEAD request support for uptime monitors."""
    resp = await _resolve_frontend(path)
    if resp:
        return resp
    return JSONResponse({"detail": "Not Found"}, status_code=404)

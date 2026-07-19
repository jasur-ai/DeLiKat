#!/usr/bin/env python3
"""
DeLiKet Bot — Render.com poll mode starter + Health server
============================================================
This script starts the Telegram bot in POLLING mode on Render.com.

It also runs a tiny HTTP health server so that Render and UptimeRobot
can keep the service awake on the Free tier (15 min sleep → 24/7).

Deploy on Render:
    1. Push repo to GitHub
    2. Render Dashboard → New Web Service → Connect repo
    3. Set:
        - Name: deliket-bot
        - Runtime: Python 3
        - Build Command: pip install -r requirements.txt
        - Start Command: python bot_starter.py
        - Plan: Free ($0/month)
    4. Add Environment Variables:
        BOT_TOKEN, DATABASE_URL, WEB_URL, LOG_LEVEL
    5. Deploy!
"""

import os
import sys
import json
import logging
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from dotenv import load_dotenv

# ── Force correct Python path ──
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=os.getenv("LOG_LEVEL", "INFO"),
)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────
# Health-check HTTP server (for Render + UptimeRobot)
# ──────────────────────────────────────────


class HealthHandler(BaseHTTPRequestHandler):
    """Minimal health check — responds 200 OK to any request."""

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"status":"ok","service":"deliket-bot"}')

    def do_HEAD(self):
        self.send_response(200)
        self.end_headers()

    # Suppress default logging to stderr (bot handles its own logs)
    def log_message(self, format, *args):
        pass


def run_health_server():
    """Run HTTP health server on PORT (Render auto-assigns this)."""
    port = int(os.getenv("PORT", "10000"))
    server = HTTPServer(("0.0.0.0", port), HealthHandler)
    logger.info(f"❤️  Health server running on port {port}")
    server.serve_forever()


# ──────────────────────────────────────────
# Main
# ──────────────────────────────────────────


def main():
    """Initialize database, seed if needed, start bot polling."""
    token = os.getenv("BOT_TOKEN", "")
    if not token or token.startswith("123456"):
        logger.error("❌ BOT_TOKEN not configured!")
        print("❌ Set BOT_TOKEN in environment variables or .env file")
        print("   Get it from @BotFather on Telegram")
        sys.exit(1)

    # Start health server in background thread
    health_thread = threading.Thread(target=run_health_server, daemon=True)
    health_thread.start()
    logger.info("🩺 Health check server started (background thread)")

    # 1. Init database
    from api.database import init_db
    init_db()
    logger.info("✅ Database initialized")

    # 2. Seed test data if empty
    from api.database import SessionLocal
    from api.database.models import User
    db = SessionLocal()
    is_empty = db.query(User).count() == 0
    db.close()

    if is_empty:
        logger.info("🌱 Database empty — seeding test data...")
        try:
            from data.seed import seed
            seed()
        except Exception as e:
            logger.warning(f"⚠️ Seed skipped: {e}")
    else:
        logger.info("✅ Database already seeded")

    # 3. Start bot in polling mode
    logger.info("🤖 Starting DeLiKet Bot (polling mode on Render)...")
    from bot.main import main as bot_main
    bot_main()


if __name__ == "__main__":
    main()

"""
DeLiKet — Database init
Supports both SQLite (development) and PostgreSQL (production via Vercel).
Uses DATABASE_URL environment variable.

Vercel fix: SQLite on Vercel uses /tmp/deliket.db because /data/ is read-only.

Usage:
    with db_session() as db:
        lots = db.query(Lot).all()
"""

import os
from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Default DATABASE_URL
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///data/deliket.db')

# ── Vercel detection ──
# Vercel sets VERCEL=1 env var. /tmp is the only writable directory.
IS_VERCEL = os.getenv('VERCEL', '') == '1'
if IS_VERCEL and DATABASE_URL.startswith('sqlite'):
    # Force SQLite to /tmp on Vercel (read-only filesystem fix)
    os.makedirs('/tmp/data/', exist_ok=True)
    DATABASE_URL = 'sqlite:////tmp/data/deliket.db'
    print(f"📍 Vercel detected: using SQLite at /tmp/data/deliket.db")

# SQLite connect args for threading
connect_args = {}
is_sqlite = DATABASE_URL.startswith('sqlite')
if is_sqlite:
    connect_args['check_same_thread'] = False

# Pool args — only for PostgreSQL (SQLite doesn't support pool_size/max_overflow)
engine_kwargs = dict(
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True,
)
if not is_sqlite:
    engine_kwargs['pool_size'] = 5
    engine_kwargs['max_overflow'] = 10

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(bind=engine)


@contextmanager
def db_session():
    """Context manager for safe database sessions."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db():
    """FastAPI dependency generator."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables with schema migration support.

    On first deploy with BigInteger, drops old Integer columns
    and recreates them. Seed data will be re-populated.
    """
    try:
        from .models import Base

        # Migration: Ensure BigInteger columns for Telegram IDs
        # PostgreSQL's create_all uses IF NOT EXISTS, so we need
        # to drop the old schema first when migrating from Integer→BigInteger
        is_sqlite = engine.dialect.name == "sqlite"
        if not is_sqlite:
            try:
                # Only migrate on PostgreSQL (SQLite handles all ints uniformly)
                from sqlalchemy import inspect
                inspector = inspect(engine)
                if inspector.has_table("users"):
                    cols = {c["name"]: c["type"] for c in inspector.get_columns("users")}
                    id_type = cols.get("id", "")
                    # If id is still Integer (not BigInteger), drop and recreate
                    if str(id_type) == "INTEGER":
                        print("🔄 Migrating database schema: Integer → BigInteger...")
                        Base.metadata.drop_all(bind=engine)
                        print("✅ Old schema dropped. Recreating...")
            except Exception as migration_err:
                print(f"⚠️ Migration check skipped: {migration_err}")

        Base.metadata.create_all(bind=engine)
        print(f"✅ Database tables created: {engine.url}")
    except Exception as e:
        print(f"⚠️ Database init warning (non-fatal): {e}")

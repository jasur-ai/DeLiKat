# 🚀 DeLiKet — Deadstock Liquidation Marketplace

> **Yagona monorepo** — Web API + Telegram Bot + Market Research

## 📂 Struktura

```
deliket/
├── web/              # Production: FastAPI backend + Static frontend + Telegram bot
│   ├── api/          #   FastAPI routes (auth, lots, deals, analytics, ...)
│   ├── bot/          #   Telegram bot handlers (18+ handlers)
│   ├── static/       #   Frontend HTML pages (30+ pages)
│   ├── tests/        #   Test suite (comprehensive + E2E + bot handlers)
│   ├── data/         #   DB seed data
│   ├── requirements.txt
│   └── vercel.json
├── research/         # Market analysis & research (Uzbek)
│   ├── week1-5/      #   Haftalik tadqiqot natijalari
│   ├── swot-tahlil/  #   SWOT analiz (10+ kategoriya)
│   ├── claude-tahlil/#   AI yordamida tahlil
│   └── plan/         #   Biznes reja
├── plan/             # Master plan & roadmap
├── docs/             # Documentation
└── tools/            # Utility scripts
```

## 🚀 Quick Start

```bash
cd web

# Backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# Frontend
open static/index.html

# Testlar
python -m pytest tests/ -v
python tests/run_all.py          # Barcha testlar
python tests/run_all.py --e2e    # + Browser E2E

# Health Dashboard
open http://localhost:8000/health.html
```

## 🌐 Production

- **Web:** https://delikat.vercel.app
- **API Docs:** https://delikat.vercel.app/docs
- **Bot:** @DeLiKatBot

## 📊 Test Coverage

| Test turi | Status |
|---|---|
| API + DB | ✅ 265 test (93.6%) |
| E2E Browser | ✅ Playwright |
| Bot Handlers | ✅ 30+ test |
| Health Dashboard | ✅ Real-time |

## 🔧 Tech Stack

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** Vanilla HTML/CSS/JS
- **Bot:** python-telegram-bot v22
- **AI:** CLIP embeddings (visual search)
- **Deploy:** Vercel + Render

---

*DeLiKet — O'zbekistondagi eng yirik deadstock marketplace*

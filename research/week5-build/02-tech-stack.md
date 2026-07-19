# 🛠️ Tech Stack — MVP Build

## TANLOV

| Layer | Texnologiya | Versiya | Nega |
|-------|-------------|---------|------|
| Bot | python-telegram-bot | 20.x+ | Async, to'liq API, yaxshi dokumentatsiya |
| Backend | FastAPI | 0.110+ | Tez, async, avtomatik Swagger docs |
| DB | SQLite → PostgreSQL | — | SQLite tez boshlash, keyin migratsiya |
| Hosting | VPS (Hoster.uz / Uztelecom) | Ubuntu 22.04 | Lokal, latency <5ms |
| Version | Git + GitHub | — | main + dev + feature branch |
| CI/CD | GitHub Actions | — | Avtomatik test, Telegram deploy notification |
| ORM | SQLAlchemy | 2.0+ | Async, PostgreSQL ga oson o'tish |

## STRUKTURA
```
deliket-bot/
├── bot/                  # Telegram bot
│   ├── handlers/         # Command handlers (/start, /newlot, /search...)
│   ├── keyboards/        # Inline keyboard builders
│   ├── models/           # Pydantic validation models
│   └── utils/            # Helper functions (rate limit, formatter)
├── api/                  # FastAPI backend
│   ├── routes/           # API endpoints (health, stats)
│   ├── services/         # Business logic layer
│   └── database/         # SQLAlchemy models + migrations
├── data/                 # Seed dataset + config files
├── tests/                # Pytest unit + integration tests
├── requirements.txt      # Python dependencies
├── Dockerfile            # Container (optiona, for production)
└── README.md             # Project documentation
```

## DEPENDENCIES (requirements.txt)
```
python-telegram-bot==20.7
fastapi==0.110
uvicorn[standard]
sqlalchemy==2.0
pydantic==2.0
alembic (for future migrations)
pytest==7.0
httpx (for FastAPI tests)
```

## BRANCH STRATEGIYASI
- **main** → working branch (doim ishlaydi, MllyCore demo oladi)
- **dev** → ishlanadigan branch (kuniga 1 marta main ga merge)
- **feature/{name}** → alohida feature branch (dev dan fork)

## ISHLAB CHIQISH TARTIBI
1. `feature/x` branch yaratiladi (dev dan)
2. Feature ishlanadi + test yoziladi
3. `dev` ga merge (PR orqali)
4. `main` ga merge (Week oxirida stabil versiya)
5. MllyCore istalgan payt main branch dan demo oladi

## TESTING STRATEGIYASI
| Level | Nima test qilinadi | Asbob |
|-------|-------------------|-------|
| Unit | Handler logic, validation | pytest |
| Integration | DB operations, bid flow | pytest + test DB |
| E2E | Telegram bot flow | Manual (test user) |

## DEPLOY STRATEGIYASI
- **MVP (hozir):** `python bot.py` + screen/tmux session
- **Keyin:** Docker + GitHub Actions auto-deploy
- **Monitoring:** Bot loglari + /health endpoint

## XAVFSIZLIK
- Bot token: `.env` faylida, `.gitignore` da
- User data: faqat kerakli ma'lumotlar
- Rate limiting: 10 requests/min/user
- Input validation: SQLAlchemy + Pydantic

*📝 DeLiKet | Month 2 Week 1 | Tech stack*

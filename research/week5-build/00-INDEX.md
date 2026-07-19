# 🚀 Month 2 — BUILD: Week 1
**Deadstock Liquidation Marketplace — MVP Boshlash**

## MAQSAD
1-oy tahlili asosida MVP ni qurishni boshlash. Faqat MVP featurelar.

## WEEK 1 PLANI
| Kun | Vazifa | Yo'nalish | Status |
|-----|--------|-----------|--------|
| 1 | Tech stack + Git + arxitektura | **Setup** | [ ] |
| 2 | Telegram bot bazasi + auth | **Bot auth** | [ ] |
| 3 | Lot yaratish + listing tizimi | **Core feat** | [ ] |
| 4 | Qidirish + taklif yuborish | **Core feat** | [ ] |
| 5 | Xabarnoma + qabul/rad tizimi | **Bitim** | [ ] |
| 6 | Working branch stabilizatsiyasi + test | **QA** | [ ] |
| 7 | Review + fix + hisobot | **Review** | [ ] |

## ASOSIY QARORLAR (Month 1 Week 4 dan)
- **1 toifa:** Elektronika (eng katta deadstock segmenti)
- **1 shahar:** Toshkent (eng katta bozor)
- **1 kanal:** Telegram bot (70% tadbirkorlar ishlatadi)
- **Monetizatsiya:** 8-20% komissiya
- **Grade tizimi:** A(yangi) / B(ochilgan) / C(nuqsonli)

## TEXNOLOGIYALAR
- **Backend:** Python + FastAPI (async)
- **Bot:** python-telegram-bot v20.x
- **Ma'lumotlar:** SQLite (MVP) → PostgreSQL (v1.1)
- **Hosting:** VPS (Toshkent), Ubuntu 22.04
- **Git:** GitHub (main + dev + feature branches)

## KPI — WEEK 1 OXIRI
| Ko'rsatkich | Maqsad |
|-------------|--------|
| Yaratilgan lotlar | 10+ |
| Ro'yxatdan o'tgan foydalanuvchilar | 20+ |
| Bajarilgan bitimlar | 0 (Week 2 da 5+) |

## TEZKOR BOSHLASH
```bash
git clone https://github.com/deliket/deliket-bot
cd deliket-bot
pip install -r requirements.txt
cp .env.example .env  # BOT_TOKEN ni yozing
python init_db.py      # SQLite database yaratish
python bot.py          # Botni ishga tushirish
```

## RISK / BLOCKERLAR
| Xavf | Ehtimollik | Yechim |
|------|-----------|--------|
| Telegram API limiti | Past | Rate limiting qo'shilgan |
| VPS sozlamalari | O'rta | Ubuntu 22.04 standart |
| Bot token xavfsizligi | Past | .env + gitignore |
| Foydalanuvchi topish | Yuqori | Week 2 da outreach |

## BOG'LIQ FAYLLAR
- [MVP Features](01-mvp-spec.md)
- [Tech Stack](02-tech-stack.md)
- [Telegram Bot Spec](03-telegram-bot.md)
- [Ma'lumotlar Modeli](04-data-model.md)
- [1-Hafta Plan](05-week-1-plan.md)
- [Knowledge Base (Nazariy → Amaliy)](06-knowledge-base.md)

*📝 DeLiKet | Month 2 Week 1 | Build phase start*

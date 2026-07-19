# 📋 Week 1 — Batafsil Plan

## KUN 1: Tech Stack + Git (≈6 soat)
- [ ] GitHub repository yaratish (`deliket-bot`)
- [ ] main + dev branch larni yaratish (initial commit)
- [ ] FastAPI skeleton + health endpoint
- [ ] python-telegram-bot boilerplate (Application class)
- [ ] SQLAlchemy models (users, lots, bids)
- [ ] SQLite database yaratish (init_db.py)
- [ ] `.env` + `.gitignore` + `requirements.txt`
- [ ] MllyCore read-only access (GitHub collaborator)
- [ ] **Output:** Ishlaydigan bot skeleton ✅

## KUN 2: Telegram Bot — Auth + Start (≈6 soat)
- [ ] `/start` handler — welcome message + ro'yxatdan o'tish
- [ ] Telefon raqam so'rash (ContactRequestButton)
- [ ] Rol tanlash: sotuvchi / xaridor (inline keyboard)
- [ ] User ma'lumotlarini DB ga saqlash
- [ ] Asosiy menu inline keyboard
- [ ] `/help` — barcha komandalar ro'yxati
- [ ] Session timeout (5 daqiqa)
- [ ] **Output:** Bot ishga tushadi, user ro'yxatdan o'tadi ✅

## KUN 3: Lot Yaratish + Listing (≈6 soat)
- [ ] `/newlot` — ConversationHandler (5 bosqich)
- [ ] Kategoriya tanlash (inline: smartfon/notebook/tv/audio)
- [ ] Mahsulot nomi, narx, son, grade kiritish (text input)
- [ ] Lot ma'lumotlarini DB ga saqlash + validation
- [ ] `/mylots` — lotlarim ro'yxati (+ status)
- [ ] Lot status o'zgartirish (aktiv → arxiv)
- [ ] Seed data qo'shish (3+ test lot)
- [ ] **Output:** Sotuvchi lot yarata oladi ✅

## KUN 4: Qidirish + Taklif (≈5 soat)
- [ ] `/search` — kategoriya bo'yicha lot qidirish
- [ ] Lot detallarini chiroyli formatda ko'rsatish
- [ ] `/bid [lot_id] [narx]` — taklif yuborish
- [ ] Narx va quantity validation
- [ ] `/mybids` — takliflarim ro'yxati (+ status)
- [ ] Taklifni bekor qilish (agar 'kutmoqda' bo'lsa)
- [ ] **Output:** Xaridor lot topadi va taklif yuboradi ✅

## KUN 5: Xabarnoma + Qabul/Rad (≈5 soat)
- [ ] Xaridor taklifi → sotuvchiga xabarnoma (inline buttons)
- [ ] Sotuvchi qabul/rad qilishi + sabab yozishi
- [ ] Qabul → lot status 'sotilgan', bildirishnoma
- [ ] Rad → lot status 'aktiv', xaridorga xabar
- [ ] `/mybids` da taklif statusi yangilanadi
- [ ] `/profile` — profil ko'rish + statistika
- [ ] **Output:** Bitim sikli to'liq ishlaydi ✅

## KUN 6: Working Branch Stabilizatsiyasi (≈4 soat)
- [ ] Dev → Main merge (PR orqali)
- [ ] Test: 10+ lot, 20+ user, 5+ bid
- [ ] Edge case'larni qo'shish:
  - [ ] Bo'sh lot ro'yxati
  - [ ] Noto'g'ri narx formati
  - [ ] Bir vaqtda ko'p so'rov (rate limit)
- [ ] Rate limiting qo'shish (10 requests/min)
- [ ] Error handler (foydalanuvchiga tushunarli xabar)
- [ ] **Output:** Working branch demo tayyor ✅

## KUN 7: Review + Fix + Hisobot (≈4 soat)
- [x] Barcha flowlarni tekshirish (smoke test) ✅
- [x] UX yaxshilash (xabarlarni chiroyli formatlash) ✅
- [x] README.md yozish (setup, run, commands) ✅
- [x] Week 1 yakuniy hisoboti ✅
- [x] Week 2 planini tuzish ✅
- [ ] MllyCore ga demo link yuborish
- [x] **Output:** Week 1 yakunlangan, Week 2 ga tayyorgarlik ✅

## ESTIMATED TOTAL: ~36 soat
| Kun | Soat | Asosiy fokus |
|-----|------|-------------|
| 1 | 6 | Setup |
| 2 | 6 | Bot auth |
| 3 | 6 | Lot creation |
| 4 | 5 | Search + bid |
| 5 | 5 | Notifications |
| 6 | 4 | QA |
| 7 | 4 | Review |

*📝 DeLiKet | Month 2 Week 1 | Week plan*

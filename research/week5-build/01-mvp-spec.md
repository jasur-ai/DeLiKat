# 🎯 MVP Specification — Month 2 Week 1

**Asos:** Week 4 tahlili (RICE prioritet, MVP features)
**Target:** Toshkent, Elektronika, Telegram bot

## MVP FEATURELAR (RICE bo'yicha top 6)
| # | Feature | RICE | Nega MVP da | Murakkablik |
|---|---------|------|-------------|-------------|
| 1 | Telegram bot orqali lot yaratish | 143 | Asosiy kanal | 🟢 Oson |
| 2 | B2B xaridor so'rov yuborishi | 130 | Bitim uchun kerak | 🟢 Oson |
| 3 | Lot kategoriyalari + filtri | 122 | Topish oson bo'lishi | 🟢 Oson |
| 4 | Sotuvchi profili (reyting) | 108 | Ishonch uchun | 🟡 O'rta |
| 5 | Lot holati (grade: A/B/C) | 97 | Sifat kafolati | 🟢 Oson |
| 6 | Xabarnoma (new lot, new offer) | 85 | Tezkor javob | 🟡 O'rta |

## GRADE TIZIMI (Elektronika uchun)
| Grade | Tavsif | Narx chegirmasi |
|-------|--------|----------------|
| A | Yangi, ochilmagan, to'liq kafolat | 0-10% |
| B | Ochilgan/ishlatilgan, lekin ishlaydi | 15-30% |
| C | Nuqsonli, ehtiyot qism sifatida | 50-70% |

## MVP TASHQARISIDA (v1.1+ ga)
- Eskrov to'lov tizimi (ishonch uchun, murakkab — keyin)
- Rasm yuklash (Telegram API limiti 20MB — v1.1)
- Logistika integratsiyasi (hamkor kerak — v1.2)
- Trade-in tizimi (v2.0)

## USER FLOW
```
Sotuvchi: /newlot → kategoriya → mahsulot nomi → narx → son → grade → lot yaratildi ✅
Xaridor: /search → kategoriya → lotlar → /bid [lot_id] → taklif yuborildi ✅
Sotuvchi: taklif kelgani haqida xabar → qabul/rad etish
Bitim: qabul qilinsa → lot 'sotilgan' status → ikkala tarafga xabar
```

## MINIMAL DATASET (Month 1 dan seed qilish)
**Ma'lumot manbasi:** `month-2/week-1/06-knowledge-base.md` (Nazariy → Amaliy mapping)

- **10+ lot:** Telegram deadstock kanallaridan olingan real elektronika lotlari
  - 5 ta smartfon (iPhone, Samsung, Redmi) — manba: `M1-W1/1-elektronika/01-smartfonlar.md`
  - 3 ta notebook (Lenovo, HP, MacBook) — manba: `M1-W1/1-elektronika/02-notebooklar.md`
  - 2 ta TV/monitor — manba: `M1-W1/1-elektronika/04-tv-video.md`
- **10+ xaridor:** Do'kon va resellerlardan test foydalanuvchilar
- **Real narxlar:** Uzum, OLX, Telegram kanallaridan olingan o'rtacha narxlar
  - Uzum: `M1-W1/11-uzum-asaxiy/01-umumiy.md`
  - OLX: `M1-W1/7-telegram-olx/02-olx-elonlari.md`
  - Telegram: `M1-W1/7-telegram-olx/01-telegram-postlari.md`

## SIFAT CHECKLISTI
| # | Tekshiruv | Mezon |
|---|----------|-------|
| 1 | Lot yaratish | 5 bosqichli conversation, validatsiya |
| 2 | Qidirish | Kategoriya bo'yicha filter, bo'sh natija |
| 3 | Taklif | Price va quantity validatsiyasi |
| 4 | Xabarnoma | Real-time notification, qabul/rad |
| 5 | Profil | User ma'lumotlari, statistika |
| 6 | Xatolar | Graceful error handling, tushunarli xabarlar |

## KPI
| Ko'rsatkich | Week 1 oxiri | Week 2 maqsad |
|-------------|-------------|---------------|
| Yaratilgan lotlar | 10+ | 50+ |
| Ro'yxatdan o'tgan foydalanuvchilar | 20+ | 100+ |
| Bajarilgan bitimlar | 0 | 5+ |
| Faol lotlar (%) | — | 60%+ |
| Bot uptime | 99% | 99.9% |

*📝 DeLiKet | Month 2 Week 1 | MVP spec*

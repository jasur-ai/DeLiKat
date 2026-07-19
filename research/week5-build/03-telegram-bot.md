# 🤖 Telegram Bot Spec — MVP

## ASOSIY KOMANDALAR

| Komanda | Tavsif | Kim uchun |
|---------|--------|-----------|
| `/start` | Botni ishga tushirish, ro'yxatdan o'tish | Hamma |
| `/newlot` | Yangi lot yaratish | Sotuvchi |
| `/mylots` | Lotlarim ro'yxati | Sotuvchi |
| `/search` | Lot qidirish | Xaridor |
| `/bid [lot_id]` | Lotga taklif yuborish | Xaridor |
| `/mybids` | Takliflarim | Xaridor |
| `/profile` | Profil ko'rish | Hamma |
| `/help` | Yordam | Hamma |

## SOTUVCHI FLOW
1. `/start` → ro'yxatdan o'tish (telefon raqam, ism, rol: sotuvchi/xaridor)
2. `/newlot` → kategoriya tanlash → mahsulot nomi → narx → grade (A/B/C) → lot ID
3. `/mylots` → lotlarim ro'yxati, statuss
4. Xaridordan taklif kelsa → xabarnoma → qabul/rad etish

## XARIDOR FLOW
1. `/start` → ro'yxatdan o'tish
2. `/search` → kategoriya bo'yicha qidirish
3. Lot ko'rish → `/bid [lot_id]` → taklif kiritish
4. Sotuvchi javobini kutish

## INLINE KEYBOARD STRUKTURASI
```
Asosiy menu:
┌─────────────────────┐
│ 🆕 Yangi lot        │
│ 🔍 Lot qidirish     │
│ 📋 Mening lotlarim  │
│ 👤 Profil           │
└─────────────────────┘

Kategoriya tanlash:
┌─────────────────────┐
│ 📱 Smartfonlar      │
│ 💻 Notebooklar      │
│ 📺 TV va video      │
│ 🎧 Audio            │
│ ← Orqaga            │
└─────────────────────┘
```

## SESSION BOSHQARUVI
- Har bir foydalanuvchi uchun ConversationHandler
- 5 daqiqa harakatsizlik → sessiya tugaydi (timeout)
- Lot yaratish jarayoni: 5 bosqichli conversation

## ERROR HANDLING
```
/start → DB error → "Serverda uzilish, keyinroq urinib ko'ring"
/newlot → invalid price → "Narxni to'g'ri kiriting (masalan: 500000)"
/search → no results → "Bu kategoriyada lot topilmadi"
/bid invalid → "Noto'g'ri lot ID. Lot ID ni tekshiring"
```

## TELEGRAM INTEGRATSIYASI
- **python-telegram-bot** v20.x (async Application class)
- Inline keyboardlar (CallbackQueryHandler)
- ConversationHandler (multi-step forms)
- User session management (dict yoki Redis)
- Rate limiting (10 requests/min per user)
- Error handler (graceful error messages)

## BOT TOKEN XAVFSIZLIGI
- `.env` faylida saqlanadi (gitignore ga qo'shilgan)
- `BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
- Production da GitHub Secrets da saqlash

*📝 DeLiKet | Month 2 Week 1 | Telegram bot spec*

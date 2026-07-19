# 🚀 DeLiKet — Keyingi 6 Feature (Priority Roadmap)

> **Holat:** Iyul 2026 | **Platforma:** Web + Telegram Bot
> **Jami effort:** ~7.5 kun | **Boshlash:** Bugun

---

## 📋 UMUMIY KO'RINISH

| # | Feature | Priority | Effort | DB o'zgarishi | Fayllar |
|---|---------|----------|--------|---------------|---------|
| 1 | 🖼️ **Rasm yuklash** | 🔴 Kritik | 1 kun | Yangi: `Lot.image_url` | `lot.py`, `models.py`, `search.py` |
| 2 | 🔧 **Session DB** | 🔴 Kritik | 2 kun | Yangi: `UserSession` table | `session.py`, `models.py` |
| 3 | 📄 **Search pagination** | 🟡 Muhim | 1 kun | Yo'q | `search.py`, `keyboards/menu.py` |
| 4 | 🌐 **Web lot detail** | 🟡 Muhim | 1 kun | Yo'q | `index.html`, `style.css` |
| 5 | ⭐ **Rating tizimi** | 🟡 Muhim | 2 kun | Yangi: `UserRating` table | `rate.py`, `profile.py` |
| 6 | 💰 **Mybids UX** | 🟢 Yaxshi | 0.5 kun | Yo'q | `search.py` |

---

## 1. 🖼️ RASM YUKLASH (1 kun)

### Muammo
`/newlot` da lot yaratish 5 qadam, lekin **rasm yo'q**. Xaridor mahsulotni ko'rmaydi. 
Rasmsiz lot — sotilmaydi.

### Yechim
`/newlot` conversation'iga yangi qadam qo'shish: `STEP_IMAGE`

### O'zgaradigan fayllar:
| Fayl | O'zgarish |
|------|-----------|
| `bot/handlers/lot.py` | Yangi `STEP_IMAGE` state, `newlot_image()` handler |
| `api/database/models.py` | Lot modeliga `image_url = Column(String(500), nullable=True)` |
| `bot/handlers/search.py` | Lot formatiga rasm linkini qo'shish |

### Ishlash tartibi:
1. `STEP_TITLE` → `STEP_IMAGE` (yangi)
2. `STEP_IMAGE` → `STEP_PRICE`
3. User rasm yuborishi mumkin yoki "Rasmsiz davom etish" tugmasi
4. Rasm Telegram file_id → URL ga o'girish (yoki to'g'ridan-to'g'ri file_id saqlash)
5. Lot detail'da rasm ko'rsatish

### Implementation:
```python
# Yangi state
STEP_CATEGORY, STEP_TITLE, STEP_IMAGE, STEP_PRICE, STEP_QUANTITY, STEP_GRADE, STEP_CONFIRM = range(7)

# Rasm handler
async def newlot_image(update: Update, context: ContextTypes.DEFAULT_TYPE):
    photo = update.message.photo[-1]  # Eng katta rasm
    file_id = photo.file_id
    user_id = update.effective_user.id
    session = session_manager.get_or_create(user_id)
    session.data["newlot"]["image_file_id"] = file_id
    
    # Keyingi qadamga o'tish
    await update.message.reply_text("✅ Rasm qabul qilindi! Davom etaylik...")
    return STEP_PRICE
```

### Xatolik ehtimoli:
- Rasm juda katta bo'lsa → Telegram fayl limiti (50MB)
- Rasm formati mos kelmasa → faqat JPEG/PNG qabul qilish
- User bir nechta rasm yuborsa → faqat oxirgisini olish

---

## 2. 🔧 SESSION DB (2 kun)

### Muammo
Bot restart bo'lsa, hamma user sessionlari (ro'yxatdan o'tayotganlar, lot yaratayotganlar) yo'qoladi.

### Yechim
In-memory dict → PostgreSQL da `user_sessions` table

### O'zgaradigan fayllar:
| Fayl | O'zgarish |
|------|-----------|
| `api/database/models.py` | Yangi `UserSession` model |
| `bot/utils/session.py` | `SessionManager` → PostgreSQL asosida |

### Database model:
```python
class UserSession(Base):
    __tablename__ = 'user_sessions'
    user_id = Column(BigInteger, primary_key=True)
    state = Column(String(50), default='idle')
    data = Column(JSON, default={})
    last_activity = Column(DateTime, default=func.now())
    is_authenticated = Column(Boolean, default=False)
    role = Column(String(20), nullable=True)
    name = Column(String(100), nullable=True)

class SessionManager:
    def __init__(self, db_session_factory):
        self.db = db_session_factory
    
    def get_or_create(self, user_id: int) -> UserSession:
        session = self.db.query(UserSession).filter(
            UserSession.user_id == user_id
        ).first()
        if not session:
            session = UserSession(user_id=user_id, data={})
            self.db.add(session)
            self.db.commit()
        return session
    
    def save(self, session: UserSession):
        session.last_activity = func.now()
        self.db.commit()
    
    def cleanup_expired(self, minutes: int = 30):
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        self.db.query(UserSession).filter(
            UserSession.last_activity < cutoff
        ).delete()
        self.db.commit()
```

### Muhim:
- `data` kolon JSON tipida — dict ni to'g'ridan-to'g'ri saqlash mumkin
- `last_activity` — 30 daqiqadan eski sessionlarni tozalash
- `cleanup_expired()` har soatda ishlashi kerak

---

## 3. 📄 SEARCH PAGINATION (1 kun)

### Muammo
Agar 20+ lot bo'lsa, hammasi bitta xabarda → juda uzun, o'qish qiyin.

### Yechim
5 tadan ko'rsatish + "Keyingi" / "Oldingi" tugmalari

### O'zgaradigan fayllar:
| Fayl | O'zgarish |
|------|-----------|
| `bot/handlers/search.py` | `_lot_list_keyboard()` → pagination |
| `bot/keyboards/menu.py` | `lot_pagination_keyboard()` |

### Implementation:
```python
PAGE_SIZE = 5

async def _show_category_lots(update, category, page=0):
    lots = db.query(Lot).filter(...).all()
    total_pages = (len(lots) + PAGE_SIZE - 1) // PAGE_SIZE
    page_lots = lots[page * PAGE_SIZE:(page + 1) * PAGE_SIZE]
    
    msg = f"📱 {category.upper()} ({len(lots)} ta lot) | {page+1}/{total_pages}\n..."
    
    keyboard = []
    for lot in page_lots:
        keyboard.append([InlineKeyboardButton(
            f"#{lot.id} — {lot.title[:40]}",
            callback_data=f"detail_{lot.id}"
        )])
    
    # Pagination buttons
    nav_row = []
    if page > 0:
        nav_row.append(InlineKeyboardButton("◀️ Oldingi", callback_data=f"page_{category}_{page-1}"))
    if page < total_pages - 1:
        nav_row.append(InlineKeyboardButton("Keyingi ▶️", callback_data=f"page_{category}_{page+1}"))
    if nav_row:
        keyboard.append(nav_row)
    
    keyboard.append([InlineKeyboardButton("◀️ Orqaga", callback_data="search")])
    return msg, InlineKeyboardMarkup(keyboard)
```

---

## 4. 🌐 WEB LOT DETAIL (1 kun)

### Muammo
Web'da lotlarni ko'rish mumkin, lekin lot detail va taklif yuborish faqat bot orqali.

### Yechim
Lot card'ni bosganda modal o'rniga alohida lot detail sahifasi ochilsin. Taklif yuborish formasi.

### O'zgaradigan fayllar:
| Fayl | O'zgarish |
|------|-----------|
| `static/index.html` | Lot card click → /lot/{id} sahifaga o'tish |
| `static/lot.html` | Yangi sahifa — lot detail |
| `api/routes/lots.py` | `/api/lots/{id}` — to'liq detail |

### Modal → Lot Detail
Hozirgi modal tizimi yaxshi, lekin uni yanada rivojlantirish:
- Share URL (lot ID bilan)
- "Bot orqali taklif yuborish" → "Sayt orqali taklif yuborish"
- Taklif formasi (narx, miqdor)
- 3D rasm galereyasi (agar rasm bo'lsa)

---

## 5. ⭐ RATING TIZIMI (2 kun)

### Muammo
Sotuvchi va xaridor bir-birini baholay olmaydi. Ishonch darajasi faqat admin tomonidan.

### Yechim
`/rate` buyrug'i + `UserRating` table + trust level auto-update

### O'zgaradigan fayllar:
| Fayl | O'zgarish |
|------|-----------|
| `api/database/models.py` | Yangi: `UserRating` model |
| `bot/handlers/rate.py` | Yangi: `/rate [user_id] [rating]` |
| `bot/handlers/profile.py` | Rating update |
| `bot/main.py` | Yangi handler registration |

### Database model:
```python
class UserRating(Base):
    __tablename__ = 'user_ratings'
    id = Column(Integer, primary_key=True)
    rater_id = Column(BigInteger, ForeignKey('users.id'))
    rated_user_id = Column(BigInteger, ForeignKey('users.id'))
    rating = Column(Integer)  # 1-5
    comment = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Bir marta baholash mumkin
    __table_args__ = (
        UniqueConstraint('rater_id', 'rated_user_id', name='unique_rating'),
    )
```

### /rate buyrug'i:
```
/rate [user_id] [rating 1-5]
/rate 123456789 5

Natija:
✅ Siz @sotuvchi ni 5★ baholadingiz!
O'rtacha reyting: 4.5★ (10 ta baho)
```

### Muhim:
- Faqat bitim tugaganidan keyin baholash mumkin
- Bir marta baholash (update qilish mumkin)
- Reyting avtomatik hisoblanadi
- Trust level avtomatik yangilanadi

---

## 6. 💰 MYBIDS UX (0.5 kun)

### Muammo
`/mybids` da takliflar ro'yxati chiqadi, keyin **har bir taklif uchun alohida xabar** ketadi (inline cancel tugmasi bilan). Agar 10 ta taklif bo'lsa, 11 ta xabar!

### Yechim
Takliflar va tugmalarni **bitta xabarga** joylash.

### O'zgaradigan fayllar:
| Fayl | O'zgarish |
|------|-----------|
| `bot/handlers/search.py` | `my_bids_handler` → bitta xabar + inline tugmalar |

### Implementation:
```python
async def my_bids_handler(update, context):
    bids = db.query(Bid).filter(Bid.buyer_id == user_id).all()
    
    # Bitta inline keyboard — har bir taklif uchun tugma
    keyboard = []
    for bid in bids[:10]:
        if bid.status == 'kutmoqda':
            lot = db.query(Lot).filter(Lot.id == bid.lot_id).first()
            label = f"❌ #{bid.id} — {lot.title[:30] if lot else 'Noma\'lum'} ({fmt_price(bid.price)})"
            keyboard.append([InlineKeyboardButton(label, callback_data=f"cancel_bid_{bid.id}")])
    
    msg = f"💰 Takliflarim ({len(bids)} ta)\n..."
    await update.message.reply_html(msg, reply_markup=InlineKeyboardMarkup(keyboard))
```

---

## 📊 EFFORT SUMMARY

| Feature | Files | Lines | Difficulty |
|---------|-------|-------|------------|
| 1. Rasm yuklash | 3 fayl | ~80 lines | 🟢 Oson |
| 2. Session DB | 3 fayl | ~120 lines | 🟡 O'rta |
| 3. Search pagination | 2 fayl | ~60 lines | 🟢 Oson |
| 4. Web lot detail | 3 fayl | ~100 lines | 🟢 Oson |
| 5. Rating tizimi | 4 fayl | ~150 lines | 🟡 O'rta |
| 6. Mybids UX | 1 fayl | ~30 lines | 🟢 Oson |

**Jami: ~540 lines / ~7.5 kun**

---

## 🚀 IMPLEMENTATION ORDER

```
Kun 1:  🖼️ Feature 1 — Rasm yuklash  ← BUGUN
Kun 2-3: 🔧 Feature 2 — Session DB
Kun 4:  📄 Feature 3 — Search pagination
Kun 5:  🌐 Feature 4 — Web lot detail
Kun 6-7: ⭐ Feature 5 — Rating tizimi
Kun 8:  💰 Feature 6 — Mybids UX
```

---

## ⚠️ XATOLAR VA OLDINI OLISH

| Feature | Mumkin bo'lgan xatolik | Oldini olish |
|---------|----------------------|--------------|
| Rasm | Telegram fayl limiti | 50MB limit, compres qilish |
| Session DB | DB connection leak | try/finally db.close() |
| Pagination | Callback pattern conflict | Aniq regex pattern |
| Web detail | CORS | CORS middleware |
| Rating | Duplicate rating | UniqueConstraint |
| Mybids UX | Long message | Max 10 taklif, inline tugma |

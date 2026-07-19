# 🗄️ Ma'lumotlar Modeli — MVP

## USER
| Maydon | Tur | Tavsif |
|--------|-----|--------|
| id | INTEGER PK | Telegram user ID |
| username | TEXT | Telegram username |
| phone | TEXT | Telefon raqam |
| name | TEXT | Ism |
| role | TEXT | 'sotuvchi' | 'xaridor' | 'ikkalasi' |
| rating | REAL | O'rtacha reyting (0-5) |
| created_at | TIMESTAMP | Ro'yxatdan o'tgan vaqt |
| is_active | BOOLEAN | Aktivlik holati |

## LOT
| Maydon | Tur | Tavsif |
|--------|-----|--------|
| id | INTEGER PK | Avtomatik ID |
| seller_id | INTEGER FK | Sotuvchi user ID |
| category | TEXT | Kategoriya (smartfon, notebook...) |
| title | TEXT | Mahsulot nomi |
| description | TEXT | Qisqa tavsif |
| quantity | INTEGER | Soni (1-1000) |
| price | REAL | Birlik narxi |
| grade | TEXT | A (yangi) | B (ochilgan) | C (nuqsonli) |
| status | TEXT | 'aktiv' | 'sotilgan' | 'arxiv' |
| created_at | TIMESTAMP | Yaratilgan vaqt |

## BID (taklif)
| Maydon | Tur | Tavsif |
|--------|-----|--------|
| id | INTEGER PK | Avtomatik ID |
| lot_id | INTEGER FK | Lot ID |
| buyer_id | INTEGER FK | Xaridor user ID |
| price | REAL | Taklif narxi |
| quantity | INTEGER | Taklif qilingan son |
| status | TEXT | 'kutmoqda' | 'qabul' | 'rad' |
| created_at | TIMESTAMP | Yaratilgan vaqt |

## ER DIAGRAMMASI (text)
```
USER ────◄ LOT (seller_id)
USER ────◄ BID (buyer_id)
LOT ────◄ BID (lot_id)
```

## INDEXES (performance)
```sql
-- Lot qidirishni tezlashtirish
CREATE INDEX idx_lot_category ON lots(category);
CREATE INDEX idx_lot_status ON lots(status);
CREATE INDEX idx_lot_seller ON lots(seller_id);

-- Takliflarni tez topish
CREATE INDEX idx_bid_lot ON bids(lot_id);
CREATE INDEX idx_bid_buyer ON bids(buyer_id);
CREATE INDEX idx_bid_status ON bids(status);
```

## QO'SHIMCHA MAYDONLAR (keyingi versiyalar)
```sql
-- users ga qo'shimcha:
-- company_name TEXT      (B2B kompaniya nomi)
-- tg_message_id INTEGER  (oxirgi bot xabari ID si)

-- lots ga qo'shimcha:
-- image_url TEXT         (Telegram file_id)
-- city TEXT DEFAULT 'toshkent'
-- original_price REAL    (asl narxi, chegirma foizini ko'rsatish uchun)

-- bids ga qo'shimcha:
-- message_text TEXT      (xaridorning xabari)
```

## SEED DATA (test uchun)
```sql
-- Test userlar
INSERT INTO users VALUES (123456789, 'test_seller', '+998901234567', 'Ali', 'sotuvchi', 0, datetime('now'), 1);
INSERT INTO users VALUES (987654321, 'test_buyer', '+998907654321', 'Bobur', 'xaridor', 0, datetime('now'), 1);

-- Test lotlar (real deadstock ma'lumotlar asosida)
INSERT INTO lots VALUES (1, 123456789, 'smartfon', 'iPhone 14 Pro 256GB Deep Purple', 'A grade, ochilmagan', 5, 7500000, 'A', 'aktiv', datetime('now'));
INSERT INTO lots VALUES (2, 123456789, 'notebook', 'MacBook Air M1 2020', 'B grade, ochilgan lekin ishlatilmagan', 3, 5500000, 'B', 'aktiv', datetime('now'));
INSERT INTO lots VALUES (3, 123456789, 'tv', 'Samsung 43" 4K Smart TV', 'C grade, ekranda kichik chiziq', 1, 2500000, 'C', 'aktiv', datetime('now'));
```

## SQLITE CREATE (to'liq)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    phone TEXT,
    name TEXT NOT NULL,
    role TEXT CHECK(role IN ('sotuvchi','xaridor','ikkalasi')),
    rating REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

CREATE TABLE lots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER REFERENCES users(id),
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1 CHECK(quantity > 0),
    price REAL NOT NULL CHECK(price > 0),
    grade TEXT CHECK(grade IN ('A','B','C')),
    status TEXT DEFAULT 'aktiv' CHECK(status IN ('aktiv','sotilgan','arxiv')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bids (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_id INTEGER REFERENCES lots(id),
    buyer_id INTEGER REFERENCES users(id),
    price REAL NOT NULL CHECK(price > 0),
    quantity INTEGER DEFAULT 1 CHECK(quantity > 0),
    status TEXT DEFAULT 'kutmoqda' CHECK(status IN ('kutmoqda','qabul','rad')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

*📝 DeLiKet | Month 2 Week 1 | Data model*

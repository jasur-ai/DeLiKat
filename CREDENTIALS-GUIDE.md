# 🔑 DeLiKet — Real Payme/Click Credential Olish Qo'llanmasi

> **⚠️ Hozirgi holat:** Barcha to'lov tizimlari DEMO mode da ishlaydi.
> Real Payme/Click credential'larni qo'yish bilan ESCROW, to'lov va fiskalizatsiya to'liq ishga tushadi.
>
> **Oxirgi yangilanish:** Iyul 2026

---

## 📋 Umumiy ko'rinish

| Provider | Status | Nima kerak | Narxi |
|----------|--------|-----------|-------|
| **Payme** | ❌ DEMO | `PAYME_MERCHANT_ID` + `PAYME_MERCHANT_KEY` | Bepul (0 so'm) |
| **Click** | ❌ DEMO | `CLICK_SERVICE_ID` + `CLICK_MERCHANT_ID` + `CLICK_SECRET_KEY` | Bepul (0 so'm) |
| **Fiskalizatsiya** | ❌ DEMO | `MERCHANT_STIR` + `FISCAL_TERMINAL_ID` | Payme orqali |

### Nega real credential kerak?

| Feature | DEMO mode | REAL mode |
|---------|-----------|-----------|
| 🛡️ **ESCROW yaratish** | ✅ Ishga tushadi | ✅ Ishga tushadi |
| 💳 **Payme to'lov** | ❌ Simulyatsiya | ✅ **Haqiqiy pul o'tadi** |
| 💳 **Click to'lov** | ❌ Simulyatsiya | ✅ **Haqiqiy pul o'tadi** |
| 🏛️ **Fiskal chek** | ❌ Chiqmaydi | ✅ **Soliq tizimiga yuboriladi** |
| 🔐 **Xavfsizlik** | ❌ Imzo tekshiruvi yo'q | ✅ **MD5/JSON-RPC imzo tekshiruvi** |
| 📊 **Hisobot** | ❌ Mock data | ✅ **Real statistikalar** |

---

## 1️⃣ Payme Business — API kalit olish

### 1.1. Talablar

- **Yuridik shaxs** yoki **Yakka tartibdagi tadbirkor (YaTT)**
- STIR (Soliq To'lovchining Identifikatsiya Raqami)
- Bank hisob raqami
- Veb-sayt (yoki veb-saytingiz bo'lmasa, mobil ilova)

### 1.2. Ro'yxatdan o'tish bosqichlari

```
QADAM 1: ARIZA
──────────────
  1. https://b2b-partner.payme.uz/ saytiga kiring
  2. "Ro'yxatdan o'tish" tugmasini bosing
  3. Formani to'ldiring:
     ┌─────────────────────────────────────┐
     │ Компания номи (Nomi): DeLiKet       │
     │ СТИР (STIR): 306178924              │
     │ Телефон: +998 XX XXX XX XX          │
     │ Сайт (Sayt): https://deliket.vercel.app │
     │ Эл.почта (Email): your@email.com    │
     └─────────────────────────────────────┘
  4. Hujjatlarni yuklang (STIR guvohnomasi, direktor pasporti)
  5. Ariza yuboring

QADAM 2: SHARTNOMA
───────────────────
  1. Payme menejeri siz bilan bog'lanadi (1-3 ish kuni)
  2. Shartnoma shartlarini kelishasiz
  3. Shartnomani imzolaysiz (electronic document)
  4. Payme sizga merchant.kabinet ga login va parol yuboradi

QADAM 3: API KALIT
───────────────────
  1. https://merchant.payme.uz/ ga kiring
  2. "Кассы" (Kassalar) bo'limiga o'ting
  3. "Добавить кассу" (Yangi kassa) tugmasini bosing
  4. Kassa sozlamalari:
     ┌─────────────────────────────────────────┐
     │ Название (Nomi): DeLiKet ESCROW         │
     │ Тип кассы (Tur): Интернет-магазин       │
     │ URL сайта: https://deliket.vercel.app   │
     │ IP адрес: (qoldirishingiz mumkin)       │
     └─────────────────────────────────────────┘
  5. Kassa yaratilgach, quyidagilarni olasiz:
     ✅ MERCHANT_ID: 5e2c6a1b3d8f4c7a9b0d2e1f (misol)
     ✅ MERCHANT_KEY: Rw712wMJspZBczFvrG09bHkSNxnD4PY0n1C (misol)
```

### 1.3. Muhim: IP whitelist

> Payme xavfsizlik uchun faqat ruxsat etilgan IP'lardan kelgan so'rovlarni qabul qiladi.
>
> Agar serveringiz IP manzili o'zgarib tursa (masalan Vercel serverless), Payme support orqali barcha IP'larni ochishni so'rang yoki Vercel IP range'larini qo'shing.

### 1.4. Test muhiti

```bash
# 1. .env faylida sandbox=true qilib qo'ying:
PAYME_SANDBOX=true

# 2. Test URL: https://test.checkout.paycom.uz/
# 3. Real URL: https://checkout.paycom.uz/

# 4. To'lov URL formati (Payme to'lov sahifasi):
#    https://checkout.paycom.uz/pay?m={MERCHANT_ID}&a={AMOUNT}&ac=order_id={ORDER_ID}
```

### 1.5. Payme dokumentatsiyasi

| Manba | URL |
|-------|-----|
| 📘 Texnik dokumentatsiya | https://developer.help.paycom.uz/ |
| 📚 Method list | https://developer.help.paycom.uz/methods/ |
| 🏢 Business kabinet | https://merchant.payme.uz/ |
| 📝 Ro'yxatdan o'tish | https://b2b-partner.payme.uz/ |
| ☎️ Yordam | +998 71 205-15-55 |

---

## 2️⃣ Click Business — API kalit olish

### 2.1. Talablar

- **Yuridik shaxs** yoki **Yakka tartibdagi tadbirkor (YaTT)**
- STIR va bank hisob raqami
- Passport nusxasi
- Kompaniya guvohnomasi

### 2.2. Ro'yxatdan o'tish bosqichlari

```
QADAM 1: KABINETGA KIRISH
──────────────────────────
  1. https://merchant.click.uz/ saytiga kiring
  2. "Ro'yxatdan o'tish" tugmasini bosing
  3. Formani to'ldiring:
     ┌─────────────────────────────────────────┐
     │ Компания (Kompaniya): DeLiKet           │
     │ СТИР (STIR): 306178924                  │
     │ Телефон: +998 XX XXX XX XX              │
     │ Эл.почта: your@email.com                │
     │ Веб-сайт: deliket.vercel.app            │
     └─────────────────────────────────────────┘
  4. Hujjatlarni yuklang:
     - STIR guvohnomasi
     - Direktor/direktor pasporti
     - Bank hisob raqami ma'lumotnomasi

QADAM 2: TASDIQLASH
────────────────────
  1. Click menejeri ma'lumotlarni tekshiradi (1-3 ish kuni)
  2. Shartnoma tayyorlanadi
  3. Shartnomani imzolaysiz
  4. Click sizga API credential'larni beradi

QADAM 3: API CREDENTIAL
────────────────────────
  1. Merchant kabinet -> "Sozlamalar" -> "API Integration"
  2. Quyidagilarni oling:
     ✅ SERVICE_ID: 12345 (misol)
     ✅ MERCHANT_ID: 12345 (misol)
     ✅ SECRET_KEY: qUv8pW3mXn5rT7yA2bC4dE6fG8hJ0kL (misol)
```

### 2.3. Click API turlari

| API turi | Endpoint | Izoh |
|----------|----------|------|
| **SHOP API** | `POST /` (sizning serveringiz) | Click dan kelgan callback'lar |
| **Merchant API** | `POST https://api.click.uz/v2/merchant/...` | Backend so'rovlari |

### 2.4. Click sandbox

> Click sandbox muhiti alohida so'ralishi kerak:
> - Click support orqali murojaat qiling
> - Yoki real credential bilan `CLICK_SANDBOX=true` qilib test qiling

### 2.5. Click dokumentatsiyasi

| Manba | URL |
|-------|-----|
| 📘 Texnik dokumentatsiya | https://docs.click.uz/ |
| 🏢 Merchant kabinet | https://merchant.click.uz/ |
| ☎️ Call-markaz | (71) 231-55-55 |

---

## 3️⃣ Fiskalizatsiya (Soliq tizimi)

### 3.1. Nima uchun kerak?

> O'zbekiston qonunchiligiga ko'ra (2025-2026), barcha onlayn to'lovlar uchun **fiskal chek** talab qilinadi. Fiskal chek Payme Receipts API orqali yuboriladi.

### 3.2. Kerakli ma'lumotlar

| Ma'lumot | Manba | Misol |
|----------|-------|-------|
| **MERCHANT_STIR** | Soliq idorasi / STIR guvohnoma | `306178924` |
| **FISCAL_TERMINAL_ID (VFM ID)** | Payme support orqali | `EP000000000025` |

### 3.3. VFM terminal olish

```
1. Payme merchant kabinetiga kiring
2. "ФИскализация" (Fiskalizatsiya) bo'limiga o'ting
3. "Подключить терминал" (Terminal ulash) ni bosing
4. So'rovnomani to'ldiring va yuboring
5. Payme sizga VFM ID beradi (EP bilan boshlanadi)
6. Terminalni aktivlashtiring va testdan o'tkazing
```

---

## 4️⃣ .env faylini sozlash

Credential'larni qo'lga kiritgach, `.env` fayliga qo'shing:

```env
# ═══════════════════════════════════════════════════
# DeLiKet — REAL PAYMENT CREDENTIALS
# ═══════════════════════════════════════════════════

# ─── 🛡️ Payme Merchant API ─────────────────────────
PAYME_MERCHANT_ID=5e2c6a1b3d8f4c7a9b0d2e1f    # Payme Business dan
PAYME_MERCHANT_KEY=Rw712wMJspZBczFvrG09bHkSNxnD4PY0n1C  # Payme Business dan
PAYME_SANDBOX=true  # true=test, false=real ishlab chiqarish

# ─── 🛡️ Click.uz Merchant API ──────────────────────
CLICK_SERVICE_ID=12345                          # Click Merchant dan
CLICK_MERCHANT_ID=12345                         # Click Merchant dan
CLICK_SECRET_KEY=qUv8pW3mXn5rT7yA2bC4dE6fG8hJ0kL  # Click Merchant dan
CLICK_SANDBOX=true  # true=test, false=real ishlab chiqarish

# ─── 🏛️ Fiskalizatsiya ─────────────────────────────
MERCHANT_STIR=306178924                         # Sizning STIR raqamingiz
FISCAL_TERMINAL_ID=EP000000000025               # VFM terminal ID
```

### Muhim: sandbox dan real ga o'tish

```bash
# TEST muhiti (tavsiya etiladi):
PAYME_SANDBOX=true
CLICK_SANDBOX=true

# REAL ishlab chiqarish (pul o'tadi!):
PAYME_SANDBOX=false
CLICK_SANDBOX=false

# ⚠️ Eslatma: sandbox=false qilishingiz bilan real pul o'ta boshlaydi!
# Avval test muhitida hamma narsani tekshirib oling.
```

---

## 5️⃣ Tekshirish va test qilish

### 5.1. Credential'larni tekshirish

```bash
# Serverni ishga tushirish
cd deliket && npm run dev

# Barcha to'lov testlarini ishga tushirish
npm run test:webhooks
```

### 5.2. Payme API ga ulanish testi

```bash
curl -X POST https://test.checkout.paycom.uz/api \
  -H "Content-Type: application/json" \
  -H "X-Auth: {MERCHANT_ID}:{MERCHANT_KEY}" \
  -d '{
    "id": 1,
    "method": "CheckPerformTransaction",
    "params": {
      "amount": 10000,
      "account": { "order_id": "test_order_1" }
    }
  }'
```

**Kutilgan javob (muvaffaqiyatli):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "allow": true }
}
```

**Kutilgan javob (buyurtma yo'q — normal):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -31050,
    "message": { "uz": "Buyurtma topilmadi", "en": "Order not found" }
  }
}
```
> **Eslatma:** -31050 xatolik — bu credential to'g'ri ekanligini bildiradi! Test buyurtmasi mavjud emas, lekin kalit ishlayapti.

### 5.3. Click API ga ulanish testi

```bash
curl -X POST https://api.click.uz/v2/merchant/invoice/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n '{MERCHANT_ID}:{SECRET_KEY}' | base64)" \
  -d '{
    "merchant_trans_id": "test_order_1",
    "amount": 100,
    "user_id": "0"
  }'
```

### 5.4. ESCROW to'liq sikl testi

```bash
# 1. ESCROW yaratish
curl -X POST http://localhost:3000/api/payments/escrow \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "deal_id": 3,
    "lot_id": 4,
    "buyer_id": 1,
    "seller_id": 4,
    "amount": 21000000,
    "payment_method": "payme"
  }'

# 2. To'lovni simulyatsiya qilish yoki real webhook
curl -X POST http://localhost:3000/api/payments/escrow \
  -H "Content-Type: application/json" \
  -d '{
    "action": "simulate",
    "escrow_id": 1
  }'

# 3. ESCROW release (pul sotuvchiga)
curl -X POST http://localhost:3000/api/payments/escrow \
  -H "Content-Type: application/json" \
  -d '{
    "action": "release",
    "escrow_id": 1
  }'

# 4. Audit log
curl "http://localhost:3000/api/payments/escrow?action=logs&escrow_id=1"

# 5. ESCROW statistikasi
curl "http://localhost:3000/api/payments/escrow?stats=true"
```

### 5.5. Birlashtirilgan test

```bash
# Avtomatik test ishga tushirish (server ishlayotgan bo'lishi kerak)
npm run test:webhooks
```

---

## 6️⃣ DeLiKet dagi integratsiya sxemasi

Real credential qo'yilgandan so'ng, DeLiKet avtomatik ravishda real API'larga o'tadi:

### Payme webhook flow

```
Foydalanuvchi Payme to'lov sahifasida to'laydi
        │
        ▼
Payme → POST /api/payments/payme-webhook 🎯
        │
        ├── CheckPerformTransaction → { allow: true } ✅
        │     └── Summa va buyurtmani tekshiradi
        │
        ├── CreateTransaction → transaction ID saqlanadi
        │     └── payme_transaction_id → escrow jadvali
        │
        └── PerformTransaction → status = 'held' 🔒
              └── Pul Payme merchant hisobiga tushdi
                    └── Fiskal chek yaratildi 🏛️
                          └── Sotuvchi mahsulotni jo'natdi 📦
                                └── Xaridor tasdiqladi → release ✅
                                      └── Pul sotuvchiga o'tkazildi 💰
```

### Click webhook flow

```
Foydalanuvchi Click ilovasida to'laydi
        │
        ▼
Click → POST /api/payments/click-webhook 🎯
        │
        ├── Prepare (action=0) → merchant_confirm_id
        │     └── Buyurtma va imzoni tekshiradi
        │
        └── Complete (action=1) → status = 'held' 🔒
              └── Pul Click merchant hisobiga tushdi
                    └── ESCROW da saqlanadi
                          └── Xaridor tasdiqladi → release ✅
                                └── Pul sotuvchiga o'tkazildi 💰
```

### Real vs DEMO farqi

| Qadam | DEMO Mode | REAL Mode |
|-------|-----------|-----------|
| Payme webhook | Mock javob qaytaradi | Haqiqiy Payme serveriga javob |
| Click webhook | Mock javob qaytaradi | Haqiqiy Click serveriga javob |
| Imzo tekshiruvi | O'tkazib yuboriladi | MD5/Signature tekshiriladi |
| To'lov | Simulyatsiya | **Real pul o'tadi** |
| Fiskal chek | Yaratilmaydi | **Soliq tizimiga yuboriladi** |
| Xavfsizlik | Minimal | To'liq |

---

## 7️⃣ Xavfsizlik bo'yicha eslatmalar

### ⚠️ MUHIM XAVFSIZLIK QOIDALARI

```
1. HECH QACHON credential'larni git commit qilmang!
   ✅ .env fayli .gitignore da ko'rsatilgan
   ✅ .env.example ishlatiladi (template)
   ❌ .env faylini commit qilmang!

2. HECH QACHON credential'larni frontend kodida ishlatmang!
   ✅ Faqat server-side API route'lar
   ✅ Next.js server component'lar
   ❌ Client-side JavaScript

3. HECH QACHON credential'larni log'da ko'rsatmang!
   ✅ payme.ts da error log'da credential yo'q
   ✅ click.ts da error log'da credential yo'q
```

### Payme/Click xavfsizlik tavsiyalari

| Tavsiya | Bajarilgan | Izoh |
|---------|-----------|------|
| Webhook imzo tekshiruvi | ✅ | Payme JSON-RPC, Click MD5 |
| IP whitelist | ⚠️ Vercel uchun sozlash kerak | Payme support orqali |
| Rate limiting | ❌ Qo'shilmagan | Tavsiya etiladi |
| Payme notification URL | ✅ | Webhook endpoint |

---

## 8️⃣ Tez-tez so'raladigan savollar

### 🔹 Yakka tartibdagi tadbirkor (YaTT) bo'lsam bo'ladimi?
✅ **Ha.** YaTT sifatida ham Payme va Click ga to'liq ulanish mumkin. STIR raqamingiz va bank hisobingiz bo'lsa kifoya.

### 🔹 Test credential bilan real ishlab chiqarishga o'tish?
✅ `.env` da `PAYME_SANDBOX=false` va `CLICK_SANDBOX=false` qilib o'zgartiring.
⚠️ **Avval test muhitida hamma narsani tekshirib oling!**

### 🔹 Fiskalizatsiya majburiymi?
✅ Ha. O'zbekistonda 2025-2026 yil holatiga ko'ra, barcha onlayn to'lovlar uchun fiskal chek talab qilinadi. Fiskalizatsiyasiz ishlash qonunga xilof.

### 🔹 Qancha vaqt ketadi?
| Bosqich | Vaqt |
|---------|------|
| Payme ro'yxatdan o'tish + shartnoma | 1-5 ish kuni |
| Click ro'yxatdan o'tish + shartnoma | 1-5 ish kuni |
| API credential olish | Darhol (shartnomadan keyin) |
| Fiskal terminal sozlash | 1-3 ish kuni |
| **Jami** | **2-10 ish kuni** |

### 🔹 Payme va Click dan tashqari boshqa to'lov tizimlari?
Hozircha ESCROW faqat Payme va Click ni qo'llab-quvvatlaydi. Keyingi versiyalarda:
- Uzum Nasiya (installment)
- Apelsin (P2P to'lovlar)
- Humo/Uzcard (terminal orqali)

### 🔹 Vercel da ishlatish uchun nima qilish kerak?
1. Vercel dashboard → Project Settings → Environment Variables
2. Barcha `.env` credential'larni qo'shing:
   - `PAYME_MERCHANT_ID`, `PAYME_MERCHANT_KEY`
   - `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`, `CLICK_SECRET_KEY`
   - `MERCHANT_STIR`, `FISCAL_TERMINAL_ID`
3. Webhook URL ni sozlang: `https://deliket.vercel.app/api/payments/payme-webhook`
4. Payme kabinetida webhook URL ni ro'yxatdan o'tkazing

---

## 📞 Qo'llab-quvvatlash kontaktlari

| Provider | Kontakt | Izoh |
|----------|---------|------|
| **Payme Business** | https://b2b-partner.payme.uz | Ro'yxatdan o'tish |
| **Payme Support** | +998 71 205-15-55 | Texnik yordam |
| **Click Merchant** | https://merchant.click.uz | Ro'yxatdan o'tish |
| **Click Support** | (71) 231-55-55 | Texnik yordam |
| **DeLiKet** | Telegram orqali | Texnik savollar |

---

> 📁 **Fayl:** `deliket/CREDENTIALS-GUIDE.md`
> 
> Credential'larni qo'yganingizdan so'ng, test qilish uchun:
> ```bash
> cd deliket && npm run dev
> npm run test:webhooks
> ```
>
> Barcha testlar o'tishi kerak! Agar xatolik bo'lsa, yuqoridagi qo'llanmani tekshiring.

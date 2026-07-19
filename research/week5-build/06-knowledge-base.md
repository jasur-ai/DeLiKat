# 📚 Knowledge Base — Nazariy → Amaliy Database

**Maqsad:** Month 1 da to'plangan 10,155+ ma'lumot nuqtasini Month 2 MVP uchun ma'lumotlar bazasi sifatida ishlatish.

## 1. SEKTORLAR (Month 1 Week 1 → Kategoriyalar)
Month 1 dagi 24 sektor tahlili MVP kategoriyalarini belgilaydi:

| Sektor | Manba (DeLiKet/ dan) | MVP kategoriya | Deadstock xavfi | RICE |
|--------|----------------------|----------------|----------------|------|
| Elektronika | `week1/tahlil/1-elektronika/` | ✅ **smartfon, notebook, tv, audio** | 🔴 Eng yuqori | 143 |
| Kiyim-kechak | `week1/tahlil/2-kiyim-kechak/` | ❌ v1.1 ga | 🟡 O'rta | — |
| Qurilish | `week1/tahlil/4-qurilish/` | ❌ v2.0 ga | 🟡 Sekin aylanma | — |
| Oziq-ovqat | `week1/tahlil/3-oziq-ovqat/` | ❌ v2.0 ga | 🔴 Muddatli | — |

**Qaror:** Elektronika — eng katta deadstock xavfi + eng tez aylanma → MVP da 1-toifa.

## 2. OG'RIQLAR (Month 1 Week 1 → Feature Prioritet)
Har bir sektordagi eng ko'p takrorlangan muammolar:

| Muammo | Chastota | Manba (DeLiKet/ dan) | MVP feature |
|--------|----------|----------------------|-------------|
| "Sezon o'tdi, mol qoldi" | 90% | `week1/tahlil/2-kiyim-kechak/06-umumiy-tahlil.md` | Tezkor listing |
| "Partiyaning yarmi qoldi" | 80% | `week1/tahlil/1-elektronika/01-smartfonlar.md` | Partiyaviy lot |
| "Chegirma qilsam stigmat" | 70% | `week1/tahlil/2-kiyim-kechak/01-ayollar.md` | Grade tizimi (A/B/C) |
| "O'lcham noto'g'ri" | 65% | `week1/tahlil/1-elektronika/02-notebooklar.md` | Aniq mahsulot tavsifi |
| "Qaytarilgan mahsulot" | 60% | `week1/tahlil/11-uzum-asaxiy/01-umumiy-tahlil.md` | B grade kanali |

## 3. RAQOBATCHILAR (Week 2 → Strategiya)
Global va lokal platformalar tahlili:

| Platforma | Manba (DeLiKet/ dan) | DeLiKet farqi |
|-----------|----------------------|--------------|
| Uzum Market | `week2/tahlil/02-lokal/02-uzum-asaxiy.md` | B2B fokus (Uzum B2C) |
| Telegram | `week2/tahlil/02-lokal/01-telegram-olx.md` | Tartibli B2B (Telegram tartibsiz) |
| OLX | `week2/tahlil/02-lokal/01-telegram-olx.md` | Ishonch tizimi + B2B |
| B-Stock (global) | `week2/tahlil/01-global/01-b2b-platformalar.md` | Lokal bozor (B-Stock AQSh) |
| Meesho (Hindiston) | `week2/tahlil/01-global/03-mdh-osiyo.md` | O'zbekiston modeli |

## 4. REAL MA'LUMOTLAR (Week 3 → UX/UI)
SPIN + Mom Test natijalari:

| Topilma | Manba (DeLiKet/ dan) | MVP ga ta'siri |
|---------|----------------------|---------------|
| "Srochno" so'zi stigmat | `week3/metod/01-spin-savollar.md` | Grade tizimi (A/B/C) ishonch uyg'otadi |
| Tadbirkorlar B2B kutishyapti | `week3/metod/02-mom-test.md` | B2B chat feature |
| Telegram 70% tadbirkorlar | `week3/metod/03-observation.md` | Telegram bot kanali |
| Narx muhim emas, ishonch muhim | `week3/natijalar/02-pattern-analysis.md` | Sotuvchi profili + rating |

## 5. YECHIM (Week 4 → MVP Scope)
RICE bo'yicha top 12 feature:

| Feature | RICE | Manba (DeLiKet/ dan) | MVP? |
|---------|------|----------------------|------|
| Telegram bot lot yaratish | 143 | `week4/tahlil/01-mvp-features.md` | ✅ |
| B2B xaridor so'rovi | 130 | `week4/tahlil/01-mvp-features.md` | ✅ |
| Kategoriya + filter | 122 | `week4/tahlil/01-mvp-features.md` | ✅ |
| Sotuvchi profili | 108 | `week4/tahlil/01-mvp-features.md` | ✅ |
| Eskrov to'lov | 76 | `week4/tahlil/04-yechim-sayqali.md` | ❌ v1.1 |
| Logistika integratsiyasi | 65 | `week4/tahlil/04-yechim-sayqali.md` | ❌ v1.2 |

## 6. BOZOR STATISTIKASI (Week 1 → KPI Benchmark)
| Ko'rsatkich | Qiymat | Manba (DeLiKet/ dan) |
|-------------|--------|----------------------|
| O'zbekiston deadstock bozori | $500M+/yil | `week1/tahlil/23-bozor-kuzatuvlari/02-raqamlar.md` |
| CRM qamrovi | <10% | `week1/tahlil/17-umumiy-kuzatuvlar/01-umumiy-tahlil.md` |
| Talab pasayishi | 60% tadbirkor | `week1/tahlil/23-bozor-kuzatuvlari/01-umumiy-tahlil.md` |
| Chegirma stigmati | 60-70% | `week1/tahlil/2-kiyim-kechak/06-umumiy-tahlil.md` |

---

**Izoh:** Barcha manzillar DeLiKet ildizidan (`week1/`, `week2/`, `week3/`, `week4/`) boshlanadi. Masalan: `week3/metod/01-spin-savollar.md` = `DeLiKet/week3/metod/01-spin-savollar.md`

**Xulosa:** Week 1-4 = nazariy ma'lumotlar bazasi. Week 5 = shu bazadan olingan xulosalar asosida MVP qurish. Har bir MVP qarori real ma'lumotga tayanadi.

*📝 DeLiKet | Week 5 — BUILD | Knowledge Base — Nazariy → Amaliy*

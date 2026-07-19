"""
DeLiKet — Seed ma'lumotlar
Week 1 real deadstock tahlili asosida (24 sektor, 10,000+ data points)

Manba: DeLiKet/week1/tahlil/
"""

from api.database import init_db, SessionLocal
from api.database.models import User, Lot, Bid, Achievement, TrustedReview
from collections import Counter


def seed():
    init_db()  # Ensure tables exist (idempotent)
    db = SessionLocal()

    if db.query(User).count() > 0:
        print("✅ Database already seeded")
        seed_gamification_data(db)
        db.close()
        return

    # ===========================
    # USERS — Real sotuvchilar
    # ===========================
    # Week 1 bo'yicha eng ko'p deadstock: elektronika (40%), kiyim (25%)
    sellers = [
        User(id=123456789, username="elektron_ali", phone="+998901234001",
             name="Ali", role="sotuvchi",
             xp=2850, level=12, trust_score=8.5, rating=4.8,
             total_sales=15, total_purchases=3),
        User(id=123456790, username="texno_bobur", phone="+998901234002",
             name="Bobur", role="sotuvchi",
             xp=2100, level=9, trust_score=7.2, rating=4.5,
             total_sales=10, total_purchases=5),
        User(id=123456791, username="gadget_sardor", phone="+998901234003",
             name="Sardor", role="sotuvchi",
             xp=1650, level=7, trust_score=6.0, rating=4.2,
             total_sales=8, total_purchases=2),
        User(id=123456792, username="kiyim_zebo", phone="+998901234004",
             name="Zebo", role="sotuvchi",
             xp=980, level=5, trust_score=5.5, rating=4.0,
             total_sales=5, total_purchases=7),
    ]
    buyers = [
        User(id=987654321, username="xaridor_akmal", phone="+998907654001",
             name="Akmal", role="xaridor",
             xp=3200, level=14, trust_score=9.0, rating=4.9,
             total_sales=2, total_purchases=25),
        User(id=987654322, username="ulgi_ravshan", phone="+998907654002",
             name="Ravshan", role="xaridor",
             xp=1450, level=6, trust_score=6.8, rating=4.3,
             total_sales=1, total_purchases=12),
        User(id=987654323, username="reseller_diyor", phone="+998907654003",
             name="Diyor", role="ikkalasi",
             xp=2600, level=11, trust_score=8.0, rating=4.7,
             total_sales=8, total_purchases=15),
    ]
    db.add_all(sellers + buyers)
    db.flush()

    ali, bobur, sardor, zebo = sellers
    akmal, ravshan, diyor = buyers

    # ===========================
    # LOTS — REAL DEADSTOCK DATA
    # ===========================
    # Week 1 ma'lumotlari asosida:
    # Smartfon: model eskirishi 40-50%, IMEI 30-50%, kredit 40-60%
    lots = [
        # --- SMARTFONLAR (Week 1: 200+ data) ---
        Lot(
            seller_id=ali.id, category="smartfon",
            title='iPhone 14 Pro 256GB Deep Purple',
            description='A grade, ochilmagan. Model eskirgani uchun chegirma. '
                        'Asl narx: 12,000,000 so\'m. Omborda 60 kun.',
            quantity=5, price=7_500_000, grade='A'
        ),
        Lot(
            seller_id=ali.id, category="smartfon",
            title='iPhone 14 Pro Max 256GB Gold',
            description='A grade. Pro Max modellari sekin ketadi (eng ko\'p qoladigan model). '
                        'Yangi model chiqishi bilan 30% tushgan.',
            quantity=3, price=8_500_000, grade='A'
        ),
        Lot(
            seller_id=bobur.id, category="smartfon",
            title='Samsung Galaxy S24 Ultra 512GB',
            description='A grade, ochilmagan. 50+ sotuvchi raqobat, '
                        'narx urushi sababli marja yo\'q. B2B partiya.',
            quantity=10, price=8_000_000, grade='A'
        ),
        Lot(
            seller_id=bobur.id, category="smartfon",
            title='IMEI muammoli iPhone 13 128GB (3 dona)',
            description='C grade, IMEI ro\'yxatdan o\'tmagan. Faqat Wi-Fi orqali ishlaydi. '
                        'Ehtiyot qism/eksport uchun. Week 1: IMEI muammosi 70% chastota.',
            quantity=3, price=2_500_000, grade='C'
        ),
        Lot(
            seller_id=sardor.id, category="smartfon",
            title='Redmi Note 13 Pro 256GB (partiya)',
            description='A grade. Budget segment, lekin 80% raqobat. '
                        'Bir model 50+ sotuvchi — faqat B2B partiyaviy ketadi.',
            quantity=20, price=2_800_000, grade='A'
        ),

        # --- NOTEBOOKLAR (Week 1: 150+ data) ---
        Lot(
            seller_id=ali.id, category="notebook",
            title='MacBook Air M1 2020 — 3 dona',
            description='B grade. M3 chiqishi bilan M1 narxi 30% tushgan. '
                        'Ochilgan, 1-2 oy ishlatilgan, to\'liq ishlaydi.',
            quantity=3, price=5_500_000, grade='B'
        ),
        Lot(
            seller_id=bobur.id, category="notebook",
            title='Lenovo ThinkPad X1 Carbon Gen 10',
            description='B grade. 1 yillik model, 25% arzon. '
                        'Biznes notebook, B2B segment uchun ideal.',
            quantity=2, price=4_200_000, grade='B'
        ),
        Lot(
            seller_id=sardor.id, category="notebook",
            title='Gaming notebook ASUS ROG Strix G15',
            description='B grade. Bitcoin qulashidan keyin talab pasaygan (65% chastota). '
                        'Kuchli, lekin oddiy foydalanuvchiga kerak emas.',
            quantity=1, price=6_500_000, grade='B'
        ),

        # --- TV va VIDEO (Week 1: 100+ data) ---
        Lot(
            seller_id=ali.id, category="tv",
            title='Samsung 43" 4K Smart TV 2024',
            description='C grade. Qaytarilgan, ekranda kichik chiziq bor. '
                        'Week 1: qaytarilgan TV 40-60% zarar.',
            quantity=1, price=2_500_000, grade='C'
        ),
        Lot(
            seller_id=bobur.id, category="tv",
            title='LG 55" OLED 4K TV — 2 dona',
            description='A grade, ochilmagan. OLED qimmat (70% odam oddiy TV oladi), '
                        'shuning uchun qolib ketgan. B2B partiya.',
            quantity=2, price=8_000_000, grade='A'
        ),
        Lot(
            seller_id=sardor.id, category="tv",
            title='DSLR Canon EOS 2000D + obektiv',
            description='B grade. DSLR bozori telefonlarga o\'tmoqda (50% chastota). '
                        'Vlog kameralar va telefon yetarli.',
            quantity=1, price=3_000_000, grade='B'
        ),
        Lot(
            seller_id=sardor.id, category="tv",
            title='Veb kamera Logitech C920 (10 dona)',
            description='A grade. Pandemiya qoldig\'i (2020-21 trend). '
                        'Hozir talab yo\'q, 70% chegirma.',
            quantity=10, price=150_000, grade='A'
        ),

        # --- AUDIO (Week 1: 100+ data) ---
        Lot(
            seller_id=ali.id, category="audio",
            title='AirPods Pro 2nd Gen original — 5 dona',
            description='A grade. Original qimmat, kopiya arzon — '
                        'original sotilmaydi (80% chastota). B2B partiya.',
            quantity=5, price=1_500_000, grade='A'
        ),
        Lot(
            seller_id=bobur.id, category="audio",
            title='Simsiz quloqchin JBL Tune 230 — 10 dona',
            description='A grade. Trend o\'tgan (75% chastota). '
                        'Bir xil mahsulot 50+ sotuvchi.',
            quantity=10, price=350_000, grade='A'
        ),
        Lot(
            seller_id=sardor.id, category="audio",
            title='Bluetooth kolonka JBL Charge 5 — 3 dona',
            description='A grade. Talab pasaygan (45% chastota). '
                        'Hammada bor, yangi xaridor yo\'q.',
            quantity=3, price=600_000, grade='A'
        ),

        # --- AKSESSUARLAR (Week 1: 100+ data) ---
        Lot(
            seller_id=bobur.id, category="aksesuar",
            title='iPhone 15 Pro chexol silikon (50 dona)',
            description='A grade. Modelga bog\'liq — model eskirsa, chexol keraksiz '
                        '(90% chastota). Eng katta deadstock muammosi.',
            quantity=50, price=50_000, grade='A'
        ),
        Lot(
            seller_id=sardor.id, category="aksesuar",
            title='Powerbank 20000mAh (20 dona)',
            description='A grade. Hamma bir xil sotadi (80% chastota). '
                        'Narx urushi, marja yo\'q. Faqat partiyaviy.',
            quantity=20, price=120_000, grade='A'
        ),
        Lot(
            seller_id=sardor.id, category="aksesuar",
            title='Micro USB kabel 1m (100 dona)',
            description='A grade. Type-C keldi, micro USB eskirgan (75% chastota). '
                        'Eski standard, faqat B2B partiya.',
            quantity=100, price=10_000, grade='C'
        ),

        # --- KIYIM (Week 1: 1,000+ data) ---
        Lot(
            seller_id=zebo.id, category="kiyim",
            title='Ayollar ko\'ylagi kolleksiya 2024 (50 dona)',
            description='A grade. Sezon o\'tgan (90% chastota). '
                        '50-70% chegirma. Mavsum oxiri kolleksiyasi.',
            quantity=50, price=150_000, grade='B'
        ),
        Lot(
            seller_id=zebo.id, category="kiyim",
            title='Bolalar kombinezon 0-3 oy (30 dona)',
            description='A grade. Bola o\'sadi, o\'lcham o\'tib ketadi (85% chastota). '
                        '100% deadstock xavfi. Trade-in uchun ideal.',
            quantity=30, price=80_000, grade='A'
        ),
        Lot(
            seller_id=zebo.id, category="kiyim",
            title='Maktab formasi — sentyabr qoldig\'i (20 dona)',
            description='A grade. Sentyabrda 80% sotiladi, oktabrdan keyin qoladi (90% chastota). '
                        '80% zarar. 2025 yil kolleksiyasi.',
            quantity=20, price=120_000, grade='A'
        ),
    ]
    db.add_all(lots)
    db.flush()

    # Count categories BEFORE commit (expire_on_commit=True expires all)
    cat_counter = Counter(l.category for l in lots)

    # ===========================
    # BIDS — Real takliflar
    # ===========================
    bids = [
        Bid(lot_id=lots[0].id, buyer_id=akmal.id,  # iPhone 14 Pro
            price=7_000_000, quantity=2, status='kutmoqda'),
        Bid(lot_id=lots[0].id, buyer_id=diyor.id,
            price=7_200_000, quantity=3, status='kutmoqda'),
        Bid(lot_id=lots[5].id, buyer_id=ravshan.id,  # MacBook Air M1
            price=5_000_000, quantity=1, status='kutmoqda'),
        Bid(lot_id=lots[3].id, buyer_id=diyor.id,  # IMEI iPhone
            price=2_200_000, quantity=3, status='kutmoqda'),
        Bid(lot_id=lots[9].id, buyer_id=akmal.id,  # Samsung TV
            price=7_500_000, quantity=1, status='qabul'),
    ]
    db.add_all(bids)
    seed_gamification_data(db)
    db.commit()
    db.close()

    total_lots = len(lots)
    total_bids = len(bids)
    total_users = len(sellers) + len(buyers)
    print(f"✅ Seeded: {total_users} users, {total_lots} lots, {total_bids} bids")
    cat_str = ', '.join(f'{k}={v}' for k, v in sorted(cat_counter.items()))
    print(f"   Categories: {cat_str}")


def seed_gamification_data(db=None):
    """Seed XP, achievements, and reviews for existing users."""
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        from datetime import datetime, timezone, timedelta

        # Check if achievements already exist
        existing_ach = db.query(Achievement).count()
        existing_rev = db.query(TrustedReview).count()
        if existing_ach > 0 and existing_rev > 0:
            print("✅ Gamification data already seeded")
            return

        users = db.query(User).all()
        user_map = {u.id: u for u in users}

        if existing_ach == 0:
            achievements_data = [
                # Ali (123456789) — top seller
                Achievement(user_id=123456789, badge="first_sale", title="Birinchi savdo",
                            description="Birinchi lotingizni soting", xp_reward=100),
                Achievement(user_id=123456789, badge="top_rated", title="Eng yaxshi reyting",
                            description="4.5+ reytingga ega bo'ling", xp_reward=200),
                Achievement(user_id=123456789, badge="fast_shipper", title="Tez yetkazuvchi",
                            description="24 soat ichida yetkazing", xp_reward=150),
                Achievement(user_id=123456789, badge="bulk_seller", title="Partiyaviy sotuvchi",
                            description="10+ lotni bir vaqtda soting", xp_reward=300),
                Achievement(user_id=123456789, badge="trusted_seller", title="Ishonchli sotuvchi",
                            description="8+ trust scorega erishing", xp_reward=250),

                # Bobur (123456790)
                Achievement(user_id=123456790, badge="first_sale", title="Birinchi savdo",
                            description="Birinchi lotingizni soting", xp_reward=100),
                Achievement(user_id=123456790, badge="tech_expert", title="Texnologiya mutaxassisi",
                            description="Eng ko'p texnik lotlarni qo'shing", xp_reward=200),
                Achievement(user_id=123456790, badge="bulk_seller", title="Partiyaviy sotuvchi",
                            description="10+ lotni bir vaqtda soting", xp_reward=300),

                # Sardor (123456791)
                Achievement(user_id=123456791, badge="first_sale", title="Birinchi savdo",
                            description="Birinchi lotingizni soting", xp_reward=100),
                Achievement(user_id=123456791, badge="diverse_inventory", title="Turli xil mahsulotlar",
                            description="5+ xil kategoriyada lot qo'shing", xp_reward=150),

                # Zebo (123456792)
                Achievement(user_id=123456792, badge="first_sale", title="Birinchi savdo",
                            description="Birinchi lotingizni soting", xp_reward=100),
                Achievement(user_id=123456792, badge="fashion_curator", title="Moda kuryatori",
                            description="Kiyim kategoriyasida eng faol bo'ling", xp_reward=150),

                # Akmal (987654321) — top buyer
                Achievement(user_id=987654321, badge="first_purchase", title="Birinchi xarid",
                            description="Birinchi lotingizni xarid qiling", xp_reward=100),
                Achievement(user_id=987654321, badge="loyal_buyer", title="Sodiq xaridor",
                            description="10+ marta xarid qiling", xp_reward=250),
                Achievement(user_id=987654321, badge="dealmaker", title="Bitim ustasi",
                            description="Eng ko'p taklif yuboring", xp_reward=200),
                Achievement(user_id=987654321, badge="reviewer", title="Sharhlovchi",
                            description="5+ ta sharh qoldiring", xp_reward=150),
                Achievement(user_id=987654321, badge="trusted_buyer", title="Ishonchli xaridor",
                            description="9+ trust scorega erishing", xp_reward=300),

                # Ravshan (987654322)
                Achievement(user_id=987654322, badge="first_purchase", title="Birinchi xarid",
                            description="Birinchi lotingizni xarid qiling", xp_reward=100),

                # Diyor (987654323) — reseller
                Achievement(user_id=987654323, badge="first_sale", title="Birinchi savdo",
                            description="Birinchi lotingizni soting", xp_reward=100),
                Achievement(user_id=987654323, badge="first_purchase", title="Birinchi xarid",
                            description="Birinchi lotingizni xarid qiling", xp_reward=100),
                Achievement(user_id=987654323, badge="reseller", title="Reseller",
                            description="Sotuvchi va xaridor sifatida faol bo'ling", xp_reward=200),
                Achievement(user_id=987654323, badge="dealmaker", title="Bitim ustasi",
                            description="Eng ko'p taklif yuboring", xp_reward=200),
            ]
            db.add_all(achievements_data)
            print(f"✅ Added {len(achievements_data)} achievements")

        if existing_rev == 0:
            reviews_data = [
                TrustedReview(
                    lot_id=1, buyer_id=987654321, seller_id=123456789,
                    rating=5, text="Ajoyib mahsulot! To'liq tavsifga mos keladi. Yetkazish tez va sifatli. Rasmda ko'rsatilganidek.",
                    is_verified_purchase=True,
                ),
                TrustedReview(
                    lot_id=1, buyer_id=987654323, seller_id=123456789,
                    rating=5, text="Partiyaviy sotib oldim. Hammasi yangi, ochilmagan. Ali bilan ishlash juda yoqdi. 10/10",
                    is_verified_purchase=True,
                ),
                TrustedReview(
                    lot_id=6, buyer_id=987654322, seller_id=123456789,
                    rating=4, text="MacBook Air juda yaxshi holatda. 3 oy ishlatilgan deyilgan edi, haqiqatan ham shunday. Batareya 90%. Faqat zaryadlagichi yo'q edi.",
                    is_verified_purchase=True,
                ),
                TrustedReview(
                    lot_id=10, buyer_id=987654321, seller_id=123456790,
                    rating=4, text="LG OLED ajoyib televizor. Narxiga nisbatan juda arzon. O'rama ochilmagan edi. Boburga rahmat.",
                    is_verified_purchase=True,
                ),
                TrustedReview(
                    lot_id=4, buyer_id=987654323, seller_id=123456790,
                    rating=3, text="IMEI muammoli iPhone. Wi-Fi bilan ishlaydi, lekin karta o'qimaydi. Eksport uchun yaroqli. Bobur muammoni oldindan aytgan edi.",
                    is_verified_purchase=True,
                ),
                TrustedReview(
                    lot_id=20, buyer_id=987654321, seller_id=123456792,
                    rating=5, text="Maktab formasi — ajoyib sifat! 20 dona oldim. Zebo bilan ishlash oson. Yana buyurtma beraman.",
                    is_verified_purchase=True,
                ),
                TrustedReview(
                    lot_id=18, buyer_id=987654323, seller_id=123456791,
                    rating=4, text="Powerbanklar yaxshi. 20 dona partiyaviy oldim. Hammasi ishlaydi. Sardor bilan kelishuv oson bo'ldi.",
                    is_verified_purchase=True,
                ),
                TrustedReview(
                    lot_id=2, buyer_id=987654322, seller_id=123456789,
                    rating=5, text="iPhone 14 Pro Max — yangi, ochilmagan. Juda zo'r narx. Ali eng ishonchli sotuvchilardan biri.",
                    is_verified_purchase=True,
                ),
            ]
            db.add_all(reviews_data)
            print(f"✅ Added {len(reviews_data)} trusted reviews")

        db.commit()
        print("✅ Gamification data seeded successfully")

    except Exception as e:
        db.rollback()
        print(f"⚠️ Gamification seed error: {e}")
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed()

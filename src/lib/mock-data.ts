/** ✨ Realistic demo data — DB bo'sh bo'lsa ishlatiladi */

export const MOCK_USERS = [
  { id: 1, name: "Jasur Karimov", username: "jasur_k", role: "sotuvchi", rating: 8.5, is_verified: true, xp: 2450, level: 7, trust_score: 9.2, total_sales: 34, total_purchases: 12, is_active: true, created_at: "2025-08-15T10:30:00Z" },
  { id: 2, name: "Aziza Rustamova", username: "aziza_r", role: "sotuvchi", rating: 9.2, is_verified: true, xp: 3200, level: 8, trust_score: 9.8, total_sales: 56, total_purchases: 8, is_active: true, created_at: "2025-06-01T09:00:00Z" },
  { id: 3, name: "Botir Xasanov", username: "botir_x", role: "sotuvchi", rating: 7.8, is_verified: true, xp: 1800, level: 6, trust_score: 8.5, total_sales: 22, total_purchases: 15, is_active: true, created_at: "2025-09-20T14:00:00Z" },
  { id: 4, name: "Dilnoza Abdullayeva", username: "dilnoza_a", role: "ikkalasi", rating: 9.5, is_verified: true, xp: 4100, level: 9, trust_score: 9.9, total_sales: 78, total_purchases: 45, is_active: true, created_at: "2025-03-10T11:00:00Z" },
  { id: 5, name: "Eldor Toshmatov", username: "eldor_t", role: "sotuvchi", rating: 6.5, is_verified: false, xp: 890, level: 4, trust_score: 6.2, total_sales: 11, total_purchases: 9, is_active: true, created_at: "2026-01-05T16:00:00Z" },
  { id: 6, name: "Feruza Mahmudova", username: "feruza_m", role: "ikkalasi", rating: 9.0, is_verified: true, xp: 2800, level: 7, trust_score: 9.5, total_sales: 42, total_purchases: 31, is_active: true, created_at: "2025-07-12T08:30:00Z" },
  { id: 7, name: "G'ani Rahimov", username: "gani_r", role: "xaridor", rating: 7.2, is_verified: false, xp: 650, level: 3, trust_score: 7.0, total_sales: 0, total_purchases: 18, is_active: true, created_at: "2026-02-18T12:00:00Z" },
  { id: 8, name: "Hilola Ergasheva", username: "hilola_e", role: "sotuvchi", rating: 8.8, is_verified: true, xp: 2100, level: 6, trust_score: 9.0, total_sales: 29, total_purchases: 5, is_active: true, created_at: "2025-10-01T10:00:00Z" },
  { id: 9, name: "Ikromjon Saidov", username: "ikrom_s", role: "xaridor", rating: 6.0, is_verified: false, xp: 420, level: 2, trust_score: 5.8, total_sales: 0, total_purchases: 7, is_active: true, created_at: "2026-03-22T15:00:00Z" },
  { id: 10, name: "Kamola Yoqubova", username: "kamola_y", role: "ikkalasi", rating: 9.3, is_verified: true, xp: 3500, level: 8, trust_score: 9.7, total_sales: 48, total_purchases: 35, is_active: true, created_at: "2025-04-15T09:30:00Z" },
];

export const MOCK_LOTS = [
  { id: 1, seller_id: 1, category: "smartfon", title: "iPhone 14 Pro Max 256GB Deep Purple — Deadstock", description: "Yangi, original qutisida. Faqat 1 dona qolgan. O'zbekiston bo'ylab yetkazib berish mavjud.", quantity: 1, price: 12500000, grade: "A", status: "aktiv", created_at: "2026-06-10T10:00:00Z", view_count: 342, bid_count: 8 },
  { id: 2, seller_id: 2, category: "notebook", title: "MacBook Air M2 15\" Midnight 16/256GB — Partiya (5 dona)", description: "Omboriy qoldiq. 5 dona MacBook Air M2. Narx har bir dona uchun. Barchasi yangi, muhrlangan.", quantity: 5, price: 11200000, grade: "A", status: "aktiv", created_at: "2026-06-09T15:30:00Z", view_count: 287, bid_count: 12 },
  { id: 3, seller_id: 3, category: "tv", title: "Samsung 65\" Q80C QLED 4K Smart TV — Omboriy qoldiq (3 dona)", description: "Samsung 65 dyuym QLED televizor. Har bir dona 8.5 mln so'm. Partiya uchun chegirma beriladi.", quantity: 3, price: 8500000, grade: "B", status: "aktiv", created_at: "2026-06-08T09:00:00Z", view_count: 156, bid_count: 5 },
  { id: 4, seller_id: 4, category: "audio", title: "Sony WH-1000XM5 Premium Noise-Cancelling — Partiya 10 dona", description: "10 dona Sony WH-1000XM5. Zo'r holatda, original. Har biri 2.1 mln so'm. Chegirmalar mavjud.", quantity: 10, price: 2100000, grade: "A", status: "aktiv", created_at: "2026-06-07T11:30:00Z", view_count: 423, bid_count: 18 },
  { id: 5, seller_id: 5, category: "akesesuar", title: "AirPods Pro 2 USB-C — 15 dona lot", description: "15 dona AirPods Pro 2. Barchasi original, ishlatilmagan. Har biri 1.2 mln so'm.", quantity: 15, price: 1200000, grade: "A", status: "aktiv", created_at: "2026-06-06T14:00:00Z", view_count: 189, bid_count: 7 },
  { id: 6, seller_id: 1, category: "smartfon", title: "Samsung Galaxy S24 Ultra 512GB — Partiya 3 dona", description: "S24 Ultra Titanium. 3 dona mavjud. Narx har bir dona uchun.", quantity: 3, price: 10500000, grade: "A", status: "aktiv", created_at: "2026-06-02T10:00:00Z", view_count: 267, bid_count: 9 },
  { id: 7, seller_id: 6, category: "kiyim", title: "Zara Premium Erkaklar Ko'ylagi — 20 dona omboriy qoldiq", description: "Turli o'lchamdagi Zara ko'ylaklar. Partiya sifatida sotiladi. Barcha o'lchamlar mavjud (S-XXL).", quantity: 20, price: 350000, grade: "B", status: "aktiv", created_at: "2026-06-01T08:30:00Z", view_count: 98, bid_count: 3 },
  { id: 8, seller_id: 2, category: "notebook", title: "Lenovo ThinkPad X1 Carbon Gen 11 — 2 dona", description: "Biznes notebook. 16GB RAM, 512GB SSD. Deadstock, yangi.", quantity: 2, price: 8900000, grade: "B", status: "aktiv", created_at: "2026-05-28T16:00:00Z", view_count: 134, bid_count: 4 },
  { id: 9, seller_id: 8, category: "smartfon", title: "Google Pixel 8 Pro 128GB Obsidian — Partiya 4 dona", description: "Pixel 8 Pro. Har biri 6.8 mln so'm. Barchasi muhrlangan holda.", quantity: 4, price: 6800000, grade: "A", status: "aktiv", created_at: "2026-05-25T12:00:00Z", view_count: 201, bid_count: 6 },
  { id: 10, seller_id: 4, category: "tv", title: "LG 55\" OLED C4 4K — 5 dona partiya", description: "LG OLED C4 seriyali televizorlar. 5 dona mavjud. Zo'r narx.", quantity: 5, price: 7200000, grade: "A", status: "aktiv", created_at: "2026-05-20T09:00:00Z", view_count: 312, bid_count: 14 },
  { id: 11, seller_id: 3, category: "audio", title: "JBL PartyBox 310 — 8 dona partiya", description: "Kuchli ovozli kolonka. 8 dona mavjud. Har biri 1.8 mln so'm.", quantity: 8, price: 1800000, grade: "B", status: "aktiv", created_at: "2026-05-18T10:30:00Z", view_count: 167, bid_count: 5 },
  { id: 12, seller_id: 6, category: "akesesuar", title: "iPhone 15 Pro Max Silicone Cases — 50 dona", description: "Original sifatli silikon chexollar. iPhone 15 Pro Max uchun. Turli ranglar mavjud.", quantity: 50, price: 45000, grade: "C", status: "aktiv", created_at: "2026-05-15T14:00:00Z", view_count: 78, bid_count: 2 },
  { id: 13, seller_id: 1, category: "smartfon", title: "Xiaomi 14 Ultra 512GB — Deadstock 2 dona", description: "Xiaomi flagmani. 1 dona 7.2 mln so'm. ikkalasi 13.5 mln.", quantity: 2, price: 7200000, grade: "A", status: "aktiv", created_at: "2026-05-12T11:00:00Z", view_count: 145, bid_count: 4 },
  { id: 14, seller_id: 10, category: "notebook", title: "HP Spectre x360 14\" 2-in-1 — 3 dona", description: "OLED 2K displey, 16GB RAM, 1TB SSD. Premium notebooklar.", quantity: 3, price: 9500000, grade: "A", status: "aktiv", created_at: "2026-05-10T15:30:00Z", view_count: 189, bid_count: 8 },
  { id: 15, seller_id: 5, category: "kiyim", title: "Adidas Erkaklar Sport Krossovkalari — 30 juft", description: "Original Adidas. Turli o'lcham va ranglar. Partiya sifatida 30 juft.", quantity: 30, price: 220000, grade: "B", status: "aktiv", created_at: "2026-05-05T10:00:00Z", view_count: 234, bid_count: 11 },
  { id: 16, seller_id: 8, category: "tv", title: "Samsung 43\" Crystal UHD 4K — 10 dona", description: "Maktab/makon uchun ideal. 10 dona Samsung televizor. Har biri 3.2 mln so'm.", quantity: 10, price: 3200000, grade: "B", status: "aktiv", created_at: "2026-05-01T09:30:00Z", view_count: 445, bid_count: 22 },
  { id: 17, seller_id: 10, category: "akesesuar", title: "Apple Watch Ultra 2 — 5 dona", description: "Titanium, GPS+LTE. Har biri 5.5 mln so'm. Barchasi yangi.", quantity: 5, price: 5500000, grade: "A", status: "aktiv", created_at: "2026-04-28T12:00:00Z", view_count: 256, bid_count: 9 },
  { id: 18, seller_id: 2, category: "audio", title: "Marshall Stanmore III Bluetooth Kolonka — 6 dona", description: "Original Marshall kolonkalar. Vintage dizayn, kuchli ovoz.", quantity: 6, price: 2500000, grade: "A", status: "aktiv", created_at: "2026-04-25T16:00:00Z", view_count: 198, bid_count: 7 },
  { id: 19, seller_id: 3, category: "smartfon", title: "iPhone 13 128GB — 8 dona partiya", description: "Ishlatilmagan, aktivlashtirilmagan. 8 dona iPhone 13. Har biri 5.2 mln.", quantity: 8, price: 5200000, grade: "B", status: "aktiv", created_at: "2026-04-20T10:00:00Z", view_count: 345, bid_count: 16 },
  { id: 20, seller_id: 1, category: "notebook", title: "Asus ROG Zephyrus G14 — Gaming Notebook 3 dona", description: "Ryzen 9, RTX 4060, 16GB RAM. O'yin notebooklari. Deadstock.", quantity: 3, price: 14800000, grade: "A", status: "aktiv", created_at: "2026-04-15T14:30:00Z", view_count: 178, bid_count: 6 },
  // Arxivdagi lotlar
  { id: 21, seller_id: 4, category: "tv", title: "Sony Bravia 75\" X90L — Sotildi", description: "Premium televizor, sotilgan.", quantity: 1, price: 15900000, grade: "A", status: "sotilgan", created_at: "2026-03-10T10:00:00Z", view_count: 512, bid_count: 25 },
  { id: 22, seller_id: 6, category: "smartfon", title: "Samsung Galaxy Z Fold5 — Sotildi", description: "Foldable telefon, sotilgan.", quantity: 2, price: 14500000, grade: "A", status: "sotilgan", created_at: "2026-02-20T09:00:00Z", view_count: 398, bid_count: 19 },
  { id: 23, seller_id: 8, category: "kiyim", title: "Nike Sport Kiyimlar Partiyasi — Arxiv", description: "Nike mahsulotlari arxivda.", quantity: 40, price: 180000, grade: "B", status: "arxiv", created_at: "2025-12-01T11:00:00Z", view_count: 89, bid_count: 1 },
].filter(l => l) as any[];

export const MOCK_BIDS = (() => {
  const bids: any[] = [];    const buyers = MOCK_USERS.filter(u => u.role === "xaridor" || u.role === "ikkalasi");
  const activeLots = MOCK_LOTS.filter(l => l.status === "aktiv");
  for (let i = 0; i < 45; i++) {
    const lot = activeLots[Math.floor(Math.random() * activeLots.length)];
    const buyer = buyers[Math.floor(Math.random() * buyers.length)];
    const bidPrice = lot.price * (0.85 + Math.random() * 0.25);
    bids.push({
      id: i + 1,
      lot_id: lot.id,
      buyer_id: buyer.id,
      price: Math.round(bidPrice / 10000) * 10000,
      quantity: Math.floor(Math.random() * Math.min(lot.quantity, 5)) + 1,
      status: ["kutmoqda", "kutmoqda", "qabul_qilingan", "rad_etilgan"][Math.floor(Math.random() * 4)],
      created_at: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString(),
    });
  }
  return bids;
})();

export const MOCK_TRANSACTIONS = [
  { id: 1, lot_id: 21, buyer_id: 7, seller_id: 4, amount: 15900000, status: "yakunlangan", created_at: "2026-04-01T10:00:00Z", completed_at: "2026-04-05T14:00:00Z" },
  { id: 2, lot_id: 22, buyer_id: 9, seller_id: 6, amount: 29000000, status: "yakunlangan", created_at: "2026-03-15T09:00:00Z", completed_at: "2026-03-20T16:00:00Z" },
  { id: 3, lot_id: 4, buyer_id: 1, seller_id: 4, amount: 21000000, status: "kutilmoqda", created_at: "2026-06-12T11:30:00Z", completed_at: null },
  { id: 4, lot_id: 10, buyer_id: 5, seller_id: 4, amount: 36000000, status: "kutilmoqda", created_at: "2026-06-11T14:00:00Z", completed_at: null },
  { id: 5, lot_id: 16, buyer_id: 3, seller_id: 8, amount: 32000000, status: "yakunlangan", created_at: "2026-05-20T09:30:00Z", completed_at: "2026-05-25T12:00:00Z" },
  { id: 6, lot_id: 19, buyer_id: 10, seller_id: 3, amount: 41600000, status: "kutilmoqda", created_at: "2026-06-05T10:00:00Z", completed_at: null },
  { id: 7, lot_id: 14, buyer_id: 2, seller_id: 10, amount: 28500000, status: "qabul", created_at: "2026-06-08T16:30:00Z", completed_at: "2026-06-10T11:00:00Z" },
  { id: 8, lot_id: 17, buyer_id: 6, seller_id: 10, amount: 27500000, status: "kutilmoqda", created_at: "2026-06-12T08:00:00Z", completed_at: null },
];

export const MOCK_REVIEWS = [
  { id: 1, lot_id: 21, buyer_id: 7, seller_id: 4, rating: 5, text: "Mahsulot ajoyib! Sifatli, tez yetkazib berishdi. Hammaga tavsiya qilaman.", media_type: "photo", is_verified_purchase: true, created_at: "2026-04-06T10:00:00Z" },
  { id: 2, lot_id: 22, buyer_id: 9, seller_id: 6, rating: 4, text: "Telefon juda zo'r, faqat yetkazib berishda 1 kun kechikish bo'ldi. Mahsulot sifatli.", media_type: "photo", is_verified_purchase: true, created_at: "2026-03-21T14:00:00Z" },
  { id: 3, lot_id: 16, buyer_id: 3, seller_id: 8, rating: 5, text: "32 mln so'mga 10 dona Samsung — bu juda yaxshi narx. Hammasi yangi, muhrlangan.", media_type: "photo", is_verified_purchase: true, created_at: "2026-05-26T09:30:00Z" },
  { id: 4, lot_id: 1, buyer_id: 2, seller_id: 1, rating: 5, text: "iPhone 14 Pro ajoyib. Sotuvchi bilan ishlash oson. Trust Score haqiqiy ekan.", media_type: "photo", is_verified_purchase: true, created_at: "2026-06-15T11:00:00Z" },
  { id: 5, lot_id: 4, buyer_id: 1, seller_id: 4, rating: 5, text: "Sony WH-1000XM5 — eng yaxshi narxda. Partiya uchun katta chegirma berdilar.", media_type: "photo", is_verified_purchase: true, created_at: "2026-06-14T16:00:00Z" },
  { id: 6, lot_id: 10, buyer_id: 5, seller_id: 4, rating: 4, text: "TV zo'r, OLED sifat. Yetkazib berish tez. Yana bir kamchilik — qo'lda ko'tarish og'ir.", media_type: "photo", is_verified_purchase: true, created_at: "2026-06-01T10:30:00Z" },
  { id: 7, lot_id: 2, buyer_id: 1, seller_id: 2, rating: 4, text: "MacBook Air — sifatli mahsulot. 5 dona oldik. Hammasi muhrlangan.", media_type: "photo", is_verified_purchase: true, created_at: "2026-06-12T15:00:00Z" },
  { id: 8, lot_id: 6, buyer_id: 4, seller_id: 1, rating: 5, text: "S24 Ultra — premium telefon. Sotuvchi professional.", media_type: "photo", is_verified_purchase: true, created_at: "2026-06-08T12:00:00Z" },
  { id: 9, lot_id: 14, buyer_id: 2, seller_id: 10, rating: 5, text: "HP Spectre x360 — ajoyib notebooklar. Tez yetkazib berish.", media_type: "photo", is_verified_purchase: true, created_at: "2026-06-10T09:00:00Z" },
  { id: 10, lot_id: 18, buyer_id: 3, seller_id: 2, rating: 4, text: "Marshall kolonka — chiroyli, ovoz ajoyib. Narx biroz baland.", media_type: "photo", is_verified_purchase: true, created_at: "2026-06-09T14:30:00Z" },
];

export function getMockStats() {
  const activeLots = MOCK_LOTS.filter(l => l.status === "aktiv");
  const bids = MOCK_BIDS;
  const users = MOCK_USERS;
  return {
    users: users.length,
    active_lots: activeLots.length,
    total_bids: bids.length,
    avg_price: Math.round(activeLots.reduce((s, l) => s + l.price, 0) / activeLots.length),
    price_range: {
      min: Math.min(...activeLots.map(l => l.price)),
      max: Math.max(...activeLots.map(l => l.price)),
    },
  };
}

export function getMockCategories() {
  const activeLots = MOCK_LOTS.filter(l => l.status === "aktiv");
  const catCount: Record<string, number> = {};
  for (const lot of activeLots) {
    catCount[lot.category] = (catCount[lot.category] || 0) + 1;
  }
  return catCount;
}

export function getMockAnalytics() {
  const activeLots = MOCK_LOTS.filter(l => l.status === "aktiv");
  const allLots = MOCK_LOTS;
  const totalBids = MOCK_BIDS.length;
  const pendingBids = MOCK_BIDS.filter(b => b.status === "kutmoqda").length;
  const users = MOCK_USERS;
  const prices = activeLots.map(l => l.price);
  const cats = getMockCategories();

  const gradeDist: Record<string, number> = {};
  for (const l of allLots) {
    gradeDist[l.grade] = (gradeDist[l.grade] || 0) + 1;
  }
  const roleDist: Record<string, number> = {};
  for (const u of users) {
    roleDist[u.role] = (roleDist[u.role] || 0) + 1;
  }

  // Top sellers
  const sellerMap: Record<number, { name: string; lots: number; sales: number; rating: number }> = {};
  for (const l of allLots) {
    const u = users.find(u => u.id === l.seller_id);
    if (!u) continue;
    if (!sellerMap[l.seller_id]) {
      sellerMap[l.seller_id] = { name: u.name, lots: 0, sales: 0, rating: u.rating };
    }
    sellerMap[l.seller_id].lots++;
    if (l.status === "sotilgan") sellerMap[l.seller_id].sales++;
  }

  return {
    stats: {
      users: users.length,
      total_lots: allLots.length,
      active_lots: activeLots.length,
      sold_lots: allLots.filter(l => l.status === "sotilgan").length,
      total_bids: totalBids,
      pending_bids: pendingBids,
      price_range: {
        min: Math.round(Math.min(...prices)),
        max: Math.round(Math.max(...prices)),
        avg: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      },
    },
    categories: cats,
    category_prices: Object.entries(cats).map(([name, count]) => {
      const lots = activeLots.filter(l => l.category === name);
      return { name, avg_price: Math.round(lots.reduce((s, l) => s + l.price, 0) / lots.length), count };
    }),
    grade_distribution: gradeDist,
    role_distribution: roleDist,
    top_sellers: Object.values(sellerMap)
      .sort((a, b) => b.lots - a.lots)
      .slice(0, 10)
      .map(s => ({ name: s.name, lots: s.lots, sales: s.sales, rating: s.rating })),
    recent_activity: MOCK_LOTS.slice(0, 5).map(l => {
      const date = new Date(l.created_at);
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
      const timeStr = diff === 0 ? "Bugun" : diff === 1 ? "Kecha" : `${diff} kun oldin`;
      return { text: `🆕 ${l.title}`, time: timeStr, icon: "📦" };
    }),
  };
}

export const MOCK_ACHIEVEMENTS = [
  { id: 1, user_id: 4, badge: "🥇", title: "Eng yaxshi sotuvchi — 2026 Yanvar", xp_reward: 500, unlocked_at: "2026-02-01T00:00:00Z" },
  { id: 2, user_id: 2, badge: "🏆", title: "100+ bitim — Platinum Status", xp_reward: 1000, unlocked_at: "2026-03-15T00:00:00Z" },
  { id: 3, user_id: 10, badge: "🌟", title: "Trust Score 9.5+", xp_reward: 300, unlocked_at: "2026-04-10T00:00:00Z" },
  { id: 4, user_id: 6, badge: "🎯", title: "Birinchi 10 bitim", xp_reward: 200, unlocked_at: "2026-01-20T00:00:00Z" },
  { id: 5, user_id: 1, badge: "🚀", title: "20 ta lot yaratildi", xp_reward: 250, unlocked_at: "2026-05-01T00:00:00Z" },
];

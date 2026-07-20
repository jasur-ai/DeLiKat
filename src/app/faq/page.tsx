'use client';

import { useState } from 'react';
import Header from '@/components/Header';

const FAQ_DATA = [
  {
    category: 'Xarid qilish',
    icon: '🛒',
    items: [
      { q: 'Qanday qilib lot sotib olish mumkin?', a: 'Lotni toping, "Taklif yuborish" tugmasini bosing. Narx va sonni kiriting. Sotuvchi taklifingizni ko\'rib chiqadi va qabul qilsa, bitim yuzaga keladi.' },
      { q: 'Narxni kelishish mumkinmi?', a: 'Ha, siz lotga o\'z narxingizni taklif qilishingiz mumkin. Sotuvchi taklifingizni qabul qilishi, rad etishi yoki qarshi taklif berishi mumkin.' },
      { q: 'Lotni qanday bron qilish mumkin?', a: 'Bron qilish uchun sotuvchiga taklif yuborishingiz kerak. Taklif qabul qilingach, lot siz uchun 24 soatga bronlanadi.' },
      { q: ' Sevimli lotlarni qanday saqlash mumkin?', a: 'Lot kartasidagi ❤️ belgisini bosib, sevimlilar ro\'yxatiga qo\'shishingiz mumkin. Keyinroq /wishlist sahifasida ko\'rishingiz mumkin.' },
    ],
  },
  {
    category: 'Sotish',
    icon: '💰',
    items: [
      { q: 'Qanday qilib lot qo\'shish mumkin?', a: 'Telegram bot (@DeLiKatbot) orqali lot qo\'shishingiz mumkin. Bot sizga mahsulot nomi, narx, rasm va tavsif kiritishda yordam beradi.' },
      { q: 'Komissiya bormi?', a: 'Yo\'q! DeLiKet da hech qanday komissiya yo\'q. Barcha daromad sizniki.' },
      { q: 'Lotni qanday tahrirlash mumkin?', a: 'Lotni faqat bot orqali tahrirlash mumkin. /newlot buyrug\'i bilan yangi lot qo\'shishingiz yoki mavjudini o\'zgartirishingiz mumkin.' },
    ],
  },
  {
    category: 'To\'lovlar',
    icon: '💳',
    items: [
      { q: 'ESCROW himoyasi nima?', a: 'ESCROW — bu xavfsiz to\'lov tizimi. Xaridor pul to\'laydi, pul DeLiKet da saqlanadi. Mahsulot yetib borgach, pul sotuvchiga o\'tkaziladi.' },
      { q: 'Qanday to\'lov turlari bor?', a: 'Payme, Click, UZCARD, HUMO va naqd to\'lov turlari mavjud. Yirik summalar uchun ESCROW xizmati tavsiya etiladi.' },
      { q: 'Bo\'lib to\'lash (Nasiya) mumkinmi?', a: 'Ha, 6, 12 yoki 18 oy muddatga bo\'lib to\'lash imkoniyati mavjud. 0% foizli variantlar ham bor.' },
    ],
  },
  {
    category: 'Xavfsizlik',
    icon: '🛡️',
    items: [
      { q: 'Sotuvchining ishonchliligini qanday tekshirish mumkin?', a: 'Har bir sotuvchining Trust Score ko\'rsatkichi bor. Bu bitimlar soni, nizolar tarixi va baholar asosida hisoblanadi.' },
      { q: 'Mahsulot autentifikatsiyasi qanday ishlaydi?', a: 'IMEI yoki Serial raqam orqali mahsulot originalligini tekshirishingiz mumkin. /verify sahifasida tekshirishingiz mumkin.' },
      { q: 'Agar mahsulot nosoz bo\'lsa nima qilish kerak?', a: '/dispute sahifasida nizo ochishingiz mumkin. ESCROW orqali to\'langan bo\'lsa, pulingiz himoyalangan.' },
    ],
  },
  {
    category: 'Hisob',
    icon: '👤',
    items: [
      { q: 'Qanday ro\'yxatdan o\'tish mumkin?', a: 'Telegram bot (@DeLiKatbot) orqali /start buyrug\'i bilan ro\'yxatdan o\'tasiz. Telefon raqamingizni tasdiqlash kifoya.' },
      { q: 'Profil ma\'lumotlarini qanday o\'zgartirish mumkin?', a: '/profile sahifasida ma\'lumotlaringizni ko\'rishingiz va o\'zgartirishingiz mumkin.' },
      { q: 'Trust Score qanday oshiriladi?', a: 'Muvaffaqiyatli bitimlar, ijobiy baholar va nizolarsiz savdo Trust Score ni oshiradi. To\'liq KYC dan o\'tish ham ball beradi.' },
    ],
  },
  {
    category: 'Nizolar va Qaytarish',
    icon: '⚖️',
    items: [
      { q: 'Nizoni qanday ochish mumkin?', a: '/dispute sahifasida "Nizo ochish" tugmasini bosing. Dalillar (rasm, matn) yuklang. Mediator 24 soat ichida javob beradi.' },
      { q: 'Pulni qanday qaytarish mumkin?', a: 'ESCROW orqali to\'langan bo\'lsa, nizo yechilgach pul avtomatik qaytariladi. To\'g\'ridan-to\'g\'ri to\'lovda sotuvchi bilan kelishishingiz kerak.' },
    ],
  },
];

export default function FAQPage() {
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    const next = new Set(openItems);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenItems(next);
  };

  const filtered = FAQ_DATA.map(cat => ({
    ...cat,
    items: cat.items.filter(item =>
      !search || item.q.toLowerCase().includes(search.toLowerCase()) ||
      item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="faq" />

      <div className="pt-24 pb-16 max-w-3xl mx-auto px-5">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            💬 Yordam markazi
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Tez-tez so&apos;raladigan savollar va qo&apos;llanma
          </p>
        </div>

        {/* Search */}
        <div className="max-w-lg mx-auto mb-8">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Savolingizni yozing..."
            className="w-full px-4 py-3 text-sm rounded-xl border outline-none transition"
            style={{
              borderColor: search ? 'var(--accent)' : 'var(--border-primary)',
              color: 'var(--text-primary)',
              background: 'var(--surface-dim)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => { if (!search) e.target.style.borderColor = 'var(--border-primary)'; }}
            autoFocus
          />
        </div>

        {/* FAQ Categories */}
        <div className="space-y-6">
          {filtered.map(cat => (
            <div key={cat.category} className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--border-primary)' }}>
              <div className="px-5 py-3 font-semibold text-sm flex items-center gap-2"
                style={{ background: 'var(--surface-dim)', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>
                <span>{cat.icon}</span> {cat.category}
              </div>
              <div>
                {cat.items.map((item, i) => {
                  const key = `${cat.category}-${i}`;
                  const isOpen = openItems.has(key);
                  return (
                    <div key={key}
                      className="border-b last:border-b-0 transition"
                      style={{ borderColor: 'var(--border-primary)' }}>
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between px-5 py-3.5 text-left cursor-pointer transition"
                        style={{ background: isOpen ? 'var(--accent-50)' : 'transparent', border: 'none' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.q}
                        </span>
                        <span className="text-xs transition-transform" style={{
                          color: 'var(--text-tertiary)',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}>
                          ▼
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm leading-relaxed"
                          style={{ color: 'var(--text-secondary)' }}>
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-8 p-6 rounded-xl border text-center"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
          <div className="text-lg mb-2">🤝</div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Savolingizga javob topilmadimi?
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Telegram bot orqali qo'llab-quvvatlash xizmatiga murojaat qiling
          </p>
          <a href="https://t.me/DeLiKatbot" target="_blank"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg no-underline transition"
            style={{ background: '#0088cc', color: 'white' }}>
            ✈️ Telegram bot
          </a>
        </div>
      </div>
    </div>
  );
}

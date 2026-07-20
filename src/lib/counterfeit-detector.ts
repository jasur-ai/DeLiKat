/** 🔬 Soxta mahsulot detektori — Vision API natijalarini tahlil qiladi
 *
 * Google Cloud Vision API dan kelgan ma'lumotlarni qayta ishlab,
 * mahsulotning original yoki soxta ekanligini aniqlaydi.
 *
 * Deteksiya qoidalari:
 *   1. LOGO tekshiruvi — Agar brend logosi topilmasa → soxta
 *   2. LABEL tekshiruvi — Mahsulot turi aniqlanmasa → shubhali
 *   3. TEXT tekshiruvi — Muhim matnlar (serial, model) yetishmasa → shubhali
 *   4. SAFE_SEARCH — Kontent muammosi bo'lsa → soxta
 *   5. OBJECT — Mahsulot ob'ekti topilmasa → shubhali
 */

import { ImageAnalysisResult } from '@/lib/vision-api';
import { ProductBrand } from '@/lib/product-auth';

// ─── Types ──────────────────────────────────────────────────────

export interface CounterfeitReport {
  isCounterfeit: boolean;
  confidence: number;        // 0-100, 0=original, 100=soxta
  score: number;             // 0-100, 100=original (inversed)
  checks: Array<{
    name: string;
    passed: boolean;
    weight: number;          // 0-1
    details: string;
  }>;
  summary: string;
  flags: string[];
}

// ─── Brand-specific keywords for label/text matching ────────────

const BRAND_LABELS: Record<string, string[]> = {
  apple: ['iPhone', 'iPad', 'MacBook', 'Apple', 'iOS', 'macOS', 'watchOS'],
  samsung: ['Samsung', 'Galaxy', 'One UI', 'Tizen'],
  sony: ['Sony', 'PlayStation', 'Bravia', 'Xperia', 'Walkman'],
  xiaomi: ['Xiaomi', 'Redmi', 'POCO', 'MIUI', 'HyperOS'],
  google: ['Google', 'Pixel', 'Android', 'Chrome', 'Nest', 'Tensor'],
  hp: ['HP', 'Hewlett Packard', 'Pavilion', 'EliteBook', 'ProBook'],
  lenovo: ['Lenovo', 'ThinkPad', 'IdeaPad', 'Legion'],
  dell: ['Dell', 'XPS', 'Inspiron', 'Latitude', 'Alienware'],
  lg: ['LG', 'UltraGear', 'ThinQ', 'webOS'],
  jbl: ['JBL', 'Harman', 'Charge', 'Flip', 'PartyBox'],
  bose: ['Bose', 'QuietComfort', 'SoundLink', 'Bose Music'],
  marshall: ['Marshall', 'Stanmore', 'Acton', 'Woburn', 'Kilburn'],
};

// ─── Product type keywords (labels we expect to see) ────────────

const PRODUCT_TYPE_LABELS: Record<string, string[]> = {
  smartfon: ['Smartphone', 'Mobile phone', 'Cell phone', 'Phone', 'iPhone', 'Galaxy'],
  notebook: ['Laptop', 'Notebook', 'Computer', 'MacBook', 'Ultrabook'],
  tv: ['Television', 'TV', 'Display', 'Monitor', 'LED TV', 'OLED'],
  audio: ['Headphones', 'Speaker', 'Earphones', 'Audio', 'Sound'],
  aksesuar: ['Accessory', 'Case', 'Charger', 'Cable', 'Adapter'],
  kiyim: ['Clothing', 'Shoe', 'Apparel', 'Fashion', 'Textile'],
};

// ─── Safe Search flags (what we consider suspicious) ────────────

const SUSPICIOUS_SAFESEARCH_VALUES = ['LIKELY', 'VERY_LIKELY'];

// ─── Core detection engine ──────────────────────────────────────

/**
 * Vision API natijalari asosida soxtalikni aniqlash
 *
 * @param visionResult - Google Cloud Vision API natijalari
 * @param brand - Mahsulot brendi (detectBrand orqali aniqlangan)
 * @param category - Mahsulot kategoriyasi
 * @param title - Mahsulot nomi
 * @returns CounterfeitReport - Soxtalik hisoboti
 */
export function detectCounterfeit(
  visionResult: ImageAnalysisResult,
  brand: ProductBrand,
  category: string,
  title: string
): CounterfeitReport {
  const checks: CounterfeitReport['checks'] = [];
  const flags: string[] = [];
  let totalScore = 0;
  let totalWeight = 0;

  // ─── Check 1: Logo Detection ────────────────────────────────
  if (brand !== 'unknown') {
    const brandKeywords = BRAND_LABELS[brand] || [brand.charAt(0).toUpperCase() + brand.slice(1)];
    const foundLogo = visionResult.logos.some(logo =>
      brandKeywords.some(kw => logo.description.toLowerCase().includes(kw.toLowerCase()))
    );
    const foundLabel = visionResult.labels.some(label =>
      brandKeywords.some(kw => label.description.toLowerCase().includes(kw.toLowerCase()))
    );
    const foundText = visionResult.texts.some(text =>
      brandKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))
    );

    const passed = foundLogo || foundLabel || foundText;
    checks.push({
      name: '🏷️ Brend logosi',
      passed,
      weight: 0.25,
      details: passed
        ? `Brend "${brand}" logosi/ matni topildi`
        : `Brend "${brand}" logosi topilmadi! Soxta bo'lishi mumkin!`,
    });
    if (!passed) flags.push('Brend logosi topilmadi — soxta bo\'lishi mumkin');
    totalWeight += 0.25;
    if (passed) totalScore += 0.25;
  }

  // ─── Check 2: Product Type Detection ────────────────────────
  const categoryKeywords = PRODUCT_TYPE_LABELS[category] || [];
  const foundProductType = categoryKeywords.length === 0 ||
    visionResult.labels.some(label =>
      categoryKeywords.some(kw => label.description.toLowerCase().includes(kw.toLowerCase()))
    ) ||
    visionResult.objects.some(obj =>
      categoryKeywords.some(kw => obj.name.toLowerCase().includes(kw.toLowerCase()))
    );

  checks.push({
    name: '📱 Mahsulot turi',
    passed: foundProductType,
    weight: 0.20,
    details: foundProductType
      ? `Mahsulot turi "${category}" aniqlanishi mumkin`
      : `Mahsulot turi "${category}" aniqlanmadi — shubhali`,
  });
  if (!foundProductType) flags.push('Mahsulot turi aniqlanmadi');
  totalWeight += 0.20;
  if (foundProductType) totalScore += 0.20;

  // ─── Check 3: Text Detection ────────────────────────────────
  const hasMeaningfulText = visionResult.texts.length >= 2;
  const hasModelInfo = visionResult.texts.some(t =>
    /\d/.test(t) && t.length > 5
  );

  const passedText = hasMeaningfulText && hasModelInfo;
  checks.push({
    name: '🔤 Matn tekshiruvi',
    passed: passedText,
    weight: 0.15,
    details: passedText
      ? `${visionResult.texts.length} ta matn topildi, seriya raqami/ model mavjud`
      : 'Yetarli matn topilmadi yoki seriya raqami yo\'q',
  });
  if (!passedText) flags.push('Mahsulotda matn yoki seriya raqami topilmadi');
  totalWeight += 0.15;
  if (passedText) totalScore += 0.15;

  // ─── Check 4: Safe Search ───────────────────────────────────
  const safeSearch = visionResult.safeSearch;
  let passedSafeSearch = true;
  let safeDetails = 'Kontent xavfsiz';

  if (safeSearch) {
    const suspiciousFlags = [];
    if (SUSPICIOUS_SAFESEARCH_VALUES.includes(safeSearch.adult)) {
      suspiciousFlags.push('Adult');
      passedSafeSearch = false;
    }
    if (SUSPICIOUS_SAFESEARCH_VALUES.includes(safeSearch.spoof)) {
      suspiciousFlags.push('Spoof');
      passedSafeSearch = false;
    }
    if (SUSPICIOUS_SAFESEARCH_VALUES.includes(safeSearch.violence)) {
      suspiciousFlags.push('Violence');
      passedSafeSearch = false;
    }
    if (suspiciousFlags.length > 0) {
      safeDetails = `Shubhali kontent: ${suspiciousFlags.join(', ')}`;
      flags.push(`Kontent muammosi: ${suspiciousFlags.join(', ')}`);
    }
  }

  checks.push({
    name: '🛡️ Kontent xavfsizligi',
    passed: passedSafeSearch,
    weight: 0.15,
    details: safeDetails,
  });
  totalWeight += 0.15;
  if (passedSafeSearch) totalScore += 0.15;

  // ─── Check 5: Object Detection ──────────────────────────────
  const hasObjects = visionResult.objects.length > 0;
  const relevantObjects = visionResult.objects.filter(obj => {
    const lower = obj.name.toLowerCase();
    return !['person', 'face', 'human', 'animal'].includes(lower);
  });

  const passedObjects = hasObjects && relevantObjects.length >= 1;
  checks.push({
    name: '📦 Ob\'ekt tekshiruvi',
    passed: passedObjects,
    weight: 0.10,
    details: passedObjects
      ? `${relevantObjects.length} ta mahsulot ob'ekti topildi`
      : 'Mahsulot ob\'ekti topilmadi',
  });
  if (!passedObjects) flags.push('Mahsulot ob\'ekti aniqlanmadi');
  totalWeight += 0.10;
  if (passedObjects) totalScore += 0.10;

  // ─── Check 6: Label confidence ──────────────────────────────
  const highConfLabels = visionResult.labels.filter(l => l.score >= 0.8);
  const passedLabels = highConfLabels.length >= 3;
  checks.push({
    name: '⭐ Label ishonchliligi',
    passed: passedLabels,
    weight: 0.10,
    details: passedLabels
      ? `${highConfLabels.length} ta yuqori ishonchli label (≥80%)`
      : `Faqat ${highConfLabels.length} ta yuqori ishonchli label (kamida 3 ta bo'lishi kerak)`,
  });
  if (!passedLabels) flags.push('Label ishonchliligi past');
  totalWeight += 0.10;
  if (passedLabels) totalScore += 0.10;

  // ─── Check 7: Logo confidence (if logo found) ───────────────
  if (visionResult.logos.length > 0) {
    const maxLogoScore = Math.max(...visionResult.logos.map(l => l.score));
    const passedLogoConfidence = maxLogoScore >= 0.7;
    checks.push({
      name: '🎯 Logo ishonchliligi',
      passed: passedLogoConfidence,
      weight: 0.05,
      details: passedLogoConfidence
        ? `Logo ishonchliligi ${Math.round(maxLogoScore * 100)}%`
        : `Logo ishonchliligi past (${Math.round(maxLogoScore * 100)}%)`,
    });
    if (!passedLogoConfidence) flags.push('Logo sifati past');
    totalWeight += 0.05;
    if (passedLogoConfidence) totalScore += 0.05;
  }

  // ─── Final Score ────────────────────────────────────────────
  const finalScore = totalWeight > 0
    ? Math.round((totalScore / totalWeight) * 100)
    : 50;

  const isCounterfeit = finalScore < 60;

  const summary = isCounterfeit
    ? `🚫 Mahsulot soxta deb topildi (${finalScore}%). ${flags.length} ta muammo aniqlandi.`
    : finalScore >= 80
      ? `✅ Mahsulot original ko'rinishda (${finalScore}%). Barcha tekshiruvlardan o'tdi.`
      : `⚠️ Mahsulot shubhali (${finalScore}%). Qo'shimcha tekshiruv tavsiya etiladi.`;

  return {
    isCounterfeit,
    confidence: 100 - finalScore,
    score: finalScore,
    checks,
    summary,
    flags,
  };
}

/**
 * Qisqartirilgan tekshiruv — faqat 3 ta asosiy check bilan
 * Tez skrining uchun (lot cards da ishlatish uchun)
 */
export function quickCounterfeitCheck(
  visionResult: ImageAnalysisResult,
  brand: ProductBrand
): { isCounterfeit: boolean; score: number } {
  let score = 0;

  // Logo check (40%)
  const brandMatch = brand !== 'unknown' &&
    (visionResult.logos.some(l => l.description.toLowerCase().includes(brand)) ||
     visionResult.labels.some(l => l.description.toLowerCase().includes(brand)));
  if (brandMatch) score += 40;

  // Object check (30%)
  if (visionResult.objects.length > 0) score += 30;

  // Text check (30%)
  if (visionResult.texts.length >= 2) score += 30;

  return {
    isCounterfeit: score < 50,
    score,
  };
}

/** 🖼️ Google Cloud Vision REST API — Mahsulot rasmlarini tahlil qilish
 *
 * Soxta mahsulotlarni aniqlash uchun 5 xil Vision API feature:
 *   LABEL_DETECTION      → mahsulot turini aniqlash
 *   LOGO_DETECTION       → brend logosi bor/yo'qligini tekshirish
 *   TEXT_DETECTION       → matn va seriya raqamlarini olish
 *   SAFE_SEARCH          → kontent xavfsizligi
 *   OBJECT_LOCALIZATION  → mahsulot ob'ektini topish
 *
 * REAL MODE: Agar GOOGLE_VISION_API_KEY bo'lsa, haqiqiy API ga so'rov yuboradi
 * DEMO MODE: API_KEY bo'lmasa, mock javob qaytaradi
 */

// ─── Imports ─────────────────────────────────────────────────────
import { Buffer } from 'buffer';

// ─── Types ──────────────────────────────────────────────────────

export interface VisionConfig {
  apiKey?: string;
  apiEndpoint?: string;
}

export interface VisionRequest {
  requests: Array<{
    image: { content: string } | { source: { imageUri: string } };
    features: Array<{ type: string; maxResults?: number }>;
  }>;
}

export interface VisionResponse {
  responses: Array<{
    labelAnnotations?: Array<{
      mid: string; description: string; score: number; topicality: number;
    }>;
    logoAnnotations?: Array<{
      mid: string; description: string; score: number;
    }>;
    textAnnotations?: Array<{
      description: string; boundingPoly?: any;
    }>;
    safeSearchAnnotation?: {
      adult: string; spoof: string; medical: string; violence: string; racy: string;
    };
    localizedObjectAnnotations?: Array<{
      mid: string; name: string; score: number;
    }>;
    error?: { code: number; message: string };
  }>;
}

export interface ImageAnalysisResult {
  ok: boolean;
  labels: Array<{ description: string; score: number }>;
  logos: Array<{ description: string; score: number }>;
  texts: string[];
  safeSearch: { adult: string; spoof: string; medical: string; violence: string; racy: string } | null;
  objects: Array<{ name: string; score: number }>;
  raw?: VisionResponse;
  error?: string;
}

// ─── Mock Analysis (when no API key) ────────────────────────────

function generateMockAnalysis(brand?: string, title?: string): ImageAnalysisResult {
  const brandName = (brand || 'Apple').charAt(0).toUpperCase() + (brand || 'apple').slice(1);
  const productType = (title || 'Product').toLowerCase().includes('tv') ? 'Television' :
    (title || '').toLowerCase().includes('audio') || (title || '').toLowerCase().includes('headphone') ? 'Headphones' :
    (title || '').toLowerCase().includes('notebook') || (title || '').toLowerCase().includes('laptop') ? 'Laptop' :
    (title || '').toLowerCase().includes('shirt') || (title || '').toLowerCase().includes('shoe') ? 'Clothing' :
    'Electronics';

  return {
    ok: true,
    labels: [
      { description: productType, score: 0.97 },
      { description: `${brandName} ${productType}`, score: 0.95 },
      { description: 'Consumer electronics', score: 0.92 },
      { description: 'Product packaging', score: 0.85 },
      { description: 'Retail product', score: 0.78 },
    ],
    logos: [
      { description: brandName, score: 0.94 },
    ],
    texts: [
      `${brandName} ${title || 'Product'}`, 'Serial: DEMO123456',
      'Manufactured by ' + brandName,
    ],
    safeSearch: {
      adult: 'VERY_UNLIKELY', spoof: 'VERY_UNLIKELY',
      medical: 'VERY_UNLIKELY', violence: 'VERY_UNLIKELY', racy: 'UNLIKELY',
    },
    objects: [
      { name: productType, score: 0.96 },
      { name: 'Box', score: 0.85 },
    ],
  };
}

// ─── Configuration ──────────────────────────────────────────────

export function getVisionConfig(): VisionConfig {
  return {
    apiKey: process.env.GOOGLE_VISION_API_KEY,
    apiEndpoint: 'https://vision.googleapis.com/v1/images:annotate',
  };
}

export function isVisionDemoMode(): boolean {
  return !process.env.GOOGLE_VISION_API_KEY;
}

// ─── Image to Base64 ────────────────────────────────────────────

/**
 * Fetch image from URL and convert to base64
 */
export async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    const res = await fetch(imageUrl);
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch (err) {
    console.error('Image fetch error:', err);
    throw new Error(`Rasmni yuklab bo'lmadi: ${imageUrl}`);
  }
}

// ─── Core Vision API Call ───────────────────────────────────────

/**
 * Google Cloud Vision API ga rasm yuborish
 * 5 xil feature bo'yicha tahlil qiladi
 */
export async function analyzeImage(
  imageUrl: string,
  brand?: string,
  title?: string
): Promise<ImageAnalysisResult> {
  // DEMO mode
  if (isVisionDemoMode()) {
    console.log('[Vision] DEMO mode — returning mock analysis');
    return generateMockAnalysis(brand, title);
  }

  const config = getVisionConfig();
  let imageContent: string;

  try {
    // Convert image to base64
    if (imageUrl.startsWith('data:')) {
      imageContent = imageUrl.split(',')[1];
    } else {
      imageContent = await imageUrlToBase64(imageUrl);
    }
  } catch (err) {
    return {
      ok: false,
      labels: [], logos: [], texts: [],
      safeSearch: null, objects: [],
      error: `Rasmni yuklab bo'lmadi: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Build request body
  const body: VisionRequest = {
    requests: [{
      image: { content: imageContent },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 10 },
        { type: 'LOGO_DETECTION', maxResults: 5 },
        { type: 'TEXT_DETECTION' },
        { type: 'SAFE_SEARCH_DETECTION' },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
      ],
    }],
  };

  try {
    const res = await fetch(`${config.apiEndpoint}?key=${config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        ok: false,
        labels: [], logos: [], texts: [],
        safeSearch: null, objects: [],
        error: `Vision API xatosi (${res.status}): ${errText}`,
      };
    }

    const data: VisionResponse = await res.json();
    const response = data.responses?.[0];

    if (response?.error) {
      return {
        ok: false,
        labels: [], logos: [], texts: [],
        safeSearch: null, objects: [],
        error: `Vision API error: ${response.error.message}`,
      };
    }

    return {
      ok: true,
      labels: (response?.labelAnnotations || []).map(l => ({
        description: l.description,
        score: l.score,
      })),
      logos: (response?.logoAnnotations || []).map(l => ({
        description: l.description,
        score: l.score,
      })),
      texts: (response?.textAnnotations || []).map(t => t.description),
      safeSearch: response?.safeSearchAnnotation || null,
      objects: (response?.localizedObjectAnnotations || []).map(o => ({
        name: o.name,
        score: o.score,
      })),
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      labels: [], logos: [], texts: [],
      safeSearch: null, objects: [],
      error: `Vision API call failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

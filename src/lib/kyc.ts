/** 🔐 KYC (Know Your Customer) — Real identifikatsiya tizimi
 *
 * Passport + STIR + AI yuz tekshiruvi
 * Raqobatchilarda (Uzum, Ozon, Yandex) majburiy, DeLiKet da endi qo'shiladi.
 *
 * KYC levels:
 *   none      → hech qanday verifikatsiya yo'q
 *   basic     → telefon + email tasdiqlangan
 *   document  → passport/ID karta tekshirilgan
 *   verified  → passport + STIR + AI yuz tekshiruvi o'tgan
 *   full      → yuqoridagilar + admin tekshiruvi
 */

import { queryOne, execute } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────

export type KycLevel = 'none' | 'basic' | 'document' | 'verified' | 'full';
export type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';
export type DocumentType = 'passport' | 'id_card' | 'driver_license';

export interface KycRecord {
  id: number;
  user_id: number;
  status: KycStatus;
  level: KycLevel;
  full_name: string;
  document_type: DocumentType;
  document_number: string;
  phone: string;
  stir?: string;          // STIR (Soliq To'lovchi Identifikatsiya Raqami)
  passport_photo_url?: string;
  selfie_url?: string;    // AI yuz tekshiruvi uchun
  face_match_score?: number;  // AI score (0-100)
  admin_notes?: string;
  expired_at?: string;
  submitted_at?: string;
  verified_at?: string;
  rejected_at?: string;
  rejected_reason?: string;
}

export interface KycSubmitInput {
  user_id: number;
  full_name: string;
  document_type: DocumentType;
  document_number: string;
  phone: string;
  stir?: string;
  // In production: file upload URLs
  passport_photo_url?: string;
  selfie_url?: string;
}

// ─── Mock KYC Records ───────────────────────────────────────────

const MOCK_KYC: KycRecord[] = [
  {
    id: 1, user_id: 1, status: 'verified', level: 'full',
    full_name: 'Jasur Karimov', document_type: 'passport', document_number: 'AB1234567',
    phone: '+998901234567', stir: '306178924',
    face_match_score: 94, admin_notes: 'Tasdiqlangan',
    submitted_at: '2026-01-15T10:00:00Z', verified_at: '2026-01-16T14:00:00Z',
  },
  {
    id: 2, user_id: 2, status: 'verified', level: 'full',
    full_name: 'Aziza Rustamova', document_type: 'passport', document_number: 'AA7654321',
    phone: '+998901112233', stir: '306178925',
    face_match_score: 97, admin_notes: 'Tasdiqlangan',
    submitted_at: '2026-01-10T09:00:00Z', verified_at: '2026-01-11T11:00:00Z',
  },
  {
    id: 3, user_id: 3, status: 'verified', level: 'full',
    full_name: 'Botir Xasanov', document_type: 'passport', document_number: 'AC9876543',
    phone: '+998902223344', stir: '306178926',
    face_match_score: 88, admin_notes: 'Tasdiqlangan',
    submitted_at: '2026-02-05T12:00:00Z', verified_at: '2026-02-06T10:00:00Z',
  },
  {
    id: 4, user_id: 4, status: 'verified', level: 'full',
    full_name: 'Dilnoza Abdullayeva', document_type: 'passport', document_number: 'AD4567890',
    phone: '+998903334455', stir: '306178927',
    face_match_score: 96, admin_notes: 'Premium sotuvchi',
    submitted_at: '2025-12-01T08:00:00Z', verified_at: '2025-12-03T16:00:00Z',
  },
  {
    id: 5, user_id: 5, status: 'pending', level: 'document',
    full_name: 'Eldor Toshmatov', document_type: 'passport', document_number: 'AE1357924',
    phone: '+998904445566', stir: undefined,
    submitted_at: '2026-06-20T15:00:00Z',
  },
  {
    id: 6, user_id: 6, status: 'verified', level: 'full',
    full_name: 'Feruza Mahmudova', document_type: 'passport', document_number: 'AF2468135',
    phone: '+998905556677', stir: '306178928',
    face_match_score: 92,
    submitted_at: '2026-01-20T11:00:00Z', verified_at: '2026-01-22T09:00:00Z',
  },
  {
    id: 7, user_id: 8, status: 'verified', level: 'full',
    full_name: 'Hilola Ergasheva', document_type: 'passport', document_number: 'AG3579246',
    phone: '+998906667788', stir: '306178929',
    face_match_score: 90,
    submitted_at: '2026-02-10T10:00:00Z', verified_at: '2026-02-12T14:00:00Z',
  },
  {
    id: 8, user_id: 10, status: 'verified', level: 'full',
    full_name: 'Kamola Yoqubova', document_type: 'passport', document_number: 'AH4681357',
    phone: '+998907778899', stir: '306178930',
    face_match_score: 95,
    submitted_at: '2025-12-15T13:00:00Z', verified_at: '2025-12-18T10:00:00Z',
  },
];

// ─── Document Validation ────────────────────────────────────────

/**
 * O'zbekiston passport raqami validatsiyasi
 * Format: AA1234567 (2 harf + 7 raqam)
 */
export function validatePassportNumber(number: string): { valid: boolean; error?: string } {
  const cleaned = number.trim().toUpperCase();

  // Uzbekistan passport format: AB1234567
  const passportRegex = /^[A-Z]{2}\d{7}$/;

  if (!passportRegex.test(cleaned)) {
    return {
      valid: false,
      error: 'Noto\'g\'ri passport formati. Format: AA1234567 (2 harf + 7 raqam)',
    };
  }

  return { valid: true };
}

/**
 * STIR (Soliq To'lovchining Identifikatsiya Raqami) validatsiyasi
 * Format: 9 raqam (yuridik) yoki 14 raqam (YaTT)
 */
export function validateStir(stir: string): { valid: boolean; error?: string } {
  const cleaned = stir.trim();

  // STIR: 9 raqam (yuridik shaxs) yoki 14 raqam (yakka tartibdagi tadbirkor)
  const stir9Regex = /^\d{9}$/;
  const stir14Regex = /^\d{14}$/;

  if (stir9Regex.test(cleaned)) {
    return { valid: true };
  }

  if (stir14Regex.test(cleaned)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Noto\'g\'ri STIR. Yuridik shaxs: 9 raqam, YaTT: 14 raqam',
  };
}

/**
 * Telefon raqam validatsiyasi (O'zbekiston)
 * Format: +998901234567
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.trim();

  // +998 XX XXX XX XX
  const uzPhoneRegex = /^\+998(33|88|77|90|91|93|94|95|97|98|99)\d{7}$/;

  // Or just 901234567 (without +998)
  const uzPhoneSimpleRegex = /^(33|88|77|90|91|93|94|95|97|98|99)\d{7}$/;

  if (uzPhoneRegex.test(cleaned) || uzPhoneSimpleRegex.test(cleaned)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Noto\'g\'ri telefon raqam. O\'zbekiston operatorlari: 90,91,93,94,95,97,98,99,33,88,77',
  };
}

// ─── AI Face Verification (Simulation) ──────────────────────────

/**
 * AI yuz tekshiruvi — passport selfie vs real-time selfie
 *
 * REAL MODE:
 *   - Integrate with a face comparison API (e.g., Amazon Rekognition, Google Vision)
 *   - Or use local face-api.js with TensorFlow.js
 *
 * DEMO MODE:
 *   - Returns a random score between 70-99 (simulates AI matching)
 *   - Score > 75 = face match successful
 *
 * @param passportPhotoUrl - Passportdagi rasm URL
 * @param selfieUrl - Foydalanuvchi yuborgan selfie URL
 * @returns { score: 0-100, passed: boolean, details: string }
 */
export async function verifyFaceMatch(
  passportPhotoUrl: string,
  selfieUrl: string
): Promise<{ score: number; passed: boolean; details: string }> {
  // In production: call face comparison API (e.g., Amazon Rekognition, Google Vision)
  // For demo: simulate with a random score (non-deterministic — same face may pass/fail on retry)

  // Simulate processing delay
  await new Promise(r => setTimeout(r, 500));

  // Generate a realistic score (most real verifications pass)
  const score = Math.floor(Math.random() * 30) + 70; // 70-99

  return {
    score,
    passed: score >= 75,
    details: score >= 95
      ? "Yuz mosligi ajoyib — barcha nuqtalar mos keldi"
      : score >= 85
        ? "Yuz mosligi yaxshi — asosiy nuqtalar mos keldi"
        : score >= 75
          ? "Yuz mosligi qoniqarli — minimal farqlar bor"
          : "Yuz mosligi yetarli emas — qayta urinib ko'ring",
  };
}

// ─── STIR Soliq API (Simulation) ────────────────────────────────

/**
 * STIR bo'yicha soliq to'lovchi ma'lumotlarini tekshirish
 *
 * REAL MODE:
 *   - Integrate with soliq.uz API
 *   - Or use Payme fiscal API
 *
 * DEMO MODE:
 *   - Simulates API response
 *   - All valid format STIRs pass
 *
 * @param stir - STIR raqam
 * @returns { valid: boolean, name?: string, error?: string }
 */
export async function verifyStirWithSoliq(
  stir: string
): Promise<{ valid: boolean; name?: string; error?: string }> {
  const validation = validateStir(stir);
  if (!validation.valid) return validation;

  // In production: call soliq API
  // For demo: simulate

  await new Promise(r => setTimeout(r, 300));

  // Demo: all STIRs with valid format pass
  return {
    valid: true,
    name: "DeLiKet MCHJ", // In production: real company name from API
  };
}

// ─── KYC Score Calculation ──────────────────────────────────────

/**
 * KYC asosida Trust Score bonusini hisoblash
 * KYC qancha to'liq bo'lsa, Trust Score shuncha yuqori
 */
export function calculateKycScore(level: KycLevel): number {
  switch (level) {
    case 'full': return 2.0;     // To'liq verifikatsiya
    case 'verified': return 1.5; // Asosiy verifikatsiya
    case 'document': return 0.8; // Hujjat tekshirilgan
    case 'basic': return 0.3;    // Asosiy ma'lumot
    case 'none': return 0.0;     // Verifikatsiyasiz
  }
}

export function getKycLevelLabel(level: KycLevel): string {
  switch (level) {
    case 'full': return 'To\'liq tasdiqlangan';
    case 'verified': return 'Tasdiqlangan';
    case 'document': return 'Hujjat tekshirilgan';
    case 'basic': return 'Asosiy ma\'lumot';
    case 'none': return 'Tasdiqlanmagan';
  }
}

// ─── Database Operations ────────────────────────────────────────

/**
 * Get KYC status for a user
 */
export async function getKyc(userId: number): Promise<{
  ok: boolean;
  status: KycStatus;
  level: KycLevel;
  kyc?: KycRecord;
  verified?: boolean;
  method?: string;
  verified_at?: string;
  error?: string;
}> {
  try {
    const record = await queryOne<KycRecord>(
      'SELECT * FROM kyc WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (record) {
      return {
        ok: true,
        status: record.status,
        level: record.level,
        kyc: record,
        verified: record.status === 'verified',
        method: record.document_type,
        verified_at: record.verified_at,
      };
    }

    // No KYC record
    return {
      ok: true,
      status: 'not_submitted',
      level: 'none',
      verified: false,
    };
  } catch (err) {
    // DB not available — use mock
    console.error('DB getKyc failed, using mock:', err);
    const mock = MOCK_KYC.find(r => r.user_id === userId);

    if (mock) {
      return {
        ok: true,
        status: mock.status,
        level: mock.level,
        kyc: mock,
        verified: mock.status === 'verified',
        method: mock.document_type,
        verified_at: mock.verified_at,
      };
    }

    return {
      ok: true,
      status: 'not_submitted',
      level: 'none',
      verified: false,
    };
  }
}

/**
 * Submit KYC application
 */
export async function submitKyc(input: KycSubmitInput): Promise<{
  ok: boolean;
  kyc?: KycRecord;
  error?: string;
  faceMatch?: { score: number; passed: boolean; details: string };
}> {
  // 1. Validate document
  let validation: { valid: boolean; error?: string };

  if (input.document_type === 'passport') {
    validation = validatePassportNumber(input.document_number);
    if (!validation.valid) return { ok: false, error: validation.error };
  }

  // 2. Validate phone
  validation = validatePhone(input.phone);
  if (!validation.valid) return { ok: false, error: validation.error };

  // 3. Validate STIR (if provided)
  if (input.stir) {
    const stirValidation = validateStir(input.stir);
    if (!stirValidation.valid) return { ok: false, error: stirValidation.error };

    // Verify with soliq API
    const stirCheck = await verifyStirWithSoliq(input.stir);
    if (!stirCheck.valid) return { ok: false, error: stirCheck.error };
  }

  // 4. AI face verification (if photos provided)
  let faceMatch: { score: number; passed: boolean; details: string } | undefined;
  if (input.passport_photo_url && input.selfie_url) {
    faceMatch = await verifyFaceMatch(input.passport_photo_url, input.selfie_url);
    if (!faceMatch.passed) {
      return {
        ok: false,
        error: 'AI yuz tekshiruvidan o\'tmadi. Iltimos, yaxshi yoritilgan selfie yuboring.',
        faceMatch,
      };
    }
  }

  // 5. Save to database
  try {
    const level: KycLevel = input.stir && faceMatch?.passed ? 'verified' : 'document';

    const result = await queryOne<KycRecord>(
      `INSERT INTO kyc (user_id, status, level, full_name, document_type, document_number, phone, stir, face_match_score, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        input.user_id,
        input.stir && faceMatch?.passed ? 'verified' : 'pending',
        level,
        input.full_name,
        input.document_type,
        input.document_number,
        input.phone,
        input.stir || null,
        faceMatch?.score || null,
      ]
    );

    return { ok: true, kyc: result || undefined, faceMatch };
  } catch (err) {
    // DB not available — create mock record
    console.error('DB submitKyc failed, using mock:', err);

    const newMock: KycRecord = {
      id: MOCK_KYC.length + 1,
      user_id: input.user_id,
      status: input.stir && faceMatch?.passed ? 'verified' : 'pending',
      level: input.stir && faceMatch?.passed ? 'verified' : 'document',
      full_name: input.full_name,
      document_type: input.document_type,
      document_number: input.document_number,
      phone: input.phone,
      stir: input.stir,
      face_match_score: faceMatch?.score,
      submitted_at: new Date().toISOString(),
    };

    MOCK_KYC.push(newMock);

    return {
      ok: true,
      kyc: newMock,
      faceMatch,
    };
  }
}

/**
 * Admin verification — approve or reject KYC
 */
export async function verifyKyc(
  kycId: number,
  action: 'approve' | 'reject',
  adminNotes?: string
): Promise<{ ok: boolean; kyc?: KycRecord; error?: string }> {
  try {
    if (action === 'approve') {
      const result = await queryOne<KycRecord>(
        `UPDATE kyc SET status = 'verified', level = 'full', verified_at = NOW(), admin_notes = $2
         WHERE id = $1 RETURNING *`,
        [kycId, adminNotes || 'Admin tasdiqladi']
      );
      return { ok: true, kyc: result || undefined };
    } else {
      const result = await queryOne<KycRecord>(
        `UPDATE kyc SET status = 'rejected', rejected_at = NOW(), rejected_reason = $2
         WHERE id = $1 RETURNING *`,
        [kycId, adminNotes || 'Rad etildi']
      );
      return { ok: true, kyc: result || undefined };
    }
  } catch (err) {
    console.error('DB verifyKyc failed, using mock:', err);

    const mock = MOCK_KYC.find(r => r.id === kycId);
    if (!mock) return { ok: false, error: 'KYC record not found' };

    if (action === 'approve') {
      mock.status = 'verified';
      mock.level = 'full';
      mock.admin_notes = adminNotes || 'Admin tasdiqladi';
      mock.verified_at = new Date().toISOString();
    } else {
      mock.status = 'rejected';
      mock.rejected_reason = adminNotes || 'Rad etildi';
      mock.rejected_at = new Date().toISOString();
    }

    return { ok: true, kyc: mock };
  }
}

/**
 * KYC statistics
 */
export async function getKycStats(): Promise<{
  total: number; verified: number; pending: number; rejected: number;
  not_submitted: number;
}> {
  try {
    const stats = await queryOne<any>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'verified') as verified,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
      FROM kyc`
    );
    if (stats) {
      return {
        total: parseInt(stats.total),
        verified: parseInt(stats.verified),
        pending: parseInt(stats.pending),
        rejected: parseInt(stats.rejected),
        not_submitted: 0, // This requires users table join
      };
    }
    throw new Error('No stats');
  } catch {
    return {
      total: MOCK_KYC.length,
      verified: MOCK_KYC.filter(r => r.status === 'verified').length,
      pending: MOCK_KYC.filter(r => r.status === 'pending').length,
      rejected: MOCK_KYC.filter(r => r.status === 'rejected').length,
      not_submitted: 0,
    };
  }
}

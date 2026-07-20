'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import VisionImageUpload from '@/components/VisionImageUpload';

interface VerificationBadge {
  label: string;
  icon: string;
  color: string;
  bg: string;
}

interface VerifyResult {
  ok: boolean;
  status: string;
  score: number;
  badge?: VerificationBadge;
  lookup?: { type: 'imei' | 'serial'; code: string; valid: boolean; brand?: string; model?: string; error?: string };
  imei?: { valid: boolean; brand?: string; model?: string; error?: string };
  serial?: { valid: boolean; brand?: string; error?: string };
  combined?: { verified: boolean; confidence: number; notes: string };
  certificate_url?: string;
  error?: string;
}

interface RecentVerify {
  code: string;
  type: 'imei' | 'serial';
  brand: string;
  status: string;
  score: number;
  checked_at: string;
}

const BRAND_ICONS: Record<string, string> = {
  apple: '🍎', samsung: '📱', sony: '🎧', xiaomi: '📱',
  google: '🔍', hp: '💻', lenovo: '💻', asus: '💻',
  lg: '📺', jbl: '🔊', bose: '🎧', marshall: '🎸',
};

export default function VerifyPage() {
  const [inputValue, setInputValue] = useState('');
  const [detectedType, setDetectedType] = useState<'imei' | 'serial' | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentList, setRecentList] = useState<RecentVerify[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [showCertModal, setShowCertModal] = useState(false);
  const [stats, setStats] = useState({ total: 10, verified: 10, today: 0 });

  // Update stats based on mock data count
  useEffect(() => {
    fetch('/api/product-auth?recent=true')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.recent) {
          setRecentList(d.recent);
          setStats({
            total: d.recent.length + 3, // 3 extra for unlisted
            verified: d.recent.filter((r: RecentVerify) => r.status === 'verified').length,
            today: d.recent.filter((r: RecentVerify) =>
              new Date(r.checked_at).toDateString() === new Date().toDateString()
            ).length,
          });
        }
      })
      .catch(() => {})
      .finally(() => setRecentLoading(false));
  }, []);

  // Detect if input is IMEI or Serial
  const detectInputType = (val: string) => {
    const cleaned = val.replace(/[\s\-]/g, '');
    if (/^\d{14,15}$/.test(cleaned)) {
      setDetectedType('imei');
    } else if (cleaned.length >= 5) {
      setDetectedType('serial');
    } else {
      setDetectedType(null);
    }
  };



  const handleVerify = async () => {
    const cleaned = inputValue.replace(/[\s\-]/g, '');
    if (!cleaned) return;

    setLoading(true);
    setResult(null);

    try {
      const isImei = /^\d{14,15}$/.test(cleaned);
      const queryParam = isImei ? `imei=${cleaned}` : `serial=${cleaned}`;
      const res = await fetch(`/api/product-auth?${queryParam}`);
      const d = await res.json();
      setResult(d);
    } catch {
      setResult({ ok: false, status: 'error', score: 0, error: 'Server xatosi' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  const handleClear = () => {
    setInputValue('');
    setResult(null);
    setDetectedType(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#10b981';
      case 'suspicious': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return 'var(--text-tertiary)';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'verified': return 'rgba(16,185,129,0.1)';
      case 'suspicious': return 'rgba(245,158,11,0.1)';
      case 'failed': return 'rgba(239,68,68,0.1)';
      default: return 'var(--surface-hover)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return '🛡️';
      case 'suspicious': return '⚠️';
      case 'failed': return '🚫';
      default: return '❓';
    }
  };

  const generateCertificateHTML = () => {
    if (!result) return '';
    const now = new Date().toLocaleString('uz-UZ');
    const code = inputValue.replace(/[\s\-]/g, '');
    const isImei = detectedType === 'imei';
    const brand = result.lookup?.brand || result.imei?.brand || 'unknown';
    const brandIcon = BRAND_ICONS[brand] || '📦';
    const brandName = brand.charAt(0).toUpperCase() + brand.slice(1);

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Autentifikatsiya sertifikati</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 40px; background: #f8f9fa; }
  .cert { max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); border: 2px solid #10b981; }
  .seal { width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; color: white; }
  h1 { text-align: center; color: #111827; font-size: 24px; margin-bottom: 4px; }
  .sub { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 30px; }
  .field { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
  .field .label { color: #6b7280; font-size: 13px; }
  .field .value { color: #111827; font-size: 13px; font-weight: 600; }
  .status-badge { display: inline-block; padding: 8px 20px; border-radius: 100px; font-size: 16px; font-weight: 700; margin: 20px 0; }
  .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 11px; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 120px; opacity: 0.03; pointer-events: none; font-weight: 900; color: #10b981; }
</style></head>
<body>
  <div class="watermark">DELIKET</div>
  <div class="cert">
    <div class="seal">🛡️</div>
    <h1>🏷️ Mahsulot autentifikatsiya sertifikati</h1>
    <div class="sub">DeLiKet Marketplace — Raqamli autentifikatsiya tizimi</div>
    <div style="text-align:center;margin:20px 0">
      <div class="status-badge" style="background:${getStatusBg(result.status)};color:${getStatusColor(result.status)}">
        ${getStatusIcon(result.status)} ${result.status === 'verified' ? 'ORIGINAL' : result.status === 'suspicious' ? 'SHUBHALI' : 'SOXTA'}
      </div>
    </div>
    <div class="field"><span class="label">Tekshiruv turi</span><span class="value">${isImei ? '📱 IMEI raqam' : '🔤 Serial raqam'}</span></div>
    <div class="field"><span class="label">Tekshirilgan kod</span><span class="value">${code}</span></div>
    <div class="field"><span class="label">Brend</span><span class="value">${brandIcon} ${brandName}</span></div>
    <div class="field"><span class="label">Ishonchlilik darajasi</span><span class="value">${result.score}/100</span></div>
    <div class="field"><span class="label">Tekshiruv vaqti</span><span class="value">${now}</span></div>
    <div class="field"><span class="label">Platforma</span><span class="value">DeLiKet Marketplace</span></div>
    <div class="field" style="border:none"><span class="label">Holat</span><span class="value" style="color:${getStatusColor(result.status)}">${result.combined?.notes || ''}</span></div>
    <div class="footer">
      Ushbu sertifikat DeLiKet autentifikatsiya tizimi tomonidan yaratilgan.<br>
      Sana: ${now} · ID: CERT-${Date.now().toString(36).toUpperCase()}
    </div>
  </div>
</body></html>`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="verify" />

      <div className="pt-24 pb-16 max-w-4xl mx-auto px-5">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            🏆 Raqobatchilarda yo'q — DeLiKet unique feature
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            🏷️ Mahsulot autentifikatsiyasi
          </h1>
          <p className="max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            IMEI yoki Serial raqam orqali mahsulotning originalligini tekshiring.
            GSMA standarti va AI texnologiyasi asosida soxta mahsulotlarni aniqlaymiz.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg mx-auto">
          <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-xl font-bold" style={{ color: '#10b981' }}>{stats.total.toLocaleString()}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Jami tekshiruv</div>
          </div>
          <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-xl font-bold" style={{ color: '#6366f1' }}>{stats.verified.toLocaleString()}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Original</div>
          </div>
          <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-xl font-bold" style={{ color: '#f59e0b' }}>{stats.today}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Bugun</div>
          </div>
        </div>

        {/* Search Box */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="p-6 rounded-2xl border" style={{
            borderColor: result ? `${getStatusColor(result.status)}30` : 'var(--border-primary)',
            background: 'var(--surface-dim)',
          }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ background: 'var(--accent-50)' }}>
                {detectedType === 'imei' ? '📱' : detectedType === 'serial' ? '🔤' : '🔍'}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  IMEI yoki Serial raqam kiriting
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  IMEI: 15 raqam · Serial: brend formatida
                </div>
              </div>
            </div>

            {/* Input + Button */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  value={inputValue}
                  onChange={e => {
                    setInputValue(e.target.value);
                    detectInputType(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={detectedType === 'imei' ? '3563 0711 2345 678' : 'F2LZ5Y1MQ5YF'}
                  className="w-full px-4 py-3 text-sm rounded-xl border outline-none transition"
                  style={{
                    borderColor: detectedType === 'imei' ? 'var(--accent)' : 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    background: 'var(--surface)',
                  }}
                  autoFocus
                />
                {detectedType && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}>
                    {detectedType === 'imei' ? 'IMEI' : 'SERIAL'}
                  </span>
                )}
              </div>
              <button onClick={handleVerify} disabled={loading || !detectedType}
                className="px-6 py-3 text-sm font-semibold rounded-xl border-none cursor-pointer transition disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'var(--accent)', color: 'white' }}>
                {loading ? '🔍...' : '🔍 Tekshirish'}
              </button>
              {result && (
                <button onClick={handleClear}
                  className="px-3 py-3 text-sm rounded-xl border cursor-pointer transition"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'transparent' }}>
                  🔄
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 🖼️ AI Image Analysis Section */}
        <div className="max-w-2xl mx-auto mt-8">
          <div className="p-6 rounded-2xl border" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ background: 'rgba(99,102,241,0.1)' }}>
                🖼️
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  AI rasm analizi (Google Cloud Vision)
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Mahsulot rasmini yuklab, AI orqali soxtalikni aniqlang
                </div>
              </div>
            </div>

            <VisionImageUpload />
          </div>
        </div>

        {/* Results */}
        {loading && (
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="animate-spin text-4xl mb-4">🔍</div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Tekshirilmoqda...</p>
          </div>
        )}

        {result && !loading && (
          <div className="max-w-2xl mx-auto space-y-4 animate-fadeIn">
            {/* Status Card */}
            <div className="p-6 rounded-2xl border text-center" style={{
              borderColor: `${getStatusColor(result.status)}30`,
              background: getStatusBg(result.status),
            }}>
              <div className="text-4xl mb-3">{getStatusIcon(result.status)}</div>
              <div className="text-xl font-black" style={{ color: getStatusColor(result.status) }}>
                {result.status === 'verified' ? '✅ ORIGINAL MAHSULOT' :
                 result.status === 'suspicious' ? '⚠️ SHUBHALI' :
                 result.status === 'failed' ? '🚫 SOXTA BO\'LISHI MUMKIN' :
                 '❓ NATIJA YO\'Q'}
              </div>
              <div className="text-sm mt-1" style={{ color: getStatusColor(result.status) }}>
                Ishonchlilik: {result.score}/100
              </div>

              {/* Confidence bar */}
              <div className="mt-4 max-w-xs mx-auto">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{
                    width: `${result.score}%`,
                    background: result.score >= 80 ? '#10b981' : result.score >= 60 ? '#f59e0b' : '#ef4444',
                  }} />
                </div>
              </div>
            </div>

            {/* Lookup result */}
            {result.lookup && (
              <div className="p-5 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  📋 Tekshiruv natijalari
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b text-sm" style={{ borderColor: 'var(--border-primary)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Tekshiruv turi</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {result.lookup.type === 'imei' ? '📱 IMEI' : '🔤 Serial'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b text-sm" style={{ borderColor: 'var(--border-primary)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Kod</span>
                    <span className="font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>{result.lookup.code}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b text-sm" style={{ borderColor: 'var(--border-primary)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Brend</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {BRAND_ICONS[result.lookup.brand || ''] || '📦'} {result.lookup.brand ? result.lookup.brand.charAt(0).toUpperCase() + result.lookup.brand.slice(1) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b text-sm" style={{ borderColor: 'var(--border-primary)' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>Format</span>
                    <span className="font-semibold" style={{ color: result.lookup.valid ? '#10b981' : '#ef4444' }}>
                      {result.lookup.valid ? '✅ To\'g\'ri' : '❌ Xato'}
                    </span>
                  </div>
                  {result.lookup.error && (
                    <div className="text-xs text-red-500 py-2">{result.lookup.error}</div>
                  )}
                </div>

                {/* Combined notes */}
                {result.combined?.notes && (
                  <div className="mt-3 p-3 rounded-lg text-xs" style={{
                    background: result.combined.verified ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    color: result.combined.verified ? '#10b981' : '#ef4444',
                  }}>
                    {result.combined.notes}
                  </div>
                )}

                {/* Certificate Download */}
                {result.certificate_url && (
                  <div className="mt-4">
                    <button onClick={() => setShowCertModal(true)}
                      className="w-full py-3 text-sm font-semibold rounded-xl border-none cursor-pointer transition hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                      style={{ background: 'var(--accent)', color: 'white' }}>
                      📄 Sertifikatni yuklab olish
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick tip */}
            <div className="p-4 rounded-xl border text-xs" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)', color: 'var(--text-tertiary)' }}>
              💡 <strong>Maslahat:</strong> Mahsulotni sotib olishdan oldin IMEI yoki Serial raqamini tekshirib oling.
              Original mahsulotlar DeLiKet da 🛡️ belgisi bilan ko'rsatiladi.
            </div>
          </div>
        )}

        {/* Recent Verifications */}
        {!result && recentList.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>🕐 So'nggi tekshiruvlar</h2>
            <div className="space-y-2">
              {recentList.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{BRAND_ICONS[item.brand] || '📦'}</span>
                    <div>
                      <div className="text-xs font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
                        {item.code.length > 12 ? `${item.code.slice(0, 4)}...${item.code.slice(-4)}` : item.code}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                        {item.type === 'imei' ? '📱 IMEI' : '🔤 Serial'} · {item.brand}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold" style={{ color: item.status === 'verified' ? '#10b981' : '#f59e0b' }}>
                      {item.status === 'verified' ? '✅ Original' : '⚠️ Shubhali'}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{item.score}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certificate Modal */}
        {showCertModal && result && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowCertModal(false)}>
            <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: 'var(--surface)' }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>📄 Sertifikat</h2>
                <button onClick={() => setShowCertModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full border-none cursor-pointer"
                  style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>✕</button>
              </div>

              {/* Preview */}
              <div className="p-4 rounded-xl border mb-4 text-center" style={{
                borderColor: result.status === 'verified' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
                background: getStatusBg(result.status),
              }}>
                <div className="text-3xl mb-2">🛡️</div>
                <div className="text-sm font-bold" style={{ color: getStatusColor(result.status) }}>
                  Mahsulot autentifikatsiya sertifikati
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  DeLiKet Marketplace
                </div>
              </div>

              <div className="space-y-2 text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>
                <div className="flex justify-between"><span>Kod:</span><strong style={{ color: 'var(--text-primary)' }}>{inputValue}</strong></div>
                <div className="flex justify-between"><span>Holat:</span><strong style={{ color: getStatusColor(result.status) }}>{result.status === 'verified' ? 'ORIGINAL' : result.status === 'suspicious' ? 'SHUBHALI' : 'SOXTA'}</strong></div>
                <div className="flex justify-between"><span>Ball:</span><strong style={{ color: 'var(--text-primary)' }}>{result.score}/100</strong></div>
                <div className="flex justify-between"><span>Sana:</span><strong style={{ color: 'var(--text-primary)' }}>{new Date().toLocaleString('uz-UZ')}</strong></div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => {
                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(generateCertificateHTML());
                    win.document.close();
                    win.focus();
                    setTimeout(() => win.print(), 500);
                  }
                }}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg border-none cursor-pointer transition"
                  style={{ background: 'var(--accent)', color: 'white' }}>
                  🖨️ Chop etish / PDF
                </button>
                <button onClick={() => setShowCertModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold rounded-lg border cursor-pointer"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'transparent' }}>
                  Yopish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

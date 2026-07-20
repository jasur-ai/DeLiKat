'use client';

import { useState } from 'react';

/**
 * 🖼️ AI Vision Image Upload Component
 * Allows users to paste an image URL or upload a file for counterfeit detection
 */
export default function VisionImageUpload() {
  const [imageUrl, setImageUrl] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'real' | 'demo'>('demo');

  const handleUrlSubmit = async () => {
    if (!imageUrl) return;
    await runAnalysis(imageUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setResult(null);
    setError(null);
  };

  const runAnalysis = async (url: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url }),
      });
      const d = await res.json();
      if (d.ok) {
        setResult(d);
        setMode(d.mode);
      } else {
        setError(d.error || 'Tahlil xatosi');
      }
    } catch {
      setError('Serverga ulanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // Analyze the uploaded/URL image
  const handleAnalyzeLocalImage = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: preview, // base64 data URL
          title: 'Unknown Product',
          category: 'unknown',
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setResult(d);
        setMode(d.mode);
      } else {
        setError(d.error || 'Tahlil xatosi');
      }
    } catch {
      setError('Serverga ulanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="space-y-4">
      {/* Mode indicator */}
      <div className={`text-[10px] font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1 ${
        mode === 'real' ? 'text-green-500' : 'text-amber-500'
      }`} style={{ background: mode === 'real' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }}>
        {mode === 'real' ? '🔵 REAL Vision API' : '🟡 DEMO mode (Google Vision API key yo\'q)'}
      </div>

      {/* Image URL Input */}
      <div className="flex gap-2">
        <input
          value={imageUrl}
          onChange={e => { setImageUrl(e.target.value); setPreview(null); }}
          placeholder="https://example.com/product.jpg"
          className="flex-1 px-3 py-2 text-sm rounded-lg border outline-none"
          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
        />
        <button onClick={handleUrlSubmit} disabled={loading || !imageUrl}
          className="px-4 py-2 text-sm font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}>
          {loading ? '🔍...' : '🔍 Tahlil'}
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <span className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
        <span>yoki</span>
        <span className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
      </div>

      {/* File Upload */}
      <label className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed cursor-pointer transition hover:border-accent"
        style={{ borderColor: 'var(--border-primary)' }}>
        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        <span className="text-lg">📁</span>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {preview ? '✅ Rasm tanlandi' : 'Rasm yuklash'}
        </span>
      </label>

      {/* Preview */}
      {preview && (
        <div className="text-center">
          <img src={preview} alt="Preview" className="max-h-48 rounded-xl mx-auto" />
          <button onClick={handleAnalyzeLocalImage} disabled={loading}
            className="mt-2 px-4 py-1.5 text-xs font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}>
            {loading ? '🔍 Tahlil qilinmoqda...' : '📸 Rasmni tahlil qilish'}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin text-2xl mb-2">🔍</div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Google Cloud Vision AI tahlil qilmoqda...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-3">
          {/* Score */}
          <div className="p-4 rounded-xl text-center" style={{
            background: result.is_verified ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
          }}>
            <div className={`text-lg font-black ${result.is_verified ? 'text-green-500' : 'text-amber-500'}`}>
              {result.is_verified ? '✅ ORIGINAL MAHSULOT' : '⚠️ SHUBHALI'}
            </div>
            <div className="text-sm mt-1" style={{ color: result.is_verified ? '#10b981' : '#f59e0b' }}>
              Ishonchlilik: {result.counterfeit?.score || result.quick?.score || 0}%
            </div>
            <div className="mt-3 max-w-xs mx-auto">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${result.counterfeit?.score || 0}%`,
                  background: getScoreColor(result.counterfeit?.score || 0),
                }} />
              </div>
            </div>
          </div>

          {/* Checks */}
          {result.counterfeit?.checks && (
            <div className="space-y-1.5">
              {result.counterfeit.checks.map((check: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg text-xs"
                  style={{ background: check.passed ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)' }}>
                  <div className="flex items-center gap-2">
                    <span>{check.passed ? '✅' : '❌'}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{check.name}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {check.passed ? `${Math.round(check.weight * 100)}%` : '0%'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Flags */}
          {result.counterfeit?.flags?.length > 0 && (
            <div className="space-y-1">
              {result.counterfeit.flags.map((flag: string, i: number) => (
                <div key={i} className="text-xs" style={{ color: '#ef4444' }}>{flag}</div>
              ))}
            </div>
          )}

          {/* Labels & Logos */}
          {result.analysis && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg border text-xs" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>🏷️ Labels</div>
                {result.analysis.labels?.slice(0, 4).map((l: any, i: number) => (
                  <div key={i} className="flex justify-between" style={{ color: 'var(--text-tertiary)' }}>
                    <span>{l.description}</span>
                    <span>{Math.round(l.score * 100)}%</span>
                  </div>
                ))}
              </div>
              <div className="p-2 rounded-lg border text-xs" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>🎯 Logos & Objects</div>
                {result.analysis.logos?.map((l: any, i: number) => (
                  <div key={i} className="flex justify-between" style={{ color: 'var(--text-tertiary)' }}>
                    <span>{l.description}</span>
                    <span>{Math.round(l.score * 100)}%</span>
                  </div>
                ))}
                {result.analysis.objects?.slice(0, 2).map((o: any, i: number) => (
                  <div key={i} className="flex justify-between" style={{ color: 'var(--text-tertiary)' }}>
                    <span>{o.name}</span>
                    <span>{Math.round(o.score * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

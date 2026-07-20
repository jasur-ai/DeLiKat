'use client';

/**
 * 🤖 Trust Score UI Component
 *
 * Foydalanuvchi ishonchlilik reytingini chiroyli ko'rsatadi.
 * Badge + Progress Bar + Detalli breakdown + Level
 */

interface TrustScoreData {
  score: number;
  level: number;
  level_label: string;
  status_color: string;
  badge: string;
  breakdown: {
    rating_score: number;
    transaction_score: number;
    verification_score: number;
    account_age_score: number;
    dispute_penalty: number;
    bonus_points: number;
  };
  details: {
    verified: boolean;
    total_deals: number;
    successful_deals: number;
    success_rate: number;
    dispute_rate: number;
    account_age_days: number;
  };
}

interface Props {
  data: TrustScoreData;
  compact?: boolean;   // Small version for cards
  showBreakdown?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 8) return '#10b981';
  if (score >= 6) return '#6366f1';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
}

function getScoreBg(score: number): string {
  if (score >= 8) return 'rgba(16,185,129,0.1)';
  if (score >= 6) return 'rgba(99,102,241,0.1)';
  if (score >= 4) return 'rgba(245,158,11,0.1)';
  return 'rgba(239,68,68,0.1)';
}

export default function TrustScore({ data, compact = false, showBreakdown = true }: Props) {
  const score = data?.score || 0;
  const color = getScoreColor(score);
  const bg = getScoreBg(score);

  // Compact version (for cards / lists)
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full"
        style={{ background: bg, color }}>
        <span>{data?.badge || '🟤'}</span>
        <span>{score.toFixed(1)}</span>
        <span style={{ opacity: 0.6 }}>{data?.level_label || 'Yangi'}</span>
      </div>
    );
  }

  // Full version
  return (
    <div className="p-5 rounded-xl border" style={{
      borderColor: `${color}30`,
      background: `linear-gradient(135deg, ${bg}, transparent)`,
    }}>
      {/* Header: Badge + Score + Level */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
          style={{ background: `${color}20` }}>
          {data?.badge || '🟤'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black" style={{ color }}>{score.toFixed(1)}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              / 10.0
            </span>
          </div>
          <div className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
            {data?.level_label || 'Yangi'} · Level {data?.level || 1}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: 'var(--surface-hover)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(score / 10) * 100}%`,
            background: `linear-gradient(90deg, ${color}, ${score > 6 ? '#8b5cf6' : color})`,
          }} />
      </div>

      {/* Stat labels */}
      {data?.details && (
        <div className="grid grid-cols-3 gap-2 mb-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <div>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.details.total_deals}</span> bitim
          </div>
          <div>
            <span className="font-semibold" style={{ color: '#10b981' }}>{data.details.success_rate}%</span> muvaffaqiyat
          </div>
          <div>
            <span className="font-semibold" style={{ color: data.details.verified ? '#6366f1' : '#ef4444' }}>
              {data.details.verified ? '✅' : '❌'}
            </span> tasdiqlangan
          </div>
        </div>
      )}

      {/* Breakdown */}
      {showBreakdown && data?.breakdown && (
        <div className="space-y-2 pt-3 border-t text-xs" style={{ borderColor: `${color}15` }}>
          {[
            { label: '⭐ Reyting', score: data.breakdown.rating_score, weight: '30%' },
            { label: '📊 Tranzaksiyalar', score: data.breakdown.transaction_score, weight: '25%' },
            { label: '🔐 Tasdiqlash', score: data.breakdown.verification_score, weight: '15%' },
            { label: '⏱ Hisob yoshi', score: data.breakdown.account_age_score, weight: '15%' },
            { label: '⚖️ Nizolar', score: data.breakdown.dispute_penalty, weight: '15%' },
            data.breakdown.bonus_points > 0 ? { label: '🎁 Bonus', score: data.breakdown.bonus_points, weight: '+' } : null,
          ].filter(Boolean).map((item: any, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1" style={{ color: 'var(--text-tertiary)' }}>
                {item.label} <span style={{ opacity: 0.5 }}>({item.weight})</span>
              </div>
              <div className="w-24 h-1.5 rounded-full" style={{ background: 'var(--surface-hover)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${Math.min(item.score / 10 * 100, 100)}%`,
                  background: item.score >= 6 ? '#10b981' : item.score >= 4 ? '#f59e0b' : '#ef4444',
                }} />
              </div>
              <span className="w-8 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                {item.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

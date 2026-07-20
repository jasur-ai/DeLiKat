'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';

interface InstallmentPlan {
  id: string; months: number; label: string; annual_rate: number;
  monthly_payment: number; total_payment: number; interest_amount: number;
  down_payment: number; is_promotional: boolean;
}

interface NasiyaRecord {
  id: number; user_id: number; total_amount: number; down_payment: number;
  financed_amount: number; plan_months: number; annual_rate: number;
  monthly_payment: number; total_interest: number; total_payment: number;
  status: string; missed_payments: number; created_at: string;
  next_payment_date?: string; deal_id?: number; lot_id?: number;
}

interface ScheduleRow {
  month: number; due_date: string; amount: number;
  principal: number; interest: number; remaining_balance: number;
  status: string; paid_at?: string;
}

const DEMO_USER_ID = 1;

function fmtPrice(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln`;
  return `${v.toLocaleString()} so'm`;
}

export default function NasiyaPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [installments, setInstallments] = useState<NasiyaRecord[]>([]);
  const [detail, setDetail] = useState<{ nasiya: NasiyaRecord | null; schedule: ScheduleRow[] } | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedMonths, setSelectedMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Read URL params for pre-fill and auto-calculate
    const params = new URLSearchParams(window.location.search);
    const urlAmount = params.get('amount');
    const urlMonths = params.get('months');

    if (urlMonths) setSelectedMonths(parseInt(urlMonths));

    // Always fetch user's installments on load
    fetch(`/api/installment?action=my&user_id=${DEMO_USER_ID}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setInstallments(d.installments); })
      .catch(() => {});

    if (urlAmount) {
      setAmount(urlAmount);
      const numAmount = parseFloat(urlAmount);
      if (numAmount >= 200000 && numAmount <= 500000000) {
        // Auto-calculate plans from URL amount
        fetch(`/api/installment?action=plans&amount=${numAmount}`)
          .then(r => r.json())
          .then(d => { if (d.ok && d.plans.length > 0) setPlans(d.plans); })
          .catch(() => {});
      }
    }

    setLoading(false);
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const handleCalculate = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 200000) {
      setCalcError('Minimal summa 200,000 so\'m');
      setPlans([]);
      return;
    }
    if (numAmount > 500000000) {
      setCalcError('Maksimal summa 500,000,000 so\'m');
      setPlans([]);
      return;
    }
    setCalcError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/installment?action=plans&amount=${numAmount}`);
      const d = await res.json();
      if (d.ok && d.plans.length > 0) {
        setPlans(d.plans);
        setCalcError(null);
      } else {
        setPlans([]);
        setCalcError('Bu miqdor uchun nasiya mavjud emas');
      }
    } catch {
      setCalcError('Hisoblashda xatolik yuz berdi');
    } finally { setLoading(false); }
  };

  const handleApply = async (planMonths: number) => {
    if (!plans.length) return;
    const plan = plans.find(p => p.months === planMonths);
    if (!plan) return;

    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/installment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          user_id: DEMO_USER_ID,
          total_amount: parseFloat(amount),
          plan_months: planMonths,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setActionResult(`✅ ${plan.label} nasiya muvaffaqiyatli yaratildi! Oylik to'lov: ${fmtPrice(plan.monthly_payment)}`);
        // Reload installments
        const myRes = await fetch(`/api/installment?action=my&user_id=${DEMO_USER_ID}`);
        const myData = await myRes.json();
        if (myData.ok) setInstallments(myData.installments);
      } else {
        setActionResult(`❌ ${d.error || 'Xatolik'}`);
      }
    } catch {
      setActionResult('❌ Server xatosi');
    } finally {
      setActionLoading(false);
    }
  };

  const loadDetail = async (id: number) => {
    setShowDetail(id);
    try {
      const res = await fetch(`/api/installment?action=detail&id=${id}`);
      const d = await res.json();
      if (d.ok) setDetail(d);
    } catch { /* ignore */ }
  };

  const statusStyle = (s: string) => {
    const map: Record<string, { color: string; bg: string; label: string }> = {
      active: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: '✅ Aktiv' },
      completed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: '✅ Yakunlangan' },
      defaulted: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '❌ Qarzdor' },
      cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '❌ Bekor qilingan' },
      pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '⏳ Kutilmoqda' },
    };
    return map[s] || { color: 'var(--text-secondary)', bg: 'var(--surface-hover)', label: s };
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="" />

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>💰 Nasiya to'lov</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>3 oydan 24 oygacha bo'lib to'lang</p>
        </div>

        {/* Calculator */}
        <div className="p-6 rounded-xl border mb-8" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>🧮 Nasiya kalkulyatori</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Lot summasi</label>
              <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                type="text" placeholder="10 000 000"
                className="w-full px-4 py-3 text-sm border rounded-xl outline-none"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface)' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
            </div>
            <button onClick={handleCalculate}
              className="px-6 py-3 text-sm font-semibold rounded-xl border-none cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--accent)', color: 'white' }}>
              Hisoblash
            </button>
          </div>
        </div>

        {/* Error */}
        {calcError && (
          <div className="p-4 mb-6 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            {calcError}
          </div>
        )}

        {/* Auto-calculate on amount change */}
        {amount && parseFloat(amount) >= 200000 && plans.length === 0 && !calcError && (
          <div className="text-center py-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            "Hisoblash" tugmasini bosing
          </div>
        )}

        {/* Plans Grid */}
        {plans.length > 0 && (
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {plans.map(plan => {
              const isSelected = selectedMonths === plan.months;
              return (
                <div key={plan.id}
                  onClick={() => setSelectedMonths(plan.months)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected ? 'scale-[1.04]' : 'hover:-translate-y-0.5'
                  }`}
                  style={{
                    borderColor: isSelected ? 'var(--accent)' : 'var(--border-primary)',
                    background: isSelected ? 'var(--accent-50)' : 'var(--surface)',
                    boxShadow: isSelected ? '0 0 0 1px var(--accent), 0 4px 12px rgba(0,0,0,0.1)' : 'none',
                  }}>
                  <div className="text-center">
                    {plan.is_promotional && (
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#10b981' }}>
                        🔥 0% FOIZ
                      </div>
                    )}
                    <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{plan.label}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      {plan.annual_rate > 0 ? `${plan.annual_rate}% yillik` : '0% foiz'}
                    </div>
                    <div className="text-sm font-bold mt-3" style={{ color: 'var(--text-primary)' }}>
                      {fmtPrice(plan.monthly_payment)}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>oyiga</div>
                    {plan.interest_amount > 0 && (
                      <div className="text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
                        +{fmtPrice(plan.interest_amount)} foiz
                      </div>
                    )}
                    <button onClick={() => handleApply(plan.months)}
                      disabled={actionLoading}
                      className="w-full mt-3 py-2 text-xs font-semibold rounded-lg border-none cursor-pointer transition disabled:opacity-50"
                      style={{
                        background: isSelected ? 'var(--accent)' : 'var(--surface-dim)',
                        color: isSelected ? 'white' : 'var(--text-primary)',
                      }}>
                      {actionLoading ? 'Yaratilmoqda...' : 'Tanlash'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Result */}
        {actionResult && (
          <div className="p-4 mb-8 rounded-xl text-sm" style={{
            background: actionResult.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: actionResult.startsWith('✅') ? '#10b981' : '#ef4444',
          }}>
            {actionResult}
          </div>
        )}

        {/* Down Payment Summary */}
        {plans.length > 0 && (
          <div className="p-5 rounded-xl border mb-8" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>To'lov tafsilotlari</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Lot summasi', value: fmtPrice(parseFloat(amount || '0')), color: 'var(--text-primary)' },
                { label: 'Boshlang\'ich to\'lov (15%)', value: fmtPrice(Math.round(parseFloat(amount || '0') * 0.15)), color: '#f59e0b' },
                { label: 'Nasiya miqdori', value: fmtPrice(Math.round(parseFloat(amount || '0') * 0.85)), color: 'var(--text-primary)' },
                { label: 'Tanlangan muddat', value: `${selectedMonths} oy`, color: 'var(--accent)' },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="text-lg font-bold" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Installments */}
        <h2 className="text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>📋 Mening nasiyalarim</h2>
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="h-4 w-48 rounded" style={{ background: 'var(--surface-hover)' }} />
              </div>
            ))}
          </div>
        ) : installments.length === 0 ? (
          <div className="text-center py-12 rounded-xl border" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-tertiary)' }}>
            <div className="text-3xl mb-3">💰</div>
            <p>Hozircha nasiyalaringiz yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {installments.map(n => {
              const ss = statusStyle(n.status);
              return (
                <div key={n.id}>
                  <div className="p-5 rounded-xl border cursor-pointer transition hover:shadow-sm"
                    style={{ borderColor: 'var(--border-primary)' }}
                    onClick={() => loadDetail(n.id)}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            #{n.id} — {fmtPrice(n.total_amount)}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                            {ss.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          <span>📅 {n.plan_months} oy</span>
                          <span>💳 {fmtPrice(n.monthly_payment)}/oy</span>
                          {n.next_payment_date && <span>📆 Navbatdagi: {new Date(n.next_payment_date).toLocaleDateString('uz-UZ')}</span>}
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: 'var(--accent)' }}>
                        {showDetail === n.id ? 'Yopish ▲' : 'Batafsil ▼'}
                      </span>
                    </div>
                  </div>

                  {/* Detail / Schedule */}
                  {showDetail === n.id && detail && detail.nasiya?.id === n.id && (
                    <div className="p-5 rounded-xl border mt-2" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
                      <h4 className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>To'lov jadvali</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th className="text-left p-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>№</th>
                              <th className="text-left p-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Sana</th>
                              <th className="text-right p-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Summa</th>
                              <th className="text-right p-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Asosiy qarz</th>
                              <th className="text-right p-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Foiz</th>
                              <th className="text-right p-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Qoldiq</th>
                              <th className="text-center p-2 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Holat</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(detail.schedule || []).map(s => {
                              const payStatus = s.status === 'paid' ? { color: '#10b981', label: '✅' } :
                                s.status === 'overdue' ? { color: '#ef4444', label: '⚠️' } :
                                { color: 'var(--text-tertiary)', label: '○' };
                              return (
                                <tr key={s.month}>
                                  <td className="p-2" style={{ color: 'var(--text-primary)' }}>{s.month}</td>
                                  <td className="p-2" style={{ color: 'var(--text-secondary)' }}>{new Date(s.due_date).toLocaleDateString('uz-UZ')}</td>
                                  <td className="p-2 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtPrice(s.amount)}</td>
                                  <td className="p-2 text-right" style={{ color: 'var(--text-secondary)' }}>{fmtPrice(s.principal)}</td>
                                  <td className="p-2 text-right" style={{ color: s.interest > 0 ? '#f59e0b' : 'var(--text-tertiary)' }}>{s.interest > 0 ? fmtPrice(s.interest) : '—'}</td>
                                  <td className="p-2 text-right" style={{ color: 'var(--text-tertiary)' }}>{fmtPrice(s.remaining_balance)}</td>
                                  <td className="p-2 text-center" style={{ color: payStatus.color }}>{payStatus.label}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

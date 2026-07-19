'use client';

import { useEffect, useState } from 'react';

interface Lesson {
  id: number; order_num: number; title: string; content: string;
  category: string; category_emoji: string; xp_reward: number;
  is_completed: boolean; completed_at: string | null; icon: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  "boshlang'ich": '🌱', "o'rta": '🌿', yuqori: '🌳',
};

export default function AcademyPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [completedXp, setCompletedXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    fetch('/api/academy/lessons')
      .then(r => r.json())
      .then(d => {
        if (d.lessons) {
          setLessons(d.lessons);
          setTotalXp(d.total_xp || 0);
          setCompletedXp(d.completed_xp || 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const progress = totalXp > 0 ? Math.round((completedXp / totalXp) * 100) : 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border-primary)' }}>
        <div className="max-w-5xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2 text-lg font-bold no-underline" style={{ color: 'var(--text-primary)' }}>
            <svg viewBox="0 0 36 36" fill="none" style={{ width: 28, height: 28 }}>
              <defs><linearGradient id="lgAc" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
              <rect width="36" height="36" rx="9" fill="url(#lgAc)" /><path d="M9 9h8a9 9 0 010 18H9V9z" fill="white" opacity="0.95" /><circle cx="26" cy="18" r="2.5" fill="white" opacity="0.6" />
            </svg>
            DeLi<span style={{ color: 'var(--accent)' }}>Ket</span>
          </a>
          <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full border-none cursor-pointer transition" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="pt-24 pb-16 max-w-5xl mx-auto px-5">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>🎓 Sotuvchilar Akademiyasi</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>5 ta dars orqali sotuv mahoratingizni oshiring</p>
          </div>
        </div>

        {/* Progress */}
        <div className="p-5 rounded-xl border mb-8" style={{ borderColor: 'var(--border-primary)', background: 'var(--surface-dim)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Umumiy taraqqiyot</span>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{completedXp}/{totalXp} XP</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-primary)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: progress === 100 ? '#10b981' : 'var(--accent)' }} />
          </div>
          <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
            <span>{progress}% bajarildi</span>
            <span>{lessons.filter(l => l.is_completed).length}/{lessons.length} ta dars</span>
          </div>
        </div>

        {/* Lessons */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="p-5 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded" style={{ background: 'var(--surface-hover)' }} />
                  <div className="flex-1 h-4 rounded w-48" style={{ background: 'var(--surface-hover)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-3xl mb-3">📚</div>
            <p>Hozircha darslar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map(lesson => (
              <div key={lesson.id || lesson.order_num}
                onClick={() => setSelectedLesson(selectedLesson?.id === lesson.id ? null : lesson)}
                className={`p-5 rounded-xl border cursor-pointer transition hover:-translate-y-0.5 ${
                  selectedLesson?.id === lesson.id ? 'border-accent' : ''
                }`}
                style={{
                  borderColor: selectedLesson?.id === lesson.id ? 'var(--accent)' : 'var(--border-primary)',
                  background: lesson.is_completed ? 'rgba(16,185,129,0.03)' : 'var(--surface)',
                }}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lesson.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{lesson.title}</span>
                      {lesson.is_completed && <span className="text-xs">✅</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      <span>{lesson.category_emoji} {lesson.category}</span>
                      <span>+{lesson.xp_reward} XP</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: lesson.is_completed ? 'rgba(16,185,129,0.1)' : 'var(--surface-hover)', color: lesson.is_completed ? '#10b981' : 'var(--text-tertiary)' }}>
                    {lesson.is_completed ? 'Bajarilgan' : `Dars ${lesson.order_num}`}
                  </span>
                </div>

                {selectedLesson?.id === lesson.id && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{lesson.content}</p>
                    <button className="mt-3 px-4 py-2 text-sm font-semibold rounded-lg border-none cursor-pointer transition"
                      style={{ background: lesson.is_completed ? 'rgba(16,185,129,0.1)' : 'var(--accent)', color: lesson.is_completed ? '#10b981' : 'white' }}>
                      {lesson.is_completed ? '✅ Qayta ko\'rish' : '📖 Darsni boshlash'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

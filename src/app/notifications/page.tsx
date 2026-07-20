'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  icon: string;
  lot_id?: number;
  created_at: string;
  is_read: boolean;
}

const DEMO_USER_ID = 1;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?user_id=${DEMO_USER_ID}`);
      const d = await res.json();
      if (d.ok) {
        setNotifications(d.notifications);
        setUnreadCount(d.unread_count);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read', user_id: DEMO_USER_ID }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const date = new Date(t);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 60) return 'Hozir';
    if (diff < 3600) return `${Math.floor(diff / 60)} min oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} kun oldin`;
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      <Header active="notifications" />
      <div className="pt-24 pb-16 max-w-3xl mx-auto px-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>Bildirishnomalar</span>
            <h1 className="text-2xl md:text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
              🔔 Xabarlar {unreadCount > 0 && <span className="text-sm font-normal" style={{ color: 'var(--text-tertiary)' }}>({unreadCount} ta o'qilmagan)</span>}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="px-4 py-2 text-xs font-semibold rounded-lg border-none cursor-pointer transition"
              style={{ background: 'var(--accent)', color: 'white' }}>
              Hammasini o'qilgan deb belgilash
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="p-4 rounded-xl border animate-pulse" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg" style={{ background: 'var(--surface-hover)' }} />
                  <div className="flex-1">
                    <div className="h-4 w-32 rounded" style={{ background: 'var(--surface-hover)' }} />
                    <div className="h-3 w-48 rounded mt-1" style={{ background: 'var(--surface-hover)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-4xl mb-3">🔔</div>
            <p>Bildirishnomalar yo'q</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (                <div key={n.id} className={`p-4 rounded-xl border transition hover:-translate-y-0.5 ${
                !n.is_read ? 'border-accent' : ''
              }`}
                style={{
                  borderColor: !n.is_read ? 'var(--accent)' : 'var(--border-primary)',
                  background: !n.is_read ? 'var(--accent-50)' : 'var(--surface)',
                }}>
                <div className="flex items-start gap-3">
                  <a href={n.type === 'new_bid' || n.type === 'bid_accepted' || n.type === 'new_deal'
                    ? `/chat?with=${n.lot_id || ''}`
                    : n.lot_id ? `/lot/${n.lot_id}` : '#'}
                    className="flex items-start gap-3 no-underline w-full"
                    onClick={() => {
                      // Mark as read when clicked
                      if (!n.is_read) {
                        fetch('/api/notifications', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'mark_read', notification_id: n.id }),
                        }).catch(() => {});
                      }
                    }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                      style={{ background: 'var(--surface-dim)' }}>
                      {n.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{n.title}</span>
                        {!n.is_read && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />}
                      </div>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <span>{formatTime(n.created_at)}</span>
                        {(n.type === 'new_bid' || n.type === 'new_deal') && (
                          <span className="font-semibold" style={{ color: 'var(--accent)' }}>→ Chatga o'tish</span>
                        )}
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

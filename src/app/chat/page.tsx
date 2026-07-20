'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  text: string;
  created_at: string;
  is_mine: boolean;
}

interface Conversation {
  id: string;
  with_user_id: number;
  with_user_name: string;
  with_user_avatar: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: Message[];
}

const DEMO_USER_ID = 1; // Mock user logged in

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/chat?user_id=${DEMO_USER_ID}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) setConversations(d.conversations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages]);

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    // Mark as read
    setConversations(prev => prev.map(c =>
      c.id === conv.id ? { ...c, unread_count: 0 } : c
    ));
    // Mark notifications as read (for current user)
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_all_read',
        user_id: DEMO_USER_ID,
      }),
    }).catch(() => {});
  };

  const handleSend = async () => {
    if (!msgText.trim() || !activeConv) return;
    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: DEMO_USER_ID,
          receiver_id: activeConv.with_user_id,
          text: msgText.trim(),
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setActiveConv(prev => prev ? {
          ...prev,
          messages: [...prev.messages, d.message],
          last_message: d.message.text,
          last_message_time: d.message.created_at,
        } : null);
        setMsgText('');
      }
    } catch (e) { console.error(e); } finally { setSending(false); }
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const date = new Date(t);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 86400000) return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-dim)' }}>
      <Header active="chat" />
      <div className="pt-20 h-screen max-w-5xl mx-auto px-4">
        <div className="flex h-[calc(100vh-100px)] rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border-primary)' }}>
          {/* Conversations List */}
          <div className="w-80 shrink-0 border-r flex flex-col" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>💬 Xabarlar</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full" style={{ background: 'var(--surface-hover)' }} />
                      <div className="flex-1 h-4 rounded" style={{ background: 'var(--surface-hover)' }} />
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>Xabarlar yo'q</div>
              ) : (
                conversations.map(conv => (
                  <button key={conv.id} onClick={() => openConversation(conv)}
                    className="w-full p-3 flex items-center gap-3 border-none text-left cursor-pointer transition-colors"
                    style={{
                      background: activeConv?.id === conv.id ? 'var(--accent-50)' : 'transparent',
                      borderBottom: '1px solid var(--border-primary)',
                    }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}>
                      {conv.with_user_avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{conv.with_user_name}</span>
                        <span className="text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>{formatTime(conv.last_message_time)}</span>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{conv.last_message}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'var(--accent-50)', color: 'var(--accent)' }}>
                    {activeConv.with_user_avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{activeConv.with_user_name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Online</div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeConv.messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-xl text-sm ${
                        msg.is_mine
                          ? 'rounded-br-sm'
                          : 'rounded-bl-sm'
                      }`}
                        style={{
                          background: msg.is_mine ? 'var(--accent)' : 'var(--surface-dim)',
                          color: msg.is_mine ? 'white' : 'var(--text-primary)',
                        }}>
                        {!msg.is_mine && (
                          <div className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>{msg.sender_name}</div>
                        )}
                        <div className="leading-relaxed">{msg.text}</div>
                        <div className={`text-xs mt-1 ${msg.is_mine ? 'text-white/70' : ''}`} style={{ color: msg.is_mine ? 'rgba(255,255,255,0.7)' : 'var(--text-tertiary)' }}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={msgEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex gap-2">
                    <input value={msgText} onChange={e => setMsgText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Xabar yozing..."
                      className="flex-1 px-4 py-2.5 text-sm border rounded-xl outline-none transition"
                      style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--surface-dim)' }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border-primary)'} />
                    <button onClick={handleSend} disabled={sending || !msgText.trim()}
                      className="px-5 py-2.5 text-sm font-semibold rounded-xl border-none cursor-pointer transition disabled:opacity-50"
                      style={{ background: 'var(--accent)', color: 'white' }}>
                      {sending ? '...' : 'Yuborish'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center flex-col gap-3" style={{ color: 'var(--text-tertiary)' }}>
                <div className="text-4xl">💬</div>
                <p className="text-sm">Xabarlarni ko'rish uchun chatni tanlang</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

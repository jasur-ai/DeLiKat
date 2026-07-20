'use client';
import { useState } from 'react';

/**
 * 📤 Social Share — Lotni ijtimoiy tarmoqlarda ulashish
 */
interface Props {
  url: string;
  title: string;
}

export default function SocialShare({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${url}`
    : url;
  const shareText = `📦 ${title}\n${shareUrl}\n\nDeLiKet — Deadstock Liquidation Marketplace`;

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`, '_blank');
  };
  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex gap-2">
      <button onClick={shareTelegram}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]"
        style={{ borderColor: 'var(--border-primary)', color: '#0088cc', background: 'rgba(0,136,204,0.05)' }}>
        ✈️ Telegram
      </button>
      <button onClick={shareWhatsApp}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]"
        style={{ borderColor: 'var(--border-primary)', color: '#25D366', background: 'rgba(37,211,102,0.05)' }}>
        💬 WhatsApp
      </button>
      <button onClick={copyLink}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]"
        style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)', background: 'var(--surface)' }}>
        {copied ? '✅ Nusxa olindi' : '🔗 Link nusxalash'}
      </button>
    </div>
  );
}

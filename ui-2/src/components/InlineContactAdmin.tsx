import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { getToken } from '../api/auth';
import { useLang } from '../context/LanguageContext';

interface InlineContactAdminProps {
  userId?: string;
}

export default function InlineContactAdmin({ userId }: InlineContactAdminProps) {
  const { t } = useLang(); // <-- Use translations
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [justSent, setJustSent] = useState<{
    subject: string;
    content: string;
    timestamp: number;
  } | null>(null);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const token = getToken();
      const finalSubject = subject.trim() || t('inlineContactAdmin.defaultSubject');
      const response = await fetch('/dev-api/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject: finalSubject, content: content.trim() }),
      });
      const data = await response.json();
      if (data.code === 200) {
        setSuccess(true);
        setJustSent({ subject: finalSubject, content: content.trim(), timestamp: Date.now() });
        // Store in localStorage to mirror previous popup behavior
        try {
          const stored = localStorage.getItem('notifications_messages');
          const all = stored ? JSON.parse(stored) : [];
          all.unshift({
            id: `local-${Date.now()}`,
            sender: t('inlineContactAdmin.you'),
            senderId: userId || 'user',
            senderRole: 'user',
            role: 'user',
            subject: finalSubject,
            text: content.trim(),
            message: content.trim(),
            timestamp: Date.now(),
            read: true,
          });
          localStorage.setItem('notifications_messages', JSON.stringify(all));
        } catch {}
        setTimeout(() => {
          setSuccess(false);
          setSubject('');
          setContent('');
        }, 1600);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 border-b border-[#E8E8E8] bg-[#F6F6F6]">
        <h2 className="text-lg font-semibold text-[#232333]">{t('inlineContactAdmin.title')}</h2>
        <p className="text-sm text-[#6E7680] mt-1">{t('inlineContactAdmin.description')}</p>
      </div>

      <div className="p-6 space-y-4">
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 flex items-center gap-2 animate-section-in">
            <CheckCircle className="w-5 h-5" />
            {t('inlineContactAdmin.successMessage')}
          </div>
        )}

        {justSent && (
          <div className="p-4 bg-[#F6F6F6] border border-[#E8E8E8] rounded-xl text-[#232333] text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#232333] font-semibold">{t('inlineContactAdmin.yourMessage')}</span>
              <span className="text-xs text-[#9CA3AF]">{new Date(justSent.timestamp).toLocaleString()}</span>
            </div>
            {justSent.subject && (
              <div className="mt-1 text-xs text-[#6E7680]">
                {t('inlineContactAdmin.subject')}: {justSent.subject}
              </div>
            )}
            <p className="mt-2 text-sm whitespace-pre-wrap">{justSent.content}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[#232333] mb-2">{t('inlineContactAdmin.subjectLabel')}</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('inlineContactAdmin.subjectPlaceholder')}
            className="w-full bg-white border border-[#E8E8E8] rounded-xl px-4 py-3 text-[#232333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1d2089] focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#232333] mb-2">{t('inlineContactAdmin.contentLabel')}</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('inlineContactAdmin.contentPlaceholder')}
            rows={8}
            className="w-full bg-white border border-[#E8E8E8] rounded-xl px-4 py-3 text-[#232333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1d2089] focus:border-transparent transition-all resize-vertical"
          />
          <p className="mt-2 text-xs text-[#9CA3AF]">
            {content.length > 0
              ? t('inlineContactAdmin.charactersCount', { count: content.length })
              : t('inlineContactAdmin.minCharacters')}
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="px-5 py-2.5 bg-[#1d2089] hover:bg-[#161870] disabled:bg-[#E8E8E8] disabled:text-[#9CA3AF] rounded-xl text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            {sending ? t('inlineContactAdmin.sending') : t('inlineContactAdmin.sendButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

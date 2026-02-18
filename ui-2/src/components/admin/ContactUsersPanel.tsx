import { useState, useEffect } from 'react';
import {
  Trash2,
  Send,
  CheckCircle,
} from 'lucide-react';
import { useLang } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { getToken } from '../../api/auth';

interface BroadcastMessage {
  id: number;
  subject: string;
  content: string;
  created_at: string;
}

interface ContactUsersPanelProps {
  onOpenDeleteMessages?: () => void;
}

export default function ContactUsersPanel({
  onOpenDeleteMessages,
}: ContactUsersPanelProps) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [pendingDeleteMsg, setPendingDeleteMsg] = useState<BroadcastMessage | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { t } = useLang();
  const toast = useToast();

  const safeT = (key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  };

  const messageLabel = safeT('broadcast.messageLabel', 'Message');
  const messageLabelClean = messageLabel.replace(/\*/g, '').trim();

  const sendBroadcast = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const subjectToSend = subject.trim() || t('broadcast.defaultSubject');
      const contentToSend = content.trim();
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject: subjectToSend, content: contentToSend }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setSuccess(t('broadcast.success'));
        setSubject('');
        setContent('');
        setTimeout(() => setSuccess(''), 1600);
      }
    } catch (e) {
      // keep silent
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msg: BroadcastMessage) => {
    setDeletingId(msg.id);
    try {
      const token = getToken();
      const res = await fetch(`/dev-api/api/messages/broadcast/${msg.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 200) {
        toast.success(t('broadcast.deleteSuccess', undefined, 'Message deleted'));
      } else {
        toast.error(t('broadcast.deleteError', undefined, 'Failed to delete'));
      }
    } catch (e) {
      toast.error(t('broadcast.deleteError', undefined, 'Failed to delete'));
    } finally {
      setDeletingId(null);
      setPendingDeleteMsg(null);
    }
  };

  return (
    <>
      {/* Delete Confirmation Modal */}
      {pendingDeleteMsg && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#0f1724] border border-[#E8E8E8] dark:border-dark-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#232333] dark:text-white transition-colors">
                  {t('broadcast.deleteTitle', undefined, 'Delete Message')}
                </h3>
                <p className="text-sm text-[#6E7680] dark:text-dark-text-muted transition-colors">
                  {t('broadcast.deleteWarning', undefined, 'This action cannot be undone')}
                </p>
              </div>
            </div>
            <div className="bg-[#F6F6F6] dark:bg-dark-surface-alt rounded-xl p-4 transition-colors">
              <p className="text-xs text-[#6E7680] dark:text-dark-text-muted mb-1 transition-colors">
                {t('broadcast.subjectLabel')}
              </p>
              <p className="text-sm font-medium text-[#232333] dark:text-dark-text break-all transition-colors">
                {pendingDeleteMsg.subject}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDeleteMsg(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-surface text-[#232333] dark:text-dark-text font-medium transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDeleteMessage(pendingDeleteMsg)}
                disabled={deletingId === pendingDeleteMsg.id}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deletingId === pendingDeleteMsg.id ? '...' : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Broadcast composer */}
        <div className="p-0 pt-[5px] transition-colors">
          <div className="flex items-center gap-1">
            <div>
              <h3 className="text-lg font-semibold text-[#232333] dark:text-white transition-colors">
                {t('broadcast.title')}
              </h3>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 pt-0 space-y-4">
          {success && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 rounded-xl text-green-600 dark:text-green-300 text-sm flex items-center gap-2 transition-colors">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#232333] dark:text-dark-text mb-2 transition-colors">
              {t('broadcast.subjectLabel')}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('broadcast.subjectPlaceholder')}
              className="w-full bg-white dark:bg-[#0f1724] border border-[#E8E8E8] dark:border-dark-border rounded-xl px-4 py-3 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1e228a] dark:focus:ring-[#00ccff4d] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#232333] dark:text-dark-text mb-2">
              {messageLabelClean} <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('broadcast.messagePlaceholder')}
              className="w-full bg-white dark:bg-[#0f1724] border border-[#E8E8E8] dark:border-dark-border rounded-xl px-4 py-3 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1e228a] dark:focus:ring-[#00ccff4d] focus:border-transparent transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onOpenDeleteMessages}
              className="px-4 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-sm inline-flex items-center gap-2 transition-colors"
              title={t('messages.deleteTitle')}
            >
              <Trash2 className="w-4 h-4" />
              {t('messages.deleteTitle') || 'Delete Messages'}
            </button>

            <button
              type="button"
              onClick={sendBroadcast}
              disabled={sending || !content.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#1e228a] dark:bg-[#00ccff4d] hover:bg-[#151a6e] dark:hover:bg-[#00a3cc] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm inline-flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4" />
              {sending ? t('broadcast.sending') : t('broadcast.send')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
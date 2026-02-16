import { useState, useEffect } from 'react';
import {
  Trash2,
  Send,
  CheckCircle,
  Clock,
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
  const [sentMessages, setSentMessages] = useState<BroadcastMessage[]>([]);
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

  const normalizeHistoryRows = (data: any): BroadcastMessage[] => {
    const rows =
      data?.result?.rows ??
      data?.result?.list ??
      data?.result?.data ??
      data?.result?.messages ??
      data?.result;
    return Array.isArray(rows) ? rows : [];
  };

  // Load sent messages on mount
  useEffect(() => {
    loadSentMessages();
  }, []);

  const loadSentMessages = async () => {
    try {
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/broadcast/history?pageNum=1&pageSize=50', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data?.code === 200) {
        const rows = normalizeHistoryRows(data);
        if (rows.length > 0) {
          const sorted = [...rows].sort((a, b) => {
            const at = new Date(a.created_at || 0).getTime();
            const bt = new Date(b.created_at || 0).getTime();
            return bt - at;
          });
          setSentMessages(sorted);
        }
      }
    } catch (e) {
      // silent
    }
  };

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

        const createdAt =
          data?.result?.created_at ||
          data?.result?.createdAt ||
          data?.result?.message?.created_at ||
          new Date().toISOString();
        const newId =
          data?.result?.id ||
          data?.result?.message?.id ||
          Date.now();

        setSentMessages((prev) => [
          {
            id: Number(newId),
            subject: subjectToSend,
            content: contentToSend,
            created_at: createdAt,
          },
          ...prev,
        ]);

        setSubject('');
        setContent('');
        setTimeout(() => setSuccess(''), 1600);

        setTimeout(() => {
          loadSentMessages();
        }, 350);
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
        setSentMessages(prev => prev.filter(m => m.id !== msg.id));
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
          <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl transition-colors">
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
              <p className="text-xs text-[#6E7680] dark:text-dark-text-muted mb-1 transition-colors">{t('broadcast.subjectLabel')}</p>
              <p className="text-sm font-medium text-[#232333] dark:text-dark-text break-all transition-colors">{pendingDeleteMsg.subject}</p>
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

      {/* ✅ Wrapper to hold BOTH cards */}
      <div className="space-y-6">
        {/* Broadcast composer card */}
        <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl overflow-hidden shadow-sm transition-colors">
          <div className="p-5 border-b border-[#E8E8E8] dark:border-dark-border bg-[#F6F6F6] dark:bg-dark-bg-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#1d2089] rounded-xl">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#232333] dark:text-white transition-colors">
                  {t('broadcast.title')}
                </h3>
                <p className="text-sm text-[#6E7680] dark:text-dark-text-muted transition-colors">{t('broadcast.subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
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
                className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-xl px-4 py-3 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-[#60a5fa] focus:border-transparent transition-all"
                placeholder={t('broadcast.subjectPlaceholder')}
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
                className="w-full bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-xl px-4 py-3 text-[#232333] dark:text-dark-text placeholder-[#9CA3AF] dark:placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-[#1d2089] dark:focus:ring-[#60a5fa] focus:border-transparent transition-all resize-none"
                placeholder={t('broadcast.messagePlaceholder')}
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
                className="px-6 py-2.5 rounded-xl bg-[#1d2089] hover:bg-[#161870] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm inline-flex items-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                {sending ? t('broadcast.sending') : t('broadcast.send')}
              </button>
            </div>
          </div>
        </div>

        {/* Sent messages card */}
        <div className="bg-white dark:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-2xl overflow-hidden shadow-sm transition-colors">
          <div className="p-5 border-b border-[#E8E8E8] dark:border-dark-border bg-[#F6F6F6] dark:bg-dark-bg-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500 rounded-xl">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#232333] dark:text-white transition-colors">
                  {safeT('broadcast.sentMessages', 'Sent Messages')}
                </h3>
              </div>
            </div>
          </div>

          <div className="p-5">
            {sentMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#F6F6F6] dark:bg-dark-surface-alt rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
                  <Send className="w-8 h-8 text-[#9CA3AF]" />
                </div>
                <p className="text-[#6E7680] dark:text-dark-text-muted text-sm transition-colors">
                  {t('broadcast.emptySentTitle', undefined, 'No messages sent yet')}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {sentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="relative bg-[#F6F6F6] dark:bg-dark-surface-alt hover:bg-[#E8E8E8] dark:hover:bg-dark-surface border border-[#E8E8E8] dark:border-dark-border rounded-xl p-4 transition-colors group"
                  >
                    <button
                      onClick={() => setPendingDeleteMsg(msg)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-[#9CA3AF] hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title={t('common.delete') || 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <h5 className="text-sm font-semibold text-[#232333] dark:text-white transition-colors mb-1 pr-8">
                      {msg.subject}
                    </h5>
                    <p className="text-xs text-[#6E7680] dark:text-dark-text-muted line-clamp-2 mb-3 transition-colors">{msg.content}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF] dark:text-dark-text-muted transition-colors">
                      <Clock className="w-3 h-3" />
                      {new Date(msg.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

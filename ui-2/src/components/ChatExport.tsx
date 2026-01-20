/**
 * Chat Export - Export conversation as TXT / MD / JSON
 */
import { useState } from 'react';
import { Download, FileText, File, X, Loader2, Copy, Check } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatExportProps {
  messages: Message[];
  chatTitle?: string;
  onClose: () => void;
}

export default function ChatExport({
  messages,
  chatTitle = 'Chat Export',
  onClose,
}: ChatExportProps) {
  const { t } = useLang();
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatMessages = () => {
    const header = `# ${chatTitle}\n${t('chatExport.exportedOn')}: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;

    const content = messages
      .map((msg) => {
        const role =
          msg.role === 'user'
            ? `👤 ${t('chatExport.you')}`
            : `🤖 ${t('chatExport.assistant')}`;
        const time = msg.timestamp || '';
        return `${role}${time ? ` (${time})` : ''}:\n${msg.content}\n`;
      })
      .join('\n' + '-'.repeat(40) + '\n\n');

    return header + content;
  };

  const exportFile = (content: string, type: string, ext: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chatTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsTxt = () => {
    setExporting(true);
    try {
      exportFile(formatMessages(), 'text/plain', 'txt');
    } finally {
      setExporting(false);
    }
  };

  const exportAsMarkdown = () => {
    setExporting(true);
    try {
      const header = `# ${chatTitle}\n\n*${t(
        'chatExport.exportedOn'
      )}: ${new Date().toLocaleString()}*\n\n---\n\n`;

      const content = messages
        .map((msg) => {
          const role =
            msg.role === 'user'
              ? `**${t('chatExport.you')}:**`
              : `**${t('chatExport.assistant')}:**`;
          return `${role}\n\n${msg.content}\n`;
        })
        .join('\n---\n\n');

      exportFile(header + content, 'text/markdown', 'md');
    } finally {
      setExporting(false);
    }
  };

  const exportAsJson = () => {
    setExporting(true);
    try {
      exportFile(
        JSON.stringify(
          {
            title: chatTitle,
            exportedAt: new Date().toISOString(),
            messageCount: messages.length,
            messages,
          },
          null,
          2
        ),
        'application/json',
        'json'
      );
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(formatMessages());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">{t('chatExport.title')}</h2>
              <p className="text-xs text-slate-500">
                {t('chatExport.messagesCount', { count: messages.length })}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-400 mb-4">
            {t('chatExport.description')}
          </p>

          <ExportButton icon={FileText} title={t('chatExport.plainText.title')} desc={t('chatExport.plainText.desc')} onClick={exportAsTxt} />
          <ExportButton icon={File} title={t('chatExport.markdown.title')} desc={t('chatExport.markdown.desc')} onClick={exportAsMarkdown} />
          <ExportButton icon={File} title={t('chatExport.json.title')} desc={t('chatExport.json.desc')} onClick={exportAsJson} />

          <div className="text-center text-xs text-slate-500">{t('chatExport.or')}</div>

          <button
            onClick={copyToClipboard}
            className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? t('chatExport.copied') : t('chatExport.copy')}
          </button>
        </div>

        {exporting && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

function ExportButton({ icon: Icon, title, desc, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-left"
    >
      <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
        <Icon className="w-5 h-5 text-slate-300" />
      </div>
      <div>
        <p className="font-medium text-white">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </button>
  );
}

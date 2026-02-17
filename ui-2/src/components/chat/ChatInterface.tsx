import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Globe, Languages, Copy, ThumbsUp, ThumbsDown,
  RefreshCw, Check, Plus, Trash2, StopCircle,
  Download
} from 'lucide-react';
import { Message } from '../../types';
import { useLang } from '../../context/LanguageContext';
import { listTask, listTaskOutput, addTask, deleteTaskOutput, sendFeedbackToCache } from '../../api/task';
import { getToken } from '../../api/auth';
import ChatExport from './ChatExport';
import { ConfirmDialog } from '../ui/FeedbackComponents';
import { useToast } from '../../context/ToastContext';
import PDFPreview, { SourceCitation } from './PDFPreview';

interface ChatInterfaceProps {
  onSaveToHistory: (query: string, answer: string, source: any) => void;
  focusSignal?: number;
  onUserTyping?: (typing: boolean) => void;
}

interface ChatTask {
  id: string;
  title: string;
  createdAt: string;
}

interface TaskOutput {
  id: number;
  metadata: string;
  content: string;
  status: string;
  feedback?: { emoji?: string };
  sort: number;
}

// Dual language output interface
interface DualLanguageContent {
  isDualLanguage: boolean;
  isSingleLanguage?: boolean;
  japanese?: string;
  translated?: string;
  targetLanguage?: string;
  content?: string;
  language?: 'ja' | 'en';
  translationPending?: boolean;
  rawContent: string;
}

// Parse dual-language output from backend - handles both old and new formats
function parseDualLanguageContent(content: string): DualLanguageContent {
  if (!content || typeof content !== 'string') {
    console.warn('[parseDualLanguageContent] Invalid content:', content);
    return {
      isDualLanguage: false,
      isSingleLanguage: false,
      rawContent: String(content || ''),
      content: String(content || ''),
    };
  }

  // NEW single-language format
  const singleLangMatch = content.match(/<!--SINGLE_LANG_START-->([\s\S]*?)<!--SINGLE_LANG_END-->/);
  if (singleLangMatch && singleLangMatch[1]) {
    try {
      const jsonStr = singleLangMatch[1].trim();
      if (!jsonStr || jsonStr.length === 0) throw new Error('Empty JSON between markers');
      if (!jsonStr.includes('{') && !jsonStr.includes('}')) throw new Error('Invalid JSON format');

      const parsed = JSON.parse(jsonStr);
      return {
        isDualLanguage: false,
        isSingleLanguage: true,
        content: parsed.content || '',
        language: parsed.language,
        translationPending: parsed.translationPending === true,
        rawContent: parsed.content || '',
        targetLanguage: parsed.language,
        translated: parsed.content || '',
      };
    } catch (e) {
      console.error('[parseDualLanguageContent] Single-language JSON parse error:', e);
    }
  }

  // Strip HTML tags / markers
  let cleanContent = content
    .replace(/<[^>]*>/g, '')
    .replace(/<!--SINGLE_LANG_START-->/g, '')
    .replace(/<!--SINGLE_LANG_END-->/g, '')
    .replace(/<!--DUAL_LANG_START-->/g, '')
    .replace(/<!--DUAL_LANG_END-->/g, '')
    .trim();

  // NEW dual-language JSON format
  const jsonMatch = cleanContent.match(/\{[\s\S]*?"dualLanguage"\s*:\s*true[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.dualLanguage) {
        let jaText = parsed.japanese || '';
        let enText = parsed.translated || '';

        jaText = String(jaText).replace(/\{[\s\S]*?"dualLanguage"[\s\S]*?\}/g, '').trim();
        enText = String(enText).replace(/\{[\s\S]*?"dualLanguage"[\s\S]*?\}/g, '').trim();

        return {
          isDualLanguage: true,
          isSingleLanguage: false,
          japanese: jaText,
          translated: enText,
          targetLanguage: parsed.targetLanguage || 'en',
          rawContent: enText || jaText,
        };
      }
    } catch (e) {
      console.error('[parseDualLanguageContent] JSON parse error:', e);
    }
  }

  // [EN]/[JA] format
  const enMatch = cleanContent.match(/\[EN\]\s*([\s\S]*?)(?=\[JA\]|$)/i);
  const jaMatch = cleanContent.match(/\[JA\]\s*([\s\S]*?)(?=\[EN\]|$)/i);
  if (enMatch && jaMatch) {
    const englishText = enMatch[1].trim();
    const japaneseText = jaMatch[1].trim();
    if (englishText && japaneseText) {
      const enIndex = cleanContent.indexOf('[EN]');
      const jaIndex = cleanContent.indexOf('[JA]');
      const userLangFirst = enIndex < jaIndex ? 'en' : 'ja';

      return {
        isDualLanguage: true,
        isSingleLanguage: false,
        japanese: japaneseText,
        translated: englishText,
        targetLanguage: userLangFirst,
        rawContent: content,
      };
    }
  }

  // Separator split
  const parts = cleanContent.split(/\n---+\n/);
  if (parts.length >= 2) {
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(parts[1]);
    if (hasJapanese) {
      return {
        isDualLanguage: true,
        isSingleLanguage: false,
        japanese: parts[1].trim(),
        translated: parts[0].trim(),
        targetLanguage: 'en',
        rawContent: content,
      };
    }
  }

  // Try direct JSON parse if looks like JSON
  if (cleanContent.startsWith('{') && cleanContent.includes('dualLanguage')) {
    try {
      const parsed = JSON.parse(cleanContent);
      if (parsed.dualLanguage === false && parsed.content) {
        return {
          isDualLanguage: false,
          isSingleLanguage: true,
          content: parsed.content,
          language: parsed.language || 'en',
          translationPending: parsed.translationPending === true,
          rawContent: parsed.content,
          targetLanguage: parsed.language || 'en',
          translated: parsed.content,
        };
      }
    } catch (e) {
      console.error('[parseDualLanguageContent] Direct JSON parse failed:', e);
    }
  }

  return {
    isDualLanguage: false,
    isSingleLanguage: false,
    rawContent: cleanContent,
    content: cleanContent,
    japanese: undefined,
    translated: undefined,
    targetLanguage: undefined,
  };
}

// Action buttons component for bot messages
interface MessageActionsProps {
  content: string;
  messageId: string;
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void;
  onRegenerate?: () => void;
}

function MessageActions({ content, messageId, onFeedback, onRegenerate }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const { t } = useLang();

  const handleCopy = async () => {
    const parsed = parseDualLanguageContent(content);
    let textToCopy = parsed.rawContent;
    if (parsed.isDualLanguage && parsed.translated && parsed.japanese) {
      textToCopy = `${parsed.translated}\n\n---\n\n${parsed.japanese}`;
    }
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(type);
    onFeedback?.(messageId, type);
  };

  return (
    <>
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-black/10 dark:border-white/10">
        <button onClick={handleCopy} className="mac-iconbtn" title={t('chatActions.copy')}>
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>

        <button
          onClick={() => handleFeedback('like')}
          className={`mac-iconbtn ${feedback === 'like' ? 'mac-iconbtn-active-good' : ''}`}
          title={t('chatActions.good')}
        >
          <ThumbsUp className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleFeedback('dislike')}
          className={`mac-iconbtn ${feedback === 'dislike' ? 'mac-iconbtn-active-bad' : ''}`}
          title={t('chatActions.bad')}
        >
          <ThumbsDown className="w-4 h-4" />
        </button>

        <button onClick={onRegenerate} className="mac-iconbtn" title={t('chatActions.regenerate')}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

// Component for displaying dual-language content
function DualLanguageMessage({ content, taskOutputId }: { content: DualLanguageContent; taskOutputId?: number }) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const { t } = useLang();
  const toast = useToast();

  let sourceLanguage: 'ja' | 'en' = 'en';
  let targetLanguage: 'ja' | 'en' = 'ja';
  let displayText = '';

  if (content.isSingleLanguage && content.language) {
    sourceLanguage = content.language;
    targetLanguage = content.language === 'ja' ? 'en' : 'ja';
    displayText = content.content || '';
  } else if (content.isDualLanguage) {
    sourceLanguage = content.targetLanguage === 'ja' ? 'ja' : 'en';
    targetLanguage = sourceLanguage === 'ja' ? 'en' : 'ja';
    displayText = sourceLanguage === 'ja' ? (content.japanese || '') : (content.translated || '');
  } else {
    displayText = content.content || content.rawContent || '';
    sourceLanguage = 'en';
    targetLanguage = 'ja';
  }

  const sourceLanguageName = sourceLanguage === 'ja' ? '日本語' : 'English';
  const targetLanguageName = targetLanguage === 'ja' ? '日本語' : 'English';

  const handleTranslate = async () => {
    if (translation) {
      setTranslation(null);
      return;
    }

    setLoadingTranslation(true);
    setTranslationError(null);

    const translationTimeoutId = setTimeout(() => {
      setLoadingTranslation(false);
      const errorMsg = sourceLanguage === 'ja'
        ? '翻訳タイムアウト(5分以上かかりました。サーバーが忙しい可能性があります。)'
        : 'Translation timeout (took more than 5 minutes). Please try again.';
      setTranslationError(errorMsg);
    }, 300000);

    try {
      if (!taskOutputId) {
        const errorMsg = sourceLanguage === 'ja'
          ? 'メッセージIDが見つかりません'
          : 'Unable to find message ID for translation';
        setTranslationError(errorMsg);
        clearTimeout(translationTimeoutId);
        return;
      }

      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/dev-api/api/gen-task/translate-on-demand', {
        method: 'POST',
        headers,
        body: JSON.stringify({ outputId: taskOutputId, targetLanguage }),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || response.statusText;
        } catch {
          errorMessage = responseText || response.statusText;
        }
        throw new Error(`API Error [${response.status}]: ${errorMessage}`);
      }

      if (!responseText || responseText.trim().length === 0) throw new Error('Server returned empty response');

      const data = JSON.parse(responseText);
      if (data.result?.content) setTranslation(data.result.content);
      else throw new Error(`No translation content in response. Got: ${JSON.stringify(data)}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setTranslationError(errorMsg);
      toast.error(errorMsg);
    } finally {
      clearTimeout(translationTimeoutId);
      setLoadingTranslation(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="space-y-2">
        {content.isDualLanguage && (
          <div className="flex items-center gap-2 pb-2">
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
              {sourceLanguageName}
            </span>
          </div>
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-900 dark:text-slate-100">
          {displayText || ''}
        </p>
      </div>

      {content.isDualLanguage && (
        <div>
          {!translation ? (
            <button onClick={handleTranslate} disabled={loadingTranslation} className="mac-secondary">
              <Languages className="w-3.5 h-3.5" />
              <span>{loadingTranslation ? t('chat.translating') : `Show ${targetLanguageName}`}</span>
            </button>
          ) : (
          <>
            <div className="mt-3 mac-panel p-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-black/10 dark:border-white/10">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {targetLanguageName}
                </span>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                {translation}
              </p>
            </div>

            <button onClick={handleTranslate} className="mt-2 mac-secondary">
              <Globe className="w-3.5 h-3.5" />
              <span>{t('chat.hideTranslation')}</span>
            </button>
          </>
        )}

        {translationError && (
          <div className="mt-2 p-2 rounded-lg bg-red-900/10 dark:bg-red-900/30 border border-red-700/20 dark:border-red-700/50 text-xs text-red-600 dark:text-red-300">
            {translationError}
            <button onClick={handleTranslate} className="ml-2 underline hover:no-underline">
              {t('common.close')}
            </button>
          </div>
        )}
        </div>
      )}
    </div>
  );
}

export default function ChatInterface({ onSaveToHistory, focusSignal, onUserTyping }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatList, setChatList] = useState<ChatTask[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [fieldSort, setFieldSort] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ filename: string; page: number; highlight?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t, lang } = useLang();
  const toast = useToast();

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.info(message);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof focusSignal !== 'undefined') inputRef.current?.focus();
  }, [focusSignal]);

  // Initialize welcome message based on current language
  // Update initial message reactively when language changes
  useEffect(() => {
    if (messages.length === 0 && currentChatId === null) {
      setMessages([
        {
          id: '1',
          type: 'bot',
          content: t('chat.welcomeMessage'),
          timestamp: new Date(),
        },
      ]);
    } else if (messages.length === 1 && messages[0].id === '1' && messages[0].type === 'bot' && currentChatId === null) {
      // Update the initial welcome message when language changes
      setMessages([
        {
          id: '1',
          type: 'bot',
          content: t('chat.welcomeMessage'),
          timestamp: messages[0].timestamp,
        },
      ]);
    }
  }, [lang]);

  useEffect(() => {
    loadChatList();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChatList = async () => {
    try {
      const response = await listTask({ pageNum: 1, pageSize: 100 });
      if (response.code === 200 && response.result?.rows) {
        const chats = response.result.rows.map((task: any) => ({
          id: task.id,
          title: task.formData || task.form_data || t('chat.newChat'),
          createdAt: task.createdAt,
        }));
        setChatList(chats);
      }
    } catch (error) {
      console.error('Failed to load chat list:', error);
    }
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([{
      id: '1',
      type: 'bot',
      content: t('chat.askQuestion'),
      timestamp: new Date(),
    }]);
    setFieldSort(0);
  };

  const pollForResponse = useCallback((taskId: string, newFieldSort: number) => {
    let attempts = 0;
    const maxAttempts = 360;
    let lastContentLength = 0;

    pollingRef.current = setInterval(async () => {
      attempts++;

      try {
        const response = await listTaskOutput({ pageNum: 1, pageSize: 1000, taskId });
        if (response.code === 200 && response.result?.rows) {
          const latestOutput = response.result.rows.find(
            (o: TaskOutput) => o.sort === newFieldSort || o.sort === newFieldSort + 1
          ) || response.result.rows
            .filter((o: TaskOutput) => o.sort >= newFieldSort)
            .sort((a: TaskOutput, b: TaskOutput) => b.sort - a.sort)[0];

          if (latestOutput) {
            const contentText = latestOutput.content || '';
            const contentLen = contentText.length;

            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (updated[lastIndex]?.type === 'bot' &&
                (!updated[lastIndex].taskOutputId || updated[lastIndex].taskOutputId === latestOutput.id)) {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: contentText,
                  status: latestOutput.status,
                  taskOutputId: latestOutput.id,
                };
              }
              return updated;
            });

            if (contentLen > lastContentLength) {
              lastContentLength = contentLen;
              attempts = 0;
            }

            if (latestOutput.status === 'FINISHED' || latestOutput.status === 'FAILED' || latestOutput.status === 'CANCEL') {
              setIsTyping(false);
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              if (contentText) {
                setMessages(prev => {
                  const lastUser = [...prev].reverse().find(m => m.type === 'user');
                  if (lastUser) {
                    onSaveToHistory(lastUser.content || '', contentText, { document: 'HR Policy', page: 1 });
                  }
                  return prev;
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      if (attempts >= maxAttempts) {
        setIsTyping(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        if (lastContentLength === 0) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex]?.type === 'bot' && !updated[lastIndex].content) {
              updated[lastIndex] = { ...updated[lastIndex], content: '⏱️ Response timeout. Please try again.' };
            }
            return updated;
          });
        }
      }
    }, 1000);
  }, [onSaveToHistory]);

  const handleSend = async (overrideInput?: string) => {
    const payload = (overrideInput ?? input).trim();
    if (!payload || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: payload,
      timestamp: new Date(),
    };

    const botPlaceholder: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, botPlaceholder]);
    const currentInput = payload;
    if (overrideInput === undefined) setInput('');
    setIsTyping(true);
    onUserTyping?.(false);

    try {
      let taskId = currentChatId;

      if (!taskId) {
        const createResponse = await addTask({
          type: 'CHAT',
          formData: {},
        });

        if (createResponse.code === 200 && createResponse.result?.taskId) {
          taskId = createResponse.result.taskId;
          setCurrentChatId(taskId);
          setFieldSort(0);
        } else {
          throw new Error('Failed to create chat');
        }
      }

      const newFieldSort = fieldSort + 1;
      setFieldSort(newFieldSort);

      const response = await addTask({
        type: 'CHAT',
        formData: {
          prompt: currentInput,
          fieldSort: newFieldSort,
          fileId: [],
          allFileSearch: true,
          useMcp: false,
          taskId: taskId,
        },
      });

      if (response.code === 200 && response.result?.taskId) {
        const taskId2 = response.result.taskId;
        if (!currentChatId) {
          setCurrentChatId(taskId2);
          loadChatList();
        }
        pollForResponse(taskId2, newFieldSort);
      } else {
        setIsTyping(false);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = 'Sorry, there was an error processing your request.';
          return updated;
        });
      }
    } catch (error) {
      console.error('Send error:', error);
      setIsTyping(false);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'Sorry, there was an error connecting to the server.';
        return updated;
      });
    }
  };

  const handleFeedback = async (messageId: string, emoji: string, taskOutputId?: number) => {
    if (!taskOutputId) return;
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      await sendFeedbackToCache({
        taskOutputId,
        emoji,
        outputContent: message.content,
        question: '',
      });

      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, feedback: { emoji } } : m
      ));
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const stopGeneration = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsTyping(false);
    setMessages(prev => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.type === 'bot' && !lastMsg.content) {
        updated[updated.length - 1] = { ...lastMsg, content: t('chat.generationStopped') };
      }
      return updated;
    });
    showToast(t('chat.generation'), 'info');
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setFieldSort(0);
    showToast(t('chat.chatSaved'), 'success');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && isTyping) stopGeneration();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    onUserTyping?.(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => onUserTyping?.(false), 800);
  };

  const regenerateAt = (botMessageId: string) => {
    if (isTyping) return;
    const idx = messages.findIndex(m => m.id === botMessageId);
    if (idx <= 0) return;
    const prevUser = [...messages].slice(0, idx).reverse().find(m => m.type === 'user');
    if (!prevUser) return;
    showToast(t('chat.regen'), 'info');
    handleSend(prevUser.content);
  };

  return (
    <div className="flex h-full flex-col md:flex-row mac-root">
      {showExportDialog && (
        <ChatExport
          messages={messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
            timestamp: m.timestamp?.toLocaleTimeString(),
          }))}
          chatTitle={chatList.find(c => c.id === currentChatId)?.title || 'Chat Export'}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title={t('chat.deleteChatTitle')}
        message={t('chat.deleteChatConfirm', { title: confirmDelete?.title || 'this chat' })}
        confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={async () => {
          if (confirmDelete) {
            try {
              if (confirmDelete.id) {
                await deleteTaskOutput(confirmDelete.id);
                setChatList(prev => prev.filter(c => c.id !== confirmDelete.id));
                if (currentChatId === confirmDelete.id) startNewChat();
                showToast(t('chat.deleted'), 'success');
              } else {
                clearChat();
                showToast(t('chat.cleared'), 'success');
              }
            } catch (error) {
              showToast(t('chat.deleteFailed'), 'error');
            }
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <div className="flex-1 flex flex-col bg-transparent">
        <div className={`flex-1 min-h-0 mac-scroll pb-20 ${messages.length > 0 && messages.some(m => m.type === 'user') ? 'overflow-y-auto' : 'overflow-hidden'} overflow-x-hidden`}>
          {Array.isArray(messages) && messages.length === 0 && (
            <div className="text-center text-slate-500 dark:text-slate-400">
              <Bot className="w-12 h-12 mx-auto mb-3 text-[#1e228a] dark:text-[#00CCFF] opacity-60" />
              <p className="text-sm">{t('chat.askQuestion')}</p>
            </div>
          )}
          <div className="w-full space-y-4">
          {Array.isArray(messages) && messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fadeIn`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center`}
                style={
                  message.type === 'user'
                    ? { backgroundImage: 'linear-gradient(135deg, var(--c-accent), var(--c-accent-strong))' }
                    : undefined
                }
              >
                {message.type === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-[#1e228a] dark:text-[#00CCFF]" />
                )}
              </div>

              <div
                className={`flex-1 max-w-full sm:max-w-[80%] md:max-w-[60%] ${
                  message.type === 'user' ? 'items-end' : 'items-start'
                } flex flex-col gap-2`}
              >
                {/* ✅ Reference-style mac glass bubble */}
                <div
                  className={[
                    "px-4 py-3 mac-glass-bubble",
                    message.type === "user" ? "mac-glass-user" : "mac-glass-bot",
                  ].join(" ")}
                >
                  {message.type === 'bot' ? (
                    message.content ? (
                      (() => {
                        try {
                          const parsed = parseDualLanguageContent(message.content);
                          const isInitialMessage = messages.indexOf(message) === 0;
                          return (
                            <>
                              <DualLanguageMessage content={parsed} taskOutputId={message.taskOutputId} />
                              {!isInitialMessage && (
                                <MessageActions
                                  content={message.content}
                                  messageId={message.id}
                                  onFeedback={(id, fb) => {
                                    const emoji = fb === 'like' ? '👍' : '👎';
                                    handleFeedback(id, emoji, message.taskOutputId);
                                    showToast(fb === 'like' ? t('chat.like') : t('chat.dislike'), 'success');
                                  }}
                                  onRegenerate={() => regenerateAt(message.id)}
                                />
                              )}
                            </>
                          );
                        } catch (error) {
                          console.error('Error rendering message:', error);
                          const isInitialMessage = messages.indexOf(message) === 0;
                          return (
                            <>
                              <div className="space-y-3">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                                  {message.content}
                                </p>
                                <DualLanguageMessage
                                  content={{
                                    isDualLanguage: false,
                                    isSingleLanguage: false,
                                    rawContent: message.content,
                                    content: message.content,
                                  }}
                                  taskOutputId={message.taskOutputId}
                                />
                              </div>
                              {!isInitialMessage && (
                                <MessageActions
                                  content={message.content}
                                  messageId={message.id}
                                  onFeedback={(id, fb) => {
                                    const emoji = fb === 'like' ? '👍' : '👎';
                                    handleFeedback(id, emoji, message.taskOutputId);
                                    showToast(fb === 'like' ? t('chat.like') : t('chat.dislike'), 'success');
                                  }}
                                  onRegenerate={() => regenerateAt(message.id)}
                                />
                              )}
                            </>
                          );
                        }
                      })()
                    ) : (
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )
                  ) : (
                    <div className="group/msg relative">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-900 dark:text-slate-100">
                        {message.content}
                      </p>
                      {message.type === 'user' && !isTyping && (
                        <button
                          onClick={() => {
                            setInput(message.content);
                            inputRef.current?.focus();
                          }}
                          className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover/msg:opacity-100 text-slate-400 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-opacity"
                          title="Edit & resend"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {message.source && (
                  <SourceCitation
                    document={message.source.document}
                    page={message.source.page}
                    excerpt={message.content.slice(0, 100)}
                    onClick={() => setPdfPreview({
                      filename: message.source!.document,
                      page: message.source!.page,
                      highlight: message.content.slice(0, 50),
                    })}
                  />
                )}

                <span className="text-xs text-slate-500 dark:text-slate-400 px-2 hidden sm:inline">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          </div>
        </div>

        {pdfPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPdfPreview(null)} />
            <div className="relative w-full max-w-4xl">
              <PDFPreview
                filename={pdfPreview.filename}
                pageNumber={pdfPreview.page}
                highlightText={pdfPreview.highlight}
                onClose={() => setPdfPreview(null)}
              />
            </div>
          </div>
        )}

        {/* ✅ FIXED: bottom area now true glass in dark + clean in light */}
        <div className="fixed bottom-0 left-0 right-0 p-4 mac-inputbar" style={{ zIndex: 10 }}>
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <button onClick={startNewChat} className="mac-toolbarbtn" title={t('chat.newChat')}>
                <Plus className="w-4 h-4" />
              </button>

              <button
                onClick={() => setConfirmDelete({ id: currentChatId || '', title: chatList.find(c => c.id === currentChatId)?.title || t('chat.deleteChat') })}
                className="mac-toolbarbtn"
                title={t('chat.clearHistory')}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="w-px h-5 bg-black/10 dark:bg-white/10" />

              <button onClick={() => setShowExportDialog(true)} className="mac-toolbarbtn" title={t('chat.exportChat')}>
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.askQuestion')}
                rows={1}
                className="mac-textarea"
                style={{ minHeight: '48px', maxHeight: '150px' }}
              />
            </div>
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} className="mac-sendbtn">
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">{t('chat.send')}</span>
            </button>

            {isTyping && (
              <button onClick={stopGeneration} className="mac-stopbtn" title={`${t('chat.stop')} (Esc)`}>
                <StopCircle className="w-4 h-4" />
                <span className="text-xs">{t('chat.stop')}</span>
              </button>
            )}
          </div>

          {input.length > 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-right">
              {input.length} chars
            </div>
          )}
        </div>

        <style>{`
          /* =========================================================
             Fixes based on your screenshots:
             ✅ Dark mode bottom bar becomes glass (no white block)
             ✅ Light mode becomes clean + premium (no "ugly grey")
             ========================================================= */

          .mac-root{
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
          }

          /* Page / container backdrop (LIGHT) */
          .mac-window{
            background:
              radial-gradient(1100px 800px at 18% 10%, rgba(60,130,255,0.14), transparent 55%),
              radial-gradient(900px 700px at 85% 18%, rgba(140,80,255,0.10), transparent 55%),
              radial-gradient(900px 700px at 55% 90%, rgba(70,200,180,0.08), transparent 58%),
              linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,255,255,0.70));
          }

          /* Page / container backdrop (DARK) */
          .dark .mac-window{
            background:
              radial-gradient(1100px 800px at 18% 10%, rgba(60,130,255,0.20), transparent 55%),
              radial-gradient(900px 700px at 85% 18%, rgba(140,80,255,0.16), transparent 55%),
              radial-gradient(900px 700px at 55% 90%, rgba(70,200,180,0.10), transparent 58%),
              linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.78));
          }

          /* Chat surface behind bubbles (LIGHT) */
          .mac-glass-surface{
            background:
              radial-gradient(900px 600px at 20% 20%, rgba(255,255,255,0.55), transparent 65%),
              radial-gradient(700px 500px at 80% 30%, rgba(255,255,255,0.35), transparent 65%),
              linear-gradient(180deg, rgba(255,255,255,0.30), rgba(255,255,255,0.16));
            border-top: 1px solid rgba(0,0,0,0.05);
          }

          /* Chat surface behind bubbles (DARK) */
          .dark .mac-glass-surface{
            background:
              radial-gradient(900px 600px at 20% 20%, rgba(255,255,255,0.05), transparent 60%),
              radial-gradient(700px 500px at 80% 30%, rgba(255,255,255,0.04), transparent 60%),
              linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0.38));
            border-top: 1px solid rgba(255,255,255,0.06);
          }

          /* Reference-style glass bubble */
          .mac-glass-bubble{
            position: relative;
            border-radius: 22px;
            overflow: hidden;
            background: rgba(255,255,255,0.32);
            border: 1px solid rgba(255,255,255,0.50);

            backdrop-filter: blur(30px) saturate(135%);
            -webkit-backdrop-filter: blur(30px) saturate(135%);

            box-shadow:
              0 18px 55px rgba(15,23,42,0.12),
              inset 0 1px 0 rgba(255,255,255,0.45);

            transform: translateZ(0);
          }

          .mac-glass-bubble::before{
            content:"";
            position:absolute;
            inset:-2px;
            pointer-events:none;
            background:
              radial-gradient(900px 260px at 18% 0%,
                rgba(255,255,255,0.42),
                rgba(255,255,255,0.14) 35%,
                transparent 62%);
            opacity: 1;
          }

          .mac-glass-bubble::after{
            content:"";
            position:absolute;
            inset:-40px;
            pointer-events:none;
            background:
              radial-gradient(320px 240px at 12% 22%,
                rgba(255,255,255,0.28),
                transparent 65%),
              radial-gradient(420px 320px at 92% 34%,
                rgba(255,255,255,0.20),
                transparent 70%),
              radial-gradient(520px 420px at 72% 92%,
                rgba(255,255,255,0.14),
                transparent 72%);
            filter: blur(7px);
            opacity: 0.95;
          }

          .mac-glass-user{
            background: rgba(120,170,255,0.26);
            border-color: rgba(170,210,255,0.45);
          }

          .mac-glass-bot{
            background: rgba(255,255,255,0.26);
            border-color: rgba(255,255,255,0.42);
          }

          .dark .mac-glass-bubble{
            background: rgba(20,20,20,0.34);
            border-color: rgba(255,255,255,0.14);
            box-shadow:
              0 24px 70px rgba(0,0,0,0.45),
              inset 0 1px 0 rgba(255,255,255,0.10);
            backdrop-filter: blur(34px) saturate(135%);
            -webkit-backdrop-filter: blur(34px) saturate(135%);
          }
          .dark .mac-glass-user{
            background: linear-gradient(135deg, rgba(0,204,255,0.25) 0%, rgba(0,204,255,0.15) 100%);
            border: 1px solid rgba(0,204,255,0.3);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,204,255,0.15), inset 0 1px 0 rgba(0,204,255,0.2);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
          .dark .mac-glass-bot{
            background: linear-gradient(135deg, rgba(0,204,255,0.2) 0%, rgba(0,204,255,0.12) 100%);
            border: 1px solid rgba(0,204,255,0.2);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,204,255,0.1), inset 0 1px 0 rgba(0,204,255,0.15);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }

          /* Scrollbar */
          .mac-scroll::-webkit-scrollbar { width: 10px; }
          .mac-scroll::-webkit-scrollbar-thumb {
            background: rgba(0,0,0,0.18);
            border-radius: 999px;
            border: 3px solid transparent;
            background-clip: content-box;
          }
          .dark .mac-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.18);
            border: 3px solid transparent;
            background-clip: content-box;
          }

          /* ✅ Bottom bar (LIGHT) -> premium glass, not white slab */
          .mac-inputbar{
            border-top: 1px solid rgba(0,0,0,0.06);
            background: rgba(255,255,255,0.55);
            backdrop-filter: blur(26px) saturate(140%);
            -webkit-backdrop-filter: blur(26px) saturate(140%);
            box-shadow: 0 -12px 30px rgba(15,23,42,0.06);
          }

          /* ✅ Bottom bar (DARK) -> REAL glass */
          .dark .mac-inputbar{
            border-top: 1px solid rgba(255,255,255,0.10);
            background: rgba(10,10,10,0.35);
            backdrop-filter: blur(30px) saturate(150%);
            -webkit-backdrop-filter: blur(30px) saturate(150%);
            box-shadow: 0 -14px 40px rgba(0,0,0,0.35);
          }

          /* Buttons */
          .mac-toolbarbtn{
            padding: 8px;
            border-radius: 10px;
            border: 1px solid rgba(0,0,0,0.08);
            background: rgba(255,255,255,0.60);
            color: rgba(15,23,42,0.70);
            backdrop-filter: blur(16px) saturate(140%);
            -webkit-backdrop-filter: blur(16px) saturate(140%);
            transition: transform .15s ease, background .15s ease;
          }
          .mac-toolbarbtn:hover{ background: rgba(255,255,255,0.75); transform: translateY(-1px); }
          .mac-toolbarbtn:active{ transform: translateY(0) scale(0.98); }

          .dark .mac-toolbarbtn{
            border-color: rgba(255,255,255,0.10);
            background: rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.78);
          }
          .dark .mac-toolbarbtn:hover{ background: rgba(255,255,255,0.12); }

          .mac-stopbtn{
            padding: 8px 10px;
            border-radius: 12px;
            border: 1px solid rgba(239,68,68,0.25);
            background: rgba(239,68,68,0.10);
            color: rgba(239,68,68,0.9);
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          /* Textarea */
          .mac-textarea{
            width: 100%;
            padding: 12px 14px;
            border-radius: 14px;
            border: 1px solid rgba(0,0,0,0.10);
            background: rgba(255,255,255,0.65);
            color: rgba(15,23,42,0.92);
            outline: none;
            resize: none;
            backdrop-filter: blur(18px) saturate(140%);
            -webkit-backdrop-filter: blur(18px) saturate(140%);
            box-shadow: 0 10px 28px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.55);
          }
          .mac-textarea:focus{
            border-color: rgba(110,160,255,0.55);
            box-shadow: 0 0 0 4px rgba(110,160,255,0.14);
          }

          .dark .mac-textarea{
            border-color: rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.90);
            box-shadow: 0 12px 34px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08);
          }
          .dark .mac-textarea:focus{
            border-color: rgba(110,160,255,0.45);
            box-shadow: 0 0 0 4px rgba(110,160,255,0.18);
          }

          /* Send button */
          .mac-sendbtn{
            padding: 12px 16px;
            border-radius: 14px;
            border: 1px solid #1e228a;
            background: #1e228a;
            color: white;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: transform .15s ease, background .15s ease, opacity .15s ease;
          }
          .mac-sendbtn:hover{ background: #161a5a; transform: translateY(-1px); }
          .mac-sendbtn:active{ transform: translateY(0) scale(0.98); }
          .mac-sendbtn:disabled{ opacity: .45; cursor: not-allowed; transform: none; }

          .dark .mac-sendbtn{
            border-color: #00CCFF;
            background: #00CCFF;
            color: #000000;
          }
          .dark .mac-sendbtn:hover{ background: #0099cc; }

          /* Small helpers */
          .mac-kbd{
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 10px;
            background: rgba(255,255,255,0.60);
            border: 1px solid rgba(0,0,0,0.08);
          }
          .dark .mac-kbd{
            background: rgba(255,255,255,0.10);
            border-color: rgba(255,255,255,0.10);
          }

          .mac-iconbtn{
            padding: 6px;
            border-radius: 10px;
            border: 1px solid rgba(0,0,0,0.08);
            background: rgba(255,255,255,0.60);
            color: rgba(15,23,42,0.70);
            transition: transform .15s ease, background .15s ease;
          }
          .mac-iconbtn:hover{ background: rgba(255,255,255,0.75); transform: translateY(-1px); }
          .mac-iconbtn:active{ transform: translateY(0) scale(0.98); }

          .dark .mac-iconbtn{
            border-color: rgba(255,255,255,0.10);
            background: rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.85);
          }
          .dark .mac-iconbtn:hover{ background: rgba(255,255,255,0.12); }

          .mac-iconbtn-active-good{
            background: rgba(16,185,129,0.18) !important;
            border-color: rgba(16,185,129,0.24) !important;
            color: rgba(16,185,129,0.95) !important;
          }
          .mac-iconbtn-active-bad{
            background: rgba(239,68,68,0.16) !important;
            border-color: rgba(239,68,68,0.22) !important;
            color: rgba(239,68,68,0.95) !important;
          }

          .mac-secondary{
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.08);
            background: rgba(255,255,255,0.55);
            color: rgba(15,23,42,0.78);
          }
          .mac-secondary:hover{ background: rgba(255,255,255,0.72); }

          .dark .mac-secondary{
            border-color: rgba(255,255,255,0.10);
            background: rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.86);
          }
          .dark .mac-secondary:hover{ background: rgba(255,255,255,0.12); }
.mac-panel{
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.08);
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
  box-shadow: 0 12px 32px rgba(15,23,42,0.08);
}

.dark .mac-panel{
  border-color: rgba(255,255,255,0.12);
  background: rgba(20,20,20,0.35);
  backdrop-filter: blur(26px) saturate(150%);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
  box-shadow: 0 18px 48px rgba(0,0,0,0.45);
}

          .mac-modal{
            border-radius: 16px;
            border: 1px solid rgba(0,0,0,0.10);
            background: rgba(255,255,255,0.72);
            backdrop-filter: blur(30px) saturate(150%);
            -webkit-backdrop-filter: blur(30px) saturate(150%);
            box-shadow: 0 30px 80px rgba(0,0,0,0.28);
          }
          .dark .mac-modal{
            border-color: rgba(255,255,255,0.12);
            background: rgba(20,20,20,0.60);
            box-shadow: 0 30px 80px rgba(0,0,0,0.50);
          }

          .mac-modal-header{
            display:flex;
            align-items:center;
            justify-content:space-between;
            padding:14px 16px;
            border-bottom: 1px solid rgba(0,0,0,0.08);
          }
          .dark .mac-modal-header{
            border-bottom: 1px solid rgba(255,255,255,0.10);
          }

          .mac-menuitem{
            width:100%;
            text-align:left;
            padding:10px 12px;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.08);
            background: rgba(255,255,255,0.55);
            color: rgba(15,23,42,0.88);
            transition: background .15s ease, transform .15s ease;
          }
          .mac-menuitem:hover{ background: rgba(255,255,255,0.72); transform: translateY(-1px); }

          .dark .mac-menuitem{
            border-color: rgba(255,255,255,0.10);
            background: rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.90);
          }
          .dark .mac-menuitem:hover{ background: rgba(255,255,255,0.12); }

          .mac-primary{
            padding: 10px 14px;
            border-radius: 12px;
            border: 1px solid rgba(110,160,255,0.25);
            background: linear-gradient(180deg, rgba(110,160,255,0.92), rgba(70,110,255,0.92));
            color: white;
            font-weight: 600;
            box-shadow: 0 16px 34px rgba(70,110,255,0.22);
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        `}</style>
      </div>
    </div>
  );
}

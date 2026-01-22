import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, Bot, User, Globe, Languages, Copy, ThumbsUp, ThumbsDown, 
  RefreshCw, Check, Share2, Plus, Trash2, StopCircle,
  Download, X
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

  // Log the raw content for debugging
  console.log('[parseDualLanguageContent] Raw content (first 500 chars):', content.substring(0, 500));
  console.log('[parseDualLanguageContent] Content length:', content.length);
  console.log('[parseDualLanguageContent] Content includes SINGLE_LANG markers:', content.includes('SINGLE_LANG_START'));
  console.log('[parseDualLanguageContent] Content includes DUAL_LANG markers:', content.includes('DUAL_LANG_START'));

  // First, try to parse the NEW single-language format
  const singleLangMatch = content.match(/<!--SINGLE_LANG_START-->([\s\S]*?)<!--SINGLE_LANG_END-->/);
  if (singleLangMatch && singleLangMatch[1]) {
    try {
      const jsonStr = singleLangMatch[1].trim();
      console.log('[parseDualLanguageContent] Found SINGLE_LANG markers, JSON length:', jsonStr.length);
      console.log('[parseDualLanguageContent] JSON content (first 300 chars):', jsonStr.substring(0, 300));
      
      if (!jsonStr || jsonStr.length === 0) {
        console.error('[parseDualLanguageContent] JSON string is empty between markers');
        throw new Error('Empty JSON between markers');
      }
      
      // Validate that this looks like JSON before parsing
      if (!jsonStr.includes('{') && !jsonStr.includes('}')) {
        console.warn('[parseDualLanguageContent] JSON string does not contain object brackets');
        throw new Error('Invalid JSON format');
      }

      const parsed = JSON.parse(jsonStr);
      console.log('[parseDualLanguageContent] Parsed SINGLE-LANGUAGE format');
      console.log(`  - language: ${parsed.language}`);
      console.log(`  - translationPending: ${parsed.translationPending}`);
      console.log(`  - content: ${parsed.content?.substring(0, 50)}...`);
      
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
      if (singleLangMatch[1]) {
        console.error('[parseDualLanguageContent] Failed to parse JSON:', singleLangMatch[1].substring(0, 200));
      }
      // Don't return yet, try other formats
    }
  }
  
  // Try stripping HTML tags that might be wrapping the content
  let cleanContent = content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/<!--SINGLE_LANG_START-->/g, '')
    .replace(/<!--SINGLE_LANG_END-->/g, '')
    .replace(/<!--DUAL_LANG_START-->/g, '')
    .replace(/<!--DUAL_LANG_END-->/g, '')
    .trim();
  
  // Try to parse JSON format first (new format)
  // More robust regex that handles potential line breaks and whitespace
  const jsonMatch = cleanContent.match(/\{[\s\S]*?"dualLanguage"\s*:\s*true[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[0];
      
      // Validate before parsing
      if (!jsonStr || jsonStr.trim().length === 0) {
        throw new Error('Empty JSON string');
      }

      const parsed = JSON.parse(jsonStr);
      console.log('[parseDualLanguageContent] Parsed DUAL-LANGUAGE JSON');
      console.log(`  - targetLanguage: ${parsed.targetLanguage}`);
      console.log(`  - japanese: ${typeof parsed.japanese} (${parsed.japanese?.substring(0, 50)}...)`);
      console.log(`  - translated: ${typeof parsed.translated} (${parsed.translated?.substring(0, 50)}...)`);
      
      if (parsed.dualLanguage) {
        // Extract actual text content, cleaning any nested JSON
        let jaText = parsed.japanese || '';
        let enText = parsed.translated || '';
        
        console.log('[parseDualLanguageContent] Before cleaning:');
        console.log(`  - jaText length: ${jaText.length}`);
        console.log(`  - enText length: ${enText.length}`);
        
        // If japanese or translated fields contain JSON, extract the actual text
        if (typeof jaText === 'string' && jaText.includes('"dualLanguage"')) {
          try {
            const nestedJson = JSON.parse(jaText.match(/\{[\s\S]*\}/)?.[0] || '{}');
            jaText = nestedJson.japanese || nestedJson.translated || jaText.replace(/\{[\s\S]*\}/g, '').trim();
          } catch { /* use as-is */ }
        }
        if (typeof enText === 'string' && enText.includes('"dualLanguage"')) {
          try {
            const nestedJson = JSON.parse(enText.match(/\{[\s\S]*\}/)?.[0] || '{}');
            enText = nestedJson.translated || nestedJson.english || enText.replace(/\{[\s\S]*\}/g, '').trim();
          } catch { /* use as-is */ }
        }
        
        // Clean any remaining JSON artifacts from the text
        jaText = jaText.replace(/\{[\s\S]*?"dualLanguage"[\s\S]*?\}/g, '').trim();
        enText = enText.replace(/\{[\s\S]*?"dualLanguage"[\s\S]*?\}/g, '').trim();
        
        console.log('[parseDualLanguageContent] Final values:');
        console.log(`  - jaText: ${jaText.substring(0, 50)}...`);
        console.log(`  - enText: ${enText.substring(0, 50)}...`);
        console.log(`  - targetLanguage from JSON: ${parsed.targetLanguage}`);
        
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
      if (jsonMatch[0]) {
        console.error('[parseDualLanguageContent] Failed JSON string (first 200 chars):', jsonMatch[0]?.substring(0, 200));
      }
      // Continue to other formats
    }
  }
  
  // Try [EN]/[JA] format
  const enMatch = cleanContent.match(/\[EN\]\s*([\s\S]*?)(?=\[JA\]|$)/i);
  const jaMatch = cleanContent.match(/\[JA\]\s*([\s\S]*?)(?=\[EN\]|$)/i);
  
  if (enMatch && jaMatch) {
    const englishText = enMatch[1].trim();
    const japaneseText = jaMatch[1].trim();
    
    if (englishText && japaneseText) {
      // Determine user language based on order in content
      const enIndex = cleanContent.indexOf('[EN]');
      const jaIndex = cleanContent.indexOf('[JA]');
      const userLangFirst = enIndex < jaIndex ? 'en' : 'ja';
      
      // Assign based on user language: user's language is the original, other is translation
      return {
        isDualLanguage: true,
        isSingleLanguage: false,
        japanese: japaneseText,           // Always store Japanese text in 'japanese' field
        translated: englishText,          // Always store English text in 'translated' field
        targetLanguage: userLangFirst,    // Store which language the user asked in
        rawContent: content,
      };
    }
  }
  
  // Try splitting by common separators (---) 
  const parts = cleanContent.split(/\n---+\n/);
  if (parts.length >= 2) {
    // Check if second part looks like Japanese
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
  
  // Return clean content as single language with all required fields
  console.log('[parseDualLanguageContent] No recognized format found, returning as plain text');
  console.log('[parseDualLanguageContent] Returning cleaned content:', cleanContent.substring(0, 100));
  
  // Even if no markers found, try to detect if this looks like it should have been JSON
  if (cleanContent.startsWith('{') && cleanContent.includes('dualLanguage')) {
    console.log('[parseDualLanguageContent] Content looks like JSON but markers were missing, trying direct parse');
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
      console.error('[parseDualLanguageContent] Direct JSON parse also failed:', e);
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

// Action buttons component for bot messages (Chatllama3.2:latest style)
interface MessageActionsProps {
  content: string;
  messageId: string;
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void;
  onRegenerate?: () => void;
}

function MessageActions({ content, messageId, onFeedback, onRegenerate }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const { t } = useLang();
  const toast = useToast();
  const handleCopy = async () => {
    // Parse and extract clean text
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

  const handleShare = async () => {
    setShowShareModal(true);
  };

  const handleShareAction = async (method: 'email' | 'teams' | 'outlook' | 'clipboard') => {
    const parsed = parseDualLanguageContent(content);
    const textToShare = parsed.isDualLanguage 
      ? (parsed.translated || parsed.japanese || parsed.rawContent)
      : parsed.rawContent;
    
    if (method === 'clipboard') {
      await navigator.clipboard.writeText(textToShare);
      toast.success(t('chatActions.copied'));
    } else if (method === 'email') {
      const subject = encodeURIComponent(t('chatActions.shareSubject'));
      const body = encodeURIComponent(`${t('chatActions.shareMessage')}\n\n${textToShare}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } else if (method === 'teams') {
      // Teams deep link: Simplified share (in production, use Teams SDK)
      const msg = `${t('chatActions.shareMessage')}\n\n${textToShare}`;
      await navigator.clipboard.writeText(msg);
      toast.success(t('chatActions.shareSubject'));
    } else if (method === 'outlook') {
      const subject = encodeURIComponent(t('chatActions.shareSubject'));
      const body = encodeURIComponent(`${t('chatActions.shareMessage')}\n\n${textToShare}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
    setShowShareModal(false);
  };

  return (
    <>
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-600">
        {/* Copy */}
        <button
    onClick={handleCopy}
    className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 transition-all duration-200"
    title={t('chatActions.copy')}
  >
    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
  </button>

  {/* Like */}
  <button
    onClick={() => handleFeedback('like')}
    className={`p-1.5 rounded-md transition-all duration-200 ${
      feedback === 'like'
        ? 'text-green-400 bg-green-400/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'
    }`}
    title={t('chatActions.good')}
  >
    <ThumbsUp className="w-4 h-4" />
  </button>

  {/* Dislike */}
  <button
    onClick={() => handleFeedback('dislike')}
    className={`p-1.5 rounded-md transition-all duration-200 ${
      feedback === 'dislike'
        ? 'text-red-400 bg-red-400/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'
    }`}
    title={t('chatActions.bad')}
  >
    <ThumbsDown className="w-4 h-4" />
  </button>

  {/* Share */}
  <button
    onClick={handleShare}
    className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 transition-all duration-200"
    title={t('chatActions.share')}
  >
    <Share2 className="w-4 h-4" />
  </button>

  {/* Regenerate */}
  <button
    onClick={onRegenerate}
    className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 transition-all duration-200"
    title={t('chatActions.regenerate')}
  >
    <RefreshCw className="w-4 h-4" />
  </button>

      </div>

    {/* Share Modal */}
    {showShareModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowShareModal(false)} />
        <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-700">
            <h2 className="text-lg font-semibold text-slate-100">{t('chatActions.shareTitle')}</h2>
            <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-200 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Preview */}
            <div>
              <p className="text-sm font-medium text-slate-200 mb-2">{t('chatActions.sharePreview')}:</p>
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 max-h-24 overflow-y-auto text-xs text-slate-400">
                {parseDualLanguageContent(content).rawContent.substring(0, 200)}...
              </div>
            </div>

            {/* Share Options */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-200">{t('chatActions.shareRecipient')}</p>
              <button onClick={() => handleShareAction('email')} className="w-full p-3 text-left bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition-all duration-200">
                📧 {t('chatActions.shareEmail')}
              </button>
              <button onClick={() => handleShareAction('teams')} className="w-full p-3 text-left bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition-all duration-200">
                💬 {t('chatActions.shareTeams')}
              </button>
              <button onClick={() => handleShareAction('clipboard')} className="w-full p-3 text-left bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 transition-all duration-200">
                📋 {t('chatActions.shareEmail')}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-slate-700 bg-slate-800">
            <button onClick={() => setShowShareModal(false)} className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-[#1d2089] to-[#0E4BD9] hover:from-[#2d3a9d] hover:to-[#1a5ce0] text-white transition-all duration-200">
              {t('chatActions.cancelButton')}
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  );
}

// Component for displaying dual-language content side by side
// User's language is shown first (column 1), translation second (column 2)
function DualLanguageMessage({ content, taskOutputId }: { content: DualLanguageContent; taskOutputId?: number }) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const { t } = useLang();
  const toast = useToast();

  // Determine the source language from content
  let sourceLanguage: 'ja' | 'en' = 'en';
  let targetLanguage: 'ja' | 'en' = 'ja';
  let displayText = '';

  if (content.isSingleLanguage && content.language) {
    // New single-language format with explicit language
    sourceLanguage = content.language;
    targetLanguage = content.language === 'ja' ? 'en' : 'ja';
    displayText = content.content || '';
  } else if (content.isDualLanguage) {
    // Old dual-language format
    sourceLanguage = content.targetLanguage === 'ja' ? 'ja' : 'en';
    targetLanguage = sourceLanguage === 'ja' ? 'en' : 'ja';
    displayText = sourceLanguage === 'ja' ? content.japanese : content.translated;
  } else {
    // Plain text fallback
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

    // Set 5-minute timeout for translation (increased from 2 minutes)
    const translationTimeoutId = setTimeout(() => {
      setLoadingTranslation(false);
      const errorMsg = sourceLanguage === 'ja' 
        ? '翻訳タイムアウト(5分以上かかりました。サーバーが忙しい可能性があります。)'
        : 'Translation timeout (took more than 5 minutes). Please try again.';
      setTranslationError(errorMsg);
      console.error('[Translation] STEP 6: Timeout after 5 minutes');
    }, 300000); // 5 minutes (increased from 120000)

    try {
      if (!taskOutputId) {
        const errorMsg = sourceLanguage === 'ja' 
          ? 'メッセージIDが見つかりません'
          : 'Unable to find message ID for translation';
        setTranslationError(errorMsg);
        clearTimeout(translationTimeoutId);
        return;
      }

      console.log('[Translation] STEP 6: Starting on-demand translation:', {
        outputId: taskOutputId,
        sourceLanguage,
        targetLanguage,
        contentLength: displayText.length,
      });

      console.log('[Translation] STEP 6: Fetch URL:', '/dev-api/api/gen-task/translate-on-demand');
      console.log('[Translation] Request body:', {
        outputId: taskOutputId,
        targetLanguage: targetLanguage,
      });

      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/dev-api/api/gen-task/translate-on-demand', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          outputId: taskOutputId,
          targetLanguage: targetLanguage,
        }),
      });

      console.log('[Translation] Response status:', response.status, response.statusText);
      console.log('[Translation] Response headers:', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
      });

      // Read response as text first to handle errors better
      const responseText = await response.text();
      console.log('[Translation] Raw response text (first 500 chars):', responseText.substring(0, 500));

      if (!response.ok) {
        console.error('[Translation] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        });
        
        // Try to parse error as JSON
        let errorMessage = response.statusText;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || response.statusText;
        } catch {
          // If not JSON, use plain text
          errorMessage = responseText || response.statusText;
        }
        
        throw new Error(`API Error [${response.status}]: ${errorMessage}`);
      }

      // Parse successful response
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Server returned empty response');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[Translation] JSON parse error:', parseError);
        console.error('[Translation] Failed to parse:', responseText.substring(0, 300));
        throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      
      console.log('[Translation] Parsed response:', {
        hasResult: !!data.result,
        hasContent: !!data.result?.content,
        code: data.code,
        message: data.message,
      });

      if (data.result?.content) {
        setTranslation(data.result.content);
      } else {
        throw new Error(`No translation content in response. Got: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('[Translation] Full error details:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setTranslationError(errorMsg);
    } finally {
      setLoadingTranslation(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Source Language Content */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2">
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-semibold text-blue-400">
            {sourceLanguageName}
          </span>
        </div>

        <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-100">
          {displayText || ''}
        </p>
      </div>

      {/* Translation Button - Always Show */}
      <div>
        {!translation ? (
          <button
            onClick={handleTranslate}
            disabled={loadingTranslation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>
              {loadingTranslation ? 'Translating...' : `Show ${targetLanguageName}`}
            </span>
          </button>
        ) : (
          <>
            <div className="mt-3 p-4 rounded-xl bg-slate-700 border border-slate-600 shadow-lg transition-colors">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-600">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-200">
                  {targetLanguageName}
                </span>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-100">
                {translation}
              </p>
            </div>

            <button
              onClick={handleTranslate}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white transition-all duration-200"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Hide Translation</span>
            </button>
          </>
        )}

        {translationError && (
          <div className="mt-2 p-2 rounded-lg bg-red-900/30 border border-red-700/50 text-xs text-red-300">
            {translationError}
            <button
              onClick={handleTranslate}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatInterface({ onSaveToHistory, focusSignal, onUserTyping }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your HR Policy Assistant. I can help you with questions about company policies, benefits, leave, remote work, and more. You can ask in English or Japanese (日本語でも質問できます).',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatList, setChatList] = useState<ChatTask[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  // const [showHistory, setShowHistory] = useState(false);
  const [fieldSort, setFieldSort] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ filename: string; page: number; highlight?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Get translations
  const { t } = useLang();
  
  // Toast notifications from context
  const toast = useToast();

  // Show toast notification (wrapper for compatibility)
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

  // Focus input when requested
  useEffect(() => {
    if (typeof focusSignal !== 'undefined') {
      inputRef.current?.focus();
    }
  }, [focusSignal]);

  // Load chat list on mount
  useEffect(() => {
    loadChatList();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
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

  // Load chat messages helper (currently unused; sidebar selection not present)
  // const loadChatMessages = async (taskId: string) => { /* ... */ };

  // selectChat reserved for future sidebar list usage
  // const selectChat = (chatId: string) => {
  //   setCurrentChatId(chatId);
  //   loadChatMessages(chatId);
  //   setShowHistory(false);
  // };

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

  // const deleteChat = async (chatId: string, e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   try {
  //     await deleteTaskOutput(chatId);
  //     setChatList(prev => prev.filter(chat => chat.id !== chatId));
  //     if (currentChatId === chatId) {
  //       startNewChat();
  //     }
  //   } catch (error) {
  //     console.error('Failed to delete chat:', error);
  //   }
  // };

  const pollForResponse = useCallback((taskId: string, newFieldSort: number) => {
    let attempts = 0;
    const maxAttempts = 180; // up to 3 minutes, reset on progress
    let lastContentLength = 0;

    pollingRef.current = setInterval(async () => {
      attempts++;

      try {
        const response = await listTaskOutput({ pageNum: 1, pageSize: 1000, taskId });
        if (response.code === 200 && response.result?.rows) {
          // Find output matching the sort field (try exact match first, then +1)
          const latestOutput = response.result.rows.find(
            (o: TaskOutput) => o.sort === newFieldSort || o.sort === newFieldSort + 1
          ) || response.result.rows
            .filter((o: TaskOutput) => o.sort >= newFieldSort)
            .sort((a: TaskOutput, b: TaskOutput) => b.sort - a.sort)[0];

          if (latestOutput) {
            const contentText = latestOutput.content || '';
            const contentLen = contentText.length;

            // Update message even if content is empty (to show status)
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

            // Reset timeout counter if content grows
            if (contentLen > lastContentLength) {
              lastContentLength = contentLen;
              attempts = 0; // give more time on progress
            }

            // Stop polling only when terminal status
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
          } else if (attempts > 5) {
            console.log('[DEBUG] No output found. All outputs:', response.result.rows.map((o: TaskOutput) => ({
              id: o.id,
              sort: o.sort,
              status: o.status,
              hasContent: !!o.content
            })));
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
        // Only show timeout if no content ever arrived
        if (lastContentLength === 0) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex]?.type === 'bot' && !updated[lastIndex].content) {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: '⏱️ Response timeout. Please try again.',
              };
            }
            return updated;
          });
        }
      }
    }, 1000);
  }, [messages, onSaveToHistory]);

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
      
      // Step 1: For new chats, first create an empty chat to get taskId
      if (!taskId) {
        const createResponse = await addTask({
          type: 'CHAT',
          formData: {}, // Empty formData creates new chat
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

      // Step 2: Send the actual message with taskId
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
        const taskId = response.result.taskId;
        if (!currentChatId) {
          setCurrentChatId(taskId);
          loadChatList();
        }
        pollForResponse(taskId, newFieldSort);
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
        question: '', // Could be improved to find the user question
      });
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, feedback: { emoji } } : m
      ));
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  // Stop generation
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
        updated[updated.length - 1] = {
          ...lastMsg,
          content: t('chat.generationStopped'),
        };
      }
      return updated;
    });
    showToast(t('chat.generation'), 'info');
  };

  // Clear current chat
  const clearChat = () => {
    setMessages([{
      id: '1',
      type: 'bot',
      content: t('chat.askQuestion'),
      timestamp: new Date(),
    }]);
    setCurrentChatId(null);
    setFieldSort(0);
    showToast(t('chat.chatSaved'), 'success');
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape to stop generation
    if (e.key === 'Escape' && isTyping) {
      stopGeneration();
    }
  };

  // Handle input change - no auto-resize to prevent scroll
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    onUserTyping?.(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onUserTyping?.(false);
    }, 800);
  };

  // Handler for recommendation tile click
  

  // Regenerate: resend the previous user prompt relative to a bot message
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
    <div className="flex h-full flex-col md:flex-row">
      {/* Chat Export Dialog */}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete Chat"
        message={`Are you sure you want to delete "${confirmDelete?.title || 'this chat'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          if (confirmDelete) {
            try {
              if (confirmDelete.id) {
                await deleteTaskOutput(confirmDelete.id);
                setChatList(prev => prev.filter(c => c.id !== confirmDelete.id));
                if (currentChatId === confirmDelete.id) {
                  startNewChat();
                }
                showToast('Chat deleted', 'success');
              } else {
                // No server-side chat id: just clear local chat
                clearChat();
                showToast('Chat cleared', 'success');
              }
            } catch (error) {
              showToast('Failed to delete chat', 'error');
            }
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-800">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {Array.isArray(messages) && messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
            } animate-fadeIn`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user'
                  ? 'bg-gradient-to-br from-[#1d2089] to-[#0E4BD9]'
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              }`}
            >
              {message.type === 'user' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>

            <div
              className={`flex-1 max-w-full sm:max-w-[80%] md:max-w-[60%] ${
                message.type === 'user' ? 'items-end' : 'items-start'
              } flex flex-col gap-2`}
            >
              <div
                className={`px-4 py-3 rounded-2xl transition-all ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-[#1d2089] to-[#0E4BD9] text-white shadow-lg shadow-blue-900/30'
                    : 'bg-slate-600 border border-slate-600 text-slate-100 shadow-sm'
                }`}
              >
                {message.type === 'bot' ? (
                  message.content ? (
                    (() => {
                      try {
                        const parsed = parseDualLanguageContent(message.content);
                        console.log('[Message Render] Parsed content:', {
                          isDualLanguage: parsed.isDualLanguage,
                          isSingleLanguage: parsed.isSingleLanguage,
                          hasContent: !!parsed.content,
                          rawContentLength: parsed.rawContent?.length,
                          taskOutputId: message.taskOutputId,
                        });
                        
                        // Always render with DualLanguageMessage for proper translation button handling
                        return (
                          <>
                            <DualLanguageMessage content={parsed} taskOutputId={message.taskOutputId} />
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
                          </>
                        );
                      } catch (error) {
                        console.error('Error rendering message:', error);
                        console.error('Message content:', message.content?.substring(0, 200));
                        
                        // Fallback to plain text with translation button
                        return (
                          <>
                            <div className="space-y-3">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
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
                          </>
                        );
                      }
                    })()
                  ) : (
                    // Show typing indicator when content is empty
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-[#1d2089] rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-[#1d2089] rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-[#1d2089] rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  )
                ) : (
                  <div className="group/msg relative">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    {/* Edit button for user messages */}
                    {message.type === 'user' && !isTyping && (
                      <button
                        onClick={() => {
                          setInput(message.content);
                          inputRef.current?.focus();
                        }}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover/msg:opacity-100 text-slate-400 hover:text-white transition-opacity"
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

              <span className="text-xs text-[#9CA3AF] px-2 hidden sm:inline">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* PDF Preview Modal */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPdfPreview(null)} />
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

      {/* Input Area with Recommendation Tiles */}
      <div className="p-4 border-t border-[#E8E8E8] bg-white">
        {/* Recommendation tiles removed */}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={startNewChat}
            className="p-2 rounded-lg bg-[#F6F6F6] text-[#6E7680] hover:bg-[#E8E8E8] hover:text-[#232333] transition-colors"
            title={t('chat.newChat')}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirmDelete({ id: currentChatId || '', title: chatList.find(c => c.id === currentChatId)?.title || t('chat.deleteChat') })}
            className="p-2 rounded-lg bg-[#F6F6F6] text-[#6E7680] hover:bg-[#E8E8E8] hover:text-[#232333] transition-colors"
            title={t('chat.clearHistory')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          {/* Separator */}
          <div className="w-px h-5 bg-[#E8E8E8]" />
          
          {/* Export Chat */}
          <button
            onClick={() => setShowExportDialog(true)}
            className="p-2 rounded-lg bg-[#F6F6F6] text-[#6E7680] hover:bg-[#E8E8E8] hover:text-[#232333] transition-colors"
            title={t('chat.exportChat')}
          >
            <Download className="w-4 h-4" />
          </button>
          
          {isTyping && (
            <button
              onClick={stopGeneration}
              className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex items-center gap-1"
              title={`${t('chat.stop')} (Esc)`}
            >
              <StopCircle className="w-4 h-4" />
              <span className="text-xs">{t('chat.stop')}</span>
            </button>
          )}
          <div className="flex-1" />
          <span className="text-xs text-[#9CA3AF]">
            {input.length > 0 && `${input.length} chars`}
          </span>
        </div>

        {/* Input field */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.askQuestion')}
              rows={1}
              className="w-full px-4 py-3 bg-white border-2 border-[#E8E8E8] rounded-xl text-[#232333] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#1d2089] focus:border-[#1d2089] resize-none transition-all"
              style={{ minHeight: '48px', maxHeight: '150px' }}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="px-6 py-3 h-fit bg-[#1d2089] hover:bg-[#0E4BD9] disabled:bg-[#E8E8E8] disabled:text-[#9CA3AF] disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 self-end"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">{t('chat.send')}</span>
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center gap-4 mt-2 text-xs text-[#9CA3AF]">
  <span>
    <kbd className="px-1.5 py-0.5 bg-[#F6F6F6] border border-[#E8E8E8] rounded text-[10px] text-[#6E7680]">Enter</kbd> {t('inputTips.send')}
  </span>
  <span>
    <kbd className="px-1.5 py-0.5 bg-[#F6F6F6] border border-[#E8E8E8] rounded text-[10px] text-[#6E7680]">Shift+Enter</kbd> {t('inputTips.newline')}
  </span>
  {isTyping && (
    <span>
      <kbd className="px-1.5 py-0.5 bg-[#F6F6F6] border border-[#E8E8E8] rounded text-[10px] text-[#6E7680]">Esc</kbd> {t('inputTips.stop')}
    </span>
  )}
</div>
      </div>
      </div>

      <style>{`
        /* Recommendation Tiles responsiveness (optional improvement) */
        .recommendation-tile {
          transition: background 0.2s, color 0.2s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

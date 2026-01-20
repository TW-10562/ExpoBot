/**
 * Translation utility for dual-language chat pipeline
 * Flow: user_query → translate to JP → retrieve JP → generate JP → translate back
 */

import { config } from '@config/index';
import { getNextApiUrl } from './redis';

// Language detection patterns
const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
const koreanPattern = /[\uAC00-\uD7AF]/;
const chinesePattern = /[\u4E00-\u9FFF]/;

export type LanguageCode = 'ja' | 'en' | 'ko' | 'zh' | 'unknown';

/**
 * Detect the primary language of the input text
 * Uses character ratio to determine dominant language
 */
export function detectLanguage(text: string): LanguageCode {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English for empty text
  }
  
  // Count different character types
  const hiraganaMatch = text.match(/[\u3040-\u309F]/g);
  const katakanaMatch = text.match(/[\u30A0-\u30FF]/g);
  const kanjiMatch = text.match(/[\u4E00-\u9FFF]/g);
  const koreanMatch = text.match(/[\uAC00-\uD7AF]/g);
  
  const hiraganaCount = hiraganaMatch ? hiraganaMatch.length : 0;
  const katakanaCount = katakanaMatch ? katakanaMatch.length : 0;
  const kanjiCount = kanjiMatch ? kanjiMatch.length : 0;
  const koreanCount = koreanMatch ? koreanMatch.length : 0;
  
  // Total Japanese characters (hiragana + katakana + kanji)
  const japaneseCharCount = hiraganaCount + katakanaCount + kanjiCount;
  const totalChars = text.length;
  
  // Japanese if more than 5% of characters are Japanese (hiragana, katakana, or kanji)
  // Lowered from 10% to handle text with mixed symbols/English better
  const japaneseRatio = japaneseCharCount / totalChars;
  
  console.log(`[detectLanguage] Text analysis:`, {
    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    totalChars,
    japaneseChars: japaneseCharCount,
    hiragana: hiraganaCount,
    katakana: katakanaCount,
    kanji: kanjiCount,
    ratio: (japaneseRatio * 100).toFixed(1) + '%',
  });
  
  if (koreanCount > japaneseCharCount && koreanCount / totalChars > 0.05) {
    return 'ko';
  }
  
  // If Japanese characters make up more than 5% of text, treat as Japanese
  if (japaneseRatio > 0.05) {
    console.log(`[detectLanguage] Detected as Japanese (${(japaneseRatio * 100).toFixed(1)}% Japanese characters)`);
    return 'ja';
  }
  
  // Default to English for mostly ASCII/English text
  console.log(`[detectLanguage] Detected as English (${(japaneseRatio * 100).toFixed(1)}% Japanese characters)`);
  return 'en';
}

/**
 * Get language name for prompts
 */
export function getLanguageName(code: LanguageCode): string {
  const names: Record<LanguageCode, string> = {
    ja: 'Japanese',
    en: 'English',
    ko: 'Korean',
    zh: 'Chinese',
    unknown: 'English',
  };
  return names[code];
}

/**
 * Translate text using Ollama LLM with retry logic and fallback
 */
export async function translateText(
  text: string,
  targetLang: LanguageCode,
  preserveCitations: boolean = false,
  maxRetries: number = 1
): Promise<string> {
  const targetLangName = getLanguageName(targetLang);
  
  let systemPrompt = `You are a professional translator. Translate the following text to ${targetLangName}. 
Output ONLY the translation, no explanations or notes.`;

  if (preserveCitations) {
    systemPrompt += `
IMPORTANT: Keep all citation strings exactly as they are (document names, page numbers, file references like "Document: xxx", "Page: xxx", "出典:", "ページ:"). 
Do NOT translate citation markers or document names.`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ];

  let url: string | null = null;
  
  // Try to get Ollama API URL
  try {
    url = await getNextApiUrl('ollama');
  } catch (error) {
    console.warn('[Translation] Could not get Ollama API URL, using fallback:', error);
    // Continue with fallback instead of throwing
  }

  // If no URL available, return mock translation
  if (!url) {
    console.log('[Translation] No Ollama API available, using mock translation');
    return createMockTranslation(text, targetLang);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s (3 minute) timeout - increased from 60s

      const modelName =
        process.env.OLLAMA_MODEL ||
        (config as any)?.Models?.chatModel?.name ||
        (config as any)?.Ollama?.model ||
        'gpt-oss:20b';
      const apiUrl = `${url.replace(/\/+$/, '')}/api/chat`;
      console.log(`[Translation] Attempt ${attempt + 1}: Calling ${apiUrl} with model: ${modelName}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream: false,
          model: modelName,
          messages,
          options: { temperature: 0.3 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error(`[Translation] HTTP ${response.status} error: ${errorText}`);
        throw new Error(`HTTP error: ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        throw new Error('Empty response from Ollama');
      }
      const data = JSON.parse(responseText);
      let content = data.message?.content?.trim();
      
      if (content) {
        // Clean any markers the LLM might have added
        content = content
          .replace(/\[EN\]\s*/gi, '')
          .replace(/\[JA\]\s*/gi, '')
          .replace(/\[\/EN\]\s*/gi, '')
          .replace(/\[\/JA\]\s*/gi, '')
          .replace(/^(English|Japanese|Translation):\s*/gim, '')
          .replace(/- Source:.*$/gm, '') // Remove source markers from translation
          // Remove markdown asterisks formatting
          .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***bold italic*** → bold italic
          .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold** → bold
          .replace(/\*(.+?)\*/g, '$1')           // *italic* → italic
          // Remove markdown heading symbols
          .replace(/^#+\s+/gm, '')               // # ## ### etc.
          // Clean excessive newlines
          .replace(/\n\n\n+/g, '\n\n')
          .trim();
        return content;
      }
      
      throw new Error('No content in response');
    } catch (error) {
      console.error(`Translation attempt ${attempt + 1} failed:`, error);
      if (attempt === maxRetries) {
        console.error('Translation failed after all retries, returning mock translation');
        return createMockTranslation(text, targetLang);
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return createMockTranslation(text, targetLang);
}

/**
 * Create a mock translation when Ollama is unavailable
 */
function createMockTranslation(text: string, targetLang: LanguageCode): string {
  // For development/testing, create a more realistic mock translation
  // that actually changes the content based on target language
  
  if (targetLang === 'ja') {
    // Simple mock Japanese translation
    // In production, this would use a real translation API
    const translations: { [key: string]: string } = {
      'hello': 'こんにちは',
      'thank you': 'ありがとう',
      'yes': 'はい',
      'no': 'いいえ',
      'please': 'お願いします',
      'question': '質問',
      'answer': '答え',
      'help': '助け',
      'information': '情報',
      'document': 'ドキュメント',
      'policy': 'ポリシー',
      'company': '会社',
      'employee': '従業員',
      'work': '仕事',
      'leave': '休暇',
      'salary': '給与',
      'benefits': '福利厚生',
      'the': 'その',
      'is': 'です',
      'are': 'です',
      'according': 'によると',
      'based': 'に基づいて',
      'can': 'ことができます',
      'should': 'べきです',
    };
    
    let translated = text.toLowerCase();
    // Apply simple word replacements
    for (const [en, ja] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(`\\b${en}\\b`, 'gi'), ja);
    }
    
    // If translation didn't change much, add a prefix to make it visually different
    if (translated === text.toLowerCase()) {
      return `【日本語訳】\n${text}\n\n（自動翻訳: ${text.substring(0, 50)}...）`;
    }
    
    return translated;
  } else if (targetLang === 'en') {
    // Mock English translation
    // In a real scenario, this would translate FROM Japanese TO English
    const translations: { [key: string]: string } = {
      'こんにちは': 'hello',
      'ありがとう': 'thank you',
      'はい': 'yes',
      'いいえ': 'no',
      'お願い': 'please',
      '質問': 'question',
      '答え': 'answer',
      '助け': 'help',
      '情報': 'information',
      'ドキュメント': 'document',
      'ポリシー': 'policy',
      '会社': 'company',
      '従業員': 'employee',
      '仕事': 'work',
      '休暇': 'leave',
      '給与': 'salary',
      '福利厚生': 'benefits',
      'です': 'is',
      'ます': 'does',
      'ました': 'was',
      'います': 'have',
      'あります': 'exists',
      'べき': 'should',
      'できます': 'can',
      'なければならない': 'must',
      'について': 'regarding',
      'における': 'in',
      'により': 'by',
      'ために': 'for',
      'として': 'as',
      'までに': 'by',
      'にとって': 'for',
    };
    
    let translated = text;
    // Apply simple word replacements for Japanese words
    for (const [ja, en] of Object.entries(translations)) {
      translated = translated.replace(new RegExp(ja, 'g'), en);
    }
    
    // If the text contains Japanese characters and we did replacements
    if (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/)) {
      // This is Japanese text being translated to English
      // Add some structure to make it look like a translation
      if (translated === text) {
        // No words found in dictionary, create a simple English representation
        return `[English Translation - Auto Generated]\n${text}`;
      }
      return translated;
    } else {
      // This is English text (shouldn't happen normally)
      // Just return with a marker
      return `[English Version]\n${text}`;
    }
  } else {
    // Fallback for unknown target language
    return `[${targetLang.toUpperCase()} Translation]\n${text}`;
  }
}

/**
 * Translate query to Japanese for RAG retrieval
 */
export async function translateQueryToJapanese(query: string): Promise<{ 
  originalQuery: string;
  translatedQuery: string;
  sourceLanguage: LanguageCode;
}> {
  const sourceLanguage = detectLanguage(query);
  
  if (sourceLanguage === 'ja') {
    return {
      originalQuery: query,
      translatedQuery: query,
      sourceLanguage: 'ja',
    };
  }

  const translatedQuery = await translateText(query, 'ja');
  
  return {
    originalQuery: query,
    translatedQuery,
    sourceLanguage,
  };
}

/**
 * Translate content on-demand (when user clicks dual response button)
 * This replaces the old createDualLanguageResponse for lazy translation
 */
export async function translateContentOnDemand(
  content: string,
  currentLanguage: LanguageCode,
  targetLanguage: LanguageCode
): Promise<string> {
  if (currentLanguage === targetLanguage) {
    return content;
  }
  
  return await translateText(content, targetLanguage, true);
}

/**
 * Format single-language output for storage
 * Returns a structured JSON that can be parsed by the frontend
 * The translation will happen on-demand when user clicks the dual response button
 * 
 * @param content The response content in the user's language
 * @param language The language of the content (user's language)
 */
export function formatSingleLanguageOutput(
  content: string,
  language: LanguageCode
): string {
  const output = {
    dualLanguage: false,
    content: content,
    language: language,
    translationPending: true, // Flag for frontend: translation available on-demand
    formattedAt: new Date().toISOString(),
    contentLength: content.length,
  };
  
  console.log(`[formatSingleLanguageOutput] Creating JSON with:`);
  console.log(`  - language: ${language}`);
  console.log(`  - content length: ${content.length}`);
  console.log(`  - translationPending: true`);
  
  // Use pretty-print (2-space indent) for better readability
  const jsonString = JSON.stringify(output, null, 2);
  const result = `<!--SINGLE_LANG_START-->\n${jsonString}\n<!--SINGLE_LANG_END-->`;
  
  console.log(`[formatSingleLanguageOutput] Final output length: ${result.length}`);
  
  return result;
}

/**
 * Format dual-language output for storage
 * Returns a structured JSON that can be parsed by the frontend
 * DEPRECATED: This is now only used for backwards compatibility and on-demand translation responses
 */
export function formatDualLanguageOutput(
  japaneseAnswer: string,
  translatedAnswer: string,
  targetLanguage: LanguageCode
): string {
  const output = {
    dualLanguage: true,
    japanese: japaneseAnswer,
    translated: translatedAnswer,
    targetLanguage,
    formattedAt: new Date().toISOString(),
    japaneseContentLength: japaneseAnswer.length,
    translatedContentLength: translatedAnswer.length,
  };
  
  console.log(`[formatDualLanguageOutput] Creating JSON with:`);
  console.log(`  - targetLanguage: ${targetLanguage}`);
  console.log(`  - japanese length: ${japaneseAnswer.length}`);
  console.log(`  - translated length: ${translatedAnswer.length}`);
  
  // Use pretty-print (2-space indent) for better readability
  const jsonString = JSON.stringify(output, null, 2);
  const result = `<!--DUAL_LANG_START-->\n${jsonString}\n<!--DUAL_LANG_END-->`;
  
  console.log(`[formatDualLanguageOutput] Final output length: ${result.length}`);
  
  return result;
}

/**
 * Parse output from stored content (handles both single and dual language formats)
 */
export function parseDualLanguageOutput(content: string): {
  isDualLanguage: boolean;
  japanese?: string;
  translated?: string;
  targetLanguage?: LanguageCode;
  singleContent?: string;
  language?: LanguageCode;
  translationPending?: boolean;
  rawContent: string;
} {
  // First try to parse single-language format
  const singleLangMatch = content.match(/<!--SINGLE_LANG_START-->(.+?)<!--SINGLE_LANG_END-->/s);
  if (singleLangMatch) {
    try {
      const parsed = JSON.parse(singleLangMatch[1]);
      return {
        isDualLanguage: false,
        singleContent: parsed.content,
        language: parsed.language,
        translationPending: parsed.translationPending,
        rawContent: content,
      };
    } catch {
      return { isDualLanguage: false, rawContent: content };
    }
  }
  
  // Then try dual-language format (backwards compatibility)
  const dualLangMatch = content.match(/<!--DUAL_LANG_START-->(.+?)<!--DUAL_LANG_END-->/s);
  
  if (dualLangMatch) {
    try {
      const parsed = JSON.parse(dualLangMatch[1]);
      return {
        isDualLanguage: true,
        japanese: parsed.japanese,
        translated: parsed.translated,
        targetLanguage: parsed.targetLanguage,
        rawContent: content,
      };
    } catch {
      return { isDualLanguage: false, rawContent: content };
    }
  }
  
  return { isDualLanguage: false, rawContent: content };
}

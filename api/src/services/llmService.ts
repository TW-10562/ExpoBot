/**
 * LLM Service - Clean abstraction for language model interactions
 */
import axios from 'axios';
import { aiGateway } from './aiGateway';
 
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
 
export interface LLMResponse {
  content: string;
  tokensUsed?: number;
}
 
class LLMService {
  /**
   * Generate a response from the LLM
   */
  async generate(
    messages: Message[],
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<LLMResponse> {
    const { temperature = 0.1, maxTokens = 2048 } = options;
 
    try {
      const content = await aiGateway.chat(messages, {
        temperature,
        maxTokens,
      });
      return { content, tokensUsed: content.length / 4 }; // Rough estimate
    } catch (error: any) {
      console.error(`[LLMService] Generation failed:`, error.message);
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }
 
  /**
   * Simple completion with system prompt
   */
  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: Message[] = [];
   
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
 
    const response = await this.generate(messages);
    return response.content;
  }
 
  /**
   * Translate text to target language
   */
  async translate(text: string, targetLanguage: string): Promise<string> {
    const systemPrompt = `You are a translator. Translate the following text to ${targetLanguage}.
Return ONLY the translation, nothing else. No explanations, no markers, no formatting.`;
 
    try {
      const result = await this.complete(text, systemPrompt);
      return this.cleanTranslation(result);
    } catch (error: any) {
      console.error(`[LLMService] Translation failed:`, error.message);
      return text; // Return original on failure
    }
  }
 
  /**
   * Clean translation output - remove all markers and markdown formatting
   */
  private cleanTranslation(text: string): string {
    return text
      .replace(/\[EN\]/gi, '')
      .replace(/\[JA\]/gi, '')
      .replace(/\[ENGLISH\]/gi, '')
      .replace(/\[JAPANESE\]/gi, '')
      .replace(/<!--.*?-->/g, '')
      .replace(/\{[^}]*"dualLanguage"[^}]*\}/g, '')
      // Remove markdown asterisks formatting
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // ***bold italic*** → bold italic
      .replace(/\*\*(.+?)\*\*/g, '$1')      // **bold** → bold
      .replace(/\*(.+?)\*/g, '$1')           // *italic* → italic
      // Remove markdown heading symbols
      .replace(/^#+\s+/gm, '')               // # ## ### etc.
      // Clean excessive newlines
      .replace(/\n\n\n+/g, '\n\n')
      .trim();
  }
 
  /**
   * Check if LLM is available
   */
  async ping(): Promise<boolean> {
    try {
      const baseUrl = process.env.OLLAMA_BASE_URL?.split(',')[0]?.trim() || 'http://127.0.0.1:11435';
      await axios.get(`${baseUrl.replace(/\/+$/, '')}/api/tags`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
 
// Export singleton instance
export const llmService = new LLMService();
export default LLMService;
 
 

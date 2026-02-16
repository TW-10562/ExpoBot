import { config } from '@/config';

export type AIGatewayMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIGatewayOptions = {
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

const normalizeUrl = (url: string): string => url.trim().replace(/\/+$/, '');

const parseBaseUrls = (): string[] => {
  const envOverride = process.env.OLLAMA_BASE_URL;
  if (envOverride && envOverride.trim().length > 0) {
    return envOverride
      .split(',')
      .map((url) => normalizeUrl(url))
      .filter(Boolean);
  }

  return (config.Ollama?.url || [])
    .map((url: string) => normalizeUrl(url))
    .filter(Boolean);
};

class AIGatewayService {
  private endpointCursor = 0;

  getModel(defaultModel?: string): string {
    return process.env.OLLAMA_MODEL || defaultModel || config.Ollama?.model || 'gpt-oss:120b';
  }

  private getNextBaseUrl(): string {
    const baseUrls = parseBaseUrls();
    if (baseUrls.length === 0) {
      throw new Error('No Ollama endpoint configured');
    }

    const index = this.endpointCursor % baseUrls.length;
    this.endpointCursor += 1;
    return baseUrls[index];
  }

  async chat(messages: AIGatewayMessage[], options: AIGatewayOptions = {}): Promise<string> {
    const baseUrl = this.getNextBaseUrl();
    const model = this.getModel(options.model);
    const temperature = options.temperature ?? 0.2;
    const maxTokens = options.maxTokens ?? 2048;

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Gateway chat failed: ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    return payload?.message?.content || '';
  }

  async streamChat(
    messages: AIGatewayMessage[],
    onToken: (token: string) => void | Promise<void>,
    options: AIGatewayOptions = {},
  ): Promise<string> {
    const baseUrl = this.getNextBaseUrl();
    const model = this.getModel(options.model);
    const temperature = options.temperature ?? 0.2;
    const maxTokens = options.maxTokens ?? 2048;

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: true,
        messages,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`AI Gateway stream failed: ${response.status} ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let packet: any;
        try {
          packet = JSON.parse(trimmed);
        } catch {
          continue;
        }

        const token = packet?.message?.content || '';
        if (token) {
          fullText += token;
          await onToken(token);
        }
      }
    }

    return fullText;
  }
}

export const aiGateway = new AIGatewayService();
export default AIGatewayService;

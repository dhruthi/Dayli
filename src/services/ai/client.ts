import { getOpenAIConfig } from './config';

export interface OpenAICompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
  overrideApiKey?: string;
  overrideModel?: string;
}

export interface OpenAIResponse {
  content: string;
  tokensUsed?: number;
  modelUsed: string;
  latencyMs: number;
}

export class OpenAIClient {
  /**
   * Execute chat completion request against the OpenAI API
   */
  async createChatCompletion(options: OpenAICompletionOptions): Promise<OpenAIResponse> {
    const config = getOpenAIConfig(options.overrideApiKey, options.overrideModel);

    const isValidKey = config.apiKey && config.apiKey.startsWith('sk-');
    if (!isValidKey) {
      throw new Error('OpenAI API key is missing or invalid (must start with sk-).');
    }

    const apiEndpoint = 'https://api.openai.com/v1/chat/completions';

    const startTime = Date.now();
    const maxRetries = 1;
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

        const body: Record<string, any> = {
          model: config.model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt },
          ],
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 600,
        };

        // OpenAI JSON mode
        if (options.responseFormatJson) {
          body.response_format = { type: 'json_object' };
        }

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`AI API returned status ${response.status}: ${errText.substring(0, 150)}`);
        }

        const data = await response.json();
        const latencyMs = Date.now() - startTime;
        const content = data?.choices?.[0]?.message?.content || '';

        return {
          content,
          tokensUsed: data?.usage?.total_tokens,
          modelUsed: config.model,
          latencyMs,
        };
      } catch (err: any) {
        lastError = err;
        if (err.name === 'AbortError') {
          throw new Error(`AI API request timed out after ${config.timeoutMs}ms.`);
        }
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 500));
        }
      }
    }

    throw lastError || new Error('AI API request failed.');
  }

  /**
   * Health check / connection test against the OpenAI API
   */
  async testConnection(overrideApiKey?: string, overrideModel?: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const config = getOpenAIConfig(overrideApiKey, overrideModel);
    if (!config.apiKey) {
      return { success: false, latencyMs: 0, error: 'No API Key configured' };
    }

    const modelsEndpoint = 'https://api.openai.com/v1/models';

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(modelsEndpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return { success: true, latencyMs: Date.now() - start };
      } else {
        return { success: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}` };
      }
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

export const openAIClient = new OpenAIClient();

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

/**
 * Bring-your-own-key LLM layer. Keys are provided by the user at runtime and
 * never shipped in the code. Claude (Anthropic) or OpenAI — same interface.
 */

export type Provider = 'anthropic' | 'openai';

export interface LlmConfig {
  provider: Provider;
  apiKey: string;
  model?: string;
  /** Set true only in the browser (BYOK): the key stays on the user's device. */
  browser?: boolean;
}

export const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: 'claude-opus-5-5',
  openai: 'gpt-5-mini',
};

export const MODEL_CHOICES: Record<Provider, { id: string; label: string }[]> = {
  anthropic: [
    { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (recommended)' },
    { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
    { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (fastest)' },
  ],
  openai: [
    { id: 'gpt-5-mini', label: 'GPT-5 mini (recommended)' },
    { id: 'gpt-5', label: 'GPT-5' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
  ],
};

export type Part = { type: 'text'; text: string } | { type: 'image'; mediaType: string; base64: string };

export interface JsonRequest {
  system: string;
  user: string | Part[];
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
  /** 'low' for chat turns (fast), 'medium' for reading letters. */
  effort?: 'low' | 'medium' | 'high';
}

export interface LLM {
  provider: Provider;
  model: string;
  json<T>(req: JsonRequest): Promise<T>;
}

export class LlmError extends Error {
  constructor(message: string, readonly kind: 'auth' | 'rate' | 'refusal' | 'network' | 'format' | 'other') {
    super(message);
  }
}

function parseJson<T>(text: string): T {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new LlmError('The AI returned an unreadable answer.', 'format');
  }
}

function classify(err: unknown): LlmError {
  if (err instanceof LlmError) return err;
  const status = (err as { status?: number })?.status;
  const msg = (err as Error)?.message ?? String(err);
  if (status === 401 || status === 403) return new LlmError('This API key was rejected. Check it in Settings.', 'auth');
  if (status === 429) return new LlmError('The AI provider is rate-limiting this key. Try again in a moment.', 'rate');
  if (status === 404) return new LlmError(`Model not available for this key: ${msg}`, 'other');
  if (/fetch|network|Failed to fetch/i.test(msg)) return new LlmError('Network error reaching the AI provider.', 'network');
  return new LlmError(msg, 'other');
}

class AnthropicLLM implements LLM {
  provider: Provider = 'anthropic';
  private client: Anthropic;
  private fallbacksSupported = true;
  constructor(cfg: LlmConfig, public model: string) {
    this.client = new Anthropic({ apiKey: cfg.apiKey, dangerouslyAllowBrowser: !!cfg.browser, maxRetries: 2 });
  }
  async json<T>(req: JsonRequest): Promise<T> {
    const content: Anthropic.ContentBlockParam[] =
      typeof req.user === 'string'
        ? [{ type: 'text', text: req.user }]
        : req.user.map((p) =>
            p.type === 'text'
              ? { type: 'text' as const, text: p.text }
              : { type: 'image' as const, source: { type: 'base64' as const, media_type: p.mediaType as 'image/jpeg', data: p.base64 } },
          );
    const params = {
      model: this.model,
      max_tokens: req.maxTokens ?? 4000,
      system: req.system,
      messages: [{ role: 'user' as const, content }],
      output_config: { effort: req.effort ?? 'low', format: { type: 'json_schema', schema: req.schema } },
    };
    try {
      let res: Anthropic.Message;
      if (this.fallbacksSupported && this.model === 'claude-opus-5-5') {
        try {
          // Server-side refusal fallback (beta): a declined request is re-run on a fallback model.
          res = (await this.client.beta.messages.create({
            ...params,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
          } as never)) as unknown as Anthropic.Message;
        } catch (e) {
          if ((e as { status?: number }).status !== 400) throw e;
          this.fallbacksSupported = false;
          res = (await this.client.messages.create(params as never)) as Anthropic.Message;
        }
      } else {
        res = (await this.client.messages.create(params as never)) as Anthropic.Message;
      }
      if (res.stop_reason === 'refusal') throw new LlmError('The AI declined this request.', 'refusal');
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('');
      return parseJson<T>(text);
    } catch (e) {
      throw classify(e);
    }
  }
}

class OpenAILLM implements LLM {
  provider: Provider = 'openai';
  private client: OpenAI;
  constructor(cfg: LlmConfig, public model: string) {
    this.client = new OpenAI({ apiKey: cfg.apiKey, dangerouslyAllowBrowser: !!cfg.browser, maxRetries: 2 });
  }
  async json<T>(req: JsonRequest): Promise<T> {
    const userContent =
      typeof req.user === 'string'
        ? req.user
        : req.user.map((p) =>
            p.type === 'text'
              ? { type: 'text' as const, text: p.text }
              : { type: 'image_url' as const, image_url: { url: `data:${p.mediaType};base64,${p.base64}` } },
          );
    try {
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: userContent as never },
        ],
        response_format: { type: 'json_schema', json_schema: { name: req.schemaName, schema: req.schema, strict: false } },
      } as never);
      const text = (res as OpenAI.Chat.ChatCompletion).choices[0]?.message?.content ?? '';
      return parseJson<T>(text);
    } catch (e) {
      throw classify(e);
    }
  }
}

export function createLLM(cfg: LlmConfig): LLM {
  const model = cfg.model || DEFAULT_MODELS[cfg.provider];
  return cfg.provider === 'anthropic' ? new AnthropicLLM(cfg, model) : new OpenAILLM(cfg, model);
}

/** Quick key check used on the setup screen. */
export async function testKey(cfg: LlmConfig): Promise<{ ok: true; model: string } | { ok: false; error: string }> {
  try {
    const llm = createLLM(cfg);
    const r = await llm.json<{ ok: boolean }>({
      system: 'Reply with JSON only.',
      user: 'Return {"ok": true}.',
      schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false },
      schemaName: 'ping',
      maxTokens: 2000,
    });
    return r.ok ? { ok: true, model: llm.model } : { ok: false, error: 'Unexpected answer from the AI.' };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Provider guess from key prefix, to save a click. */
export function guessProvider(key: string): Provider | null {
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('sk-')) return 'openai';
  return null;
}

import { Tempo } from '@magmacomputing/tempo';
import { TempoAiError } from './error.js';
import type { AiProvider, TempoAiMeta } from './types.js';
import { updateRateLimitsFromResponse } from './init.js';

export function normalizeCacheInput(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getNamespacedCacheKey(namespace: string, key: string): string {
  return `ai:${namespace}::${key}`;
}

export function attachAiMeta(instance: Tempo, meta: TempoAiMeta): Tempo {
  const frozenMeta = Object.freeze(meta);
  return new Proxy(instance, {
    get(target, prop, receiver) {
      if (prop === 'ai') return frozenMeta;
      if (prop === 'isValid') {
        if (meta.confidence === 0.0 || meta.rawIso === 'INVALID' || meta.ambiguous === true || !target.isValid) return false;
      }
      const val = Reflect.get(target, prop, target);
      if (typeof val === 'function') return val.bind(target);
      return val;
    },
    has(target, prop) {
      if (prop === 'ai') return true;
      return Reflect.has(target, prop);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop === 'ai') {
        return {
          value: frozenMeta,
          writable: false,
          configurable: false,
          enumerable: true
        };
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    ownKeys(target) {
      const keys = Reflect.ownKeys(target);
      if (!keys.includes('ai')) keys.push('ai');
      return keys;
    }
  });
}

export async function fetchFromProvider(
  provider: AiProvider,
  str: string,
  contextString: string,
  isDebug: boolean,
  parentSignal?: AbortSignal
): Promise<{ rawContent: string; providerId: string }> {
  const url = provider.url!;
  const model = provider.model!;

  const systemPrompt = `You are a high-performance date parser. Read the user's string and the provided context. Return ONLY a valid JSON object matching this exact schema:
{
  "reasoning": "Step-by-step calendar math from Current Time.",
  "iso": "Local ISO 8601 string (YYYY-MM-DDThh:mm:ss) without offset or Z suffix, or 'INVALID' if ambiguous/unparseable.",
  "confidence": 0.95,
  "ambiguous": false,
  "granularity": "minute"
}

Ambiguity Rules:
- "next [weekday/unit]": Immediate next chronological occurrence after Current Time.
- "last [weekday/unit]" / "previous [weekday/unit]": Most recent past occurrence prior to Current Time.
- "this [weekday]": Occurrence in the current calendar week containing Current Time.
- "confidence": Float score between 0.0 (gibberish/unparseable) and 1.0 (100% certain).
- "granularity": Primary time precision level ('year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'unknown').

Do not include markdown blocks or any text outside the JSON.`;

  if (isDebug)
    console.log(`[tempo-plugin-ai] Sending to ${provider.id}:`, { system: `${systemPrompt}\n${contextString}`, user: str });

  const tokenParam = provider.tokenParam
    || (provider.options?.max_completion_tokens !== undefined ? 'max_completion_tokens' : undefined)
    || (provider.options?.max_tokens !== undefined ? 'max_tokens' : undefined)
    || 'max_tokens';
  const tokenLimit = { [tokenParam]: 250 };

  const controller = new AbortController();
  const timeoutMs = provider.options?.timeout ?? 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const onParentAbort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener('abort', onParentAbort);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.key}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: `${systemPrompt}\n${contextString}` },
          { role: 'user', content: str }
        ],
        temperature: 0,
        ...tokenLimit,
        response_format: { type: 'json_object' },
        ...provider.options
      }),
      signal: controller.signal
    });

    const limits = updateRateLimitsFromResponse(response);

    if (!response.ok) {
      const errorText = await response.text();
      const resetTime = limits?.resetAt ?? undefined;
      throw new TempoAiError(`Provider ${provider.id} failed with status ${response.status}. Details: ${errorText}`, response.status, resetTime);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (typeof rawContent !== 'string')
      throw new TempoAiError(`Provider ${provider.id} returned invalid response payload.`, 422);

    if (isDebug)
      console.log(`[tempo-plugin-ai] Received from ${provider.id}:`, rawContent);

    return { rawContent: rawContent.trim(), providerId: provider.id };
  } finally {
    clearTimeout(timeoutId);
    if (parentSignal) {
      parentSignal.removeEventListener('abort', onParentAbort);
    }
  }
}

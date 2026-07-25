import { Tempo } from '@magmacomputing/tempo';
import type * as t from '@magmacomputing/tempo';

import { TempoAiError } from './error.js';
export { TempoAiError } from './error.js';

export * from './parseAI.type.js';
import type { AiConfig, AiRateLimits, AiProvider } from './parseAI.type.js';

// Global module state
const _state: {
  config: AiConfig;
  cache: Map<string, string>;
  limits: AiRateLimits | null;
} = {
  config: {},
  cache: new Map(),
  limits: null,
}

const DEFAULT_PROVIDERS: Record<string, Partial<AiProvider>> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant'
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-5.4-mini'
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-1.5-flash'
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest'
  }
}

/**
 * ## initAI
 * Initializes the global AI Plugin configuration.
 * Must be called before executing `parseAI`.
 * 
 * @param config - The plugin configuration (providers and optional cache)
 */
export function initAI(config: AiConfig): void {
  const resolvedProviders = (config.providers || []).map(p => {
    const defaults = DEFAULT_PROVIDERS[p.id] || DEFAULT_PROVIDERS.openai;
    return {
      ...defaults,
      ...p
    } as AiProvider;
  });

  _state.config = {
    ..._state.config,
    ...config,
    providers: resolvedProviders
  };

  if (config.cache) {
    _state.cache = config.cache;
  }
}

/**
 * ## clearAiCache
 * Explicitly evicts a natural language key or array of keys from the local AI cache.
 * Useful for purging incorrectly parsed strings.
 * 
 * @param input - The raw natural language string(s) to remove from the cache
 */
export function clearAiCache(input: string | string[]): void {
  const inputs = Array.isArray(input) ? input : [input];
  for (const i of inputs) {
    const prefix = `${i}::`;
    for (const key of _state.cache.keys()) {
      if (key.startsWith(prefix) || key === i /* legacy fallback */) {
        _state.cache.delete(key);
      }
    }
  }
}

/**
 * ## getAiRateLimits
 * Retrieves the rate limit and billing statistics from the most recent LLM proxy request.
 * Useful for tracking quota usage and safely scheduling batch operations.
 * 
 * @returns The current rate limit state, or null if no requests have been made
 */
export function getAiRateLimits(): AiRateLimits | null {
  return _state.limits;
}

/**
 * ## parseAI
 * Asynchronously parses a complex natural language string (or array of strings) 
 * into deterministic `Tempo` instances utilizing large language models.
 * 
 * It automatically extracts the global configuration (TimeZone, Calendar, Locale) 
 * and custom Terms to build a rich context prompt for the LLM. It includes built-in
 * caching to prevent redundant requests and reduce token consumption.
 * 
 * @param input - The natural language string or array of strings to parse
 * @param options - Optional configuration overrides (identical to `new Tempo(..., options)`)
 * @returns A Promise that resolves to a `Tempo` instance (or `Tempo[]` if an array was passed)
 */
export async function parseAI(input: string, options?: Record<string, any> & { force?: boolean; cache?: boolean }): Promise<Tempo>;
export async function parseAI(input: string[], options?: Record<string, any> & { force?: boolean; cache?: boolean }): Promise<Tempo[]>;
export async function parseAI(
  input: string | string[],
  options?: Record<string, any> & { force?: boolean; cache?: boolean }
): Promise<Tempo | Tempo[]> {
  const isArray = Array.isArray(input);
  const inputs = isArray ? input : [input];
  const results: Tempo[] = [];

  for (const str of inputs) {
    const isDebug = options?.debug ?? _state.config.debug;

    // 1. Try native ParseModule first (silently!)
    if (!options?.force) {
      try {
        const native = new Tempo(str, { ...options, silent: true });
        if (native.isValid) {
          if (isDebug) console.log(`[parseAI] Resolved natively: "${str}"`);
          results.push(new Tempo(str, options));
          continue;
        }
      } catch {
        // Native parsing failed, fallback to AI
      }
    }

    // 2. Establish Anchor for Cache & Context
    let tz: string, cal: string, loc: string, sph: string, anchorStr: string;
    if (Tempo.isTempo(options?.anchor)) {
      tz = options!.timeZone || options!.anchor.config.timeZone;
      cal = options!.calendar || options!.anchor.config.calendar;
      loc = options!.locale || options!.anchor.config.locale;
      sph = options!.sphere || options!.anchor.config.sphere;
      anchorStr = options!.anchor.toString();
    } else {
      const resolvedConfig = new Tempo().config;
      tz = options?.timeZone || resolvedConfig.timeZone;
      cal = options?.calendar || resolvedConfig.calendar;
      loc = options?.locale || resolvedConfig.locale;
      sph = options?.sphere || resolvedConfig.sphere;
      anchorStr = options?.anchor || new Tempo().toString();
    }

    // The cache key salts the string with the anchor's Calendar Date. 
    // This allows "tomorrow" to hit the cache all day, but cleanly miss when midnight strikes!
    const cacheSalt = new Tempo(anchorStr, { ...options, timeZone: tz, calendar: cal, locale: loc, sphere: sph }).format('{yyyy}-{mm}-{dd}');
    const cacheKey = `${str}::${cacheSalt}`;

    // 3. Check Cache
    if (!options?.force && options?.cache !== false && _state.cache.has(cacheKey)) {
      const cachedIso = _state.cache.get(cacheKey)!;
      if (isDebug) console.log(`[parseAI] Cache hit for "${str}":`, cachedIso);
      results.push(new Tempo(cachedIso, options));
      continue;
    }

    // 4. Construct LLM Context
    const anchorTempo = new Tempo(anchorStr, { ...options, timeZone: tz, calendar: cal, locale: loc, sphere: sph });
    let contextString = `Current Time: ${anchorTempo.format('{yyyy}-{mm}-{dd} ({wkd}) {hh}:{mi}:{ss}')}, Timezone: ${tz}, Calendar: ${cal}, Locale: ${loc}, Hemisphere: ${sph}.`;

    // 5. LLM Network Fetch with Fallback Loop
    if (!_state.config.providers || _state.config.providers.length === 0)
      throw new TempoAiError('No AI providers configured. Please call initAI().', 400);

    let parsedIso: string | null = null;
    let lastError: any = null;

    for (const provider of _state.config.providers) {
      try {
        const url = provider.url!;
        const model = provider.model!;

        const systemPrompt = `You are a high-performance date parser. Read the user's string and the provided context. Return ONLY a valid JSON object matching this exact schema:
{
  "reasoning": "Step-by-step calendar math from the Current Time to determine the target date.",
  "iso": "The final local ISO 8601 string (e.g., YYYY-MM-DDThh:mm:ss) WITHOUT a timezone offset or 'Z' suffix, or 'INVALID' if ambiguous."
}
Do not include markdown blocks, explanations, or any text outside the JSON.`;

        if (isDebug)
          console.log(`[parseAI] Sending to ${provider.id}:`, { system: `${systemPrompt}\n${contextString}`, user: str });

        const isNewOpenAi = model.startsWith('gpt-5') || model.startsWith('o1') || model.startsWith('o3');
        const tokenLimit = isNewOpenAi ? { max_completion_tokens: 250 } : { max_tokens: 250 };

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
            response_format: { type: "json_object" },
            ...provider.options
          })
        });

        // Parse rate limits from headers
        const remReq = response.headers.get('x-ratelimit-remaining-requests');
        const remTok = response.headers.get('x-ratelimit-remaining-tokens');
        const resetTok = response.headers.get('x-ratelimit-reset-tokens');

        if (remReq || remTok) {
          let addString = '1 hour';
          if (resetTok) {
            const val = parseFloat(resetTok);
            if (resetTok.endsWith('ms')) addString = `${val} milliseconds`;
            else if (resetTok.endsWith('s')) addString = `${val} seconds`;
            else if (resetTok.endsWith('m')) addString = `${val} minutes`;
            else addString = `${val} seconds`;
          }

          _state.limits = {
            remainingRequests: remReq ? parseInt(remReq, 10) : 999,
            remainingTokens: remTok ? parseInt(remTok, 10) : 99999,
            resetAt: new Tempo().add(addString)
          };
        }

        if (!response.ok) {
          const errorText = await response.text();
          const resetTime = _state.limits?.resetAt;
          throw new TempoAiError(`Provider ${provider.id} failed with status ${response.status}. Details: ${errorText}`, response.status, resetTime);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();

        if (isDebug)
          console.log(`[parseAI] Received from ${provider.id}:`, content);

        let parsedData;
        try {
          const cleanContent = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
          parsedData = JSON.parse(cleanContent);
        } catch {
          throw new TempoAiError('AI returned invalid JSON.', 422);
        }

        const isoContent = parsedData.iso;

        if (isoContent === 'INVALID')
          throw new TempoAiError('AI could not parse the string.', 422);

        parsedIso = `${isoContent.replace(/Z$/i, '')}[${tz}]`;
        break; // Success! Break the fallback loop
      } catch (err: any) {
        lastError = err;
        // If it's a rate limit or timeout, the loop naturally continues to the next provider
        if (err instanceof TempoAiError && err.code === 422)
          // If the AI explicitly says INVALID, don't waste tokens asking the next provider
          break;
      }
    }

    if (!parsedIso) {
      throw lastError || new TempoAiError('All configured AI providers failed.', 500);
    }

    // 6. Cache result and push
    if (options?.cache !== false)
      _state.cache.set(cacheKey, parsedIso);

    results.push(new Tempo(parsedIso, options));
  }

  return isArray ? results : results[0];
}

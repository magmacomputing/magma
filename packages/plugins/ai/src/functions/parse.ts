import { Tempo } from '@magmacomputing/tempo';
import { TempoAiError } from '../core/error.js';
import { AiMode } from '../core/config.js';
import type { AiParseOptions } from '../core/types.js';
import { _state } from '../core/init.js';
import { normalizeCacheInput, attachAiMeta, fetchFromProvider, assertNoReservedProviderId } from '../core/support.js';

async function parseSingleInput(str: string, options?: AiParseOptions): Promise<Tempo> {
  const isDebug = options?.debug ?? _state.config.debug ?? false;
  const normalizedStr = normalizeCacheInput(str);

  const { force, debug, mode: aiMode, providers, minConfidence, softErrors, cache: aiCacheOption, timeout: callTimeout, ...coreOptions } = options || {};

  let tz: string, cal: string, loc: string, sph: string, anchorStr: string;
  if (Tempo.isTempo(options?.anchor)) {
    tz = String(options!.timeZone || options!.anchor.config.timeZone);
    cal = String(options!.calendar || options!.anchor.config.calendar);
    loc = String(Array.isArray(options!.locale) ? options!.locale[0] : (options!.locale || options!.anchor.config.locale));
    sph = String(options!.sphere || options!.anchor.config.sphere || 'north');
    anchorStr = options!.anchor.toString();
  } else {
    const resolvedOptions = Tempo.options;
    tz = String(options?.timeZone || resolvedOptions.timeZone);
    cal = String(options?.calendar || resolvedOptions.calendar);
    loc = String(Array.isArray(options?.locale) ? options?.locale[0] : (options?.locale || resolvedOptions.locale));
    sph = String(options?.sphere || resolvedOptions.sphere || 'north');
    anchorStr = String(options?.anchor || new Tempo().toString());
  }

  const anchorTempo = new Tempo(anchorStr, { ...coreOptions, timeZone: tz, calendar: cal, locale: loc, sphere: sph as any });
  const cacheSalt = anchorTempo.format('{yyyy}-{mm}-{dd}');
  const cacheKey = `${normalizedStr}::${cacheSalt}::${tz}::${cal}::${loc}::${sph}`;
  const adapter = options?.cacheAdapter ?? _state.config.cacheAdapter;

  let cachedIso: string | undefined;
  if (!force && aiCacheOption !== false) {
    if (adapter) {
      try {
        const val1 = await adapter.get(cacheKey);
        if (val1) {
          cachedIso = val1;
        } else {
          const val2 = await adapter.get(normalizedStr);
          if (val2) {
            cachedIso = val2;
          } else {
            const val3 = await adapter.get(str);
            if (val3) cachedIso = val3;
          }
        }
      } catch (err: any) {
        if (isDebug) console.log('[tempo-plugin-ai] Cache adapter read error:', err?.message);
      }
    }

    if (!cachedIso) {
      if (Tempo.cache.has(cacheKey)) {
        cachedIso = Tempo.cache.get(cacheKey);
      } else if (Tempo.cache.has(normalizedStr)) {
        cachedIso = Tempo.cache.get(normalizedStr);
      } else if (Tempo.cache.has(str)) {
        cachedIso = Tempo.cache.get(str);
      }
    }
  }

  if (cachedIso) {
    if (isDebug) console.log(`[tempo-plugin-ai] Cache hit for "${str}":`, cachedIso);
    const cachedInstance = new Tempo(cachedIso, coreOptions);
    return attachAiMeta(cachedInstance, {
      provider: 'cache',
      cached: true,
      confidence: 1.0,
      ambiguous: false,
      granularity: 'day',
      rawIso: cachedIso,
      rawPrompt: isDebug ? str : undefined,
      normalizedPrompt: isDebug ? normalizedStr : undefined
    });
  }

  if (!force) {
    try {
      const native = new Tempo(str, { ...coreOptions, silent: true });
      const hasNativeMatches = Tempo.cache.has(str)
        || Tempo.cache.has(normalizedStr)
        || /^\d{4}-\d{2}-\d{2}/.test(str.trim())
        || native.isValid;

      if (native.isValid && hasNativeMatches) {
        if (isDebug) console.log(`[parseAI] Resolved natively: "${str}"`);
        return attachAiMeta(native, {
          provider: 'native',
          cached: false,
          confidence: 1.0,
          ambiguous: false,
          granularity: 'day',
          rawPrompt: isDebug ? str : undefined,
          normalizedPrompt: isDebug ? normalizedStr : undefined
        });
      }
    } catch {
      // Fallback
    }
  }

  const contextString = `Current Time: ${anchorTempo.format('{wkd}, {yyyy}-{mm}-{dd} {hh}:{mi}:{ss}')}, Timezone: ${tz}, Calendar: ${cal}, Locale: ${loc}, Hemisphere: ${sph}.`;

  const availableProviders = providers || _state.config.providers;
  if (!availableProviders || availableProviders.length === 0)
    throw new TempoAiError('No AI providers configured. Please call initAI().', 400);

  assertNoReservedProviderId(availableProviders);

  const mode = aiMode || AiMode.Fallback;
  let successfulResult: { parsedData: any; providerId: string; rateLimits?: any } | null = null;

  if (mode === AiMode.Fallback) {
    let lastError: any = null;
    let bestCandidate: { parsedData: any; providerId: string; rateLimits?: any } | null = null;

    for (const provider of availableProviders) {
      try {
        const { rawContent, providerId, rateLimits } = await fetchFromProvider(provider, str, contextString, isDebug, undefined, callTimeout);
        const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        const parsedData = JSON.parse(cleanContent);

        const candidateConfidence = typeof parsedData?.confidence === 'number' ? parsedData.confidence : (parsedData?.iso === 'INVALID' ? 0.0 : 1.0);

        if (!bestCandidate || candidateConfidence > (bestCandidate.parsedData?.confidence ?? 0)) {
          bestCandidate = { parsedData, providerId, rateLimits };
        }

        if (minConfidence === undefined || candidateConfidence >= minConfidence) {
          successfulResult = { parsedData, providerId, rateLimits };
          break;
        }

        if (isDebug) {
          console.log(`[parseAI] Provider ${providerId} confidence (${candidateConfidence}) below minConfidence (${minConfidence}). Cascading to next provider...`);
        }
      } catch (err: any) {
        lastError = err;
        if (err instanceof TempoAiError && err.code === 422 && minConfidence === undefined) break;
      }
    }

    if (!successfulResult) {
      if (bestCandidate) {
        successfulResult = bestCandidate;
      } else {
        throw lastError || new TempoAiError('All configured AI providers failed.', 500);
      }
    }

  } else if (mode === AiMode.Race) {
    const parentController = new AbortController();
    try {
      const promises = availableProviders.map(async (provider) => {
        const { rawContent, providerId, rateLimits } = await fetchFromProvider(provider, str, contextString, isDebug, parentController.signal, callTimeout);
        const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        return { parsedData: JSON.parse(cleanContent), providerId, rateLimits };
      });
      successfulResult = await Promise.race(promises);
      parentController.abort();
    } catch (err: any) {
      parentController.abort();
      throw err instanceof TempoAiError ? err : new TempoAiError(`Provider race failed: ${err.message}`, 500);
    }

  } else if (mode === AiMode.Consensus) {
    const promises = availableProviders.map(async (provider) => {
      const { rawContent, providerId, rateLimits } = await fetchFromProvider(provider, str, contextString, isDebug, undefined, callTimeout);
      const cleanContent = rawContent.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      return { parsedData: JSON.parse(cleanContent), providerId, rateLimits };
    });

    const settled = await Promise.allSettled(promises);
    const fulfilled = settled
      .filter((s): s is PromiseFulfilledResult<{ parsedData: any; providerId: string; rateLimits: any }> => s.status === 'fulfilled')
      .map(s => s.value);

    if (fulfilled.length === 0) {
      const firstRejected = settled.find(s => s.status === 'rejected') as PromiseRejectedResult | undefined;
      throw firstRejected?.reason || new TempoAiError('Consensus failed: all providers rejected.', 500);
    }

    if (fulfilled.length === 1) {
      successfulResult = fulfilled[0];
    } else {
      const firstIso = fulfilled[0].parsedData?.iso;
      const allMatch = fulfilled.every(f => f.parsedData?.iso === firstIso);

      if (allMatch) {
        successfulResult = {
          parsedData: {
            ...fulfilled[0].parsedData,
            confidence: 1.0,
            ambiguous: false
          },
          providerId: AiMode.Consensus,
          rateLimits: fulfilled[0].rateLimits
        };
      } else {
        const sorted = [...fulfilled].sort((a, b) => (b.parsedData?.confidence ?? 0) - (a.parsedData?.confidence ?? 0));
        successfulResult = {
          parsedData: {
            ...sorted[0].parsedData,
            ambiguous: true
          },
          providerId: sorted[0].providerId,
          rateLimits: sorted[0].rateLimits
        };
      }
    }
  }

  _state.limits = successfulResult?.rateLimits ?? null;

  const { parsedData, providerId, rateLimits } = successfulResult!;
  const rawIso = typeof parsedData?.iso === 'string' ? parsedData.iso : 'INVALID';
  const confidence = typeof parsedData?.confidence === 'number' ? parsedData.confidence : (rawIso === 'INVALID' ? 0.0 : 1.0);
  const ambiguous = Boolean(parsedData?.ambiguous || rawIso === 'INVALID');
  const granularity = typeof parsedData?.granularity === 'string' ? parsedData.granularity : 'unknown';
  const reasoning = typeof parsedData?.reasoning === 'string' ? parsedData.reasoning : undefined;

  const isBelowMinConfidence = minConfidence !== undefined && confidence < minConfidence;

  if (rawIso === 'INVALID' || isBelowMinConfidence) {
    const invalidInstance = new Tempo('INVALID', { ...coreOptions, catch: true });
    return attachAiMeta(invalidInstance, {
      provider: providerId,
      cached: false,
      confidence,
      ambiguous: true,
      granularity,
      rawIso: rawIso === 'INVALID' ? 'INVALID' : rawIso,
      reasoning: isDebug ? reasoning : undefined,
      rawPrompt: isDebug ? str : undefined,
      normalizedPrompt: isDebug ? normalizedStr : undefined,
      limits: rateLimits ?? undefined
    });
  }

  const parsedIso = `${rawIso.replace(/Z$/i, '')}[${tz}]`;

  // Determine TTL hierarchy: options.ttl > provider.ttl > global config.ttl > 3600000 (1 hour)
  const winningProvider = availableProviders.find(p => p.id === providerId);
  const resolvedTtl = options?.ttl ?? winningProvider?.ttl ?? _state.config.ttl ?? 3600000;

  if (aiCacheOption !== false) {
    if (adapter) {
      try {
        const res = adapter.set(cacheKey, parsedIso, resolvedTtl);
        if (res instanceof Promise) await res;
      } catch (err: any) {
        if (isDebug) console.log('[tempo-plugin-ai] Cache adapter write error:', err?.message);
      }
    }
    Tempo.cache.set(cacheKey, parsedIso);
  }

  const finalInstance = new Tempo(parsedIso, coreOptions);
  return attachAiMeta(finalInstance, {
    provider: providerId,
    cached: false,
    confidence,
    ambiguous,
    granularity,
    rawIso,
    reasoning: isDebug ? reasoning : undefined,
    rawPrompt: isDebug ? str : undefined,
    normalizedPrompt: isDebug ? normalizedStr : undefined,
    limits: rateLimits ?? undefined
  });
}

export async function parseAI(input: string, options?: AiParseOptions): Promise<Tempo>;
export async function parseAI(input: string[], options?: AiParseOptions): Promise<(Tempo | TempoAiError)[]>;
export async function parseAI(
  input: string | string[],
  options?: AiParseOptions
): Promise<Tempo | (Tempo | TempoAiError)[]> {
  if (Array.isArray(input)) {
    if (options?.softErrors) {
      const settled = await Promise.allSettled(input.map(str => parseSingleInput(str, options)));
      return settled.map(s => s.status === 'fulfilled' ? s.value : (s.reason as TempoAiError));
    }
    return Promise.all(input.map(str => parseSingleInput(str, options)));
  }

  return parseSingleInput(input, options);
}

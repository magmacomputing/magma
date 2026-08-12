import { Tempo } from '@magmacomputing/tempo';

import { getResolvedProviderDefaults, loadRemoteManifest, resetManifestCache } from './manifest.js';
import { normalizeCacheInput, assertNoReservedProviderId } from './support.js';
import type { AiConfig, AiRateLimits, AiProvider } from '../types/index.js';

/**
 * Internal singleton state container for the AI plugin.
 * @internal
 */
export const _state: {
  config: AiConfig;
  rawProviders?: AiProvider[] | undefined;
  limits: AiRateLimits | null;
  providerLimits: Map<string, AiRateLimits>;
  revision: number;
} = {
  config: {},
  rawProviders: undefined,
  limits: null,
  providerLimits: new Map(),
  revision: 0,
}

/**
 * Initializes the Tempo AI plugin with the specified global configuration.
 * Configures AI provider credentials, models, timeouts, caching options,
 * and asynchronously resolves provider defaults against remote manifests.
 *
 * @param config - Global AI plugin configuration object
 * @returns A Promise that resolves once initial configuration and background manifest synchronization is scheduled
 * @example
 * ```ts
 * await initAI({
 *   providers: [{ id: 'groq', key: 'gsk_...' }],
 *   mode: AiMode.Consensus
 * });
 * ```
 */
export function initAI(config: AiConfig): Promise<void> {
  if (config.providers)
    assertNoReservedProviderId(config.providers);

  if (config.providers)
    _state.rawProviders = config.providers;

  const currentRevision = ++_state.revision;
  const remoteUrl = config.remoteConfigUrl ?? _state.config.remoteConfigUrl;
  const callerProviders = config.providers ?? _state.rawProviders;

  const resolveSyncProviders = (providers?: AiProvider[]) => {
    if (!providers) return _state.config.providers;
    return providers.map(p => {
      const normalizedId = p.id?.toLowerCase() ?? '';
      const defaults = getResolvedProviderDefaults(normalizedId, remoteUrl, config.debug ?? _state.config.debug);
      return {
        ...defaults,
        ...p
      } as AiProvider;
    });
  }

  // Synchronously update _state.config for immediate availability
  _state.config = {
    ..._state.config,
    ...config,
    providers: resolveSyncProviders(callerProviders) || []
  };

  if (config.cache) {
    Tempo.init({ cache: config.cache, silent: true });
  }

	return (async () => {
		if (remoteUrl !== false) {
			try {
				await loadRemoteManifest(remoteUrl, undefined, config.debug ?? _state.config.debug);
			} catch { }
		}

		if (_state.revision !== currentRevision) return;

		const fetchDefaults = config.fetchDefaults ?? _state.config.fetchDefaults;
		const currentProviders = callerProviders;

		if (fetchDefaults && currentProviders) {
			const asyncProviders = await Promise.all(currentProviders.map(async p => {
				const normalizedId = p.id?.toLowerCase() ?? '';
				const defaults = getResolvedProviderDefaults(normalizedId, remoteUrl, config.debug ?? _state.config.debug);
				let hookOptions: Partial<AiProvider> | null = null;
				try {
					hookOptions = await fetchDefaults(normalizedId);
				} catch { }
				return {
					...defaults,
					...(hookOptions ?? {}),
					...p,
				} as AiProvider;
			}));
			if (_state.revision === currentRevision)
				_state.config.providers = asyncProviders;
		} else if (currentProviders) {
			if (_state.revision === currentRevision)
				_state.config.providers = resolveSyncProviders(currentProviders);
		}
	})();
}

/**
 * Resets the global AI state, cached rate limits, and remote manifest cache.
 * Useful for test isolation and clean lifecycle teardown.
 */
export function resetAI(): void {
  _state.config = {};
  _state.rawProviders = undefined;
  _state.limits = null;
  _state.providerLimits.clear();
  _state.revision++;
  resetManifestCache();
}

/**
 * Clears AI parsing results from the in-memory cache and any external storage adapters.
 * If specific input strings or keys are provided, selectively purges only those entries.
 *
 * @param input - Optional string key, date string, or array of strings to purge from the cache
 * @returns A Promise that resolves once cache eviction is completed
 * @example
 * ```ts
 * await clearAiCache('next tuesday');
 * await clearAiCache(); // Clears all cached AI entries
 * ```
 */
export async function clearAiCache(input?: string | string[]): Promise<void> {
  const adapter = _state.config.cacheAdapter;

  if (!input) {
    Tempo.cache.clear();
    if (adapter?.clear) {
      try {
        await Promise.resolve(adapter.clear()).catch(() => { });
      } catch { }
    }
    return;
  }

  const inputs = Array.isArray(input) ? input : [input];
  for (const i of inputs) {
    const normalized = normalizeCacheInput(i);
    const prefix = `${normalized}::`;
    Tempo.cache.delete(normalized);
    Tempo.cache.delete(i);
    Tempo.cache.deletePrefix(prefix);

    if (adapter) {
      try {
        if (adapter.delete) {
          await Promise.resolve(adapter.delete(normalized)).catch(() => { });
          await Promise.resolve(adapter.delete(i)).catch(() => { });
        }
        if (adapter.clear) {
          await Promise.resolve(adapter.clear(prefix)).catch(() => { });
        }
      } catch { }
    }
  }
}

/**
 * Retrieves the latest observed rate limits across all provider responses.
 *
 * @returns The current rate limits snapshot containing remaining requests/tokens and reset timestamp, or `null` if none recorded
 */
export function getAiRateLimits(): AiRateLimits | null {
  return _state.limits;
}

/**
 * Retrieves the latest observed rate limits for a specific AI provider.
 *
 * @param providerId - The provider ID to look up
 * @returns The provider rate limits snapshot, or `null` if none recorded
 */
export function getAiProviderRateLimits(providerId: string): AiRateLimits | null {
  return _state.providerLimits.get(providerId) ?? null;
}

/**
 * Returns a shallowly frozen, sanitized snapshot of the active AI configuration.
 * Sensitive provider API keys are redacted for safety.
 *
 * @returns A frozen, read-only configuration object with frozen providers array and redacted API keys
 */
export function getAiConfig(): Readonly<AiConfig> {
  const sanitizedProviders: AiProvider[] = _state.config.providers?.map(p => {
    const clone = { ...p };
    if (clone.key)
      clone.key = '[REDACTED]';
    return clone;
  }) ?? [];

  return Object.freeze({
    ..._state.config,
    providers: Object.freeze(sanitizedProviders) as unknown as AiProvider[]
  });
}

/**
 * Parses HTTP rate-limit reset headers into a `Tempo` instance.
 * Supports raw seconds, UNIX timestamps, compound durations (e.g. '1m30s'), and HTTP-date strings.
 *
 * @param resetHeader - The raw reset header string value (e.g. from `Retry-After` or `x-ratelimit-reset-*`)
 * @returns A `Tempo` instance pointing to the reset time, or `null` if unparseable
 */
export function parseResetHeaderToTempo(resetHeader: string): Tempo | null {
  const trimmed = resetHeader.trim();
  if (!trimmed) return null;

  // Case 1: Simple numeric string (seconds or epoch)
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const val = parseFloat(trimmed);
    if (Number.isNaN(val) || val < 0) return null;
    if (val > 1000000000) {
      try {
        const t = new Tempo(val * 1000);
        return t.isValid ? t : null;
      } catch {
        return null;
      }
    }
    try {
      const t = new Tempo().add(`${val} seconds`);
      return t.isValid ? t : null;
    } catch {
      return null;
    }
  }

  // Case 2: Compound duration like '4m12s', '1h30m20s', '2m30.5s', '500ms'
  const compoundRegex = /^(?:(\d+(?:\.\d+)?)d)?(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$/i;
  if (compoundRegex.test(trimmed)) {
    const match = trimmed.match(compoundRegex);
    if (match) {
      const d = match[1] ? parseFloat(match[1]) : 0;
      const h = match[2] ? parseFloat(match[2]) : 0;
      const m = match[3] ? parseFloat(match[3]) : 0;
      const s = match[4] ? parseFloat(match[4]) : 0;
      const ms = match[5] ? parseFloat(match[5]) : 0;

      const totalMs = (d * 86400 + h * 3600 + m * 60 + s) * 1000 + ms;
      if (totalMs <= 0 || Number.isNaN(totalMs)) return null;

      try {
        const t = new Tempo().add(`${totalMs} milliseconds`);
        return t.isValid ? t : null;
      } catch {
        return null;
      }
    }
  }

  // Case 3: HTTP-date string (e.g., 'Wed, 21 Oct 2026 07:28:00 GMT')
  if (/GMT|UTC|\d{2}:\d{2}:\d{2}/i.test(trimmed)) {
    try {
      const t = new Tempo(trimmed, { catch: true });
      return t.isValid ? t : null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Extracts and parses rate-limiting metadata from an HTTP response's headers.
 * Inspects `x-ratelimit-remaining-requests`, `x-ratelimit-remaining-tokens`, and `retry-after`/`reset` headers.
 *
 * @param response - The Fetch `Response` object to inspect
 * @returns An `AiRateLimits` structure, or `null` if no rate-limit headers are present
 */
export function parseRateLimitsFromResponse(response: Response): AiRateLimits | null {
  const remReqHeader = response.headers.get('x-ratelimit-remaining-requests');
  const remTokHeader = response.headers.get('x-ratelimit-remaining-tokens');
  const resetTokHeader = response.headers.get('x-ratelimit-reset-tokens')
    || response.headers.get('x-ratelimit-reset-requests')
    || response.headers.get('retry-after');

  if (remReqHeader === null && remTokHeader === null && resetTokHeader === null)
    return null;

  const reqNum = remReqHeader !== null ? parseInt(remReqHeader, 10) : NaN;
  const tokNum = remTokHeader !== null ? parseInt(remTokHeader, 10) : NaN;

  const parsedReq = Number.isNaN(reqNum) ? null : reqNum;
  const parsedTok = Number.isNaN(tokNum) ? null : tokNum;
  const resetAtTempo = resetTokHeader ? parseResetHeaderToTempo(resetTokHeader) : null;

  if (parsedReq === null && parsedTok === null && resetAtTempo === null)
    return null;

  return {
    remainingRequests: parsedReq,
    remainingTokens: parsedTok,
    resetAt: resetAtTempo
  }
}

/**
 * Inspects an HTTP response and extracts updated rate-limit statistics.
 *
 * @param response - The Fetch `Response` object to inspect
 * @returns An `AiRateLimits` structure, or `null` if no rate-limit headers are present
 */
export function updateRateLimitsFromResponse(response: Response): AiRateLimits | null {
  return parseRateLimitsFromResponse(response);
}

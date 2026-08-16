import { Tempo } from '@magmacomputing/tempo';

import { getResolvedProviderDefaults, loadRemoteManifest, resetManifestCache } from './manifest.js';
import { assertNoReservedProviderId } from './support.js';
import { warnDebug } from './logger.js';
import {
	getActiveTempoConfigAi,
	resolveAutoDiscoveredConfig,
	scanWellKnownEnvProviders,
	interpolateEnv,
	getRuntimeEnv,
	WELL_KNOWN_ENV_MAP,
} from './discovery.js';
import type { AiConfig, AiRateLimits, AiProvider } from '../types/index.js';

let _config: AiConfig = {};

/**
 * Internal singleton state container for the AI plugin.
 * Automatically resolves configuration from Tempo runtime on first access.
 * @internal
 */
export const _state = {
	get config(): AiConfig {
		if (_state.rawProviders === undefined && (!_config.providers || _config.providers.length === 0)) {
			const tempoAiConfig = getActiveTempoConfigAi();
			if (tempoAiConfig) {
				initAI(tempoAiConfig);
			} else {
				const envProviders = scanWellKnownEnvProviders();
				if (envProviders.length > 0)
					initAI({ providers: envProviders });
			}
		}
		return _config;
	},
	set config(val: AiConfig) {
		_config = val;
	},
	rawProviders: undefined as AiProvider[] | undefined,
	limits: null as AiRateLimits | null,
	providerLimits: new Map<string, AiRateLimits>(),
	revision: 0,
};

/**
 * Ensures AI configuration is automatically initialized from Tempo.config,
 * filesystem tempo.config.*, or runtime environment variables if providers are not yet configured.
 */
export async function ensureAiInitialized(): Promise<void> {
	if (_state.config.providers && _state.config.providers.length > 0)
		return;

	const discovered = await resolveAutoDiscoveredConfig();
	if (discovered.providers && discovered.providers.length > 0) {
		await initAI(discovered);
	}
}

function resolveProviderApiKey(id: string, explicitKey?: string, env: Record<string, string | undefined> = getRuntimeEnv()): string | undefined {
	if (explicitKey) return explicitKey;
	const envVars = WELL_KNOWN_ENV_MAP[id.toLowerCase()];
	if (!envVars) return undefined;
	for (const envVar of envVars) {
		const val = env[envVar];
		if (val && typeof val === 'string' && val.trim().length > 0)
			return val.trim();
	}
	return undefined;
}

/**
 * Initializes the Tempo AI plugin with the specified global configuration.
 * Configures AI provider credentials, models, timeouts, caching options,
 * and asynchronously resolves provider defaults against remote manifests.
 *
 * @param config - Optional AI plugin configuration object (inherits from Tempo.config.plugins.ai or Tempo.config.ai if omitted)
 * @returns A Promise that resolves once initial configuration and background manifest synchronization is scheduled
 * @example
 * ```ts
 * await initAI({
 *   providers: [{ id: 'groq', key: 'gsk_...' }],
 *   mode: AiMode.Consensus
 * });
 * ```
 */
export function initAI(config?: AiConfig): Promise<void> {
	const tempoAiConfig = getActiveTempoConfigAi();
	const env = getRuntimeEnv();

	const hasExplicitProviders = config?.providers !== undefined || tempoAiConfig?.providers !== undefined;

	const mergedRaw: AiConfig = {
		...(tempoAiConfig || {}),
		...(config || {}),
	};

	const mergedConfig = interpolateEnv(mergedRaw, env);

	if (!hasExplicitProviders && (!mergedConfig.providers || mergedConfig.providers.length === 0)) {
		const envProviders = scanWellKnownEnvProviders(env);
		if (envProviders.length > 0)
			mergedConfig.providers = envProviders;
	}

	if (mergedConfig.providers)
		assertNoReservedProviderId(mergedConfig.providers);

	if (mergedConfig.providers !== undefined)
		_state.rawProviders = mergedConfig.providers;

	const currentRevision = ++_state.revision;
	const remoteUrl = mergedConfig.remoteConfigUrl ?? _state.config.remoteConfigUrl;
	const callerProviders = mergedConfig.providers ?? _state.rawProviders;

	const resolveSyncProviders = (providers?: AiProvider[]) => {
		if (!providers) return _state.config.providers;
		return providers.map(p => {
			const normalizedId = p.id?.toLowerCase() ?? '';
			const defaults = getResolvedProviderDefaults(normalizedId, remoteUrl, mergedConfig.debug ?? _state.config.debug);
			const resolvedKey = (p.key && p.key.trim().length > 0) ? p.key : resolveProviderApiKey(normalizedId, undefined, env);
			return {
				...defaults,
				...p,
				...(resolvedKey ? { key: resolvedKey } : {}),
			} as AiProvider;
		});
	};

	// Synchronously update _state.config for immediate availability
	_state.config = {
		..._state.config,
		...mergedConfig,
		providers: resolveSyncProviders(callerProviders) || [],
	};

	if (mergedConfig.cache) {
		Tempo.init({ cache: mergedConfig.cache, silent: true });
	}

  return (async () => {
    if (remoteUrl !== false) {
      try {
        await loadRemoteManifest(remoteUrl, undefined, mergedConfig.debug ?? _state.config.debug);
      } catch { }
    }

    if (_state.revision !== currentRevision) return;

    const fetchDefaults = mergedConfig.fetchDefaults ?? _state.config.fetchDefaults;
    const currentProviders = callerProviders;

    if (fetchDefaults && currentProviders) {
      const asyncProviders = await Promise.all(currentProviders.map(async p => {
        const normalizedId = p.id?.toLowerCase() ?? '';
        const defaults = getResolvedProviderDefaults(normalizedId, remoteUrl, mergedConfig.debug ?? _state.config.debug);
        const resolvedKey = p.key ?? resolveProviderApiKey(normalizedId);
        let hookOptions: Partial<AiProvider> | null = null;
        try {
          hookOptions = await fetchDefaults(normalizedId);
        } catch (err: any) {
          warnDebug('tempo-plugin-ai:init', `fetchDefaults hook failed for provider '${normalizedId}'`, err, { debug: mergedConfig.debug ?? _state.config.debug });
        }
        return {
          ...defaults,
          ...(hookOptions ?? {}),
          ...p,
          ...(resolvedKey ? { key: resolvedKey } : {})
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

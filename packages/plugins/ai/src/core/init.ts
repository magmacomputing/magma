import { Tempo } from '@magmacomputing/tempo';

import { getResolvedProviderDefaults, loadRemoteManifest } from './manifest.js';
import { normalizeCacheInput, assertNoReservedProviderId } from './support.js';
import type { AiConfig, AiRateLimits, AiProvider } from './types.js';

export const _state: {
  config: AiConfig;
  limits: AiRateLimits | null;
  revision: number;
} = {
  config: {},
  limits: null,
  revision: 0,
}

export function initAI(config: AiConfig): Promise<void> {
  if (config.providers)
    assertNoReservedProviderId(config.providers);

  const currentRevision = ++_state.revision;
  const remoteUrl = config.remoteConfigUrl ?? _state.config.remoteConfigUrl;

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
    providers: resolveSyncProviders(config.providers) || []
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

    if (config.fetchDefaults && config.providers) {
      const asyncProviders = await Promise.all(config.providers.map(async p => {
        const normalizedId = p.id?.toLowerCase() ?? '';
        const defaults = getResolvedProviderDefaults(normalizedId, remoteUrl, config.debug ?? _state.config.debug);
        let hookOptions: Partial<AiProvider> | null = null;
        try {
          hookOptions = await config.fetchDefaults!(normalizedId);
        } catch { }
        return {
          ...defaults,
          ...(hookOptions ?? {}),
          ...p
        } as AiProvider;
      }));
      if (_state.revision === currentRevision)
        _state.config.providers = asyncProviders;
    } else if (config.providers) {
      if (_state.revision === currentRevision)
        _state.config.providers = resolveSyncProviders(config.providers);
    }
  })();
}

export async function clearAiCache(input?: string | string[]): Promise<void> {
  const adapter = _state.config.cacheAdapter;

  if (!input) {
    Tempo.cache.clear();
    if (adapter?.clear) {
      try {
        const res = adapter.clear();
        if (res instanceof Promise) await res.catch(() => { });
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
          const res1 = adapter.delete(normalized);
          if (res1 instanceof Promise) await res1.catch(() => { });
          const res2 = adapter.delete(i);
          if (res2 instanceof Promise) await res2.catch(() => { });
        }
        if (adapter.clear) {
          const resClear = adapter.clear(prefix);
          if (resClear instanceof Promise) await resClear.catch(() => { });
        }
      } catch { }
    }
  }
}

export function getAiRateLimits(): AiRateLimits | null {
	return _state.limits;
}

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

export function updateRateLimitsFromResponse(response: Response): AiRateLimits | null {
  return parseRateLimitsFromResponse(response);
}

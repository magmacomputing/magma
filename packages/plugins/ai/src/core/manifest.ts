import { DEFAULT_PROVIDERS } from './config.js';
import type { AiProvider } from './types.js';

export const DEFAULT_REMOTE_MANIFEST_URL = 'https://tempo.magmacomputing.com.au/providers.v1.json';
export const DEFAULT_MANIFEST_TIMEOUT_MS = 1500;

let _cachedManifest: Record<string, Partial<AiProvider>> | null = null;
let _fetchPromise: Promise<Record<string, Partial<AiProvider>> | null> | null = null;

/**
 * Resets the in-memory manifest cache (used primarily for unit testing).
 */
export function resetManifestCache(): void {
	_cachedManifest = null;
	_fetchPromise = null;
}

/**
 * Fetches the remote AI provider manifest once per module load.
 * Fail-open: if network fails or times out, returns null and allows fallback to local DEFAULT_PROVIDERS.
 */
export async function loadRemoteManifest(
	remoteConfigUrl: string | false = DEFAULT_REMOTE_MANIFEST_URL,
	timeoutMs: number = DEFAULT_MANIFEST_TIMEOUT_MS,
	debug: boolean = false
): Promise<Record<string, Partial<AiProvider>> | null> {
	if (remoteConfigUrl === false) {
		return null;
	}

	if (_cachedManifest !== null) {
		return _cachedManifest;
	}

	if (_fetchPromise !== null) {
		return _fetchPromise;
	}

	const targetUrl = typeof remoteConfigUrl === 'string' && remoteConfigUrl.trim().length > 0
		? remoteConfigUrl
		: DEFAULT_REMOTE_MANIFEST_URL;

	_fetchPromise = (async () => {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);

			const response = await fetch(targetUrl, {
				signal: controller.signal,
				headers: { Accept: 'application/json' }
			});

			clearTimeout(timer);

			if (!response.ok) {
				if (debug) {
					console.warn(`[tempo-plugin-ai] Remote manifest fetch failed with status ${response.status}`);
				}
				_cachedManifest = {};
				return null;
			}

			const data = await response.json();
			if (data && typeof data === 'object' && data.providers && typeof data.providers === 'object') {
				_cachedManifest = data.providers as Record<string, Partial<AiProvider>>;
				return _cachedManifest;
			}

			if (debug) {
				console.warn('[tempo-plugin-ai] Remote manifest missing valid "providers" object structure');
			}
			_cachedManifest = {};
			return null;
		} catch (err: any) {
			if (debug) {
				console.warn(`[tempo-plugin-ai] Remote manifest fetch error: ${err?.message || err}`);
			}
			// Fail-open: store empty object so we fallback to DEFAULT_PROVIDERS without hanging subsequent calls
			_cachedManifest = {};
			return null;
		} finally {
			_fetchPromise = null;
		}
	})();

	return _fetchPromise;
}

/**
 * Resolves the default settings for a given provider ID by combining compiled DEFAULT_PROVIDERS
 * with remote manifest entries if available.
 */
export function getResolvedProviderDefaults(
	providerId: string,
	remoteConfigUrl?: string | false,
	debug: boolean = false
): Partial<AiProvider> {
	const normalizedId = providerId?.toLowerCase() ?? '';
	const localDefaults = DEFAULT_PROVIDERS[normalizedId] || DEFAULT_PROVIDERS.openai;

	if (remoteConfigUrl === false || !_cachedManifest || !_cachedManifest[normalizedId]) {
		return localDefaults;
	}

	return {
		...localDefaults,
		..._cachedManifest[normalizedId]
	};
}

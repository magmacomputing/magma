import { DEFAULT_PROVIDERS } from './config.js';
import type { AiProvider } from './types.js';

export const DEFAULT_REMOTE_MANIFEST_URL = 'https://tempo.magmacomputing.com.au/providers.v1.json';
export const DEFAULT_MANIFEST_TIMEOUT_MS = 1500;

let _cachedManifestMap = new Map<string, Record<string, Partial<AiProvider>>>();
let _fetchPromiseMap = new Map<string, Promise<Record<string, Partial<AiProvider>> | null>>();

/**
 * Resets the in-memory manifest cache (used primarily for unit testing).
 */
export function resetManifestCache(): void {
	_cachedManifestMap.clear();
	_fetchPromiseMap.clear();
}

/**
 * Fetches the remote AI provider manifest. Remote defaults are loaded during initialization.
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

	const targetUrl = typeof remoteConfigUrl === 'string' && remoteConfigUrl.trim().length > 0
		? remoteConfigUrl.trim()
		: DEFAULT_REMOTE_MANIFEST_URL;

	if (_cachedManifestMap.has(targetUrl)) {
		return _cachedManifestMap.get(targetUrl)!;
	}

	if (_fetchPromiseMap.has(targetUrl)) {
		return _fetchPromiseMap.get(targetUrl)!;
	}

	const fetchPromise = (async () => {
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
				const empty = {};
				_cachedManifestMap.set(targetUrl, empty);
				return null;
			}

			const data = await response.json();
			if (data && typeof data === 'object' && data.providers && typeof data.providers === 'object') {
				const manifest = data.providers as Record<string, Partial<AiProvider>>;
				_cachedManifestMap.set(targetUrl, manifest);
				return manifest;
			}

			if (debug) {
				console.warn('[tempo-plugin-ai] Remote manifest missing valid "providers" object structure');
			}
			const empty = {};
			_cachedManifestMap.set(targetUrl, empty);
			return null;
		} catch (err: any) {
			if (debug) {
				console.warn(`[tempo-plugin-ai] Remote manifest fetch error: ${err?.message || err}`);
			}
			// Fail-open: store empty object so we fallback to DEFAULT_PROVIDERS without hanging subsequent calls
			const empty = {};
			_cachedManifestMap.set(targetUrl, empty);
			return null;
		} finally {
			_fetchPromiseMap.delete(targetUrl);
		}
	})();

	_fetchPromiseMap.set(targetUrl, fetchPromise);
	return fetchPromise;
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

	if (remoteConfigUrl === false) {
		return localDefaults;
	}

	const targetUrl = typeof remoteConfigUrl === 'string' && remoteConfigUrl.trim().length > 0
		? remoteConfigUrl.trim()
		: DEFAULT_REMOTE_MANIFEST_URL;

	const cached = _cachedManifestMap.get(targetUrl);
	if (!cached || !cached[normalizedId]) {
		return localDefaults;
	}

	const manifestEntry = { ...cached[normalizedId] };

	// Validate manifest-derived URL origin: must be HTTPS or localhost HTTP
	if (manifestEntry.url) {
		try {
			const parsed = new URL(manifestEntry.url);
			if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'))) {
				if (debug) console.warn(`[tempo-plugin-ai] Rejected manifest provider URL '${manifestEntry.url}' - invalid HTTPS origin.`);
				delete manifestEntry.url;
			}
		} catch {
			delete manifestEntry.url;
		}
	}

	return {
		...localDefaults,
		...manifestEntry
	};
}

import { asText, fetchRequest, isObject, isString, parseJSONC } from '@magmacomputing/tempo/library';
import { DEFAULT_PROVIDERS } from './config.js';
import type { AiProvider } from '../types/index.js';

export const DEFAULT_REMOTE_MANIFEST_URL = 'https://tempo.magmacomputing.com.au/providers.v1.json';
export const DEFAULT_MANIFEST_TIMEOUT_MS = 1500;
export const MAX_MANIFEST_BYTES = 512 * 1024;

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
 * Validates that a manifest or provider URL uses HTTPS or HTTP localhost.
 */
export function isValidManifestUrl(urlStr: string): boolean {
	try {
		const parsed = new URL(urlStr);
		return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'));
	} catch {
		return false;
	}
}

/**
 * Fetches the remote AI provider manifest. Remote defaults are loaded during initialization.
 * Supports both standard JSON and JSONC (JSON with comments & trailing commas).
 * Fail-open: if network fails or times out, returns null and allows fallback to local DEFAULT_PROVIDERS.
 */
export async function loadRemoteManifest(
	remoteConfigUrl: string | false = DEFAULT_REMOTE_MANIFEST_URL,
	timeoutMs: number = DEFAULT_MANIFEST_TIMEOUT_MS,
	debug: boolean = false
): Promise<Record<string, Partial<AiProvider>> | null> {
	if (remoteConfigUrl === false)
		return null;

	const targetUrl = asText(remoteConfigUrl, DEFAULT_REMOTE_MANIFEST_URL);

	if (!isValidManifestUrl(targetUrl)) {
		if (debug)
			console.warn(`[tempo-plugin-ai] Rejected remote manifest URL '${targetUrl}' - must be HTTPS or localhost HTTP.`);
		return null;
	}

	if (_cachedManifestMap.has(targetUrl))
		return _cachedManifestMap.get(targetUrl)!;

	if (_fetchPromiseMap.has(targetUrl))
		return _fetchPromiseMap.get(targetUrl)!;

	const fetchPromise = (async () => {
		try {
			const rawOrData = await fetchRequest<string | Record<string, any>>(targetUrl, {
				headers: { Accept: 'application/json, text/plain, */*' },
				redirect: 'error',
			}, {
				timeout: timeoutMs,
				maxBytes: MAX_MANIFEST_BYTES,
			});

			const data = isString(rawOrData) ? parseJSONC(rawOrData) : rawOrData;
			if (isObject(data) && isObject(data.providers)) {
				const manifest = data.providers as Record<string, Partial<AiProvider>>;
				_cachedManifestMap.set(targetUrl, manifest);
				return manifest;
			}

			if (debug)
				console.warn('[tempo-plugin-ai] Remote manifest missing valid "providers" object structure');

			const empty = {};
			_cachedManifestMap.set(targetUrl, empty);
			return null;
		} catch (err: any) {
			if (debug)
				console.warn(`[tempo-plugin-ai] Remote manifest fetch error: ${err?.message || err}`);

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
	const localDefaults = DEFAULT_PROVIDERS[normalizedId] || {};

	if (remoteConfigUrl === false)
		return localDefaults;

	const targetUrl = asText(remoteConfigUrl, DEFAULT_REMOTE_MANIFEST_URL);

	const cached = _cachedManifestMap.get(targetUrl);
	if (!cached || !cached[normalizedId])
		return localDefaults;

	const manifestEntry = { ...cached[normalizedId] };

	// Validate manifest-derived URL origin: must be HTTPS or localhost HTTP
	if (manifestEntry.url) {
		if (!isValidManifestUrl(manifestEntry.url)) {
			if (debug)
				console.warn(`[tempo-plugin-ai] Rejected manifest provider URL '${manifestEntry.url}' - invalid HTTPS origin.`);
			delete manifestEntry.url;
		}
	}

	return {
		...localDefaults,
		...manifestEntry
	};
}

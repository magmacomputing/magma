import { CONTEXT, getContext } from '#library/utility.library.js';
import { isNullish, isNumber, isString, isSafeKey, isObject, isEmpty, isReference, isPrimitive, isText, isFunction, isDefined, isCallable, isBoolean } from '#library/assertion.library.js';
import { getStorage, setStorage } from '#library/storage.library.js';
import { evaluate } from '#library/evaluation.library.js';

/**
 * Supported hemisphere zones including the equatorial band.
 */
export type GeoSphere = 'north' | 'south' | 'equator';

export interface GeoLookupResult {
	lat?: number | undefined;
	lng?: number | undefined;
	latitude?: number | undefined;
	longitude?: number | undefined;
	elevation?: number | undefined;
	sphere?: GeoSphere | string | undefined;
	country?: string | undefined;
	city?: string | undefined;
	timezone?: string | undefined;
	status?: string | undefined;
	error?: string | undefined;
	[key: string]: any;
}

/**
 * Standard interface for pluggable geocoding and geolocation providers.
 */
export interface GeoProvider {
	/** Unique identifier or provider name */
	readonly name: string;
	/** Resolves geographic coordinates and location metadata */
	lookup(opts?: Record<string, any>): Promise<GeoLookupResult | null>;
	/** Optional reverse geocoding from coordinates to location details */
	reverseGeocode?(coords: CoordinateInput, opts?: Record<string, any>): Promise<GeoConfig | null>;
	/** Optional forward geocoding from place/address query to coordinates */
	forwardGeocode?(query: string, opts?: Record<string, any>): Promise<ResolvedCoordinates | null>;
}

export interface ResolvedCoordinates extends GeoConfig {
	lat: number;
	lng: number;
	[key: string]: any;
}

export interface GeoOptions {
	/** Latitude coordinate in degrees */
	latitude?: number | undefined;
	/** Latitude coordinate alias in degrees @internal */
	lat?: number | undefined;
	/** Longitude coordinate in degrees */
	longitude?: number | undefined;
	/** Longitude coordinate alias in degrees @internal */
	lng?: number | undefined;
	/** Longitude coordinate alias in degrees @internal */
	lon?: number | undefined;
	/** Longitude coordinate alias in degrees @internal */
	long?: number | undefined;
	/** Altitude / Elevation in meters above sea level */
	elevation?: number | undefined;
	/** Inferred or explicit hemisphere ('north' | 'south' | 'equator') */
	sphere?: GeoSphere | string | undefined;
	/** ISO country code (e.g. 'US', 'AU') */
	country?: string | undefined;
	/** City or locality name */
	city?: string | undefined;
	/** IANA Time Zone ID (e.g. 'Australia/Sydney') */
	timezone?: string | undefined;
	/** Time zone alias @internal */
	tz?: string | undefined;
	/** Custom or future string/number key property */
	[key: string]: any;
	/** Custom symbol key property */
	[key: symbol]: any;
}

export interface GeoConfig {
	/** Latitude coordinate in degrees (-90 to 90) */
	readonly latitude?: number | undefined;
	/** Longitude coordinate in degrees (-180 to 180) */
	readonly longitude?: number | undefined;
	/** Altitude / Elevation in meters above sea level */
	readonly elevation?: number | undefined;
	/** Inferred or explicit hemisphere ('north' | 'south' | 'equator') */
	readonly sphere?: GeoSphere | string | undefined;
	/** ISO country code (e.g. 'US', 'AU') */
	readonly country?: string | undefined;
	/** City or locality name */
	readonly city?: string | undefined;
	/** IANA Time Zone ID (e.g. 'Australia/Sydney') */
	readonly timezone?: string | undefined;
	/** Custom or future string/number key property */
	readonly [key: string]: any;
	/** Custom symbol key property */
	readonly [key: symbol]: any;
}

type MutableGeoConfig = { -readonly [K in keyof GeoConfig]: GeoConfig[K] };

export interface CoordinateInput {
	geo?: GeoOptions | undefined;
	latitude?: number | undefined;
	lat?: number | undefined;
	longitude?: number | undefined;
	lng?: number | undefined;
	lon?: number | undefined;
	long?: number | undefined;
	elevation?: number | undefined;
	sphere?: GeoSphere | string | undefined;
	country?: string | undefined;
	city?: string | undefined;
	timezone?: string | undefined;
	tz?: string | undefined;
	config?: Record<string, any> | undefined;
	[key: string]: any;
}

const MAP_KEY = '_magma_geo_';
const DEFAULT_GEO_TTL = 24 * 60 * 60 * 1000;								// 24 hours
const DEFAULT_REVERSE_GEO_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client';
const DEFAULT_REVERSE_GEO_TIMEOUT = 3000;
const DEFAULT_REVERSE_GEO_MAX_BYTES = 64 * 1024;
const DEFAULT_SPATIAL_CACHE_SIZE = 1000;

/**
 * Canonical geographic property keys used for property segregation and custom key preservation.
 * @internal
 */
export const GEO_PROPERTIES = [
	'latitude',
	'lat',
	'longitude',
	'lng',
	'lon',
	'long',
	'elevation',
	'sphere',
	'country',
	'city',
	'timezone',
	'tz',
] as const;

/**
 * Internal helper to parse a raw coordinate value (number or non-empty string) into a number.
 * Returns NaN for booleans, empty/whitespace strings, or invalid values.
 * @internal
 */
const parseCoordNumber = (val: any): number => {
	if (!isDefined(val) || isBoolean(val)) return NaN;
	if (isString(val)) {
		const trimmed = val.trim();
		return trimmed.length > 0 ? Number(trimmed) : NaN;
	}
	return isNumber(val) ? val : NaN;
};

/**
 * Normalizes latitude if within [-90, 90] bounds, optionally rounding to 3 decimal places.
 * @internal
 */
const normalizeLat = (lat: any, round = true): number | undefined => {
	const n = parseCoordNumber(lat);
	if (!isNumber(n) || n < -90 || n > 90) return undefined;
	return round ? Math.round(n * 1000) / 1000 : n;
};

/**
 * Normalizes longitude if within [-180, 180] bounds, optionally rounding to 3 decimal places.
 * @internal
 */
const normalizeLng = (lng: any, round = true): number | undefined => {
	const n = parseCoordNumber(lng);
	if (!isNumber(n) || n < -180 || n > 180) return undefined;
	return round ? Math.round(n * 1000) / 1000 : n;
};

/**
 * Validates and normalizes coordinate pairs within Earth boundaries, optionally rounding to 3 decimal places.
 * @internal
 */
const normalizeCoords = (lat: any, lng: any, round = true): { lat: number; lng: number } | undefined => {
	const nLat = normalizeLat(lat, round);
	const nLng = normalizeLng(lng, round);
	return (isDefined(nLat) && isDefined(nLng)) ? { lat: nLat, lng: nLng } : undefined;
};

/**
 * Validates and rounds elevation in meters to 3 decimal places.
 * @internal
 */
const normalizeElevation = (elevation: any): number | undefined =>
	isNumber(elevation) ? Math.round(elevation * 1000) / 1000 : undefined;

/**
 * Resolves hemisphere: preserves explicit sphere if valid, or infers from latitude (+/- 0.001 band).
 * @internal
 */
const resolveSphere = (sphere?: any, lat?: number): GeoSphere | undefined => {
	if (sphere === 'north' || sphere === 'south' || sphere === 'equator') return sphere;
	if (isNumber(lat)) return lat > 0.001 ? 'north' : (lat < -0.001 ? 'south' : 'equator');
	return undefined;
};

/**
 * Parses and normalizes coordinate strings ("lat, lng") or coordinate arrays ([lat, lng]).
 * @internal
 */
const parseCoordinatePair = (input: any, normalize = true): { lat: number; lng: number } | undefined => {
	if (isString(input) && input.includes(',')) {
		const parts = input.split(',').map((s: string) => s.trim());
		return parts.length >= 2 ? normalizeCoords(parts[0], parts[1], normalize) : undefined;
	}

	return (Array.isArray(input) && input.length >= 2)
		? normalizeCoords(input[0], input[1], normalize)
		: undefined;
};

/**
 * Assembles a clean, normalized GeoConfig object omitting empty or undefined fields.
 * @internal
 */
const assembleGeoConfig = (
	coords: { lat: number; lng: number } | { latitude: number; longitude: number },
	meta?: Partial<GeoConfig>
): GeoConfig => {
	const lat = 'lat' in coords ? coords.lat : coords.latitude!;
	const lng = 'lng' in coords ? coords.lng : coords.longitude!;
	const nLat = normalizeLat(lat);
	const nLng = normalizeLng(lng);
	const sphere = resolveSphere(meta?.sphere, nLat ?? lat);
	const elevation = normalizeElevation(meta?.elevation);

	return {
		latitude: nLat ?? lat,
		longitude: nLng ?? lng,
		...(sphere ? { sphere } : {}),
		...(isString(meta?.city) && !isEmpty(meta.city) ? { city: meta.city.trim() } : {}),
		...(isString(meta?.country) && !isEmpty(meta.country) ? { country: meta.country.trim() } : {}),
		...(elevation !== undefined ? { elevation } : {}),
		...(isString(meta?.timezone) && !isEmpty(meta.timezone) ? { timezone: meta.timezone.trim() } : {}),
	};
};

/**
 * Safely extracts custom non-geographic properties from an object.
 * @internal
 */
export const extractCustomProperties = (
	source: any,
	excludedKeys: readonly string[] = GEO_PROPERTIES
): Record<string, any> => {
	const custom: Record<string, any> = {};
	if (isReference(source)) {
		for (const key of Object.keys(source)) {
			if (isSafeKey(key) && !excludedKeys.includes(key)) {
				custom[key] = source[key];
			}
		}
	}
	return custom;
};

/**
 * Extracts and coerces latitude and longitude from input object (options, config, or instance)
 * into a canonical `{ latitude, longitude, ... }` GeoConfig object.
 * Enforces coordinate boundaries (-90 to 90 for lat, -180 to 180 for lng), 3-decimal rounding,
 * and automatic hemisphere inference ('north' | 'south' | 'equator').
 * 
 * @param input - Optional object containing coordinate or geo properties
 */
export const coerceGeo = (input?: any): GeoConfig | undefined => {
	const pair = parseCoordinatePair(input);
	if (pair)
		return assembleGeoConfig(pair);

	if (isPrimitive(input)) return undefined;

	const geo = input.geo ?? input;
	const cfg = input.config?.geo ?? input.config;

	const lat = evaluate<number>(
		geo?.latitude, geo?.lat,
		input.latitude, input.lat,
		cfg?.latitude, cfg?.lat
	);

	const lng = evaluate<number>(
		geo?.longitude, geo?.lng, geo?.lon, geo?.long,
		input.longitude, input.lng, input.lon, input.long,
		cfg?.longitude, cfg?.lng, cfg?.lon, cfg?.long
	);

	const elevation = evaluate<number>(geo?.elevation, input.elevation, cfg?.elevation);
	const sphere = evaluate<GeoSphere>(geo?.sphere, input.sphere, cfg?.sphere);
	const country = evaluate<string>(geo?.country, input.country, cfg?.country);
	const city = evaluate<string>(geo?.city, input.city, cfg?.city);
	const timezone = evaluate<string>(geo?.timezone, geo?.tz, input.timezone, input.tz, cfg?.timezone, cfg?.tz);

	const result: MutableGeoConfig = {};
	const nLat = normalizeLat(lat);
	const nLng = normalizeLng(lng);
	if (nLat !== undefined) result.latitude = nLat;
	if (nLng !== undefined) result.longitude = nLng;
	const nElevation = normalizeElevation(elevation);
	if (nElevation !== undefined) result.elevation = nElevation;

	const resolvedSphere = resolveSphere(sphere, result.latitude);
	if (resolvedSphere) result.sphere = resolvedSphere;

	if (isString(country)) result.country = country;
	if (isString(city)) result.city = city;
	if (isString(timezone)) result.timezone = timezone;

	const explicitGeo = isReference(input.geo) ? input.geo : (isReference(input.config?.geo) ? input.config.geo : undefined);
	const customKeys = extractCustomProperties(explicitGeo);
	Object.assign(result, customKeys);

	return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * Helper to resolve storage cache keys for single-tenant default or multi-tenant scoped lookups.
 * @internal
 */
const resolveCacheKey = (keyOrOpts?: string | Record<string, any>): string => {
	if (isString(keyOrOpts) && !isEmpty(keyOrOpts)) {
		const trimmed = keyOrOpts.trim();
		return (trimmed.startsWith(MAP_KEY))
			? trimmed
			: `${MAP_KEY}:${trimmed}`;
	}
	if (keyOrOpts && isObject(keyOrOpts)) {
		const provider = keyOrOpts.provider ?? activeGeoProvider;
		const providerPrefix = provider && isString(provider.name) && !isEmpty(provider.name)
			? `provider:${provider.name}`
			: undefined;
		const k = keyOrOpts.key ?? keyOrOpts.ip ?? keyOrOpts.query;
		if (isString(k) && !isEmpty(k)) {
			const trimmedKey = k.trim();
			return providerPrefix
				? `${MAP_KEY}:${providerPrefix}:${trimmedKey}`
				: `${MAP_KEY}:${trimmedKey}`;
		}
		if (providerPrefix) {
			return `${MAP_KEY}:${providerPrefix}`;
		}
	} else if (activeGeoProvider && isString(activeGeoProvider.name) && !isEmpty(activeGeoProvider.name)) {
		return `${MAP_KEY}:provider:${activeGeoProvider.name}`;
	}
	return MAP_KEY;
}

/**
 * Synchronously retrieves stashed geolocation from storage or memory cache if present.
 * Supports optional tenant key or options object for multi-tenant isolation.
 *
 * @param keyOrOpts - Optional tenant key or lookup options containing key/ip
 * @returns Cached GeoConfig or undefined
 */
export const getStashedGeo = (keyOrOpts?: string | Record<string, any>): GeoConfig | undefined => {
	const cacheKey = resolveCacheKey(keyOrOpts);
	try {
		const raw = getStorage<any>(cacheKey) ??
			(isCallable((globalThis as any).localStorage?.getItem) ? (globalThis as any).localStorage.getItem(cacheKey) : undefined);
		if (!raw) return undefined;

		const parsed = isString(raw) && (raw.startsWith('{') || raw.startsWith('['))
			? JSON.parse(raw)
			: raw;

		if (isObject(parsed)) {
			if (isNumber(parsed._expires) && Date.now() > parsed._expires) {
				clearStashedGeo(keyOrOpts);
				return undefined;
			}
		}

		const pair = parseCoordinatePair(parsed);
		if (pair)
			return assembleGeoConfig(pair);

		if (isObject(parsed)) {
			const rawCoords = parsed.geolocation?.coords ?? parsed.coords ?? parsed;
			const lat = rawCoords?.latitude ?? rawCoords?.lat;
			const lng = rawCoords?.longitude ?? rawCoords?.lng ?? rawCoords?.lon ?? rawCoords?.long;
			const coords = normalizeCoords(lat, lng);
			if (coords) {
				const elevation = parsed.elevation ?? rawCoords.elevation;
				return assembleGeoConfig(coords, {
					elevation,
					sphere: parsed.sphere,
					country: parsed.country,
					city: parsed.city,
					timezone: parsed.timezone,
				});
			}
		}
	} catch {
		// ignore storage access errors
	}
	return undefined;
}

/**
 * Explicitly stashes geolocation coordinates in storage with an optional TTL (default: 24 hours).
 * Supports optional tenant key or options object for multi-tenant isolation.
 *
 * @param coords - Geolocation coordinates and metadata to stash
 * @param ttl - Time-to-live in milliseconds (default: 24 hours)
 * @param keyOrOpts - Optional tenant key or lookup options containing key/ip
 */
export const stashGeo = (
	coords: GeoConfig,
	ttl = DEFAULT_GEO_TTL,
	keyOrOpts?: string | Record<string, any>
): void => {
	const cacheKey = resolveCacheKey(keyOrOpts);
	const payload = (isNumber(ttl) && ttl > 0)
		? { ...coords, _expires: Date.now() + ttl }
		: coords;
	setStorage(cacheKey, payload, { ttl });
}

/**
 * Clears stashed geolocation coordinates from storage.
 * Supports optional tenant key or options object for multi-tenant isolation.
 *
 * @param keyOrOpts - Optional tenant key or lookup options containing key/ip
 */
export const clearStashedGeo = (keyOrOpts?: string | Record<string, any>): void => {
	const cacheKey = resolveCacheKey(keyOrOpts);
	setStorage(cacheKey, undefined);
};

let activeGeoProvider: GeoProvider | undefined;

/**
 * Sets the active custom geolocation provider gateway.
 * 
 * @param provider - GeoProvider implementation or undefined to restore default provider
 */
export function setGeoProvider(provider?: GeoProvider): void {
	activeGeoProvider = provider;
}

/**
 * Gets the currently registered custom geolocation provider.
 */
export function getGeoProvider(): GeoProvider | undefined {
	return activeGeoProvider;
}

/**
 * Universal geolocation lookup dispatcher.
 * Automatically delegates to custom provider, browser `geoLocation()`, or server `serverGeoLocation()`.
 * When coordinates are resolved, stashes the result in storage with a 24-hour TTL for fast cached lookups.
 * 
 * @param opts - Lookup options passed down to environment handler (e.g. `{ refresh: true, key: 'tenant-1', provider }`)
 */
export const geoLookup = async (opts: Record<string, any> = {}): Promise<GeoLookupResult> => {
	const provider = opts.provider ?? activeGeoProvider;
	const useCache = opts.refresh !== true;

	if (useCache) {
		const stashed = getStashedGeo(opts);
		if (stashed && isNumber(stashed.latitude) && isNumber(stashed.longitude)) {
			const { latitude, longitude, ...rest } = stashed;
			return {
				...rest,
				status: 'cached',
				lat: latitude,
				lng: longitude,
				latitude,
				longitude,
			};
		}
	}

	let res: GeoLookupResult | undefined;

	if (provider && isFunction(provider.lookup)) {
		try {
			const providerRes = await provider.lookup(opts);
			if (providerRes) {
				res = providerRes;
				if (providerRes.error && opts.fallback === false)
					return providerRes;
			} else if (opts.fallback === false) {
				return { error: 'Provider returned null and fallback is disabled' };
			}
		} catch (err: any) {
			if (opts.fallback === false)
				return { error: err?.message ?? 'Provider lookup failed' };
		}
	}

	if (!res || res.error) {
		if (opts.fallback === false && (provider || res?.error))
			return res && res.error ? res : { error: 'Geolocation resolution failed and fallback is disabled' };

		const { type } = getContext();
		switch (type) {
			case CONTEXT.Browser: {
				const { geoLocation } = await import('#browser/mapper.library.js');
				const browserRes = await geoLocation(opts as any);
				if (browserRes.error)
					return { error: browserRes.error };

				const lat = browserRes.coords?.latitude;
				const lng = browserRes.coords?.longitude;
				res = { ...browserRes, lat, lng, latitude: lat, longitude: lng };
				break;
			}

			case CONTEXT.WebWorker:
			case CONTEXT.NodeJS:
			case CONTEXT.Deno:
			default: {
				const { serverGeoLocation } = await import('#server/mapper.library.js');
				res = await serverGeoLocation(opts as any);
				break;
			}
		}
	}

	// Stash successfully resolved coordinates with 24-hour TTL
	const rawLat = res.latitude ?? res.lat;
	const rawLng = res.longitude ?? res.lng;
	const coords = normalizeCoords(rawLat, rawLng);
	if (isNullish(res.error) && coords) {
		const sphere = resolveSphere(res.sphere, coords.lat);

		res.lat = coords.lat;
		res.lng = coords.lng;
		res.latitude = coords.lat;
		res.longitude = coords.lng;
		res.sphere = sphere;

		const stashPayload = assembleGeoConfig(coords, res);
		try {
			const ttl = isNumber(opts.ttl) ? opts.ttl : DEFAULT_GEO_TTL;
			stashGeo(stashPayload, ttl, opts);
		} catch {
			// ignore storage errors
		}
	}

	return res;
};

import { BoundedCache } from '#library/cache.class.js';

let requestModulePromise: Promise<typeof import('./request.library.js')> | null = null;
const getRequestModule = () => {
	if (!requestModulePromise)
		requestModulePromise = import('./request.library.js');
	return requestModulePromise;
};

// Dedicated spatial reverse cache (max 1,000 locations, 24h TTL)
const reverseGeoCache = new BoundedCache<string, GeoConfig>(DEFAULT_SPATIAL_CACHE_SIZE, DEFAULT_GEO_TTL);

/**
 * Validates custom reverse geocoding endpoints: requires HTTPS or local development origin.
 * Endpoints must only be configured with trusted administrative origins and not untrusted input.
 * @internal
 */
const isValidGeoEndpoint = (urlStr: string): boolean => {
	try {
		const parsed = new URL(urlStr);
		return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
	} catch {
		return false;
	}
};

/**
 * Returns the active BoundedCache instance used for spatial reverse geocoding deduplication.
 */
export const getSpatialReverseCache = (): BoundedCache<string, GeoConfig> => reverseGeoCache;

/**
 * Computes a 2-decimal spatial bucket key (~1.1 km resolution) for coordinate caching,
 * partitioned by lookup source, provider identity, or custom endpoint.
 */
export const getSpatialCacheKey = (lat: number, lng: number, sourceOrOpts?: string | Record<string, any>): string => {
	const bucket = `${lat.toFixed(2)},${lng.toFixed(2)}`;
	if (isString(sourceOrOpts) && !isEmpty(sourceOrOpts)) {
		return `${bucket}:${sourceOrOpts.trim()}`;
	}
	if (isObject(sourceOrOpts)) {
		const hasExplicitProvider = Object.hasOwn(sourceOrOpts, 'provider');
		const provider = hasExplicitProvider ? sourceOrOpts.provider : activeGeoProvider;
		const providerName = provider && isString(provider.name) && !isEmpty(provider.name) ? provider.name.trim() : undefined;
		const rawEndpoint = isString(sourceOrOpts.reverseEndpoint ?? sourceOrOpts.reverseGeoEndpoint) && !isEmpty(sourceOrOpts.reverseEndpoint ?? sourceOrOpts.reverseGeoEndpoint)
			? (sourceOrOpts.reverseEndpoint ?? sourceOrOpts.reverseGeoEndpoint).trim()
			: undefined;
		const endpoint = rawEndpoint && isValidGeoEndpoint(rawEndpoint) ? rawEndpoint : undefined;
		if (providerName && endpoint) return `${bucket}:${providerName}:${endpoint}`;
		if (providerName) return `${bucket}:${providerName}`;
		if (endpoint) return `${bucket}:${endpoint}`;
	} else if (activeGeoProvider && isString(activeGeoProvider.name) && !isEmpty(activeGeoProvider.name)) {
		return `${bucket}:${activeGeoProvider.name.trim()}`;
	}
	return bucket;
};

/**
 * Reverse geocodes coordinates to address or location metadata using the active or provided GeoProvider.
 * Employs 2-decimal spatial deduplication with BoundedCache (24h TTL).
 * 
 * @param coords - Coordinate input
 * @param opts - Options including optional provider override and { refresh: true }
 */
export async function reverseGeocode(
	coords: CoordinateInput,
	opts?: Record<string, any>
): Promise<GeoConfig | null> {
	const coerced = coerceGeo(coords);
	if (!coerced || !isNumber(coerced.latitude) || !isNumber(coerced.longitude))
		return null;

	const lat = coerced.latitude;
	const lng = coerced.longitude;
	const key = getSpatialCacheKey(lat, lng, opts);
	const useCache = opts?.refresh !== true;

	if (useCache) {
		const cached = reverseGeoCache.get(key);
		if (cached) {
			return {
				...cached,
				latitude: lat,
				longitude: lng,
				sphere: resolveSphere(cached.sphere, lat),
				elevation: isNumber(cached.elevation) ? cached.elevation : coerced.elevation,
				timezone: isString(cached.timezone) ? cached.timezone : coerced.timezone,
			};
		}
	}

	const hasExplicitProvider = isObject(opts) && Object.hasOwn(opts, 'provider');
	const provider = hasExplicitProvider ? opts.provider : activeGeoProvider;
	if (provider && isFunction(provider.reverseGeocode)) {
		try {
			const res = await provider.reverseGeocode(coerced, opts);
			if (res && isObject(res)) {
				const result = assembleGeoConfig({ lat, lng }, {
					sphere: res.sphere,
					city: res.city,
					country: res.country,
					elevation: isNumber(res.elevation) ? res.elevation : coerced.elevation,
					timezone: isString(res.timezone) ? res.timezone : coerced.timezone,
				});

				const cachePayload = assembleGeoConfig({ lat, lng }, {
					sphere: res.sphere,
					city: res.city,
					country: res.country,
					timezone: res.timezone,
				});
				reverseGeoCache.set(key, cachePayload);
				return result;
			}
			if (opts?.fallback === false)
				return null;
		} catch (err) {
			if (opts?.fallback === false) throw err;
		}
	} else if (opts?.fallback === false && (provider || hasExplicitProvider)) {
		return null;
	}

	// Default lightweight reverse geocoding via BigDataCloud client API or custom reverseEndpoint
	const rawReverseEndpoint = opts?.reverseEndpoint ?? opts?.reverseGeoEndpoint;
	if (isText(rawReverseEndpoint)) {
		const rawEndpoint = rawReverseEndpoint.trim();
		if (!isValidGeoEndpoint(rawEndpoint))
			return opts?.fallback === false ? null : coerced;
	}
	const customEndpoint = isText(rawReverseEndpoint) ? rawReverseEndpoint.trim() : undefined;
	const fallbackKey = getSpatialCacheKey(lat, lng, customEndpoint ?? 'default');

	if (useCache) {
		const cachedFallback = reverseGeoCache.get(fallbackKey);
		if (cachedFallback) {
			return {
				...cachedFallback,
				latitude: lat,
				longitude: lng,
				sphere: resolveSphere(cachedFallback.sphere, lat),
				elevation: isNumber(cachedFallback.elevation) ? cachedFallback.elevation : coerced.elevation,
				timezone: isString(cachedFallback.timezone) ? cachedFallback.timezone : coerced.timezone,
			};
		}
	}

	let endpoint: string;
	if (customEndpoint) {
		if (/\{(?:latitude|lat|longitude|lng|lon)\}/i.test(customEndpoint)) {
			endpoint = customEndpoint
				.replace(/\{latitude\}/gi, encodeURIComponent(lat))
				.replace(/\{lat\}/gi, encodeURIComponent(lat))
				.replace(/\{longitude\}/gi, encodeURIComponent(lng))
				.replace(/\{lng\}/gi, encodeURIComponent(lng))
				.replace(/\{lon\}/gi, encodeURIComponent(lng));
		} else {
			const sep = customEndpoint.includes('?') ? '&' : '?';
			endpoint = `${customEndpoint}${sep}latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}`;
		}
	} else {
		endpoint = `${DEFAULT_REVERSE_GEO_ENDPOINT}?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
	}

	try {
		const timeout = isNumber(opts?.timeout) && opts.timeout > 0 ? opts.timeout : DEFAULT_REVERSE_GEO_TIMEOUT;
		const maxBytes = isNumber(opts?.maxBytes) && opts.maxBytes > 0 ? opts.maxBytes : DEFAULT_REVERSE_GEO_MAX_BYTES;
		const { fetchRequest } = await getRequestModule();
		const data = await fetchRequest<Record<string, any>>(
			endpoint,
			{},
			{ timeout, maxBytes }
		);

		if (isObject(data)) {
			const city = isText(data.city)
				? data.city.trim()
				: (isText(data.locality) ? data.locality.trim() : (isText(data.principalSubdivision) ? data.principalSubdivision.trim() : undefined));
			const country = isText(data.countryCode)
				? data.countryCode.trim()
				: (isText(data.countryName) ? data.countryName.trim() : undefined);

			const result = assembleGeoConfig({ lat, lng }, {
				city,
				country,
				elevation: coerced.elevation,
				timezone: coerced.timezone,
			});

			if (isText(city) || isText(country)) {
				const cachePayload = assembleGeoConfig({ lat, lng }, {
					city,
					country,
				});
				reverseGeoCache.set(fallbackKey, cachePayload);
			}
			return result;
		}
	} catch {
		// Graceful fallback to raw coerced coordinates on network/offline error
	}

	return coerced;
}

/**
 * Forward geocodes an address or place query string into coordinates using the active or provided GeoProvider.
 * 
 * @param query - Address or place search query
 * @param opts - Options including optional provider override
 */
export async function forwardGeocode(
	query: string,
	opts?: Record<string, any>
): Promise<ResolvedCoordinates | null> {
	const provider = opts?.provider ?? activeGeoProvider;

	return (provider && isFunction(provider.forwardGeocode))
		? provider.forwardGeocode(query, opts)
		: null;
}

/**
 * Universal coordinate resolver.
 * Extracts latitude and longitude from input object (instance, config, options),
 * or triggers `geoLookup()` if coordinates are omitted.
 * Supports opt-in reverse lookup (`{ reverse: true }`).
 * Enforces 3-decimal rounding and returns rich metadata when resolved.
 * 
 * @param input - Optional object containing coordinate properties
 * @param opts - Fallback geoLookup options if coordinates are missing from input
 */
export const resolveGeoCoordinates = async (
	input?: CoordinateInput,
	opts: Record<string, any> = {}
): Promise<ResolvedCoordinates | null> => {
	const coerced = coerceGeo(input);
	if (coerced && isNumber(coerced.latitude) && isNumber(coerced.longitude)) {
		const shouldReverse = opts.reverse === true || opts.autoReverse === true;
		if (shouldReverse && (!coerced.city || !coerced.country)) {
			const reversed = await reverseGeocode(coerced, opts);
			if (reversed) {
				return {
					...reversed,
					...coerced,
					city: isText(coerced.city) ? coerced.city : reversed.city,
					country: isText(coerced.country) ? coerced.country : reversed.country,
					lat: coerced.latitude,
					lng: coerced.longitude,
					latitude: coerced.latitude,
					longitude: coerced.longitude,
				};
			}
		}

		return {
			...coerced,
			lat: coerced.latitude,
			lng: coerced.longitude,
		};
	}

	const stashed = opts.refresh === true ? undefined : getStashedGeo(opts);
	if (stashed && isNumber(stashed.latitude) && isNumber(stashed.longitude))
		return {
			...stashed,
			lat: stashed.latitude,
			lng: stashed.longitude,
		};

	const lookup = await geoLookup(opts);
	const coords = normalizeCoords(lookup.lat, lookup.lng);
	if (isNullish(lookup.error) && coords) {
		const sphere = resolveSphere(lookup.sphere, coords.lat);
		return {
			...lookup,
			lat: coords.lat,
			lng: coords.lng,
			latitude: coords.lat,
			longitude: coords.lng,
			sphere,
		};
	}

	return null;
};



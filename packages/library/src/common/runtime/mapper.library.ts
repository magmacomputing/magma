import { CONTEXT, getContext } from '#library/utility.library.js';
import { isNullish, isNumber, isString, isSafeKey, isObject, isEmpty } from '#library/assertion.library.js';
import { getStorage, setStorage } from '#library/storage.library.js';

export interface GeoLookupResult {
	lat?: number | undefined;
	lng?: number | undefined;
	latitude?: number | undefined;
	longitude?: number | undefined;
	error?: string | undefined;
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
	/** ISO country code (e.g. 'US', 'AU') */
	country?: string | undefined;
	/** City or locality name */
	city?: string | undefined;
	/** Custom or future string/number key property */
	[key: string]: any;
	/** Custom symbol key property */
	[key: symbol]: any;
}

export interface GeoConfig {
	/** Latitude coordinate in degrees */
	latitude?: number | undefined;
	/** Longitude coordinate in degrees */
	longitude?: number | undefined;
	/** Altitude / Elevation in meters above sea level */
	elevation?: number | undefined;
	/** Inferred or explicit hemisphere ('north' | 'south') */
	sphere?: 'north' | 'south' | undefined;
	/** ISO country code (e.g. 'US', 'AU') */
	country?: string | undefined;
	/** City or locality name */
	city?: string | undefined;
	/** Custom or future string/number key property */
	[key: string]: any;
	/** Custom symbol key property */
	[key: symbol]: any;
}

export interface CoordinateInput {
	geo?: GeoOptions | undefined;
	latitude?: number;
	lat?: number;
	longitude?: number;
	lng?: number;
	lon?: number;
	long?: number;
	config?: Record<string, any>;
	[key: string]: any;
}

const MAP_KEY = '_magma_geo_';
const DEFAULT_GEO_TTL = 24 * 60 * 60 * 1000;								// 24 hours

const GEO_PROPERTIES = [
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
] as const;

/**
 * Extracts and coerces latitude and longitude from input object (options, config, or instance)
 * into a canonical `{ latitude, longitude, ... }` GeoConfig object.
 * 
 * @param input - Optional object containing coordinate or geo properties
 */
export const coerceGeo = (input?: any): GeoConfig | undefined => {
	if (isNullish(input) || !isObject(input)) return undefined;

	const geoObj = input.geo ?? input;
	const cfgGeo = input.config?.geo ?? input.config;

	const lat = geoObj?.latitude ?? geoObj?.lat
		?? input.latitude ?? input.lat
		?? cfgGeo?.latitude ?? cfgGeo?.lat;

	const lng = geoObj?.longitude ?? geoObj?.lng ?? geoObj?.lon ?? geoObj?.long
		?? input.longitude ?? input.lng ?? input.lon ?? input.long
		?? cfgGeo?.longitude ?? cfgGeo?.lng ?? cfgGeo?.lon ?? cfgGeo?.long;

	const elevation = geoObj?.elevation ?? input.elevation ?? cfgGeo?.elevation;
	const sphere = geoObj?.sphere ?? input.sphere ?? cfgGeo?.sphere;
	const country = geoObj?.country ?? input.country ?? cfgGeo?.country;
	const city = geoObj?.city ?? input.city ?? cfgGeo?.city;

	const result: GeoConfig = {};
	if (isNumber(lat)) result.latitude = lat;
	if (isNumber(lng)) result.longitude = lng;
	if (isNumber(elevation)) result.elevation = elevation;
	if (sphere === 'north' || sphere === 'south') result.sphere = sphere;
	if (isString(country)) result.country = country;
	if (isString(city)) result.city = city;

	if (isObject(geoObj)) {
		for (const key of Object.keys(geoObj)) {
			if (isSafeKey(key) && !GEO_PROPERTIES.includes(key as any))
				(result as any)[key] = geoObj[key];
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
}

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
		const k = keyOrOpts.key ?? keyOrOpts.ip ?? keyOrOpts.query;
		if (isString(k) && !isEmpty(k))
			return `${MAP_KEY}:${k.trim()}`;
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
			(typeof localStorage !== 'undefined' ? localStorage.getItem(cacheKey) : undefined);
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

		if (isString(parsed) && parsed.includes(',')) {
			const parts = parsed.split(',').map(s => parseFloat(s.trim()));
			if (parts.length >= 2 && isNumber(parts[0]) && isNumber(parts[1])) {
				return { latitude: parts[0], longitude: parts[1] };
			}
		}

		if (isObject(parsed)) {
			const coords = parsed.geolocation?.coords ?? parsed.coords ?? parsed;
			const lat = coords?.latitude ?? coords?.lat;
			const lng = coords?.longitude ?? coords?.lng ?? coords?.lon ?? coords?.long;
			if (isNumber(lat) && isNumber(lng)) {
				const result: GeoConfig = { latitude: lat, longitude: lng };
				const elevation = parsed.elevation ?? coords.elevation;
				if (isNumber(elevation)) result.elevation = elevation;
				if (parsed.sphere === 'north' || parsed.sphere === 'south') result.sphere = parsed.sphere;
				if (isString(parsed.country)) result.country = parsed.country;
				if (isString(parsed.city)) result.city = parsed.city;
				return result;
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

/**
 * Universal geolocation lookup dispatcher.
 * Automatically delegates to browser `geoLocation()` or server `serverGeoLocation()` based on runtime context.
 * When coordinates are resolved, stashes the result in storage with a 24-hour TTL for fast cached lookups.
 * 
 * @param opts - Lookup options passed down to environment handler (e.g. `{ refresh: true, key: 'tenant-1' }`)
 */
export const geoLookup = async (opts: Record<string, any> = {}): Promise<GeoLookupResult> => {
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

	const { type } = getContext();
	let res: GeoLookupResult;

	switch (type) {
		case CONTEXT.Browser: {
			const { geoLocation } = await import('#browser/mapper.library.js');
			const browserRes = await geoLocation(opts as any);
			if (browserRes.error)
				return { error: browserRes.error };

			const lat = browserRes.coords?.latitude;
			const lng = browserRes.coords?.longitude;
			res = { lat, lng, latitude: lat, longitude: lng, ...browserRes };
			break;
		}

		case CONTEXT.WebWorker: {
			const stashed = getStashedGeo(opts);
			if (stashed && isNumber(stashed.latitude) && isNumber(stashed.longitude))
				return { lat: stashed.latitude, lng: stashed.longitude, latitude: stashed.latitude, longitude: stashed.longitude };

			const { serverGeoLocation } = await import('#server/mapper.library.js');
			res = await serverGeoLocation(opts as any);
			break;
		}

		case CONTEXT.NodeJS:
		case CONTEXT.Deno:
		default: {
			const { serverGeoLocation } = await import('#server/mapper.library.js');
			res = await serverGeoLocation(opts as any);
			break;
		}
	}

	// Stash successfully resolved coordinates with 24-hour TTL
	const lat = res.latitude ?? res.lat;
	const lng = res.longitude ?? res.lng;
	if (isNullish(res.error) && isNumber(lat) && isNumber(lng)) {
		const stashPayload: GeoConfig = {
			latitude: lat,
			longitude: lng,
			...(isString(res.city) ? { city: res.city } : {}),
			...(isString(res.country) ? { country: res.country } : {}),
			...(isNumber(res.elevation) ? { elevation: res.elevation } : {}),
			...(res.sphere === 'north' || res.sphere === 'south' ? { sphere: res.sphere } : {}),
		};
		try {
			const ttl = isNumber(opts.ttl) ? opts.ttl : DEFAULT_GEO_TTL;
			stashGeo(stashPayload, ttl, opts);
		} catch {
			// ignore storage errors
		}
	}

	return res;
};

/**
 * Universal coordinate resolver.
 * Extracts latitude and longitude from input object (instance, config, options),
 * or triggers `geoLookup()` if coordinates are omitted.
 * 
 * @param input - Optional object containing coordinate properties
 * @param opts - Fallback geoLookup options if coordinates are missing from input
 */
export const resolveGeoCoordinates = async (
	input?: CoordinateInput,
	opts: Record<string, any> = {}
): Promise<{ lat: number; lng: number } | null> => {
	const coerced = coerceGeo(input);
	if (coerced && isNumber(coerced.latitude) && isNumber(coerced.longitude))
		return { lat: coerced.latitude, lng: coerced.longitude };

	const stashed = getStashedGeo(opts);
	if (stashed && isNumber(stashed.latitude) && isNumber(stashed.longitude))
		return { lat: stashed.latitude, lng: stashed.longitude };

	const lookup = await geoLookup(opts);
	if (isNullish(lookup.error) && isNumber(lookup.lat) && isNumber(lookup.lng))
		return { lat: lookup.lat, lng: lookup.lng };

	return null;
};


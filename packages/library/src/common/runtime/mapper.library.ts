import { CONTEXT, getContext } from '#library/utility.library.js';
import { isNullish, isNumber, isString, isSafeKey, isObject, isEmpty, isReference, isPrimitive } from '#library/assertion.library.js';
import { getStorage, setStorage } from '#library/storage.library.js';
import { evaluate } from '#library/evaluation.library.js';

/**
 * Supported hemisphere zones including the equatorial band.
 */
export type GeoSphere = 'north' | 'south' | 'equator';

/**
 * Supported units for geographic distance calculation.
 */
export type DistanceUnit = 'km' | 'miles' | 'm';

/**
 * Supported units for solar offset calculation.
 */
export type SolarOffsetUnit = 'minutes' | 'seconds' | 'hours';

/**
 * Configuration options for natural solar time offset calculation.
 */
export interface SolarOffsetOptions {
	/** Unit of return value (default: 'minutes') */
	unit?: SolarOffsetUnit;
	/** Number of decimal places to round (default: 2) */
	precision?: number;
	/** Whether to compute apparent solar time incorporating Equation of Time (default: false for mean solar time) */
	apparent?: boolean;
	/** Explicit IANA timezone override (defaults to coords.timezone or ambient timezone) */
	timeZone?: string;
	/** Reference date/time for DST offset and Equation of Time calculations (default: Date.now()) */
	date?: Date | number | any;
}

export interface GeoLookupResult {
	lat?: number | undefined;
	lng?: number | undefined;
	latitude?: number | undefined;
	longitude?: number | undefined;
	elevation?: number | undefined;
	sphere?: GeoSphere | undefined;
	country?: string | undefined;
	city?: string | undefined;
	timezone?: string | undefined;
	status?: string | undefined;
	error?: string | undefined;
	[key: string]: any;
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
	sphere?: GeoSphere | undefined;
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
	latitude?: number | undefined;
	/** Longitude coordinate in degrees (-180 to 180) */
	longitude?: number | undefined;
	/** Altitude / Elevation in meters above sea level */
	elevation?: number | undefined;
	/** Inferred or explicit hemisphere ('north' | 'south' | 'equator') */
	sphere?: GeoSphere | undefined;
	/** ISO country code (e.g. 'US', 'AU') */
	country?: string | undefined;
	/** City or locality name */
	city?: string | undefined;
	/** IANA Time Zone ID (e.g. 'Australia/Sydney') */
	timezone?: string | undefined;
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
 * Normalizes latitude to 3 decimal places if within [-90, 90] bounds.
 * @internal
 */
const normalizeLat = (lat: any): number | undefined =>
	isNumber(lat) && lat >= -90 && lat <= 90 ? Math.round(lat * 1000) / 1000 : undefined;

/**
 * Normalizes longitude to 3 decimal places if within [-180, 180] bounds.
 * @internal
 */
const normalizeLng = (lng: any): number | undefined =>
	isNumber(lng) && lng >= -180 && lng <= 180 ? Math.round(lng * 1000) / 1000 : undefined;

/**
 * Validates and normalizes coordinate pairs to 3 decimal places within Earth boundaries.
 * @internal
 */
const normalizeCoords = (lat: any, lng: any): { lat: number; lng: number } | undefined => {
	const nLat = normalizeLat(lat);
	const nLng = normalizeLng(lng);
	return (nLat !== undefined && nLng !== undefined) ? { lat: nLat, lng: nLng } : undefined;
};

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
 * Extracts and coerces latitude and longitude from input object (options, config, or instance)
 * into a canonical `{ latitude, longitude, ... }` GeoConfig object.
 * Enforces coordinate boundaries (-90 to 90 for lat, -180 to 180 for lng), 3-decimal rounding,
 * and automatic hemisphere inference ('north' | 'south' | 'equator').
 * 
 * @param input - Optional object containing coordinate or geo properties
 */
export const coerceGeo = (input?: any): GeoConfig | undefined => {
	if (isString(input) && input.includes(',')) {
		const parts = input.split(',').map((s: string) => Number(s.trim()));
		if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
			const coords = normalizeCoords(parts[0], parts[1]);
			if (coords) {
				const result: GeoConfig = { latitude: coords.lat, longitude: coords.lng };
				const sphere = resolveSphere(undefined, coords.lat);
				if (sphere) result.sphere = sphere;
				return result;
			}
		}
		return undefined;
	}

	if (isPrimitive(input)) return undefined;

	if (Array.isArray(input) && input.length >= 2) {
		const coords = normalizeCoords(input[0], input[1]);
		if (coords) {
			const result: GeoConfig = { latitude: coords.lat, longitude: coords.lng };
			const sphere = resolveSphere(undefined, coords.lat);
			if (sphere) result.sphere = sphere;
			return result;
		}
		return undefined;
	}

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

	const result: GeoConfig = {};
	const nLat = normalizeLat(lat);
	const nLng = normalizeLng(lng);
	if (nLat !== undefined) result.latitude = nLat;
	if (nLng !== undefined) result.longitude = nLng;
	if (isNumber(elevation)) result.elevation = Math.round(elevation * 1000) / 1000;

	const resolvedSphere = resolveSphere(sphere, result.latitude);
	if (resolvedSphere) result.sphere = resolvedSphere;

	if (isString(country)) result.country = country;
	if (isString(city)) result.city = city;
	if (isString(timezone)) result.timezone = timezone;

	if (isReference(geo)) {
		for (const key of Object.keys(geo)) {
			if (isSafeKey(key) && !GEO_PROPERTIES.includes(key as any))
				(result as any)[key] = geo[key];
		}
	}

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
			const coords = normalizeCoords(parts[0], parts[1]);
			if (coords) {
				return {
					latitude: coords.lat,
					longitude: coords.lng,
					sphere: resolveSphere(undefined, coords.lat),
				};
			}
		}

		if (isObject(parsed)) {
			const rawCoords = parsed.geolocation?.coords ?? parsed.coords ?? parsed;
			const lat = rawCoords?.latitude ?? rawCoords?.lat;
			const lng = rawCoords?.longitude ?? rawCoords?.lng ?? rawCoords?.lon ?? rawCoords?.long;
			const coords = normalizeCoords(lat, lng);
			if (coords) {
				const result: GeoConfig = { latitude: coords.lat, longitude: coords.lng };
				const elevation = parsed.elevation ?? rawCoords.elevation;
				if (isNumber(elevation)) result.elevation = Math.round(elevation * 1000) / 1000;
				result.sphere = resolveSphere(parsed.sphere, coords.lat);
				if (isString(parsed.country)) result.country = parsed.country;
				if (isString(parsed.city)) result.city = parsed.city;
				if (isString(parsed.timezone)) result.timezone = parsed.timezone;
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
				return { lat: stashed.latitude, lng: stashed.longitude, latitude: stashed.latitude, longitude: stashed.longitude, sphere: stashed.sphere, country: stashed.country, city: stashed.city, timezone: stashed.timezone, elevation: stashed.elevation };

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

		const stashPayload: GeoConfig = {
			latitude: coords.lat,
			longitude: coords.lng,
			sphere,
			...(isString(res.city) ? { city: res.city } : {}),
			...(isString(res.country) ? { country: res.country } : {}),
			...(isNumber(res.elevation) ? { elevation: Math.round(res.elevation * 1000) / 1000 } : {}),
			...(isString(res.timezone) ? { timezone: res.timezone } : {}),
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
	if (coerced && isNumber(coerced.latitude) && isNumber(coerced.longitude))
		return {
			...coerced,
			lat: coerced.latitude,
			lng: coerced.longitude,
		};

	const stashed = getStashedGeo(opts);
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

/**
 * Calculates the Great-Circle distance between two coordinates using the Haversine formula.
 * Accepts coordinate objects, [lat, lng] tuples, strings, or instances exposing .geo.
 * 
 * @param from - Origin coordinate, object, tuple, or instance
 * @param to - Destination coordinate, object, tuple, or instance
 * @param unit - Distance unit ('km', 'miles', or 'm'; default: 'km')
 * @returns Calculated distance, or NaN if either coordinate pair is invalid
 */
export function haversineDistance(from: any, to: any, unit: DistanceUnit = 'km'): number {
	const c1 = coerceGeo(from);
	const c2 = coerceGeo(to);

	if (!c1 || !c2 || !isNumber(c1.latitude) || !isNumber(c1.longitude) || !isNumber(c2.latitude) || !isNumber(c2.longitude)) {
		return NaN;
	}

	const toRad = Math.PI / 180;
	const lat1 = c1.latitude * toRad;
	const lng1 = c1.longitude * toRad;
	const lat2 = c2.latitude * toRad;
	const lng2 = c2.longitude * toRad;

	const dLat = lat2 - lat1;
	const dLng = lng2 - lng1;

	const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	let radius: number;
	if (unit === 'miles') {
		radius = 3958.7613; // Mean Earth radius in miles
	} else if (unit === 'm') {
		radius = 6371008.8; // Mean Earth radius in meters
	} else {
		radius = 6371.0088; // Mean Earth radius in kilometers (default)
	}

	const dist = radius * c;
	return unit === 'm' ? Math.round(dist) : Math.round(dist * 1000) / 1000;
}

/**
 * Calculates the Natural Solar Time Offset between civil clock time and actual solar time.
 * Based on longitude (approx 4 minutes per 1° offset from standard timezone meridian).
 * 
 * @param coords - Coordinate input, object, tuple, or instance exposing .geo
 * @param options - Configuration options for units, precision, apparent time, timezone, and date
 * @returns Solar offset in requested unit (default: minutes, rounded to 2 decimal places), or NaN if invalid
 */
export function solarOffset(coords: any, options?: SolarOffsetOptions): number {
	const geo = coerceGeo(coords);
	if (!geo || !isNumber(geo.latitude) || !isNumber(geo.longitude) || isNaN(geo.latitude) || isNaN(geo.longitude)) {
		return NaN;
	}

	const lng = geo.longitude;
	const tz = options?.timeZone
		?? (typeof coords === 'object' && coords !== null ? (coords.timezone ?? coords.tz) : undefined)
		?? geo.timezone;

	const dateVal = options?.date
		?? (typeof coords === 'object' && coords !== null && typeof (coords as any).epoch?.ms === 'number' ? (coords as any).epoch.ms : Date.now());

	let offsetMinutes: number | undefined;

	const epochMs = typeof dateVal === 'number'
		? dateVal
		: (typeof dateVal === 'string'
			? Date.parse(dateVal)
			: (dateVal instanceof Date
				? dateVal.getTime()
				: (typeof dateVal?.epoch?.ms === 'number' ? dateVal.epoch.ms : Date.now())));

	if (isString(tz) && tz.trim() !== '') {
		try {
			if (typeof Temporal !== 'undefined' && typeof Temporal.Instant?.fromEpochMilliseconds === 'function') {
				const zdt = Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(tz);
				offsetMinutes = zdt.offsetNanoseconds / 60_000_000_000;
			} else {
				const parts = new Intl.DateTimeFormat('en-US', {
					timeZone: tz,
					timeZoneName: 'longOffset',
					year: 'numeric'
				}).formatToParts(new Date(epochMs));
				const tzPart = parts.find(p => p.type === 'timeZoneName')?.value;
				if (tzPart) {
					const match = tzPart.match(/GMT([+-])(\d{2}):(\d{2})/);
					if (match) {
						const sign = match[1] === '-' ? -1 : 1;
						offsetMinutes = sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
					}
				}
			}
		} catch {
			// invalid timezone, fall back to natural meridian
		}
	}

	// If no civil timezone, use natural solar timezone meridian (round(lng / 15) * 15)
	const refMeridian = offsetMinutes !== undefined
		? (offsetMinutes / 60) * 15
		: Math.round(lng / 15) * 15;

	const deltaLng = lng - refMeridian;
	let offsetMin = deltaLng * 4;

	if (options?.apparent) {
		const d = new Date(epochMs);
		const startOfYear = Date.UTC(d.getUTCFullYear(), 0, 1);
		const dayOfYear = Math.floor((epochMs - startOfYear) / 86400000) + 1;
		const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
		const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
		offsetMin += eqTime;
	}

	const unit = options?.unit ?? 'minutes';
	let res: number;
	if (unit === 'seconds') {
		res = offsetMin * 60;
	} else if (unit === 'hours') {
		res = offsetMin / 60;
	} else {
		res = offsetMin;
	}

	const precision = options?.precision ?? 2;
	const factor = Math.pow(10, precision);
	return Math.round(res * factor) / factor;
}


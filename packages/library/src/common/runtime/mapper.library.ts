import { CONTEXT, getContext } from '#library/utility.library.js';
import { isNullish, isNumber, isString, isSafeKey, isObject, isEmpty, isReference, isPrimitive, isDate, isText, isFunction, isDefined, isCallable } from '#library/assertion.library.js';
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
 * Supported units for geographic velocity time denominator.
 */
export type TimeUnit = 'hh' | 'h' | 'hours' | 'hour' | 'mi' | 'm' | 'minutes' | 'minute' | 'ss' | 's' | 'seconds' | 'second';

/**
 * Configuration options for initial compass bearing calculation.
 */
export interface BearingOptions {
	/** Number of decimal places to round (default: 1) */
	precision?: number;
}

/**
 * Configuration options for geographic velocity calculation.
 */
export interface VelocityOptions {
	/** Distance unit (default: 'km') */
	unit?: DistanceUnit;
	/** Time unit for velocity denominator (default: 'h' for km/h or mph) */
	timeUnit?: TimeUnit;
	/** Number of decimal places to round (default: 2) */
	precision?: number;
}

/**
 * Configuration options for impossible travel anomaly detection.
 */
export interface ImpossibleTravelOptions {
	/** Maximum physically feasible commercial speed in km/h (default: 900 km/h) */
	maxCommercialSpeedKmH?: number;
	/** Distance unit for threshold (default: 'km') */
	unit?: DistanceUnit;
	/** Custom speed threshold override in the specified unit */
	maxSpeed?: number;
}

/**
 * Supported units for solar offset calculation.
 */
export type SolarOffsetUnit = 'mi' | 'minutes' | 'ss' | 'seconds' | 'hh' | 'hours';

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
	readonly latitude?: number | undefined;
	/** Longitude coordinate in degrees (-180 to 180) */
	readonly longitude?: number | undefined;
	/** Altitude / Elevation in meters above sea level */
	readonly elevation?: number | undefined;
	/** Inferred or explicit hemisphere ('north' | 'south' | 'equator') */
	readonly sphere?: GeoSphere | undefined;
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
		const segments = input.split(',').map((s: string) => s.trim());
		const parts = segments.map((s: string) => s === '' ? NaN : Number(s));
		if (parts.length >= 2 && !isNaN(parts[0]!) && !isNaN(parts[1]!)) {
			const coords = normalizeCoords(parts[0], parts[1]);
			if (coords) {
				const result: MutableGeoConfig = { latitude: coords.lat, longitude: coords.lng };
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
			const result: MutableGeoConfig = { latitude: coords.lat, longitude: coords.lng };
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

	const result: MutableGeoConfig = {};
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

	const explicitGeo = isReference(input.geo) ? input.geo : (isReference(input.config?.geo) ? input.config.geo : undefined);
	if (isReference(explicitGeo)) {
		for (const key of Object.keys(explicitGeo)) {
			if (isSafeKey(key) && !GEO_PROPERTIES.includes(key as any))
				(result as any)[key] = explicitGeo[key];
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
				const result: MutableGeoConfig = { latitude: coords.lat, longitude: coords.lng };
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

/**
 * Internal helper to coerce and project two coordinate sources into radians.
 * @internal
 */
const toRadianCoordinates = (from: any, to: any) => {
	const c1 = coerceGeo(from);
	const c2 = coerceGeo(to);

	if (!c1 || !c2 || !isNumber(c1.latitude) || !isNumber(c1.longitude) || !isNumber(c2.latitude) || !isNumber(c2.longitude))
		return undefined;

	const toRad = Math.PI / 180;
	const lat1 = c1.latitude * toRad;
	const lng1 = c1.longitude * toRad;
	const lat2 = c2.latitude * toRad;
	const lng2 = c2.longitude * toRad;

	return {
		lat1,
		lat2,
		lng1,
		lng2,
		dLat: lat2 - lat1,
		dLng: lng2 - lng1,
	}
}

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
	const coords = toRadianCoordinates(from, to);
	if (!coords) return NaN;

	const { lat1, lat2, dLat, dLng } = coords;
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	const radius = unit === 'miles' ? 3958.7613 : (unit === 'm' ? 6371008.8 : 6371.0088);
	const dist = radius * c;
	return unit === 'm' ? Math.round(dist) : Math.round(dist * 1000) / 1000;
}

/**
 * Resolves civil timezone offset in minutes for a given epoch timestamp.
 * Uses Temporal if present in runtime, with seamless fallback to Intl.DateTimeFormat.
 * @internal
 */
const resolveCivilTimezoneOffset = (tz: string, epochMs: number): number | undefined => {
	try {
		if (isDefined((globalThis as any).Temporal) && isFunction((globalThis as any).Temporal.Instant?.fromEpochMilliseconds)) {
			const zdt = Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(tz);
			return zdt.offsetNanoseconds / 60_000_000_000;
		}

		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			timeZoneName: 'longOffset',
			year: 'numeric'
		}).formatToParts(new Date(epochMs));

		const tzPart = parts.find(p => p.type === 'timeZoneName')?.value;
		if (tzPart) {
			if (tzPart === 'GMT' || tzPart === 'UTC') return 0;
			const match = tzPart.match(/GMT([+-])(\d{2}):(\d{2})/);
			if (match) {
				const sign = match[1] === '-' ? -1 : 1;
				return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
			}
		}
	} catch {
		// Invalid timezone strings gracefully fall back to natural solar meridian
	}
	return undefined;
};

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
	if (!geo || !isNumber(geo.latitude) || !isNumber(geo.longitude)) {
		return NaN;
	}

	const lng = geo.longitude;
	const tz = options?.timeZone
		?? (isReference(coords) ? ((coords as any).timezone ?? (coords as any).tz) : undefined)
		?? geo.timezone;

	const dateVal = options?.date ?? (isReference(coords) ? extractEpochMs(coords) : undefined);
	const epochMs = isDefined(dateVal) ? extractEpochMs(dateVal) : Date.now();

	if (!isNumber(epochMs)) return NaN;

	const offsetMinutes = isText(tz) ? resolveCivilTimezoneOffset(tz, epochMs) : undefined;

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

	const unit = options?.unit ?? 'mi';
	let res: number;
	if (unit === 'ss' || unit === 'seconds') {
		res = offsetMin * 60;
	} else if (unit === 'hh' || unit === 'hours') {
		res = offsetMin / 60;
	} else {
		res = offsetMin;
	}

	const precision = options?.precision ?? 2;
	const factor = Math.pow(10, precision);
	return Math.round(res * factor) / factor;
}

/**
 * Extracts a numeric epoch millisecond timestamp from diverse date/time or instance representations.
 * @internal
 */
export function extractEpochMs(input: any): number | undefined {
	if (isNullish(input)) return undefined;
	if (isNumber(input)) return input;
	if (isDate(input)) return input.getTime();
	if (isReference(input)) {
		if (isNumber(input.epoch?.ms)) return input.epoch.ms;
		if (isNumber(input.epochMilliseconds)) return input.epochMilliseconds;
		if (isNumber(input.timestamp)) return input.timestamp;
		if (isDate(input.date)) return input.date.getTime();
		if (isFunction(input.toInstant)) {
			try { return input.toInstant().epochMilliseconds; } catch { }
		}
		if (isFunction(input.getTime))
			try { return input.getTime(); } catch { }
	}
	if (isString(input)) {
		const parsed = Date.parse(input);
		if (isNumber(parsed)) return parsed;
	}
	return undefined;
}

/**
 * Calculates the initial forward azimuth compass bearing (0° to 360°) along the Great-Circle path from origin to destination.
 * 
 * @param from - Origin coordinate, object, tuple, or instance exposing .geo
 * @param to - Destination coordinate, object, tuple, or instance exposing .geo
 * @param options - Configuration options such as precision (default: 1 decimal place)
 * @returns Compass bearing in degrees (0° to 360°), or NaN if either coordinate is invalid
 */
export function calculateBearing(from: any, to: any, options?: BearingOptions): number {
	const coords = toRadianCoordinates(from, to);
	if (!coords) return NaN;

	const { lat1, lat2, dLng } = coords;
	const y = Math.sin(dLng) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

	const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

	const precision = options?.precision ?? 1;
	const factor = Math.pow(10, precision);
	return Math.round(bearing * factor) / factor;
}

/**
 * Calculates the geographic midpoint along the Great-Circle path between two coordinates.
 * 
 * @param from - Origin coordinate, object, tuple, or instance exposing .geo
 * @param to - Destination coordinate, object, tuple, or instance exposing .geo
 * @returns Midpoint coordinate object with inferred hemisphere ({ latitude, longitude, sphere }), or undefined if invalid
 */
export function calculateMidpoint(from: any, to: any): { latitude: number; longitude: number; sphere: GeoSphere } | undefined {
	const coords = toRadianCoordinates(from, to);
	if (!coords) return undefined;

	const { lat1, lat2, lng1, dLng } = coords;
	const Bx = Math.cos(lat2) * Math.cos(dLng);
	const By = Math.cos(lat2) * Math.sin(dLng);

	const latMidRad = Math.atan2(
		Math.sin(lat1) + Math.sin(lat2),
		Math.sqrt((Math.cos(lat1) + Bx) ** 2 + By ** 2)
	);
	const lngMidRad = lng1 + Math.atan2(By, Math.cos(lat1) + Bx);

	const midLat = Math.round((latMidRad * 180 / Math.PI) * 1000) / 1000;
	const midLng = Math.round((((lngMidRad * 180 / Math.PI + 540) % 360 - 180)) * 1000) / 1000;

	const sphere: GeoSphere = midLat > 0.001 ? 'north' : (midLat < -0.001 ? 'south' : 'equator');

	return {
		latitude: midLat,
		longitude: midLng,
		sphere,
	};
}

/**
 * Calculates the speed/velocity between two timestamped geographic instances or coordinate objects.
 * 
 * @param from - Origin coordinate or timestamped instance
 * @param to - Destination coordinate or timestamped instance
 * @param options - Configuration options for units and precision
 * @returns Calculated velocity in requested unit (e.g. km/h, mph, m/s), or NaN if invalid
 */
export function calculateVelocity(from: any, to: any, options?: VelocityOptions | DistanceUnit): number {
	const opts: VelocityOptions = isString(options) ? { unit: options as DistanceUnit } : (options ?? {});
	const unit = opts.unit ?? 'km';
	const timeUnit = opts.timeUnit ?? 'hh';

	const dist = haversineDistance(from, to, unit);
	if (isNaN(dist)) return NaN;

	const t1 = extractEpochMs(from);
	const t2 = extractEpochMs(to);

	if (!isNumber(t1) || !isNumber(t2)) return NaN;

	const deltaMs = Math.abs(t2 - t1);
	if (deltaMs === 0) {
		return dist === 0 ? 0 : Infinity;
	}

	let deltaUnits: number;
	if (timeUnit === 'ss' || timeUnit === 's' || timeUnit === 'seconds' || timeUnit === 'second') {
		deltaUnits = deltaMs / 1000;
	} else if (timeUnit === 'mi' || timeUnit === 'm' || timeUnit === 'minutes' || timeUnit === 'minute') {
		deltaUnits = deltaMs / 60_000;
	} else {
		deltaUnits = deltaMs / 3_600_000; // Default: hours ('hh', 'h')
	}

	const velocity = dist / deltaUnits;
	const precision = opts.precision ?? 2;
	const factor = Math.pow(10, precision);
	return Math.round(velocity * factor) / factor;
}

/**
 * Evaluates whether travel between two timestamped geographic instances represents an impossible travel anomaly
 * (e.g. concurrent logins from distant countries exceeding commercial flight velocities).
 * 
 * @param from - Origin coordinate or timestamped instance
 * @param to - Destination coordinate or timestamped instance
 * @param options - Feasibility options including custom speed threshold (default max speed: 900 km/h)
 * @returns true if calculated velocity exceeds commercial feasibility threshold, false otherwise
 */
export function isImpossibleTravel(from: any, to: any, options?: ImpossibleTravelOptions): boolean {
	const unit = options?.unit ?? 'km';
	const defaultMax = unit === 'miles' ? 560 : (unit === 'm' ? 250 : 900); // 900 km/h ≈ 560 mph ≈ 250 m/s
	const threshold = options?.maxSpeed ?? options?.maxCommercialSpeedKmH ?? defaultMax;

	const velocity = calculateVelocity(from, to, { unit, timeUnit: unit === 'm' ? 'ss' : 'hh' });

	return (!isNumber(velocity))
		? false
		: velocity > threshold;
}


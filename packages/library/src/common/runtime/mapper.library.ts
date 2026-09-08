import { CONTEXT, getContext } from '#library/utility.library.js';
import { isNullish, isNumber, isString, isSafeKey } from '#library/assertion.library.js';
import { getStorage } from '#library/storage.library.js';

export interface GeoLookupResult {
	lat?: number;
	lng?: number;
	latitude?: number;
	longitude?: number;
	error?: string;
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

/**
 * Extracts and coerces latitude and longitude from input object (Tempo options, config, or instance)
 * into a canonical `{ latitude, longitude, ... }` GeoConfig object.
 * 
 * @param input - Optional object containing coordinate or geo properties
 */
export const coerceGeo = (input?: any): GeoConfig | undefined => {
	if (isNullish(input) || typeof input !== 'object') return undefined;

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

	if (geoObj && typeof geoObj === 'object') {
		for (const key of Object.keys(geoObj)) {
			if (isSafeKey(key) && !['latitude', 'lat', 'longitude', 'lng', 'lon', 'long', 'elevation', 'sphere', 'country', 'city'].includes(key))
				(result as any)[key] = geoObj[key];
		}
	}

	return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * Synchronously retrieves stashed geolocation from storage or memory cache if present.
 */
export const getStashedGeo = (): GeoConfig | undefined => {
	const { type } = getContext();
	if (type === CONTEXT.Browser || type === CONTEXT.WebWorker) {
		try {
			if (typeof localStorage !== 'undefined') {
				const raw = localStorage.getItem('_map_');
				if (raw) {
					const parsed = JSON.parse(raw);
					const coords = parsed?.geolocation?.coords ?? parsed?.coords ?? parsed;
					const lat = coords?.latitude ?? coords?.lat;
					const lng = coords?.longitude ?? coords?.lng ?? coords?.lon ?? coords?.long;
					if (isNumber(lat) && isNumber(lng)) {
						return { latitude: lat, longitude: lng };
					}
				}
			}
		} catch {
			// ignore storage access errors
		}
	} else if (type === CONTEXT.NodeJS || type === CONTEXT.Deno) {
		try {
			const raw = getStorage<any>('_map_') ?? getStorage<any>('TEMPO_GEO');
			if (raw) {
				if (typeof raw === 'string' && raw.includes(',')) {
					const parts = raw.split(',').map(s => parseFloat(s.trim()));
					if (parts.length >= 2 && isNumber(parts[0]) && isNumber(parts[1])) {
						return { latitude: parts[0], longitude: parts[1] };
					}
				}
				if (typeof raw === 'object') {
					const coords = raw.geolocation?.coords ?? raw.coords ?? raw;
					const lat = coords?.latitude ?? coords?.lat;
					const lng = coords?.longitude ?? coords?.lng ?? coords?.lon ?? coords?.long;
					if (isNumber(lat) && isNumber(lng)) {
						const result: GeoConfig = { latitude: lat, longitude: lng };
						const elevation = raw.elevation ?? coords.elevation;
						if (isNumber(elevation)) result.elevation = elevation;
						if (raw.sphere === 'north' || raw.sphere === 'south') result.sphere = raw.sphere;
						if (isString(raw.country)) result.country = raw.country;
						if (isString(raw.city)) result.city = raw.city;
						return result;
					}
				}
			}
		} catch {
			// ignore storage access errors
		}
	}
	return undefined;
};

/**
 * Universal geolocation lookup dispatcher.
 * Automatically delegates to browser `geoLocation()` or server `serverGeoLocation()` based on runtime context.
 * 
 * @param opts - Lookup options passed down to environment handler
 */
export const geoLookup = async (opts: Record<string, any> = {}): Promise<GeoLookupResult> => {
	const { type } = getContext();

	switch (type) {
		case CONTEXT.Browser: {
			const { geoLocation } = await import('#browser/mapper.library.js');
			const res = await geoLocation(opts as any);
			if (res.error)
				return { error: res.error };

			const lat = res.coords?.latitude;
			const lng = res.coords?.longitude;
			return { lat, lng, latitude: lat, longitude: lng, ...res };
		}

		case CONTEXT.WebWorker: {
			const stashed = getStashedGeo();
			if (stashed && isNumber(stashed.latitude) && isNumber(stashed.longitude))
				return { lat: stashed.latitude, lng: stashed.longitude, latitude: stashed.latitude, longitude: stashed.longitude };

			const { serverGeoLocation } = await import('#server/mapper.library.js');
			return serverGeoLocation(opts as any);
		}

		case CONTEXT.NodeJS:
		case CONTEXT.Deno:
		default: {
			const { serverGeoLocation } = await import('#server/mapper.library.js');
			return serverGeoLocation(opts as any);
		}
	}
}

/**
 * Universal coordinate resolver.
 * Extracts latitude and longitude from input object (Tempo instance, config, options),
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

	const stashed = getStashedGeo();
	if (stashed && isNumber(stashed.latitude) && isNumber(stashed.longitude))
		return { lat: stashed.latitude, lng: stashed.longitude };

	const lookup = await geoLookup(opts);
	if (isNullish(lookup.error) && isNumber(lookup.lat) && isNumber(lookup.lng))
		return { lat: lookup.lat, lng: lookup.lng };

	return null;
}


import { CONTEXT, getContext } from '#library/utility.library.js';
import { isNullish, isNumber } from '#library/assertion.library.js';
import { geoLocation } from '#browser/mapper.library.js';
import { serverGeoLocation } from '#server/mapper.library.js';

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
	if (typeof sphere === 'string') result.sphere = sphere as any;
	if (typeof country === 'string') result.country = country;
	if (typeof city === 'string') result.city = city;

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
					const coords = parsed?.geolocation?.coords;
					if (isNumber(coords?.latitude) && isNumber(coords?.longitude)) {
						return { latitude: coords.latitude, longitude: coords.longitude };
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

			return serverGeoLocation(opts as any);
		}

		case CONTEXT.NodeJS:
		case CONTEXT.Deno:
		default:
			return serverGeoLocation(opts as any);
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
	const coerced = coerceGeo(input) ?? getStashedGeo();
	if (coerced && isNumber(coerced.latitude) && isNumber(coerced.longitude))
		return { lat: coerced.latitude, lng: coerced.longitude };

	const lookup = await geoLookup(opts);
	if (isNullish(lookup.error) && isNumber(lookup.lat) && isNumber(lookup.lng))
		return { lat: lookup.lat, lng: lookup.lng };

	return null;
}


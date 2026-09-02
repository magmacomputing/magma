import { CONTEXT, getContext } from '#library/utility.library.js';
import { isNullish, isNumber } from '#library/assertion.library.js';

export interface GeoLookupResult {
	lat?: number;
	lng?: number;
	latitude?: number;
	longitude?: number;
	error?: string;
	[key: string]: any;
}

export interface CoordinateInput {
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
 * Universal geolocation lookup dispatcher.
 * Automatically delegates to browser `geoLocation()` or server `serverGeoLocation()` based on runtime context.
 * 
 * @param opts - Lookup options passed down to environment handler
 */
export const geoLookup = async (opts: Record<string, any> = {}): Promise<GeoLookupResult> => {
	const context = getContext();

	if (context.type === CONTEXT.Browser) {
		const { geoLocation } = await import('#browser/mapper.library.js');
		const res = await geoLocation(opts as any);
		if (res.error)
			return { error: res.error };

		const lat = res.coords?.latitude;
		const lng = res.coords?.longitude;
		return { lat, lng, latitude: lat, longitude: lng, ...res };
	}

	const { serverGeoLocation } = await import('#server/mapper.library.js');
	return serverGeoLocation(opts as any);
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
	if (!isNullish(input)) {
		if (!isNullish(input.config)) {
			const cfgLat = input.config.latitude ?? input.config.lat;
			const cfgLng = input.config.longitude ?? input.config.lng ?? input.config.lon ?? input.config.long;
			if (isNumber(cfgLat) && isNumber(cfgLng))
				return { lat: cfgLat, lng: cfgLng };
		}

		const lat = input.latitude ?? input.lat;
		const lng = input.longitude ?? input.lng ?? input.lon ?? input.long;

		if (isNumber(lat) && isNumber(lng))
			return { lat, lng };
	}

	const lookup = await geoLookup(opts);
	if (isNullish(lookup.error) && isNumber(lookup.lat) && isNumber(lookup.lng))
		return { lat: lookup.lat, lng: lookup.lng };

	return null;
}

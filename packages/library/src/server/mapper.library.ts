import { isNullish, isNumber, isString } from '#library/assertion.library.js';
import { getHemisphere } from '#library/international.library.js';
import { Logger, type DebugLevel } from '#library/logger.class.js';

export interface ServerMapOpts {
	endpoint?: string;
	timeout?: number;
	catch?: boolean;
	debug?: DebugLevel;
}

export interface ServerGeolocationResult {
	lat?: number;
	lng?: number;
	latitude?: number;
	longitude?: number;
	country?: string;
	city?: string;
	timezone?: string;
	query?: string;
	status?: string;
	error?: string;
}

const log = new Logger('[ServerMapper]');
const defaults: ServerMapOpts = {
	endpoint: 'https://ipwho.is/',
	timeout: 3000,
	catch: true,
	debug: 0,
}

let requestModulePromise: Promise<typeof import('../common/runtime/request.library.js')> | null = null;
const getRequestModule = () => {
	if (!requestModulePromise)
		requestModulePromise = import('../common/runtime/request.library.js');
	return requestModulePromise;
};

/**
 * Perform server-side IP geolocation query via HTTP fetchRequest.
 * 
 * @param opts - Options including custom endpoint URL and timeout
 * @returns Geolocation result object with coordinates and location info
 */
export const serverGeoLocation = async (opts = {} as ServerMapOpts): Promise<ServerGeolocationResult> => {
	const options = { ...defaults, ...opts };
	const fulfil = options.catch !== false;

	try {
		const endpoint = options.endpoint || defaults.endpoint!;
		const timeout = options.timeout ?? defaults.timeout;
		const { fetchRequest } = await getRequestModule();
		const data = await fetchRequest<Record<string, any>>(
			endpoint,
			{},
			{ ...(isNumber(timeout) ? { timeout } : {}), maxBytes: 64 * 1024 }
		);

		if (typeof data !== 'object' || isNullish(data))
			throw new Error('Geolocation lookup failed');

		if (data.status === 'fail' || data.success === false)
			throw new Error(data.message || data.reason || 'Geolocation lookup failed');

		const lat = isNumber(data.lat) ? data.lat : data.latitude;
		const lng = isNumber(data.lon) ? data.lon : (data.lng ?? data.longitude);

		if (!isNumber(lat) || !isNumber(lng))
			throw new Error('Geolocation lookup failed');

		const tz = isString(data.timezone) ? data.timezone : (data.timezone?.id ?? data.timeZone);

		const result: ServerGeolocationResult = {
			lat,
			lng,
			latitude: lat,
			longitude: lng,
			...(isString(data.country || data.countryName || data.country_name) ? { country: data.country || data.countryName || data.country_name } : {}),
			...(isString(data.city || data.cityName || data.city_name) ? { city: data.city || data.cityName || data.city_name } : {}),
			...(isString(tz) ? { timezone: tz } : {}),
			...(isString(data.query || data.ip || data.ip_address) ? { query: data.query || data.ip || data.ip_address } : {}),
			status: 'success',
		}

		if (options.debug)
			log.info(options, 'serverGeoLocation success: ', result);

		return result;
	} catch (err: any) {
		const errorMsg = err?.message || 'Server geolocation error';
		if (options.debug)
			log.error(options, 'serverGeoLocation error: ', errorMsg);

		if (!fulfil)
			throw err;

		return { error: errorMsg, status: 'fail' };
	}
};

/**
 * Normalize coordinates or resolve default IP location on server.
 * 
 * @param coords - Optional coordinate input
 * @param opts - Server map options
 */
export const serverGeoCoords = async (
	coords?: { latitude?: number; lat?: number; longitude?: number; lng?: number; lon?: number; long?: number },
	opts?: ServerMapOpts
): Promise<{ lat: number; lng: number } | null> => {
	if (!isNullish(coords)) {
		const lat = coords.latitude ?? coords.lat;
		const lng = coords.longitude ?? coords.lng ?? coords.lon ?? coords.long;
		if (isNumber(lat) && isNumber(lng))
			return { lat, lng };
	}

	const geo = await serverGeoLocation(opts);
	if (isNullish(geo.error) && isNumber(geo.lat) && isNumber(geo.lng))
		return { lat: geo.lat, lng: geo.lng };

	return null;
}

/**
 * Determine Hemisphere ('north' | 'south' | null) for server coordinates.
 * 
 * @param coords - Optional coordinates
 * @param opts - Options
 */
export const serverMapHemisphere = async (
	coords?: { latitude?: number; lat?: number; longitude?: number; lng?: number; lon?: number; long?: number },
	opts?: ServerMapOpts
): Promise<'north' | 'south' | null> => {
	const resolved = await serverGeoCoords(coords, opts);
	if (resolved)
		return resolved.lat >= 0 ? 'north' : 'south';

	return getHemisphere() ?? null;
}

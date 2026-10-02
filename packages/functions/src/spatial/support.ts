import type { GeoConfig, GeoSphere } from './types.js';
import {
	isNumber,
	isString,
	isUndefined,
	isReference,
	extractRawCoords,
	normalizeCoords,
	extractEpochMs,
	parseCoordNumber,
	normalizeLat,
	normalizeLng,
} from '../support/index.js';

export { parseCoordNumber, normalizeLat, normalizeLng, normalizeCoords, extractRawCoords, extractEpochMs };

/**
 * Coerces coordinate inputs into canonical GeoConfig objects with 3-decimal precision.
 * @internal
 */
export function coerceGeo(input: any): GeoConfig | undefined {
	const raw = extractRawCoords(input);
	if (isUndefined(raw))
		return undefined;

	const coords = normalizeCoords(raw.lat, raw.lng, true);
	if (isUndefined(coords))
		return undefined;

	const { lat, lng } = coords;
	const sphere: GeoSphere = lat > 0.001 ? 'north' : (lat < -0.001 ? 'south' : 'equator');

	const geoObj = isReference(input) ? ((input as any).geo ?? (input as any).config?.geo ?? input) : {};

	return {
		latitude: lat,
		longitude: lng,
		sphere: geoObj?.sphere ?? sphere,
		...(isString(geoObj?.country) ? { country: geoObj.country } : {}),
		...(isString(geoObj?.city) ? { city: geoObj.city } : {}),
		...(isNumber(geoObj?.elevation) ? { elevation: Math.round(geoObj.elevation * 1000) / 1000 } : {}),
		...(isString(geoObj?.timezone) ? { timezone: geoObj.timezone } : {}),
	};
}

/**
 * Coerces and projects two coordinate inputs into radians for spherical trigonometry.
 * @internal
 */
export function toRadianCoordinates(from: any, to: any): {
	lat1: number;
	lat2: number;
	lng1: number;
	lng2: number;
	dLat: number;
	dLng: number;
} | undefined {
	const c1 = extractRawCoords(from);
	const c2 = extractRawCoords(to);

	if (!c1 || !c2 || !isNumber(c1.lat) || !isNumber(c1.lng) || !isNumber(c2.lat) || !isNumber(c2.lng))
		return undefined;

	const toRad = Math.PI / 180;
	const lat1 = c1.lat * toRad;
	const lng1 = c1.lng * toRad;
	const lat2 = c2.lat * toRad;
	const lng2 = c2.lng * toRad;

	return {
		lat1,
		lat2,
		lng1,
		lng2,
		dLat: lat2 - lat1,
		dLng: lng2 - lng1,
	};
}


import type { GeoConfig, GeoSphere } from './types.js';
import {
	isNumber,
	isString,
	isText,
	isBoolean,
	isFunction,
	isNullish,
	isDate,
	isReference,
	isDefined,
} from '../support/index.js';

/**
 * Internal helper to parse a raw coordinate value (number or non-empty string) into a number.
 * Returns NaN for booleans, empty/whitespace strings, or invalid values.
 * @internal
 */
export const parseCoordNumber = (val: any): number => {
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
export const normalizeLat = (lat: any, round = true): number | undefined => {
	const n = parseCoordNumber(lat);
	if (!isNumber(n) || n < -90 || n > 90) return undefined;
	return round ? Math.round(n * 1000) / 1000 : n;
};

/**
 * Normalizes longitude if within [-180, 180] bounds, optionally rounding to 3 decimal places.
 * @internal
 */
export const normalizeLng = (lng: any, round = true): number | undefined => {
	const n = parseCoordNumber(lng);
	if (!isNumber(n) || n < -180 || n > 180) return undefined;
	return round ? Math.round(n * 1000) / 1000 : n;
};

/**
 * Validates and normalizes coordinate pairs within Earth boundaries, optionally rounding to 3 decimal places.
 * @internal
 */
export const normalizeCoords = (lat: any, lng: any, round = true): { lat: number; lng: number } | undefined => {
	const nLat = normalizeLat(lat, round);
	const nLng = normalizeLng(lng, round);
	return (isDefined(nLat) && isDefined(nLng)) ? { lat: nLat, lng: nLng } : undefined;
};

/**
 * Extracts validated, unrounded coordinates from objects, tuples, or strings.
 * @internal
 */
export function extractRawCoords(input: any): { lat: number; lng: number } | undefined {
	if (isNullish(input)) return undefined;
	if (isString(input) && input.includes(',')) {
		const segments = input.split(',').map(s => s.trim());
		return segments.length >= 2 ? normalizeCoords(segments[0], segments[1], false) : undefined;
	}
	if (Array.isArray(input) && input.length >= 2)
		return normalizeCoords(input[0], input[1], false);

	if (isReference(input)) {
		const geo = (input as any).geo ?? (input as any).config?.geo ?? input;
		const cfg = (input as any).config?.geo ?? (input as any).config;

		const findFirstNumber = (...candidates: any[]): number | undefined => {
			for (const c of candidates) {
				const n = parseCoordNumber(c);
				if (isNumber(n)) return n;
			}
			return undefined;
		};

		const lat = findFirstNumber(geo?.latitude, geo?.lat, (input as any).latitude, (input as any).lat, cfg?.latitude, cfg?.lat);
		const lng = findFirstNumber(geo?.longitude, geo?.lng, geo?.lon, geo?.long, (input as any).longitude, (input as any).lng, (input as any).lon, (input as any).long, cfg?.longitude, cfg?.lng, cfg?.lon, cfg?.long);

		return normalizeCoords(lat, lng, false);
	}
	return undefined;
}

/**
 * Coerces coordinate inputs into canonical GeoConfig objects with 3-decimal precision.
 * @internal
 */
export function coerceGeo(input: any): GeoConfig | undefined {
	const raw = extractRawCoords(input);
	if (!raw) return undefined;

	const lat = normalizeLat(raw.lat);
	const lng = normalizeLng(raw.lng);
	if (lat === undefined || lng === undefined) return undefined;

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

/**
 * Extracts a numeric epoch millisecond timestamp from diverse date/time or instance representations.
 * @internal
 */
export function extractEpochMs(input: any): number | undefined {
	if (isNullish(input)) return undefined;
	if (isNumber(input)) return input;
	if (isDate(input)) return input.getTime();
	if (isReference(input)) {
		if (isNumber((input as any).epoch?.ms)) return (input as any).epoch.ms;
		if (isNumber((input as any).epochMilliseconds)) return (input as any).epochMilliseconds;
		if (isNumber((input as any).timestamp)) return (input as any).timestamp;
		if (isDate((input as any).date)) return (input as any).date.getTime();
		if (isFunction((input as any).toInstant)) {
			try {
				const t = (input as any).toInstant().epochMilliseconds;
				if (isNumber(t)) return t;
			} catch { }
		}
		if (isFunction((input as any).getTime)) {
			try {
				const t = (input as any).getTime();
				if (isNumber(t)) return t;
			} catch { }
		}
	}
	if (isString(input)) {
		const parsed = Date.parse(input);
		if (isNumber(parsed)) return parsed;
	}
	return undefined;
}

import {
	isNumber,
	isString,
	isBoolean,
	isNullish,
	isDefined,
	isObject,
	isReference,
} from './assert.js';

/**
 * Internal helper to parse a raw coordinate value (number or non-empty string) into a finite number.
 * Returns NaN for booleans, empty/whitespace strings, or invalid values.
 * @internal
 */
export const parseCoordNumber = (val: any): number => {
	if (isNullish(val) || isBoolean(val))
		return NaN;
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
export const normalizeLat = (lat: any, round = false): number | undefined => {
	const n = parseCoordNumber(lat);
	if (!isNumber(n) || n < -90 || n > 90)
		return undefined;
	return round ? Math.round(n * 1000) / 1000 : n;
};

/**
 * Normalizes longitude if within [-180, 180] bounds, optionally rounding to 3 decimal places.
 * @internal
 */
export const normalizeLng = (lng: any, round = false): number | undefined => {
	const n = parseCoordNumber(lng);
	if (!isNumber(n) || n < -180 || n > 180)
		return undefined;
	return round ? Math.round(n * 1000) / 1000 : n;
};

/**
 * Validates and normalizes coordinate pairs within Earth boundaries, optionally rounding to 3 decimal places.
 * @internal
 */
export const normalizeCoords = (lat: any, lng: any, round = false): { lat: number; lng: number } | undefined => {
	const nLat = normalizeLat(lat, round);
	const nLng = normalizeLng(lng, round);
	return (isDefined(nLat) && isDefined(nLng)) ? { lat: nLat, lng: nLng } : undefined;
};

/**
 * Universal Coordinate Extractor.
 * Extracts validated, unrounded coordinates from positional arguments, objects, tuples, strings, or instances.
 * Accepts:
 * - Positional numbers: (lat, lng)
 * - [lat, lng] or [lat, lng, elevation] tuples
 * - "lat, lng" comma-separated strings
 * - Objects with lat/latitude, lng/longitude/lon/long, elevation
 * - Wrapped instances exposing .geo or .config.geo
 *
 * @param input - Primary coordinate input or latitude number
 * @param lngFallback - Longitude number when input is numeric latitude
 * @returns Validated coordinates { lat, lng, elevation } or undefined
 */
export function extractRawCoords(input: any, lngFallback?: number): { lat: number; lng: number; elevation?: number } | undefined {
	if (isNullish(input))
		return undefined;

	if (isNumber(input) && isNumber(lngFallback)) {
		const coords = normalizeCoords(input, lngFallback, false);
		return coords ? { ...coords, elevation: 0 } : undefined;
	}

	if (isString(input) && input.includes(',')) {
		const segments = input.split(',').map(s => s.trim());
		if (segments.length >= 2) {
			const coords = normalizeCoords(segments[0], segments[1], false);
			const elev = segments.length >= 3 ? parseCoordNumber(segments[2]) : undefined;
			return coords ? { ...coords, ...(isNumber(elev) ? { elevation: elev } : {}) } : undefined;
		}
		return undefined;
	}

	if (Array.isArray(input) && input.length >= 2) {
		const coords = normalizeCoords(input[0], input[1], false);
		const elev = input.length >= 3 ? parseCoordNumber(input[2]) : undefined;
		return coords ? { ...coords, ...(isNumber(elev) ? { elevation: elev } : {}) } : undefined;
	}

	if (isReference(input) || isObject(input)) {
		const geo = (input as any).geo ?? (input as any).config?.geo ?? input;
		const cfg = (input as any).config?.geo ?? (input as any).config;

		const findFirstNumber = (...candidates: any[]): number | undefined => {
			for (const c of candidates) {
				const n = parseCoordNumber(c);
				if (isNumber(n))
					return n;
			}
			return undefined;
		};

		const lat = findFirstNumber(geo?.latitude, geo?.lat, (input as any).latitude, (input as any).lat, cfg?.latitude, cfg?.lat);
		const lng = findFirstNumber(geo?.longitude, geo?.lng, geo?.lon, geo?.long, (input as any).longitude, (input as any).lng, (input as any).lon, (input as any).long, cfg?.longitude, cfg?.lng, cfg?.lon, cfg?.long);
		const elev = findFirstNumber(geo?.elevation, (input as any).elevation, cfg?.elevation);

		const coords = normalizeCoords(lat, lng, false);
		return coords ? { ...coords, ...(isNumber(elev) ? { elevation: elev } : {}) } : undefined;
	}

	return undefined;
}

/**
 * Resolves coordinate components with safe default fallbacks (0, 0, 0).
 *
 * @param latOrOptions - Coordinate input, latitude number, or options object
 * @param lngInput - Optional longitude number
 * @returns An object containing resolved lat, lng, and elevation numbers
 */
export function resolveCoordinates(latOrOptions: any = 0, lngInput = 0): { lat: number; lng: number; elevation: number } {
	const extracted = extractRawCoords(latOrOptions, isNumber(latOrOptions) ? lngInput : undefined);
	if (extracted)
		return { lat: extracted.lat, lng: extracted.lng, elevation: extracted.elevation ?? 0 };

	if (isNumber(latOrOptions))
		return { lat: latOrOptions, lng: lngInput, elevation: 0 };

	return { lat: 0, lng: 0, elevation: 0 };
}

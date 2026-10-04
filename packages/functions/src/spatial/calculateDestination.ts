import type { CoordinateInput, DistanceUnit } from './types.js';
import { extractRawCoords } from './support.js';
import { isNumber } from '../support/index.js';

/**
 * Calculates destination coordinates given a starting point, distance, and initial forward bearing
 * using the Great-Circle spherical law of cosines forward geodesic equations.
 *
 * @param start - Starting coordinate, object, tuple, or instance exposing `.geo`
 * @param distance - Distance to travel
 * @param bearing - Initial compass azimuth bearing in degrees (0° to 360° True North)
 * @param unit - Distance unit ('km', 'miles', or 'm'; default: 'km')
 * @returns [latitude, longitude] destination tuple in decimal degrees, or [NaN, NaN] if input is invalid
 *
 * @example
 * ```ts
 * const dest = calculateDestination([40.7128, -74.006], 100, 90, 'km');
 * // ~[40.709337, -72.822765] (100km East of NYC)
 * ```
 */
export function calculateDestination(
	start: CoordinateInput | [number, number] | string | any,
	distance: number,
	bearing: number,
	unit: DistanceUnit = 'km',
): [latitude: number, longitude: number] {
	const raw = extractRawCoords(start);
	if (!raw || !isNumber(distance) || !isNumber(bearing))
		return [NaN, NaN];

	const toRad = Math.PI / 180;
	const toDeg = 180 / Math.PI;

	const lat1 = raw.lat * toRad;
	const lng1 = raw.lng * toRad;
	const brng = bearing * toRad;

	const radius = unit === 'miles' ? 3958.7613 : (unit === 'm' ? 6371008.8 : 6371.0088);
	const delta = distance / radius;

	const lat2 = Math.asin(
		Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(brng),
	);

	const y = Math.sin(brng) * Math.sin(delta) * Math.cos(lat1);
	const x = Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2);
	const lng2 = lng1 + Math.atan2(y, x);

	const latOut = lat2 * toDeg;
	const lngOut = ((lng2 * toDeg + 540) % 360) - 180;

	return [
		Math.round(latOut * 1_000_000) / 1_000_000,
		Math.round(lngOut * 1_000_000) / 1_000_000,
	];
}

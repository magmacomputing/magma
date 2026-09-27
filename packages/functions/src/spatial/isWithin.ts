import type { DistanceUnit } from './types.js';
import { extractRawCoords } from './support.js';
import { isNumber } from '../support/index.js';

/**
 * Checks whether the Great-Circle distance between two coordinates is within a specified radius.
 *
 * @param from - Origin coordinate, object, tuple, or instance
 * @param to - Target coordinate, object, tuple, or instance
 * @param maxDistance - Maximum allowable distance
 * @param unit - Distance unit ('km', 'miles', or 'm'; default: 'km')
 * @returns true if distance is <= maxDistance, false otherwise
 *
 * @example
 * ```ts
 * const inRadius = isWithin(
 *   { lat: 48.8584, lng: 2.2945 }, // Eiffel Tower
 *   { lat: 48.8606, lng: 2.3376 }, // Louvre (~3.3 km)
 *   5, // 5 km radius
 *   'km'
 * ); // true
 * ```
 */
export function isWithin(from: any, to: any, maxDistance: number, unit: DistanceUnit = 'km'): boolean {
	if (!isNumber(maxDistance) || maxDistance < 0) return false;
	const c1 = extractRawCoords(from);
	const c2 = extractRawCoords(to);
	if (!c1 || !c2 || !isNumber(c1.lat) || !isNumber(c1.lng) || !isNumber(c2.lat) || !isNumber(c2.lng))
		return false;

	const toRad = Math.PI / 180;
	const lat1 = c1.lat * toRad;
	const lng1 = c1.lng * toRad;
	const lat2 = c2.lat * toRad;
	const lng2 = c2.lng * toRad;
	const dLat = lat2 - lat1;
	const dLng = lng2 - lng1;

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	const radius = unit === 'miles' ? 3958.7613 : (unit === 'm' ? 6371008.8 : 6371.0088);
	const dist = radius * c;

	return dist <= maxDistance;
}

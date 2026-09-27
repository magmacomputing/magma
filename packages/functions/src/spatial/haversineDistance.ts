import type { DistanceUnit } from './types.js';
import { toRadianCoordinates } from './support.js';

/**
 * Calculates the Great-Circle distance between two coordinates using the Haversine formula.
 * Accepts coordinate objects, [lat, lng] tuples, strings ("lat, lng"), or instances exposing `.geo`.
 *
 * @param from - Origin coordinate, object, tuple, or instance
 * @param to - Destination coordinate, object, tuple, or instance
 * @param unit - Distance unit ('km', 'miles', or 'm'; default: 'km')
 * @returns Calculated distance, or NaN if either coordinate pair is invalid
 *
 * @example
 * ```ts
 * const dist = haversineDistance(
 *   { lat: 40.7128, lng: -74.006 }, // NYC
 *   { lat: 51.5074, lng: -0.1278 }, // London
 *   'km'
 * ); // ~5570 km
 * ```
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

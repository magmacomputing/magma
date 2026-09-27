import type { BoundingBox } from './types.js';
import { extractRawCoords } from './support.js';
import { isNumber, isReference, isNullish } from '../support/index.js';

/**
 * Checks whether a coordinate point falls inside a geographic rectangular bounding box.
 * Correctly accounts for antimeridian crossing (180° longitude).
 *
 * @param coords - Coordinate to test (object, tuple, string, or instance)
 * @param bbox - Bounding box object or `[minLat, minLng, maxLat, maxLng]` tuple
 * @returns true if coords are inside bbox, false otherwise
 *
 * @example
 * ```ts
 * const inBox = inBoundingBox(
 *   { lat: 37.7749, lng: -122.4194 }, // SF
 *   { minLat: 37.0, maxLat: 38.0, minLng: -123.0, maxLng: -122.0 } // SF Bay Area
 * ); // true
 * ```
 */
export function inBoundingBox(
	coords: any,
	bbox: BoundingBox | [number, number, number, number]
): boolean {
	const geo = extractRawCoords(coords);
	if (!geo || !isNumber(geo.lat) || !isNumber(geo.lng)) return false;
	if (isNullish(bbox)) return false;

	let minLat: number | undefined;
	let maxLat: number | undefined;
	let minLng: number | undefined;
	let maxLng: number | undefined;

	if (Array.isArray(bbox) && bbox.length >= 4) {
		minLat = bbox[0];
		minLng = bbox[1];
		maxLat = bbox[2];
		maxLng = bbox[3];
	} else if (isReference(bbox)) {
		const b = bbox as BoundingBox;
		minLat = b.minLat ?? b.minLatitude;
		maxLat = b.maxLat ?? b.maxLatitude;
		minLng = b.minLng ?? b.minLongitude;
		maxLng = b.maxLng ?? b.maxLongitude;
	}

	if (!isNumber(minLat) || !isNumber(maxLat) || !isNumber(minLng) || !isNumber(maxLng))
		return false;

	const lat = geo.lat;
	const lng = geo.lng;

	if (lat < minLat || lat > maxLat) return false;

	// Check longitude (standard vs antimeridian wrap where minLng > maxLng)
	return minLng <= maxLng
		? lng >= minLng && lng <= maxLng
		: lng >= minLng || lng <= maxLng;
}

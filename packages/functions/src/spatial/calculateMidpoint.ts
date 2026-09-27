import type { GeoSphere } from './types.js';
import { toRadianCoordinates } from './support.js';

/**
 * Calculates the geographic midpoint along the Great-Circle path between two coordinates.
 *
 * @param from - Origin coordinate, object, tuple, or instance exposing `.geo`
 * @param to - Destination coordinate, object, tuple, or instance exposing `.geo`
 * @returns Midpoint coordinate object with inferred hemisphere ({ latitude, longitude, sphere }), or undefined if invalid
 *
 * @example
 * ```ts
 * const mid = calculateMidpoint(
 *   { lat: 0, lng: 0 },
 *   { lat: 0, lng: 100 }
 * ); // { latitude: 0, longitude: 50, sphere: 'equator' }
 * ```
 */
export function calculateMidpoint(from: any, to: any): { latitude: number; longitude: number; sphere: GeoSphere } | undefined {
	const coords = toRadianCoordinates(from, to);
	if (!coords) return undefined;

	const { lat1, lat2, lng1, dLng } = coords;
	const Bx = Math.cos(lat2) * Math.cos(dLng);
	const By = Math.cos(lat2) * Math.sin(dLng);

	const latMidRad = Math.atan2(
		Math.sin(lat1) + Math.sin(lat2),
		Math.sqrt((Math.cos(lat1) + Bx) ** 2 + By ** 2)
	);
	const lngMidRad = lng1 + Math.atan2(By, Math.cos(lat1) + Bx);

	const midLat = Math.round(((latMidRad * 180) / Math.PI) * 1000) / 1000;
	const midLng = Math.round((((((lngMidRad * 180) / Math.PI + 540) % 360) - 180)) * 1000) / 1000;

	const sphere: GeoSphere = midLat > 0.001 ? 'north' : (midLat < -0.001 ? 'south' : 'equator');

	return {
		latitude: midLat,
		longitude: midLng,
		sphere,
	};
}

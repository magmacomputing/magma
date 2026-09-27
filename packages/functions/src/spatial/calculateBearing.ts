import type { BearingOptions } from './types.js';
import { toRadianCoordinates } from './support.js';

/**
 * Calculates the initial forward azimuth compass bearing (0° to 360°) along the Great-Circle path from origin to destination.
 *
 * @param from - Origin coordinate, object, tuple, or instance exposing `.geo`
 * @param to - Destination coordinate, object, tuple, or instance exposing `.geo`
 * @param options - Configuration options such as precision (default: 1 decimal place)
 * @returns Compass bearing in degrees (0° to 360°), or NaN if either coordinate is invalid
 *
 * @example
 * ```ts
 * const bearing = calculateBearing(
 *   { lat: 37.7749, lng: -122.4194 }, // SF
 *   { lat: 34.0522, lng: -118.2437 }  // LA
 * ); // ~138.8°
 * ```
 */
export function calculateBearing(from: any, to: any, options?: BearingOptions): number {
	const coords = toRadianCoordinates(from, to);
	if (!coords) return NaN;

	const { lat1, lat2, dLng } = coords;
	const y = Math.sin(dLng) * Math.cos(lat2);
	const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

	const bearing = (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;

	const precision = options?.precision ?? 1;
	const factor = Math.pow(10, precision);
	return Math.round(bearing * factor) / factor;
}

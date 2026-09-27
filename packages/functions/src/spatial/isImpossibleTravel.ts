import type { ImpossibleTravelOptions } from './types.js';
import { calculateVelocity } from './calculateVelocity.js';

/**
 * Evaluates whether travel between two timestamped geographic instances represents an impossible travel anomaly
 * (e.g. concurrent logins from distant countries exceeding commercial flight velocities).
 *
 * @param from - Origin coordinate or timestamped instance
 * @param to - Destination coordinate or timestamped instance
 * @param options - Feasibility options including custom speed threshold (default max speed: 900 km/h)
 * @returns true if calculated velocity exceeds commercial feasibility threshold, false otherwise
 *
 * @example
 * ```ts
 * const loginA = { lat: 40.7128, lng: -74.006, timestamp: Date.now() }; // NYC
 * const loginB = { lat: 51.5074, lng: -0.1278, timestamp: Date.now() + 3600000 }; // London 1 hr later
 *
 * if (isImpossibleTravel(loginA, loginB)) {
 *   console.warn('Impossible travel detected! Speed > 5500 km/h');
 * }
 * ```
 */
export function isImpossibleTravel(from: any, to: any, options?: ImpossibleTravelOptions): boolean {
	const unit = options?.unit ?? 'km';
	const defaultMax = unit === 'miles' ? 560 : (unit === 'm' ? 250 : 900); // 900 km/h ≈ 560 mph ≈ 250 m/s

	let fallbackThreshold: number;
	if (options?.maxCommercialSpeedKmH !== undefined) {
		if (unit === 'miles') {
			fallbackThreshold = options.maxCommercialSpeedKmH * 0.621371;
		} else if (unit === 'm') {
			fallbackThreshold = (options.maxCommercialSpeedKmH * 1000) / 3600;
		} else {
			fallbackThreshold = options.maxCommercialSpeedKmH;
		}
	} else {
		fallbackThreshold = defaultMax;
	}

	const threshold = options?.maxSpeed ?? fallbackThreshold;

	const velocity = calculateVelocity(from, to, { unit, timeUnit: unit === 'm' ? 'ss' : 'hh' });

	return velocity > threshold;
}

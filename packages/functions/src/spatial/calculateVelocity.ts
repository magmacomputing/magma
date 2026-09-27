import type { DistanceUnit, VelocityOptions } from './types.js';
import { extractEpochMs } from './support.js';
import { isNumber, isString } from '../support/index.js';
import { haversineDistance } from './haversineDistance.js';

/**
 * Calculates the speed/velocity between two timestamped geographic instances or coordinate objects.
 *
 * @param from - Origin coordinate or timestamped instance
 * @param to - Destination coordinate or timestamped instance
 * @param options - Configuration options for units and precision
 * @returns Calculated velocity in requested unit (e.g. km/h, mph, m/s), or NaN if invalid
 *
 * @example
 * ```ts
 * const speed = calculateVelocity(
 *   { lat: 40.7128, lng: -74.006, timestamp: 1700000000000 },
 *   { lat: 42.3601, lng: -71.0589, timestamp: 1700007200000 }, // 2 hours later
 *   { unit: 'km', timeUnit: 'hh' }
 * ); // ~153.5 km/h
 * ```
 */
export function calculateVelocity(
	from: any,
	to: any,
	options?: VelocityOptions | DistanceUnit
): number {
	const opts: VelocityOptions = isString(options) ? { unit: options as DistanceUnit } : (options ?? {});
	const unit = opts.unit ?? 'km';
	const timeUnit = opts.timeUnit ?? 'hh';

	const dist = haversineDistance(from, to, unit);
	if (isNaN(dist)) return NaN;

	const t1 = extractEpochMs(from);
	const t2 = extractEpochMs(to);

	if (!isNumber(t1) || !isNumber(t2)) return NaN;

	const deltaMs = Math.abs(t2 - t1);
	if (deltaMs === 0)
		return dist === 0 ? 0 : Infinity;

	let deltaUnits: number;
	if (timeUnit === 'ss' || timeUnit === 's' || timeUnit === 'seconds' || timeUnit === 'second') {
		deltaUnits = deltaMs / 1000;
	} else if (timeUnit === 'mi' || timeUnit === 'm' || timeUnit === 'minutes' || timeUnit === 'minute') {
		deltaUnits = deltaMs / 60_000;
	} else {
		deltaUnits = deltaMs / 3_600_000; // Default: hours ('hh', 'h')
	}

	const velocity = dist / deltaUnits;
	const precision = opts.precision ?? 2;
	const factor = Math.pow(10, precision);
	return Math.round(velocity * factor) / factor;
}

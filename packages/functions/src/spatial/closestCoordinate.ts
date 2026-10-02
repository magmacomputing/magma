import { haversineDistance } from './haversineDistance.js';
import { extractRawCoords } from './support.js';
import { isDefined, isNumber } from '../support/index.js';
import type { CoordinateInput, DistanceUnit } from './types.js';

/**
 * Result returned by closestCoordinate representing the nearest candidate.
 */
export interface ClosestCoordinateResult<T = CoordinateInput> {
	/** The closest coordinate entity from the candidates collection */
	coordinate: T;
	/** The calculated Great-Circle distance to the target */
	distance: number;
	/** The 0-based array index of the closest candidate */
	index: number;
}

/**
 * Finds the closest coordinate from a collection of candidates relative to a target coordinate.
 * Uses the Great-Circle Haversine distance formula.
 *
 * @param target - Reference coordinate, object, tuple, or instance
 * @param candidates - Array of candidate coordinates to evaluate
 * @param unit - Distance unit ('km', 'miles', or 'm'; default: 'km')
 * @returns Object with the nearest coordinate, distance, and index, or null if candidates is empty or target is invalid
 *
 * @example
 * ```ts
 * const target = { lat: 40.7128, lng: -74.006 }; // NYC
 * const cities = [
 *   { name: 'London', lat: 51.5074, lng: -0.1278 },
 *   { name: 'Philadelphia', lat: 39.9526, lng: -75.1652 },
 *   { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
 * ];
 *
 * const closest = closestCoordinate(target, cities, 'km');
 * // { coordinate: { name: 'Philadelphia', ... }, distance: ~129.6, index: 1 }
 * ```
 */
export function closestCoordinate<T extends CoordinateInput = CoordinateInput>(
	target: CoordinateInput | [number, number] | string | any,
	candidates: readonly T[],
	unit: DistanceUnit = 'km',
): ClosestCoordinateResult<T> | null {
	if (!extractRawCoords(target) || !Array.isArray(candidates) || candidates.length === 0)
		return null;

	let minDistance = Infinity;
	let minIndex = -1;
	let minCandidate: T | undefined;

	for (let i = 0; i < candidates.length; i++) {
		const candidate = candidates[i]!;
		const dist = haversineDistance(target, candidate, unit);
		if (isNumber(dist) && dist < minDistance) {
			minDistance = dist;
			minIndex = i;
			minCandidate = candidate;
		}
	}

	if (minIndex === -1 || !isDefined(minCandidate))
		return null;

	return {
		coordinate: minCandidate,
		distance: minDistance,
		index: minIndex,
	};
}

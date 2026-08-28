import { getOffsets } from './getOffsets.js';

export type Hemisphere = 'N' | 'S' | 'E';

/**
 * Determines the hemisphere for a given timezone based on DST offset patterns.
 * Returns 'N' for northern hemisphere, 'S' for southern hemisphere, or 'E' for equatorial regions.
 *
 * @param timeZone - The IANA timezone identifier (defaults to system timezone)
 * @returns The hemisphere identifier ('N', 'S', or 'E'), or undefined if detection fails
 * @example
 * ```ts
 * const hemisphere = getHemisphere('America/New_York'); // 'N'
 * const hemisphere = getHemisphere('Australia/Sydney'); // 'S'
 * ```
 */
export function getHemisphere(timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): Hemisphere | undefined {
	try {
		const { jan, jul } = getOffsets(timeZone);							// using default reference-year (2024) for stability
		
		const southPrefixes = ['Australia', 'Antarctica', 'Africa/Johannesburg', 'America/Buenos_Aires', 'America/Sao_Paulo'];
		const isSouthZone = southPrefixes.some(p => timeZone.startsWith(p));

		if (jan === jul) return isSouthZone ? 'S' : 'E';
		return (jan < jul) ? 'N' : 'S';
	} catch {
		return undefined;
	}
}

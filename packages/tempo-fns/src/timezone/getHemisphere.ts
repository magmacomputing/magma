import { getOffsets } from './getOffsets.js';

export type Hemisphere = 'N' | 'S' | 'E';

/** returns the hemisphere ('N'/'S' or 'E' for equator) for a given timezone */
export function getHemisphere(timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): Hemisphere {
	try {
		const { jan, jul } = getOffsets(timeZone);							// using default reference-year (2024) for stability
		if (jan === jul) return 'E';
		return (jan < jul) ? 'S' : 'N';
	} catch {
		return 'N';																									// Fallback for invalid timezones
	}
}

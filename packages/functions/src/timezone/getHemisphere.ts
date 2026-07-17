import { getOffsets } from './getOffsets.js';

export type Hemisphere = 'N' | 'S' | 'E';

/** returns the hemisphere ('N'/'S' or 'E' for equator) for a given timezone */
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

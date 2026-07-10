import type { Tempo } from '@magmacomputing/tempo';

/**
 * Checks if two dates fall in the same Fiscal Quarter.
 * This function inherently requires the Tempo Terms engine.
 */
export const isSameFiscalQuarter = (date1: Tempo, date2: Tempo): boolean => {
	const q1 = date1.term.quarter;
	const q2 = date2.term.quarter;

	if (!q1 || !q2)
		throw new Error("QuarterTerm plugin must be loaded to calculate fiscal quarters.");

	// Compare the exact start timestamps to ensure they are the exact same quarter in the same year
	return q1.start.epoch.ns === q2.start.epoch.ns;
}

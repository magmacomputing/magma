import type { Tempo } from '@magmacomputing/tempo';
import { isTempo } from '../support/index.js';

/**
 * Checks if two dates fall in the same Fiscal Quarter.
 * Prioritizes FiscalTerm if loaded, falling back to QuarterTerm.
 */
export const isSameFiscalQuarter = (date1: Tempo, date2: Tempo): boolean => {
	if (!isTempo(date1) || !isTempo(date2))
		throw new TypeError("isSameFiscalQuarter requires Tempo instances.");

	const f1 = (date1.term as any).fiscal;
	const f2 = (date2.term as any).fiscal;
	if (Boolean(f1) !== Boolean(f2))
		throw new Error("FiscalTerm resolved for only one date; configure fiscal options for both dates.");
	if (f1 && f2)
		return f1.key === f2.key && f1.fiscalYear === f2.fiscalYear && f1.span.start.format('{yyyy}-{mm}-{dd}') === f2.span.start.format('{yyyy}-{mm}-{dd}');

	const q1 = date1.term.quarter;
	const q2 = date2.term.quarter;

	if (!q1 || !q2)
		throw new Error("QuarterTerm or FiscalTerm plugin must be loaded to calculate fiscal quarters.");

	// Compare the calendar dates of the start boundaries to handle differing time zones cleanly
	return q1.span.start.format('{yyyy}-{mm}-{dd}') === q2.span.start.format('{yyyy}-{mm}-{dd}');
}

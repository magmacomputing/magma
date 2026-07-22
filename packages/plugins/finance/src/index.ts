import { defineNamespace, type TempoPlugin } from '@magmacomputing/tempo/plugin';
import type { Tempo } from '@magmacomputing/tempo';

// -----------------------------------------------------------------------------
// 🌲 FUNCTIONAL PARADIGM (Tree-Shakeable)
// Exporting pure functions allows users to import exactly what they need 
// without incurring the overhead of the full Object-Oriented engine.
// -----------------------------------------------------------------------------
/**
 * Calculates the standard fiscal quarter for a given Tempo instance (1-4).
 * 
 * @param tempo - The Tempo instance to evaluate
 * @returns The fiscal quarter number (1, 2, 3, or 4)
 */
export const fiscalQuarter = (tempo: Tempo) => Math.floor((tempo.mm - 1) / 3) + 1;
/**
 * Extracts the tax year for a given Tempo instance.
 * Currently defaults to the calendar year (yy).
 * 
 * @param tempo - The Tempo instance to evaluate
 * @returns The tax year
 */
export const taxYear = (tempo: Tempo) => tempo.yy;
/**
 * Creates a predicate function that determines if the given Tempo instance falls on the start of a fiscal year (Jan 1st).
 * 
 * @param tempo - The Tempo instance to evaluate
 * @returns A boolean predicate function
 */
export const isFiscalYearStart = (tempo: Tempo) => () => tempo.mm === 1 && tempo.dd === 1;

// -----------------------------------------------------------------------------
// 🏗️ OOP PARADIGM (Fluent API)
// Wrap the functions in a Namespace Plugin so they can be injected directly 
// onto the Tempo instance (e.g., `t.finance.taxYear`) for a fluent experience.
// -----------------------------------------------------------------------------
/**
 * The Finance Plugin Namespace.
 * Exposes financial utilities directly on the Tempo instance via the `.finance` property.
 */
export const FinanceNamespace: TempoPlugin = defineNamespace({
	name: 'finance',
	resolvers: {
		fiscalQuarter,
		taxYear,
		isFiscalYearStart
	}
});

declare module '@magmacomputing/tempo' {
	interface Tempo {
		finance: {
			fiscalQuarter: number;
			taxYear: number;
			isFiscalYearStart: () => boolean;
		}
	}
}

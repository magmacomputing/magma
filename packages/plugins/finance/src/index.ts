import { defineNamespace } from '@magmacomputing/tempo/plugin';
import type { Tempo } from '@magmacomputing/tempo';

// -----------------------------------------------------------------------------
// 🌲 FUNCTIONAL PARADIGM (Tree-Shakeable)
// Exporting pure functions allows users to import exactly what they need 
// without incurring the overhead of the full Object-Oriented engine.
// -----------------------------------------------------------------------------
export const fiscalQuarter = (tempo: Tempo) => Math.floor((tempo.mm - 1) / 3) + 1;
export const taxYear = (tempo: Tempo) => tempo.yy;
export const isFiscalYearStart = (tempo: Tempo) => () => tempo.mm === 1 && tempo.dd === 1;

// -----------------------------------------------------------------------------
// 🏗️ OOP PARADIGM (Fluent API)
// Wrap the functions in a Namespace Plugin so they can be injected directly 
// onto the Tempo instance (e.g., `t.finance.taxYear`) for a fluent experience.
// -----------------------------------------------------------------------------
export const FinancePlugin = defineNamespace({
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

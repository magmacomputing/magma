import type { Temporal as TemporalType } from '@js-temporal/polyfill';
export type { TemporalType as Temporal };

/**
 * Resolves the native Temporal API from the global scope at runtime.
 * This guarantees that functions does not accidentally bundle the polyfill, 
 * while maintaining full type safety.
 */
export const getTemporal = (): typeof TemporalType => {
	// @ts-expect-error - Check for global Temporal
	if (typeof Temporal !== 'undefined') return Temporal;

	if (typeof globalThis !== 'undefined' && 'Temporal' in globalThis)
		return (globalThis as any).Temporal;

	throw new Error("[functions] Temporal API is not available in the global scope. Ensure a polyfill is loaded.");
}

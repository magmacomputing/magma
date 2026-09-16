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

/**
 * Unwraps a Tempo instance to its underlying Temporal.ZonedDateTime object,
 * or returns the input directly if it is already a native Temporal object or duck-typed entity.
 *
 * @param input - A Tempo instance, native Temporal object, or duck-typed entity
 * @returns The underlying Temporal object or original input
 */
export function unwrapTemporal<T>(input: T): T extends { readonly zdt: infer U } ? U : T;
export function unwrapTemporal(input: any): any {
	return input != null && typeof input === 'object' && 'zdt' in input ? input.zdt : input;
}

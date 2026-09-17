import { unwrapTemporal } from '../support/index.js';
import type { Tempo } from '@magmacomputing/tempo';

// Minimal duck-typing interface for Temporal objects
interface TemporalLike {
	day: number;
}

/**
 * Determines if the given date falls on the first day of the month.
 * Works with any Tempo or Temporal-like object that exposes a `.day` property (or `.zdt.day`).
 *
 * @param input - The date object to check
 * @returns `true` if the date is the first day of the month, `false` otherwise
 * @example
 * ```ts
 * const isFirst = isFirstDayOfMonth(Temporal.PlainDate.from('2024-01-01')); // true
 * const isFirst = isFirstDayOfMonth(new Tempo('2024-01-15')); // false
 * ```
 */
export const isFirstDayOfMonth = (input: TemporalLike | Tempo): boolean => {
	// Unwraps Tempo instances to their underlying Temporal.ZonedDateTime,
	// maintaining native Temporal duck-typing compatibility without relying on deprecated getters.
	const target = unwrapTemporal(input);
	return target.day === 1;
};


import type { Tempo } from '@magmacomputing/tempo';

// Minimal duck-typing interface for Temporal objects
interface TemporalLike {
	day: number;
}

/**
 * Determines if the given date falls on the first day of the month.
 * Works with any Tempo or Temporal-like object that exposes a `.day` property.
 *
 * @param input - The date object to check
 * @returns `true` if the date is the first day of the month, `false` otherwise
 * @example
 * ```ts
 * const isFirst = isFirstDayOfMonth(Temporal.PlainDate.from('2024-01-01')); // true
 * const isFirst = isFirstDayOfMonth(Temporal.PlainDate.from('2024-01-15')); // false
 * ```
 */
export const isFirstDayOfMonth = (input: TemporalLike | Tempo): boolean => {
	// Tempo exposes `.day` directly, making it natively compatible 
	// with Temporal's duck-typing!
	return input.day === 1;
};

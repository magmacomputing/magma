/**
 * Normalizes fractional duration values by converting them to smaller units.
 * Temporal API rejects fractional values, so this function converts them downwards.
 * For example, `{ seconds: 0.1 }` becomes `{ milliseconds: 100 }`.
 * Mutates the provided duration object in place.
 *
 * @param payload - The duration object to normalize
 * @returns The mutated duration object with normalized fractional values
 * @example
 * ```ts
 * const duration = { hours: 1.5, seconds: 2.5 };
 * normaliseFractionalDurations(duration);
 * // duration is now { hours: 1, minutes: 30, seconds: 2, milliseconds: 500 }
 * ```
 */
export function normaliseFractionalDurations(payload: Record<string, any>) {
	const SCALE: [string, string, number][] = [
		['hours', 'minutes', 60],
		['minutes', 'seconds', 60],
		['seconds', 'milliseconds', 1_000],
		['milliseconds', 'microseconds', 1_000],
		['microseconds', 'nanoseconds', 1_000],
	]

	for (const [big, small, factor] of SCALE) {
		const v = payload[big];

		if (typeof v === 'number' && !Number.isNaN(v) && v !== Math.trunc(v)) {
			const whole = Math.trunc(v);
			const frac = v - whole;
			if (whole) payload[big] = whole; else delete payload[big];
			const addition = small === 'nanoseconds' ? Math.round(frac * factor) : (frac * factor);
			payload[small] = (payload[small] ?? 0) + addition;
		}
	}

	return payload;
}

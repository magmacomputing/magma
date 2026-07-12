/**
 * Temporal rejects fractional Duration values, so normalise 
 * fractional parts downwards, e.g. { seconds: 0.1 } → { milliseconds: 100 }.
 * Mutates the provided duration object.
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
			payload[small] = (payload[small] ?? 0) + Math.round(frac * factor);
		}
	}

	return payload;
}

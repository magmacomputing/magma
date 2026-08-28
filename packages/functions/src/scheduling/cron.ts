import type { Tempo } from '@magmacomputing/tempo';

type CronField = { allowed: Set<number>; restricted: boolean };

interface CronSchedule {
	minutes: CronField;
	hours: CronField;
	daysOfMonth: CronField;
	months: CronField;
	daysOfWeek: CronField;
}

/**
 * Parses a single cron field (e.g., minutes, hours) into a set of allowed values.
 * Supports wildcards, ranges, steps, and lists.
 *
 * @param field - The cron field string to parse
 * @param min - The minimum valid value for this field
 * @param max - The maximum valid value for this field
 * @returns A CronField object containing the allowed values and restriction status
 * @throws {Error} If the field contains invalid syntax
 * @internal
 */
function parseCronField(field: string, min: number, max: number): CronField {
	const allowed = new Set<number>();
	if (field === '*' || field === '?') {
		for (let i = min; i <= max; i++) allowed.add(i);
		return { allowed, restricted: false };
	}

	const parts = field.split(',');
	for (const part of parts) {
		if (part.includes('/')) {
			const [range, stepStr] = part.split('/');
			const step = parseInt(stepStr, 10);
			if (isNaN(step) || step <= 0)
				throw new Error(`[tempo-fns] Invalid step value: ${stepStr}`);

			let start = min;
			let end = max;
			if (range !== '*') {
				const rangeParts = range.split('-');
				start = parseInt(rangeParts[0], 10);
				end = rangeParts.length > 1 ? parseInt(rangeParts[1], 10) : start;
				if (start > end)
					throw new Error(`[tempo-fns] Invalid range: ${range}`);

			}
			for (let i = start; i <= end; i += step) {
				allowed.add(i);
			}
		} else if (part.includes('-')) {
			const [start, end] = part.split('-').map(Number);
			if (start > end)
				throw new Error(`[tempo-fns] Invalid range: ${part}`);

			for (let i = start; i <= end; i++)
				allowed.add(i);
		} else {
			allowed.add(parseInt(part, 10));
		}
	}
	return { allowed, restricted: true };
}

/**
 * Parses a 5-field cron pattern into a schedule object.
 * Supports standard cron syntax with minute, hour, day-of-month, month, and day-of-week.
 *
 * @param pattern - The cron pattern string (e.g., "0 9 * * 1-5")
 * @returns A CronSchedule object containing parsed field constraints
 * @throws {Error} If the pattern does not have exactly 5 fields
 * @example
 * ```ts
 * const schedule = parseCron('0 9 * * 1-5'); // 9 AM on weekdays
 * ```
 */
export function parseCron(pattern: string): CronSchedule {
	const fields = pattern.trim().split(/\s+/);
	if (fields.length !== 5) {
		throw new Error('[tempo-fns] Invalid cron pattern. Expected 5 fields (min, hr, dom, mon, dow).');
	}

	return {
		minutes: parseCronField(fields[0], 0, 59),
		hours: parseCronField(fields[1], 0, 23),
		daysOfMonth: parseCronField(fields[2], 1, 31),
		months: parseCronField(fields[3], 1, 12),
		daysOfWeek: parseCronField(fields[4], 0, 7) // 0 and 7 can both be Sunday
	};
}

/**
 * Determines if a given date matches the day constraints in a cron schedule.
 * Handles the logical OR between day-of-month and day-of-week when both are restricted.
 *
 * @param schedule - The parsed cron schedule
 * @param current - The date to test against the schedule
 * @returns `true` if the date matches the day constraints
 * @internal
 */
function matchesDay(schedule: CronSchedule, current: Temporal.ZonedDateTime): boolean {
	const domMatch = schedule.daysOfMonth.allowed.has(current.day);
	const dow = current.dayOfWeek;
	const dowMatch = schedule.daysOfWeek.allowed.has(dow) || (dow === 7 && schedule.daysOfWeek.allowed.has(0));

	if (schedule.daysOfMonth.restricted && schedule.daysOfWeek.restricted) {
		return domMatch || dowMatch;
	}
	return domMatch && dowMatch;
}

/**
 * Returns the next occurrence of a cron pattern, starting from (and excluding) the current minute.
 * Searches up to 5 years into the future.
 *
 * @param tempo - The starting Tempo instance
 * @param pattern - The 5-field cron pattern (e.g., "0 9 * * 1-5")
 * @returns A new Tempo instance representing the next scheduled occurrence
 * @throws {Error} If no match is found within 5 years
 * @example
 * ```ts
 * const next = nextCron(tempo, '0 9 * * 1'); // Next Monday at 9:00 AM
 * ```
 */
export function nextCron(tempo: Tempo, pattern: string): Tempo {
	const schedule = parseCron(pattern);
	// Start searching from the next minute, operating directly on Temporal.ZonedDateTime for performance
	let current = tempo.toDateTime().add({ minutes: 1 }).with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });

	const maxLimit = current.add({ years: 5 }).epochNanoseconds;
	for (;;) { // Max iterations to prevent infinite loops (5 years max approx)
		if (current.epochNanoseconds > maxLimit) throw new Error('[tempo-fns] Could not find next cron match within 5 years.');
		if (!schedule.months.allowed.has(current.month)) {
			current = current.add({ months: 1 }).with({ day: 1, hour: 0, minute: 0 });
			continue;
		}

		if (!matchesDay(schedule, current)) {
			current = current.add({ days: 1 }).with({ hour: 0, minute: 0 });
			continue;
		}

		if (!schedule.hours.allowed.has(current.hour)) {
			current = current.add({ hours: 1 }).with({ minute: 0 });
			continue;
		}

		if (!schedule.minutes.allowed.has(current.minute)) {
			current = current.add({ minutes: 1 });
			continue;
		}

		return tempo.set(current);
	}
}

/**
 * Returns the previous occurrence of a cron pattern, starting from (and excluding) the current minute.
 * Searches up to 5 years into the past.
 *
 * @param tempo - The starting Tempo instance
 * @param pattern - The 5-field cron pattern (e.g., "0 9 * * 1-5")
 * @returns A new Tempo instance representing the previous scheduled occurrence
 * @throws {Error} If no match is found within 5 years
 * @example
 * ```ts
 * const prev = prevCron(tempo, '0 9 * * 1'); // Previous Monday at 9:00 AM
 * ```
 */
export function prevCron(tempo: Tempo, pattern: string): Tempo {
	const schedule = parseCron(pattern);
	// Start searching from the previous minute
	let current = tempo.toDateTime().subtract({ minutes: 1 }).with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });

	const minLimit = current.subtract({ years: 5 }).epochNanoseconds;
	for (;;) {
		if (current.epochNanoseconds < minLimit) throw new Error('[tempo-fns] Could not find previous cron match within 5 years.');
		if (!schedule.months.allowed.has(current.month)) {
			current = current.subtract({ months: 1 });
			current = current.with({ day: current.daysInMonth, hour: 23, minute: 59 });
			continue;
		}

		if (!matchesDay(schedule, current)) {
			current = current.subtract({ days: 1 }).with({ hour: 23, minute: 59 });
			continue;
		}

		if (!schedule.hours.allowed.has(current.hour)) {
			current = current.subtract({ hours: 1 }).with({ minute: 59 });
			continue;
		}

		if (!schedule.minutes.allowed.has(current.minute)) {
			current = current.subtract({ minutes: 1 });
			continue;
		}

		return tempo.set(current);
	}
}

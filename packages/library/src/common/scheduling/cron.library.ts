import '#library/temporal.polyfill.js';
import { isString } from '#library/assertion.library.js';

/**
 * Represents a single parsed cron field with its allowed values and restriction status.
 */
export interface CronField {
	allowed: Set<number>;
	restricted: boolean;
}

/**
 * Represents a fully parsed cron schedule with all five time fields.
 */
export interface CronSchedule {
	minutes: CronField;
	hours: CronField;
	daysOfMonth: CronField;
	months: CronField;
	daysOfWeek: CronField;
}

/**
 * Parses and validates a numeric cron token string.
 * @param token - The token string to parse
 * @param min - The minimum allowed value
 * @param max - The maximum allowed value
 * @returns The parsed integer
 * @throws Error if the token is invalid or out of range
 * @internal
 */
function parseStrictInt(token: string, min: number, max: number): number {
	const trimmed = token.trim();
	if (!/^\d+$/.test(trimmed))
		throw new Error(`Invalid numeric cron token: "${token}"`);

	const num = Number(trimmed);
	if (num < min || num > max)
		throw new Error(`Cron token out of range [${min}-${max}]: "${token}"`);

	return num;
}

/**
 * Parses a single cron field into a CronField object.
 * Supports wildcards, ranges, steps, and comma-separated lists.
 * @param field - The cron field string to parse
 * @param min - The minimum allowed value for this field
 * @param max - The maximum allowed value for this field
 * @returns A CronField object containing the allowed values and restriction status
 * @throws Error if the field syntax is invalid
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
			const slashParts = part.split('/');
			if (slashParts.length !== 2)
				throw new Error(`Invalid step expression: ${part}`);
			const [range, stepStr] = slashParts;
			if (!/^\d+$/.test(stepStr.trim()))
				throw new Error(`Invalid step value: ${stepStr}`);

			const step = Number(stepStr.trim());
			if (step <= 0)
				throw new Error(`Invalid step value: ${stepStr}`);

			let start = min;
			let end = max;
			if (range !== '*') {
				if (range.includes('-')) {
					const rangeParts = range.split('-');
					if (rangeParts.length !== 2) throw new Error(`Invalid range: ${range}`);
					start = parseStrictInt(rangeParts[0], min, max);
					end = parseStrictInt(rangeParts[1], min, max);
					if (start > end) throw new Error(`Invalid range: ${range}`);
				} else {
					throw new Error(`Invalid step expression range: "${range}/${stepStr}"`);
				}
			}
			for (let i = start; i <= end; i += step)
				allowed.add(i);
		} else if (part.includes('-')) {
			const rangeParts = part.split('-');
			if (rangeParts.length !== 2) throw new Error(`Invalid range: ${part}`);
			const start = parseStrictInt(rangeParts[0], min, max);
			const end = parseStrictInt(rangeParts[1], min, max);
			if (start > end) throw new Error(`Invalid range: ${part}`);

			for (let i = start; i <= end; i++)
				allowed.add(i);
		} else
			allowed.add(parseStrictInt(part, min, max));
	}

	return { allowed, restricted: true };
}

/**
 * Parses a standard 5-field cron pattern into a structured CronSchedule object.
 *
 * @param pattern - The cron pattern string (e.g., "0 12 * * 1-5")
 * @returns A CronSchedule object with parsed fields
 * @throws Error if the pattern is invalid or malformed
 */
export function parseCron(pattern: string): CronSchedule {
	const fields = pattern.trim().split(/\s+/);
	if (fields.length !== 5)
		throw new Error('Invalid cron pattern. Expected 5 fields (min, hr, dom, mon, dow).');

	return {
		minutes: parseCronField(fields[0], 0, 59),
		hours: parseCronField(fields[1], 0, 23),
		daysOfMonth: parseCronField(fields[2], 1, 31),
		months: parseCronField(fields[3], 1, 12),
		daysOfWeek: parseCronField(fields[4], 0, 7)
	}
}

/**
 * Type guard to check if a value is a valid cron pattern string.
 *
 * @param val - The value to check
 * @returns True if the value is a valid cron pattern string
 */
export function isCronString(val: unknown): val is string {
	if (!isString(val)) return false;
	const trimmed = val.trim();
	if (trimmed.startsWith('FREQ=') || trimmed.startsWith('RRULE:')) return false;
	const fields = trimmed.split(/\s+/);
	if (fields.length !== 5) return false;
	try {
		parseCron(trimmed);
		return true;
	} catch {
		return false;
	}
}

function matchesDay(schedule: CronSchedule, day: number, dow: number): boolean {
	const domMatch = schedule.daysOfMonth.allowed.has(day);
	const dowMatch = schedule.daysOfWeek.allowed.has(dow) || (dow === 7 && schedule.daysOfWeek.allowed.has(0));

	return (schedule.daysOfMonth.restricted && schedule.daysOfWeek.restricted)
		? domMatch || dowMatch
		: domMatch && dowMatch
}

function searchCronEpoch(pattern: string, anchorMs: number, timeZone: string, direction: 1 | -1): number {
	const schedule = parseCron(pattern);
	const zdt = Temporal.Instant.fromEpochMilliseconds(anchorMs).toZonedDateTimeISO(timeZone);
	const forward = direction === 1;

	const isAligned = zdt.second === 0 && zdt.millisecond === 0 && zdt.microsecond === 0 && zdt.nanosecond === 0;

	let current = forward
		? zdt.add({ minutes: 1 }).with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 })
		: (isAligned
			? zdt.subtract({ minutes: 1 }).with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 })
			: zdt.with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 }));

	const limitMs = forward
		? current.add({ years: 5 }).epochMilliseconds
		: current.subtract({ years: 5 }).epochMilliseconds;

	const errMessage = forward
		? 'Could not find next cron match within 5 years.'
		: 'Could not find previous cron match within 5 years.';

	for (; ;) {
		if (forward ? current.epochMilliseconds > limitMs : current.epochMilliseconds < limitMs)
			throw new Error(errMessage);

		if (!schedule.months.allowed.has(current.month)) {
			if (forward) {
				current = current.add({ months: 1 }).with({ day: 1, hour: 0, minute: 0 });
			} else {
				const prevMonth = current.subtract({ months: 1 });
				current = prevMonth.with({ day: prevMonth.daysInMonth, hour: 23, minute: 59 });
			}
			continue;
		}

		if (!matchesDay(schedule, current.day, current.dayOfWeek)) {
			current = forward
				? current.add({ days: 1 }).with({ hour: 0, minute: 0 })
				: current.subtract({ days: 1 }).with({ hour: 23, minute: 59 });
			continue;
		}

		if (!schedule.hours.allowed.has(current.hour)) {
			current = forward
				? current.add({ hours: 1 }).with({ minute: 0 })
				: current.subtract({ hours: 1 }).with({ minute: 59 });
			continue;
		}

		if (!schedule.minutes.allowed.has(current.minute)) {
			current = forward
				? current.add({ minutes: 1 })
				: current.subtract({ minutes: 1 });
			continue;
		}

		return current.epochMilliseconds;
	}
}

/**
 * Calculates the next occurrence of a cron schedule after the given anchor time.
 *
 * @param pattern - The cron pattern string
 * @param anchorMs - The anchor time in milliseconds since epoch
 * @param timeZone - The time zone to use for calculations (default: 'UTC')
 * @returns The next occurrence time in milliseconds since epoch
 */
export function getNextCronEpoch(pattern: string, anchorMs: number, timeZone = 'UTC'): number {
	return searchCronEpoch(pattern, anchorMs, timeZone, 1);
}

/**
 * Calculates the previous occurrence of a cron schedule before the given anchor time.
 *
 * @param pattern - The cron pattern string
 * @param anchorMs - The anchor time in milliseconds since epoch
 * @param timeZone - The time zone to use for calculations (default: 'UTC')
 * @returns The previous occurrence time in milliseconds since epoch
 */
export function getPrevCronEpoch(pattern: string, anchorMs: number, timeZone = 'UTC'): number {
	return searchCronEpoch(pattern, anchorMs, timeZone, -1);
}

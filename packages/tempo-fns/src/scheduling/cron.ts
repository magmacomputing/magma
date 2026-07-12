import type { Tempo } from '@magmacomputing/tempo';

type CronField = { allowed: Set<number>; restricted: boolean };

interface CronSchedule {
	minutes: CronField;
	hours: CronField;
	daysOfMonth: CronField;
	months: CronField;
	daysOfWeek: CronField;
}

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
			let start = min;
			let end = max;
			if (range !== '*') {
				const rangeParts = range.split('-');
				start = parseInt(rangeParts[0], 10);
				end = rangeParts.length > 1 ? parseInt(rangeParts[1], 10) : start;
			}
			for (let i = start; i <= end; i += step) {
				allowed.add(i);
			}
		} else if (part.includes('-')) {
			const [start, end] = part.split('-').map(Number);
			for (let i = start; i <= end; i++) {
				allowed.add(i);
			}
		} else {
			allowed.add(parseInt(part, 10));
		}
	}
	return { allowed, restricted: true };
}

export function parseCron(pattern: string): CronSchedule {
	const fields = pattern.trim().split(/\s+/);
	if (fields.length !== 5) {
		throw new Error('[Tempo-Fns] Invalid cron pattern. Expected 5 fields (min, hr, dom, mon, dow).');
	}

	return {
		minutes: parseCronField(fields[0], 0, 59),
		hours: parseCronField(fields[1], 0, 23),
		daysOfMonth: parseCronField(fields[2], 1, 31),
		months: parseCronField(fields[3], 1, 12),
		daysOfWeek: parseCronField(fields[4], 0, 7) // 0 and 7 can both be Sunday
	};
}

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
 * Returns the next occurrence of a Cron pattern, starting from (and excluding) the current minute.
 */
export function nextCron(tempo: Tempo, pattern: string): Tempo {
	const schedule = parseCron(pattern);
	// Start searching from the next minute, operating directly on Temporal.ZonedDateTime for performance
	let current = tempo.toDateTime().add({ minutes: 1 }).with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });

	for (let i = 0; i < 5 * 366; i++) { // Max iterations to prevent infinite loops (5 years max approx)
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

	throw new Error('[Tempo-Fns] Could not find next cron match within 5 years.');
}

/**
 * Returns the previous occurrence of a Cron pattern, starting from (and excluding) the current minute.
 */
export function prevCron(tempo: Tempo, pattern: string): Tempo {
	const schedule = parseCron(pattern);
	// Start searching from the previous minute
	let current = tempo.toDateTime().subtract({ minutes: 1 }).with({ second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 });

	for (let i = 0; i < 5 * 366; i++) {
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

	throw new Error('[Tempo-Fns] Could not find previous cron match within 5 years.');
}

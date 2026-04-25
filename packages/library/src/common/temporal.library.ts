/**
 * Temporal Cookbook  
 * (using 'Temporal' namespace object)
*/

import '#library/temporal.polyfill.js';											// ensure Temporal is available
import { isNumber, isString } from '#library/assertion.library.js';

/** return the current Temporal.Now.instant */
export function instant() {
	return Temporal.Now.instant();
}

/** return the current Temporal.Now.plainDateISO */
export function today(timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	return Temporal.Now.plainDateISO(timeZone);
}

/** return the current Unix timestamp (seconds) */
export function unix() {
	return Math.trunc(instant().epochMilliseconds / 1_000);
}

/** return the current Unix timestamp (nanoseconds) */
export function epoch() {
	return instant().epochNanoseconds;
}

/** return the January and July offsets (nanoseconds) for a given timezone and year */
export function getOffsets(timeZone: string, year = 2024) {	//** use a fixed reference-year (2024) for stability */
	const jan = Temporal.PlainDate.from({ year, month: 1, day: 1 }).toZonedDateTime(timeZone).offsetNanoseconds;
	const jul = Temporal.PlainDate.from({ year, month: 7, day: 1 }).toZonedDateTime(timeZone).offsetNanoseconds;

	return { jan, jul };
}

/** return whether the given (or current) date is in Daylight Savings */
export function isDST(date?: Temporal.ZonedDateTime | string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	const zdt = (typeof date === 'string')
		? Temporal.ZonedDateTime.from(date)
		: (date ?? instant().toZonedDateTimeISO(timeZone));
	const { jan, jul } = getOffsets(zdt.timeZoneId, zdt.year);

	return zdt.offsetNanoseconds !== Math.min(jan, jul);
}

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

		if (isNumber(v) && v !== Math.trunc(v)) {
			const whole = Math.trunc(v);
			const frac = v - whole;
			if (whole) payload[big] = whole; else delete payload[big];
			payload[small] = (payload[small] ?? 0) + Math.round(frac * factor);
		}
	}

	return payload;
}

// ── Temporal Factory Helpers ─────────────────────
// These centralise all runtime Temporal constructor
// access so that consuming modules never need to
// import a polyfill directly.
// ─────────────────────────────────────────────────

/**
 * ## toZonedDateTime
 * Create a `Temporal.ZonedDateTime` from a
 * property-bag (year, month, day, …, timeZone, calendar).
 */
export function toZonedDateTime(bag: Temporal.ZonedDateTimeLike & { timeZone: Temporal.TimeZoneLike, calendar?: Temporal.CalendarLike }): Temporal.ZonedDateTime {
	return Temporal.ZonedDateTime.from(bag);
}

/**
 * ## toPlainDate
 * Create a `Temporal.PlainDate` from a
 * property-bag or ISO string.
 */
export function toPlainDate(bag: Temporal.PlainDateLike | string): Temporal.PlainDate {
	return Temporal.PlainDate.from(bag);
}

/**
 * ## toInstant
 * Create a `Temporal.Instant` from epoch
 * nanoseconds (bigint).
 */
export function toInstant(epochNanoseconds: bigint): Temporal.Instant {
	return Temporal.Instant.fromEpochNanoseconds(epochNanoseconds);
}

/**
 * ## getTemporalIds
 * Normalize TimeZone and Calendar inputs into a [timeZoneId, calendarId] tuple.
 */
export function getTemporalIds(tz: any, cal: any): [string, string] {
	const rawTz = isString(tz) ? tz : ((tz as any)?.timeZoneId ?? (tz as any)?.id);
	const rawCal = isString(cal) ? cal : ((cal as any)?.calendarId ?? (cal as any)?.id);
	const fallbackTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
	const tzId = (isString(rawTz) && rawTz.trim().length > 0) ? rawTz : fallbackTz;
	const calId = (isString(rawCal) && rawCal.trim().length > 0) ? rawCal : 'iso8601';

	return [tzId || 'UTC', calId || 'iso8601'];
}

/**
 * ## normalizeUtcOffset
 * Convert informal UTC offset strings into the `±HH:MM` format required by Temporal.
 * Accepts forms like `'UTC+8'`, `'UTC-9'`, `'UTC+08:00'`, `'UTC-05:30'`.
 * Returns the input unchanged if it does not match the UTC± pattern.
 */
export function normalizeUtcOffset(zone: string): string {
	const match = /^UTC([+-])(\d{1,2})(?::(\d{2}))?$/i.exec(zone);
	if (!match) return zone;

	const [, sign, hours, minutes] = match;
	const h = Number(hours);
	const m = Number(minutes ?? '0');

	// Temporal-valid range: -12:00 .. +14:00, minutes 0..59
	if (h > 14 || m > 59 || (sign === '+' && h === 14 && m !== 0) || (sign === '-' && h > 12)) return zone;

	return `${sign}${hours.padStart(2, '0')}:${minutes ?? '00'}`;
}

/**
 * Temporal Cookbook  
 * (using 'Temporal' namespace object)
*/

import '#library/temporal.polyfill.js';											// ensure Temporal is available
import { isNumber, isObject, isString, isDefined, isZonedDateTime } from '#library/assertion.library.js';

/**
 * Returns the current instant in time using `Temporal.Now.instant()`.
 * 
 * @returns The current Temporal.Instant
 */
export function instant() {
	return Temporal.Now.instant();
}

/**
 * Returns the current plain date (ISO calendar) for the given timezone.
 * 
 * @param timeZone - The time zone to use (default: system local timezone)
 * @returns The current Temporal.PlainDate
 */
export function today(timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	return Temporal.Now.plainDateISO(timeZone);
}

/**
 * Returns the current Unix timestamp in seconds.
 * 
 * @returns The current Unix timestamp (seconds)
 */
export function unix() {
	return Math.trunc(instant().epochMilliseconds / 1_000);
}

/**
 * Returns the current Unix timestamp in nanoseconds.
 * 
 * @returns The current Unix timestamp (nanoseconds)
 */
export function epoch() {
	return instant().epochNanoseconds;
}

/** 
 * Returns the January and July offsets (in nanoseconds) for a given timezone and year.
 * Used for inferring daylight savings time and hemisphere characteristics.
 * 
 * @param timeZone - The IANA timezone string
 * @param year - The reference year to calculate offsets for (default: 2024 for stability)
 * @returns An object containing the `jan` and `jul` offsets
 */
export function getOffsets(timeZone: string, year = 2024) {	//** use a fixed reference-year (2024) for stability */
	const jan = Temporal.ZonedDateTime.from({ year, month: 1, day: 1, hour: 0, minute: 0, second: 0, timeZone }).offsetNanoseconds;
	const jul = Temporal.ZonedDateTime.from({ year, month: 7, day: 1, hour: 0, minute: 0, second: 0, timeZone }).offsetNanoseconds;

	return { jan, jul };
}

/** 
 * Determines whether the given (or current) date is observing Daylight Saving Time.
 * 
 * @param date - Optional ZonedDateTime or ISO string to check
 * @param timeZone - The timezone to use if creating a new date (default: system local)
 * @returns True if the date is in DST, false otherwise
 */
export function isDST(date?: Temporal.ZonedDateTime | string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	const zdt = isString(date)
		? toZonedDateTime(date, timeZone)
		: (date ?? instant().toZonedDateTimeISO(timeZone));
	const { jan, jul } = getOffsets(zdt.timeZoneId, zdt.year);

	return zdt.offsetNanoseconds !== Math.min(jan, jul);
}

/**
 * Normalizes fractional duration values downwards to smaller units.
 * Temporal rejects fractional Duration values (e.g., `{ seconds: 0.1 }`),
 * so this function converts them (e.g., to `{ milliseconds: 100 }`).
 * Mutates the provided duration object.
 * 
 * @param payload - The record object containing duration properties
 * @returns The mutated duration record
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

const RE_ISO_DATE_TIME_SPACE = /^(\d{4}-\d{2}-\d{2})\s+(?=\d{2}:\d{2})/;
const RE_SPACE_BEFORE_ZONE = /\s+(?=[Zz]|[+-]\d{2}|\[)/;
const RE_CALENDAR_BRACKET = /\[!?u-ca=[^\]]+\]/i;
const RE_TZ_BRACKET = /\[(?!!?u-ca=)[^\]]+\]/i;
const RE_OFFSET_SUFFIX = /Z$|[+-]\d{2}(:?\d{2})?$/i;
const RE_UTC_OFFSET = /^UTC([+-])(\d{1,2})(?::(\d{2}))?$/i;

/**
 * Creates a `Temporal.ZonedDateTime` from a property-bag or ISO string.
 * Automatically injects the specified timezone if missing from the string.
 * 
 * @param bag - The property bag or ISO string to convert
 * @param tz - The fallback timezone (default: 'UTC')
 * @returns The created Temporal.ZonedDateTime
 */
export function toZonedDateTime(bag: Temporal.ZonedDateTimeLike | string, tz: Temporal.TimeZoneLike = 'UTC'): Temporal.ZonedDateTime {
	if (!isString(bag))
		return Temporal.ZonedDateTime.from(bag);

	const str = bag
		.trim()
		.replace(RE_ISO_DATE_TIME_SPACE, '$1T')
		.replace(RE_SPACE_BEFORE_ZONE, '');

	if (RE_TZ_BRACKET.test(str))
		return Temporal.ZonedDateTime.from(str);

	if (RE_CALENDAR_BRACKET.test(str))
		return Temporal.ZonedDateTime.from(str.replace(RE_CALENDAR_BRACKET, `[${tz}]$&`));

	return (str.includes('T') && RE_OFFSET_SUFFIX.test(str))
		? Temporal.Instant.from(str).toZonedDateTimeISO(tz)
		: Temporal.ZonedDateTime.from(`${str}[${tz}]`);
}

/**
 * Creates a `Temporal.PlainDate` from a property-bag or ISO string.
 * 
 * @param bag - The property bag or ISO string to convert
 * @returns The created Temporal.PlainDate
 */
export function toPlainDate(bag: Temporal.PlainDateLike | string): Temporal.PlainDate {
	return Temporal.PlainDate.from(bag);
}

/**
 * Creates a `Temporal.Instant` from epoch nanoseconds.
 * 
 * @param epochNanoseconds - The bigint representing nanoseconds since the UNIX epoch
 * @returns The created Temporal.Instant
 */
export function toInstant(epochNanoseconds: bigint): Temporal.Instant {
	return Temporal.Instant.fromEpochNanoseconds(epochNanoseconds);
}

/**
 * Normalizes TimeZone and Calendar inputs into a `[timeZoneId, calendarId]` tuple.
 * Accepts either `(tz, cal)` strings or a single ZonedDateTime-like object.
 * Supports both spec-final (flat) and V8 harmony (nested) Temporal structures.
 * 
 * @param tzOrZdt - The TimeZone string, Calendar string, or ZonedDateTime object
 * @param cal - The optional Calendar string if `tzOrZdt` is a timezone
 * @returns A tuple of `[timeZoneId, calendarId]`
 */
export function getTemporalIds(tzOrZdt: Temporal.ZonedDateTime, cal?: Temporal.CalendarLike): [string, string];
export function getTemporalIds(tzOrZdt: Temporal.TimeZoneLike, cal?: Temporal.CalendarLike): [string, string];
export function getTemporalIds(tzOrZdt: any, cal?: any): [string, string] {
	const fallbackTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

	let rawTz: any, rawCal: any;
	if (isZonedDateTime(tzOrZdt)) {
		const raw = tzOrZdt as any;															// this is support the missing func. in v8harmony Temporal
		// If first arg is ZonedDateTime, use its IDs as source
		rawTz = raw.timeZoneId ?? raw.timeZone?.id ?? raw.timeZone;
		// If a second argument is provided, it explicitly overrides the ZonedDateTime's calendar
		rawCal = isDefined(cal) ? cal : (raw.calendarId ?? raw.calendar?.id ?? raw.calendar);
	} else {
		rawTz = tzOrZdt;
		rawCal = cal;
	}

	// Helper to extract string ID from potential objects (TimeZone, Calendar, or ZonedDateTime)
	const toId = (v: any): string => {
		if (isString(v)) return v;
		if (isZonedDateTime(v)) return toId((v as any).timeZoneId ?? (v as any).timeZone?.id ?? (v as any).timeZone);
		if (isObject(v)) return String((v as any).id ?? (v as any).timeZoneId ?? (v as any).calendarId ?? '');
		return String(v ?? '');
	}

	const tzStr = toId(rawTz);
	const calStr = toId(rawCal);

	const tzId = (tzStr.trim().length > 0 && tzStr !== '[object Object]' && tzStr !== 'undefined') ? tzStr : fallbackTz;
	const calId = (calStr.trim().length > 0 && calStr !== '[object Object]' && calStr !== 'undefined') ? calStr : 'iso8601';

	return [tzId, calId];
}

/**
 * Converts informal UTC offset strings into the `±HH:MM` format required by Temporal.
 * Accepts forms like `'UTC+8'`, `'UTC-9'`, `'UTC+08:00'`, `'UTC-05:30'`.
 * Returns the input unchanged if it does not match the UTC± pattern.
 * 
 * @param zone - The informal offset string
 * @returns The normalized offset string
 */
export function normalizeUtcOffset(zone: string): string {
	const match = RE_UTC_OFFSET.exec(zone);
	if (!match) return zone;

	const [, sign, hours, minutes] = match;
	const h = Number(hours);
	const m = Number(minutes ?? '0');

	// Temporal-valid range: -12:00 .. +14:00, minutes 0..59
	if (h > 14 || m > 59 || (sign === '+' && h === 14 && m !== 0) || (sign === '-' && h > 12)) return zone;

	return `${sign}${hours.padStart(2, '0')}:${minutes ?? '00'}`;
}

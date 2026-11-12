/**
 * Temporal Cookbook  
 * (using 'Temporal' namespace object)
*/

import '#library/temporal.polyfill.js';											// ensure Temporal is available
import { isFunction, isNumber, isObject, isString, isText, isNotNullish, isUndefined, isZonedDateTime } from '#library/assertion.library.js';
import { compare } from '#library/number.library.js';
import { hasKey } from '#library/primitive.library.js';
import { WeakCache } from '#library/weakcache.class.js';

const offsetCache = new Map<string, { jan: number; jul: number }>();

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
 * Gets the timezone offsets for January 1 and July 1 of a given year.
 *
 * @param timeZone - The IANA timezone identifier
 * @param year - The year for which to calculate the offsets; defaults to 2024
 * @returns An object containing January and July offsets in nanoseconds
 */
export function getOffsets(timeZone: string, year = 2024): Readonly<{ jan: number; jul: number }> {	//** use a fixed reference-year (2024) for stability */
	const key = `${timeZone}::${year}`;
	let offsets = offsetCache.get(key);

	if (isUndefined(offsets)) {
		const jan = Temporal.ZonedDateTime.from({ year, month: 1, day: 1, hour: 0, minute: 0, second: 0, timeZone }).offsetNanoseconds;
		const jul = Temporal.ZonedDateTime.from({ year, month: 7, day: 1, hour: 0, minute: 0, second: 0, timeZone }).offsetNanoseconds;
		offsets = Object.freeze({ jan, jul });
		offsetCache.set(key, offsets);
	}
	return offsets;
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

const zdtCache = new WeakCache<string, Temporal.ZonedDateTime>();
const plainDateCache = new WeakCache<string, Temporal.PlainDate>();

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

	const cacheKey = `${bag}::${tz}`;
	return zdtCache.getOrSet(cacheKey, () => {
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
	});
}

/**
 * Creates a `Temporal.PlainDate` from a property-bag or ISO string.
 * 
 * @param bag - The property bag or ISO string to convert
 * @returns The created Temporal.PlainDate
 */
export function toPlainDate(bag: Temporal.PlainDateLike | string): Temporal.PlainDate {
	return (isString(bag))
		? plainDateCache.getOrSet(bag, () => Temporal.PlainDate.from(bag))
		: Temporal.PlainDate.from(bag);
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
export function getTemporalIds(tzOrZdt?: Temporal.ZonedDateTime | Temporal.TimeZoneLike | unknown, cal?: Temporal.CalendarLike | unknown): [string, string] {
	const fallbackTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

	let rawTz: any, rawCal: any;
	if (isZonedDateTime(tzOrZdt)) {
		const raw = tzOrZdt as any;															// this is support the missing func. in v8harmony Temporal
		// If first arg is ZonedDateTime, use its IDs as source
		rawTz = raw.timeZoneId ?? raw.timeZone?.id ?? raw.timeZone;
		// If a second argument is provided, it explicitly overrides the ZonedDateTime's calendar
		rawCal = isNotNullish(cal) ? cal : (raw.calendarId ?? raw.calendar?.id ?? raw.calendar);
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

	const tzId = (isText(tzStr) && tzStr !== '[object Object]' && tzStr !== 'undefined') ? tzStr : fallbackTz;
	const calId = (isText(calStr) && calStr !== '[object Object]' && calStr !== 'undefined') ? calStr : 'iso8601';

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

/**
 * Resolves a two-digit year (0–99) into a four-digit year using a 100-year sliding window (century pivot).
 *
 * @param yy - The two-digit year (0–99). If >= 100, negative, or not finite, returned as-is.
 * @param pivot - Cutoff offset in years relative to the reference date (default: 75, covering [reference - 75, reference + 24]).
 * @param reference - Reference date, year, or ZonedDateTime to pivot against (default: current system date).
 * @returns The resolved 4-digit calendar year.
 */
export function resolveTwoDigitYear(
	yy: number,
	pivot: number = 75,
	reference?: Temporal.ZonedDateTime | Temporal.PlainDate | number
): number {
	if (yy >= 100 || yy < 0 || !Number.isFinite(yy)) return yy;
	const refYear = isNumber(reference)
		? reference
		: (reference ? reference.year : today().year);
	const minYear = refYear - pivot;

	let year = Math.floor(minYear / 100) * 100 + yy;
	if (year < minYear) year += 100;

	return year;
}

/**
 * Breakdown of subsecond fraction into millisecond, microsecond, and nanosecond integers.
 */
export interface SubsecondParts {
	millisecond: number;
	microsecond: number;
	nanosecond: number;
}

/**
 * Parses up to 9 digits of sub-second fractions into millisecond, microsecond, and nanosecond numbers.
 *
 * @param raw - The raw fractional seconds string (e.g. "123", "123456789")
 * @returns Object with millisecond, microsecond, and nanosecond components
 */
export function resolveFractionalSeconds(raw?: string): SubsecondParts {
	if (!raw) return { millisecond: 0, microsecond: 0, nanosecond: 0 };
	const padded = raw.padEnd(9, '0').slice(0, 9);

	return {
		millisecond: parseInt(padded.slice(0, 3), 10),
		microsecond: parseInt(padded.slice(3, 6), 10),
		nanosecond: parseInt(padded.slice(6, 9), 10),
	};
}

type ISOWeekInput = {
	year: number, month: number, day: number, dayOfWeek: number,
	weekOfYear?: number | undefined, yearOfWeek?: number | undefined
};
type ISOWeekResult = { weekOfYear: number, yearOfWeek: number };

/**
 * Polyfill fallback for ISO 8601 Week of Year and Year of Week calculations.
 *
 * Introduced because highly experimental native browser implementations of the Temporal API
 * (e.g., Chrome/Firefox behind flags) currently return `undefined` for `weekOfYear` and `yearOfWeek`
 * on ZonedDateTime objects. The TC39 spec moved toward calendar-dependent definitions,
 * causing divergence between the @js-temporal/polyfill (which returns numbers) and native browsers (which return undefined).
 *
 * @param zdt - The ZonedDateTime or matching input object
 * @returns An object containing the weekOfYear and yearOfWeek
 * @example
 * ```ts
 * const { weekOfYear } = getISOWeekOfYear(Temporal.Now.zonedDateTimeISO());
 * ```
 */
export function getISOWeekOfYear(zdt: ISOWeekInput): ISOWeekResult {
	const calId = (zdt as any).calendarId ?? (zdt as any).calendar?.id;
	if (calId === 'iso8601' && isNotNullish(zdt.weekOfYear) && isNotNullish(zdt.yearOfWeek))
		return { weekOfYear: zdt.weekOfYear, yearOfWeek: zdt.yearOfWeek };

	// Since Temporal.ZonedDateTime is passed in, we can safely extract the PlainDate
	// to avoid crossing daylight saving boundaries when adding/subtracting days.
	// Normalize to ISO 8601 calendar because properties like dayOfYear/dayOfWeek are calendar-dependent.
	const pd = (hasKey(zdt, 'toPlainDate', isFunction<Temporal.PlainDate>) ? zdt.toPlainDate() : Temporal.PlainDate.from(zdt)).withCalendar('iso8601');
	if (isNotNullish(pd.weekOfYear) && isNotNullish(pd.yearOfWeek))
		return { weekOfYear: pd.weekOfYear, yearOfWeek: pd.yearOfWeek };

	// ISO week date algorithm: weeks start on Monday, and the first week of the year contains the first Thursday.
	// Find the nearest Thursday to the current date.
	const shift = 4 - pd.dayOfWeek;
	const nearestThursday = shift >= 0 ? pd.add({ days: shift }) : pd.subtract({ days: -shift });

	// The calendar year of that nearest Thursday is the ISO week-numbering year
	const yearOfWeek = nearestThursday.year;

	// The week number is exactly the nearest Thursday's dayOfYear divided by 7
	const weekOfYear = Math.ceil(nearestThursday.dayOfYear / 7);

	return { weekOfYear, yearOfWeek };
}

/** Valid unit granularities accepted by `compareByUnit`. */
export type TemporalCompareUnit = Temporal.DateUnit | Temporal.TimeUnit | 'time';

/**
 * Compares two `Temporal.ZonedDateTime` instants at the specified calendar or time unit granularity.
 * The second value is projected into the first value's time zone and calendar before comparison.
 *
 * @param first - Reference zoned date-time (its time zone and calendar govern unit boundaries)
 * @param second - Target zoned date-time to compare against `first`
 * @param unit - Calendar/time unit or `'time'`
 * @returns `-1` if `first < second`, `0` if equal at that unit, or `1` if `first > second`
 */
export function compareByUnit(first: Temporal.ZonedDateTime, second: Temporal.ZonedDateTime, unit: TemporalCompareUnit): -1 | 0 | 1 {
	const z2 = second.withTimeZone(first.timeZoneId).withCalendar(first.calendarId);

	switch (unit) {
		case 'year':
			return compare(first.year, z2.year);
		case 'month':
			return compare(first.year, z2.year) || compare(first.month, z2.month);
		case 'week': {
			const w1 = getISOWeekOfYear(first);
			const w2 = getISOWeekOfYear(z2);
			return compare(w1.yearOfWeek, w2.yearOfWeek) || compare(w1.weekOfYear, w2.weekOfYear);
		}
		case 'day':
			return Temporal.PlainDate.compare(first.toPlainDate(), z2.toPlainDate()) as -1 | 0 | 1;
		case 'time':
			return Temporal.PlainTime.compare(first.toPlainTime(), z2.toPlainTime()) as -1 | 0 | 1;
		default: {
			// Sub-day units ('hour' .. 'nanosecond') truncate within Temporal.ZonedDateTime
			const r1 = first.round({ smallestUnit: unit as Temporal.TimeUnit, roundingMode: 'trunc' });
			const r2 = z2.round({ smallestUnit: unit as Temporal.TimeUnit, roundingMode: 'trunc' });
			return Temporal.ZonedDateTime.compare(r1, r2) as -1 | 0 | 1;
		}
	}
}



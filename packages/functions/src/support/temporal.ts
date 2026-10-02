import type { Temporal as TemporalType } from '@js-temporal/polyfill';
import { isObject, isNumber, isString, isDate, isTempo, isTemporal, isDefined, isFunction } from './assert.js';
export type { TemporalType as Temporal };

/**
 * Categorization of date inputs passed into tempo-fns functions.
 */
export type DateSourceType =
	| 'Tempo'
	| 'Temporal'
	| 'Date'
	| 'string'
	| 'number'
	| 'object'
	| 'unknown';

/**
 * Minimal duck-typing interface for Temporal, Tempo, and Date-like objects.
 */
export interface TemporalLikeDate {
	day?: number | undefined;
	daysInMonth?: number | undefined;
	month?: number | undefined;
	year?: number | undefined;
	dayOfWeek?: number | undefined;
	readonly zdt?: any;
}

/**
 * Universal date input supported across all tempo-fns functions.
 * Accepts Temporal objects, Tempo instances, JS Dates, ISO strings,
 * epoch timestamps, calendar year numbers, and duck-typed date entities.
 */
export type DateInput = TemporalLikeDate | Date | string | number;

/**
 * Normalized date parts extracted from a date input.
 */
export interface ResolvedDateParts {
	year?: number | undefined;
	month?: number | undefined;
	day?: number | undefined;
	dayOfWeek?: number | undefined;
	daysInMonth?: number | undefined;
	type: DateSourceType;
	target?: any;
}

/**
 * Regular expression matching ISO 8601 calendar date formats (YYYY-MM-DD, YYYY-MM, YYYY, or signed expanded +YYYYYY)
 * with strict lookahead boundaries to prevent partial backtracking on malformed input.
 * @internal
 */
export const ISO_CALENDAR_DATE_REGEX = /^(?:([+-]\d{4,6})|(\d{4}))(?:-(\d{2})(?:-(\d{2}))?)?(?=$|[T\s]|Z|[+-]\d{2}(?::?\d{2})?$)/;

/**
 * Fast Gregorian leap year check for a full calendar year number.
 * @internal
 */
export const isLeapYearNumber = (year: number): boolean =>
	(year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

/**
 * Resolves the native Temporal API from the global scope at runtime.
 * This guarantees that functions does not accidentally bundle the polyfill, 
 * while maintaining full type safety.
 */
export const getTemporal = (): typeof TemporalType => {
	if (typeof globalThis !== 'undefined' && 'Temporal' in globalThis)
		return (globalThis as any).Temporal;

	// @ts-ignore
	if (typeof Temporal !== 'undefined')
		return Temporal as any;

	throw new Error("[functions] Temporal API is not available in the global scope. Ensure a polyfill is loaded.");
};

/**
 * Unwraps a Tempo instance to its underlying Temporal.ZonedDateTime object,
 * or returns the input directly if it is already a native Temporal object or duck-typed entity.
 *
 * @param input - A Tempo instance, native Temporal object, or duck-typed entity
 * @returns The underlying Temporal object or original input
 */
export function unwrapTemporal<T>(input: T): T extends { readonly zdt: infer U } ? U : T;
export function unwrapTemporal(input: any): any {
	return isObject(input) && 'zdt' in input ? input.zdt : input;
}

/**
 * Extracts normalized date components and classifies the source type from any date-like input.
 * Supports Tempo instances, Temporal objects, JS Dates, ISO strings, timestamps, and duck-typed objects.
 *
 * @param input - Date representation to inspect
 * @returns Resolved date parts along with the detected source type and target
 */
export function extractDateParts(input: unknown): ResolvedDateParts {
	if (isObject(input)) {
		if (isDate(input)) {
			const d = input.getDay();
			return {
				year: input.getFullYear(),
				month: input.getMonth() + 1,
				day: input.getDate(),
				dayOfWeek: d === 0 ? 7 : d,
				type: 'Date',
				target: input,
			};
		}

		const isT = isTempo(input) || ('zdt' in input && !('day' in input && 'year' in input));
		const target: any = unwrapTemporal(input);
		const type: DateSourceType = isT
			? 'Tempo'
			: isTemporal(input) || isTemporal(target)
				? 'Temporal'
				: 'object';

		if (isDate(target)) {
			const d = target.getDay();
			return {
				year: target.getFullYear(),
				month: target.getMonth() + 1,
				day: target.getDate(),
				dayOfWeek: d === 0 ? 7 : d,
				type,
				target,
			};
		}

		return {
			year: isNumber(target?.year) ? target.year : undefined,
			month: isNumber(target?.month) ? target.month : undefined,
			day: isNumber(target?.day) ? target.day : undefined,
			dayOfWeek: isNumber(target?.dayOfWeek) ? target.dayOfWeek : undefined,
			daysInMonth: isNumber(target?.daysInMonth) ? target.daysInMonth : undefined,
			type,
			target,
		};
	}

	if (isString(input)) {
		const trimmed = input.trim();
		const match = trimmed.match(ISO_CALENDAR_DATE_REGEX);
		const yearStr = match ? (match[1] ?? match[2]) : undefined;
		if (match && yearStr) {
			const year = parseInt(yearStr, 10);
			const month = match[3] ? parseInt(match[3], 10) : undefined;
			const day = match[4] ? parseInt(match[4], 10) : undefined;

			// Validate month (1-12) and day bounds
			if (isDefined(month) && (month < 1 || month > 12))
				return { type: 'string', target: input };

			if (isDefined(month) && isDefined(day)) {
				const maxDays = (month === 2)
					? (isLeapYearNumber(year) ? 29 : 28)
					: [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]!;
				if (day < 1 || day > maxDays)
					return { type: 'string', target: input };
			}

			let dayOfWeek: number | undefined;
			if (isDefined(month) && isDefined(day)) {
				const dt = new Date(Date.UTC(2000, month - 1, day));
				dt.setUTCFullYear(year);
				const dow = dt.getUTCDay();
				dayOfWeek = dow === 0 ? 7 : dow;
			}

			return {
				year,
				month,
				day,
				dayOfWeek,
				type: 'string',
				target: input,
			};
		}

		const dt = new Date(trimmed);
		if (isDate(dt)) {
			const d = dt.getDay();
			return {
				year: dt.getFullYear(),
				month: dt.getMonth() + 1,
				day: dt.getDate(),
				dayOfWeek: d === 0 ? 7 : d,
				type: 'string',
				target: dt,
			};
		}

		return { type: 'string', target: input };
	}

	if (isNumber(input)) {
		// Distinguish 4-digit calendar year (e.g. 1..9999) from epoch timestamp
		if (input >= -999999 && input <= 9999 && Number.isInteger(input)) {
			return {
				year: input,
				type: 'number',
				target: input,
			};
		}

		const dt = new Date(input);
		if (isDate(dt)) {
			const d = dt.getDay();
			return {
				year: dt.getFullYear(),
				month: dt.getMonth() + 1,
				day: dt.getDate(),
				dayOfWeek: d === 0 ? 7 : d,
				type: 'number',
				target: dt,
			};
		}

		return {
			year: input,
			type: 'number',
			target: input,
		};
	}

	return { type: 'unknown', target: input };
}

/**
 * Coerces a universal DateInput into a native Temporal.ZonedDateTime.
 * Supports Tempo instances, Temporal objects (PlainDate, PlainDateTime, ZonedDateTime, Instant),
 * JS Date objects, ISO strings, and numeric epoch timestamps.
 *
 * @param date - Date representation to coerce
 * @param fallbackTz - IANA timezone identifier to use if input lacks timezone context (default: 'UTC')
 * @returns A native Temporal.ZonedDateTime instance
 */
export function coerceZonedDateTime(date: DateInput, fallbackTz = 'UTC'): TemporalType.ZonedDateTime {
	const Temporal = getTemporal();
	const unwrapped = unwrapTemporal(date);

	if (isObject(unwrapped)) {
		if ('timeZoneId' in (unwrapped as any))
			return unwrapped as TemporalType.ZonedDateTime;
		if (isFunction((unwrapped as any).toZonedDateTimeISO))
			return (unwrapped as any).toZonedDateTimeISO(fallbackTz);
		if (isFunction((unwrapped as any).toZonedDateTime))
			return (unwrapped as any).toZonedDateTime(fallbackTz);
		if ('epochNanoseconds' in (unwrapped as any))
			return Temporal.Instant.fromEpochNanoseconds((unwrapped as any).epochNanoseconds).toZonedDateTimeISO(fallbackTz);
	}

	if (isDate(date))
		return Temporal.Instant.fromEpochMilliseconds(date.getTime()).toZonedDateTimeISO(fallbackTz);

	if (isNumber(date))
		return Temporal.Instant.fromEpochMilliseconds(date).toZonedDateTimeISO(fallbackTz);

	if (isString(date)) {
		const trimmed = date.trim();
		try {
			return Temporal.ZonedDateTime.from(trimmed);
		} catch {
			try {
				return Temporal.PlainDateTime.from(trimmed).toZonedDateTime(fallbackTz);
			} catch {
				return Temporal.PlainDate.from(trimmed).toZonedDateTime(fallbackTz);
			}
		}
	}

	const parts = extractDateParts(date);
	if (isDefined(parts.year) && isDefined(parts.month) && isDefined(parts.day))
		return Temporal.PlainDate.from({ year: parts.year, month: parts.month, day: parts.day }).toZonedDateTime(fallbackTz);

	throw new TypeError(`[functions] Unable to coerce value into Temporal.ZonedDateTime: ${String(date)}`);
}

/**
 * Extracts a numeric epoch millisecond timestamp from diverse date/time or instance representations.
 * Safely handles numeric timestamps, JS Date instances, Tempo instances, Temporal objects, ISO strings,
 * and duck-typed objects without throwing.
 *
 * @param input - Date representation or instance to inspect
 * @returns Epoch millisecond timestamp, or undefined if invalid
 */
export function extractEpochMs(input: unknown): number | undefined {
	if (!isDefined(input))
		return undefined;
	if (isNumber(input))
		return input;
	if (isDate(input))
		return input.getTime();

	if (isObject(input)) {
		if (isNumber((input as any).epoch?.ms))
			return (input as any).epoch.ms;
		if (isNumber((input as any).epochMilliseconds))
			return (input as any).epochMilliseconds;
		if (isNumber((input as any).timestamp))
			return (input as any).timestamp;
		if (isDate((input as any).date))
			return (input as any).date.getTime();
		if (isFunction((input as any).toInstant)) {
			try {
				const t = (input as any).toInstant().epochMilliseconds;
				if (isNumber(t))
					return t;
			} catch {}
		}
		if (isFunction((input as any).getTime)) {
			try {
				const t = (input as any).getTime();
				if (isNumber(t))
					return t;
			} catch {}
		}
	}

	if (isString(input)) {
		const parsed = Date.parse(input.trim());
		if (isNumber(parsed))
			return parsed;
	}

	return undefined;
}

/**
 * Normalizes a date input into milliseconds since the Unix epoch.
 *
 * @param dateInput - Date value, ISO date string, or epoch timestamp in milliseconds
 * @param fallbackMs - Optional fallback value if parsing fails (default: 0)
 * @returns Timestamp in milliseconds since Unix epoch
 */
export function toEpochMs(dateInput: unknown, fallbackMs = 0): number {
	const ms = extractEpochMs(dateInput);
	return isDefined(ms) ? ms : fallbackMs;
}


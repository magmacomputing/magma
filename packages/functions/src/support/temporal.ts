import type { Temporal as TemporalType } from '@js-temporal/polyfill';
import { isObject, isNumber, isString, isDate, isTempo, isTemporal } from './assert.js';
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
 * Resolves the native Temporal API from the global scope at runtime.
 * This guarantees that functions does not accidentally bundle the polyfill, 
 * while maintaining full type safety.
 */
export const getTemporal = (): typeof TemporalType => {
	// @ts-expect-error - Check for global Temporal
	if (typeof Temporal !== 'undefined') return Temporal;

	if (typeof globalThis !== 'undefined' && 'Temporal' in globalThis)
		return (globalThis as any).Temporal;

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
		// Match calendar date parts: YYYY-MM-DD or YYYY-MM or YYYY
		const match = trimmed.match(/^([+-]?\d{4,6})(?:-(\d{2}))?(?:-(\d{2}))?/);
		if (match && match[1]) {
			const year = parseInt(match[1], 10);
			const month = match[2] ? parseInt(match[2], 10) : undefined;
			const day = match[3] ? parseInt(match[3], 10) : undefined;

			let dayOfWeek: number | undefined;
			if (month !== undefined && day !== undefined) {
				const dt = new Date(Date.UTC(year, month - 1, day));
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

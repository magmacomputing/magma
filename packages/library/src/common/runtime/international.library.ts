import { getOffsets } from '#library/temporal.library.js';
import { memoizeFunction } from '#library/function.library.js';
import { isFunction, isDefined } from '#library/assertion.library.js';

/** memoized helper for Intl.RelativeTimeFormat instances */
const getRTF = memoizeFunction((locale?: string, style: Intl.RelativeTimeFormatStyle = 'narrow', numeric: Intl.RelativeTimeFormatNumeric = 'always') => {
	return new Intl.RelativeTimeFormat(locale, { style, numeric });
});

/** memoized helper for Intl.ListFormat instances */
const getLF = memoizeFunction((locale?: string, type: Intl.ListFormatType = 'conjunction', style: Intl.ListFormatStyle = 'long') => {
	return new Intl.ListFormat(locale, { type, style });
});

/** memoized helper for Intl.DateTimeFormat instances */
export const getDTF = memoizeFunction((locale?: string, options?: Intl.DateTimeFormatOptions) => {
	return new Intl.DateTimeFormat(locale, options);
});

/** memoized helper for Intl.PluralRules instances */
export const getPR = memoizeFunction((locale?: Intl.LocalesArgument, options?: Intl.PluralRulesOptions) => {
	try {
		return new Intl.PluralRules(locale, options);
	} catch (e) {
		return { select: () => 'other' } as unknown as Intl.PluralRules;
	}
});

/** memoized helper for Intl.NumberFormat instances */
const getNF = memoizeFunction((locale?: string, options?: Intl.NumberFormatOptions) => {
	return new Intl.NumberFormat(locale, options);
});

/** memoized helper for Intl.DurationFormat instances */
const getDF = memoizeFunction((locale?: string, options?: any) => {
	try {
		const df = new (Intl as any).DurationFormat(locale, options);
		if (isFunction(df.format)) return df;
		throw new Error('No format method');
	} catch (e) {
		return { format: (duration: any) => String(duration) };
	}
});

/**
 * International Cookbook  
 * (using 'Intl' namespace objects)
 */

/**
 * Retrieves the system's current TimeZone, Calendar, and Locale information
 * by resolving the default `Intl.DateTimeFormat` options.
 * 
 * @returns The resolved DateTimeFormat options
 * @example
 * ```ts
 * const { timeZone, locale } = getDateTimeFormat();
 * ```
 */
export function getDateTimeFormat() {
	return getDTF().resolvedOptions();
}

const RE_UNDERSCORE = /_/g;

/**
 * Returns the canonicalized locale string, or undefined if the locale is invalid.
 * Uses `Intl.getCanonicalLocales` for strict validation.
 * 
 * @param locale - The locale string to validate (e.g., 'en_US' or 'en-US')
 * @returns The canonical locale string, or undefined on failure
 * @example
 * ```ts
 * canonicalLocale('en_US'); // 'en-US'
 * ```
 */
export function canonicalLocale(locale: string): string | undefined {
	try {
		return Intl.getCanonicalLocales(locale.replace(RE_UNDERSCORE, '-'))[0];
	} catch (e) {
		console.warn(`[Tempo] dropping invalid locale: '${locale}'`, e);
		return undefined;
	}
}

/**
 * Returns a localized relative time string using `Intl.RelativeTimeFormat`.
 * Falls back to a basic string representation if formatting fails.
 * 
 * @param value - The numeric value to format (e.g., 2)
 * @param unit - The time unit (e.g., 'days', 'hours')
 * @param locale - Optional locale string
 * @param style - The formatting style (default: 'narrow')
 * @param numeric - The numeric formatting preference (default: 'always')
 * @returns The localized relative time string
 * @example
 * ```ts
 * getRelativeTime(2, 'days', 'en'); // 'in 2 days'
 * ```
 */
export function getRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale?: string, style: Intl.RelativeTimeFormatStyle = 'narrow', numeric: Intl.RelativeTimeFormatNumeric = 'always') {
	try {
		return getRTF(locale, style, numeric).format(value, unit);
	} catch (e) {
		return `${value} ${unit}`;
	}
}

/**
 * Returns a localized list string using `Intl.ListFormat`.
 * Falls back to a simple comma-joined string if formatting fails.
 * 
 * @param list - The array of strings to format
 * @param locale - Optional locale string
 * @param type - The list format type (default: 'conjunction')
 * @param style - The list format style (default: 'long')
 * @returns The localized list string
 * @example
 * ```ts
 * formatList(['A', 'B', 'C'], 'en'); // 'A, B, and C'
 * ```
 */
export function formatList(list: string[], locale?: string, type: Intl.ListFormatType = 'conjunction', style: Intl.ListFormatStyle = 'long') {
	try {
		return getLF(locale, type, style).format(list);
	} catch (e) {
		return list.join(', ');
	}
}

/**
 * Returns a localized duration string using `Intl.DurationFormat`.
 * Note: Requires an environment that supports `Intl.DurationFormat`.
 * 
 * @param duration - The duration object or value to format
 * @param locale - Optional locale string
 * @param options - Optional format configuration
 * @returns The localized duration string
 */
export function formatDuration(duration: any, locale?: string, options?: any) {
	return getDF(locale, options).format(duration);
}

/**
 * Returns a localized number string using `Intl.NumberFormat`.
 * 
 * @param value - The numeric value to format
 * @param locale - Optional locale string
 * @param options - Optional format configuration
 * @returns The localized number string
 * @example
 * ```ts
 * formatNumber(1234.5, 'de-DE'); // '1.234,5'
 * ```
 */
export function formatNumber(value: number, locale?: string, options?: Intl.NumberFormatOptions) {
	try {
		return getNF(locale, options).format(value);
	} catch (e) {
		return value.toString();
	}
}

/**
 * Returns a localized day period string using `Intl.DateTimeFormat`.
 * Extracts the 'dayPeriod' token from the formatted parts.
 * 
 * @param value - The numeric epoch time value
 * @param locale - Optional locale string
 * @param options - Optional format configuration
 * @returns The localized day period string (e.g., 'AM', 'PM', 'de la mañana')
 */
export function formatDayPeriod(value: number, locale?: string, options?: Intl.DateTimeFormatOptions) {
	try {
		const parts = getDTF(locale, options).formatToParts(value);
		return parts.find(p => p.type === 'dayPeriod')?.value;
	} catch (e) {
		return undefined;
	}
}

/** return a localized unit string (e.g., '2 days') */
export function formatUnit(value: number, unit: string, locale?: string, unitDisplay: Intl.NumberFormatOptions['unitDisplay'] = 'long') {
	try {
		return getNF(locale, { style: 'unit', unit, unitDisplay }).format(value);
	} catch (e) {
		return `${value} ${unit}`;
	}
}

/** 
 * Formats a numeric value as a localized currency string.
 * 
 * @param str - The numeric value or string to format
 * @param scale - The maximum number of fractional digits (default: 2)
 * @param currency - The ISO 4217 currency code (default: 'AUD')
 * @param locale - Optional locale string (defaults to system locale)
 * @returns The localized currency string
 * @example
 * ```ts
 * formatCurrency(1234.5, 2, 'USD'); // '$1,234.50'
 * ```
 */
export function formatCurrency(str: string | number, scale = 2, currency = 'AUD', locale?: string) {
	try {
		return getNF(locale, { style: 'currency', currency, maximumFractionDigits: scale }).format(Number(str) || 0);
	} catch (e) {
		return `${currency} ${str}`;
	}
}

/** 
 * Try to infer hemisphere using the timezone's daylight-savings setting.
 * @remarks This implementation intentionally differs from the version in `tempo-fns` 
 * (including specific fallback and return behaviors). Do not directly synchronize them.
 */
export function getHemisphere(timeZone: string = getDateTimeFormat().timeZone) {
	try {
		const { jan, jul } = getOffsets(timeZone);							// using default reference-year (2024) for stability

		// Fallback: Check for known Southern geographic prefixes that might not observer DST
		const southPrefixes = ['Australia', 'Antarctica', 'Africa/Johannesburg', 'America/Buenos_Aires', 'America/Sao_Paulo'];
		const isSouthZone = southPrefixes.some(p => timeZone.startsWith(p));

		switch (true) {
			case jul > jan: return 'north';
			case jul < jan: return 'south';
			default: return isSouthZone ? 'south' : undefined;
		}
	} catch (e) {
		return undefined;
	}
}

type input = {
	toPlainDate?: () => any,
	year: number, month: number, day: number, dayOfWeek: number,
	weekOfYear?: number | undefined, yearOfWeek?: number | undefined
}
type result = { weekOfYear: number, yearOfWeek: number };
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
export function getISOWeekOfYear(zdt: input): result {
	if (isDefined(zdt.weekOfYear) && isDefined(zdt.yearOfWeek))
		return { weekOfYear: zdt.weekOfYear, yearOfWeek: zdt.yearOfWeek };

	// Since Temporal.ZonedDateTime is passed in, we can safely extract the PlainDate
	// to avoid crossing daylight saving boundaries when adding/subtracting days.
	// Normalize to ISO 8601 calendar because properties like dayOfYear/dayOfWeek are calendar-dependent.
	const pd = (isFunction(zdt.toPlainDate) ? zdt.toPlainDate() : Temporal.PlainDate.from(zdt)).withCalendar('iso8601');

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

/**
 * Probes the runtime to see if the locale defaults to Month-Day-Year (MDY) order.
 * Useful for resolving ambiguous dates like '12/11/2024'.
 * 
 * @param locale - The locale string to probe
 * @returns True if the locale uses MDY format, false otherwise
 * @example
 * ```ts
 * probeMDY('en-US') // true
 * probeMDY('en-GB') // false
 * ```
 */
export function probeMDY(locale: string): boolean {
	try {
		// Use Dec 24th to check if '12' comes first
		const date = new Date(2024, 11, 24);
		const parts = new Intl.DateTimeFormat(locale).formatToParts(date);
		return parts[0].type === 'month' && parts[0].value === '12';
	} catch {
		return false;
	}
}

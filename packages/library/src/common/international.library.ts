import { getOffsets } from '#library/temporal.library.js';
import { memoizeFunction } from '#library/function.library.js';
import { isFunction, isDefined } from '#library/assertion.library.js';

/** memoized helper for Intl.RelativeTimeFormat instances */
const getRTF = memoizeFunction((locale?: string, style: Intl.RelativeTimeFormatStyle = 'narrow') => {
	return new Intl.RelativeTimeFormat(locale, { style });
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

/** return the system's current TimeZone, Calendar, and Locale */
export function getDateTimeFormat() {
	return getDTF().resolvedOptions();
}

/** return the canonicalized locale string, or undefined if invalid */
export function canonicalLocale(locale: string): string | undefined {
	try {
		return Intl.getCanonicalLocales(locale.replace(/_/g, '-'))[0];
	} catch (e) {
		console.warn(`[Tempo] dropping invalid locale: '${locale}'`, e);
		return undefined;
	}
}

/** return a localized relative time string (e.g., 'in 2 days') */
export function getRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale?: string, style: Intl.RelativeTimeFormatStyle = 'narrow') {
	try {
		return getRTF(locale, style).format(value, unit);
	} catch (e) {
		return `${value} ${unit}`;
	}
}

/** return a localized list string (e.g., 'A, B, and C') */
export function formatList(list: string[], locale?: string, type: Intl.ListFormatType = 'conjunction', style: Intl.ListFormatStyle = 'long') {
	try {
		return getLF(locale, type, style).format(list);
	} catch (e) {
		return list.join(', ');
	}
}

/** return a localized duration string natively (using Intl.DurationFormat) */
export function formatDuration(duration: any, locale?: string, options?: any) {
	return getDF(locale, options).format(duration);
}

/** return a localized number string */
export function formatNumber(value: number, locale?: string, options?: Intl.NumberFormatOptions) {
	try {
		return getNF(locale, options).format(value);
	} catch (e) {
		return value.toString();
	}
}

/** return a localized day period string (e.g., 'AM', 'PM', 'de la mañana') */
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

/** try to infer hemisphere using the timezone's daylight-savings setting */
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
 * Polyfill fallback for ISO 8601 Week of Year and Year of Week.
 * 
 * Introduced because highly experimental native browser implementations of the Temporal API 
 * (e.g., Chrome/Firefox behind flags) currently return `undefined` for `weekOfYear` and `yearOfWeek` 
 * on ZonedDateTime objects. The TC39 spec moved toward calendar-dependent definitions, 
 * causing divergence between the @js-temporal/polyfill (which returns numbers) and native browsers (which return undefined).
 */
export function getISOWeekOfYear(zdt: input): result {
	if (isDefined(zdt.weekOfYear) && isDefined(zdt.yearOfWeek))
		return { weekOfYear: zdt.weekOfYear, yearOfWeek: zdt.yearOfWeek };

	// Since Temporal.ZonedDateTime is passed in, we can safely extract the PlainDate
	// to avoid crossing daylight saving boundaries when adding/subtracting days.
	const pd = isFunction(zdt.toPlainDate) ? zdt.toPlainDate() : Temporal.PlainDate.from(zdt);

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

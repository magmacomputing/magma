import { getOffsets } from '#library/temporal.library.js';
import { memoizeFunction } from '#library/function.library.js';
import { isFunction, isDefined, isCallable, isString, isEmpty, isLocale } from '#library/assertion.library.js';

import type { LooseUnion } from '#library/type.library.js';

const RE_UNDERSCORE = /_/g;
const RE_LOCALE_CLEANSE = /[.@]/;

export type LocaleInput = string | Intl.Locale | undefined;

/** 
 * Guard check for runtime Intl namespace and constructor availability.
 * @internal 
 */
export const hasIntl = (feature?: LooseUnion<keyof typeof Intl>): boolean =>
	typeof Intl !== 'undefined' && (!feature || (feature in Intl && isCallable((Intl as Record<string, unknown>)[feature])));

/**
 * Cleanses a raw locale string by trimming whitespace, converting POSIX underscores
 * to BCP 47 hyphens, and stripping POSIX encoding/modifier suffixes (e.g. 'en_US.UTF-8' -> 'en-US').
 * @internal
 */
export const cleanLocaleTag = (tag?: unknown): string | undefined => {
	if (isLocale(tag)) tag = tag.toString();
	if (!isString(tag)) return undefined;

	const trimmed = tag.trim();
	if (isEmpty(trimmed)) return undefined;
	const stripped = trimmed.split(RE_LOCALE_CLEANSE)[0];
	return stripped.replace(RE_UNDERSCORE, '-');
};

/** memoized helper for Intl.RelativeTimeFormat instances */
const getRTF = memoizeFunction((locale?: LocaleInput, options?: Intl.RelativeTimeFormatOptions) => {
	return new Intl.RelativeTimeFormat(cleanLocaleTag(locale), options);
});

/** memoized helper for Intl.ListFormat instances */
const getLF = memoizeFunction((locale?: LocaleInput, options?: Intl.ListFormatOptions) => {
	return new Intl.ListFormat(cleanLocaleTag(locale), options);
});

/** 
 * Memoized helper for Intl.DateTimeFormat instances.
 * @internal
 */
export const getDTF = memoizeFunction((locale?: LocaleInput, options?: Intl.DateTimeFormatOptions) => {
	return new Intl.DateTimeFormat(cleanLocaleTag(locale), options);
});

/** 
 * Memoized helper for Intl.PluralRules instances.
 * @internal
 */
export const getPR = memoizeFunction((locale?: LocaleInput, options?: Intl.PluralRulesOptions) => {
	try {
		return new Intl.PluralRules(cleanLocaleTag(locale), options);
	} catch (e) {
		return { select: () => 'other' } as unknown as Intl.PluralRules;
	}
});

/** memoized helper for Intl.NumberFormat instances */
const getNF = memoizeFunction((locale?: LocaleInput, options?: Intl.NumberFormatOptions) => {
	return new Intl.NumberFormat(cleanLocaleTag(locale), options);
});

/** memoized helper for Intl.DurationFormat instances */
const getDF = memoizeFunction((locale?: LocaleInput, options?: any) => {
	try {
		const df = new Intl.DurationFormat(cleanLocaleTag(locale), options);
		if (isFunction(df.format)) return df;
		throw new Error('No format method');
	} catch (e) {
		return { format: (duration: any) => String(duration) };
	}
});


/**
 * Safely invokes a method on an object if it exists as a function,
 * or falls back to reading a property getter. Returns undefined if unavailable.
 */
function getPropOrCall(obj: any, method: string, fallbackProp?: string): any {
	if (!obj) return undefined;
	if (isCallable(obj[method])) return obj[method]();
	if (fallbackProp && fallbackProp in obj) return obj[fallbackProp];
	return undefined;
}

export interface LocaleWeekInfo {
	/** First day of the week: 1 (Mon) .. 7 (Sun) */
	readonly firstDay: number;
	/** Regional weekend days (e.g. [6, 7] or [5, 6]) */
	readonly weekend: readonly number[];
}

export interface ResolvedLocaleInfo {
	readonly locale?: Intl.Locale | undefined;
	readonly baseName: string;
	readonly language?: string | undefined;
	readonly weekInfo: LocaleWeekInfo;
	readonly firstDay: number;
	readonly weekend: readonly number[];
	readonly hourCycle: string;
	readonly hourCycles: readonly string[];
	readonly direction: 'ltr' | 'rtl';
	readonly numberingSystem: string;
	readonly numberingSystems: readonly string[];
	readonly timeZones: readonly string[];
}

/**
 * Legacy Heuristic Fallback Tables
 * 
 * NOTE FOR MAINTAINERS:
 * These static sets are strictly "best-effort" fallbacks for legacy, headless, or stripped
 * environments that lack ECMA-402 Intl.Locale Info support (i.e. `loc.getWeekInfo()` and `loc.getTextInfo()`).
 * 
 * - In modern runtimes (Node 18.19+, Node 20+, Chrome, Safari, Firefox), these tables are completely
 *   bypassed because the host engine provides full, live CLDR data directly from ICU.
 * - This minimal coverage (focusing on major regional cohorts like US, CA, and Middle East) was
 *   determined to be an intentional, acceptable architectural risk.
 * - If a region or locale is not covered by these fallback tables, the system deliberately falls back
 *   to ISO 8601 standard settings: Monday start (`firstDay: 1`), Saturday & Sunday weekend (`[6, 7]`),
 *   and left-to-right (`direction: 'ltr'`).
 * - DO NOT spend effort keeping these lists exhaustive or synchronized with every Unicode CLDR release.
 *   Comprehensive, authoritative localization is intentionally delegated to the host engine's native Intl APIs.
 */
const SUNDAY_START_REGIONS = new Set(['US', 'CA', 'MX', 'BR', 'IL', 'JP', 'TW', 'HK', 'MO', 'PH', 'SG', 'TH', 'IN', 'KR', 'CO', 'PE', 'VE', 'ZA']);
const SATURDAY_START_REGIONS = new Set(['SA', 'AF', 'BH', 'DJ', 'DZ', 'EG', 'IQ', 'IR', 'JO', 'KW', 'LY', 'OM', 'QA', 'SD', 'SY', 'YE']);
const FRIDAY_START_REGIONS = new Set(['MV']);
const FRI_SAT_WEEKEND_REGIONS = new Set(['SA', 'BH', 'DJ', 'DZ', 'EG', 'IQ', 'JO', 'KW', 'LY', 'OM', 'QA', 'SD', 'SY', 'YE']);
const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'yi', 'ps', 'sd', 'ug', 'ckb']);
const RTL_SCRIPTS = new Set(['Arab', 'Hebr', 'Thaa', 'Syrc', 'Mand', 'Samr', 'Nkoo']);

const WEEKEND_SAT_SUN: readonly number[] = Object.freeze([6, 7]);
const WEEKEND_FRI_SAT: readonly number[] = Object.freeze([5, 6]);
const WEEKEND_FRI: readonly number[] = Object.freeze([5]);
const WEEKEND_THU_FRI: readonly number[] = Object.freeze([4, 5]);

/** Fallback firstDay resolver for legacy engines lacking Intl.Locale.prototype.getWeekInfo */
function getFallbackFirstDay(region?: string): number {
	if (!region) return 1;
	if (FRIDAY_START_REGIONS.has(region)) return 5;
	if (SATURDAY_START_REGIONS.has(region)) return 6;
	if (SUNDAY_START_REGIONS.has(region)) return 7;
	return 1;
}

/** Fallback weekend resolver for legacy engines lacking Intl.Locale.prototype.getWeekInfo */
function getFallbackWeekend(region?: string): readonly number[] {
	if (!region) return WEEKEND_SAT_SUN;
	if (region === 'IR') return WEEKEND_FRI;
	if (region === 'AF') return WEEKEND_THU_FRI;
	if (FRI_SAT_WEEKEND_REGIONS.has(region)) return WEEKEND_FRI_SAT;
	return WEEKEND_SAT_SUN;
}

/** Fallback direction resolver for legacy engines lacking Intl.Locale.prototype.getTextInfo */
function getFallbackDirection(loc?: Intl.Locale, language?: string): 'ltr' | 'rtl' {
	const script = loc?.script ?? (isCallable((loc as any)?.maximize) ? (loc as any).maximize().script : undefined);
	return (script && RTL_SCRIPTS.has(script)) || (language && RTL_LANGUAGES.has(language)) ? 'rtl' : 'ltr';
}

/** 
 * Memoized helper for Intl.Locale instances.
 * @internal 
 */
export const getLC = memoizeFunction((localeTag?: LocaleInput): Intl.Locale | undefined => {
	if (isLocale(localeTag)) return localeTag;
	if (!hasIntl('Locale')) return undefined;
	try {
		const cleaned = cleanLocaleTag(localeTag);
		return new Intl.Locale(cleaned || 'en-US');
	} catch {
		return undefined;
	}
});

/** 
 * Memoized helper for Intl.Locale and LocaleInfo resolution.
 * @internal
 */
export const getLI = memoizeFunction((localeTag?: LocaleInput): ResolvedLocaleInfo => {
	const loc = getLC(localeTag) ?? getLC('en-US');
	const baseName = loc?.baseName ?? canonicalLocale(localeTag) ?? 'en-US';
	const language = loc?.language ?? (baseName.split('-')[0]?.toLowerCase());

	// 1. WeekInfo: firstDay & weekend (guards native getWeekInfo() and legacy .weekInfo)
	const rawWeek = getPropOrCall(loc, 'getWeekInfo', 'weekInfo');
	const region = (rawWeek?.firstDay != null && Array.isArray(rawWeek?.weekend))
		? undefined
		: (loc?.region ?? (baseName.includes('-') ? baseName.split('-')[1]?.toUpperCase() : undefined));

	const firstDay = rawWeek?.firstDay ?? getFallbackFirstDay(region);
	const weekend = Array.isArray(rawWeek?.weekend)
		? Object.freeze([...rawWeek.weekend])
		: getFallbackWeekend(region);

	// 2. Hour Cycles (getHourCycles() or .hourCycles or legacy .hourCycle)
	const rawCycles = getPropOrCall(loc, 'getHourCycles', 'hourCycles') ?? loc?.hourCycle;
	const resolvedHc = rawCycles ?? (hasIntl('DateTimeFormat') ? getDTF(baseName, { hour: 'numeric' }).resolvedOptions().hourCycle : undefined);
	const hourCycles = Array.isArray(resolvedHc) && resolvedHc.length > 0
		? Object.freeze([...resolvedHc])
		: (isString(resolvedHc) ? Object.freeze([resolvedHc]) : Object.freeze(['h23']));

	// 3. Direction (getTextInfo() or .textInfo)
	const rawText = getPropOrCall(loc, 'getTextInfo', 'textInfo');
	const direction: 'ltr' | 'rtl' = (rawText?.direction === 'rtl' || rawText?.direction === 'ltr')
		? rawText.direction
		: getFallbackDirection(loc, language);

	// 4. Numbering Systems (getNumberingSystems() or .numberingSystems or legacy .numberingSystem)
	const rawSystems = getPropOrCall(loc, 'getNumberingSystems', 'numberingSystems') ?? loc?.numberingSystem;
	const resolvedNs = rawSystems ?? (hasIntl('NumberFormat') ? getNF(baseName).resolvedOptions().numberingSystem : undefined);
	const numberingSystems = Array.isArray(resolvedNs) && resolvedNs.length > 0
		? Object.freeze([...resolvedNs])
		: (isString(resolvedNs) ? Object.freeze([resolvedNs]) : Object.freeze(['latn']));

	// 5. Time Zones (getTimeZones() or .timeZones)
	const rawTimeZones = getPropOrCall(loc, 'getTimeZones', 'timeZones');
	const timeZones = Array.isArray(rawTimeZones) && rawTimeZones.length > 0
		? Object.freeze([...rawTimeZones])
		: Object.freeze([]);

	const weekInfo: LocaleWeekInfo = Object.freeze({ firstDay, weekend });

	return Object.freeze({
		locale: loc,
		baseName,
		language,
		weekInfo,
		firstDay,
		weekend,
		hourCycle: hourCycles[0],
		hourCycles,
		direction,
		numberingSystem: numberingSystems[0],
		numberingSystems,
		timeZones,
	});
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
export function canonicalLocale(locale?: LocaleInput): string | undefined {
	const cleaned = cleanLocaleTag(locale);
	if (!cleaned) return undefined;
	if (hasIntl('getCanonicalLocales')) {
		try {
			return Intl.getCanonicalLocales(cleaned)[0];
		} catch {
			return undefined;
		}
	}
	return getLC(cleaned)?.baseName ?? cleaned;
}

/**
 * Returns a localized relative time string using `Intl.RelativeTimeFormat`.
 * Falls back to a basic string representation if formatting fails.
 * 
 * @param value - The numeric value to format (e.g., 2)
 * @param unit - The time unit (e.g., 'days', 'hours')
 * @param locale - Optional locale string or Intl.Locale
 * @param style - The formatting style (default: 'narrow')
 * @param numeric - The numeric formatting preference (default: 'always')
 * @returns The localized relative time string
 * @example
 * ```ts
 * getRelativeTime(2, 'days', 'en'); // 'in 2 days'
 * ```
 */
export function getRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale?: LocaleInput, style: Intl.RelativeTimeFormatStyle = 'narrow', numeric: Intl.RelativeTimeFormatNumeric = 'always') {
	try {
		return getRTF(locale, { style, numeric }).format(value, unit);
	} catch (e) {
		return `${value} ${unit}`;
	}
}

/**
 * Returns a localized list string using `Intl.ListFormat`.
 * Falls back to a simple comma-joined string if formatting fails.
 * 
 * @param list - The array of strings to format
 * @param locale - Optional locale string or Intl.Locale
 * @param type - The list format type (default: 'conjunction')
 * @param style - The list format style (default: 'long')
 * @returns The localized list string
 * @example
 * ```ts
 * formatList(['A', 'B', 'C'], 'en'); // 'A, B, and C'
 * ```
 */
export function formatList(list: string[], locale?: LocaleInput, type: Intl.ListFormatType = 'conjunction', style: Intl.ListFormatStyle = 'long') {
	try {
		return getLF(locale, { style, type }).format(list);
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
export function formatDuration(duration: any, locale?: LocaleInput, options?: any) {
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
export function formatNumber(value: number, locale?: LocaleInput, options?: Intl.NumberFormatOptions) {
	try {
		return getNF(locale, options).format(value);
	} catch (e) {
		return value.toString();
	}
}

/**
 * Extracts the localized day-period label from a formatted date.
 *
 * @param value - The epoch time value to format
 * @param locale - The locale used for formatting
 * @param options - Date-time formatting options
 * @returns The localized day-period label, or `undefined` if formatting fails or no day-period part exists
 */
export function formatDayPeriod(value: number, locale?: LocaleInput, options?: Intl.DateTimeFormatOptions) {
	try {
		const parts = getDTF(locale, options).formatToParts(value);
		return parts.find(p => p.type === 'dayPeriod')?.value;
	} catch (e) {
		return undefined;
	}
}

/**
 * Formats a numeric value with a localized unit.
 *
 * @param value - The numeric value to format
 * @param unit - The unit identifier, such as `day`, `hour`, or `meter`
 * @param locale - The locale to use for formatting
 * @param unitDisplay - The unit display style
 * @returns The localized unit string, or the value and unit separated by a space if formatting fails
 */
export function formatUnit(value: number, unit: string, locale?: LocaleInput, unitDisplay: Intl.NumberFormatOptions['unitDisplay'] = 'long') {
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
export function formatCurrency(str: string | number, scale = 2, currency = 'AUD', locale?: LocaleInput) {
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
		const southPrefixes = ['Australia', 'Antarctica', 'Africa/Johannesburg', 'America/Argentina/Buenos_Aires', 'America/Sao_Paulo'];
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
export function probeMDY(locale?: LocaleInput): boolean {
	try {
		// Use Dec 24th to check if '12' comes first
		const date = new Date(2024, 11, 24);
		const parts = getDTF(locale).formatToParts(date);
		return parts[0].type === 'month' && parts[0].value === '12';
	} catch {
		return false;
	}
}

import { getOffsets } from '#library/temporal.library.js';
import { memoizeFunction } from '#library/function.library.js';
import { isFunction, isDefined, isCallable, isString, isEmpty, isLocale } from '#library/assertion.library.js';
import { asArray } from '#library/coercion.library.js';

import type { LooseUnion } from '#library/type.library.js';

const RE_UNDERSCORE = /_/g;
const RE_LOCALE_CLEANSE = /[.@]/;

export type LocaleInput = string | Intl.Locale | undefined;

/** 
 * Guard check for runtime Intl namespace and constructor availability.
 * @internal 
 */
export const hasIntl = (feature?: LooseUnion<keyof typeof Intl>): boolean =>
	typeof Intl !== 'undefined' && (!feature || (Object.hasOwn(Intl, feature) && isCallable((Intl as Record<string, unknown>)[feature])));

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
	readonly region?: string | undefined;
	readonly script?: string | undefined;
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

	// Region & Script
	const region = loc?.region
		?? (isCallable((loc as any)?.maximize) ? (loc as any).maximize().region : undefined)
		?? baseName.split('-').slice(1).find((subtag) => /^[a-zA-Z]{2}$|^\d{3}$/.test(subtag))?.toUpperCase();
	const script = loc?.script
		?? (isCallable((loc as any)?.maximize) ? (loc as any).maximize().script : undefined);

	// 1. WeekInfo: firstDay & weekend (guards native getWeekInfo() and legacy .weekInfo)
	const rawWeek = getPropOrCall(loc, 'getWeekInfo', 'weekInfo');
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
		region,
		script,
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
 * Cached digits map for numbering system transliteration.
 * @internal
 */
const getDigitsMap = memoizeFunction((numberingSystem: string = 'latn'): readonly string[] | undefined => {
	if (!numberingSystem || numberingSystem === 'latn' || !hasIntl('NumberFormat')) return undefined;
	try {
		const nf = new Intl.NumberFormat(`en-u-nu-${numberingSystem}`, { useGrouping: false });
		const digits = Array.from({ length: 10 }, (_, i) => nf.format(i));
		// If the engine did not actually support the numbering system, it falls back to '0'..'9'
		if (digits[0] === '0' && digits[9] === '9') return undefined;
		return Object.freeze(digits);
	} catch {
		return undefined;
	}
});

/**
 * Transliterates ASCII digits (0-9) within a string or number into the target numbering system (e.g. 'arab', 'deva').
 * Returns the original string if the numbering system is 'latn' or unsupported.
 */
export function localizeDigits(value: string | number, numberingSystem: string = 'latn'): string {
	const str = String(value);
	if (!numberingSystem || numberingSystem === 'latn') return str;
	const digits = getDigitsMap(numberingSystem);
	if (!digits) return str;
	return str.replace(/[0-9]/g, (d) => digits[+d] ?? d);
}

/**
 * Wraps text in Unicode Bidirectional Isolates (\u2067 RLI ... \u2069 PDI) if direction is 'rtl'.
 */
export function isolateBidi(text: string, direction?: 'ltr' | 'rtl'): string {
	if (!text || direction !== 'rtl') return text;
	return `\u2067${text}\u2069`;
}

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
export const getDateTimeFormat = memoizeFunction(() => {
	return getDTF().resolvedOptions();
});

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
const canonicalLocale = memoizeFunction((locale?: LocaleInput) => {
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
});

/**
 * Canonicalizes an array or single locale input into a list of valid BCP 47 locale strings.
 * Gracefully ignores malformed locales and strips invalid/falsy values without throwing.
 * 
 * @param locales - Single or multiple locale identifiers or Intl.Locale instances
 * @returns An array of canonical BCP 47 locale strings
 * @example
 * ```ts
 * canonicalLocales(['en_US.UTF-8', 'fr-FR', 'invalid!tag']); // ['en-US', 'fr-FR']
 * ```
 */
export const canonicalLocales = memoizeFunction((locales?: unknown): string[] => {
	if (!isDefined(locales)) return [];
	return asArray(locales)
		.map(l => canonicalLocale(l as LocaleInput))
		.filter(Boolean) as string[];
});

/**
 * Resolves a locale or list of locales into a standardized configuration format:
 * a single string for one valid locale, a string array for multiple, or undefined if none.
 * 
 * @param locales - Single or multiple locale identifiers or Intl.Locale instances
 * @returns A single canonical string, an array of strings, or undefined
 * @example
 * ```ts
 * resolveLocale('en_US'); // 'en-US'
 * resolveLocale(['en_US', 'fr_FR']); // ['en-US', 'fr-FR']
 * resolveLocale(['invalid']); // undefined
 * ```
 */
export function resolveLocale(locales?: unknown): string | string[] | undefined {
	const resolved = canonicalLocales(locales);
	if (resolved.length === 0) return undefined;
	return resolved.length === 1 ? resolved[0] : resolved;
}

/**
 * Checks whether all resolved locales in the input belong to the English language family ('en-*').
 * 
 * @param locales - Single or multiple locale identifiers
 * @returns True if at least one valid locale exists and all resolved locales are English
 * @example
 * ```ts
 * isEnglish('en-US'); // true
 * isEnglish(['en-US', 'en-GB']); // true
 * isEnglish(['en-US', 'fr-FR']); // false
 * ```
 */
export function isEnglish(locales?: unknown): boolean {
	const resolved = canonicalLocales(locales);
	return resolved.length > 0 && resolved.every(l => l.split('-')[0]?.toLowerCase() === 'en');
}

/**
 * Extracts the primary language subtag (e.g., 'en', 'fr') from a locale or list of locales.
 * Defaults to 'en' if not determinable.
 * 
 * @param locale - Locale identifier or list of locales
 * @param fallback - Fallback language subtag (default: 'en')
 * @returns The lowercase language subtag
 * @example
 * ```ts
 * getLanguage('en-US'); // 'en'
 * getLanguage(['fr-CA', 'en-US']); // 'fr'
 * getLanguage(); // 'en'
 * ```
 */
export function getLanguage(locale?: unknown, fallback = 'en'): string {
	const primary = canonicalLocales(locale)[0];
	return primary ? (primary.split('-')[0]?.toLowerCase() ?? fallback) : fallback;
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
export const getHemisphere = memoizeFunction((timeZone: string = getDateTimeFormat().timeZone): 'north' | 'south' | undefined => {
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
});

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
export const probeMDY = memoizeFunction((locale?: LocaleInput): boolean => {
	try {
		// Use Dec 24th to check if '12' comes first
		const date = new Date(2024, 11, 24);
		const parts = getDTF(locale).formatToParts(date);
		return parts[0].type === 'month' && parts[0].value === '12';
	} catch {
		return false;
	}
});

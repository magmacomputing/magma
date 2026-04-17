import { getOffsets } from '#library/temporal.library.js';
import { memoizeFunction } from '#library/function.library.js';

/** memoized helper for Intl.RelativeTimeFormat instances */
const getRTF = memoizeFunction((locale?: string, style: Intl.RelativeTimeFormatStyle = 'narrow') => {
	return new Intl.RelativeTimeFormat(locale, { style });
});

/** memoized helper for Intl.ListFormat instances */
const getLF = memoizeFunction((locale?: string, type: Intl.ListFormatType = 'conjunction', style: Intl.ListFormatStyle = 'long') => {
	return new Intl.ListFormat(locale, { type, style });
});

/** memoized helper for Intl.DateTimeFormat instances */
const getDTF = memoizeFunction((locale?: string) => {
	return new Intl.DateTimeFormat(locale);
});

/**
 * International Cookbook  
 * (using 'Intl' namespace objects)
 */

/** return the system's current TimeZone, Calendar, and Locale */
export function getDateTimeFormat() {
	return getDTF().resolvedOptions();
}

/** return the canonicalized locale string */
export function canonicalLocale(locale: string) {
	try {
		return Intl.getCanonicalLocales(locale.replace(/_/g, '-'))[0];
	} catch (e) {
		return locale;
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

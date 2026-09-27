import { isString } from '../support/index.js';
import type { LocaleSyncMode } from './types.js';

/**
 * Common country name mappings to ISO 3166-1 alpha-2 codes.
 */
export const COMMON_COUNTRY_NAMES: Record<string, string> = {
	australia: 'AU',
	'united states': 'US',
	'united kingdom': 'GB',
	'great britain': 'GB',
	france: 'FR',
	germany: 'DE',
	italy: 'IT',
	spain: 'ES',
	japan: 'JP',
	china: 'CN',
	canada: 'CA',
	brazil: 'BR',
	egypt: 'EG',
	'saudi arabia': 'SA',
	russia: 'RU',
	india: 'IN',
	mexico: 'MX',
	'new zealand': 'NZ',
	netherlands: 'NL',
	switzerland: 'CH',
	austria: 'AT',
	belgium: 'BE',
	sweden: 'SE',
	norway: 'NO',
	denmark: 'DK',
	finland: 'FI',
	poland: 'PL',
	turkey: 'TR',
	greece: 'GR',
	israel: 'IL',
	thailand: 'TH',
	vietnam: 'VN',
	indonesia: 'ID',
	malaysia: 'MY',
	philippines: 'PH',
	'south africa': 'ZA',
	'south korea': 'KR',
	korea: 'KR',
	ireland: 'IE',
	portugal: 'PT',
	argentina: 'AR',
};

/**
 * Standard mapping from ISO 3166-1 alpha-2 country codes to primary native BCP 47 locales.
 */
export const COUNTRY_PRIMARY_LOCALES: Record<string, string> = {
	AU: 'en-AU',
	US: 'en-US',
	GB: 'en-GB',
	CA: 'en-CA',
	NZ: 'en-NZ',
	IE: 'en-IE',
	SA: 'ar-SA',
	AE: 'ar-AE',
	EG: 'ar-EG',
	JP: 'ja-JP',
	CN: 'zh-CN',
	TW: 'zh-TW',
	HK: 'zh-HK',
	KR: 'ko-KR',
	FR: 'fr-FR',
	DE: 'de-DE',
	IT: 'it-IT',
	ES: 'es-ES',
	MX: 'es-MX',
	AR: 'es-AR',
	BR: 'pt-BR',
	PT: 'pt-PT',
	RU: 'ru-RU',
	IN: 'hi-IN',
	NL: 'nl-NL',
	SE: 'sv-SE',
	NO: 'nb-NO',
	DK: 'da-DK',
	FI: 'fi-FI',
	PL: 'pl-PL',
	TR: 'tr-TR',
	GR: 'el-GR',
	IL: 'he-IL',
	TH: 'th-TH',
	VN: 'vi-VN',
	ID: 'id-ID',
	MY: 'ms-MY',
	PH: 'fil-PH',
	ZA: 'en-ZA',
	CH: 'de-CH',
	AT: 'de-AT',
	BE: 'nl-BE',
};

interface CleanLocaleResult {
	language?: string | undefined;
	script?: string | undefined;
	baseName?: string | undefined;
}

/**
 * Safely parses and normalizes a locale tag via Intl.Locale.
 * @internal
 */
function cleanLocale(tag: string): CleanLocaleResult | undefined {
	try {
		const loc = new Intl.Locale(tag);
		return {
			language: loc.language,
			script: loc.script || undefined,
			baseName: loc.baseName,
		};
	} catch {
		const parts = tag.split('-');
		return {
			language: parts[0]?.toLowerCase(),
			script: parts.length > 2 ? parts[1] : undefined,
			baseName: tag,
		};
	}
}

/**
 * Resolves a synchronized BCP 47 locale based on geolocated country and synchronization mode.
 *
 * @param currentLocale - Current instance locale (e.g. 'en-US')
 * @param countryCode - Resolved ISO country code (e.g. 'SA') or country name (e.g. 'Saudi Arabia')
 * @param mode - Locale sync mode ('regional' / true, 'native', 'none' / false, or custom string)
 * @returns Validated BCP 47 locale string, or undefined if no change
 *
 * @example
 * ```ts
 * resolveCulturalLocale('en-US', 'AU', 'regional'); // 'en-AU'
 * resolveCulturalLocale('en-US', 'EG', 'native');   // 'ar-EG'
 * ```
 */
export function resolveCulturalLocale(
	currentLocale: string | undefined,
	countryCode: string | undefined | string[],
	mode: LocaleSyncMode = true
): string | undefined {
	if (mode === false || mode === 'none' || mode === 'off') return undefined;

	const toCode = (val: string): string | undefined => {
		const trimmed = val.trim();

		return (trimmed.length === 2)
			? trimmed.toUpperCase()
			: COMMON_COUNTRY_NAMES[trimmed.toLowerCase()];
	};

	// Normalize country code
	let country: string | undefined;
	if (Array.isArray(countryCode)) {
		for (const c of countryCode) {
			if (isString(c)) {
				const mapped = toCode(c);
				if (mapped) {
					country = mapped;
					break;
				}
			}
		}
	} else if (isString(countryCode)) {
		country = toCode(countryCode);
	}

	// Custom BCP 47 tag provided directly in mode
	if (isString(mode) && mode !== 'regional' && mode !== 'region' && mode !== 'native' && mode !== 'full') {
		const loc = cleanLocale(mode);
		return loc?.baseName ?? mode;
	}

	if (!country) return undefined;

	// Native mode: country -> primary native language of country
	if (mode === 'native' || mode === 'full') {
		const nativeTag = COUNTRY_PRIMARY_LOCALES[country] ?? `en-${country}`;
		const loc = cleanLocale(nativeTag);
		return loc?.baseName ?? nativeTag;
	}

	// Regional mode (default: true / 'regional' / 'region'): preserve source language and script, adapt region
	let baseLang = 'en';
	let script: string | undefined;
	if (isString(currentLocale) && currentLocale.length > 0) {
		const loc = cleanLocale(currentLocale);
		baseLang = loc?.language ?? currentLocale.split('-')[0] ?? 'en';
		if (loc?.script) script = loc.script;
	}

	const targetTag = script ? `${baseLang}-${script}-${country}` : `${baseLang}-${country}`;
	const loc = cleanLocale(targetTag);
	return loc?.baseName ?? targetTag;
}

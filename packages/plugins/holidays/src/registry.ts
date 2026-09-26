import { isString } from '@magmacomputing/tempo/library';
import { getStorage } from './cache.js';
import { generateUsHolidays } from './calendars/us.js';
import { generateAuHolidays } from './calendars/au.js';
import { generateGbHolidays } from './calendars/gb.js';
import { generateCaHolidays } from './calendars/ca.js';
import { generateDeHolidays } from './calendars/de.js';
import { generateFrHolidays } from './calendars/fr.js';
import { generateJpHolidays } from './calendars/jp.js';
import { generateNzHolidays } from './calendars/nz.js';
import type { HolidayCalendarGenerator, HolidayItem, HolidayOptions } from './types.js';

const BUILTIN_CALENDARS: Record<string, HolidayCalendarGenerator> = {
	'US': generateUsHolidays,
	'USA': generateUsHolidays,
	'AU': generateAuHolidays,
	'AUS': generateAuHolidays,
	'GB': generateGbHolidays,
	'UK': generateGbHolidays,
	'CA': generateCaHolidays,
	'CAN': generateCaHolidays,
	'DE': generateDeHolidays,
	'DEU': generateDeHolidays,
	'FR': generateFrHolidays,
	'FRA': generateFrHolidays,
	'JP': generateJpHolidays,
	'JPN': generateJpHolidays,
	'NZ': generateNzHolidays,
	'NZL': generateNzHolidays,
};

const cache = new Map<string, HolidayItem[]>();
const dynamicHolidays = new Map<string, HolidayItem[]>();

/**
 * Checks whether a given country code has an offline built-in calendar generator.
 *
 * @param countryCode - Raw country code
 * @returns True if country is built-in
 */
export function hasBuiltinCalendar(countryCode?: string): boolean {
	const code = normalizeCountryCode(countryCode);
	return code in BUILTIN_CALENDARS;
}

/**
 * Registers dynamic or preloaded holiday items in memory for synchronous access.
 *
 * @param year - 4-digit calendar year
 * @param countryCode - Country code
 * @param items - Array of holiday items
 */
export function registerHolidayItems(year: number, countryCode: string, items: HolidayItem[]): void {
	const country = normalizeCountryCode(countryCode);
	const dynKey = `${year}_${country}`;
	dynamicHolidays.set(dynKey, items);
	cache.set(`${year}-${country}-ALL-true`, items);
	cache.set(`${year}-${country}-ALL-false`, items);
}

const ALPHA3_TO_ALPHA2: Record<string, string> = {
	'USA': 'US',
	'AUS': 'AU',
	'GBR': 'GB',
	'CAN': 'CA',
	'DEU': 'DE',
	'FRA': 'FR',
	'JPN': 'JP',
	'NZL': 'NZ',
	'IRL': 'IE',
	'ITA': 'IT',
	'ESP': 'ES',
	'NLD': 'NL',
	'BEL': 'BE',
	'SWE': 'SE',
	'NOR': 'NO',
	'DNK': 'DK',
	'FIN': 'FI',
	'CHE': 'CH',
	'AUT': 'AT',
	'SGP': 'SG',
	'ZAF': 'ZA',
	'BRA': 'BR',
	'MEX': 'MX',
	'IND': 'IN',
	'CHN': 'CN',
	'UK': 'GB',
};

/**
 * Resolves a normalized ISO 3166-1 alpha-2 country code.
 *
 * @param countryCode - Raw country or region input
 * @returns 2-letter uppercase country code, or 'US' default
 */
export function normalizeCountryCode(countryCode?: string): string {
	if (!isString(countryCode) || !countryCode) return 'US';
	const raw = countryCode.trim().toUpperCase();

	// Check direct alpha-3 / alias map
	if (ALPHA3_TO_ALPHA2[raw]) return ALPHA3_TO_ALPHA2[raw]!;

	// Handle locale tags like 'en-AU' or subdivision like 'AU-NSW'
	if (raw.includes('-')) {
		const parts = raw.split('-');
		const countryPart = parts.find(p => p.length === 2) ?? parts[0]!;
		const norm = countryPart.toUpperCase();
		return ALPHA3_TO_ALPHA2[norm] ?? norm.slice(0, 2);
	}

	return raw.slice(0, 2);
}

/**
 * Synchronously retrieves or generates the holiday calendar for a year and country.
 *
 * @param year - 4-digit calendar year
 * @param options - Holiday configuration options
 * @returns Array of holiday items
 */
export function getCalendarHolidays(year: number, options: HolidayOptions = {}): HolidayItem[] {
	const country = normalizeCountryCode(options.country);
	const region = options.region;
	const includeObserved = options.includeObserved ?? true;
	const cacheKey = `${year}-${country}-${region ?? 'ALL'}-${includeObserved}`;

	let list = cache.get(cacheKey);
	if (!list) {
		if (hasBuiltinCalendar(country)) {
			const generator = BUILTIN_CALENDARS[country] ?? generateUsHolidays;
			list = generator(year, region, includeObserved);
		} else {
			// Check memory registry from previous preload
			const dynKey = `${year}_${country}`;
			let items = dynamicHolidays.get(dynKey);

			// Check storage cache
			if (!items) {
				const storageKey = `_magma_holidays_${year}_${country}`;
				const stored = getStorage<HolidayItem[]>(storageKey);
				if (stored && Array.isArray(stored) && stored.length > 0) {
					items = stored;
					dynamicHolidays.set(dynKey, items);
				}
			}

			if (items) {
				const normRegion = region ? region.toUpperCase().replace(/^[A-Z]{2}-/, '') : undefined;
				list = normRegion
					? items.filter(item => !item.region || item.region.toUpperCase().replace(/^[A-Z]{2}-/, '') === normRegion)
					: items;
			} else {
				// Fallback to default US generator if neither built-in nor preloaded
				const generator = generateUsHolidays;
				list = generator(year, region, includeObserved);
			}
		}
		cache.set(cacheKey, list);
	}

	if (options.customHolidays && options.customHolidays.length > 0) {
		const customItems: HolidayItem[] = options.customHolidays.map(date => ({
			date,
			name: 'Custom Holiday',
			country,
			region,
		}));
		return [...list, ...customItems].sort((a, b) => a.date.localeCompare(b.date));
	}

	return list;
}

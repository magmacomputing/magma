import { isString } from '@magmacomputing/tempo/library';
import { getStorage, setStorage } from './cache.js';
import { getPublicHolidays, type PublicHoliday } from '@magmacomputing/tempo-fns';
import { getCalendarHolidays, normalizeCountryCode, registerHolidayItems, hasBuiltinCalendar } from './registry.js';
import type { HolidayItem, HolidayOptions } from './types.js';

const STORAGE_PREFIX = '_magma_holidays_';
const TTL_24_HOURS = 24 * 60 * 60 * 1000;

/**
 * Preloads and caches holiday data for a specified year and country.
 * - Built-in countries evaluate synchronously and populate storage cache.
 * - Long-tail countries (100+ supported via tempo-fns / Nager.Date API) are fetched asynchronously,
 *   stored with a 24-hour TTL, and registered in the synchronous holiday evaluation registry.
 *
 * @param year - 4-digit calendar year
 * @param countryOrOptions - Country code string or HolidayOptions
 * @returns Promise resolving to the holiday items array
 */
export async function preloadHolidayCalendar(
	year: number,
	countryOrOptions?: string | HolidayOptions
): Promise<HolidayItem[]> {
	const options: HolidayOptions = isString(countryOrOptions)
		? { country: countryOrOptions }
		: countryOrOptions ?? {};

	const country = normalizeCountryCode(options.country);
	const region = options.region;
	const storageKey = `${STORAGE_PREFIX}${year}_${country}`;

	// 1. Built-in country calendar: evaluate and cache in storage
	if (hasBuiltinCalendar(country)) {
		const items = getCalendarHolidays(year, options);
		setStorage(storageKey, items, { ttl: TTL_24_HOURS });
		return items;
	}

	// 2. Check storage cache
	const cached = getStorage<HolidayItem[]>(storageKey);
	if (cached && Array.isArray(cached) && cached.length > 0) {
		registerHolidayItems(year, country, cached);
		return filterByRegion(cached, region);
	}

	// 3. Dynamic fetch via getPublicHolidays from @magmacomputing/tempo-fns
	try {
		const rawHolidays: PublicHoliday[] = await getPublicHolidays(year, country);
		const items: HolidayItem[] = (rawHolidays || []).map((h: PublicHoliday) => ({
			date: h.date,
			name: h.name || h.localName,
			country: h.countryCode,
			region: h.counties && h.counties.length > 0 ? h.counties[0] : undefined,
		}));

		// Cache in persistent runtime storage with 24-hour TTL
		setStorage(storageKey, items, { ttl: TTL_24_HOURS });

		// Register in memory registry for zero-latency synchronous queries
		registerHolidayItems(year, country, items);

		return filterByRegion(items, region);
	} catch (error) {
		// Fallback to offline US calendar or existing cache if network fails
		const fallbackItems = getCalendarHolidays(year, options);
		return fallbackItems;
	}
}

function filterByRegion(items: HolidayItem[], region?: string): HolidayItem[] {
	if (!region) return items;
	const normRegion = region.toUpperCase().replace(/^[A-Z]{2}-/, '');
	return items.filter(item => !item.region || item.region.toUpperCase().replace(/^[A-Z]{2}-/, '') === normRegion);
}

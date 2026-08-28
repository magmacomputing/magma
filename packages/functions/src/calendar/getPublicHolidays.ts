import { fetchWithTimeout, getLocale, getTemporal } from '../support/index.js';

const holidayURL = 'https://date.nager.at/api/v3/PublicHolidays';

/** Represents a public holiday payload returned from the Nager.Date API. */
export type PublicHoliday = {
	date: string;
	localName: string;
	name: string;
	countryCode: string;
	fixed: boolean;
	global: boolean;
	counties: string[] | null;
	launchYear: number | null;
	types: string[];
}

const holidaysCache = new Map<string, PublicHoliday[]>();

/**
 * Fetches public holidays for a given year and region from the Nager.Date API.
 * Results are cached per year and region to minimize network requests.
 *
 * @param year - The year to fetch holidays for (defaults to current year)
 * @param region - The ISO 3166-1 alpha-2 country code (defaults to system locale region or 'US')
 * @returns A promise resolving to an array of public holiday objects
 * @throws {Error} If the region code is invalid or the API request fails
 * @example
 * ```ts
 * const holidays = await getPublicHolidays(2024, 'US');
 * ```
 */
export const getPublicHolidays = async (
	year: number = getTemporal().Now.plainDateISO().year,
	region?: string
): Promise<PublicHoliday[]> => {
	const resolvedRegion = region || getLocale().region || 'US';
	const cacheKey = `${year}-${resolvedRegion}`;

	if (holidaysCache.has(cacheKey)) return holidaysCache.get(cacheKey)!;

	// Nager.Date expects a 2-letter ISO 3166-1 alpha-2 country code (e.g. 'US', not 'en-US' or 'US-NY').
	// If a subdivision like 'AU-NSW' is provided, we extract the country code 'AU'.
	const countryCode = resolvedRegion.split('-')[0].toUpperCase();

	if (!/^[A-Z]{2}$/.test(countryCode))
		throw new Error(`[functions] Invalid region code: '${resolvedRegion}'. Expected a 2-letter ISO 3166-1 country code.`);

	const response = await fetchWithTimeout(`${holidayURL}/${year}/${countryCode}`, 2000);
	if (!response.ok)
		throw new Error(`[functions] Failed to fetch holidays: HTTP ${response.status} ${response.statusText}`);
	const data = await response.json();

	holidaysCache.set(cacheKey, data);
	return data;
}

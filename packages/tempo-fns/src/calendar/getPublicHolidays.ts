import { fetchWithTimeout } from '../support/fetch.js';
import { getLocale } from '../support/intl.js';

export const holidayURL = 'https://date.nager.at/api/v3/PublicHolidays';

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
 */
export const getPublicHolidays = async (
	year: number = Temporal.Now.plainDateISO().year,
	region?: string
): Promise<PublicHoliday[]> => {
	const resolvedRegion = region || getLocale().region || 'US';
	const cacheKey = `${year}-${resolvedRegion}`;

	if (holidaysCache.has(cacheKey)) return holidaysCache.get(cacheKey)!;

	// Nager.Date expects a 2-letter ISO 3166-1 alpha-2 country code (e.g. 'US', not 'en-US' or 'US-NY').
	// If a subdivision like 'AU-NSW' is provided, we extract the country code 'AU'.
	const countryCode = resolvedRegion.split('-')[0].toUpperCase();
	
	const response = await fetchWithTimeout(`${holidayURL}/${year}/${countryCode}`, 2000);
	const data = await response.json();

	holidaysCache.set(cacheKey, data);
	return data;
}

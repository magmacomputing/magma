/**
 * Represents an individual public or bank holiday item.
 */
export interface HolidayItem {
	/** ISO date string of the holiday in YYYY-MM-DD format */
	readonly date: string;
	/** Standard human-readable name of the holiday */
	readonly name: string;
	/** Native or regional language name of the holiday (optional) */
	readonly localName?: string | undefined;
	/** ISO 3166-1 alpha-2 country code (e.g., 'US', 'AU', 'GB') */
	readonly country: string;
	/** Optional subdivision / state / province code (e.g., 'NSW', 'CA', 'ON') */
	readonly region?: string | undefined;
	/** True if this is an observed holiday date shifted from a weekend */
	readonly isObserved?: boolean | undefined;
}

/**
 * Configuration options for evaluating public holidays and business days.
 */
export interface HolidayOptions {
	/** ISO 3166-1 alpha-2 country code (e.g. 'US', 'AU', 'GB') */
	country?: string | undefined;
	/** State, province, or subdivision code (e.g. 'AU-NSW', 'US-NY', 'NSW', 'NY') */
	region?: string | undefined;
	/** Additional custom holiday dates (YYYY-MM-DD strings) to treat as non-working days */
	customHolidays?: string[] | undefined;
	/** Whether to include shifted weekend-observed dates (default: true) */
	includeObserved?: boolean | undefined;
}

/**
 * Configuration options for calculating working business hours.
 */
export interface WorkingHoursOptions extends HolidayOptions {
	/** Start hour for the working day (0-23, default: 9) */
	startHour?: number | undefined;
	/** End hour for the working day (0-23, default: 17) */
	endHour?: number | undefined;
}

/**
 * Signature for a synchronous country-specific holiday generator function.
 *
 * @internal
 */
export type HolidayCalendarGenerator = (year: number, region?: string, includeObserved?: boolean) => HolidayItem[];

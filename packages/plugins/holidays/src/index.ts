import { definePlugin, type TempoPlugin } from '@magmacomputing/tempo/plugin/sdk';
import type { Tempo } from '@magmacomputing/tempo';
import {
	isPublicHoliday,
	isBusinessDay,
	getHolidayName,
	getYearHolidays,
	nextBusinessDay,
	prevBusinessDay,
	addBusinessDays,
	businessDaysBetween,
	workingHoursBetween,
	resolveHolidayOptions,
} from './engine.js';
import { normalizeCountryCode } from './registry.js';
import { preloadHolidayCalendar } from './preload.js';
import type { HolidayItem, HolidayOptions, WorkingHoursOptions, HolidayCalendarGenerator } from './types.js';

import { isString } from '@magmacomputing/tempo/library';

export {
	isPublicHoliday,
	isBusinessDay,
	getHolidayName,
	getYearHolidays,
	nextBusinessDay,
	prevBusinessDay,
	addBusinessDays,
	businessDaysBetween,
	workingHoursBetween,
	normalizeCountryCode,
	preloadHolidayCalendar,
};

export type {
	HolidayItem,
	HolidayOptions,
	WorkingHoursOptions,
	HolidayCalendarGenerator,
};

/**
 * Normalizes input country string or options object.
 */
function normalizeOptionsArg(arg?: string | HolidayOptions): HolidayOptions {
	return (isString(arg)) ? { country: arg } : arg ?? {};
}

/**
 * Instance-level namespace providing holiday evaluation and business day arithmetic for a Tempo instance.
 */
export interface TempoHolidaysNamespace {
	/** Name of the active public holiday on this date, or null */
	readonly name: string | null;
	/** Array of public holidays occurring in the current calendar year */
	readonly list: readonly HolidayItem[];
	/** Resolved ISO 3166-1 country code */
	readonly country: string;
	/** Resolved subdivision or state code */
	readonly region?: string | undefined;

	/**
	 * Determines whether the current date is a recognized public holiday in `t.geo.country`.
	 *
	 * @param countryOrOptions - Optional ISO country code string or configuration options
	 * @returns True if the date is a public holiday
	 */
	isHoliday(countryOrOptions?: string | HolidayOptions): boolean;

	/**
	 * Determines whether the current date is a working business day (Mon-Fri and not a holiday).
	 *
	 * @param countryOrOptions - Optional ISO country code string or configuration options
	 * @returns True if the date is a working business day
	 */
	isBusinessDay(countryOrOptions?: string | HolidayOptions): boolean;

	/**
	 * Returns the next valid business day, advancing past weekends and public holidays.
	 *
	 * @param countryOrOptions - Optional ISO country code string or configuration options
	 * @returns A new Tempo instance on the next business day
	 */
	nextBusinessDay(countryOrOptions?: string | HolidayOptions): Tempo;

	/**
	 * Returns the previous valid business day, stepping backward past weekends and public holidays.
	 *
	 * @param countryOrOptions - Optional ISO country code string or configuration options
	 * @returns A new Tempo instance on the previous business day
	 */
	prevBusinessDay(countryOrOptions?: string | HolidayOptions): Tempo;

	/**
	 * Adds or subtracts N business days, skipping weekends and public holidays.
	 *
	 * @param amount - Number of business days to add (positive) or subtract (negative)
	 * @param countryOrOptions - Optional ISO country code string or configuration options
	 * @returns A new Tempo instance advanced or rewound by N business days
	 */
	addBusinessDays(amount: number, countryOrOptions?: string | HolidayOptions): Tempo;

	/**
	 * Calculates the number of working business days between this instance and the target date.
	 *
	 * @param target - The ending Tempo instance
	 * @param countryOrOptions - Optional ISO country code string or configuration options
	 * @returns Number of business days
	 */
	businessDaysUntil(target: Tempo, countryOrOptions?: string | HolidayOptions): number;

	/**
	 * Calculates the exact number of SLA-eligible working hours between this instance and the target date.
	 * Excludes weekends and recognized holidays according to instance/options country rules.
	 *
	 * @param target - The ending Tempo instance (deadline)
	 * @param options - Working hours boundaries and holiday configuration
	 * @returns Total business working hours
	 */
	workingHoursUntil(target: Tempo, options?: WorkingHoursOptions): number;

	/**
	 * Preloads and caches holiday data for this instance's country and year in runtime storage.
	 *
	 * @param year - Optional year to preload (defaults to current year)
	 * @returns Promise resolving to the holiday items array
	 */
	preload(year?: number): Promise<HolidayItem[]>;
}

/**
 * Static namespace attached to the Tempo constructor for global holiday queries and caching.
 */
export interface TempoStaticHolidaysNamespace {
	readonly preload: (year: number, countryOrOptions?: string | HolidayOptions) => Promise<HolidayItem[]>;
	readonly getYearHolidays: (year: number, options?: HolidayOptions) => HolidayItem[];
	readonly isPublicHoliday: (tempo: Tempo, options?: HolidayOptions) => boolean;
	readonly isBusinessDay: (tempo: Tempo, options?: HolidayOptions) => boolean;
	readonly getHolidayName: (tempo: Tempo, options?: HolidayOptions) => string | null;
	readonly nextBusinessDay: (tempo: Tempo, options?: HolidayOptions) => Tempo;
	readonly prevBusinessDay: (tempo: Tempo, options?: HolidayOptions) => Tempo;
	readonly addBusinessDays: (tempo: Tempo, amount: number, options?: HolidayOptions) => Tempo;
	readonly businessDaysBetween: (start: Tempo, end: Tempo, options?: HolidayOptions) => number;
	readonly workingHoursBetween: (start: Tempo, end: Tempo, options?: WorkingHoursOptions) => number;
	readonly normalizeCountryCode: (countryCode?: string) => string;
}

/**
 * The Regional Holidays Plugin for Tempo.
 *
 * Provides zero-latency national bank holiday resolution, business day calculations,
 * and working day arithmetic linked to `t.geo.country` under the `t.holidays` namespace.
 */
export const HolidaysPlugin: TempoPlugin = definePlugin({
	name: 'holidays',
	install(TempoClass: any) {
		const staticNamespace: TempoStaticHolidaysNamespace = {
			preload: preloadHolidayCalendar,
			getYearHolidays,
			isPublicHoliday,
			isBusinessDay,
			getHolidayName,
			nextBusinessDay,
			prevBusinessDay,
			addBusinessDays,
			businessDaysBetween,
			workingHoursBetween,
			normalizeCountryCode,
		};

		if (!Object.hasOwn(TempoClass, 'holidays')) {
			Object.defineProperty(TempoClass, 'holidays', {
				value: Object.freeze(staticNamespace),
				writable: false,
				configurable: false,
				enumerable: false,
			});
		}

		if (!Object.hasOwn(TempoClass.prototype, 'holidays')) {
			Object.defineProperty(TempoClass.prototype, 'holidays', {
				get(this: Tempo): TempoHolidaysNamespace {
					const instance = this;
					const opts = resolveHolidayOptions(instance);
					const name = getHolidayName(instance, opts);
					const list = getYearHolidays(instance.yy, opts);
					const country = normalizeCountryCode(opts.country);

					return Object.freeze({
						name,
						list: Object.freeze(list),
						country,
						region: opts.region,
						isHoliday: (countryOrOptions?: string | HolidayOptions) => {
							const callOpts = normalizeOptionsArg(countryOrOptions);
							return isPublicHoliday(instance, callOpts);
						},
						isBusinessDay: (countryOrOptions?: string | HolidayOptions) => {
							const callOpts = normalizeOptionsArg(countryOrOptions);
							return isBusinessDay(instance, callOpts);
						},
						nextBusinessDay: (countryOrOptions?: string | HolidayOptions) => {
							const callOpts = normalizeOptionsArg(countryOrOptions);
							return nextBusinessDay(instance, callOpts);
						},
						prevBusinessDay: (countryOrOptions?: string | HolidayOptions) => {
							const callOpts = normalizeOptionsArg(countryOrOptions);
							return prevBusinessDay(instance, callOpts);
						},
						addBusinessDays: (amount: number, countryOrOptions?: string | HolidayOptions) => {
							const callOpts = normalizeOptionsArg(countryOrOptions);
							return addBusinessDays(instance, amount, callOpts);
						},
						businessDaysUntil: (target: Tempo, countryOrOptions?: string | HolidayOptions) => {
							const callOpts = normalizeOptionsArg(countryOrOptions);
							return businessDaysBetween(instance, target, callOpts);
						},
						workingHoursUntil: (target: Tempo, options?: WorkingHoursOptions) => {
							return workingHoursBetween(instance, target, options);
						},
						preload: (year?: number) => {
							return preloadHolidayCalendar(year ?? instance.yy, resolveHolidayOptions(instance));
						},
					});
				},
				enumerable: false,
				configurable: true,
			});
		}
	},
});

export default HolidaysPlugin;

declare module '@magmacomputing/tempo' {
	interface Tempo {
		/**
		 * Accesses the Regional Holidays namespace for the current Tempo instance.
		 */
		readonly holidays: TempoHolidaysNamespace;
	}

	namespace Tempo {
		let holidays: TempoStaticHolidaysNamespace;
	}
}

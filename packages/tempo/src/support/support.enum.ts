import { sym } from './support.symbol.js';
import { enumify, Enum } from '#library/enumerate.library.js';
import { proxify } from '#library/proxy.library.js';
import { allDescriptors } from '#library/reflection.library.js';
import { looseIndex } from '#library/object.library.js';
import type { OwnOf, KeyOf, ValueOf, LooseUnion } from '#library/type.library.js';

/** calendar seasons */
export const SEASON = enumify({
	/** Spring season */ Spring: 'spring',
	/** Summer season */ Summer: 'summer',
	/** Autumn season */ Autumn: 'autumn',
	/** Winter season */ Winter: 'winter'
}, false);
export type SEASON = ValueOf<typeof SEASON>

/** cardinal directions */
export const COMPASS = looseIndex<string, string>()(enumify({
	/** North direction */ North: 'north',
	/** South direction */ South: 'south',
	/** East direction */ East: 'east',
	/** West direction */ West: 'west'
}, false));
export type COMPASS = ValueOf<typeof COMPASS>

/**
 * Various enumerations used throughout Tempo library.
 * These are exported and added as static getters of the Tempo class.
 */

/** @internal LIVE state for all registries */
export const DEFAULTS = {
	NUMBER: {
		/** number value 0 */ zero: 0,
		/** number value 1 */ one: 1,
		/** number value 2 */ two: 2,
		/** number value 3 */ three: 3,
		/** number value 4 */ four: 4,
		/** number value 5 */ five: 5,
		/** number value 6 */ six: 6,
		/** number value 7 */ seven: 7,
		/** number value 8 */ eight: 8,
		/** number value 9 */ nine: 9,
		/** number value 10 */ ten: 10
	},
	DURATION: {
		/** approx number of seconds in a year */								year: 31_536_000,
		/** approx number of seconds in a month */							month: 2_628_000,
		/** number of seconds in a week */											week: 604_800,
		/** number of seconds in a day */												day: 86_400,
		/** number of seconds in an hour */											hour: 3_600,
		/** number of seconds in a minute */										minute: 60,
		/** one second */																				second: 1,
		/** number of seconds in a millisecond */								millisecond: .001,
		/** number of seconds in a microsecond */								microsecond: .000_001,
		/** number of seconds in a nanosecond */								nanosecond: .000_000_001,
	},
	TIMEZONE: {
		/** Coordinated Universal Time */ 'utc': 'UTC',
		/** Greenwich Mean Time */ 'gmt': 'UTC',
		/** Eastern Standard Time */ 'est': 'America/New_York',
		/** Eastern Daylight Time */ 'edt': 'America/New_York',
		/** Central Standard Time */ 'cst': 'America/Chicago',
		/** Central Daylight Time */ 'cdt': 'America/Chicago',
		/** Mountain Standard Time */ 'mst': 'America/Denver',
		/** Mountain Daylight Time */ 'mdt': 'America/Denver',
		/** Pacific Standard Time */ 'pst': 'America/Los_Angeles',
		/** Pacific Daylight Time */ 'pdt': 'America/Los_Angeles',
		/** Australian Eastern Standard Time */ 'aest': 'Australia/Sydney',
		/** Australian Eastern Daylight Time */ 'aedt': 'Australia/Sydney',
		/** Australian Central Standard Time */ 'acst': 'Australia/Adelaide',
		/** Australian Central Daylight Time */ 'acdt': 'Australia/Adelaide',
		/** Australian Western Standard Time */ 'awst': 'Australia/Perth',
		/** New Zealand Time */ 'nzt': 'Pacific/Auckland',
		/** New Zealand Standard Time */ 'nzst': 'Pacific/Auckland',
		/** New Zealand Daylight Time */ 'nzdt': 'Pacific/Auckland',
		/** Central European Time */ 'cet': 'Europe/Paris',
		/** Central European Summer Time */ 'cest': 'Europe/Paris',
		/** Eastern European Time */ 'eet': 'Europe/Helsinki',
		/** Eastern European Summer Time */ 'eest': 'Europe/Helsinki',
		/** India Standard Time */ 'ist': 'Asia/Kolkata',
		/** Nepal Time */ 'npt': 'Asia/Kathmandu',
		/** Japan Standard Time */ 'jst': 'Asia/Tokyo',
	},
	DURATIONS: {
		/** approx number of milliseconds in a year */					years: 31_536_000_000,
		/** approx number of milliseconds in a month */					months: 2_628_000_000,
		/** number of milliseconds in a week */									weeks: 604_800_000,
		/** number of milliseconds in a day */									days: 86_400_000,
		/** number of milliseconds in an hour */								hours: 3_600_000,
		/** number of milliseconds in a minute */								minutes: 60_000,
		/** number of milliseconds in a second */								seconds: 1_000,
		/** one millisecond */																	milliseconds: 1,
		/** number of milliseconds in a microsecond */					microseconds: .001,
		/** number of milliseconds in a nanosecond */						nanoseconds: .000_001,
	},
	FORMAT: {
		/** useful for standard date display */									display: '{www}, {dd} {mmm} {yyyy}',
		/** useful for standard datestamps */										weekDate: '{www}, {yyyy}-{mmm}-{dd}',
		/** useful for standard timestamps */										weekTime: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}',
		/** useful for standard full timestamps */							weekStamp: '{www}, {yyyy}-{mmm}-{dd} {hh}:{mi}:{ss}.{ff}',
		/** useful for readable month and day */								dayMonth: '{dd}-{mmm}',
		/** useful for readable year, month and day */					dayDate: '{dd}-{mmm}-{yyyy}',
		/** display with Time */																dayTime: '{dd}-{mmm}-{yyyy} {hh}:{mi}:{ss}',
		/** useful for stamping logs */													logStamp: '{ymd}T{hms}.{ff}',
		/** useful for sorting display-strings */								sortTime: '{yyyy}-{mm}-{dd} {hh}:{mi}:{ss}',
		/** useful for sorting week order */										yearWeek: '{yw}{wy}',
		/** useful for sorting month order */										yearMonth: '{yyyy}{mm}',
		/** useful for sorting date order */										yearMonthDay: '{ymd}',
		/** just Date portion */																date: '{yyyy}-{mm}-{dd}',
		/** just Time portion */																time: '{hh}:{mi}:{ss}',
	},
	LIMIT: {
		/** Tempo(31-Dec-9999.23:59:59).ns */										get maxTempo() { return Temporal.Instant.from('9999-12-31T23:59:59.999999999+00:00').epochNanoseconds },
		/** Tempo(01-Jan-1000.00:00:00).ns */										get minTempo() { return Temporal.Instant.from('1000-01-01T00:00+00:00').epochNanoseconds },
	},
	MONTH_DAY: {
		/** supported locales for month-day disambiguation */ locales: ['en-US', 'en-AS'],
		/** layout patterns for month-day parsing */ layouts: [['dayMonthYearShort', 'monthDayYearShort'], ['dayMonthYear', 'monthDayYear']],
		/** timezone mappings for locale-based month-day ordering */ timezones: {
			/** US timezones that use month/day/year format */ 'en-US': [
				"America/Adak", "America/Anchorage", "America/Boise", "America/Chicago", "America/Denver",
				"America/Detroit", "America/Indiana/Indianapolis", "America/Indiana/Knox", "America/Indiana/Marengo",
				"America/Indiana/Petersburg", "America/Indiana/Tell_City", "America/Indiana/Vevay", "America/Indiana/Vincennes",
				"America/Indiana/Winamac", "America/Indianapolis", "America/Juneau", "America/Kentucky/Louisville",
				"America/Kentucky/Monticello", "America/Los_Angeles", "America/Louisville", "America/Menominee",
				"America/Metlakatla", "America/New_York", "America/Nome", "America/North_Dakota/Beulah",
				"America/North_Dakota/Center", "America/North_Dakota/New_Salem", "America/Phoenix", "America/Sitka",
				"America/Yakutat", "Pacific/Honolulu",
				"US/Aleutian", "US/Alaska", "US/Arizona", "US/Central", "US/Eastern", "US/Mountain", "US/Pacific",
			],
			/** American Samoa timezones */ 'en-AS': [
				"Pacific/Pago_Pago"
			]
		}
	},
	LOCALE: {} as Record<string, Record<string, string | Function>>,
} as const;

/** @internal Centralized mutable state for all extendable registries */
export const STATE = {
	NUMBER: allDescriptors(DEFAULTS.NUMBER),
	DURATION: allDescriptors(DEFAULTS.DURATION),
	TIMEZONE: allDescriptors(DEFAULTS.TIMEZONE),
	DURATIONS: allDescriptors(DEFAULTS.DURATIONS),
	FORMAT: allDescriptors(DEFAULTS.FORMAT),
	LIMIT: allDescriptors(DEFAULTS.LIMIT),
	MONTH_DAY: allDescriptors(DEFAULTS.MONTH_DAY),
	LOCALE: allDescriptors(DEFAULTS.LOCALE),
}

const defineExtensible = (target: any) => Object.defineProperty(target, sym.$Extensible, { value: true, enumerable: false, configurable: false, writable: false });
defineExtensible(STATE.NUMBER);
defineExtensible(STATE.FORMAT);
defineExtensible(STATE.TIMEZONE);
defineExtensible(STATE.DURATION);
defineExtensible(STATE.DURATIONS);
defineExtensible(STATE.MONTH_DAY);
defineExtensible(STATE.LOCALE);

/** Gregorian calendar week-days (short-form) */
export const WEEKDAY = enumify(['All', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
/** Gregorian calendar week-days (long-form) */
export const WEEKDAYS = enumify(['Everyday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

export type WEEKDAY = KeyOf<typeof WEEKDAY>
export type Weekday = ValueOf<typeof WEEKDAY>
export type WEEKDAYS = KeyOf<typeof WEEKDAYS>
export type Weekdays = ValueOf<typeof WEEKDAYS>

/** Gregorian calendar months (short-form) */
export const MONTH = enumify(['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
/** Gregorian calendar months (long-form) */
export const MONTHS = enumify(['Every', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);

export type MONTH = KeyOf<typeof MONTH>
export type Month = ValueOf<typeof MONTH>
export type MONTHS = KeyOf<typeof MONTHS>
export type Months = ValueOf<typeof MONTHS>

/** number names (0-10) */
export const NUMBER = looseIndex<string, number>()(enumify(STATE.NUMBER, false));
export type NUMBER = typeof NUMBER;
export type Number = KeyOf<typeof NUMBER>

/** common time-zone aliases */
export const TIMEZONE = looseIndex<string, string>()(proxify(STATE.TIMEZONE, true, false));
export type TIMEZONE = typeof TIMEZONE;
export type Timezone = ValueOf<typeof TIMEZONE>

/** number of seconds in a time unit */
export const DURATION = enumify(STATE.DURATION, false);
export type DURATION = KeyOf<typeof DURATION>

/** number of milliseconds in a time unit */
export const DURATIONS = enumify(STATE.DURATIONS, false);
export type DURATIONS = KeyOf<typeof DURATIONS>

/** common format aliases */
export const FORMAT = looseIndex<string, string>()(enumify(STATE.FORMAT, false));
export type FORMAT = typeof FORMAT;
export type Format = LooseUnion<KeyOf<typeof FORMAT> & string>

/** mapping of format names to instance-resolutions */
export type Formats = {
	[K in keyof OwnOf<typeof FORMAT>]: string;
} & Record<string, string>;

/** Enum registry of format strings */
export type FormatEnum = Enum.wrap<Formats>;

/** Temporal limits (min/max date bounds) */
export const LIMIT = proxify(STATE.LIMIT, true, false);

/** regional month-day-year parsing settings */
export const MONTH_DAY = proxify(STATE.MONTH_DAY, true, false);

/** localized dictionary translations */
export const LOCALE = proxify(STATE.LOCALE, true, true);

/** date-time element tokens */
const elementKeys = ['yy', 'mm', 'wy', 'ww', 'dd', 'hh', 'mi', 'ss', 'ms', 'us', 'ns'] as const;
export const ELEMENT = enumify({
	/** Year element */ yy: 'year',
	/** Month element */ mm: 'month',
	/** ISO week number element */ wy: 'week',
	/** Week element */ ww: 'week',
	/** Day element */ dd: 'day',
	/** Hour element */ hh: 'hour',
	/** Minute element */ mi: 'minute',
	/** Second element */ ss: 'second',
	/** Millisecond element */ ms: 'millisecond',
	/** Microsecond element */ us: 'microsecond',
	/** Nanosecond element */ ns: 'nanosecond',
}, false);
export type ELEMENT = ValueOf<typeof ELEMENT>
export type Element = KeyOf<typeof ELEMENT>

/** allowed mutation keys for .set() and .add() */
const mutationKeys = [...elementKeys, 'event', 'period', 'clock', 'time', 'date', 'start', 'mid', 'end'] as const;
export const MUTATION = enumify(mutationKeys, false);
export type MUTATION = ValueOf<typeof MUTATION>
export type Mutation = KeyOf<typeof MUTATION>

/** allowed keys for ZonedDateTime-like objects */
const zonedDateTimeKeys = ['value', 'timeZoneId', 'calendarId', 'monthCode', 'offset', 'timeZone', 'calendar', 'year', 'month', 'day', 'hour', 'minute', 'second', ...elementKeys] as const;
export const ZONED_DATE_TIME = enumify(zonedDateTimeKeys, false);
export type ZONED_DATE_TIME = ValueOf<typeof ZONED_DATE_TIME>
export type ZonedDateTime = KeyOf<typeof ZONED_DATE_TIME>

/** allowed keys for Tempo configuration options */
const configKeys = ['config', 'parse', 'value', 'intl', 'store', 'discovery', 'debug', 'catch', 'silent', 'timeZone', 'calendar', 'locale', 'sphere', 'geo', 'latitude', 'lat', 'longitude', 'lng', 'timeStamp', 'registry', 'plugins', 'extends', 'cache'] as const;
export const CONFIG = enumify(configKeys, false);
export type Config = KeyOf<typeof CONFIG>

/** initialization strategies */
export const MODE = enumify({
	/** automatic initialization mode */ Auto: 'auto',
	/** strict initialization mode */ Strict: 'strict',
	/** deferred initialization mode */ Defer: 'defer',
}, false);
export type MODE = ValueOf<typeof MODE>

/** cache operation modes */
export const CACHE = enumify({
	/** cache disabled */ Off: false,
	/** cache enabled */ On: true,
	/** refresh cache */ Refresh: 'refresh',
}, false);
export type CACHE = ValueOf<typeof CACHE>

/** allowed keys for internal parse state */
const parseKeys = ['monthDay', 'planner', 'layoutOrder', 'preFilter', 'mode', 'pivot', 'snippet', 'layout', 'event', 'period', 'anchor'] as const;
export const PARSE = enumify(parseKeys, false);
export type Parse = KeyOf<typeof PARSE>

/** allowed keys for global discovery objects */
const discoveryKeys = ['options', 'extends', 'plugins', 'terms', 'timeZones', 'monthDay', 'intl', 'planner', 'numbers', 'formats', 'ignore'] as const;
export const DISCOVERY = enumify(discoveryKeys, false);
export type Discovery = KeyOf<typeof DISCOVERY>

/** @internal LIVE Registries mapping (STATE key -> Enum/Proxy) */
export const REGISTRIES: Record<string, any> = {
	NUMBER, DURATION, TIMEZONE, DURATIONS, FORMAT, LIMIT, MONTH_DAY, LOCALE
}

/** public-reachable enums */
export default {
	SEASON,
	COMPASS,
	WEEKDAY,
	WEEKDAYS,
	MONTH,
	MONTHS,
	NUMBER,
	TIMEZONE,
	DURATION,
	DURATIONS,
	FORMAT,
	LIMIT,
	ELEMENT,
	MUTATION,
	ZONED_DATE_TIME,
	CONFIG,
	MODE,
	CACHE,
	PARSE,
	MONTH_DAY,
	LOCALE,
}

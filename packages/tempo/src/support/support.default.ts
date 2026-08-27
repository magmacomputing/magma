import { looseIndex } from '#library/object.library.js';
import { secure, proxify } from '#library/proxy.library.js';
import { getDateTimeFormat } from '#library/international.library.js';
import { LOG } from '#library/logger.class.js';

import { NUMBER, TIMEZONE, MODE, MONTH_DAY, FORMAT, LOCALE } from './support.enum.js';
import { Token } from './support.symbol.js';
import type { Options, AliasContext, IntlOptions } from '../tempo.type.js';

/** characters allowed inside timezone/calendar brackets */
const bracket_content = /[^\]]+/;

// BE VERY CAREFUL NOT TO BREAK THE REGEXP PATTERNS BELOW
// TEMPO functionality heavily depends on these patterns
/** @internal Tempo Match patterns */
export const Match = proxify({
	/** match all {} pairs, if they start with a word char */	braces: /{([#]?[\w]+(?:\.[\w]+)*)}/g,
	/** match {} pairs for formatting, allowing optional chained :modifiers */	formatBraces: /{([#]?[\w]+(?:\.[\w]+)*(?:\:[a-zA-Z]+)*)}/g,
	/** named capture-group, if it starts with a letter */		captures: /\(\?<([a-zA-Z][\w]*)>(.*?)(?<!\\)\)/g,
	/** event */																							event: /^evt\d+_\d+$/,
	/** period */																							period: /^per\d+_\d+$/,
	/** structural */																					named: /^g?dt$|^g?tm$/,
	/** two digit year */																			twoDigit: /^[0-9]{2}$/,
	/** date (ISO 8601) */																		date: /^(?:[+-][0-9]{6}|[0-9]{4})-?(?:0[1-9]|1[0-2])-?(?:0[1-9]|[12][0-9]|3[01])$/,
	/** time (hh:mi[:ss]) */																	time: /^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?|24:00(?::00)?$/,
	/** clock (hh:mi[:ss][.ffffff]) */												clock: /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\.\d{1,9})?|24:00(?::00)?(?:\.0{1,9})?$/,
	/** separator characters (/ - . , T) */										separator: /[T\/\-\.\s,]/,
	/** modifier characters (+-<>=) */												modifier: /[\+\-\<\>][\=]?/,
	/** strip out these characters from a string */						strips: /\(|\)/g,
	/** whitespace characters */															spaces: /\s+/g,
	/** Z character */																				zed: /^Z$/,
	/** base guard characters (digits and common symbols) */	guard: /[\d\s\-\.\:T\/Z\+\-\(\)\,\=\#\<\>]/i,
	/** bracketed content (timezone/calendar) */							bracket: /\[[^\]]+\]/i,
	/** slick shorthand-shifter (e.g. #qtr.>2q2) */						shorthand: /(?:(?:#[\w]+|[\w]+)\.(?:[\+\-\<\>]=?)?(?:[0-9]+)?(?:[\w]*))/,
	/** anchored version for shifter resolution */						slick: /^(?<sh_term>#[\w]+|[\w]+)\.(?<sh_mod>[\+\-\<\>\=]=?)?(?<sh_nbr>-?[0-9]+)?(?<sh_unit>[\w]*)$/,
	/** extracted value-only version of a slick shifter */		slickValue: /^(?<sh_mod>[\+\-\<\>\=]=?)?(?<sh_nbr>-?[0-9]+)?(?<sh_unit>[\w]*)$/,
	/** numeric timezone offset (e.g. +10:00, +1000, -05:00, -0500, GMT+10, UTC-5) */					offset: /(?:[+-]\d{2}:\d{2}|[+-]\d{4}|(?<=\s|T|GMT|UTC)\s*[+-]\d{1,2}(?::?\d{2})?)/,
	/** escape special regex characters in a string */				escape: (str: string) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
	/** escape only dangerous quantifiers and anchors to prevent backtracking/injection while allowing basic regex */
	safeAlias: (str: string) => String(str).replace(/[*+{}!^$\\]/g, '\\$&'),
	/** numeric-only string detection */											numeric: /^\s*[-+]?\d+(\.\d+)?\s*$/,
	/** match suspicious nested quantifiers (backtracking) */	backtrack: /(\(.*\)\+|\(.*\)\*|\(.*\)\{.*\})/,
}, true, false);

/**
 * user will need to know these in order to configure their own patterns  
 * Tempo.Snippet is a simple regex pattern object						e.g. { Symbol('yy'): /(([0-9]{2})?[0-9]{2})/ }    
 * Tempo.Layout is a string-combination of Snippet names		e.g. '{yy}{sep}{mm}({sep}{dd})?{sfx}?'  
 * Tempo.Pattern is a translation of a Layout/Snippets into an anchored regex.  
 * The {pattern} is used to parse a string | number in the Tempo constructor {DateTime} argument
 */

/**
 * a {snippet} is a simple, reusable regex pattern for a component of a date-time string (e.g. 'hh' or 'yy')  
 */
// Note: computed Components ('evt', 'per') are added during 'Tempo.init()' (for static) and/or 'new Tempo()' (per instance)
/** @internal Tempo Snippet registry */
export const Snippet = looseIndex<symbol, RegExp>()({
	[Token.yy]: /(?<yy>[0-9]{1,4})/,													// year must be 1 to 4 digits
	[Token.mm]: /(?<mm>Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|1[0-2]|[0 ]?[1-9])/,	// month-name (abbrev or full) or month-number 01-12; leading '0' or space only (not \s — tab/newline are not valid padding)
	[Token.ww]: /(?<ww>0?[1-9]|[1-4][0-9]|5[0-3])/,						// week-number 01-53
	[Token.dd]: /(?<dd>3[01]|[12][0-9]|[0 ]?[1-9]){ord}?/,		// day-number 01-31; leading '0' or space only (not \s — tab/newline are not valid padding)
	[Token.hh]: /(?<hh>2[0-4]|[01]?[0-9])/,										// hour 00-24; CAUTION: in non-anchored use '25' partially matches as '2' via [01]?[0-9] — always use within anchored layouts; single-digit hours (e.g. '9') are intentionally supported
	[Token.mi]: /(\:(?<mi>[0-5][0-9]))/,											// minute-number 00-59
	[Token.ss]: /(\:(?<ss>[0-5][0-9]))/,											// seconds-number 00-59
	[Token.ff]: /(\.(?<ff>[0-9]{1,9}))/,											// fractional-seconds up-to 9-digits
	[Token.ord]: /(?:\s?(?:st|nd|rd|th|e|er|re|ème|eme))?/i,	// optional ordinal suffix
	[Token.mer]: /(\s*(?<mer>am|pm))/,												// meridiem suffix (am,pm)
	[Token.sfx]: /((?:{sep}+|T)({tm}){tzd}?)/,								// time-pattern suffix 'T {tm} Z'; NOTE: {tm} resolves via Layout fallback in compileRegExp (cross-registry dependency: Snippet → Layout)
	[Token.wkd]: /(?<wkd>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)/,	// day-name (abbrev or full)
	[Token.tzd]: new RegExp(`\\s*(?:(?:GMT|UTC)(?=\\s*[+-]))?\\s*(?<tzd>Z|(?:${Object.keys(TIMEZONE).map(w => Match.escape(w.toUpperCase())).join('|')})|${Match.offset.source})`, 'i'),	// time-zone offset or abbreviation with optional GMT/UTC prefix (e.g. GMT+10, UTC+10:00, +10:00, AEST, PST)
	[Token.nbr]: new RegExp(`(?<nbr>[0-9]+|${Object.keys(NUMBER).map(w => Match.escape(w)).join('|')})`),	// modifier count; number-word keys are regex-escaped at construction time (setPatterns() also re-escapes, but defence-in-depth)
	[Token.afx]: new RegExp(`((s)? (?<afx>${Match.modifier.source}))?{sep}?`),	// affix optional plural 's' and (ago|hence)
	[Token.mod]: new RegExp(`((?<mod>${Match.modifier.source})? *)`),
	[Token.sep]: new RegExp(`(?:${Match.separator.source})`),	// date-input separator character "/\\-., " (non-capture group)
	[Token.unt]: /(?<unt>year|month|week|day|hour|minute|second|millisecond|microsecond|nanosecond)(?:s)?/,	// useful for '2 days ago' etc
	[Token.brk]: new RegExp(`(\\[(?<brk>${bracket_content.source})\\](?:\\[(?<cal>${bracket_content.source})\\])?)?`),	// timezone/calendar brackets [...]
	[Token.slk]: new RegExp(Match.shorthand.source),					// shorthand shifter
	[Token.era]: /(?:\s*(?<era>b\.?c\.?e\.?|c\.?e\.?|b\.?c\.?|a\.?d\.?))/i,	// historical era designation
	[Token.nth]: /(?<nth>(?:[0-9]{0,2}11th|[0-9]{0,2}12th|[0-9]{0,2}13th|[0-9]{0,2}[04-9]th|[0-9]{0,2}[02-9]1st|1st|[0-9]{0,2}[02-9]2nd|2nd|[0-9]{0,2}[02-9]3rd|3rd|[1-9][0-9]{0,2})|first|second|third|fourth|fifth|last)/i,	// ordinal index (1st, 2nd, 3rd, last, etc)
})
/** @internal Tempo Snippet type */
export type Snippet = typeof Snippet

/**
 * a {layout} is a Record of snippet-combinations describing an input DateTime argument  
 * the Layout's keys are in the order that they will be checked against an input value  
 */
/** @internal Layout components for date resolution */
export const datePattern = {
	dmy: '{mod}?(?:{dd}{sep}?{mm}({sep}?{yy})?|{evt}|(?<slk>{slk})|{wkd}){afx}?',
	mdy: '{mod}?(?:{mm}{sep}?{dd}({sep}?{yy})?|{evt}|(?<slk>{slk})|{wkd}){afx}?'
}

/** @internal Tempo Layout registry */
export const Layout = looseIndex<symbol, string>()({
	[Token.hms]: '(?<hh>(?:[01][0-9]|2[0-4]))(?<mi>[0-5][0-9])(?<ss>[0-5][0-9])',	// compact clock (hhmiss)
	[Token.dmy6]: '(?<dd>0[1-9]|[12][0-9]|3[01])(?<mm>0[1-9]|1[0-2])(?<yy>[0-9]{2})',// compact date (ddmmyy)
	[Token.mdy6]: '(?<mm>0[1-9]|1[0-2])(?<dd>0[1-9]|[12][0-9]|3[01])(?<yy>[0-9]{2})',// compact date (mmddyy)
	[Token.ymd6]: '(?<yy>[0-9]{2})(?<mm>0[1-9]|1[0-2])(?<dd>0[1-9]|[12][0-9]|3[01])',// compact date (yymmdd)
	[Token.ordWkd]: '{mod}?{nth}?{sep}+{wkd}(?:{sep}+(?:in|of))?{sep}+(?:{mm}(?:{sep}?{yy})?){afx}?{sfx}?',// ordinal weekday (e.g. 3rd Thursday of Nov 2026)
	[Token.ordUnt]: '{mod}?{nth}?{sep}+{unt}(?:{sep}+(?:in|of))?{sep}+(?:(?<yy>[0-9]{4})|{mm}(?:{sep}?(?<yy2>[0-9]{2,4}))?){afx}?{sfx}?',// ordinal unit (e.g. 1st day of May, 100th day of 2026)
	[Token.wkd]: '{mod}?{nbr}?{sep}?{wkd}{afx}?{sfx}?',				// weekday-only layout; MUST precede {dt} (which also matches bare weekday names via its {wkd} alternative)
	[Token.dt]: datePattern.dmy,															// calendar, event, slick or weekday
	[Token.tm]: '({hh}{mi}?{ss}?{ff}?{mer}?|{per})',					// clock or period
	[Token.dtm]: '({dt})(?:(?:{sep}+|T)({tm}))?{tzd}?{brk}?',	// calendar/event and clock/period
	[Token.tmd]: '({tm})(?:(?:{sep}+|T)({dt}))?{tzd}?{brk}?',	// clock/period and calendar/event
	[Token.dmy]: '{mod}?({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{era}?{afx}?{sfx}?{brk}?',// day-month(-year)
	[Token.mdy]: '{mod}?({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{era}?{afx}?{sfx}?{brk}?',// month-day(-year)
	[Token.ymd]: '{mod}?({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{era}?{afx}?{sfx}?{brk}?',// year-month(-day)
	[Token.off]: '{mod}?{dd}{afx}?',													// day of month, with optional offset
	[Token.rel]: '{nbr}{sep}?{unt}{sep}?{afx}',								// relative duration (e.g. 2 days ago)
	[Token.ye]: '{mod}?{yy}{era}',														// explicit year and era (e.g. 200 BC)
	[Token.ey]: '{mod}?{era}{sep}?{yy}',											// explicit leading era and year (e.g. BC 200)
})
/** @internal Tempo Layout type */
export type Layout = typeof Layout

/** 
 * an {event} is a Record of regex-pattern-like-string keys that describe Date strings.
 * values can be a string, or a function that resolves to a date-like value.
 * if assigning a function, use standard 'function()' syntax to allow for 'this' binding.
 * Event functions should resolve to the date side of parsing (for example a parse-able date string,
 * a ZonedDateTime, or a Tempo instance whose date component is meaningful to the caller).
 */
/** @internal Tempo Event registry */
export const Event = looseIndex<string, string | Function>()({
	/** New Year's Eve (December 31) */ 'new.?years? ?eve': '31 Dec',
	/** New Year's Eve abbreviation */ 'nye': '31 Dec',
	/** New Year's Day (January 1) */ 'new.?years?(?: ?day)?': '01 Jan',
	/** New Year abbreviation */ 'ny': '01 Jan',
	/** Christmas Eve (December 24) */ 'christmas ?eve': '24 Dec',
	/** Christmas Day (December 25) */ 'christmas': '25 Dec',
	/** Christmas Eve abbreviation */ 'xmas ?eve': '24 Dec',
	/** Christmas abbreviation */ 'xmas': '25 Dec',
	/** Returns the current instant */ 'now': function (this: AliasContext) { return this.toNow() },
	/** Returns today's date at the current time */ 'today': function (this: AliasContext) {
		// ABSOLUTE: Snaps to the current system date
		const { yy: year, mm: month, dd: day } = this.toNow();
		return this.toDateTime().with({ year, month, day });
	},
	/** Returns tomorrow's date */ 'tomorrow': function (this: AliasContext) {
		// RELATIVE: Offsets the current anchor by one day
		return this.add({ days: 1 });
	},
	/** Returns yesterday's date */ 'yesterday': function (this: AliasContext) {
		// RELATIVE: Offsets the current anchor by one day
		return this.add({ days: -1 });
	},
	/** Returns date two weeks from now */ 'fortnight': function (this: AliasContext) {
		// RELATIVE: Offsets the current anchor by two weeks
		return this.add({ weeks: 2 });
	},
});
/** @internal Tempo Event type */
export type Event = typeof Event

/** 
 * a {period} is a Record of regex-pattern-like keys that describe pre-defined Time strings.
 * values can be a string, or a function that resolves to a time-like value.
 * if using a function, use regular 'function()' syntax to allow for 'this' binding.
 * Period functions should resolve to the time side of parsing (ideally a parse-able clock value,
 * or a Tempo/ZonedDateTime whose time component is meaningful to the caller).
 */
/** @internal Tempo Period registry */
export const Period = looseIndex<string, string | Function>()({
	/** Midnight (00:00 or 24:00) */ 'mid[ -]?night': '24:00',
	/** Morning time (8:00 AM) */ 'morning': '8:00',
	/** Mid-morning time (10:00 AM) */ 'mid[ -]?morning': '10:00',
	/** Midday/noon (12:00 PM) */ 'mid[ -]?day': '12:00',
	/** Noon (12:00 PM) */ 'noon': '12:00',
	/** Afternoon time (3:00 PM) */ 'after[ -]?noon': '3:00pm',
	/** Evening time (6:00 PM) */ 'evening': '18:00',
	/** Night time (8:00 PM) */ 'night': '20:00',
	/** Half past the current hour */ 'half[ -]?hour': function (this: AliasContext) {
		return `${this.hh}:30`;
	},
})
/** @internal Tempo Period type */
export type Period = typeof Period

/** 
 * an {ignore} is a list of noise words to be stripped during parsing.
 */
/** @internal Tempo Ignore registry */
export const Ignore = ['at', 'the', 'o-clock', 'o\'clock', 'oclock', 'on', 'in', 'of', 'by', 'for', 'to'] as const;
/** @internal Tempo Ignore type */
export type Ignore = string | string[] | (() => string | string[])

/** @internal valid keys for Slick Object mutations */
export const SLICK_KEYS = ['yy', 'mm', 'ww', 'dd', 'hh', 'mi', 'ss', 'wkd'] as const;
export type SLICK_KEYS = typeof SLICK_KEYS

/** @internal Tempo Master Guard list */
export const Guard = [
	'am', 'pm', 'gmt', 'utc', 'ago', 'hence', 'this', 'next', 'prev', 'last', 'from', 'now', 'today', 'yesterday', 'tomorrow', 'start', 'mid', 'end',
	'year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond',
	'years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds',
	'st', 'nd', 'rd', 'th',
	'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
	'mondays', 'tuesdays', 'wednesdays', 'thursdays', 'fridays', 'saturdays', 'sundays',
	'bc', 'bce', 'ad', 'ce', 'b.c.', 'b.c.e.', 'a.d.', 'c.e.'
] as const;

/** @internal baseline Intl settings */
export const IntlDefault: IntlOptions = {
	relativeTimeFormat: {
		style: 'narrow',
	},
	durationFormat: {
		style: 'long',
	}
}

/**
 * @internal Tempo Default options
 * @property {string} scope - Configuration scope identifier
 * @property {string} timeZone - Default timezone for Tempo instances
 */
export const Default = secure({
	/** log to console */																			debug: LOG.Info,
	/** catch or throw Errors */															catch: false,
	/** suppress console output during catch */								silent: false,
	/** initialization strategy (auto | strict | defer) */		mode: MODE.Auto,
	/** used to parse two-digit years*/												pivot: 75,					/** @link https:	//en.wikipedia.org/wiki/Date_windowing */
	/** precision to measure timestamps (ss|ms|us|ns) */			timeStamp: 'ms',
	/** calendaring system */																	calendar: 'iso8601',
	/** default timezone if not specified */									timeZone: getDateTimeFormat().timeZone,
	/** default locale if not specified */										locale: getDateTimeFormat().locale,
	/** hemisphere for term.qtr or term.szn */								sphere: undefined,
	/** regional date-parsing configuration */								monthDay: MONTH_DAY,
	/** internationalization configuration */									intl: IntlDefault,
	/** plugin configurations */															plugins: {},
	/** global data augmentation registries */								registry: {
		/** Format string templates */ formats: FORMAT,
		/** Locale-specific configurations */ locales: LOCALE,
		/** Temporal modifiers for relative dates */ modifiers: {
			'+': ['next', 'hence', 'from now'],
			'-': ['ago', 'last', 'prev'],
			'=': ['this'],
			'<': [],
			'>': [],
			'<=': [],
			'>=': [],
		}
	},
	/** parse planner configuration (layoutOrder, etc.) */		planner: {
		layoutOrder: [
			Token.hms, Token.dmy6, Token.mdy6, Token.ymd6, Token.wkd, Token.ye, Token.ey,
			Token.dt, Token.tm, Token.dtm, Token.tmd, Token.dmy, Token.mdy, Token.ymd,
			Token.off, Token.rel
		],
		preFilter: true
	},
} as Options)

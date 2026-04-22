import { looseIndex } from '#library/object.library.js';
import { secure } from '#library/utility.library.js';
import { proxify } from '#library/proxy.library.js';
import { getDateTimeFormat } from '#library/international.library.js';

import { NUMBER, MODE } from './tempo.enum.js';
import { Token } from './tempo.symbol.js';
import type { Options } from '../tempo.type.js';
import type { Tempo } from '../tempo.class.js';

/** characters allowed inside timezone/calendar brackets */
const bracket_content = /[^\]]+/;

// BE VERY CAREFUL NOT TO BREAK THE REGEXP PATTERNS BELOW
// TEMPO functionality heavily depends on these patterns
/** @internal Tempo Match patterns */
export const Match = proxify({
	/** match all {} pairs, if they start with a word char */	braces: /{([#]?[\w]+(?:\.[\w]+)*)}/g,
	/** named capture-group, if it starts with a letter */		captures: /\(\?<([a-zA-Z][\w]*)>(.*?)(?<!\\)\)/g,
	/** event */																							event: /^([gl])?evt(?<idx>[0-9]+)$|^g?dt$/,
	/** period */																							period: /^([gl])?per(?<idx>[0-9]+)$|^g?tm$/,
	/** two digit year */																			twoDigit: /^[0-9]{2}$/,
	/** date */																								date: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
	/** time */																								time: /^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$/,
	/** hour-minute-second with no separator */								hhmiss: /(hh)(m[i|m])(ss)?/i,
	/** separator characters (/ - . , T) */										separator: /[T\/\-\.\s,]/,
	/** modifier characters (+-<>=) */												modifier: /[\+\-\<\>][\=]?|this|next|prev|last/,
	/** offset post keywords (ago|hence) */										affix: /ago|hence|from now/,
	/** strip out these characters from a string */						strips: /\(|\)/g,
	/** whitespace characters */															spaces: /\s+/g,
	/** Z character */																				zed: /^Z$/,
	/** base guard characters (digits and common symbols) */	guard: /[\d\s\-\.\:T\/Z\+\-\(\)\,\=\#]/i,
	/** bracketed content (timezone/calendar) */							bracket: /\[[^\]]+\]/i,
	/** slick shorthand-shifter (e.g. #qtr.>2q2) */						shorthand: /(?:(?:#[\w]+|[\w]+)\.(?:[\+\-\<\>]=?|next|prev|this|last)?(?:[0-9]+)?(?:[\w]*))/,
	/** anchored version for shifter resolution */						slick: /^(?<sh_term>#[\w]+|[\w]+)\.(?<sh_mod>[\+\-\<\>]=?|next|prev|this|last)?(?<sh_nbr>[0-9]+)?(?<sh_unit>[\w]*)$/,
	/** extracted value-only version of a slick shifter */		slickValue: /^(?<sh_mod>[\+\-\<\>]=?|next|prev|this|last)?(?<sh_nbr>[0-9]+)?(?<sh_unit>[\w]*)$/,
	/** escape special regex characters in a string */				escape: (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
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
	[Token.yy]: /(?<yy>([0-9]{2})?[0-9]{2})/,								// arbitrary upper-limit of yy=9999
	[Token.mm]: /(?<mm>[0\s]?[1-9]|1[0-2]|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/,	// month-name (abbrev or full) or month-number 01-12
	[Token.dd]: /(?<dd>[0\s]?[1-9]|[12][0-9]|3[01])(?:\s?(?:st|nd|rd|th))?/,	// day-number 01-31
	[Token.hh]: /(?<hh>2[0-4]|[01]?[0-9])/,									// hour-number 00-24
	[Token.mi]: /(\:(?<mi>[0-5][0-9]))/,											// minute-number 00-59
	[Token.ss]: /(\:(?<ss>[0-5][0-9]))/,											// seconds-number 00-59
	[Token.ff]: /(\.(?<ff>[0-9]{1,9}))/,											// fractional-seconds up-to 9-digits
	[Token.mer]: /(\s*(?<mer>am|pm))/,												// meridiem suffix (am,pm)
	[Token.sfx]: /((?:{sep}+|T)({tm}){tzd}?)/,								// time-pattern suffix 'T {tm} Z'
	[Token.wkd]: /(?<wkd>Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)/,	// day-name (abbrev or full)
	[Token.tzd]: /(?<tzd>Z|(?:\+(?:(?:0[0-9]|1[0-3]):?[0-5][0-9]|14:00)|-(?:(?:0[0-9]|1[0-1]):?[0-5][0-9]|12:00)))/,	// time-zone offset	+14:00 to -12:00
	[Token.nbr]: new RegExp(`(?<nbr>[0-9]+|${Object.keys(NUMBER).join('|')})`),	// modifier count
	[Token.afx]: new RegExp(`((s)? (?<afx>${Match.affix.source}))?{sep}?`),	// affix optional plural 's' and (ago|hence)
	[Token.mod]: new RegExp(`((?<mod>${Match.modifier.source})?{nbr}? *)`),	// modifier (+,-,<,<=,>,>=) plus optional offset-count
	[Token.sep]: new RegExp(`(?:${Match.separator.source})`),	// date-input separator character "/\\-., " (non-capture group)
	[Token.unt]: /(?<unt>year|month|week|day|hour|minute|second|millisecond)(?:s)?/,	// useful for '2 days ago' etc
	[Token.brk]: new RegExp(`(\\[(?<brk>${bracket_content.source})\\](?:\\[(?<cal>${bracket_content.source})\\])?)?`),	// timezone/calendar brackets [...]
	[Token.slk]: new RegExp(`${Match.shorthand.source}`),					// shorthand shifter
})
/** @internal Tempo Snippet type */
export type Snippet = typeof Snippet

/**
 * a {layout} is a Record of snippet-combinations describing an input DateTime argument  
 * the Layout's keys are in the order that they will be checked against an input value  
 */
/** @internal Tempo Layout registry */
export const Layout = looseIndex<symbol, string>()({
	[Token.dt]: '({dd}{sep}?{mm}({sep}?{yy})?|{mod}?({evt})|(?<slk>{slk}))',// calendar, event or slick
	[Token.tm]: '({hh}{mi}?{ss}?{ff}?{mer}?|{per})',					// clock or period
	[Token.dtm]: '({dt})(?:(?:{sep}+|T)({tm}))?{tzd}?{brk}?',	// calendar/event and clock/period
	[Token.dmy]: '({wkd}{sep}+)?{dd}{sep}?{mm}({sep}?{yy})?{sfx}?{brk}?',// day-month(-year)
	[Token.mdy]: '({wkd}{sep}+)?{mm}{sep}?{dd}({sep}?{yy})?{sfx}?{brk}?',// month-day(-year)
	[Token.ymd]: '({wkd}{sep}+)?{yy}{sep}?{mm}({sep}?{dd})?{sfx}?{brk}?',// year-month(-day)
	[Token.wkd]: '{mod}?{wkd}{afx}?{sfx}?',										// special layout (no {dt}!) used for weekday calcs (only one that requires {wkd} pattern)
	[Token.off]: '{mod}?{dd}{afx}?',													// day of month, with optional offset
	[Token.rel]: '{nbr}{sep}?{unt}{sep}?{afx}',								// relative duration (e.g. 2 days ago)
})
/** @internal Tempo Layout type */
export type Layout = typeof Layout

/** 
 * an {event} is a Record of regex-pattern-like-string keys that describe Date strings.
 * values can be a string or a function that returns a string. 
 * if assigning a function, use standard 'function()' syntax to allow for 'this' binding.
 * also, a function should always have a .toString() method which returns a parse-able Date string
 */
/** @internal Tempo Event registry */
export const Event = looseIndex<string, string | Function>()({
	'new.?years? ?eve': '31 Dec',
	'nye': '31 Dec',
	'new.?years?( ?day)?': '01 Jan',
	'ny': '01 Jan',
	'christmas ?eve': '24 Dec',
	'christmas': '25 Dec',
	'xmas ?eve': '24 Dec',
	'xmas': '25 Dec',
	'now': function (this: Tempo) { return this.toNow() },
	'today': function (this: Tempo) {
		// ABSOLUTE: Snaps to the current system date
		const { year, month, day } = this.toNow();
		return this.toDateTime().with({ year, month, day });
	},
	'tomorrow': function (this: Tempo) {
		// RELATIVE: Offsets the current anchor by one day
		return this.add({ days: 1 });
	},
	'yesterday': function (this: Tempo) {
		// RELATIVE: Offsets the current anchor by one day
		return this.add({ days: -1 });
	},
});
/** @internal Tempo Event type */
export type Event = typeof Event

/** 
 * a {period} is a Record of regex-pattern-like keys that describe pre-defined Time strings.
 * values can be a string or a function that returns a string.
 * if using a function, use regular 'function()' syntax to allow for 'this' binding.
 */
/** @internal Tempo Period registry */
export const Period = looseIndex<string, string | Function>()({
	'mid[ -]?night': '24:00',
	'morning': '8:00',
	'mid[ -]?morning': '10:00',
	'mid[ -]?day': '12:00',
	'noon': '12:00',
	'after[ -]?noon': '3:00pm',
	'evening': '18:00',
	'night': '20:00',
})
/** @internal Tempo Period type */
export type Period = typeof Period

/** 
 * an {ignore} is a list of noise words to be stripped during parsing.
 */
/** @internal Tempo Ignore registry */
export const Ignore = ['at', 'the', 'o-clock', 'o\'clock', 'on', 'in', 'of', 'by', 'for', 'to'];
/** @internal Tempo Ignore type */
export type Ignore = string | string[] | (() => string | string[])

/** @internal Tempo Master Guard list */
export const Guard = [
	'am', 'pm', 'ago', 'hence', 'this', 'next', 'prev', 'last', 'from', 'now', 'today', 'yesterday', 'tomorrow', 'start', 'mid', 'end',
	'year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond',
	'years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds', 'microseconds', 'nanoseconds',
	'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
	'mondays', 'tuesdays', 'wednesdays', 'thursdays', 'fridays', 'saturdays', 'sundays'
] as const;

/** @internal Tempo Default options */
export const Default = secure({
	/** log to console */																			debug: false,
	/** catch or throw Errors */															catch: false,
	/** initialization strategy (auto | strict | defer) */		mode: MODE.Auto,
	/** used to parse two-digit years*/												pivot: 75,					/** @link https:	//en.wikipedia.org/wiki/Date_windowing */
	/** precision to measure timestamps (ms | us) */					timeStamp: 'ms',
	/** calendaring system */																	calendar: 'iso8601',
	/** default timezone if not specified */									timeZone: getDateTimeFormat().timeZone,
	/** default locale if not specified */										locale: getDateTimeFormat().locale,
	/** locales that prefer month-day order */								mdyLocales: ['en-US', 'en-AS'],	/** @link https:	//en.wikipedia.org/wiki/Date_format_by_country */
	/** layouts that need to swap parse-order */							mdyLayouts: [['dayMonthYear', 'monthDayYear']],
	/** hemisphere for term.qtr or term.szn */								sphere: undefined,
} as Options)

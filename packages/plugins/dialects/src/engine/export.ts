import { evaluate, deepFreeze, hasKey, isDefined } from '@magmacomputing/tempo/library';
import { DIALECT, normalizeDialect, type Dialect } from '../constants.js';
import type { ExportedToken, ExportResult } from '../types.js';

interface DialectTarget {
	readonly ldml?: string;
	readonly strftime?: string;
	readonly oracle?: string;
	readonly moment?: string;
	readonly php?: string;
	readonly go?: string;
	readonly mysql?: string;
	readonly dotnet?: string;
	readonly sheet?: string;
	readonly desc: string;
}

/**
 * Canonical mapping from native Tempo format tokens to external dialect layout tokens.
 * In v5.0.0, this table represents the authoritative token surface.
 */
const TEMPO_TO_DIALECT_MAP: Readonly<Record<string, DialectTarget>> = {
	// Year
	yyyy: { ldml: 'yyyy', strftime: '%Y', oracle: 'YYYY', moment: 'YYYY', php: 'Y', go: '2006', desc: '4-digit year' },
	'yyyy:-3': { oracle: 'YYY', desc: 'Last 3 digits of year' },
	'yyyy:-1': { oracle: 'Y', desc: 'Last digit of year' },
	yy: { ldml: 'yy', strftime: '%y', oracle: 'YY', moment: 'YY', php: 'y', go: '06', desc: '2-digit year' },
	'yy:raw': { strftime: '%-y', desc: 'Unpadded 2-digit year (0-99)' },
	yow: { ldml: 'YYYY', strftime: '%G', oracle: 'IYYY', moment: 'GGGG', php: 'o', desc: '4-digit ISO week-numbering year' },
	'yow:-3': { oracle: 'IYY', desc: 'Last 3 digits of ISO week-numbering year' },
	'yow:-2': { ldml: 'YY', strftime: '%g', oracle: 'IY', moment: 'GG', desc: '2-digit ISO week-numbering year' },
	'yow:short': { ldml: 'YY', strftime: '%g', oracle: 'IY', moment: 'GG', desc: '2-digit ISO week-numbering year' },
	'yow:-1': { oracle: 'I', desc: 'Last digit of ISO week-numbering year' },
	'yow:raw': { ldml: 'Y', desc: 'Unpadded ISO week-numbering year' },

	// Month
	mm: { ldml: 'MM', strftime: '%m', oracle: 'MM', moment: 'MM', php: 'm', go: '01', desc: 'Zero-padded month (01-12)' },
	'mm:raw': { ldml: 'M', strftime: '%-m', oracle: 'FMMM', moment: 'M', php: 'n', go: '1', desc: 'Unpadded month number (1-12)' },
	mon: { ldml: 'MMMM', strftime: '%B', oracle: 'Month', moment: 'MMMM', php: 'F', go: 'January', desc: 'Full month name capitalized (e.g. October)' },
	'mon:upper': { ldml: 'MMMM', strftime: '%B', oracle: 'MONTH', moment: 'MMMM', php: 'F', go: 'January', desc: 'Full month name uppercase (e.g. OCTOBER)' },
	'mon:lower': { ldml: 'MMMM', strftime: '%B', oracle: 'month', moment: 'MMMM', php: 'F', go: 'January', desc: 'Full month name lowercase (e.g. october)' },
	mmm: { ldml: 'MMM', strftime: '%b', oracle: 'Mon', moment: 'MMM', php: 'M', go: 'Jan', desc: 'Short month name capitalized (e.g. Oct)' },
	'mmm:upper': { ldml: 'MMM', strftime: '%b', oracle: 'MON', moment: 'MMM', php: 'M', go: 'Jan', desc: 'Short month name uppercase (e.g. OCT)' },
	'mmm:lower': { ldml: 'MMM', strftime: '%b', oracle: 'mon', moment: 'MMM', php: 'M', go: 'Jan', desc: 'Short month name lowercase (e.g. oct)' },
	'mm:roman': { oracle: 'RM', desc: 'Roman numeral month in uppercase (I-XII)' },
	'mm:roman:lower': { oracle: 'rm', desc: 'Roman numeral month in lowercase (i-xii)' },

	// Day of Month
	dd: { ldml: 'dd', strftime: '%d', oracle: 'DD', moment: 'DD', php: 'd', go: '02', desc: 'Zero-padded day of month (01-31)' },
	'dd:raw': { ldml: 'd', strftime: '%-d', oracle: 'FMDD', moment: 'D', php: 'j', go: '2', desc: 'Unpadded day of month (1-31)' },
	'dd:space': { strftime: '%e', go: '_2', desc: 'Space-padded day of month ( 1-31)' },
	'dd:ord': { oracle: 'DDTH', moment: 'Do', desc: 'Day of month with ordinal suffix' },

	// Day of Year
	doy: { ldml: 'DDD', strftime: '%j', oracle: 'DDD', moment: 'DDDD', go: '002', desc: 'Day of year (001-366)' },
	'doy:raw': { ldml: 'D', strftime: '%-j', oracle: 'FMDDD', moment: 'DDD', desc: 'Unpadded day of year (1-366)' },
	'doy:space': { go: '__2', desc: 'Space-padded day of year (  1-366)' },
	'doy:ord': { moment: 'DDDo', desc: 'Day of year with ordinal suffix' },

	// Weekday
	wkd: { ldml: 'EEEE', strftime: '%A', oracle: 'Day', moment: 'dddd', php: 'l', go: 'Monday', desc: 'Full weekday name capitalized' },
	'wkd:upper': { ldml: 'EEEE', strftime: '%A', oracle: 'DAY', moment: 'dddd', php: 'l', go: 'Monday', desc: 'Full weekday name uppercase' },
	'wkd:lower': { ldml: 'EEEE', strftime: '%A', oracle: 'day', moment: 'dddd', php: 'l', go: 'Monday', desc: 'Full weekday name lowercase' },
	www: { ldml: 'EEE', strftime: '%a', oracle: 'Dy', moment: 'ddd', php: 'D', go: 'Mon', desc: 'Short weekday name capitalized' },
	'www:upper': { ldml: 'EEE', strftime: '%a', oracle: 'DY', moment: 'ddd', php: 'D', go: 'Mon', desc: 'Short weekday name uppercase' },
	'www:lower': { ldml: 'EEE', strftime: '%a', oracle: 'dy', moment: 'ddd', php: 'D', go: 'Mon', desc: 'Short weekday name lowercase' },
	dow: { ldml: 'e', strftime: '%u', oracle: 'D', moment: 'E', php: 'N', desc: 'Day of week number (1-7)' },
	'dow:raw': { ldml: 'c', strftime: '%u', oracle: 'D', moment: 'E', php: 'N', desc: 'Unpadded day of week number (1-7)' },
	'dow:locale': { ldml: 'e', strftime: '%w', oracle: 'D', moment: 'd', php: 'w', desc: 'Territory-dependent day of week' },
	'dow:ord': { moment: 'do', desc: 'Day of week with ordinal suffix' },
	'dow:raw:0': { strftime: '%w', moment: 'd', php: 'w', desc: '0-indexed unpadded day of week (0-6)' },

	// Week of Year
	woy: { ldml: 'II', strftime: '%V', oracle: 'IW', moment: 'WW', php: 'W', desc: 'Zero-padded ISO week of year (01-53)' },
	'woy:raw': { ldml: 'I', strftime: '%-V', oracle: 'FMIW', moment: 'W', desc: 'Unpadded ISO week of year (1-53)' },
	'woy:ord': { moment: 'Wo', desc: 'ISO week of year with ordinal suffix' },

	// Era
	era: { ldml: 'G', desc: 'Abbreviated localized era (e.g. AD)' },
	'era:long': { ldml: 'GGGG', desc: 'Full localized era (e.g. Anno Domini)' },

	// Clock & Time
	hh: { ldml: 'HH', strftime: '%H', oracle: 'HH24', moment: 'HH', php: 'H', go: '15', desc: '24-hour clock zero-padded (00-23)' },
	'hh:raw': { ldml: 'H', strftime: '%-H', oracle: 'FMHH24', moment: 'H', php: 'G', desc: '24-hour clock unpadded (0-23)' },
	'hh:space': { strftime: '%k', desc: 'Space-padded 24-hour clock ( 0-23)' },
	h12: { ldml: 'hh', strftime: '%I', oracle: 'HH12', moment: 'hh', php: 'h', go: '03', desc: '12-hour clock zero-padded (01-12)' },
	'h12:raw': { ldml: 'h', strftime: '%-I', oracle: 'FMHH12', moment: 'h', php: 'g', go: '3', desc: '12-hour clock unpadded (1-12)' },
	'h12:space': { strftime: '%l', desc: 'Space-padded 12-hour clock ( 1-12)' },
	mi: { ldml: 'mm', strftime: '%M', oracle: 'MI', moment: 'mm', php: 'i', go: '04', desc: 'Zero-padded minute (00-59)' },
	'mi:raw': { ldml: 'm', strftime: '%-M', oracle: 'FMMI', moment: 'm', go: '4', desc: 'Unpadded minute (0-59)' },
	ss: { ldml: 'ss', strftime: '%S', oracle: 'SS', moment: 'ss', php: 's', go: '05', desc: 'Zero-padded second (00-59)' },
	'ss:raw': { ldml: 's', strftime: '%-S', oracle: 'FMSS', moment: 's', go: '5', desc: 'Unpadded second (0-59)' },

	// Fractional Seconds
	ms: { ldml: 'SSS', strftime: '%3f', oracle: 'FF3', moment: 'SSS', php: 'v', go: '.000', desc: 'Millisecond (000-999)' },
	'ff:1': { ldml: 'S', strftime: '%1f', oracle: 'FF1', moment: 'S', desc: 'Fractional tenths (0-9)' },
	'ff:2': { ldml: 'SS', strftime: '%2f', oracle: 'FF2', moment: 'SS', desc: 'Fractional hundredths (00-99)' },
	'ff:9': { ldml: 'SSSSSSSSS', strftime: '%9f', oracle: 'FF9', moment: 'SSSSSSSSS', go: '.000000000', desc: 'Nanoseconds (000000000-999999999)' },
	ff: { ldml: 'SSSSSS', strftime: '%f', oracle: 'FF6', moment: 'SSSSSS', php: 'u', go: '.000000', desc: 'Microseconds (000000-999999)' },

	// Meridiem
	mer: { ldml: 'a', strftime: '%P', oracle: 'am', moment: 'a', php: 'a', go: 'pm', desc: 'am/pm lowercase' },
	'mer:upper': { ldml: 'aa', strftime: '%p', oracle: 'AM', moment: 'A', php: 'A', go: 'PM', desc: 'AM/PM uppercase' },
	'mer:dots': { ldml: 'a', strftime: '%P', oracle: 'a.m.', moment: 'a', php: 'a', go: 'pm', desc: 'a.m./p.m. lowercase with dots' },
	'mer:upper:dots': { ldml: 'aa', strftime: '%p', oracle: 'A.M.', moment: 'A', php: 'A', go: 'PM', desc: 'A.M./P.M. uppercase with dots' },

	// Timezone
	tz: { ldml: 'zzzz', strftime: '%Z', oracle: 'TZR', moment: 'z', php: 'e', go: 'MST', desc: 'Time zone region name / identifier' },
	'tz:short': { ldml: 'z', strftime: '%Z', oracle: 'TZD', moment: 'zz', php: 'T', go: 'MST', desc: 'Time zone daylight / short abbreviation' },
	'tz:offset': { ldml: 'ZZZZZ', oracle: 'TZH:TZM', moment: 'Z', php: 'P', go: '-07:00', desc: 'ISO-8601 time zone offset (e.g. +08:00)' },
	'tz:longoffset': { ldml: 'ZZZZ', desc: 'Long localized GMT offset (e.g. GMT+08:00)' },
	'tz:offsetcompact': { ldml: 'ZZ', strftime: '%z', oracle: 'TZHTZM', moment: 'ZZ', php: 'O', go: '-0700', desc: 'Compact time zone offset (e.g. +0800)' },
	'tz:offset:hh': { oracle: 'TZH', go: '-07', desc: 'Time zone offset hours with sign (e.g. +08, -05)' },
	'tz:offset:mi': { oracle: 'TZM', desc: 'Time zone offset minutes without sign (e.g. 00, 30)' },
	'tz:offset:ss': { go: '-07:00:00', desc: 'ISO-8601 time zone offset with seconds (e.g. +08:00:00)' },
	'tz:offsetcompact:ss': { go: '-070000', desc: 'Compact time zone offset with seconds (e.g. +080000)' },
	'tz:offset:utc': { go: 'Z07:00', desc: 'UTC Z or ISO-8601 offset' },
	'tz:offset:short:utc': { go: 'Z07', desc: 'UTC Z or hour-only numeric offset' },
	'tz:offsetcompact:utc': { go: 'Z0700', desc: 'UTC Z or compact offset' },
	'tz:offset:ss:utc': { go: 'Z07:00:00', desc: 'UTC Z or ISO-8601 offset with seconds' },
	'tz:offsetcompact:ss:utc': { go: 'Z070000', desc: 'UTC Z or compact offset with seconds' },
	'tz:offset:z': { go: 'Z07:00', desc: 'UTC Z or ISO-8601 offset' }, // @internal alias for :utc
	'tz:offset:short:z': { go: 'Z07', desc: 'UTC Z or hour-only numeric offset' },
	'tz:offsetcompact:z': { go: 'Z0700', desc: 'UTC Z or compact offset' },
	'tz:offset:ss:z': { go: 'Z07:00:00', desc: 'UTC Z or ISO-8601 offset with seconds' },
	'tz:offsetcompact:ss:z': { go: 'Z070000', desc: 'UTC Z or compact offset with seconds' },

	// Specialized & Scoped Tokens
	jj: { oracle: 'J', desc: 'Astronomical Julian day number' },
	'ss:day': { oracle: 'SSSSS', desc: 'Seconds past midnight (0-86399)' },
	'ss:day:5': { oracle: 'SSSSS', desc: 'Zero-padded 5-digit seconds past midnight (00000-86399)' },
	'ss:day:raw': { oracle: 'FMSSSSS', desc: 'Unpadded seconds past midnight (0-86399)' },
	'woy:cal': { oracle: 'WW', desc: 'Week of year starting on Jan 1 (01-53)' },
	'woy:cal:raw': { oracle: 'FMWW', desc: 'Unpadded week of year starting on Jan 1 (1-53)' },
	wom: { ldml: 'W', oracle: 'W', desc: 'Week of month (1-5)' },
	'wom:raw': { oracle: 'FMW', desc: 'Unpadded week of month (1-5)' },
	dim: { php: 't', desc: 'Days in the given month (28-31)' },
	cen: { strftime: '%C', desc: 'Century (00-99)' },
	'doy:0': { php: 'z', desc: '0-indexed day of year (0-365)' },
	'doy:zero': { php: 'z', desc: '0-indexed day of year (0-365)' },
	'doy:raw:0': { php: 'z', desc: '0-indexed unpadded day of year (0-365)' },
	'doy:raw:zero': { php: 'z', desc: '0-indexed unpadded day of year (0-365)' },
	'dow:0': { strftime: '%w', moment: 'd', php: 'w', desc: 'Day of week with Sunday as 0 (0-6)' },
	'dow:zero': { strftime: '%w', moment: 'd', php: 'w', desc: 'Day of week with Sunday as 0 (0-6)' },

	// Timestamps & Terms
	ts: { strftime: '%s', moment: 'X', php: 'U', desc: 'Unix timestamp in seconds' },
	'#quarter': { oracle: 'Q', moment: 'Q', desc: 'Quarter number 1-4' },
	'#quarter:ord': { moment: 'Qo', desc: 'Quarter with ordinal suffix' },
};

/**
 * Legacy v4 token aliases mapped to canonical Tempo tokens.
 * Scheduled for removal in v5.0.0.
 */
const V4_EXPORT_ALIASES: Readonly<Record<string, string>> = {
	julian: 'jj',
	century: 'cen',
	'dd:year': 'doy',
	'dd:year:raw': 'doy:raw',
	'dd:year:ord': 'doy:ord',
	'dd:year:space': 'doy:space',
	'dd:year:0': 'doy:0',
	'dd:year:zero': 'doy:zero',
	'dd:year:raw:0': 'doy:raw:0',
	'dd:year:raw:zero': 'doy:raw:zero',
	'ww:month': 'wom',
	'woy:month': 'wom',
	'ww:month:raw': 'wom:raw',
	'woy:month:raw': 'wom:raw',
	'ww:cal': 'woy:cal',
	'ww:cal:raw': 'woy:cal:raw',
	'woy:jan1': 'woy:cal',
	'woy:jan1:raw': 'woy:cal:raw',
	yw: 'yow',
	month: 'mm:raw',
	day: 'dd:raw',
	wy: 'woy',
	ww: 'woy',
	'wy:raw': 'woy:raw',
	'wy:ord': 'woy:ord',
	h24: 'hh',
	'h24:raw': 'hh:raw',
	min: 'mi',
	sec: 'ss',
	'ff:3': 'ms',
	'ff:6': 'ff',
	'tz:name': 'tz',
	'tz:long': 'tz',
	'tz:offset:basic': 'tz:offsetcompact',
	'tz:offset:hour': 'tz:offset:hh',
	'tz:offset:min': 'tz:offset:mi',
	'tz:offset:sec': 'tz:offset:ss',
	'tz:offset:second': 'tz:offset:ss',
	'tz:offset:compact': 'tz:offsetcompact',
	'tz:offset:compact:ss': 'tz:offsetcompact:ss',
	'tz:offset:compact:sec': 'tz:offsetcompact:ss',
	'tz:offsetcompact:sec': 'tz:offsetcompact:ss',
	'tz:offset:compact:utc': 'tz:offsetcompact:utc',
	'tz:offset:compact:ss:utc': 'tz:offsetcompact:ss:utc',
	'tz:offset:sec:utc': 'tz:offset:ss:utc',
	'tz:offsetcompact:sec:utc': 'tz:offsetcompact:ss:utc',
	'tz:offset:compact:z': 'tz:offsetcompact:z',
	'tz:offset:compact:ss:z': 'tz:offsetcompact:ss:z',
	'tz:offset:sec:z': 'tz:offset:ss:z',
	'tz:offsetcompact:sec:z': 'tz:offsetcompact:ss:z',
};

const RE_SINGLE_QUOTE = /'/g;
const RE_LDML_LITERAL = /[A-Za-z']/;
const RE_ALPHA = /[A-Za-z]+/g;
const RE_ORACLE_LITERAL = /[A-Za-z\u0080-\uffff]+/g;
const RE_PERCENT = /%/g;
const RE_PHP_ESCAPE = /[A-Za-z\\]/g;
const RE_TEMPO_TOKEN = /(\{\{|\}\})|\{([^{}]+)\}|([^{}]+|[{}])/g;
const RE_FF_PRECISION = /^ff:([1-9])$/i;
const RE_GO_CONFLICT =
	/(?:January|Monday|\.000000000|\.999999999|-07:00:00|-070000|Z07:00:00|Z070000|\.000000|\.999999|-07:00|Z07:00|\.000|\.999|-0700|Z0700|2006|002|__2|MST|Mon(?![a-z])|Jan(?![a-z])|-07|Z07|01|02|03|04|05|15|06|PM|pm|_2|[1-5])/;

/** Escapes literal text for the target dialect; Go text is returned unchanged because layouts have no escape syntax. */
function quoteLiteral(str: string, dialect: Dialect): string {
	if (!str) return '';
	switch (dialect) {
		case DIALECT.Ldml:
			return RE_LDML_LITERAL.test(str) ? `'${str.replace(RE_SINGLE_QUOTE, "''")}'` : str;

		case DIALECT.Moment:
			return str.replace(RE_ALPHA, (m) => `[${m}]`);

		case DIALECT.Oracle:
			return str.replace(RE_ORACLE_LITERAL, (m) => `"${m}"`);

		case DIALECT.Strftime:
			return str.replace(RE_PERCENT, '%%');

		case DIALECT.Php:
			return str.replace(RE_PHP_ESCAPE, (m) => `\\${m}`);

		case DIALECT.Go:
			return str;

		case DIALECT.DotNet:
			return RE_LDML_LITERAL.test(str) ? `'${str}'` : str;

		case DIALECT.Sheet:
			return RE_LDML_LITERAL.test(str) ? `"${str.replace(/"/g, '""')}"` : str;

		default:
			return str;
	}
}

/**
 * Exports a native Tempo format pattern into the corresponding external dialect format model.
 * Unsupported tokens remain in the pattern. Go literal conflicts and fractional tokens without
 * a preceding decimal point are also reported as unsupported. Adjacency conflicts between
 * successive tokens are not detected.
 *
 * @param dialectOrOptions - Target dialect name or supplier, or an object with `dialect`; defaults to LDML
 * @returns A deeply frozen result with token mappings and an `unsupported` list; its string form is the pattern
 * @throws Errors from evaluating a dialect supplier propagate to the caller.
 */
export function exportDialect(tempoMask: string, dialectOrOptions?: any): ExportResult {
	const raw = hasKey(dialectOrOptions, 'dialect')
		? dialectOrOptions.dialect
		: dialectOrOptions;
	const dialect = isDefined(raw) ? normalizeDialect(evaluate(raw)) : DIALECT.Ldml;
	const tokens: ExportedToken[] = [];
	const unsupported: string[] = [];
	let pattern = '';

	for (const match of tempoMask.matchAll(RE_TEMPO_TOKEN)) {
		if (isDefined(match[1]) || isDefined(match[3])) {
			const literal = isDefined(match[1]) ? match[1][0] : match[3];
			if (dialect === DIALECT.Go && RE_GO_CONFLICT.test(literal)) {
				unsupported.push(literal);
				tokens.push({
					source: literal,
					target: literal,
					desc: 'Go reference date token in literal text cannot be escaped',
					supported: false,
				});
				pattern += literal;
			} else {
				pattern += quoteLiteral(literal, dialect);
			}
		} else if (isDefined(match[2])) {
			const rawKey = match[2].trim();
			const fullToken = `{${rawKey}}`;
			const canonicalKey = V4_EXPORT_ALIASES[rawKey] ?? V4_EXPORT_ALIASES[rawKey.toLowerCase()] ?? rawKey;
			let info = TEMPO_TO_DIALECT_MAP[canonicalKey] ?? TEMPO_TO_DIALECT_MAP[canonicalKey.toLowerCase()];

			if (!info && RE_FF_PRECISION.test(canonicalKey)) {
				const prec = Number(canonicalKey.slice(3));
				info = {
					ldml: 'S'.repeat(prec),
					strftime: prec === 6 ? '%f' : `%${prec}f`,
					oracle: `FF${prec}`,
					moment: 'S'.repeat(prec),
					dotnet: 'f'.repeat(prec),
					desc: `Fractional seconds (${prec} digits)`,
				};
			}

			const targetToken = info?.[dialect as keyof DialectTarget];
			if (isDefined(targetToken)) {
				if (dialect === DIALECT.Go && targetToken.startsWith('.')) {
					if (pattern.endsWith('.')) {
						pattern = pattern.slice(0, -1);
					} else {
						unsupported.push(fullToken);
						tokens.push({
							source: fullToken,
							target: fullToken,
							desc: `${info.desc} (Go requires preceding decimal point)`,
							supported: false,
						});
						pattern += fullToken;
						continue;
					}
				}
				pattern += targetToken;
				tokens.push({
					source: fullToken,
					target: targetToken,
					desc: info.desc,
					supported: true,
				});
			} else {
				unsupported.push(fullToken);
				tokens.push({
					source: fullToken,
					target: fullToken,
					desc: info?.desc ?? 'Unsupported token in target dialect',
					supported: false,
				});
				pattern += fullToken;
			}
		}
	}

	const result: ExportResult = {
		dialect,
		source: tempoMask,
		pattern,
		tokens,
		unsupported,
		toString: () => pattern,
	};

	return deepFreeze(result);
}

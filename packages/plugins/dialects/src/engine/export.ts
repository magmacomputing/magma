import { evaluate, deepFreeze } from '@magmacomputing/tempo/library';
import { DIALECT, normalizeDialect, type Dialect } from '../constants.js';
import type { ExportedToken, ExportResult } from '../types.js';

interface DialectTarget {
	readonly ldml?: string;
	readonly strftime?: string;
	readonly oracle?: string;
	readonly moment?: string;
	readonly php?: string;
	readonly go?: string;
	readonly desc: string;
}

/**
 * Canonical mapping from native Tempo format tokens to external dialect layout tokens.
 * In v5.0.0, this table represents the authoritative token surface.
 */
const TEMPO_TO_DIALECT_MAP: Readonly<Record<string, DialectTarget>> = {
	// Year
	yyyy: { ldml: 'yyyy', strftime: '%Y', oracle: 'YYYY', moment: 'YYYY', php: 'Y', go: '2006', desc: '4-digit year' },
	yy: { ldml: 'yy', strftime: '%y', oracle: 'YY', moment: 'YY', php: 'y', go: '06', desc: '2-digit year' },
	yow: { ldml: 'YYYY', strftime: '%G', oracle: 'IYYY', moment: 'GGGG', php: 'o', desc: '4-digit ISO week-numbering year' },

	// Month
	mm: { ldml: 'MM', strftime: '%m', oracle: 'MM', moment: 'MM', php: 'm', go: '01', desc: 'Zero-padded month (01-12)' },
	'mm:raw': { ldml: 'M', strftime: '%-m', oracle: 'FMMM', moment: 'M', php: 'n', go: '1', desc: 'Unpadded month number (1-12)' },
	mon: { ldml: 'MMMM', strftime: '%B', oracle: 'Month', moment: 'MMMM', php: 'F', go: 'January', desc: 'Full month name capitalized (e.g. October)' },
	'mon:upper': { ldml: 'MMMM', strftime: '%B', oracle: 'MONTH', moment: 'MMMM', php: 'F', go: 'January', desc: 'Full month name uppercase (e.g. OCTOBER)' },
	'mon:lower': { ldml: 'MMMM', strftime: '%B', oracle: 'month', moment: 'MMMM', php: 'F', go: 'January', desc: 'Full month name lowercase (e.g. october)' },
	mmm: { ldml: 'MMM', strftime: '%b', oracle: 'Mon', moment: 'MMM', php: 'M', go: 'Jan', desc: 'Short month name capitalized (e.g. Oct)' },
	'mmm:upper': { ldml: 'MMM', strftime: '%b', oracle: 'MON', moment: 'MMM', php: 'M', go: 'Jan', desc: 'Short month name uppercase (e.g. OCT)' },
	'mmm:lower': { ldml: 'MMM', strftime: '%b', oracle: 'mon', moment: 'MMM', php: 'M', go: 'Jan', desc: 'Short month name lowercase (e.g. oct)' },

	// Day of Month
	dd: { ldml: 'dd', strftime: '%d', oracle: 'DD', moment: 'DD', php: 'd', go: '02', desc: 'Zero-padded day of month (01-31)' },
	'dd:raw': { ldml: 'd', strftime: '%-d', oracle: 'FMDD', moment: 'D', php: 'j', go: '2', desc: 'Unpadded day of month (1-31)' },
	'dd:ord': { ldml: 'd', strftime: '%-d', oracle: 'DD', moment: 'Do', php: 'jS', go: '2', desc: 'Day of month with ordinal suffix' },

	// Day of Year
	doy: { ldml: 'D', strftime: '%j', oracle: 'DDD', moment: 'DDDD', go: '002', desc: 'Day of year (001-366)' },
	'doy:raw': { ldml: 'D', strftime: '%-j', oracle: 'FMDDD', moment: 'DDD', go: '002', desc: 'Unpadded day of year (1-366)' },
	'doy:ord': { ldml: 'D', strftime: '%j', oracle: 'DDD', moment: 'DDDo', go: '002', desc: 'Day of year with ordinal suffix' },

	// Weekday
	wkd: { ldml: 'EEEE', strftime: '%A', oracle: 'Day', moment: 'dddd', php: 'l', go: 'Monday', desc: 'Full weekday name capitalized' },
	'wkd:upper': { ldml: 'EEEE', strftime: '%A', oracle: 'DAY', moment: 'dddd', php: 'l', go: 'Monday', desc: 'Full weekday name uppercase' },
	'wkd:lower': { ldml: 'EEEE', strftime: '%A', oracle: 'day', moment: 'dddd', php: 'l', go: 'Monday', desc: 'Full weekday name lowercase' },
	www: { ldml: 'EEE', strftime: '%a', oracle: 'Dy', moment: 'ddd', php: 'D', go: 'Mon', desc: 'Short weekday name capitalized' },
	'www:upper': { ldml: 'EEE', strftime: '%a', oracle: 'DY', moment: 'ddd', php: 'D', go: 'Mon', desc: 'Short weekday name uppercase' },
	'www:lower': { ldml: 'EEE', strftime: '%a', oracle: 'dy', moment: 'ddd', php: 'D', go: 'Mon', desc: 'Short weekday name lowercase' },
	dow: { ldml: 'e', strftime: '%u', oracle: 'D', moment: 'd', php: 'N', desc: 'Day of week number (1-7)' },
	'dow:locale': { ldml: 'e', strftime: '%w', oracle: 'D', moment: 'd', php: 'w', desc: 'Territory-dependent day of week' },
	'dow:ord': { ldml: 'e', strftime: '%u', oracle: 'D', moment: 'do', php: 'N', desc: 'Day of week with ordinal suffix' },

	// Week of Year
	woy: { ldml: 'ww', strftime: '%V', oracle: 'IW', moment: 'WW', php: 'W', desc: 'Zero-padded ISO week of year (01-53)' },
	'woy:raw': { ldml: 'w', strftime: '%-V', oracle: 'FMIW', moment: 'W', php: 'W', desc: 'Unpadded ISO week of year (1-53)' },
	'woy:ord': { ldml: 'w', strftime: '%V', oracle: 'IW', moment: 'Wo', php: 'W', desc: 'ISO week of year with ordinal suffix' },

	// Clock & Time
	hh: { ldml: 'HH', strftime: '%H', oracle: 'HH24', moment: 'HH', php: 'H', go: '15', desc: '24-hour clock zero-padded (00-23)' },
	'hh:raw': { ldml: 'H', strftime: '%-H', oracle: 'FMHH24', moment: 'H', php: 'G', go: '15', desc: '24-hour clock unpadded (0-23)' },
	h12: { ldml: 'hh', strftime: '%I', oracle: 'HH12', moment: 'hh', php: 'h', go: '03', desc: '12-hour clock zero-padded (01-12)' },
	'h12:raw': { ldml: 'h', strftime: '%-I', oracle: 'FMHH12', moment: 'h', php: 'g', go: '3', desc: '12-hour clock unpadded (1-12)' },
	mi: { ldml: 'mm', strftime: '%M', oracle: 'MI', moment: 'mm', php: 'i', go: '04', desc: 'Zero-padded minute (00-59)' },
	'mi:raw': { ldml: 'm', strftime: '%-M', oracle: 'FMMI', moment: 'm', php: 'i', go: '4', desc: 'Unpadded minute (0-59)' },
	ss: { ldml: 'ss', strftime: '%S', oracle: 'SS', moment: 'ss', php: 's', go: '05', desc: 'Zero-padded second (00-59)' },
	'ss:raw': { ldml: 's', strftime: '%-S', oracle: 'FMSS', moment: 's', php: 's', go: '5', desc: 'Unpadded second (0-59)' },

	// Fractional Seconds
	ms: { ldml: 'SSS', strftime: '%3f', oracle: 'FF3', moment: 'SSS', php: 'v', go: '.000', desc: 'Millisecond (000-999)' },
	'ff:1': { ldml: 'S', strftime: '%1f', oracle: 'FF1', moment: 'S', php: 'v', desc: 'Fractional tenths (0-9)' },
	'ff:2': { ldml: 'SS', strftime: '%2f', oracle: 'FF2', moment: 'SS', php: 'v', desc: 'Fractional hundredths (00-99)' },
	'ff:9': { ldml: 'SSSSSSSSS', strftime: '%9f', oracle: 'FF9', moment: 'SSSSSSSSS', go: '.000000000', desc: 'Nanoseconds (000000000-999999999)' },
	ff: { ldml: 'SSSSSS', strftime: '%6f', oracle: 'FF6', moment: 'SSSSSS', php: 'u', go: '.000000', desc: 'Microseconds (000000-999999)' },

	// Meridiem
	mer: { ldml: 'a', strftime: '%P', oracle: 'am', moment: 'a', php: 'a', go: 'pm', desc: 'am/pm lowercase' },
	'mer:upper': { ldml: 'a', strftime: '%p', oracle: 'AM', moment: 'A', php: 'A', go: 'PM', desc: 'AM/PM uppercase' },
	'mer:dots': { ldml: 'a', strftime: '%P', oracle: 'a.m.', moment: 'a', php: 'a', go: 'pm', desc: 'a.m./p.m. lowercase with dots' },
	'mer:upper:dots': { ldml: 'a', strftime: '%p', oracle: 'A.M.', moment: 'A', php: 'A', go: 'PM', desc: 'A.M./P.M. uppercase with dots' },

	// Timezone
	tz: { ldml: 'zzzz', strftime: '%Z', oracle: 'TZR', moment: 'z', php: 'e', go: 'MST', desc: 'Time zone region name / identifier' },
	'tz:short': { ldml: 'z', strftime: '%Z', oracle: 'TZD', moment: 'zz', php: 'T', go: 'MST', desc: 'Time zone daylight / short abbreviation' },
	'tz:offset': { ldml: 'ZZZZZ', strftime: '%z', oracle: 'TZH:TZM', moment: 'Z', php: 'P', go: '-07:00', desc: 'ISO-8601 time zone offset (e.g. +08:00)' },
	'tz:offsetcompact': { ldml: 'ZZ', strftime: '%z', oracle: 'OF', moment: 'ZZ', php: 'O', go: '-0700', desc: 'Compact time zone offset (e.g. +0800)' },

	// Timestamps & Terms
	ts: { strftime: '%s', moment: 'X', php: 'U', desc: 'Unix timestamp in seconds' },
	'#quarter': { oracle: 'Q', moment: 'Q', desc: 'Quarter number 1-4' },
	'#quarter:ord': { oracle: 'Q', moment: 'Qo', desc: 'Quarter with ordinal suffix' },
};

/**
 * Legacy v4 token aliases mapped to canonical Tempo tokens.
 * Scheduled for removal in v5.0.0.
 */
const V4_EXPORT_ALIASES: Readonly<Record<string, string>> = {
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
};

const REGEX_SINGLE_QUOTE = /'/g;
const REGEX_ALPHA = /[A-Za-z]+/g;
const REGEX_ORACLE_LITERAL = /[A-Za-z\u0080-\uffff]+/g;
const REGEX_PERCENT = /%/g;
const REGEX_PHP_ESCAPE = /[A-Za-z\\]/g;
const REGEX_TEMPO_TOKEN = /\{([^{}]+)\}|([^{]+)/g;
const REGEX_FF_PRECISION = /^ff:([1-9])$/i;

function quoteLiteral(str: string, dialect: Dialect): string {
	if (!str) return '';
	switch (dialect) {
		case DIALECT.Ldml:
			return str.replace(REGEX_SINGLE_QUOTE, "''").replace(REGEX_ALPHA, (m) => `'${m}'`);

		case DIALECT.Moment:
			return str.replace(REGEX_ALPHA, (m) => `[${m}]`);

		case DIALECT.Oracle:
			return str.replace(REGEX_ORACLE_LITERAL, (m) => `"${m}"`);

		case DIALECT.Strftime:
			return str.replace(REGEX_PERCENT, '%%');

		case DIALECT.Php:
			return str.replace(REGEX_PHP_ESCAPE, (m) => `\\${m}`);

		case DIALECT.Go:
			return str;

		default:
			return str;
	}
}

/**
 * Exports a native Tempo format pattern into the corresponding external dialect format model.
 */
export function exportDialect(tempoMask: string, explicitDialect?: any): ExportResult {
	const dialect = explicitDialect ? normalizeDialect(String(evaluate(explicitDialect))) : DIALECT.Ldml;
	const tokens: ExportedToken[] = [];
	const unsupported: string[] = [];
	let pattern = '';

	for (const match of tempoMask.matchAll(REGEX_TEMPO_TOKEN)) {
		if (match[2] !== undefined) {
			pattern += quoteLiteral(match[2], dialect);
		} else if (match[1] !== undefined) {
			const rawKey = match[1].trim();
			const fullToken = `{${rawKey}}`;
			const canonicalKey = V4_EXPORT_ALIASES[rawKey] ?? V4_EXPORT_ALIASES[rawKey.toLowerCase()] ?? rawKey;
			let info = TEMPO_TO_DIALECT_MAP[canonicalKey] ?? TEMPO_TO_DIALECT_MAP[canonicalKey.toLowerCase()];

			if (!info && REGEX_FF_PRECISION.test(canonicalKey)) {
				const prec = canonicalKey.slice(3);
				info = {
					ldml: 'S'.repeat(Number(prec)),
					strftime: `%${prec}f`,
					oracle: `FF${prec}`,
					moment: 'S'.repeat(Number(prec)),
					desc: `Fractional seconds (${prec} digits)`,
				};
			}

			const targetToken = info?.[dialect as keyof DialectTarget];
			if (targetToken !== undefined) {
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
		toString() {
			return pattern;
		},
	};

	return deepFreeze(result);
}

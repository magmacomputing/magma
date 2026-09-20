import { evaluate, deepFreeze } from '@magmacomputing/tempo/library';
import { DIALECT } from '../constants.js';
import { detectDialect } from './dialect.registry.js';
import type { ExplainResult, ExplainedToken } from '../types.js';

export type { ExplainedToken, ExplainResult };

const LDML_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	yyyy: { tempo: '{yyyy}', desc: '4-digit year' },
	YYYY: { tempo: '{yw}', desc: '4-digit ISO week-numbering year' },
	yy: { tempo: '{yy}', desc: '2-digit year' },
	YY: { tempo: '{yy}', desc: '2-digit year' },
	y: { tempo: '{yyyy}', desc: 'Year' },
	MMMM: { tempo: '{mon}', desc: 'Full month name (e.g. October)' },
	LLLL: { tempo: '{mon}', desc: 'Full standalone month name' },
	MMM: { tempo: '{mmm}', desc: 'Short month name (e.g. Oct)' },
	LLL: { tempo: '{mmm}', desc: 'Short standalone month name' },
	MM: { tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
	LL: { tempo: '{mm}', desc: 'Zero-padded standalone month (01-12)' },
	M: { tempo: '{mm:raw}', desc: 'Unpadded month number (1-12)' },
	L: { tempo: '{mm:raw}', desc: 'Unpadded standalone month number (1-12)' },
	dd: { tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
	d: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	HH: { tempo: '{hh}', desc: '24-hour clock (00-23)' },
	H: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (0-23)' },
	hh: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	h: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	kk: { tempo: '{hh}', desc: '24-hour clock (01-24, normalized to 00-23)' },
	k: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (1-24, normalized to 0-23)' },
	mm: { tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
	m: { tempo: '{mi:raw}', desc: 'Unpadded minute (0-59)' },
	ss: { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	s: { tempo: '{ss:raw}', desc: 'Unpadded second (0-59)' },
	SSS: { tempo: '{ms}', desc: 'Millisecond (000-999)' },
	SS: { tempo: '{ff:2}', desc: 'Fractional seconds (hundredths: 00-99)' },
	S: { tempo: '{ff:1}', desc: 'Fractional seconds (tenths: 0-9)' },
	aa: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	a: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	EEEE: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Saturday)' },
	cccc: { tempo: '{wkd}', desc: 'Full standalone weekday name' },
	EEE: { tempo: '{www}', desc: 'Short weekday name (e.g. Sat)' },
	ccc: { tempo: '{www}', desc: 'Short standalone weekday name' },
	E: { tempo: '{www}', desc: 'Short weekday name' },
	c: { tempo: '{dow}', desc: 'ISO Day of week (1-7)' },
	e: { tempo: '{dow}', desc: 'Day of week (1-7)' },
	ww: { tempo: '{wy}', desc: 'Zero-padded ISO week of year (01-53)' },
	w: { tempo: '{wy:raw}', desc: 'Unpadded ISO week of year (1-53)' },
	QQQQ: { tempo: '{#quarter}', desc: 'Full quarter name (via #quarter Term)' },
	qqqq: { tempo: '{#quarter}', desc: 'Full standalone quarter name (via #quarter Term)' },
	QQQ: { tempo: '{#quarter}', desc: 'Quarter abbreviation (via #quarter Term)' },
	qqq: { tempo: '{#quarter}', desc: 'Quarter standalone abbreviation (via #quarter Term)' },
	QQ: { tempo: '{#quarter}', desc: 'Zero-padded quarter number (via #quarter Term)' },
	qq: { tempo: '{#quarter}', desc: 'Zero-padded standalone quarter number (via #quarter Term)' },
	Q: { tempo: '{#quarter}', desc: 'Quarter number 1-4 (via #quarter Term)' },
	q: { tempo: '{#quarter}', desc: 'Standalone quarter number 1-4 (via #quarter Term)' },
	zzzz: { tempo: '{tz:long}', desc: 'Full localized time zone name (e.g. Pacific Standard Time)' },
	zzz: { tempo: '{tz:short}', desc: 'Short localized time zone name (e.g. PST)' },
	zz: { tempo: '{tz:short}', desc: 'Short localized time zone name (e.g. PST)' },
	z: { tempo: '{tz:short}', desc: 'Short localized time zone name (e.g. PST)' },
	ZZZZZ: { tempo: '{tz:offset}', desc: 'Extended ISO-8601 offset (e.g. -08:00)' },
	ZZZZ: { tempo: '{tz:longoffset}', desc: 'Localized time zone offset (e.g. GMT-08:00)' },
	ZZZ: { tempo: '{tz:offsetcompact}', desc: 'Compact ISO-8601 offset (e.g. -0800)' },
	ZZ: { tempo: '{tz:offsetcompact}', desc: 'Compact ISO-8601 offset (e.g. -0800)' },
	Z: { tempo: '{tz:offsetcompact}', desc: 'Compact ISO-8601 offset (e.g. -0800)' },
};

const STRFTIME_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	Y: { tempo: '{yyyy}', desc: '4-digit year' },
	y: { tempo: '{yy}', desc: '2-digit year' },
	C: { tempo: '{yy}', desc: 'Century' },
	B: { tempo: '{mon}', desc: 'Full month name (e.g. October)' },
	b: { tempo: '{mmm}', desc: 'Short month name (e.g. Oct)' },
	h: { tempo: '{mmm}', desc: 'Short month name (e.g. Oct)' },
	m: { tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
	d: { tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
	e: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	H: { tempo: '{hh}', desc: '24-hour clock (00-23)' },
	k: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (0-23)' },
	I: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	l: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	M: { tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
	S: { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	s: { tempo: '{ts}', desc: 'Seconds since UNIX epoch' },
	f: { tempo: '{ff:6}', desc: 'Fractional seconds / microseconds (000000-999999)' },
	p: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	P: { tempo: '{mer}', desc: 'am/pm marker (lowercase)' },
	A: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Saturday)' },
	a: { tempo: '{www}', desc: 'Short weekday name (e.g. Sat)' },
	w: { tempo: '{dow}', desc: 'Day of week number (0-6 in POSIX; note: Tempo dow is 1-7 ISO)' },
	u: { tempo: '{dow}', desc: 'ISO Day of week number (1-7)' },
	j: { tempo: '{doy}', desc: 'Day of year (001-366)' },
	V: { tempo: '{wy}', desc: 'Zero-padded ISO week number (01-53)' },
	W: { tempo: '{wy}', desc: 'Zero-padded week of year' },
	U: { tempo: '{wy}', desc: 'Zero-padded week of year' },
	G: { tempo: '{yw}', desc: '4-digit ISO week-numbering year' },
	g: { tempo: '{yy}', desc: '2-digit ISO week-numbering year' },
	z: { tempo: '{tz:offsetcompact}', desc: 'Numeric time zone offset (e.g. -0800)' },
	Z: { tempo: '{tz:short}', desc: 'Time zone abbreviation / name (e.g. PST)' },
	F: { tempo: '{yyyy}-{mm}-{dd}', desc: 'ISO 8601 date' },
	T: { tempo: '{hh}:{mi}:{ss}', desc: 'ISO 8601 time' },
	R: { tempo: '{hh}:{mi}', desc: '24-hour time' },
	D: { tempo: '{mm}/{dd}/{yy}', desc: 'US date' },
};

const MOMENT_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	YYYY: { tempo: '{yyyy}', desc: '4-digit year' },
	YY: { tempo: '{yy}', desc: '2-digit year' },
	gggg: { tempo: '{yw}', desc: '4-digit ISO week-numbering year' },
	GGGG: { tempo: '{yw}', desc: '4-digit ISO week-numbering year' },
	gg: { tempo: '{yy}', desc: '2-digit ISO week-numbering year' },
	GG: { tempo: '{yy}', desc: '2-digit ISO week-numbering year' },
	MMMM: { tempo: '{mon}', desc: 'Full month name (e.g. October)' },
	MMM: { tempo: '{mmm}', desc: 'Short month name (e.g. Oct)' },
	MM: { tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
	M: { tempo: '{mm:raw}', desc: 'Unpadded month number (1-12)' },
	Mo: { tempo: '{mm:ord}', desc: 'Month number with ordinal suffix (1st-12th)' },
	Q: { tempo: '{#quarter}', desc: 'Quarter number 1-4 (via #quarter Term)' },
	Qo: { tempo: '{#quarter:ord}', desc: 'Quarter with ordinal suffix (via #quarter Term)' },
	DD: { tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
	D: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	Do: { tempo: '{dd:ord}', desc: 'Day of month with ordinal suffix (1st-31st)' },
	HH: { tempo: '{hh}', desc: '24-hour clock (00-23)' },
	H: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (0-23)' },
	hh: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	h: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	mm: { tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
	m: { tempo: '{mi:raw}', desc: 'Unpadded minute (0-59)' },
	ss: { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	s: { tempo: '{ss:raw}', desc: 'Unpadded second (0-59)' },
	SSS: { tempo: '{ms}', desc: 'Millisecond (000-999)' },
	SS: { tempo: '{ff:2}', desc: 'Fractional seconds (hundredths: 00-99)' },
	S: { tempo: '{ff:1}', desc: 'Fractional seconds (tenths: 0-9)' },
	A: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	a: { tempo: '{mer}', desc: 'am/pm marker (lowercase)' },
	dddd: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Saturday)' },
	ddd: { tempo: '{www}', desc: 'Short weekday name (e.g. Sat)' },
	dd: { tempo: '{www}', desc: '2-character weekday name' },
	d: { tempo: '{dow}', desc: 'Day of week (0-6 in Moment; note: Tempo dow is 1-7 ISO)' },
	do: { tempo: '{dow:ord}', desc: 'Day of week with ordinal suffix' },
	DDDD: { tempo: '{doy}', desc: 'Day of year zero-padded (001-366)' },
	DDDo: { tempo: '{doy:ord}', desc: 'Day of year with ordinal suffix' },
	DDD: { tempo: '{doy:raw}', desc: 'Unpadded day of year (1-366)' },
	WW: { tempo: '{wy}', desc: 'Zero-padded ISO week of year (01-53)' },
	Wo: { tempo: '{wy:ord}', desc: 'ISO week of year with ordinal suffix' },
	W: { tempo: '{wy:raw}', desc: 'Unpadded ISO week of year (1-53)' },
	X: { tempo: '{ts}', desc: 'Unix timestamp in seconds' },
	x: { tempo: '{ts}', desc: 'Unix timestamp in milliseconds' },
	zz: { tempo: '{tz:short}', desc: 'Time zone abbreviation' },
	z: { tempo: '{tz:short}', desc: 'Time zone abbreviation' },
	ZZ: { tempo: '{tz:offsetcompact}', desc: 'Compact time zone offset (e.g. -0800)' },
	Z: { tempo: '{tz:offset}', desc: 'ISO-8601 time zone offset (e.g. -08:00)' },
};

const LDML_REGEX = /'(''|[^'])*'|(yyyy|YYYY|MMMM|LLLL|EEEE|cccc|QQQQ|qqqq|zzzz|zzz|ZZZZZ|ZZZZ|SSS|MMM|LLL|EEE|ccc|QQQ|qqq|ZZZ|yy|YY|MM|LL|dd|HH|hh|kk|mm|ss|SS|aa|ww|QQ|qq|ZZ|zz|a|d|H|h|k|m|s|S|c|e|E|w|y|L|M|Q|q|Z|z)/g;
const STRFTIME_REGEX = /%([%aAbBcdDeEfFGghHIjklmMpPRsSTuUVwWyYzZ])/g;
const MOMENT_REGEX = /\[([^\]]+)\]|(YYYY|YY|gggg|GGGG|gg|GG|MMMM|MMM|MM|Mo|M|dddd|ddd|dd|DDDD|DDDo|DDD|DD|Do|D|do|d|HH|H|hh|h|mm|m|ss|s|SSS|SS|S|WW|Wo|W|Qo|Q|A|a|X|x|ZZ|zz|Z|z)/g;

/**
 * Translates an external date format mask into native Tempo {token} syntax
 * and returns detailed token explanations to aid incremental migration.
 */
export function explain(mask: string, explicitDialect?: any): ExplainResult {
	const dialect = detectDialect(mask, evaluate(explicitDialect));
	const tokens: ExplainedToken[] = [];
	let pattern = '';

	if (dialect === DIALECT.Strftime) {
		let lastIndex = 0;
		for (const match of mask.matchAll(STRFTIME_REGEX)) {
			const index = match.index!;
			if (index > lastIndex) {
				pattern += mask.slice(lastIndex, index);
			}

			const raw = match[0];
			const spec = match[1];
			if (spec === '%') {
				pattern += '%';
			} else {
				const info = STRFTIME_EXPLAIN_MAP[spec];
				if (info) {
					pattern += info.tempo;
					tokens.push({ source: raw, tempo: info.tempo, desc: info.desc });
				} else {
					pattern += raw;
				}
			}
			lastIndex = index + raw.length;
		}
		if (lastIndex < mask.length) {
			pattern += mask.slice(lastIndex);
		}
	} else if (dialect === DIALECT.Moment) {
		let lastIndex = 0;
		for (const match of mask.matchAll(MOMENT_REGEX)) {
			const index = match.index!;
			if (index > lastIndex) {
				pattern += mask.slice(lastIndex, index);
			}

			const raw = match[0];
			if (raw.startsWith('[')) {
				pattern += match[1] ?? raw.slice(1, -1);
			} else {
				const info = MOMENT_EXPLAIN_MAP[raw];
				if (info) {
					pattern += info.tempo;
					tokens.push({ source: raw, tempo: info.tempo, desc: info.desc });
				} else {
					pattern += raw;
				}
			}
			lastIndex = index + raw.length;
		}
		if (lastIndex < mask.length) {
			pattern += mask.slice(lastIndex);
		}
	} else {
		// LDML
		let lastIndex = 0;
		for (const match of mask.matchAll(LDML_REGEX)) {
			const index = match.index!;
			if (index > lastIndex) {
				pattern += mask.slice(lastIndex, index);
			}

			const raw = match[0];
			if (raw.startsWith("'")) {
				const unquoted = raw.length === 2 && raw === "''" ? "'" : raw.slice(1, -1).replace(/''/g, "'");
				pattern += unquoted;
			} else {
				const info = LDML_EXPLAIN_MAP[raw];
				if (info) {
					pattern += info.tempo;
					tokens.push({ source: raw, tempo: info.tempo, desc: info.desc });
				} else {
					pattern += raw;
				}
			}
			lastIndex = index + raw.length;
		}
		if (lastIndex < mask.length) {
			pattern += mask.slice(lastIndex);
		}
	}

	const result: ExplainResult = {
		dialect,
		source: mask,
		pattern,
		tokens,
		toString() {
			return pattern;
		},
	};

	return deepFreeze(result);
}


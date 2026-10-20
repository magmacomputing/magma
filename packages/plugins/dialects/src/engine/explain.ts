import { deepFreeze, isUndefined } from '@magmacomputing/tempo/library';
import { DIALECT } from '../constants.js';
import { detectDialect } from './dialect.registry.js';
import { LDML_TOKENS } from '../compiler/ldml.compiler.js';
import { ORACLE_TOKEN_REGEX } from '../compiler/oracle.compiler.js';
import { STRFTIME_SPECIFIERS } from '../compiler/strftime.compiler.js';
import { GO_TOKEN_REGEX } from '../compiler/go.compiler.js';
import { MYSQL_SPECIFIERS } from '../compiler/mysql.compiler.js';
import { DOTNET_TOKENS, normalizeDotNetMask, unescapeDotNetQuoted } from '../compiler/dotnet.compiler.js';
import { tokenizeSheetMask } from '../compiler/sheet.compiler.js';
import type { ExplainResult, ExplainedToken, ExplainOptions } from '../types.js';

export type { ExplainedToken, ExplainResult, ExplainOptions };

const LDML_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	yyyy: { tempo: '{yyyy}', desc: '4-digit year' },
	YYYY: { tempo: '{yow:locale}', desc: '4-digit week-numbering year (locale)' },
	yy: { tempo: '{yy}', desc: '2-digit year' },
	YY: { tempo: '{yow:locale:short}', desc: '2-digit week-numbering year (locale)' },
	y: { tempo: '{yyyy}', desc: 'Year' },
	Y: { tempo: '{yow:locale}', desc: 'Week-numbering year (locale)' },
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
	Do: { tempo: '{dd:ord}', desc: 'Day of month with ordinal suffix' },
	do: { tempo: '{dd:ord}', desc: 'Day of month with ordinal suffix' },
	DDDo: { tempo: '{doy:ord}', desc: 'Day of year with ordinal suffix' },
	DDD: { tempo: '{doy}', desc: 'Day of year (001-366)' },
	DD: { tempo: '{doy}', desc: 'Day of year (001-366)' },
	D: { tempo: '{doy:raw}', desc: 'Unpadded day of year (1-366)' },
	GGGG: { tempo: '{era:long}', desc: 'Full localized era (e.g. Anno Domini)' },
	GGG: { tempo: '{era}', desc: 'Abbreviated localized era (e.g. AD)' },
	GG: { tempo: '{era}', desc: 'Abbreviated localized era (e.g. AD)' },
	G: { tempo: '{era}', desc: 'Abbreviated localized era (e.g. AD)' },
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
	SSSSSSSSS: { tempo: '{ff:9}', desc: 'Nanoseconds (000000000-999999999)' },
	SSSSSS: { tempo: '{ff:6}', desc: 'Microseconds (000000-999999)' },
	SSS: { tempo: '{ms}', desc: 'Millisecond (000-999)' },
	SS: { tempo: '{ff:2}', desc: 'Fractional seconds (hundredths: 00-99)' },
	S: { tempo: '{ff:1}', desc: 'Fractional seconds (tenths: 0-9)' },
	aaa: { tempo: '{mer}', desc: 'am/pm marker (lowercase)' },
	aa: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	a: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	EEEE: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Saturday)' },
	cccc: { tempo: '{wkd}', desc: 'Full standalone weekday name' },
	EEE: { tempo: '{www}', desc: 'Short weekday name (e.g. Sat)' },
	ccc: { tempo: '{www}', desc: 'Short standalone weekday name' },
	EE: { tempo: '{www}', desc: 'Short weekday name (e.g. Sat)' },
	E: { tempo: '{www}', desc: 'Short weekday name' },
	cc: { tempo: '{dow:locale}', desc: 'Locale-relative standalone day of week (1-7)' },
	c: { tempo: '{dow:locale}', desc: 'Locale-relative standalone day of week (1-7)' },
	ee: { tempo: '{dow:locale}', desc: 'Locale-relative day of week (1-7)' },
	e: { tempo: '{dow:locale}', desc: 'Locale-relative day of week (1-7)' },
	II: { tempo: '{woy}', desc: 'Zero-padded ISO week of year (01-53)' },
	I: { tempo: '{woy:raw}', desc: 'Unpadded ISO week of year (1-53)' },
	ww: { tempo: '{woy:locale}', desc: 'Zero-padded week of year (locale)' },
	w: { tempo: '{woy:locale:raw}', desc: 'Unpadded week of year (locale)' },
	W: { tempo: '{wom}', desc: 'Week of month (1-5)' },
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
	C: { tempo: '{cen}', desc: 'Century (00-99)' },
	B: { tempo: '{mon}', desc: 'Full month name (e.g. October)' },
	b: { tempo: '{mmm}', desc: 'Short month name (e.g. Oct)' },
	h: { tempo: '{mmm}', desc: 'Short month name (e.g. Oct)' },
	m: { tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
	d: { tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
	e: { tempo: '{dd:space}', desc: 'Space-padded day of month ( 1-31)' },
	H: { tempo: '{hh}', desc: '24-hour clock (00-23)' },
	k: { tempo: '{hh:space}', desc: 'Space-padded 24-hour clock ( 0-23)' },
	I: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	l: { tempo: '{h12:space}', desc: 'Space-padded 12-hour clock ( 1-12)' },
	M: { tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
	S: { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	s: { tempo: '{ts}', desc: 'Seconds since UNIX epoch' },
	f: { tempo: '{ff:6}', desc: 'Fractional seconds / microseconds (000000-999999)' },
	p: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	P: { tempo: '{mer}', desc: 'am/pm marker (lowercase)' },
	A: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Saturday)' },
	a: { tempo: '{www}', desc: 'Short weekday name (e.g. Sat)' },
	w: { tempo: '{dow:0}', desc: 'Day of week number where Sunday is 0 (0-6)' },
	u: { tempo: '{dow}', desc: 'ISO Day of week number (1-7)' },
	j: { tempo: '{doy}', desc: 'Day of year (001-366)' },
	V: { tempo: '{woy}', desc: 'Zero-padded ISO week number (01-53)' },
	W: { tempo: '', desc: 'Week number of year with Monday as first day of week (00-53)' },
	U: { tempo: '', desc: 'Week number of year with Sunday as first day of week (00-53)' },
	G: { tempo: '{yow}', desc: '4-digit ISO week-numbering year' },
	g: { tempo: '{yow:-2}', desc: '2-digit ISO week-numbering year' },
	z: { tempo: '{tz:offsetcompact}', desc: 'Numeric time zone offset (e.g. -0800)' },
	Z: { tempo: '{tz}', desc: 'Time zone name (e.g. Europe/Paris)' },
	F: { tempo: '{yyyy}-{mm}-{dd}', desc: 'ISO 8601 date' },
	T: { tempo: '{hh}:{mi}:{ss}', desc: 'ISO 8601 time' },
	R: { tempo: '{hh}:{mi}', desc: '24-hour time' },
	D: { tempo: '{mm}/{dd}/{yy}', desc: 'US date' },
};

const STRFTIME_RAW_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	d: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	e: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	m: { tempo: '{mm:raw}', desc: 'Unpadded month number (1-12)' },
	H: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (0-23)' },
	k: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (0-23)' },
	I: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	l: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	M: { tempo: '{mi:raw}', desc: 'Unpadded minute (0-59)' },
	S: { tempo: '{ss:raw}', desc: 'Unpadded second (0-59)' },
	j: { tempo: '{doy:raw}', desc: 'Unpadded day of year (1-366)' },
	V: { tempo: '{woy:raw}', desc: 'Unpadded ISO week of year (1-53)' },
	u: { tempo: '{dow:raw}', desc: 'Unpadded ISO day of week (1-7)' },
	w: { tempo: '{dow:raw:0}', desc: 'Unpadded day of week with Sunday as 0 (0-6)' },
	y: { tempo: '{yy:raw}', desc: 'Unpadded 2-digit year (0-99)' },
	Y: { tempo: '{yyyy}', desc: '4-digit year' },
};

const MOMENT_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	YYYY: { tempo: '{yyyy}', desc: '4-digit year' },
	YY: { tempo: '{yy}', desc: '2-digit year' },
	gggg: { tempo: '{yow:locale}', desc: '4-digit week-numbering year (locale)' },
	GGGG: { tempo: '{yow}', desc: '4-digit ISO week-numbering year' },
	gg: { tempo: '{yow:locale:short}', desc: '2-digit week-numbering year (locale)' },
	GG: { tempo: '{yow:-2}', desc: '2-digit ISO week-numbering year' },
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
	SSSSSSSSS: { tempo: '{ff:9}', desc: 'Nanoseconds (000000000-999999999)' },
	SSSSSSSS: { tempo: '{ff:8}', desc: 'Fractional seconds (8 digits)' },
	SSSSSSS: { tempo: '{ff:7}', desc: 'Fractional seconds (7 digits)' },
	SSSSSS: { tempo: '{ff:6}', desc: 'Microseconds (000000-999999)' },
	SSSSS: { tempo: '{ff:5}', desc: 'Fractional seconds (5 digits)' },
	SSSS: { tempo: '{ff:4}', desc: 'Fractional seconds (4 digits)' },
	SSS: { tempo: '{ms}', desc: 'Millisecond (000-999)' },
	SS: { tempo: '{ff:2}', desc: 'Fractional seconds (hundredths: 00-99)' },
	S: { tempo: '{ff:1}', desc: 'Fractional seconds (tenths: 0-9)' },
	A: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	a: { tempo: '{mer}', desc: 'am/pm marker (lowercase)' },
	dddd: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Saturday)' },
	ddd: { tempo: '{www}', desc: 'Short weekday name (e.g. Sat)' },
	dd: { tempo: '{www}', desc: '2-character weekday name' },
	d: { tempo: '{dow:0}', desc: 'Day of week number where Sunday is 0 (0-6)' },
	do: { tempo: '{dow:ord}', desc: 'Day of week with ordinal suffix' },
	E: { tempo: '{dow}', desc: 'ISO day of week (1-7)' },
	DDDD: { tempo: '{doy}', desc: 'Day of year zero-padded (001-366)' },
	DDDo: { tempo: '{doy:ord}', desc: 'Day of year with ordinal suffix' },
	DDD: { tempo: '{doy:raw}', desc: 'Unpadded day of year (1-366)' },
	WW: { tempo: '{woy}', desc: 'Zero-padded ISO week of year (01-53)' },
	Wo: { tempo: '{woy:ord}', desc: 'ISO week of year with ordinal suffix' },
	W: { tempo: '{woy:raw}', desc: 'Unpadded ISO week of year (1-53)' },
	X: { tempo: '{ts}', desc: 'Unix timestamp in seconds' },
	x: { tempo: '', desc: 'Unix timestamp in milliseconds (unsupported in Tempo default seconds-based {ts})' },
	zz: { tempo: '{tz:short}', desc: 'Time zone abbreviation' },
	z: { tempo: '{tz:short}', desc: 'Time zone abbreviation' },
	ZZ: { tempo: '{tz:offsetcompact}', desc: 'Compact time zone offset (e.g. -0800)' },
	Z: { tempo: '{tz:offset}', desc: 'ISO-8601 time zone offset (e.g. -08:00)' },
};

const ORACLE_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	YYYY: { tempo: '{yyyy}', desc: '4-digit year' },
	RRRR: { tempo: '{yyyy}', desc: '4-digit year (with 2000 pivot)' },
	IYYY: { tempo: '{yow}', desc: '4-digit ISO week-numbering year' },
	IYY: { tempo: '{yow:-3}', desc: 'Last 3 digits of ISO week-numbering year' },
	IY: { tempo: '{yow:-2}', desc: 'Last 2 digits of ISO week-numbering year' },
	I: { tempo: '{yow:-1}', desc: 'Last digit of ISO week-numbering year' },
	YYY: { tempo: '{yyyy:-3}', desc: 'Last 3 digits of year' },
	YY: { tempo: '{yy}', desc: '2-digit year' },
	RR: { tempo: '{yy}', desc: '2-digit year (with 2000 pivot)' },
	Y: { tempo: '{yyyy:-1}', desc: 'Last digit of year' },
	J: { tempo: '{jj}', desc: 'Astronomical Julian day number' },
	MM: { tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
	MONTH: { tempo: '{mon:upper}', desc: 'Full month name uppercase (e.g. OCTOBER)' },
	Month: { tempo: '{mon}', desc: 'Full month name capitalized (e.g. October)' },
	month: { tempo: '{mon:lower}', desc: 'Full month name lowercase (e.g. october)' },
	MON: { tempo: '{mmm:upper}', desc: 'Short month name uppercase (e.g. OCT)' },
	Mon: { tempo: '{mmm}', desc: 'Short month name capitalized (e.g. Oct)' },
	mon: { tempo: '{mmm:lower}', desc: 'Short month name lowercase (e.g. oct)' },
	RM: { tempo: '{mm:roman}', desc: 'Roman numeral month uppercase (e.g. X)' },
	rm: { tempo: '{mm:roman:lower}', desc: 'Roman numeral month lowercase (e.g. x)' },
	DDTH: { tempo: '{dd:ord}', desc: 'Day of month with ordinal suffix' },
	ddth: { tempo: '{dd:ord}', desc: 'Day of month with ordinal suffix' },
	DD: { tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
	DDD: { tempo: '{doy}', desc: 'Day of year (001-366)' },
	DAY: { tempo: '{wkd:upper}', desc: 'Full weekday name uppercase (e.g. WEDNESDAY)' },
	Day: { tempo: '{wkd}', desc: 'Full weekday name capitalized (e.g. Wednesday)' },
	day: { tempo: '{wkd:lower}', desc: 'Full weekday name lowercase (e.g. wednesday)' },
	DY: { tempo: '{www:upper}', desc: 'Short weekday name uppercase (e.g. WED)' },
	Dy: { tempo: '{www}', desc: 'Short weekday name capitalized (e.g. Wed)' },
	dy: { tempo: '{www:lower}', desc: 'Short weekday name lowercase (e.g. wed)' },
	D: { tempo: '{dow:locale}', desc: 'Day of week (1-7, numbering depends on NLS_TERRITORY)' },
	HH24: { tempo: '{hh}', desc: '24-hour clock (00-23)' },
	HH12: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	HH: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	MI: { tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
	SS: { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	SSSSS: { tempo: '{ss:day:5}', desc: 'Seconds past midnight (00000-86399)' },
	FF3: { tempo: '{ms}', desc: 'Millisecond (000-999)' },
	FF6: { tempo: '{ff:6}', desc: 'Fractional seconds / microseconds (000000-999999)' },
	FF: { tempo: '{ff:6}', desc: 'Fractional seconds / microseconds (000000-999999)' },
	AM: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	PM: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	am: { tempo: '{mer}', desc: 'am/pm marker (lowercase)' },
	pm: { tempo: '{mer}', desc: 'am/pm marker (lowercase)' },
	'A.M.': { tempo: '{mer:upper:dots}', desc: 'A.M./P.M. marker' },
	'P.M.': { tempo: '{mer:upper:dots}', desc: 'A.M./P.M. marker' },
	'a.m.': { tempo: '{mer:dots}', desc: 'a.m./p.m. marker' },
	'p.m.': { tempo: '{mer:dots}', desc: 'a.m./p.m. marker' },
	IW: { tempo: '{woy}', desc: 'Zero-padded ISO week of year (01-53)' },
	WW: { tempo: '{woy:cal}', desc: 'Week of year starting on Jan 1 (01-53)' },
	W: { tempo: '{wom}', desc: 'Week of month (1-5)' },
	Q: { tempo: '{#quarter}', desc: 'Quarter number 1-4 (via #quarter Term)' },
	'TZH:TZM': { tempo: '{tz:offset}', desc: 'Time zone offset (e.g. +08:00)' },
	TZH: { tempo: '{tz:offset:hh}', desc: 'Time zone offset hours with sign (e.g. +08, -05)' },
	TZM: { tempo: '{tz:offset:mi}', desc: 'Time zone offset minutes without sign (e.g. 00, 30)' },
	TZR: { tempo: '{tz:name}', desc: 'Time zone region name (e.g. UTC, America/New_York)' },
	TZD: { tempo: '{tz:short}', desc: 'Time zone daylight saving abbreviation' },
	OF: { tempo: '{tz:offset}', desc: 'Time zone offset (e.g. +02)' },
};

const ORACLE_UNPADDED_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	MM: { tempo: '{mm:raw}', desc: 'Unpadded month (1-12)' },
	DD: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	DDD: { tempo: '{doy:raw}', desc: 'Unpadded day of year (1-366)' },
	HH24: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (0-23)' },
	HH12: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	HH: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	MI: { tempo: '{mi:raw}', desc: 'Unpadded minute (0-59)' },
	SS: { tempo: '{ss:raw}', desc: 'Unpadded second (0-59)' },
	SSSSS: { tempo: '{ss:day:raw}', desc: 'Unpadded seconds past midnight (0-86399)' },
	IW: { tempo: '{woy:raw}', desc: 'Unpadded ISO week of year (1-53)' },
	WW: { tempo: '{woy:cal:raw}', desc: 'Unpadded week of year starting Jan 1 (1-53)' },
	W: { tempo: '{wom}', desc: 'Week of month (1-5)' },
	J: { tempo: '{jj}', desc: 'Astronomical Julian day number' },
};

const PHP_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	Y: { tempo: '{yyyy}', desc: '4-digit year' },
	y: { tempo: '{yy}', desc: '2-digit year' },
	o: { tempo: '{yow}', desc: '4-digit ISO week-numbering year' },
	m: { tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
	n: { tempo: '{mm:raw}', desc: 'Unpadded month number (1-12)' },
	M: { tempo: '{mmm}', desc: 'Short month name (e.g. Jan)' },
	F: { tempo: '{mon}', desc: 'Full month name (e.g. January)' },
	d: { tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
	j: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	t: { tempo: '{dim}', desc: 'Number of days in given month (28-31)' },
	S: { tempo: '', desc: 'English ordinal suffix (st, nd, rd, th)' },
	z: { tempo: '{doy:raw:0}', desc: 'The day of the year starting from 0 (0-365)' },
	l: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Sunday)' },
	D: { tempo: '{www}', desc: 'Short weekday name (e.g. Sun)' },
	N: { tempo: '{dow}', desc: 'ISO-8601 day of week (1 for Monday to 7 for Sunday)' },
	w: { tempo: '{dow:0}', desc: 'Day of week (0 for Sunday to 6 for Saturday)' },
	W: { tempo: '{woy}', desc: 'ISO-8601 week number (01-53)' },
	H: { tempo: '{hh}', desc: '24-hour clock (00-23)' },
	G: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (0-23)' },
	h: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	g: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	i: { tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
	s: { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	v: { tempo: '{ms}', desc: 'Millisecond (000-999)' },
	u: { tempo: '{ff:6}', desc: 'Microseconds (6 digits)' },
	a: { tempo: '{mer}', desc: 'AM/PM marker (lowercase)' },
	A: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	O: { tempo: '{tz:offsetcompact}', desc: 'Difference to GMT without colon (+0200)' },
	P: { tempo: '{tz:offset}', desc: 'Difference to GMT with colon (+02:00)' },
	T: { tempo: '{tz:short}', desc: 'Timezone abbreviation (e.g. UTC, EST)' },
	e: { tempo: '{tz}', desc: 'Timezone identifier (e.g. UTC, Europe/London)' },
	U: { tempo: '{ts}', desc: 'Seconds since the Unix Epoch' },
	c: { tempo: '{yyyy}-{mm}-{dd}T{hh}:{mi}:{ss}{tz:offset}', desc: 'ISO 8601 date' },
	r: { tempo: '{www}, {dd} {mmm} {yyyy} {hh}:{mi}:{ss} {tz:offsetcompact}', desc: 'RFC 2822 formatted date' },
};

const GO_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	2006: { tempo: '{yyyy}', desc: '4-digit year' },
	'06': { tempo: '{yy}', desc: '2-digit year' },
	January: { tempo: '{mon}', desc: 'Full month name (e.g. January)' },
	Jan: { tempo: '{mmm}', desc: 'Short month name (e.g. Jan)' },
	'01': { tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
	1: { tempo: '{mm:raw}', desc: 'Unpadded month number (1-12)' },
	'02': { tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
	_2: { tempo: '{dd:space}', desc: 'Space-padded day of month ( 1-31)' },
	2: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	'002': { tempo: '{doy}', desc: 'Day of year (001-366)' },
	__2: { tempo: '{doy:space}', desc: 'Space-padded day of year (  1-366)' },
	Monday: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Monday)' },
	Mon: { tempo: '{www}', desc: 'Short weekday name (e.g. Mon)' },
	15: { tempo: '{hh}', desc: '24-hour clock (00-23)' },
	'03': { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	3: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	'04': { tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
	4: { tempo: '{mi:raw}', desc: 'Unpadded minute (0-59)' },
	'05': { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	5: { tempo: '{ss:raw}', desc: 'Unpadded second (0-59)' },
	PM: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	pm: { tempo: '{mer}', desc: 'AM/PM marker (lowercase)' },
	'.000': { tempo: '.{ms}', desc: 'Millisecond (000-999)' },
	'.000000': { tempo: '.{ff:6}', desc: 'Microsecond (6 digits)' },
	'.000000000': { tempo: '.{ff:9}', desc: 'Nanosecond (9 digits)' },
	'.999': { tempo: '', desc: 'Trailing millisecond with dot omitted if zero (unsupported in Tempo tokens)' },
	'.999999': { tempo: '', desc: 'Trailing microsecond with dot omitted if zero (unsupported in Tempo tokens)' },
	'.999999999': { tempo: '', desc: 'Trailing nanosecond with dot omitted if zero (unsupported in Tempo tokens)' },
	'Z07:00': { tempo: '{tz:offset:utc}', desc: 'UTC Z or ISO-8601 offset' },
	'Z07:00:00': { tempo: '{tz:offset:ss:utc}', desc: 'UTC Z or ISO-8601 offset with seconds' },
	Z0700: { tempo: '{tz:offsetcompact:utc}', desc: 'UTC Z or basic numeric offset' },
	Z070000: { tempo: '{tz:offsetcompact:ss:utc}', desc: 'UTC Z or basic numeric offset with seconds' },
	'-07:00': { tempo: '{tz:offset}', desc: 'ISO-8601 numeric offset' },
	'-07:00:00': { tempo: '{tz:offset:ss}', desc: 'ISO-8601 numeric offset with seconds' },
	'-0700': { tempo: '{tz:offsetcompact}', desc: 'Basic numeric offset' },
	'-070000': { tempo: '{tz:offsetcompact:ss}', desc: 'Basic numeric offset with seconds' },
	'-07': { tempo: '{tz:offset:hh}', desc: 'Hour-only numeric offset with sign' },
	Z07: { tempo: '{tz:offset:short:utc}', desc: 'UTC Z or hour-only numeric offset' },
	MST: { tempo: '{tz:short}', desc: 'Short localized time zone abbreviation' },
};

const MYSQL_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	Y: { tempo: '{yyyy}', desc: '4-digit year' },
	y: { tempo: '{yy}', desc: '2-digit year' },
	m: { tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
	c: { tempo: '{mm:raw}', desc: 'Unpadded month number (1-12)' },
	M: { tempo: '{mon}', desc: 'Full month name (e.g. October)' },
	b: { tempo: '{mmm}', desc: 'Short month name (e.g. Oct)' },
	d: { tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
	e: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	D: { tempo: '{dd:ord}', desc: 'Day of month with English suffix (1st, 2nd, etc.)' },
	H: { tempo: '{hh}', desc: '24-hour clock (00-23)' },
	k: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (0-23)' },
	h: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	I: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	l: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	i: { tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
	s: { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	S: { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	f: { tempo: '{ff:6}', desc: 'Microseconds (000000-999999)' },
	p: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	r: { tempo: '{h12}:{mi}:{ss} {mer:upper}', desc: '12-hour time (hh:mm:ss AM/PM)' },
	T: { tempo: '{hh}:{mi}:{ss}', desc: '24-hour time (hh:mm:ss)' },
	W: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Saturday)' },
	a: { tempo: '{www}', desc: 'Short weekday name (e.g. Sat)' },
	w: { tempo: '{dow:0}', desc: 'Day of week (0=Sunday..6=Saturday)' },
	j: { tempo: '{doy}', desc: 'Day of year (001-366)' },
	v: { tempo: '{woy}', desc: 'Zero-padded ISO week of year (01-53)' },
	x: { tempo: '{yow}', desc: '4-digit ISO week-numbering year' },
	u: { tempo: '', desc: 'Week number with Monday as first day (00-53)' },
	U: { tempo: '', desc: 'Week number with Sunday as first day (00-53)' },
	V: { tempo: '', desc: 'Week number with Sunday as first day (01-53)' },
	X: { tempo: '', desc: '4-digit year for week %V' },
};

const RE_LDML = new RegExp(`'(''|[^'])*'|(${LDML_TOKENS.join('|')})`, 'g');
const RE_STRFTIME = new RegExp(`%(-)?(\\d+)?([${STRFTIME_SPECIFIERS.join('')}])`, 'g');
const RE_MOMENT = /\[([^\]]+)\]|(YYYY|YY|gggg|GGGG|gg|GG|MMMM|MMM|MM|Mo|M|dddd|ddd|dd|DDDD|DDDo|DDD|DD|Do|D|do|d|HH|H|hh|h|mm|m|ss|s|SSSSSSSSS|SSSSSSSS|SSSSSSS|SSSSSS|SSSSS|SSSS|SSS|SS|S|WW|Wo|W|Qo|Q|A|a|E|X|x|ZZ|zz|Z|z)/g;
const ORACLE_CASE_SENSITIVE_TOKENS = new Set([
	'MONTH',
	'MON',
	'DAY',
	'DY',
	'RM',
	'AM',
	'PM',
	'A.M.',
	'P.M.',
]);

const RE_ORACLE = new RegExp(ORACLE_TOKEN_REGEX.source, 'gi');
const RE_GO_EXPLAIN = new RegExp(GO_TOKEN_REGEX.source, 'g');
const RE_MYSQL = new RegExp(`%([${MYSQL_SPECIFIERS.join('')}])`, 'g');
const RE_DOTNET = new RegExp(`'((?:\\\\.|[^'])*)'|"((?:\\\\.|[^"])*)"|\\\\(.)|%?(${DOTNET_TOKENS.join('|')})`, 'g');

const DOTNET_EXPLAIN_MAP: Readonly<Record<string, { readonly tempo: string; readonly desc: string }>> = {
	yyyyy: { tempo: '{yyyy}', desc: 'Year with at least 5 digits' },
	yyyy: { tempo: '{yyyy}', desc: '4-digit year' },
	yyy: { tempo: '{yyyy}', desc: 'Year with at least 3 digits' },
	yy: { tempo: '{yy}', desc: '2-digit year' },
	y: { tempo: '{yy:raw}', desc: 'Unpadded 2-digit year (0-99)' },
	MMMM: { tempo: '{mon}', desc: 'Full month name (e.g. October)' },
	MMM: { tempo: '{mmm}', desc: 'Short month name (e.g. Oct)' },
	MM: { tempo: '{mm}', desc: 'Zero-padded month (01-12)' },
	M: { tempo: '{mm:raw}', desc: 'Unpadded month number (1-12)' },
	dddd: { tempo: '{wkd}', desc: 'Full weekday name (e.g. Saturday)' },
	ddd: { tempo: '{www}', desc: 'Short weekday name (e.g. Sat)' },
	dd: { tempo: '{dd}', desc: 'Zero-padded day of month (01-31)' },
	d: { tempo: '{dd:raw}', desc: 'Unpadded day of month (1-31)' },
	HH: { tempo: '{hh}', desc: '24-hour clock (00-23)' },
	H: { tempo: '{hh:raw}', desc: 'Unpadded 24-hour clock (0-23)' },
	hh: { tempo: '{h12}', desc: '12-hour clock (01-12)' },
	h: { tempo: '{h12:raw}', desc: 'Unpadded 12-hour clock (1-12)' },
	mm: { tempo: '{mi}', desc: 'Zero-padded minute (00-59)' },
	m: { tempo: '{mi:raw}', desc: 'Unpadded minute (0-59)' },
	ss: { tempo: '{ss}', desc: 'Zero-padded second (00-59)' },
	s: { tempo: '{ss:raw}', desc: 'Unpadded second (0-59)' },
	fffffff: { tempo: '{ff:7}', desc: 'Fractional seconds (7 digits / 100ns ticks)' },
	ffffff: { tempo: '{ff:6}', desc: 'Microseconds (6 digits)' },
	fffff: { tempo: '{ff:5}', desc: 'Fractional seconds (5 digits)' },
	ffff: { tempo: '{ff:4}', desc: 'Fractional seconds (4 digits)' },
	fff: { tempo: '{ms}', desc: 'Millisecond (000-999)' },
	ff: { tempo: '{ff:2}', desc: 'Fractional seconds (hundredths: 00-99)' },
	f: { tempo: '{ff:1}', desc: 'Fractional seconds (tenths: 0-9)' },
	FFFFFFF: { tempo: '{ff:7}', desc: 'Non-zero fractional seconds (up to 7 digits)' },
	FFFFFF: { tempo: '{ff:6}', desc: 'Non-zero microseconds (up to 6 digits)' },
	FFFFF: { tempo: '{ff:5}', desc: 'Non-zero fractional seconds (up to 5 digits)' },
	FFFF: { tempo: '{ff:4}', desc: 'Non-zero fractional seconds (up to 4 digits)' },
	FFF: { tempo: '{ms}', desc: 'Non-zero milliseconds (up to 3 digits)' },
	FF: { tempo: '{ff:2}', desc: 'Non-zero fractional seconds (up to 2 digits)' },
	F: { tempo: '{ff:1}', desc: 'Non-zero tenths of second' },
	tt: { tempo: '{mer:upper}', desc: 'AM/PM marker (uppercase)' },
	t: { tempo: '{mer:upper}', desc: 'A/P marker' },
	zzz: { tempo: '{tz:offset}', desc: 'Full signed time zone offset (+00:00)' },
	zz: { tempo: '{tz:offset:hh}', desc: 'Signed 2-digit hour offset (+00)' },
	z: { tempo: '{tz:offset:hh}', desc: 'Signed hour offset (+0)' },
	K: { tempo: '{tz:offset:utc}', desc: 'UTC Z or signed time zone offset' },
	gg: { tempo: '{era}', desc: 'Era designator (A.D.)' },
	g: { tempo: '{era}', desc: 'Era designator (A.D.)' },
};

const RE_SHEET_AM_PM = /\b(?:am\/pm|a\/p)\b/i;

const RE_ORACLE_FF_PRECISION = /^FF([1-9])$/i;
const RE_LDML_FRACTIONAL = /^S{1,9}$/;
const RE_BRACES = /[{}]/g;
const RE_LDML_ESCAPED_QUOTE = /''/g;

/**
 * Escapes literal text before appending to native Tempo patterns so literal braces are not
 * misinterpreted as token delimiters.
 */
function appendLiteral(text: string): string {
	return text ? text.replace(RE_BRACES, (m) => (m === '{' ? '{{' : '}}')) : '';
}

/**
 * Translates external dialect masks into native Tempo format patterns (`{yyyy}-{mm}-{dd}`)
 * and returns detailed token explanations to aid incremental migration.
 * Unmapped text is retained; Oracle FM/FX modifiers are omitted from the pattern.
 *
 * @param dialectOrOptions - A dialect name or supplier, or an object with `dialect`; omitted values use detection
 * @returns A deeply frozen result whose string form is the translated pattern. An empty `tempo` mapping
 * identifies a recognized token without a native equivalent or an Oracle FM/FX modifier.
 * @throws Errors from evaluating a dialect supplier propagate to the caller.
 */
export function explain(mask: string, dialectOrOptions?: any): ExplainResult {
	const dialect = detectDialect(mask, dialectOrOptions);
	const tokens: ExplainedToken[] = [];
	let pattern = '';

	switch (dialect) {
		case DIALECT.Oracle: {
			let lastIndex = 0;
			let fillMode = false;
			for (const match of mask.matchAll(RE_ORACLE)) {
				const index = match.index!;
				if (index > lastIndex)
					pattern += appendLiteral(mask.slice(lastIndex, index));

				const raw = match[0];
				const upper = raw.toUpperCase();
				if (raw.startsWith('"') && raw.endsWith('"')) {
					pattern += appendLiteral(raw.slice(1, -1));
				} else if (upper === 'FM') {
					fillMode = !fillMode;
					tokens.push({ source: raw, tempo: '', desc: 'Fill Mode toggle (suppresses padding)' });
				} else if (upper === 'FX') {
					tokens.push({ source: raw, tempo: '', desc: 'Format exact matching modifier' });
				} else {
					const isCaseSensitive = ORACLE_CASE_SENSITIVE_TOKENS.has(upper);
					let info = (fillMode ? ORACLE_UNPADDED_EXPLAIN_MAP[upper] : undefined)
						?? ORACLE_EXPLAIN_MAP[raw]
						?? (!isCaseSensitive ? ORACLE_EXPLAIN_MAP[upper] : undefined);

					if (!info && RE_ORACLE_FF_PRECISION.test(raw)) {
						const prec = raw.slice(2);
						info = { tempo: `{ff:${prec}}`, desc: `Fractional seconds (${prec} digits)` };
					}

					if (info) {
						pattern += (info.tempo)
							? info.tempo
							: appendLiteral(raw);

						tokens.push({ source: raw, tempo: info.tempo, desc: info.desc });
					} else {
						pattern += appendLiteral(raw);
					}
				}
				lastIndex = index + raw.length;
			}
			if (lastIndex < mask.length)
				pattern += appendLiteral(mask.slice(lastIndex));
			break;
		}

		case DIALECT.Strftime: {
			let lastIndex = 0;
			for (const match of mask.matchAll(RE_STRFTIME)) {
				const index = match.index!;
				if (index > lastIndex)
					pattern += appendLiteral(mask.slice(lastIndex, index));

				const [raw, flag, width, spec] = match;
				if (spec === '%') {
					pattern += '%';
				} else if (spec === 'f') {
					const n = Number(width ?? 6);
					if (n < 1 || n > 9) {
						pattern += appendLiteral(raw);
						lastIndex = index + raw.length;
						continue;
					}
					const prec = String(n);
					const tempo = `{ff:${prec}}`;
					pattern += tempo;
					tokens.push({ source: raw, tempo, desc: `Fractional seconds (${prec} digits)` });
				} else if (flag === '-') {
					const rawInfo = STRFTIME_RAW_MAP[spec];
					const baseInfo = STRFTIME_EXPLAIN_MAP[spec];
					if (!isUndefined(rawInfo) || !isUndefined(baseInfo)) {
						const tempo = rawInfo?.tempo ?? baseInfo?.tempo ?? '';
						const desc = rawInfo?.desc ?? baseInfo?.desc ?? spec;
						pattern += tempo || appendLiteral(raw);
						tokens.push({ source: raw, tempo, desc });
					} else {
						pattern += appendLiteral(raw);
					}
				} else {
					const info = STRFTIME_EXPLAIN_MAP[spec];
					if (info) {
						pattern += info.tempo || appendLiteral(raw);
						tokens.push({ source: raw, tempo: info.tempo, desc: info.desc });
					} else {
						pattern += appendLiteral(raw);
					}
				}
				lastIndex = index + raw.length;
			}
			if (lastIndex < mask.length)
				pattern += appendLiteral(mask.slice(lastIndex));
			break;
		}

		case DIALECT.Moment: {
			let lastIndex = 0;
			for (const match of mask.matchAll(RE_MOMENT)) {
				const index = match.index!;
				if (index > lastIndex)
					pattern += appendLiteral(mask.slice(lastIndex, index));

				const raw = match[0];
				if (raw.startsWith('[')) {
					pattern += appendLiteral(match[1] ?? raw.slice(1, -1));
				} else {
					const info = MOMENT_EXPLAIN_MAP[raw];
					if (info) {
						pattern += info.tempo || appendLiteral(raw);
						tokens.push({ source: raw, tempo: info.tempo, desc: info.desc });
					} else {
						pattern += appendLiteral(raw);
					}
				}
				lastIndex = index + raw.length;
			}
			if (lastIndex < mask.length)
				pattern += appendLiteral(mask.slice(lastIndex));
			break;
		}

		case DIALECT.Php: {
			let i = 0;
			while (i < mask.length) {
				const char = mask[i];
				if (char === '\\' && i + 1 < mask.length) {
					pattern += appendLiteral(mask[i + 1]);
					i += 2;
					continue;
				}

				// Match compound day + ordinal suffix (e.g. 'jS' -> '{dd:ord}', 'dS' -> '{dd:ord}')
				if ((char === 'j' || char === 'd') && i + 1 < mask.length && mask[i + 1] === 'S') {
					pattern += '{dd:ord}';
					tokens.push({
						source: char + 'S',
						tempo: '{dd:ord}',
						desc: 'Day of month with ordinal suffix (e.g. 1st, 2nd)',
					});
					i += 2;
					continue;
				}

				const info = PHP_EXPLAIN_MAP[char];
				if (info) {
					pattern += info.tempo || appendLiteral(char);
					tokens.push({ source: char, tempo: info.tempo, desc: info.desc });
				} else {
					pattern += appendLiteral(char);
				}
				i++;
			}
			break;
		}

		case DIALECT.Go: {
			let lastIndex = 0;
			for (const match of mask.matchAll(RE_GO_EXPLAIN)) {
				const index = match.index!;
				if (index > lastIndex)
					pattern += appendLiteral(mask.slice(lastIndex, index));

				const raw = match[0];
				const info = GO_EXPLAIN_MAP[raw];
				if (info) {
					pattern += info.tempo || appendLiteral(raw);
					tokens.push({ source: raw, tempo: info.tempo, desc: info.desc });
				} else {
					pattern += appendLiteral(raw);
				}
				lastIndex = index + raw.length;
			}
			if (lastIndex < mask.length)
				pattern += appendLiteral(mask.slice(lastIndex));
			break;
		}

		case DIALECT.Mysql: {
			let lastIndex = 0;
			for (const match of mask.matchAll(RE_MYSQL)) {
				const index = match.index!;
				if (index > lastIndex)
					pattern += appendLiteral(mask.slice(lastIndex, index));

				const [raw, spec] = match;
				if (spec === '%') {
					pattern += '%';
				} else {
					const info = MYSQL_EXPLAIN_MAP[spec];
					if (info) {
						pattern += info.tempo || appendLiteral(raw);
						tokens.push({ source: raw, tempo: info.tempo, desc: info.desc });
					} else {
						pattern += appendLiteral(raw);
					}
				}
				lastIndex = index + raw.length;
			}
			if (lastIndex < mask.length)
				pattern += appendLiteral(mask.slice(lastIndex));
			break;
		}

		case DIALECT.DotNet: {
			const normalizedMask = normalizeDotNetMask(mask);
			let lastIndex = 0;
			for (const match of normalizedMask.matchAll(RE_DOTNET)) {
				const index = match.index!;
				if (index > lastIndex)
					pattern += appendLiteral(normalizedMask.slice(lastIndex, index));

				if (match[1] !== undefined) {
					pattern += appendLiteral(unescapeDotNetQuoted(match[1]));
				} else if (match[2] !== undefined) {
					pattern += appendLiteral(unescapeDotNetQuoted(match[2]));
				} else if (match[3] !== undefined) {
					pattern += appendLiteral(match[3]);
				} else if (match[4] !== undefined) {
					const token = match[4];
					const info = DOTNET_EXPLAIN_MAP[token];
					if (info) {
						pattern += info.tempo || appendLiteral(token);
						tokens.push({ source: match[0], tempo: info.tempo, desc: info.desc });
					} else {
						pattern += appendLiteral(token);
					}
				}
				lastIndex = index + match[0].length;
			}
			if (lastIndex < normalizedMask.length)
				pattern += appendLiteral(normalizedMask.slice(lastIndex));
			break;
		}

		case DIALECT.Sheet: {
			const is12Hour = RE_SHEET_AM_PM.test(mask);
			const tokenMatches = tokenizeSheetMask(mask);
			for (const t of tokenMatches) {
				if (t.type === 'literal') {
					pattern += appendLiteral(t.value);
					continue;
				}
				const tok = t.value;
				const raw = t.raw ?? tok;
				const key = tok.toLowerCase();
				let tempo = '';
				let desc = '';
				switch (key) {
					case 'yyyy':
						tempo = '{yyyy}';
						desc = '4-digit year';
						break;
					case 'yy':
						tempo = '{yy}';
						desc = '2-digit year';
						break;
					case 'mmmmm':
						tempo = '{mon:1}';
						desc = 'First letter of month';
						break;
					case 'mmmm':
						tempo = '{mon}';
						desc = 'Full month name';
						break;
					case 'mmm':
						tempo = '{mmm}';
						desc = 'Short month name';
						break;
					case 'mm':
						if (t.isMinute) {
							tempo = '{mi}';
							desc = 'Zero-padded minute (00-59)';
						} else {
							tempo = '{mm}';
							desc = 'Zero-padded month (01-12)';
						}
						break;
					case 'm':
						if (t.isMinute) {
							tempo = '{mi:raw}';
							desc = 'Unpadded minute (0-59)';
						} else {
							tempo = '{mm:raw}';
							desc = 'Unpadded month (1-12)';
						}
						break;
					case 'dddd':
						tempo = '{wkd}';
						desc = 'Full weekday name';
						break;
					case 'ddd':
						tempo = '{www}';
						desc = 'Short weekday name';
						break;
					case 'dd':
						tempo = '{dd}';
						desc = 'Zero-padded day of month (01-31)';
						break;
					case 'd':
						tempo = '{dd:raw}';
						desc = 'Unpadded day of month (1-31)';
						break;
					case 'hh':
						if (is12Hour) {
							tempo = '{h12}';
							desc = 'Zero-padded 12-hour clock (01-12)';
						} else {
							tempo = '{hh}';
							desc = 'Zero-padded 24-hour clock (00-23)';
						}
						break;
					case 'h':
						if (is12Hour) {
							tempo = '{h12:raw}';
							desc = 'Unpadded 12-hour clock (1-12)';
						} else {
							tempo = '{hh:raw}';
							desc = 'Unpadded 24-hour clock (0-23)';
						}
						break;
					case 'ss':
						tempo = '{ss}';
						desc = 'Zero-padded second (00-59)';
						break;
					case 's':
						tempo = '{ss:raw}';
						desc = 'Unpadded second (0-59)';
						break;
					case 'am/pm':
					case 'a/p':
						tempo = '{mer:upper}';
						desc = 'AM/PM marker';
						break;
					case '.000':
						tempo = '.{ms}';
						desc = 'Millisecond (000-999)';
						break;
					case '.00':
						tempo = '.{ff:2}';
						desc = 'Hundredths of second (00-99)';
						break;
					case '.0':
						tempo = '.{ff:1}';
						desc = 'Tenths of second (0-9)';
						break;
					case '[h]':
					case '[hh]':
						tempo = '';
						desc = 'Elapsed hours';
						break;
					case '[m]':
					case '[mm]':
						tempo = '';
						desc = 'Elapsed minutes';
						break;
					case '[s]':
					case '[ss]':
						tempo = '';
						desc = 'Elapsed seconds';
						break;
					default:
						pattern += appendLiteral(raw);
						continue;
				}
				pattern += tempo || appendLiteral(raw);
				tokens.push({ source: raw, tempo, desc });
			}
			break;
		}

		case DIALECT.Ldml:
		default: {
			let lastIndex = 0;
			for (const match of mask.matchAll(RE_LDML)) {
				const index = match.index!;
				if (index > lastIndex)
					pattern += appendLiteral(mask.slice(lastIndex, index));

				const raw = match[0];
				if (raw.startsWith("'")) {
					const unquoted = raw.length === 2 && raw === "''" ? "'" : raw.slice(1, -1).replace(RE_LDML_ESCAPED_QUOTE, "'");
					pattern += appendLiteral(unquoted);
				} else {
					let info = LDML_EXPLAIN_MAP[raw];
					if (!info && RE_LDML_FRACTIONAL.test(raw))
						info = { tempo: `{ff:${raw.length}}`, desc: `Fractional seconds (${raw.length} digits)` };

					if (info) {
						pattern += info.tempo;
						tokens.push({ source: raw, tempo: info.tempo, desc: info.desc });
					} else {
						pattern += appendLiteral(raw);
					}
				}
				lastIndex = index + raw.length;
			}
			if (lastIndex < mask.length)
				pattern += appendLiteral(mask.slice(lastIndex));
			break;
		}
	}

	const result: ExplainResult = {
		dialect,
		source: mask,
		pattern,
		tokens,
		toString: () => pattern,
	};

	return deepFreeze(result);
}


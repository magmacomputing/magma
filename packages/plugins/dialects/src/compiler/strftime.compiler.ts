import { pad, WeakCache } from '@magmacomputing/tempo/library';
import { enums, Enum } from '@magmacomputing/tempo/support';
import {
	type FormatterFn,
	type ParseOptions,
	escapeRegex,
	resolveMonth,
	createGroupExtractor,
	resolveParseContext,
	resolveTimeComponents,
	resolveDayOfYear,
	getIsoWeek,
	fromIsoWeek,
	resolveIsoCalendarYear,
} from './shared.compiler.js';

const STRFTIME_FORMAT_CACHE = new WeakCache<string, FormatterFn>();
const STRFTIME_PARSE_CACHE = new WeakCache<string, RegExp>();

const STRFTIME_SPECIFIER_REGEX = /%(-)?(\d+)?([a-zA-Z%])/g;

/**
 * Compiles a POSIX strftime format string into a fast formatter function.
 */
export function compileStrftimeFormatter(mask: string): FormatterFn {
	let cached = STRFTIME_FORMAT_CACHE.get(mask);
	if (cached) return cached;

	const parts: ((zdt: Temporal.ZonedDateTime) => string)[] = [];
	let lastIndex = 0;

	for (const match of mask.matchAll(STRFTIME_SPECIFIER_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			parts.push(() => literal);
		}

		const [, flag, width, specifier] = match;
		const formatNum = (val: number, len = 2, padChar = '0') => (flag === '-' ? String(val) : pad(val, len, padChar));

		switch (specifier) {
			case '%':
				parts.push(() => '%');
				break;
			case 'Y':
				parts.push((z) => pad(z.year, 4));
				break;
			case 'y':
				parts.push((z) => pad(((z.year % 100) + 100) % 100, 2));
				break;
			case 'C':
				parts.push((z) => pad(Math.abs(Math.floor(z.year / 100)), 2));
				break;
			case 'm':
				parts.push((z) => formatNum(z.month));
				break;
			case 'B':
				parts.push((z) => Enum.keyOf(enums.MONTHS, z.month) ?? String(z.month));
				break;
			case 'b':
			case 'h':
				parts.push((z) => Enum.keyOf(enums.MONTH, z.month) ?? String(z.month));
				break;
			case 'd':
				parts.push((z) => formatNum(z.day));
				break;
			case 'e':
				parts.push((z) => formatNum(z.day, 2, ' '));
				break;
			case 'H':
				parts.push((z) => formatNum(z.hour));
				break;
			case 'I':
				parts.push((z) => formatNum(z.hour % 12 || 12));
				break;
			case 'l':
				parts.push((z) => formatNum(z.hour % 12 || 12, 2, ' '));
				break;
			case 'k':
				parts.push((z) => formatNum(z.hour, 2, ' '));
				break;
			case 'G':
				parts.push((z) => {
					const iso = (z as any).withCalendar ? (z as any).withCalendar('iso8601') : z;
					return pad(getIsoWeek(iso).yearOfWeek, 4);
				});
				break;
			case 'g':
				parts.push((z) => {
					const iso = (z as any).withCalendar ? (z as any).withCalendar('iso8601') : z;
					return pad(getIsoWeek(iso).yearOfWeek % 100, 2);
				});
				break;
			case 's':
				parts.push((z) => Math.floor(z.epochMilliseconds / 1000).toString());
				break;
			case 'D':
				parts.push((z) => `${pad(z.month, 2)}/${pad(z.day, 2)}/${pad(z.year % 100, 2)}`);
				break;
			case 'M':
				parts.push((z) => formatNum(z.minute));
				break;
			case 'S':
				parts.push((z) => formatNum(z.second));
				break;
			case 'f':
				parts.push((z) => {
					const w = width ? Math.min(9, Math.max(1, Number(width))) : 6;
					const nsTotal = z.millisecond * 1_000_000 + z.microsecond * 1000 + z.nanosecond;
					return pad(nsTotal, 9).slice(0, w);
				});
				break;
			case 'p':
				parts.push((z) => (z.hour < 12 ? 'AM' : 'PM'));
				break;
			case 'P':
				parts.push((z) => (z.hour < 12 ? 'am' : 'pm'));
				break;
			case 'A':
				parts.push((z) => Enum.keyOf(enums.WEEKDAYS, z.dayOfWeek) ?? String(z.dayOfWeek));
				break;
			case 'a':
				parts.push((z) => Enum.keyOf(enums.WEEKDAY, z.dayOfWeek) ?? String(z.dayOfWeek));
				break;
			case 'w':
				parts.push((z) => String(z.dayOfWeek === 7 ? 0 : z.dayOfWeek));
				break;
			case 'u':
				parts.push((z) => String(z.dayOfWeek));
				break;
			case 'j':
				parts.push((z) => formatNum(z.dayOfYear, 3));
				break;
			case 'V':
				parts.push((z) => {
					let w: number | undefined;
					try {
						w = (z as any).withCalendar?.('iso8601')?.weekOfYear;
					} catch {
						w = undefined;
					}
					if (w === undefined) return match[0];
					return formatNum(w);
				});
				break;
			case 'F':
				parts.push((z) => `${pad(z.year, 4)}-${pad(z.month, 2)}-${pad(z.day, 2)}`);
				break;
			case 'T':
				parts.push((z) => `${pad(z.hour, 2)}:${pad(z.minute, 2)}:${pad(z.second, 2)}`);
				break;
			case 'R':
				parts.push((z) => `${pad(z.hour, 2)}:${pad(z.minute, 2)}`);
				break;
			case 'z':
				parts.push((z) => z.offset.replace(':', ''));
				break;
			case 'Z':
				parts.push((z) => z.timeZoneId);
				break;
			default:
				parts.push(() => match[0]);
				break;
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		parts.push(() => trailing);
	}

	const fn: FormatterFn = (zdt) => parts.map((p) => p(zdt)).join('');
	STRFTIME_FORMAT_CACHE.set(mask, fn);
	return fn;
}

/**
 * Formats a date using POSIX strftime specifiers.
 */
export function formatStrftime(zdt: Temporal.ZonedDateTime, mask: string): string {
	const formatter = compileStrftimeFormatter(mask);
	return formatter(zdt);
}

/**
 * Compiles a strftime mask into a parsing RegExp.
 */
export function compileStrftimeParser(mask: string): RegExp {
	let cached = STRFTIME_PARSE_CACHE.get(mask);
	if (cached) return cached;

	const groupCounts: Record<string, number> = {};
	const group = (name: string, regex: string) => {
		const count = (groupCounts[name] = (groupCounts[name] ?? 0) + 1);
		const groupName = count === 1 ? name : `${name}_${count}`;
		return `(?<${groupName}>${regex})`;
	};

	let pattern = '';
	let lastIndex = 0;

	for (const match of mask.matchAll(STRFTIME_SPECIFIER_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			pattern += escapeRegex(literal);
		}

		const flag = match[1];
		const width = match[2];
		const specifier = match[3];
		switch (specifier) {
			case '%':
				pattern += '%';
				break;
			case 'Y':
				pattern += group('yyyy', '[+-]\\d{4,6}|\\d{4}');
				break;
			case 'y':
				pattern += group('yy', '\\d{2}');
				break;
			case 'C':
				pattern += group('century', '\\d{2}');
				break;
			case 'm':
				pattern += group('mm', '\\d{1,2}');
				break;
			case 'B':
				pattern += group('month_name', '[A-Za-z]+');
				break;
			case 'b':
			case 'h':
				pattern += group('month_abbr', '[A-Za-z]{3,}');
				break;
			case 'd':
				pattern += group('dd', '\\d{1,2}');
				break;
			case 'e':
				pattern += group('dd', '\\s?\\d{1,2}');
				break;
			case 'H':
				pattern += group('hh', '\\d{1,2}');
				break;
			case 'I':
				pattern += group('h12', '\\d{1,2}');
				break;
			case 'l':
				pattern += group('h12', '\\s?\\d{1,2}');
				break;
			case 'k':
				pattern += group('hh', flag === '-' ? '\\d{1,2}' : '\\s*\\d{1,2}');
				break;
			case 'G':
				pattern += group('iyyy', '\\d{4}');
				break;
			case 'g':
				pattern += group('iyy', '\\d{2}');
				break;
			case 'V':
				pattern += group('iw', '\\d{1,2}');
				break;
			case 'D':
				pattern += `${group('mm', '\\d{2}')}/${group('dd', '\\d{2}')}/${group('yy', '\\d{2}')}`;
				break;
			case 'M':
				pattern += group('mi', '\\d{1,2}');
				break;
			case 'S':
				pattern += group('ss', '\\d{1,2}');
				break;
			case 'f': {
				const w = width ? Math.min(9, Math.max(1, Number(width))) : 6;
				pattern += group('us', `\\d{1,${w}}`);
				break;
			}
			case 'p':
			case 'P':
				pattern += group('mer', '[AaPp][Mm]?');
				break;
			case 'A':
				pattern += group('weekday_name', '[A-Za-z]+');
				break;
			case 'a':
				pattern += group('weekday_abbr', '[A-Za-z]{3,}');
				break;
			case 'w':
				pattern += group('weekday_w', '[0-6]');
				break;
			case 'u':
				pattern += group('weekday_u', '[1-7]');
				break;
			case 'j':
				pattern += group('day_of_year', '\\d{1,3}');
				break;
			case 'z':
				pattern += group('tz_offset', '[+-]\\d{2}(?::?\\d{2})?|Z');
				break;
			case 'Z':
				pattern += group('tz_name', '[A-Za-z0-9_/+.-]+');
				break;
			case 'F':
				pattern += `${group('yyyy', '\\d{4}')}-${group('mm', '\\d{2}')}-${group('dd', '\\d{2}')}`;
				break;
			case 'T':
				pattern += `${group('hh', '\\d{2}')}:${group('mi', '\\d{2}')}:${group('ss', '\\d{2}')}`;
				break;
			case 'R':
				pattern += `${group('hh', '\\d{2}')}:${group('mi', '\\d{2}')}`;
				break;
			default:
				pattern += escapeRegex(match[0]);
				break;
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		pattern += escapeRegex(trailing);
	}

	const rx = new RegExp(`^${pattern}$`, 'i');
	STRFTIME_PARSE_CACHE.set(mask, rx);
	return rx;
}

/**
 * Parses an input string with a POSIX strftime mask.
 * Input is trimmed and matching is case-insensitive. Missing time fields default to zero.
 * For calendar date masks, an explicit year defaults missing month/day to January 1;
 * an explicit month defaults missing day to 1. Two-digit years use a cutoff of 70 (1970-2069).
 *
 * @param options - `today` supplies missing date fields; otherwise uses the current date in the resolved zone.
 * Parsed offsets or zone names override `timeZone` (default UTC); `calendar` defaults to iso8601.
 * @returns The parsed date-time, or undefined for a mismatch or rejected fields.
 * Temporal construction errors, including invalid time zones or calendars, are caught and return undefined.
 */
export function parseStrftime(
	input: string,
	mask: string,
	options: ParseOptions = {}
): Temporal.ZonedDateTime | undefined {
	const rx = compileStrftimeParser(mask);
	const match = rx.exec(input.trim());
	if (!match || !match.groups) return undefined;

	const getGroup = createGroupExtractor(match);
	const ctx = resolveParseContext(getGroup, options);
	if (!ctx) return undefined;
	const { tz, today, cal } = ctx;

	let year = today.year;
	const yyyy = getGroup('yyyy');
	const yyVal = getGroup('yy');
	const iyyy = getGroup('iyyy');
	const iyyVal = getGroup('iyy');
	const iw = getGroup('iw');
	if (yyyy) year = parseInt(yyyy, 10);
	else if (yyVal) {
		const yy = parseInt(yyVal, 10);
		year = yy >= 70 ? 1900 + yy : 2000 + yy;
	} else if (iyyy) {
		year = parseInt(iyyy, 10);
	} else if (iyyVal) {
		const yy = parseInt(iyyVal, 10);
		year = yy >= 70 ? 1900 + yy : 2000 + yy;
	}

	const hasYear = Boolean(yyyy || yyVal || iyyy || iyyVal);

	let month = 1;
	let day = 1;
	const day_of_year = getGroup('day_of_year');
	const mm = getGroup('mm');
	const month_name = getGroup('month_name');
	const month_abbr = getGroup('month_abbr');
	const dd = getGroup('dd')?.trim();

	if (day_of_year) {
		const res = resolveDayOfYear(year, parseInt(day_of_year, 10));
		if (!res) return undefined;
		month = res.month;
		day = res.day;
	} else if (iw) {
		const isoWeek = parseInt(iw, 10);
		if (isoWeek < 1 || isoWeek > 53) return undefined;
		const weekday_u = getGroup('weekday_u');
		const weekday_w = getGroup('weekday_w');
		let isoDay = 1;
		if (weekday_u) {
			const u = parseInt(weekday_u, 10);
			if (u < 1 || u > 7) return undefined;
			isoDay = u;
		} else if (weekday_w) {
			const w = parseInt(weekday_w, 10);
			if (w < 0 || w > 6) return undefined;
			isoDay = w === 0 ? 7 : w;
		}
		const isoYear = iyyy ? parseInt(iyyy, 10) : (iyyVal ? (parseInt(iyyVal, 10) >= 70 ? 1900 + parseInt(iyyVal, 10) : 2000 + parseInt(iyyVal, 10)) : year);
		const res = fromIsoWeek(isoYear, isoWeek, isoDay);
		const check = getIsoWeek(res);
		if (check.yearOfWeek !== isoYear || check.weekOfYear !== isoWeek)
			return undefined;

		year = res.year;
		month = res.month;
		day = res.day;
	} else {
		if (mm) month = parseInt(mm, 10);
		else if (month_name || month_abbr) {
			const m = resolveMonth(month_name || month_abbr!);
			if (m) month = m;
			else return undefined;
		} else if (!hasYear) {
			month = today.month;
		}

		if (dd) day = parseInt(dd, 10);
		else if (!hasYear && !mm && !month_name && !month_abbr) {
			day = today.day;
		}

		if ((iyyy || iyyVal) && mm && dd) {
			const isoYear = iyyy ? parseInt(iyyy, 10) : (parseInt(iyyVal!, 10) >= 70 ? 1900 + parseInt(iyyVal!, 10) : 2000 + parseInt(iyyVal!, 10));
			if ((month === 12 && day >= 29) || (month === 1 && day <= 3)) {
				const cand1 = isoYear;
				const cand2 = month === 12 ? isoYear - 1 : isoYear + 1;
				const match1 = getIsoWeek({ year: cand1, month, day }).yearOfWeek === isoYear;
				const match2 = getIsoWeek({ year: cand2, month, day }).yearOfWeek === isoYear;
				if (match1 && match2) {
					const weekday_u = getGroup('weekday_u');
					const weekday_w = getGroup('weekday_w');
					const wn = weekday_u ? parseInt(weekday_u, 10) : (weekday_w ? (parseInt(weekday_w, 10) === 0 ? 7 : parseInt(weekday_w, 10)) : undefined);
					if (wn !== undefined) {
						const d1 = new Date(Date.UTC(cand1, month - 1, day)).getUTCDay() || 7;
						const d2 = new Date(Date.UTC(cand2, month - 1, day)).getUTCDay() || 7;
						if (d1 === wn && d2 !== wn) year = cand1;
						else if (d2 === wn && d1 !== wn) year = cand2;
						else return undefined;
					} else {
						return undefined;
					}
				} else if (match1) {
					year = cand1;
				} else if (match2) {
					year = cand2;
				} else {
					return undefined;
				}
			} else {
				year = isoYear;
			}
		}
	}

	const time = resolveTimeComponents(getGroup);
	if (!time) return undefined;
	const { hour, minute, second } = time;
	let millisecond = 0;
	let microsecond = 0;
	let nanosecond = 0;
	const us = getGroup('us');
	if (us) {
		const padded = us.padEnd(9, '0').slice(0, 9);
		millisecond = parseInt(padded.slice(0, 3), 10);
		microsecond = parseInt(padded.slice(3, 6), 10);
		nanosecond = parseInt(padded.slice(6, 9), 10);
	}

	try {
		const isoZdt = Temporal.ZonedDateTime.from(
			{
				timeZone: tz,
				calendar: 'iso8601',
				year,
				month,
				day,
				hour,
				minute,
				second,
				millisecond,
				microsecond,
				nanosecond,
			},
			{ overflow: 'reject' }
		);
		return cal === 'iso8601' ? isoZdt : isoZdt.withCalendar(cal);
	} catch {
		return undefined;
	}
}

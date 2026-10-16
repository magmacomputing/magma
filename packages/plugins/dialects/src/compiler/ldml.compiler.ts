import { pad, suffix, WeakCache } from '@magmacomputing/tempo/library';
import { enums, Enum } from '@magmacomputing/tempo/support';
import {
	type FormatterFn,
	type ParseOptions,
	escapeRegex,
	resolveMonth,
	createGroupExtractor,
	resolveParseContext,
	resolveTimeComponents,
	fromIsoWeek,
	getIsoWeek,
} from './shared.compiler.js';

const FORMAT_CACHE = new WeakCache<string, FormatterFn>();
const PARSE_REGEX_CACHE = new WeakCache<string, RegExp>();

const LDML_TOKEN_REGEX = /'(''|[^'])*'|(ZZZZZ|yyyy|YYYY|MMMM|LLLL|EEEE|cccc|ZZZZ|zzzz|SSS|MMM|LLL|EEE|ccc|ZZZ|zzz|yy|YY|MM|LL|dd|HH|hh|kk|mm|ss|SS|aa|Do|ww|ZZ|zz|y|M|L|d|H|h|k|m|s|S|a|c|e|E|w|Z|z)/g;

/**
 * Compiles an LDML format mask into a high-performance string builder.
 */
export function compileLdmlFormatter(mask: string): FormatterFn {
	let cached = FORMAT_CACHE.get(mask);
	if (cached) return cached;

	const parts: ((zdt: Temporal.ZonedDateTime) => string)[] = [];
	let lastIndex = 0;

	for (const match of mask.matchAll(LDML_TOKEN_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			parts.push(() => literal);
		}

		const token = match[0];
		if (token.startsWith("'")) {
			// Quoted literal
			const unquoted = token.length === 2 && token === "''"
				? "'"
				: token.slice(1, -1).replace(/''/g, "'");
			parts.push(() => unquoted);
		} else {
			switch (token) {
				case 'yyyy':
					parts.push((z) => pad(z.year, 4));
					break;
				case 'YYYY':
					parts.push((z) => pad(getIsoWeek(z.toPlainDate()).yearOfWeek, 4));
					break;
				case 'yy':
					parts.push((z) => pad(z.year % 100, 2));
					break;
				case 'YY':
					parts.push((z) => pad(((getIsoWeek(z.toPlainDate()).yearOfWeek % 100) + 100) % 100, 2));
					break;
				case 'y':
					parts.push((z) => String(z.year));
					break;
				case 'ww':
					parts.push((z) => pad(getIsoWeek(z.toPlainDate()).weekOfYear, 2));
					break;
				case 'w':
					parts.push((z) => String(getIsoWeek(z.toPlainDate()).weekOfYear));
					break;

				case 'MMMM':
				case 'LLLL':
					parts.push((z) => Enum.keyOf(enums.MONTHS, z.month) ?? String(z.month));
					break;
				case 'MMM':
				case 'LLL':
					parts.push((z) => Enum.keyOf(enums.MONTH, z.month) ?? String(z.month));
					break;
				case 'MM':
				case 'LL':
					parts.push((z) => pad(z.month, 2));
					break;
				case 'M':
				case 'L':
					parts.push((z) => String(z.month));
					break;

				case 'dd':
					parts.push((z) => pad(z.day, 2));
					break;
				case 'Do':
					parts.push((z) => suffix(z.day));
					break;
				case 'd':
					parts.push((z) => String(z.day));
					break;

				case 'HH':
					parts.push((z) => pad(z.hour, 2));
					break;
				case 'H':
					parts.push((z) => String(z.hour));
					break;
				case 'hh': {
					parts.push((z) => {
						const h = z.hour % 12 || 12;
						return pad(h, 2);
					});
					break;
				}
				case 'h': {
					parts.push((z) => {
						const h = z.hour % 12 || 12;
						return String(h);
					});
					break;
				}
				case 'kk': {
					parts.push((z) => {
						const h = z.hour === 0 ? 24 : z.hour;
						return pad(h, 2);
					});
					break;
				}
				case 'k': {
					parts.push((z) => {
						const h = z.hour === 0 ? 24 : z.hour;
						return String(h);
					});
					break;
				}

				case 'mm':
					parts.push((z) => pad(z.minute, 2));
					break;
				case 'm':
					parts.push((z) => String(z.minute));
					break;

				case 'ss':
					parts.push((z) => pad(z.second, 2));
					break;
				case 's':
					parts.push((z) => String(z.second));
					break;

				case 'SSS':
					parts.push((z) => pad(z.millisecond, 3));
					break;
				case 'SS':
					parts.push((z) => pad(Math.floor(z.millisecond / 10), 2));
					break;
				case 'S':
					parts.push((z) => String(Math.floor(z.millisecond / 100)));
					break;

				case 'aa':
					parts.push((z) => (z.hour < 12 ? 'AM' : 'PM'));
					break;
				case 'a':
					parts.push((z) => (z.hour < 12 ? 'am' : 'pm'));
					break;

				case 'EEEE':
				case 'cccc':
					parts.push((z) => Enum.keyOf(enums.WEEKDAYS, z.dayOfWeek) ?? String(z.dayOfWeek));
					break;
				case 'EEE':
				case 'ccc':
				case 'E':
					parts.push((z) => Enum.keyOf(enums.WEEKDAY, z.dayOfWeek) ?? String(z.dayOfWeek));
					break;
				case 'c':
				case 'e':
					parts.push((z) => String(z.dayOfWeek));
					break;

				case 'ZZZZZ':
				case 'ZZZZ':
				case 'ZZZ':
				case 'Z':
					parts.push((z) => z.offset);
					break;
				case 'ZZ':
					parts.push((z) => z.offset.replace(':', ''));
					break;
				case 'zzzz':
				case 'zzz':
				case 'zz':
				case 'z':
					parts.push((z) => z.timeZoneId);
					break;

				default:
					parts.push(() => token);
					break;
			}
		}

		lastIndex = index + token.length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		parts.push(() => trailing);
	}

	const fn: FormatterFn = (zdt) => parts.map((p) => p(zdt)).join('');
	FORMAT_CACHE.set(mask, fn);
	return fn;
}

/**
 * Formats a date using an LDML mask.
 */
export function formatLdml(zdt: Temporal.ZonedDateTime, mask: string): string {
	const formatter = compileLdmlFormatter(mask);
	return formatter(zdt);
}

/**
 * Compiles an LDML mask into a parsing RegExp with named capture groups.
 */
export function compileLdmlParser(mask: string): RegExp {
	let cached = PARSE_REGEX_CACHE.get(mask);
	if (cached) return cached;

	const groupCounts: Record<string, number> = {};
	const group = (name: string, regex: string) => {
		const count = (groupCounts[name] = (groupCounts[name] ?? 0) + 1);
		const groupName = count === 1 ? name : `${name}_${count}`;
		return `(?<${groupName}>${regex})`;
	};

	let pattern = '';
	let lastIndex = 0;

	for (const match of mask.matchAll(LDML_TOKEN_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			pattern += escapeRegex(literal);
		}

		const token = match[0];
		if (token.startsWith("'")) {
			const unquoted = token.length === 2 && token === "''"
				? "'"
				: token.slice(1, -1).replace(/''/g, "'");
			pattern += escapeRegex(unquoted);
		} else {
			switch (token) {
				case 'yyyy':
					pattern += group('yyyy', '[+-]?\\d{4,6}|\\d{4}');
					break;
				case 'YYYY':
					pattern += group('yyyy_week', '[+-]?\\d{4,6}|\\d{4}');
					break;
				case 'yy':
					pattern += group('yy', '\\d{2}');
					break;
				case 'YY':
					pattern += group('yy_week', '\\d{2}');
					break;
				case 'y':
					pattern += group('yyyy', '\\d{1,6}');
					break;
				case 'ww':
					pattern += group('week_of_year', '\\d{2}');
					break;
				case 'w':
					pattern += group('week_of_year', '\\d{1,2}');
					break;

				case 'MMMM':
				case 'LLLL':
					pattern += group('month_name', '[A-Za-z]+');
					break;
				case 'MMM':
				case 'LLL':
					pattern += group('month_abbr', '[A-Za-z]{3,}');
					break;
				case 'MM':
				case 'LL':
					pattern += group('mm', '\\d{2}');
					break;
				case 'M':
				case 'L':
					pattern += group('mm', '\\d{1,2}');
					break;

				case 'dd':
					pattern += group('dd', '\\d{2}');
					break;
				case 'Do':
					pattern += group('dd_ord', '\\d{1,2}(?:st|nd|rd|th)');
					break;
				case 'd':
					pattern += group('dd', '\\d{1,2}');
					break;

				case 'HH':
					pattern += group('hh', '\\d{2}');
					break;
				case 'H':
					pattern += group('hh', '\\d{1,2}');
					break;
				case 'kk':
					pattern += group('h24', '\\d{2}');
					break;
				case 'k':
					pattern += group('h24', '\\d{1,2}');
					break;
				case 'hh':
					pattern += group('h12', '\\d{2}');
					break;
				case 'h':
					pattern += group('h12', '\\d{1,2}');
					break;

				case 'mm':
					pattern += group('mi', '\\d{2}');
					break;
				case 'm':
					pattern += group('mi', '\\d{1,2}');
					break;

				case 'ss':
					pattern += group('ss', '\\d{2}');
					break;
				case 's':
					pattern += group('ss', '\\d{1,2}');
					break;

				case 'SSS':
					pattern += group('ms', '\\d{3}');
					break;
				case 'SS':
					pattern += group('ms', '\\d{2}');
					break;
				case 'S':
					pattern += group('ms', '\\d{1}');
					break;

				case 'aa':
				case 'a':
					pattern += group('mer', '[AaPp][Mm]');
					break;

				case 'EEEE':
				case 'cccc':
					pattern += group('weekday_name', '[A-Za-z]+');
					break;
				case 'EEE':
				case 'ccc':
				case 'E':
					pattern += group('weekday_abbr', '[A-Za-z]{3,}');
					break;
				case 'c':
				case 'e':
					pattern += group('weekday_num', '\\d{1}');
					break;

				case 'ZZZZZ':
				case 'ZZZZ':
				case 'ZZZ':
				case 'ZZ':
				case 'Z':
					pattern += group('tz_offset', '[+-]\\d{2}(?::?\\d{2})?|Z');
					break;
				case 'zzzz':
				case 'zzz':
				case 'zz':
				case 'z':
					pattern += group('tz_name', '[A-Za-z0-9_/+.-]+');
					break;

				default:
					pattern += escapeRegex(token);
					break;
			}
		}

		lastIndex = index + token.length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		pattern += escapeRegex(trailing);
	}

	const rx = new RegExp(`^${pattern}$`, 'i');
	PARSE_REGEX_CACHE.set(mask, rx);
	return rx;
}

/**
 * Parses an input string with an LDML mask.
 */
export function parseLdml(
	input: string,
	mask: string,
	options: ParseOptions = {}
): Temporal.ZonedDateTime | undefined {
	const rx = compileLdmlParser(mask);
	const match = rx.exec(input.trim());
	if (!match || !match.groups) return undefined;

	const getGroup = createGroupExtractor(match);
	const ctx = resolveParseContext(getGroup, options);
	if (!ctx) return undefined;
	const { tz, today, cal } = ctx;

	let year = today.year;
	let month = 1;
	let day = 1;

	const yyyy = getGroup('yyyy');
	const yyVal = getGroup('yy');
	const yyyyWeek = getGroup('yyyy_week');
	const yyWeek = getGroup('yy_week');
	const weekOfYear = getGroup('week_of_year');
	const weekdayNum = getGroup('weekday_num');
	const mm = getGroup('mm');
	const month_name = getGroup('month_name');
	const month_abbr = getGroup('month_abbr');
	const dd = getGroup('dd');
	const dd_ord = getGroup('dd_ord');

	if (yyyy) {
		year = parseInt(yyyy, 10);
	} else if (yyVal) {
		const yy = parseInt(yyVal, 10);
		year = yy >= 70 ? 1900 + yy : 2000 + yy;
	}

	if (yyyyWeek || yyWeek) {
		if (!weekOfYear) return undefined;
		let isoYear = yyyyWeek ? parseInt(yyyyWeek, 10) : parseInt(yyWeek!, 10);
		if (yyWeek && !yyyyWeek)
			isoYear = isoYear >= 70 ? 1900 + isoYear : 2000 + isoYear;

		const isoWeek = parseInt(weekOfYear, 10);
		if (isoWeek < 1 || isoWeek > 53) return undefined;
		const isoDay = weekdayNum ? parseInt(weekdayNum, 10) : 1;
		if (isoDay < 1 || isoDay > 7) return undefined;
		const targetDate = fromIsoWeek(isoYear, isoWeek, isoDay);
		const check = getIsoWeek(targetDate);
		if (check.yearOfWeek !== isoYear || check.weekOfYear !== isoWeek) return undefined;
		year = targetDate.year;
		month = targetDate.month;
		day = targetDate.day;
	} else if (weekOfYear) {
		const isoWeek = parseInt(weekOfYear, 10);
		if (isoWeek < 1 || isoWeek > 53) return undefined;
		const isoDay = weekdayNum ? parseInt(weekdayNum, 10) : 1;
		if (isoDay < 1 || isoDay > 7) return undefined;
		const targetDate = fromIsoWeek(year, isoWeek, isoDay);
		const check = getIsoWeek(targetDate);
		if (check.yearOfWeek !== year || check.weekOfYear !== isoWeek) return undefined;
		year = targetDate.year;
		month = targetDate.month;
		day = targetDate.day;
	} else {
		if (mm) {
			month = parseInt(mm, 10);
		} else if (month_name || month_abbr) {
			const m = resolveMonth(month_name || month_abbr!);
			if (m) month = m;
			else return undefined;
		} else if (!yyyy && !yyVal) {
			month = today.month;
		}

		if (dd) {
			day = parseInt(dd, 10);
		} else if (dd_ord) {
			day = parseInt(dd_ord, 10);
		} else if (!yyyy && !yyVal && !mm && !month_name && !month_abbr) {
			day = today.day;
		}
	}

	const time = resolveTimeComponents(getGroup);
	if (!time) return undefined;
	const { hour, minute, second } = time;
	let millisecond = 0;
	const ms = getGroup('ms');
	if (ms)
		millisecond = parseInt(ms.padEnd(3, '0').slice(0, 3), 10);

	try {
		return Temporal.ZonedDateTime.from(
			{
				timeZone: tz,
				calendar: cal,
				year,
				month,
				day,
				hour,
				minute,
				second,
				millisecond,
			},
			{ overflow: 'reject' }
		);
	} catch {
		return undefined;
	}
}

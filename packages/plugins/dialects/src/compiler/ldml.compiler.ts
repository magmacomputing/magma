import { pad, suffix, WeakCache, Enum, resolveTwoDigitYear, resolveDayOfYear, resolveFractionalSeconds, getIsoWeek, fromIsoWeek } from '@magmacomputing/tempo/library';
import { enums } from '@magmacomputing/tempo/support';
import {
	type FormatterFn,
	type DialectOptions,
	escapeRegex,
	resolveMonth,
	resolveWeekday,
	createGroupExtractor,
	resolveParseContext,
	resolveTimeComponents,
	buildParsedZonedDateTime,
	validateResolvedDateFields,
} from './shared.compiler.js';

const FORMAT_CACHE = new WeakCache<string, FormatterFn>();
const PARSE_REGEX_CACHE = new WeakCache<string, RegExp>();

export const LDML_TOKENS = [
	'ZZZZZ', 'yyyy', 'YYYY', 'MMMM', 'LLLL', 'EEEE', 'cccc', 'GGGG', 'ZZZZ', 'zzzz',
	'SSSSSSSSS', 'SSSSSSSS', 'SSSSSSS', 'SSSSSS', 'SSSSS', 'SSSS', 'SSS', 'SS', 'S',
	'MMM', 'LLL', 'EEE', 'ccc', 'EE', 'QQQQ', 'qqqq', 'QQQ', 'qqq', 'GGG', 'ZZZ', 'zzz',
	'yy', 'YY', 'MM', 'LL', 'dd', 'HH', 'hh', 'kk', 'mm', 'ss', 'aaa', 'aa',
	'Do', 'do', 'ww', 'II', 'QQ', 'qq', 'GG', 'ZZ', 'zz', 'cc', 'ee',
	'DDDo', 'DDD', 'DD', 'y', 'M', 'L', 'd', 'D', 'G', 'H', 'h', 'k', 'm', 's',
	'a', 'c', 'e', 'E', 'w', 'W', 'Q', 'q', 'Z', 'z', 'I',
] as const;

export type LdmlToken = (typeof LDML_TOKENS)[number];

const LDML_TOKEN_REGEX = new RegExp(`'(''|[^'])*'|(${LDML_TOKENS.join('|')})`, 'g');

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
					parts.push((z) => (z.year <= 0 ? pad(1 - z.year, 4) : pad(z.year, 4)));
					break;
				case 'YYYY':
					parts.push((z) => pad(getIsoWeek(z.toPlainDate()).yearOfWeek, 4));
					break;
				case 'yy':
					parts.push((z) => pad(((((z.year <= 0 ? 1 - z.year : z.year) % 100) + 100) % 100), 2));
					break;
				case 'YY':
					parts.push((z) => pad(((getIsoWeek(z.toPlainDate()).yearOfWeek % 100) + 100) % 100, 2));
					break;
				case 'y':
					parts.push((z) => String(z.year <= 0 ? 1 - z.year : z.year));
					break;
				case 'II':
				case 'ww':
					parts.push((z) => pad(getIsoWeek(z.toPlainDate()).weekOfYear, 2));
					break;
				case 'I':
				case 'w':
					parts.push((z) => String(getIsoWeek(z.toPlainDate()).weekOfYear));
					break;
				case 'W':
					parts.push((z) => String(Math.ceil(z.day / 7)));
					break;
				case 'QQQQ':
				case 'qqqq':
					parts.push((z) => `${suffix(Math.ceil(z.month / 3))} quarter`);
					break;
				case 'QQQ':
				case 'qqq':
					parts.push((z) => `Q${Math.ceil(z.month / 3)}`);
					break;
				case 'QQ':
				case 'qq':
					parts.push((z) => pad(Math.ceil(z.month / 3), 2));
					break;
				case 'Q':
				case 'q':
					parts.push((z) => String(Math.ceil(z.month / 3)));
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
				case 'do':
					parts.push((z) => suffix(z.day));
					break;
				case 'd':
					parts.push((z) => String(z.day));
					break;
				case 'DDDo':
					parts.push((z) => suffix(z.dayOfYear));
					break;
				case 'DDD':
					parts.push((z) => pad(z.dayOfYear, 3));
					break;
				case 'DD':
					parts.push((z) => pad(z.dayOfYear, 2));
					break;
				case 'D':
					parts.push((z) => String(z.dayOfYear));
					break;
				case 'GGGG':
					parts.push((z) => (z.year > 0 ? 'Anno Domini' : 'Before Christ'));
					break;
				case 'G':
				case 'GG':
				case 'GGG':
					parts.push((z) => (z.year > 0 ? 'AD' : 'BC'));
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

				case 'SSSSSSSSS':
				case 'SSSSSSSS':
				case 'SSSSSSS':
				case 'SSSSSS':
				case 'SSSSS':
				case 'SSSS':
				case 'SSS':
				case 'SS':
				case 'S': {
					const prec = token.length;
					parts.push((z) => {
						const nsTotal = z.millisecond * 1_000_000 + z.microsecond * 1000 + z.nanosecond;
						return pad(nsTotal, 9).slice(0, prec);
					});
					break;
				}

				case 'aaa':
				case 'a':
					parts.push((z) => (z.hour < 12 ? 'am' : 'pm'));
					break;
				case 'aa':
					parts.push((z) => (z.hour < 12 ? 'AM' : 'PM'));
					break;

				case 'EEEE':
				case 'cccc':
					parts.push((z) => Enum.keyOf(enums.WEEKDAYS, z.dayOfWeek) ?? String(z.dayOfWeek));
					break;
				case 'EEE':
				case 'ccc':
				case 'EE':
				case 'E':
					parts.push((z) => Enum.keyOf(enums.WEEKDAY, z.dayOfWeek) ?? String(z.dayOfWeek));
					break;
				case 'cc':
				case 'ee':
					parts.push((z) => pad(z.dayOfWeek, 2));
					break;
				case 'c':
				case 'e':
					parts.push((z) => String(z.dayOfWeek));
					break;

				case 'ZZZZZ':
					parts.push((z) => z.offset);
					break;
				case 'ZZZZ':
					parts.push((z) => `GMT${z.offset}`);
					break;
				case 'ZZZ':
				case 'ZZ':
				case 'Z':
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
				case 'II':
				case 'ww':
					pattern += group('week_of_year', '\\d{2}');
					break;
				case 'I':
				case 'w':
					pattern += group('week_of_year', '\\d{1,2}');
					break;
				case 'W':
					pattern += group('wom', '\\d{1}');
					break;
				case 'QQQQ':
				case 'qqqq':
					pattern += group('quarter_name', '(?:1st|2nd|3rd|4th) quarter');
					break;
				case 'QQQ':
				case 'qqq':
					pattern += group('quarter_abbr', 'Q[1-4]');
					break;
				case 'QQ':
				case 'qq':
					pattern += group('quarter', '0[1-4]');
					break;
				case 'Q':
				case 'q':
					pattern += group('quarter', '[1-4]');
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
				case 'do':
					pattern += group('dd_ord', '\\d{1,2}(?:st|nd|rd|th)');
					break;
				case 'd':
					pattern += group('dd', '\\d{1,2}');
					break;
				case 'DDDo':
					pattern += group('doy_ord', '\\d{1,3}(?:st|nd|rd|th)');
					break;
				case 'DDD':
					pattern += group('doy', '\\d{3}');
					break;
				case 'DD':
					pattern += group('doy', '\\d{2,3}');
					break;
				case 'D':
					pattern += group('doy', '\\d{1,3}');
					break;
				case 'GGGG':
					pattern += group('era_long', '[A-Za-z ]+');
					break;
				case 'G':
				case 'GG':
				case 'GGG':
					pattern += group('era', '[A-Za-z]+');
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

				case 'SSSSSSSSS':
				case 'SSSSSSSS':
				case 'SSSSSSS':
				case 'SSSSSS':
				case 'SSSSS':
				case 'SSSS':
				case 'SSS':
				case 'SS':
				case 'S':
					pattern += group('ff', `\\d{${token.length}}`);
					break;

				case 'aaa':
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
				case 'EE':
				case 'E':
					pattern += group('weekday_abbr', '[A-Za-z]{3,}');
					break;
				case 'cc':
				case 'ee':
					pattern += group('weekday_num', '\\d{1,2}');
					break;
				case 'c':
				case 'e':
					pattern += group('weekday_num', '\\d{1}');
					break;

				case 'ZZZZZ':
				case 'ZZZ':
				case 'ZZ':
				case 'Z':
					pattern += group('tz_offset', '[+-]\\d{2}(?::?\\d{2})?|Z');
					break;
				case 'ZZZZ':
					pattern += group('tz_name', 'GMT[+-]\\d{1,2}(?::?\\d{2})?');
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
 * Input is trimmed and matching is case-insensitive. Missing time fields default to zero.
 * For calendar date masks, an explicit year defaults missing month/day to January 1;
 * an explicit month defaults missing day to 1. Two-digit years use a sliding pivot window based on the reference date (pivot default 75).
 *
 * @param options - `today` supplies missing date fields; otherwise uses the current date in the resolved zone.
 * Parsed offsets or zone names override `timeZone` (default UTC); `calendar` defaults to iso8601.
 * @returns The parsed date-time, or undefined for a mismatch or rejected fields.
 * Temporal construction errors, including invalid time zones or calendars, are caught and return undefined.
 */
export function parseLdml(
	input: string,
	mask: string,
	options: DialectOptions = {}
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
	const weekdayName = getGroup('weekday_name');
	const weekdayAbbr = getGroup('weekday_abbr');
	const mm = getGroup('mm');
	const month_name = getGroup('month_name');
	const month_abbr = getGroup('month_abbr');
	const dd = getGroup('dd');
	const dd_ord = getGroup('dd_ord');
	const doy = getGroup('doy');
	const doy_ord = getGroup('doy_ord');
	const qtrVal = getGroup('quarter') || (getGroup('quarter_abbr')?.slice(1)) || (getGroup('quarter_name') ? String(getGroup('quarter_name')![0]) : undefined);

	const resolveIsoDay = (): number | undefined => {
		if (weekdayNum) {
			const d = parseInt(weekdayNum, 10);
			return d >= 1 && d <= 7 ? d : undefined;
		}
		if (weekdayName || weekdayAbbr) {
			return resolveWeekday(weekdayName || weekdayAbbr!);
		}
		return 1;
	};

	if (yyyy) {
		year = parseInt(yyyy, 10);
	} else if (yyVal) {
		year = resolveTwoDigitYear(parseInt(yyVal, 10), ctx.pivot, ctx.today);
	}

	const era = getGroup('era');
	const era_long = getGroup('era_long');
	if (era || era_long) {
		const e = (era || era_long)!.trim().toLowerCase();
		if (e === 'bc' || e === 'before christ') {
			year = 1 - year;
		} else if (e !== 'ad' && e !== 'anno domini') {
			return undefined;
		}
	}

	if (yyyyWeek || yyWeek) {
		if (!weekOfYear) return undefined;
		let isoYear = yyyyWeek ? parseInt(yyyyWeek, 10) : parseInt(yyWeek!, 10);
		if (yyWeek && !yyyyWeek)
			isoYear = resolveTwoDigitYear(isoYear, ctx.pivot, ctx.today);

		const isoWeek = parseInt(weekOfYear, 10);
		if (isoWeek < 1 || isoWeek > 53) return undefined;
		const isoDay = resolveIsoDay();
		if (isoDay === undefined) return undefined;
		const targetDate = fromIsoWeek(isoYear, isoWeek, isoDay);
		const check = getIsoWeek(targetDate);
		if (check.yearOfWeek !== isoYear || check.weekOfYear !== isoWeek) return undefined;
		year = targetDate.year;
		month = targetDate.month;
		day = targetDate.day;
	} else if (weekOfYear) {
		const isoWeek = parseInt(weekOfYear, 10);
		if (isoWeek < 1 || isoWeek > 53) return undefined;
		const isoDay = resolveIsoDay();
		if (isoDay === undefined) return undefined;
		const targetDate = fromIsoWeek(year, isoWeek, isoDay);
		const check = getIsoWeek(targetDate);
		if (check.yearOfWeek !== year || check.weekOfYear !== isoWeek) return undefined;
		year = targetDate.year;
		month = targetDate.month;
		day = targetDate.day;
	} else if (doy || doy_ord) {
		const res = resolveDayOfYear(year, parseInt((doy || doy_ord)!, 10));
		if (!res) return undefined;
		month = res.month;
		day = res.day;
	} else {
		if (mm) {
			month = parseInt(mm, 10);
		} else if (month_name || month_abbr) {
			const m = resolveMonth(month_name || month_abbr!);
			if (m) month = m;
			else return undefined;
		} else if (qtrVal) {
			const cleanQtr = qtrVal.replace(/\D/g, '');
			const q = parseInt(cleanQtr, 10);
			if (isNaN(q) || q < 1 || q > 4) return undefined;
			month = (q - 1) * 3 + 1;
		} else if (!yyyy && !yyVal) {
			month = today.month;
		}

		if (dd) {
			day = parseInt(dd, 10);
		} else if (dd_ord) {
			day = parseInt(dd_ord, 10);
		} else if (!yyyy && !yyVal && !mm && !month_name && !month_abbr && !qtrVal) {
			day = today.day;
		}

		let expectedQuarter: number | undefined;
		if (qtrVal && (mm || month_name || month_abbr)) {
			const cleanQtr = qtrVal.replace(/\D/g, '');
			const q = parseInt(cleanQtr, 10);
			if (isNaN(q) || q < 1 || q > 4) return undefined;
			expectedQuarter = q;
		}

		let expectedDayOfWeek: number | undefined;
		if (weekdayNum || weekdayName || weekdayAbbr) {
			const expectedDay = resolveIsoDay();
			if (expectedDay === undefined) return undefined;
			expectedDayOfWeek = expectedDay;
		}

		if (expectedQuarter !== undefined || expectedDayOfWeek !== undefined) {
			if (!validateResolvedDateFields({ year, month, day }, {
				expectedQuarter,
				expectedDayOfWeek,
			})) {
				return undefined;
			}
		}
	}

	const time = resolveTimeComponents(getGroup);
	if (!time) return undefined;
	const { hour, minute, second } = time;
	const subseconds = resolveFractionalSeconds(getGroup('ff'));
	return buildParsedZonedDateTime(
		{ year, month, day, hour, minute, second, ...subseconds },
		ctx
	);
}

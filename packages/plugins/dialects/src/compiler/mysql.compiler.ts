import { pad, suffix, WeakCache, Enum, resolveTwoDigitYear, resolveFractionalSeconds, resolveDayOfYear, getIsoWeek, fromIsoWeek } from '@magmacomputing/tempo/library';
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

const MYSQL_FORMAT_CACHE = new WeakCache<string, FormatterFn>();
const MYSQL_PARSE_CACHE = new WeakCache<string, RegExp>();

export const MYSQL_SPECIFIERS = [
	'%', 'Y', 'y', 'm', 'c',
	'M', 'b', 'd', 'e', 'D',
	'H', 'k', 'h', 'I', 'l',
	'i', 's', 'S', 'f', 'p',
	'r', 'T', 'W', 'a', 'w',
	'j', 'v', 'x', 'u', 'U',
	'V', 'X',
] as const;

export type MysqlSpecifier = (typeof MYSQL_SPECIFIERS)[number];

export const MYSQL_SPECIFIER_REGEX = new RegExp(`%([${MYSQL_SPECIFIERS.join('')}])`, 'g');

/**
 * Compiles a MySQL DATE_FORMAT format mask into a high-performance formatter function.
 */
export function compileMysqlFormatter(mask: string): FormatterFn {
	let cached = MYSQL_FORMAT_CACHE.get(mask);
	if (cached) return cached;

	const parts: ((zdt: Temporal.ZonedDateTime) => string)[] = [];
	let lastIndex = 0;

	for (const match of mask.matchAll(MYSQL_SPECIFIER_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			parts.push(() => literal);
		}

		const specifier = match[1];

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
			case 'm':
				parts.push((z) => pad(z.month, 2));
				break;
			case 'c':
				parts.push((z) => String(z.month));
				break;
			case 'M':
				parts.push((z) => Enum.keyOf(enums.MONTHS, z.month) ?? String(z.month));
				break;
			case 'b':
				parts.push((z) => Enum.keyOf(enums.MONTH, z.month) ?? String(z.month));
				break;
			case 'd':
				parts.push((z) => pad(z.day, 2));
				break;
			case 'e':
				parts.push((z) => String(z.day));
				break;
			case 'D':
				parts.push((z) => suffix(z.day));
				break;
			case 'H':
				parts.push((z) => pad(z.hour, 2));
				break;
			case 'k':
				parts.push((z) => String(z.hour));
				break;
			case 'h':
			case 'I':
				parts.push((z) => pad(((z.hour + 11) % 12) + 1, 2));
				break;
			case 'l':
				parts.push((z) => String(((z.hour + 11) % 12) + 1));
				break;
			case 'i':
				parts.push((z) => pad(z.minute, 2));
				break;
			case 's':
			case 'S':
				parts.push((z) => pad(z.second, 2));
				break;
			case 'f':
				parts.push((z) => pad(z.microsecond, 6));
				break;
			case 'p':
				parts.push((z) => (z.hour < 12 ? 'AM' : 'PM'));
				break;
			case 'r':
				parts.push((z) => {
					const h = pad(((z.hour + 11) % 12) + 1, 2);
					const m = pad(z.minute, 2);
					const s = pad(z.second, 2);
					const mer = z.hour < 12 ? 'AM' : 'PM';
					return `${h}:${m}:${s} ${mer}`;
				});
				break;
			case 'T':
				parts.push((z) => `${pad(z.hour, 2)}:${pad(z.minute, 2)}:${pad(z.second, 2)}`);
				break;
			case 'W':
				parts.push((z) => Enum.keyOf(enums.WEEKDAYS, z.dayOfWeek) ?? String(z.dayOfWeek));
				break;
			case 'a':
				parts.push((z) => Enum.keyOf(enums.WEEKDAY, z.dayOfWeek) ?? String(z.dayOfWeek));
				break;
			case 'w':
				parts.push((z) => String(z.dayOfWeek % 7)); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
				break;
			case 'j':
				parts.push((z) => pad(z.dayOfYear, 3));
				break;
			case 'v':
				parts.push((z) => pad(getIsoWeek(z).weekOfYear, 2));
				break;
			case 'x':
				parts.push((z) => pad(getIsoWeek(z).yearOfWeek, 4));
				break;
			case 'u':
				parts.push((z) => {
					// Week 00-53 with Monday as first day
					const jan1 = z.toPlainDate().with({ month: 1, day: 1 });
					const jan1DayOfWeek = jan1.dayOfWeek; // 1 = Mon ... 7 = Sun
					const daysSinceJan1 = z.dayOfYear - 1;
					const w = Math.floor((daysSinceJan1 + (jan1DayOfWeek - 1)) / 7);
					return pad(w, 2);
				});
				break;
			case 'U':
				parts.push((z) => {
					// Week 00-53 with Sunday as first day
					const jan1 = z.toPlainDate().with({ month: 1, day: 1 });
					const jan1SundayBased = jan1.dayOfWeek % 7;
					const daysSinceJan1 = z.dayOfYear - 1;
					const w = Math.floor((daysSinceJan1 + jan1SundayBased) / 7);
					return pad(w, 2);
				});
				break;
			case 'V':
				// ISO Week with Sunday start (01-53)
				parts.push((z) => pad(getIsoWeek(z).weekOfYear, 2));
				break;
			case 'X':
				// ISO Year with Sunday start
				parts.push((z) => pad(getIsoWeek(z).yearOfWeek, 4));
				break;
			default:
				parts.push(() => `%${specifier}`);
				break;
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		parts.push(() => trailing);
	}

	const fn: FormatterFn = (zdt) => parts.map((p) => p(zdt)).join('');
	MYSQL_FORMAT_CACHE.set(mask, fn);
	return fn;
}

/**
 * Formats a date using a MySQL DATE_FORMAT mask.
 */
export function formatMysql(zdt: Temporal.ZonedDateTime, mask: string): string {
	const formatter = compileMysqlFormatter(mask);
	return formatter(zdt);
}

/**
 * Compiles a MySQL DATE_FORMAT mask into a parsing RegExp with named capture groups.
 */
export function compileMysqlParser(mask: string): RegExp {
	let cached = MYSQL_PARSE_CACHE.get(mask);
	if (cached) return cached;

	const groupCounts: Record<string, number> = {};
	const group = (name: string, regex: string) => {
		const count = (groupCounts[name] = (groupCounts[name] ?? 0) + 1);
		const groupName = count === 1 ? name : `${name}_${count}`;
		return `(?<${groupName}>${regex})`;
	};

	let pattern = '';
	let lastIndex = 0;

	for (const match of mask.matchAll(MYSQL_SPECIFIER_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			pattern += escapeRegex(literal);
		}

		const specifier = match[1];

		switch (specifier) {
			case '%':
				pattern += '%';
				break;
			case 'Y':
				pattern += group('yyyy', '\\d{4}');
				break;
			case 'y':
				pattern += group('yy', '\\d{2}');
				break;
			case 'm':
				pattern += group('mm', '\\d{2}');
				break;
			case 'c':
				pattern += group('mm', '\\d{1,2}');
				break;
			case 'M':
				pattern += group('month_name', '[a-zA-Z]+');
				break;
			case 'b':
				pattern += group('month_abbr', '[a-zA-Z]{3}');
				break;
			case 'd':
				pattern += group('dd', '\\d{2}');
				break;
			case 'e':
				pattern += group('dd', '\\d{1,2}');
				break;
			case 'D':
				pattern += group('dd_ord', '\\d{1,2}(?:st|nd|rd|th)');
				break;
			case 'H':
				pattern += group('hh', '\\d{2}');
				break;
			case 'k':
				pattern += group('hh', '\\d{1,2}');
				break;
			case 'h':
			case 'I':
				pattern += group('h12', '\\d{2}');
				break;
			case 'l':
				pattern += group('h12', '\\d{1,2}');
				break;
			case 'i':
				pattern += group('mi', '\\d{1,2}');
				break;
			case 's':
			case 'S':
				pattern += group('ss', '\\d{1,2}');
				break;
			case 'f':
				pattern += group('us', '\\d{1,6}');
				break;
			case 'p':
				pattern += group('mer', 'AM|PM|am|pm');
				break;
			case 'r':
				pattern += `${group('h12', '\\d{1,2}')}:${group('mi', '\\d{2}')}:${group('ss', '\\d{2}')}\\s*${group('mer', 'AM|PM|am|pm')}`;
				break;
			case 'T':
				pattern += `${group('hh', '\\d{2}')}:${group('mi', '\\d{2}')}:${group('ss', '\\d{2}')}`;
				break;
			case 'W':
				pattern += group('weekday_name', '[a-zA-Z]+');
				break;
			case 'a':
				pattern += group('weekday_abbr', '[a-zA-Z]{3}');
				break;
			case 'w':
				pattern += group('weekday_num', '[0-6]');
				break;
			case 'j':
				pattern += group('doy', '\\d{1,3}');
				break;
			case 'v':
				pattern += group('week_of_year', '\\d{2}');
				break;
			case 'x':
				pattern += group('yyyy_week', '\\d{4}');
				break;
			case 'u':
				pattern += group('week_u', '\\d{2}');
				break;
			case 'U':
				pattern += group('week_U', '\\d{2}');
				break;
			case 'V':
				pattern += group('week_V', '\\d{2}');
				break;
			case 'X':
				pattern += group('yyyy_X', '\\d{4}');
				break;
			default:
				pattern += escapeRegex(`%${specifier}`);
				break;
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		pattern += escapeRegex(trailing);
	}

	const rx = new RegExp(`^${pattern}$`, 'i');
	MYSQL_PARSE_CACHE.set(mask, rx);
	return rx;
}

/**
 * Parses an input string using a MySQL DATE_FORMAT mask.
 */
export function parseMysql(
	input: string,
	mask: string,
	options: DialectOptions = {}
): Temporal.ZonedDateTime | undefined {
	const rx = compileMysqlParser(mask);
	const match = rx.exec(input.trim());
	if (!match) return undefined;

	const getGroup = createGroupExtractor(match);
	const ctx = resolveParseContext(getGroup, options);
	if (!ctx) return undefined;
	const today = ctx.today;

	let year = today.year;
	let month = 1;
	let day = 1;

	const yyyy = getGroup('yyyy');
	const yy = getGroup('yy');
	const mm = getGroup('mm');
	const month_name = getGroup('month_name');
	const month_abbr = getGroup('month_abbr');
	const dd = getGroup('dd');
	const dd_ord = getGroup('dd_ord');
	const doy = getGroup('doy');
	const yyyyWeek = getGroup('yyyy_week');
	const weekOfYear = getGroup('week_of_year');
	const weekdayNum = getGroup('weekday_num');
	const weekdayName = getGroup('weekday_name');
	const weekdayAbbr = getGroup('weekday_abbr');

	if (yyyy) {
		year = parseInt(yyyy, 10);
	} else if (yy) {
		year = resolveTwoDigitYear(parseInt(yy, 10), ctx.pivot, ctx.today);
	}

	// Resolve ISO Day of week (1 = Monday ... 7 = Sunday)
	let resolvedWeekday: number | undefined;
	if (weekdayNum !== undefined) {
		const n = parseInt(weekdayNum, 10);
		resolvedWeekday = n === 0 ? 7 : n;
	} else if (weekdayName || weekdayAbbr) {
		resolvedWeekday = resolveWeekday(weekdayName || weekdayAbbr!);
	}

	if (yyyyWeek && weekOfYear) {
		const isoYear = parseInt(yyyyWeek, 10);
		const isoWeek = parseInt(weekOfYear, 10);
		if (isoWeek < 1 || isoWeek > 53) return undefined;
		const isoDay = resolvedWeekday ?? 1;
		const targetDate = fromIsoWeek(isoYear, isoWeek, isoDay);
		year = targetDate.year;
		month = targetDate.month;
		day = targetDate.day;
	} else if (doy) {
		const dayNum = parseInt(doy, 10);
		if (dayNum < 1 || dayNum > 366) return undefined;
		const res = resolveDayOfYear(year, dayNum);
		if (res === undefined) return undefined;
		month = res.month;
		day = res.day;
	} else {
		if (mm) {
			month = parseInt(mm, 10);
		} else if (month_name || month_abbr) {
			const m = resolveMonth(month_name || month_abbr!);
			if (m === undefined) return undefined;
			month = m;
		}

		if (dd) {
			day = parseInt(dd, 10);
		} else if (dd_ord) {
			day = parseInt(dd_ord.replace(/\D/g, ''), 10);
		}
	}

	if (month < 1 || month > 12) return undefined;
	if (day < 1 || day > 31) return undefined;

	// Contradiction verification
	if (!validateResolvedDateFields({ year, month, day }, {
		expectedDayOfWeek: resolvedWeekday,
		expectedDayOfYear: doy ? parseInt(doy, 10) : undefined,
		expectedIsoWeek: weekOfYear ? parseInt(weekOfYear, 10) : undefined,
		expectedIsoYear: yyyyWeek ? parseInt(yyyyWeek, 10) : undefined,
	})) {
		return undefined;
	}

	const time = resolveTimeComponents(getGroup);
	if (!time) return undefined;
	const { hour, minute, second } = time;
	const subseconds = resolveFractionalSeconds(getGroup('us'));

	return buildParsedZonedDateTime(
		{
			year,
			month,
			day,
			hour,
			minute,
			second,
			...subseconds,
		},
		ctx
	);
}

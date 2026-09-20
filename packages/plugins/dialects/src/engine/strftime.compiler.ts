import { pad } from '@magmacomputing/tempo/library';
import { enums } from '@magmacomputing/tempo/support';

type FormatterFn = (zdt: Temporal.ZonedDateTime) => string;

const STRFTIME_FORMAT_CACHE = new Map<string, FormatterFn>();
const STRFTIME_PARSE_CACHE = new Map<string, RegExp>();

const STRFTIME_SPECIFIER_REGEX = /%([a-zA-Z%])/g;

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

		const specifier = match[1];
		switch (specifier) {
			case '%':
				parts.push(() => '%');
				break;
			case 'Y':
				parts.push((z) => pad(z.year, 4));
				break;
			case 'y':
				parts.push((z) => pad(z.year % 100, 2));
				break;
			case 'm':
				parts.push((z) => pad(z.month, 2));
				break;
			case 'B':
				parts.push((z) => enums.MONTHS.keyOf(z.month as any) ?? String(z.month));
				break;
			case 'b':
			case 'h':
				parts.push((z) => enums.MONTH.keyOf(z.month as any) ?? String(z.month));
				break;
			case 'd':
				parts.push((z) => pad(z.day, 2));
				break;
			case 'e':
				parts.push((z) => String(z.day));
				break;
			case 'H':
				parts.push((z) => pad(z.hour, 2));
				break;
			case 'I': {
				parts.push((z) => {
					const h = z.hour % 12 || 12;
					return pad(h, 2);
				});
				break;
			}
			case 'l': {
				parts.push((z) => {
					const h = z.hour % 12 || 12;
					return String(h);
				});
				break;
			}
			case 'M':
				parts.push((z) => pad(z.minute, 2));
				break;
			case 'S':
				parts.push((z) => pad(z.second, 2));
				break;
			case 'f':
				parts.push((z) => pad(z.millisecond * 1000 + z.microsecond, 6));
				break;
			case 'p':
				parts.push((z) => (z.hour < 12 ? 'AM' : 'PM'));
				break;
			case 'P':
				parts.push((z) => (z.hour < 12 ? 'am' : 'pm'));
				break;
			case 'A':
				parts.push((z) => enums.WEEKDAYS.keyOf(z.dayOfWeek as any) ?? String(z.dayOfWeek));
				break;
			case 'a':
				parts.push((z) => enums.WEEKDAY.keyOf(z.dayOfWeek as any) ?? String(z.dayOfWeek));
				break;
			case 'w':
				parts.push((z) => String(z.dayOfWeek === 7 ? 0 : z.dayOfWeek));
				break;
			case 'u':
				parts.push((z) => String(z.dayOfWeek));
				break;
			case 'j':
				parts.push((z) => pad(z.dayOfYear, 3));
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
			pattern += literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}

		const specifier = match[1];
		switch (specifier) {
			case '%':
				pattern += '%';
				break;
			case 'Y':
				pattern += group('yyyy', '[+-]?\\d{4,6}|\\d{4}');
				break;
			case 'y':
				pattern += group('yy', '\\d{2}');
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
			case 'e':
				pattern += group('dd', '\\d{1,2}');
				break;
			case 'H':
				pattern += group('hh', '\\d{1,2}');
				break;
			case 'I':
			case 'l':
				pattern += group('h12', '\\d{1,2}');
				break;
			case 'M':
				pattern += group('mi', '\\d{1,2}');
				break;
			case 'S':
				pattern += group('ss', '\\d{1,2}');
				break;
			case 'f':
				pattern += group('us', '\\d{1,6}');
				break;
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
			case 'u':
				pattern += group('weekday_num', '\\d{1}');
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
				pattern += match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				break;
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		pattern += trailing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	const rx = new RegExp(`^${pattern}$`, 'i');
	STRFTIME_PARSE_CACHE.set(mask, rx);
	return rx;
}

/** Resolves a localized full or abbreviated English month name to its month number. */
function resolveMonth(str: string): number | undefined {
	const cap = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	if (enums.MONTH && (enums.MONTH as any)[cap]) return (enums.MONTH as any)[cap];
	if (enums.MONTHS && (enums.MONTHS as any)[cap]) return (enums.MONTHS as any)[cap];
	const short3 = cap.slice(0, 3);
	if (enums.MONTH && (enums.MONTH as any)[short3]) return (enums.MONTH as any)[short3];
	return undefined;
}

/**
 * Parses an input string with a POSIX strftime mask.
 */
export function parseStrftime(
	input: string,
	mask: string,
	options: { timeZone?: any; calendar?: any; today?: Temporal.ZonedDateTime | undefined; [key: string]: any } = {}
): Temporal.ZonedDateTime | undefined {
	const rx = compileStrftimeParser(mask);
	const match = rx.exec(input.trim());
	if (!match || !match.groups) return undefined;

	const g = match.groups;
	const getGroup = (name: string) => g[name] ?? Object.entries(g).find(([k]) => k === name || k.startsWith(`${name}_`))?.[1];

	let tz = options.timeZone ?? 'UTC';
	const tz_offset = getGroup('tz_offset');
	const tz_name = getGroup('tz_name');
	if (tz_offset) {
		tz = tz_offset.toUpperCase() === 'Z' ? 'UTC' : tz_offset;
	} else if (tz_name) {
		tz = tz_name;
	}

	const today = options.today ?? Temporal.Now.zonedDateTimeISO(tz);
	const cal = options.calendar ?? 'iso8601';

	let year = today.year;
	const yyyy = getGroup('yyyy');
	const yyVal = getGroup('yy');
	if (yyyy) year = parseInt(yyyy, 10);
	else if (yyVal) {
		const yy = parseInt(yyVal, 10);
		year = yy >= 70 ? 1900 + yy : 2000 + yy;
	}

	let month = 1;
	let day = 1;
	const day_of_year = getGroup('day_of_year');
	const mm = getGroup('mm');
	const month_name = getGroup('month_name');
	const month_abbr = getGroup('month_abbr');
	const dd = getGroup('dd');

	if (day_of_year) {
		const doy = parseInt(day_of_year, 10);
		if (doy < 1 || doy > 366) return undefined;
		try {
			const pDate = Temporal.PlainDate.from({ year, month: 1, day: 1 }).add({ days: doy - 1 });
			if (pDate.year !== year) return undefined;
			month = pDate.month;
			day = pDate.day;
		} catch {
			return undefined;
		}
	} else {
		if (mm) month = parseInt(mm, 10);
		else if (month_name || month_abbr) {
			const m = resolveMonth(month_name || month_abbr);
			if (m) month = m;
			else return undefined;
		} else if (!yyyy && !yyVal) {
			month = today.month;
		}

		if (dd) day = parseInt(dd, 10);
		else if (!yyyy && !yyVal && !mm && !month_name && !month_abbr) {
			day = today.day;
		}
	}

	let hour = 0;
	let minute = 0;
	let second = 0;
	let millisecond = 0;
	let microsecond = 0;

	const hh = getGroup('hh');
	const h12 = getGroup('h12');
	if (hh) hour = parseInt(hh, 10);
	else if (h12) hour = parseInt(h12, 10);

	const mer = getGroup('mer');
	if (mer) {
		const isPm = mer.toLowerCase().startsWith('p');
		if (isPm && hour < 12) hour += 12;
		else if (!isPm && hour === 12) hour = 0;
	}

	const mi = getGroup('mi');
	if (mi) minute = parseInt(mi, 10);
	const ss = getGroup('ss');
	if (ss) second = parseInt(ss, 10);
	const us = getGroup('us');
	if (us) {
		const padded = us.padEnd(6, '0').slice(0, 6);
		millisecond = parseInt(padded.slice(0, 3), 10);
		microsecond = parseInt(padded.slice(3, 6), 10);
	}

	try {
		return Temporal.PlainDateTime.from(
			{
				year,
				month,
				day,
				hour,
				minute,
				second,
				millisecond,
				microsecond,
			},
			{ overflow: 'reject' }
		).toZonedDateTime(tz).withCalendar(cal);
	} catch (e) {
		return undefined;
	}
}

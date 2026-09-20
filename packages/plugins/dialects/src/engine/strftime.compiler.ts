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
				pattern += '(?<yyyy>[+-]?\\d{4,6}|\\d{4})';
				break;
			case 'y':
				pattern += '(?<yy>\\d{2})';
				break;
			case 'm':
				pattern += '(?<mm>\\d{1,2})';
				break;
			case 'B':
				pattern += '(?<month_name>[A-Za-z]+)';
				break;
			case 'b':
			case 'h':
				pattern += '(?<month_abbr>[A-Za-z]{3,})';
				break;
			case 'd':
			case 'e':
				pattern += '(?<dd>\\d{1,2})';
				break;
			case 'H':
				pattern += '(?<hh>\\d{1,2})';
				break;
			case 'I':
			case 'l':
				pattern += '(?<h12>\\d{1,2})';
				break;
			case 'M':
				pattern += '(?<mi>\\d{1,2})';
				break;
			case 'S':
				pattern += '(?<ss>\\d{1,2})';
				break;
			case 'f':
				pattern += '(?<us>\\d{1,6})';
				break;
			case 'p':
			case 'P':
				pattern += '(?<mer>[AaPp][Mm]?)';
				break;
			case 'A':
				pattern += '(?<weekday_name>[A-Za-z]+)';
				break;
			case 'a':
				pattern += '(?<weekday_abbr>[A-Za-z]{3,})';
				break;
			case 'w':
			case 'u':
				pattern += '(?<weekday_num>\\d{1})';
				break;
			case 'j':
				pattern += '(?<day_of_year>\\d{1,3})';
				break;
			case 'F':
				pattern += '(?<yyyy>\\d{4})-(?<mm>\\d{2})-(?<dd>\\d{2})';
				break;
			case 'T':
				pattern += '(?<hh>\\d{2}):(?<mi>\\d{2}):(?<ss>\\d{2})';
				break;
			case 'R':
				pattern += '(?<hh>\\d{2}):(?<mi>\\d{2})';
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
	const today = options.today ?? Temporal.Now.zonedDateTimeISO(options.timeZone ?? 'UTC');
	const tz = options.timeZone ?? 'UTC';
	const cal = options.calendar ?? 'iso8601';

	let year = today.year;
	if (g.yyyy) year = parseInt(g.yyyy, 10);
	else if (g.yy) {
		const yy = parseInt(g.yy, 10);
		year = yy >= 70 ? 1900 + yy : 2000 + yy;
	}

	let month = 1;
	if (g.mm) month = parseInt(g.mm, 10);
	else if (g.month_name || g.month_abbr) {
		const m = resolveMonth(g.month_name || g.month_abbr);
		if (m) month = m;
		else return undefined;
	} else if (!g.yyyy && !g.yy) {
		month = today.month;
	}

	let day = 1;
	if (g.dd) day = parseInt(g.dd, 10);
	else if (!g.yyyy && !g.yy && !g.mm && !g.month_name && !g.month_abbr) {
		day = today.day;
	}

	let hour = 0;
	let minute = 0;
	let second = 0;
	let millisecond = 0;
	let microsecond = 0;

	if (g.hh) hour = parseInt(g.hh, 10);
	else if (g.h12) hour = parseInt(g.h12, 10);

	if (g.mer) {
		const isPm = g.mer.toLowerCase().startsWith('p');
		if (isPm && hour < 12) hour += 12;
		else if (!isPm && hour === 12) hour = 0;
	}

	if (g.mi) minute = parseInt(g.mi, 10);
	if (g.ss) second = parseInt(g.ss, 10);
	if (g.us) {
		const padded = g.us.padEnd(6, '0').slice(0, 6);
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

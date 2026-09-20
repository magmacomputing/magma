import { pad } from '@magmacomputing/tempo/library';
import { enums } from '@magmacomputing/tempo/support';

type FormatterFn = (zdt: Temporal.ZonedDateTime) => string;

const FORMAT_CACHE = new Map<string, FormatterFn>();
const PARSE_REGEX_CACHE = new Map<string, RegExp>();

const LDML_TOKEN_REGEX = /'(''|[^'])*'|(yyyy|YYYY|MMMM|LLLL|EEEE|cccc|SSS|MMM|LLL|EEE|ccc|yy|YY|MM|LL|dd|HH|hh|kk|mm|ss|SS|aa|a|d|H|h|k|m|s|S|c|e|E|y|L|M|Z{1,4}|z{1,4})/g;

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
				case 'YYYY':
					parts.push((z) => pad(z.year, 4));
					break;
				case 'yy':
				case 'YY':
					parts.push((z) => pad(z.year % 100, 2));
					break;
				case 'y':
					parts.push((z) => String(z.year));
					break;

				case 'MMMM':
				case 'LLLL':
					parts.push((z) => enums.MONTHS.keyOf(z.month as any) ?? String(z.month));
					break;
				case 'MMM':
				case 'LLL':
					parts.push((z) => enums.MONTH.keyOf(z.month as any) ?? String(z.month));
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
					parts.push((z) => enums.WEEKDAYS.keyOf(z.dayOfWeek as any) ?? String(z.dayOfWeek));
					break;
				case 'EEE':
				case 'ccc':
				case 'E':
					parts.push((z) => enums.WEEKDAY.keyOf(z.dayOfWeek as any) ?? String(z.dayOfWeek));
					break;
				case 'c':
				case 'e':
					parts.push((z) => String(z.dayOfWeek));
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

	let pattern = '';
	let lastIndex = 0;

	for (const match of mask.matchAll(LDML_TOKEN_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			pattern += literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}

		const token = match[0];
		if (token.startsWith("'")) {
			const unquoted = token.length === 2 && token === "''"
				? "'"
				: token.slice(1, -1).replace(/''/g, "'");
			pattern += unquoted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		} else {
			switch (token) {
				case 'yyyy':
				case 'YYYY':
					pattern += '(?<yyyy>[+-]?\\d{4,6}|\\d{4})';
					break;
				case 'yy':
				case 'YY':
					pattern += '(?<yy>\\d{2})';
					break;
				case 'y':
					pattern += '(?<yyyy>\\d{1,6})';
					break;

				case 'MMMM':
				case 'LLLL':
					pattern += '(?<month_name>[A-Za-z]+)';
					break;
				case 'MMM':
				case 'LLL':
					pattern += '(?<month_abbr>[A-Za-z]{3,})';
					break;
				case 'MM':
				case 'LL':
					pattern += '(?<mm>\\d{2})';
					break;
				case 'M':
				case 'L':
					pattern += '(?<mm>\\d{1,2})';
					break;

				case 'dd':
					pattern += '(?<dd>\\d{2})';
					break;
				case 'd':
					pattern += '(?<dd>\\d{1,2})';
					break;

				case 'HH':
				case 'kk':
					pattern += '(?<hh>\\d{2})';
					break;
				case 'H':
				case 'k':
					pattern += '(?<hh>\\d{1,2})';
					break;
				case 'hh':
					pattern += '(?<h12>\\d{2})';
					break;
				case 'h':
					pattern += '(?<h12>\\d{1,2})';
					break;

				case 'mm':
					pattern += '(?<mi>\\d{2})';
					break;
				case 'm':
					pattern += '(?<mi>\\d{1,2})';
					break;

				case 'ss':
					pattern += '(?<ss>\\d{2})';
					break;
				case 's':
					pattern += '(?<ss>\\d{1,2})';
					break;

				case 'SSS':
					pattern += '(?<ms>\\d{3})';
					break;
				case 'SS':
					pattern += '(?<ms>\\d{2})';
					break;
				case 'S':
					pattern += '(?<ms>\\d{1})';
					break;

				case 'aa':
				case 'a':
					pattern += '(?<mer>[AaPp][Mm]?)';
					break;

				default:
					pattern += token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					break;
			}
		}

		lastIndex = index + token.length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		pattern += trailing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	const rx = new RegExp(`^${pattern}$`, 'i');
	PARSE_REGEX_CACHE.set(mask, rx);
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
 * Parses an input string with an LDML mask.
 */
export function parseLdml(
	input: string,
	mask: string,
	options: { timeZone?: any; calendar?: any; today?: Temporal.ZonedDateTime | undefined; [key: string]: any } = {}
): Temporal.ZonedDateTime | undefined {
	const rx = compileLdmlParser(mask);
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

	if (g.hh) hour = parseInt(g.hh, 10);
	else if (g.h12) hour = parseInt(g.h12, 10);

	if (g.mer) {
		const isPm = g.mer.toLowerCase().startsWith('p');
		if (isPm && hour < 12) hour += 12;
		else if (!isPm && hour === 12) hour = 0;
	}

	if (g.mi) minute = parseInt(g.mi, 10);
	if (g.ss) second = parseInt(g.ss, 10);
	if (g.ms) {
		millisecond = parseInt(g.ms.padEnd(3, '0').slice(0, 3), 10);
	}

	try {
		return Temporal.PlainDateTime.from({
			year,
			month,
			day,
			hour,
			minute,
			second,
			millisecond,
		}).toZonedDateTime(tz).withCalendar(cal);
	} catch (e) {
		return undefined;
	}
}

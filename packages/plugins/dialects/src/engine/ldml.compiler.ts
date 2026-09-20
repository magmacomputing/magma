import { pad, suffix } from '@magmacomputing/tempo/library';
import { enums } from '@magmacomputing/tempo/support';

type FormatterFn = (zdt: Temporal.ZonedDateTime) => string;

const FORMAT_CACHE = new Map<string, FormatterFn>();
const PARSE_REGEX_CACHE = new Map<string, RegExp>();

const LDML_TOKEN_REGEX = /'(''|[^'])*'|(yyyy|YYYY|MMMM|LLLL|EEEE|cccc|SSS|MMM|LLL|EEE|ccc|yy|YY|MM|LL|dd|HH|hh|kk|mm|ss|SS|aa|a|Do|d|H|h|k|m|s|S|c|e|E|y|L|M|ZZZZZ|ZZZZ|ZZZ|ZZ|Z|zzzz|zzz|zz|z)/g;

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
					parts.push((z) => pad((z as any).yearOfWeek ?? z.year, 4));
					break;
				case 'yy':
					parts.push((z) => pad(z.year % 100, 2));
					break;
				case 'YY':
					parts.push((z) => pad(((z as any).yearOfWeek ?? z.year) % 100, 2));
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
					pattern += group('yyyy', '[+-]?\\d{4,6}|\\d{4}');
					break;
				case 'yy':
				case 'YY':
					pattern += group('yy', '\\d{2}');
					break;
				case 'y':
					pattern += group('yyyy', '\\d{1,6}');
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
					pattern += group('mer', '[AaPp][Mm]?');
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
	const mm = getGroup('mm');
	const month_name = getGroup('month_name');
	const month_abbr = getGroup('month_abbr');
	if (mm) month = parseInt(mm, 10);
	else if (month_name || month_abbr) {
		const m = resolveMonth(month_name || month_abbr!);
		if (m) month = m;
		else return undefined;
	} else if (!yyyy && !yyVal) {
		month = today.month;
	}

	let day = 1;
	const dd = getGroup('dd');
	const dd_ord = getGroup('dd_ord');
	if (dd) day = parseInt(dd, 10);
	else if (dd_ord) day = parseInt(dd_ord, 10);
	else if (!yyyy && !yyVal && !mm && !month_name && !month_abbr) {
		day = today.day;
	}

	let hour = 0;
	let minute = 0;
	let second = 0;
	let millisecond = 0;

	const hh = getGroup('hh');
	const h24 = getGroup('h24');
	const h12 = getGroup('h12');
	if (hh) {
		const val = parseInt(hh, 10);
		if (val < 0 || val > 23) return undefined;
		hour = val;
	} else if (h24) {
		const val = parseInt(h24, 10);
		if (val < 1 || val > 24) return undefined;
		hour = val === 24 ? 0 : val;
	} else if (h12) {
		const val = parseInt(h12, 10);
		if (val < 1 || val > 12) return undefined;
		hour = val;
	}

	const mer = getGroup('mer');
	if (mer) {
		const isPm = mer.toLowerCase().startsWith('p');
		if (isPm && hour < 12) hour += 12;
		else if (!isPm && hour === 12) hour = 0;
	}

	const mi = getGroup('mi');
	if (mi) {
		const val = parseInt(mi, 10);
		if (val < 0 || val > 59) return undefined;
		minute = val;
	}
	const ss = getGroup('ss');
	if (ss) {
		const val = parseInt(ss, 10);
		if (val < 0 || val > 59) return undefined;
		second = val;
	}
	const ms = getGroup('ms');
	if (ms) {
		millisecond = parseInt(ms.padEnd(3, '0').slice(0, 3), 10);
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
			},
			{ overflow: 'reject' }
		).toZonedDateTime(tz).withCalendar(cal);
	} catch (e) {
		return undefined;
	}
}

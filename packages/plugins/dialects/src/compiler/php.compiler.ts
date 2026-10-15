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
} from './shared.compiler.js';

const PHP_FORMATTER_CACHE = new Map<string, FormatterFn>();
const PHP_PARSER_CACHE = new Map<string, RegExp>();

const WEEKDAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getOrdinalSuffix(n: number): string {
	const j = n % 10;
	const k = n % 100;
	if (j === 1 && k !== 11) return 'st';
	if (j === 2 && k !== 12) return 'nd';
	if (j === 3 && k !== 13) return 'rd';
	return 'th';
}

/**
 * Compiles a PHP date format mask into a high-performance formatter function.
 */
export function compilePhpFormatter(mask: string): FormatterFn {
	const cached = PHP_FORMATTER_CACHE.get(mask);
	if (cached) return cached;

	const parts: FormatterFn[] = [];
	let i = 0;

	while (i < mask.length) {
		const char = mask[i];

		// Handle backslash escape
		if (char === '\\' && i + 1 < mask.length) {
			const literal = mask[i + 1];
			parts.push(() => literal);
			i += 2;
			continue;
		}

		switch (char) {
			// Year
			case 'Y':
				parts.push((zdt) => zdt.year.toString().padStart(4, '0'));
				break;
			case 'y':
				parts.push((zdt) => (Math.abs(zdt.year) % 100).toString().padStart(2, '0'));
				break;
			case 'o':
				parts.push((zdt) => (zdt.yearOfWeek ?? zdt.year).toString().padStart(4, '0'));
				break;

			// Month
			case 'm':
				parts.push((zdt) => zdt.month.toString().padStart(2, '0'));
				break;
			case 'n':
				parts.push((zdt) => zdt.month.toString());
				break;
			case 'M':
				parts.push((zdt) => Enum.keyOf(enums.MONTH, zdt.month) ?? '');
				break;
			case 'F':
				parts.push((zdt) => Enum.keyOf(enums.MONTHS, zdt.month) ?? '');
				break;
			case 't':
				parts.push((zdt) => zdt.daysInMonth.toString());
				break;

			// Day
			case 'd':
				parts.push((zdt) => zdt.day.toString().padStart(2, '0'));
				break;
			case 'j':
				parts.push((zdt) => zdt.day.toString());
				break;
			case 'S':
				parts.push((zdt) => getOrdinalSuffix(zdt.day));
				break;
			case 'z':
				// PHP: 0-indexed day of year (0 through 365)
				parts.push((zdt) => (zdt.dayOfYear - 1).toString());
				break;

			// Weekday
			case 'l': // full weekday name
				parts.push((zdt) => WEEKDAY_NAMES_FULL[zdt.dayOfWeek % 7]);
				break;
			case 'D': // 3-letter weekday
				parts.push((zdt) => WEEKDAY_NAMES_SHORT[zdt.dayOfWeek % 7]);
				break;
			case 'N': // ISO-8601 day of week (1 for Monday to 7 for Sunday)
				parts.push((zdt) => zdt.dayOfWeek.toString());
				break;
			case 'w': // 0 for Sunday to 6 for Saturday
				parts.push((zdt) => (zdt.dayOfWeek % 7).toString());
				break;
			case 'W': // ISO-8601 week number
				parts.push((zdt) => (zdt.weekOfYear ?? 1).toString().padStart(2, '0'));
				break;

			// Clock & Time
			case 'H': // 24-hr zero-padded (00-23)
				parts.push((zdt) => zdt.hour.toString().padStart(2, '0'));
				break;
			case 'G': // 24-hr unpadded (0-23)
				parts.push((zdt) => zdt.hour.toString());
				break;
			case 'h': // 12-hr zero-padded (01-12)
				parts.push((zdt) => (((zdt.hour % 12) || 12)).toString().padStart(2, '0'));
				break;
			case 'g': // 12-hr unpadded (1-12)
				parts.push((zdt) => (((zdt.hour % 12) || 12)).toString());
				break;
			case 'i': // Minutes (00-59)
				parts.push((zdt) => zdt.minute.toString().padStart(2, '0'));
				break;
			case 's': // Seconds (00-59)
				parts.push((zdt) => zdt.second.toString().padStart(2, '0'));
				break;
			case 'v': // Milliseconds (3 digits)
				parts.push((zdt) => zdt.millisecond.toString().padStart(3, '0'));
				break;
			case 'u': // Microseconds (6 digits)
				parts.push((zdt) => ((zdt.millisecond * 1000) + zdt.microsecond).toString().padStart(6, '0'));
				break;
			case 'a': // am or pm
				parts.push((zdt) => (zdt.hour >= 12 ? 'pm' : 'am'));
				break;
			case 'A': // AM or PM
				parts.push((zdt) => (zdt.hour >= 12 ? 'PM' : 'AM'));
				break;

			// Timezone
			case 'O': // Difference to GMT without colon (+0200)
				parts.push((zdt) => zdt.offset.replace(':', ''));
				break;
			case 'P': // Difference to GMT with colon (+02:00)
				parts.push((zdt) => zdt.offset);
				break;
			case 'T': // Timezone abbreviation (e.g. UTC, EST)
				parts.push((zdt) => {
					try {
						const parts = new Intl.DateTimeFormat('en-US', {
							timeZone: zdt.timeZoneId,
							timeZoneName: 'short',
						}).formatToParts(new Date(zdt.epochMilliseconds));
						return parts.find((p) => p.type === 'timeZoneName')?.value ?? zdt.timeZoneId;
					} catch {
						return zdt.timeZoneId;
					}
				});
				break;
			case 'e': // Timezone identifier
				parts.push((zdt) => zdt.timeZoneId);
				break;
			case 'U': // Epoch seconds
				parts.push((zdt) => Math.floor(zdt.epochMilliseconds / 1000).toString());
				break;

			// Combined formats
			case 'c': // ISO 8601: Y-m-d\TH:i:sP
				parts.push((zdt) => {
					const y = zdt.year.toString().padStart(4, '0');
					const m = zdt.month.toString().padStart(2, '0');
					const d = zdt.day.toString().padStart(2, '0');
					const h = zdt.hour.toString().padStart(2, '0');
					const min = zdt.minute.toString().padStart(2, '0');
					const sec = zdt.second.toString().padStart(2, '0');
					return `${y}-${m}-${d}T${h}:${min}:${sec}${zdt.offset}`;
				});
				break;

			case 'r': // RFC 2822: D, d M Y H:i:s O
				parts.push((zdt) => {
					const dow = WEEKDAY_NAMES_SHORT[zdt.dayOfWeek % 7];
					const d = zdt.day.toString().padStart(2, '0');
					const m = Enum.keyOf(enums.MONTH, zdt.month) ?? '';
					const y = zdt.year.toString().padStart(4, '0');
					const h = zdt.hour.toString().padStart(2, '0');
					const min = zdt.minute.toString().padStart(2, '0');
					const sec = zdt.second.toString().padStart(2, '0');
					const off = zdt.offset.replace(':', '');
					return `${dow}, ${d} ${m} ${y} ${h}:${min}:${sec} ${off}`;
				});
				break;

			default:
				parts.push(() => char);
				break;
		}

		i++;
	}

	const formatter: FormatterFn = (zdt: Temporal.ZonedDateTime) => {
		let res = '';
		for (let idx = 0; idx < parts.length; idx++) {
			res += parts[idx](zdt);
		}
		return res;
	};

	PHP_FORMATTER_CACHE.set(mask, formatter);
	return formatter;
}

/**
 * Formats a Temporal.ZonedDateTime using a PHP date format mask.
 */
export function formatPhp(
	temporal: Temporal.ZonedDateTime,
	mask: string,
	_options: any = {}
): string {
	return compilePhpFormatter(mask)(temporal);
}

/**
 * Compiles a PHP date format mask into a regular expression for parsing.
 */
export function compilePhpParser(mask: string): RegExp {
	const cached = PHP_PARSER_CACHE.get(mask);
	if (cached) return cached;

	let pattern = '^';
	let i = 0;
	let groupIndex = 0;
	const group = (name: string, rx: string) => `(?<${name}_${groupIndex++}>${rx})`;

	while (i < mask.length) {
		const char = mask[i];

		if (char === '\\' && i + 1 < mask.length) {
			pattern += escapeRegex(mask[i + 1]);
			i += 2;
			continue;
		}

		switch (char) {
			case 'Y':
				pattern += group('yyyy', '\\d{4}');
				break;
			case 'y':
				pattern += group('yy', '\\d{2}');
				break;
			case 'm':
				pattern += group('mm', '\\d{2}');
				break;
			case 'n':
				pattern += group('mm', '\\d{1,2}');
				break;
			case 'M':
				pattern += group('mon_short', '[A-Za-z]{3}');
				break;
			case 'F':
				pattern += group('mon_long', '[A-Za-z]+');
				break;
			case 'd':
				pattern += group('dd', '\\d{2}');
				break;
			case 'j':
				pattern += group('dd', '\\d{1,2}');
				break;
			case 'D':
				pattern += '(?:[A-Za-z]{3})';
				break;
			case 'l':
				pattern += '(?:[A-Za-z]+)';
				break;
			case 'S':
				pattern += '(?:st|nd|rd|th)';
				break;
			case 'z':
				pattern += group('doy', '\\d{1,3}');
				break;
			case 'H':
				pattern += group('hh', '\\d{2}');
				break;
			case 'G':
				pattern += group('hh', '\\d{1,2}');
				break;
			case 'h':
				pattern += group('h12', '\\d{2}');
				break;
			case 'g':
				pattern += group('h12', '\\d{1,2}');
				break;
			case 'i':
				pattern += group('mi', '\\d{2}');
				break;
			case 's':
				pattern += group('ss', '\\d{2}');
				break;
			case 'v':
				pattern += group('ms', '\\d{3}');
				break;
			case 'u':
				pattern += group('us', '\\d{6}');
				break;
			case 'a':
			case 'A':
				pattern += group('mer', 'am|pm|AM|PM');
				break;
			case 'P':
				pattern += group('tz_offset', '[+-]\\d{2}:\\d{2}|Z');
				break;
			case 'O':
				pattern += group('tz_offset', '[+-]\\d{4}');
				break;
			case 'e':
			case 'T':
				pattern += group('tz_name', '[A-Za-z0-9_/+]+');
				break;
			case 'U':
				pattern += group('epoch_sec', '\\d+');
				break;
			case 'c':
				pattern += `${group('yyyy', '\\d{4}')}-${group('mm', '\\d{2}')}-${group('dd', '\\d{2}')}T${group('hh', '\\d{2}')}:${group('mi', '\\d{2}')}:${group('ss', '\\d{2}')}${group('tz_offset', '[+-]\\d{2}:\\d{2}|Z')}`;
				break;
			case 'r':
				pattern += `(?:[A-Za-z]{3}), ${group('dd', '\\d{1,2}')} ${group('mon_short', '[A-Za-z]{3}')} ${group('yyyy', '\\d{4}')} ${group('hh', '\\d{2}')}:${group('mi', '\\d{2}')}:${group('ss', '\\d{2}')} ${group('tz_offset', '[+-]\\d{4}')}`;
				break;
			default:
				pattern += escapeRegex(char);
				break;
		}

		i++;
	}

	pattern += '$';
	const regex = new RegExp(pattern, 'i');
	PHP_PARSER_CACHE.set(mask, regex);
	return regex;
}

/**
 * Parses an input string using a PHP date format mask into a Temporal.ZonedDateTime.
 */
export function parsePhp(
	input: string,
	mask: string,
	options: ParseOptions = {}
): Temporal.ZonedDateTime | undefined {
	const regex = compilePhpParser(mask);
	const match = regex.exec(input);
	if (!match) return undefined;

	const getGroup = createGroupExtractor(match);

	const epoch_sec = getGroup('epoch_sec');
	if (epoch_sec) {
		const sec = parseInt(epoch_sec, 10);
		const tz = options.timeZone ?? 'UTC';
		try {
			return Temporal.Instant.fromEpochMilliseconds(sec * 1000).toZonedDateTimeISO(tz);
		} catch {
			return undefined;
		}
	}

	const ctx = resolveParseContext(getGroup, options);
	if (!ctx) return undefined;

	let year = ctx.today.year;
	const yyyy = getGroup('yyyy');
	const yy = getGroup('yy');
	if (yyyy) {
		year = parseInt(yyyy, 10);
	} else if (yy) {
		const shortYear = parseInt(yy, 10);
		year = shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear;
	}

	let month = 1;
	const mm = getGroup('mm');
	const mon_short = getGroup('mon_short');
	const mon_long = getGroup('mon_long');
	if (mm) {
		month = parseInt(mm, 10);
	} else if (mon_short) {
		const m = resolveMonth(mon_short);
		if (m === undefined) return undefined;
		month = m;
	} else if (mon_long) {
		const m = resolveMonth(mon_long);
		if (m === undefined) return undefined;
		month = m;
	}

	let day = 1;
	const dd = getGroup('dd');
	const doy = getGroup('doy');
	if (dd) {
		day = parseInt(dd, 10);
	} else if (doy && !mm && !mon_short && !mon_long) {
		const res = resolveDayOfYear(year, parseInt(doy, 10) + 1);
		if (!res) return undefined;
		month = res.month;
		day = res.day;
	}

	const timeComp = resolveTimeComponents(getGroup);
	if (!timeComp) return undefined;

	const ms = getGroup('ms');
	const us = getGroup('us');
	let millisecond = 0;
	let microsecond = 0;
	if (ms) {
		millisecond = parseInt(ms, 10);
	}
	if (us) {
		const totalMicros = parseInt(us, 10);
		millisecond = Math.floor(totalMicros / 1000);
		microsecond = totalMicros % 1000;
	}

	try {
		return Temporal.ZonedDateTime.from(
			{
				timeZone: ctx.tz,
				calendar: ctx.cal,
				year,
				month,
				day,
				hour: timeComp.hour,
				minute: timeComp.minute,
				second: timeComp.second,
				millisecond,
				microsecond,
				nanosecond: 0,
			},
			{ overflow: 'reject' }
		);
	} catch {
		return undefined;
	}
}

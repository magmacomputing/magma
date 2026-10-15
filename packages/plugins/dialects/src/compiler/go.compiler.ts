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

const GO_FORMATTER_CACHE = new Map<string, FormatterFn>();
const GO_PARSER_CACHE = new Map<string, RegExp>();

const WEEKDAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GO_TOKEN_REGEX =
	/(?:January|Monday|\.000000000|\.999999999|-07:00:00|-070000|Z07:00:00|Z070000|\.000000|\.999999|-07:00|Z07:00|\.000|\.999|-0700|Z0700|2006|002|__2|MST|Mon|Jan|-07|Z07|01|02|03|04|05|15|06|PM|pm|_2|1|2|3|4|5)/g;

function getTotalNanoseconds(zdt: Temporal.ZonedDateTime): number {
	return zdt.millisecond * 1_000_000 + zdt.microsecond * 1_000 + zdt.nanosecond;
}

function formatOffsetSeconds(offset: string, sep: string = ''): string {
	const [hh, mm, ss = '00'] = offset.split(':');
	return `${hh}${sep}${mm}${sep}${ss}`;
}

/**
 * Compiles a Go reference time format mask into a formatter function.
 */
export function compileGoFormatter(mask: string): FormatterFn {
	const cached = GO_FORMATTER_CACHE.get(mask);
	if (cached) return cached;

	const parts: FormatterFn[] = [];
	let lastIndex = 0;

	for (const match of mask.matchAll(GO_TOKEN_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			parts.push(() => literal);
		}

		const token = match[0];
		switch (token) {
			// Year
			case '2006':
				parts.push((zdt) => zdt.year.toString().padStart(4, '0'));
				break;
			case '06':
				parts.push((zdt) => (Math.abs(zdt.year) % 100).toString().padStart(2, '0'));
				break;

			// Month
			case 'January':
				parts.push((zdt) => Enum.keyOf(enums.MONTHS, zdt.month) ?? '');
				break;
			case 'Jan':
				parts.push((zdt) => Enum.keyOf(enums.MONTH, zdt.month) ?? '');
				break;
			case '01':
				parts.push((zdt) => zdt.month.toString().padStart(2, '0'));
				break;
			case '1':
				parts.push((zdt) => zdt.month.toString());
				break;

			// Day
			case '02':
				parts.push((zdt) => zdt.day.toString().padStart(2, '0'));
				break;
			case '_2':
				parts.push((zdt) => zdt.day.toString().padStart(2, ' '));
				break;
			case '2':
				parts.push((zdt) => zdt.day.toString());
				break;
			case '002':
				parts.push((zdt) => zdt.dayOfYear.toString().padStart(3, '0'));
				break;
			case '__2':
				parts.push((zdt) => zdt.dayOfYear.toString().padStart(3, ' '));
				break;

			// Weekday
			case 'Monday':
				parts.push((zdt) => WEEKDAY_NAMES_FULL[zdt.dayOfWeek % 7]);
				break;
			case 'Mon':
				parts.push((zdt) => WEEKDAY_NAMES_SHORT[zdt.dayOfWeek % 7]);
				break;

			// Hour
			case '15': // 24-hr
				parts.push((zdt) => zdt.hour.toString().padStart(2, '0'));
				break;
			case '03': // 12-hr padded
				parts.push((zdt) => (((zdt.hour % 12) || 12)).toString().padStart(2, '0'));
				break;
			case '3': // 12-hr unpadded
				parts.push((zdt) => (((zdt.hour % 12) || 12)).toString());
				break;

			// Minute
			case '04':
				parts.push((zdt) => zdt.minute.toString().padStart(2, '0'));
				break;
			case '4':
				parts.push((zdt) => zdt.minute.toString());
				break;

			// Second
			case '05':
				parts.push((zdt) => zdt.second.toString().padStart(2, '0'));
				break;
			case '5':
				parts.push((zdt) => zdt.second.toString());
				break;

			// Meridiem
			case 'PM':
				parts.push((zdt) => (zdt.hour >= 12 ? 'PM' : 'AM'));
				break;
			case 'pm':
				parts.push((zdt) => (zdt.hour >= 12 ? 'pm' : 'am'));
				break;

			// Fractional seconds
			case '.000':
				parts.push((zdt) => '.' + Math.floor(getTotalNanoseconds(zdt) / 1_000_000).toString().padStart(3, '0'));
				break;
			case '.000000':
				parts.push((zdt) => '.' + Math.floor(getTotalNanoseconds(zdt) / 1_000).toString().padStart(6, '0'));
				break;
			case '.000000000':
				parts.push((zdt) => '.' + getTotalNanoseconds(zdt).toString().padStart(9, '0'));
				break;
			case '.999':
				parts.push((zdt) => {
					const str = Math.floor(getTotalNanoseconds(zdt) / 1_000_000).toString().padStart(3, '0').replace(/0+$/, '');
					return str ? '.' + str : '';
				});
				break;
			case '.999999':
				parts.push((zdt) => {
					const str = Math.floor(getTotalNanoseconds(zdt) / 1_000).toString().padStart(6, '0').replace(/0+$/, '');
					return str ? '.' + str : '';
				});
				break;
			case '.999999999':
				parts.push((zdt) => {
					const str = getTotalNanoseconds(zdt).toString().padStart(9, '0').replace(/0+$/, '');
					return str ? '.' + str : '';
				});
				break;

			// Timezone
			case 'Z07:00':
				parts.push((zdt) => (zdt.offset === '+00:00' ? 'Z' : zdt.offset.slice(0, 6)));
				break;
			case 'Z07:00:00':
				parts.push((zdt) => (zdt.offset === '+00:00' ? 'Z' : formatOffsetSeconds(zdt.offset, ':')));
				break;
			case 'Z0700':
				parts.push((zdt) => (zdt.offset === '+00:00' ? 'Z' : zdt.offset.slice(0, 6).replace(':', '')));
				break;
			case 'Z070000':
				parts.push((zdt) => (zdt.offset === '+00:00' ? 'Z' : formatOffsetSeconds(zdt.offset, '')));
				break;
			case 'Z07':
				parts.push((zdt) => (zdt.offset === '+00:00' ? 'Z' : zdt.offset.slice(0, 3)));
				break;
			case '-07:00':
				parts.push((zdt) => zdt.offset.slice(0, 6));
				break;
			case '-07:00:00':
				parts.push((zdt) => formatOffsetSeconds(zdt.offset, ':'));
				break;
			case '-0700':
				parts.push((zdt) => zdt.offset.slice(0, 6).replace(':', ''));
				break;
			case '-070000':
				parts.push((zdt) => formatOffsetSeconds(zdt.offset, ''));
				break;
			case '-07':
				parts.push((zdt) => zdt.offset.slice(0, 3));
				break;
			case 'MST':
				parts.push((zdt) => {
					try {
						const p = new Intl.DateTimeFormat('en-US', {
							timeZone: zdt.timeZoneId,
							timeZoneName: 'short',
						}).formatToParts(new Date(zdt.epochMilliseconds));
						return p.find((x) => x.type === 'timeZoneName')?.value ?? zdt.timeZoneId;
					} catch {
						return zdt.timeZoneId;
					}
				});
				break;

			default:
				parts.push(() => token);
				break;
		}

		lastIndex = index + token.length;
	}

	if (lastIndex < mask.length) {
		const literal = mask.slice(lastIndex);
		parts.push(() => literal);
	}

	const formatter: FormatterFn = (zdt: Temporal.ZonedDateTime) => {
		let res = '';
		for (let i = 0; i < parts.length; i++) {
			res += parts[i](zdt);
		}
		return res;
	};

	GO_FORMATTER_CACHE.set(mask, formatter);
	return formatter;
}

/**
 * Formats a Temporal.ZonedDateTime using a Go reference time format mask.
 */
export function formatGo(
	temporal: Temporal.ZonedDateTime,
	mask: string,
	_options: any = {}
): string {
	return compileGoFormatter(mask)(temporal);
}

/**
 * Compiles a Go reference format mask into a regular expression for parsing.
 */
export function compileGoParser(mask: string): RegExp {
	const cached = GO_PARSER_CACHE.get(mask);
	if (cached) return cached;

	let pattern = '^';
	let lastIndex = 0;
	let groupIndex = 0;
	const group = (name: string, rx: string) => `(?<${name}_${groupIndex++}>${rx})`;

	for (const match of mask.matchAll(GO_TOKEN_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			pattern += escapeRegex(mask.slice(lastIndex, index));
		}

		const token = match[0];
		switch (token) {
			case '2006':
				pattern += group('yyyy', '\\d{4}');
				break;
			case '06':
				pattern += group('yy', '\\d{2}');
				break;
			case 'January':
				pattern += group('mon_long', '[A-Za-z]+');
				break;
			case 'Jan':
				pattern += group('mon_short', '[A-Za-z]{3}');
				break;
			case '01':
				pattern += group('mm', '\\d{2}');
				break;
			case '1':
				pattern += group('mm', '\\d{1,2}');
				break;
			case '02':
				pattern += group('dd', '\\d{2}');
				break;
			case '_2':
				pattern += group('dd', '\\s?\\d{1,2}');
				break;
			case '2':
				pattern += group('dd', '\\d{1,2}');
				break;
			case '002':
			case '__2':
				pattern += group('doy', '\\d{1,3}');
				break;
			case 'Monday':
			case 'Mon':
				pattern += '(?:[A-Za-z]+)';
				break;
			case '15':
				pattern += group('hh', '\\d{2}');
				break;
			case '03':
				pattern += group('h12', '\\d{2}');
				break;
			case '3':
				pattern += group('h12', '\\d{1,2}');
				break;
			case '04':
				pattern += group('mi', '\\d{2}');
				break;
			case '4':
				pattern += group('mi', '\\d{1,2}');
				break;
			case '05':
				pattern += group('ss', '\\d{2}');
				break;
			case '5':
				pattern += group('ss', '\\d{1,2}');
				break;
			case 'PM':
			case 'pm':
				pattern += group('mer', 'AM|PM|am|pm');
				break;
			case '.000':
			case '.999':
				pattern += `(?:\\.${group('ms', '\\d{1,3}')})?`;
				break;
			case '.000000':
			case '.999999':
				pattern += `(?:\\.${group('us', '\\d{1,6}')})?`;
				break;
			case '.000000000':
			case '.999999999':
				pattern += `(?:\\.${group('ns', '\\d{1,9}')})?`;
				break;
			case 'Z07:00':
				pattern += group('tz_offset', '[+-]\\d{2}:\\d{2}|Z');
				break;
			case 'Z07:00:00':
				pattern += group('tz_offset', '[+-]\\d{2}:\\d{2}:\\d{2}|Z');
				break;
			case '-07:00':
				pattern += group('tz_offset', '[+-]\\d{2}:\\d{2}');
				break;
			case '-07:00:00':
				pattern += group('tz_offset', '[+-]\\d{2}:\\d{2}:\\d{2}');
				break;
			case 'Z0700':
				pattern += group('tz_offset', '[+-]\\d{4}|Z');
				break;
			case 'Z070000':
				pattern += group('tz_offset', '[+-]\\d{6}|Z');
				break;
			case '-0700':
				pattern += group('tz_offset', '[+-]\\d{4}');
				break;
			case '-070000':
				pattern += group('tz_offset', '[+-]\\d{6}');
				break;
			case 'Z07':
				pattern += group('tz_offset', '[+-]\\d{2}|Z');
				break;
			case '-07':
				pattern += group('tz_offset', '[+-]\\d{2}');
				break;
			case 'MST':
				pattern += group('tz_name', '[A-Za-z0-9_/+]+');
				break;
			default:
				pattern += escapeRegex(token);
				break;
		}

		lastIndex = index + token.length;
	}

	if (lastIndex < mask.length) {
		pattern += escapeRegex(mask.slice(lastIndex));
	}

	pattern += '$';
	const regex = new RegExp(pattern, 'i');
	GO_PARSER_CACHE.set(mask, regex);
	return regex;
}

/**
 * Parses an input string using a Go reference format mask into a Temporal.ZonedDateTime.
 */
export function parseGo(
	input: string,
	mask: string,
	options: ParseOptions = {}
): Temporal.ZonedDateTime | undefined {
	const regex = compileGoParser(mask);
	const match = regex.exec(input);
	if (!match) return undefined;

	const getGroup = createGroupExtractor(match);
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
		day = parseInt(dd.trim(), 10);
	} else if (doy && !mm && !mon_short && !mon_long) {
		const res = resolveDayOfYear(year, parseInt(doy, 10));
		if (!res) return undefined;
		month = res.month;
		day = res.day;
	}

	const timeComp = resolveTimeComponents(getGroup);
	if (!timeComp) return undefined;

	const ms = getGroup('ms');
	const us = getGroup('us');
	const ns = getGroup('ns');
	let millisecond = 0;
	let microsecond = 0;
	let nanosecond = 0;

	if (ns) {
		const paddedNs = ns.padEnd(9, '0');
		const totalNs = parseInt(paddedNs, 10);
		millisecond = Math.floor(totalNs / 1_000_000);
		microsecond = Math.floor((totalNs % 1_000_000) / 1_000);
		nanosecond = totalNs % 1_000;
	} else if (us) {
		const paddedUs = us.padEnd(6, '0');
		const totalUs = parseInt(paddedUs, 10);
		millisecond = Math.floor(totalUs / 1_000);
		microsecond = totalUs % 1_000;
	} else if (ms) {
		const paddedMs = ms.padEnd(3, '0');
		millisecond = parseInt(paddedMs, 10);
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
				nanosecond,
			},
			{ overflow: 'reject' }
		);
	} catch {
		return undefined;
	}
}

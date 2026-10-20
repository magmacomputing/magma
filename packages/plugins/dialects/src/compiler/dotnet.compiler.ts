import { pad, WeakCache, Enum, resolveTwoDigitYear, resolveFractionalSeconds, resolveDayOfYear } from '@magmacomputing/tempo/library';
import { enums } from '@magmacomputing/tempo/support';
import type { FormatterFn, DialectOptions } from './shared.compiler.js';
import {
	escapeRegex,
	resolveMonth,
	resolveWeekday,
	createGroupExtractor,
	resolveParseContext,
	resolveTimeComponents,
	buildParsedZonedDateTime,
	validateResolvedDateFields,
} from './shared.compiler.js';

const DOTNET_FORMAT_CACHE = new WeakCache<string, FormatterFn>();
const DOTNET_PARSE_CACHE = new WeakCache<string, RegExp>();

export const DOTNET_TOKENS = [
	'fffffff', 'ffffff', 'fffff', 'ffff', 'fff', 'ff', 'f',
	'FFFFFFF', 'FFFFFF', 'FFFFF', 'FFFF', 'FFF', 'FF', 'F',
	'yyyyy', 'yyyy', 'yyy', 'yy', 'y',
	'MMMM', 'MMM', 'MM', 'M',
	'dddd', 'ddd', 'dd', 'd',
	'HH', 'H', 'hh', 'h',
	'mm', 'm',
	'ss', 's',
	'tt', 't',
	'zzz', 'zz', 'z',
	'K', 'gg', 'g',
] as const;

export type DotNetSpecifier = (typeof DOTNET_TOKENS)[number];

const RE_DOTNET_TOKEN = new RegExp(`'([^']*)'|"([^"]*)"|\\\\(.)|%?(${DOTNET_TOKENS.join('|')})`, 'g');

const STANDARD_DOTNET_FORMATS: Record<string, string> = {
	O: "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffffK",
	o: "yyyy'-'MM'-'dd'T'HH':'mm':'ss'.'fffffffK",
	s: "yyyy'-'MM'-'dd'T'HH':'mm':'ss",
	u: "yyyy'-'MM'-'dd' 'HH':'mm':'ss'Z'",
	r: "ddd',' dd MMM yyyy HH':'mm':'ss 'GMT'",
	R: "ddd',' dd MMM yyyy HH':'mm':'ss 'GMT'",
	d: 'MM/dd/yyyy',
	D: 'dddd, MMMM d, yyyy',
	t: 'HH:mm',
	T: 'HH:mm:ss',
	f: 'dddd, MMMM d, yyyy HH:mm',
	F: 'dddd, MMMM d, yyyy HH:mm:ss',
	g: 'MM/dd/yyyy HH:mm',
	G: 'MM/dd/yyyy HH:mm:ss',
};

const UTC_STANDARD_FORMATS = new Set(['u', 'r', 'R']);

/**
 * Normalizes a .NET format mask by resolving standard single-character specifiers.
 */
export function normalizeDotNetMask(mask: string): string {
	return (mask.length === 1 && STANDARD_DOTNET_FORMATS[mask])
		? STANDARD_DOTNET_FORMATS[mask]
		: mask;
}

/**
 * Helper to compute 100ns tick fractions (7 digits).
 */
function getTicks7(z: Temporal.ZonedDateTime): string {
	const totalNanos = z.millisecond * 1_000_000 + z.microsecond * 1_000 + z.nanosecond;
	return pad(Math.floor(totalNanos / 100), 7);
}

/**
 * Helper to format time zone offset for z/zz/zzz/K.
 */
function formatTimeZoneOffset(z: Temporal.ZonedDateTime, mode: 'z' | 'zz' | 'zzz' | 'K'): string {
	if (mode === 'K' && z.offsetNanoseconds === 0)
		return 'Z';

	const totalMinutes = Math.round(z.offsetNanoseconds / 60_000_000_000);
	const sign = totalMinutes >= 0 ? '+' : '-';
	const absMinutes = Math.abs(totalMinutes);
	const hours = Math.floor(absMinutes / 60);
	const mins = absMinutes % 60;

	switch (mode) {
		case 'z':
			return `${sign}${hours}`;
		case 'zz':
			return `${sign}${pad(hours, 2)}`;
		default:
			return `${sign}${pad(hours, 2)}:${pad(mins, 2)}`;
	}
}

/**
 * Compiles a .NET format mask into a high-performance formatter function.
 */
export function compileDotNetFormatter(rawMask: string): FormatterFn {
	const cached = DOTNET_FORMAT_CACHE.get(rawMask);
	if (cached)
		return cached;

	const mask = normalizeDotNetMask(rawMask);
	const isUtcMask = UTC_STANDARD_FORMATS.has(rawMask);

	const parts: ((zdt: Temporal.ZonedDateTime) => string)[] = [];
	let lastIndex = 0;

	RE_DOTNET_TOKEN.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = RE_DOTNET_TOKEN.exec(mask)) !== null) {
		const index = match.index;
		let literal = index > lastIndex ? mask.slice(lastIndex, index) : '';
		let dotBeforeF = false;
		if (match[4] !== undefined && /^F{1,7}$/.test(match[4])) {
			if (literal.endsWith('.')) {
				dotBeforeF = true;
				literal = literal.slice(0, -1);
			}
		}
		if (literal.length > 0)
			parts.push(() => literal);

		if (match[1] !== undefined) {
			// Single quoted literal
			const lit = match[1];
			parts.push(() => lit);
		} else if (match[2] !== undefined) {
			// Double quoted literal
			const lit = match[2];
			parts.push(() => lit);
		} else if (match[3] !== undefined) {
			// Backslash-escaped single character
			const lit = match[3];
			parts.push(() => lit);
		} else if (match[4] !== undefined) {
			const token = match[4];
			switch (token) {
				case 'yyyyy':
					parts.push((z) => pad(z.year, 5));
					break;
				case 'yyyy':
					parts.push((z) => pad(z.year, 4));
					break;
				case 'yyy':
					parts.push((z) => pad(z.year, 3));
					break;
				case 'yy':
					parts.push((z) => pad(((z.year % 100) + 100) % 100, 2));
					break;
				case 'y':
					parts.push((z) => String(((z.year % 100) + 100) % 100));
					break;
				case 'MMMM':
					parts.push((z) => Enum.keyOf(enums.MONTHS, z.month) ?? String(z.month));
					break;
				case 'MMM':
					parts.push((z) => Enum.keyOf(enums.MONTH, z.month) ?? String(z.month));
					break;
				case 'MM':
					parts.push((z) => pad(z.month, 2));
					break;
				case 'M':
					parts.push((z) => String(z.month));
					break;
				case 'dddd':
					parts.push((z) => Enum.keyOf(enums.WEEKDAYS, z.dayOfWeek) ?? String(z.dayOfWeek));
					break;
				case 'ddd':
					parts.push((z) => Enum.keyOf(enums.WEEKDAY, z.dayOfWeek) ?? String(z.dayOfWeek));
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
				case 'hh':
					parts.push((z) => pad(((z.hour + 11) % 12) + 1, 2));
					break;
				case 'h':
					parts.push((z) => String(((z.hour + 11) % 12) + 1));
					break;
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
				case 'fffffff':
					parts.push((z) => getTicks7(z));
					break;
				case 'ffffff':
					parts.push((z) => getTicks7(z).slice(0, 6));
					break;
				case 'fffff':
					parts.push((z) => getTicks7(z).slice(0, 5));
					break;
				case 'ffff':
					parts.push((z) => getTicks7(z).slice(0, 4));
					break;
				case 'fff':
					parts.push((z) => getTicks7(z).slice(0, 3));
					break;
				case 'ff':
					parts.push((z) => getTicks7(z).slice(0, 2));
					break;
				case 'f':
					parts.push((z) => getTicks7(z).slice(0, 1));
					break;
				case 'FFFFFFF':
				case 'FFFFFF':
				case 'FFFFF':
				case 'FFFF':
				case 'FFF':
				case 'FF':
				case 'F': {
					const len = token.length;
					const prefix = dotBeforeF ? '.' : '';
					parts.push((z) => {
						const frac = (len === 7 ? getTicks7(z) : getTicks7(z).slice(0, len)).replace(/0+$/, '');
						return frac.length > 0 ? prefix + frac : '';
					});
					break;
				}
				case 'tt':
					parts.push((z) => (z.hour < 12 ? 'AM' : 'PM'));
					break;
				case 't':
					parts.push((z) => (z.hour < 12 ? 'A' : 'P'));
					break;
				case 'zzz':
					parts.push((z) => formatTimeZoneOffset(z, 'zzz'));
					break;
				case 'zz':
					parts.push((z) => formatTimeZoneOffset(z, 'zz'));
					break;
				case 'z':
					parts.push((z) => formatTimeZoneOffset(z, 'z'));
					break;
				case 'K':
					parts.push((z) => formatTimeZoneOffset(z, 'K'));
					break;
				case 'gg':
				case 'g':
					parts.push(() => 'A.D.');
					break;
			}
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		parts.push(() => trailing);
	}

	const fn: FormatterFn = (zdt) => {
		const target = isUtcMask ? zdt.withTimeZone('UTC') : zdt;
		return parts.map((p) => p(target)).join('');
	};
	DOTNET_FORMAT_CACHE.set(rawMask, fn);
	return fn;
}

/**
 * Formats a date using .NET custom or standard format specifiers.
 */
export function formatDotNet(zdt: Temporal.ZonedDateTime, mask: string): string {
	const target = UTC_STANDARD_FORMATS.has(mask) ? zdt.withTimeZone('UTC') : zdt;
	const formatter = compileDotNetFormatter(mask);
	return formatter(target);
}

/**
 * Compiles a .NET format mask into a parsing RegExp.
 */
export function compileDotNetParser(rawMask: string): RegExp {
	const mask = normalizeDotNetMask(rawMask);
	const cached = DOTNET_PARSE_CACHE.get(mask);
	if (cached)
		return cached;

	const groupCounts: Record<string, number> = {};
	const group = (name: string, regex: string) => {
		const count = (groupCounts[name] = (groupCounts[name] ?? 0) + 1);
		const groupName = count === 1 ? name : `${name}_${count}`;
		return `(?<${groupName}>${regex})`;
	};

	let pattern = '';
	let lastIndex = 0;

	RE_DOTNET_TOKEN.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = RE_DOTNET_TOKEN.exec(mask)) !== null) {
		const index = match.index;
		let literal = index > lastIndex ? mask.slice(lastIndex, index) : '';
		let dotBeforeF = false;
		if (match[4] !== undefined && /^F{1,7}$/.test(match[4])) {
			if (literal.endsWith('.')) {
				dotBeforeF = true;
				literal = literal.slice(0, -1);
			}
		}
		if (literal.length > 0) {
			pattern += escapeRegex(literal);
		}

		if (match[1] !== undefined) {
			pattern += escapeRegex(match[1]);
		} else if (match[2] !== undefined) {
			pattern += escapeRegex(match[2]);
		} else if (match[3] !== undefined) {
			pattern += escapeRegex(match[3]);
		} else if (match[4] !== undefined) {
			const token = match[4];
			switch (token) {
				case 'yyyyy':
					pattern += group('yyyy', '\\d{4,5}');
					break;
				case 'yyyy':
					pattern += group('yyyy', '\\d{4}');
					break;
				case 'yyy':
					pattern += group('yyyy', '\\d{3,4}');
					break;
				case 'yy':
					pattern += group('yy', '\\d{2}');
					break;
				case 'y':
					pattern += group('yy', '\\d{1,2}');
					break;
				case 'MMMM':
					pattern += group('month_name', '[a-zA-Z]+');
					break;
				case 'MMM':
					pattern += group('month_abbr', '[a-zA-Z]{3,}');
					break;
				case 'MM':
					pattern += group('mm', '\\d{2}');
					break;
				case 'M':
					pattern += group('mm', '\\d{1,2}');
					break;
				case 'dddd':
					pattern += group('weekday_name', '[a-zA-Z]+');
					break;
				case 'ddd':
					pattern += group('weekday_abbr', '[a-zA-Z]{3,}');
					break;
				case 'dd':
					pattern += group('dd', '\\d{2}');
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
				case 'fffffff':
				case 'ffffff':
				case 'fffff':
				case 'ffff':
				case 'fff':
				case 'ff':
				case 'f':
					pattern += group('us', `\\d{1,${token.length}}`);
					break;
				case 'FFFFFFF':
				case 'FFFFFF':
				case 'FFFFF':
				case 'FFFF':
				case 'FFF':
				case 'FF':
				case 'F': {
					const dot = dotBeforeF ? '\\.' : '';
					pattern += `(?:${dot}${group('us', `\\d{1,${token.length}}`)})?`;
					break;
				}
				case 'tt':
					pattern += group('mer', 'AM|PM|am|pm');
					break;
				case 't':
					pattern += group('mer', 'A|P|a|p');
					break;
				case 'zzz':
					pattern += group('tz_offset', '[+-]\\d{2}:\\d{2}');
					break;
				case 'zz':
					pattern += group('tz_offset', '[+-]\\d{2}');
					break;
				case 'z':
					pattern += group('tz_offset', '[+-]\\d{1,2}');
					break;
				case 'K':
					pattern += group('tz_offset', 'Z|[+-]\\d{2}:\\d{2}');
					break;
				case 'gg':
				case 'g':
					pattern += '(?:A\\.?D\\.?|B\\.?C\\.?|C\\.?E\\.?)';
					break;
			}
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		pattern += escapeRegex(trailing);
	}

	const rx = new RegExp(`^${pattern}$`, 'i');
	DOTNET_PARSE_CACHE.set(mask, rx);
	return rx;
}

/**
 * Parses an input string using a .NET custom or standard format mask.
 */
export function parseDotNet(
	input: string,
	mask: string,
	options: DialectOptions = {},
): Temporal.ZonedDateTime | undefined {
	const rx = compileDotNetParser(mask);
	const match = rx.exec(input.trim());
	if (!match)
		return undefined;

	const getGroup = createGroupExtractor(match);
	const parseOptions = UTC_STANDARD_FORMATS.has(mask)
		? { ...options, timeZone: 'UTC' }
		: options;
	const ctx = resolveParseContext(getGroup, parseOptions);
	if (!ctx)
		return undefined;
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
	const weekdayName = getGroup('weekday_name');
	const weekdayAbbr = getGroup('weekday_abbr');

	if (yyyy) {
		year = parseInt(yyyy, 10);
	} else if (yy) {
		year = resolveTwoDigitYear(parseInt(yy, 10), ctx.pivot, ctx.today);
	}

	let resolvedWeekday: number | undefined;
	if (weekdayName || weekdayAbbr) {
		resolvedWeekday = resolveWeekday(weekdayName || weekdayAbbr!);
		if (resolvedWeekday === undefined)
			return undefined;
	}

	if (mm) {
		month = parseInt(mm, 10);
	} else if (month_name || month_abbr) {
		const m = resolveMonth(month_name || month_abbr!);
		if (m === undefined)
			return undefined;
		month = m;
	}

	if (dd)
		day = parseInt(dd, 10);

	if (month < 1 || month > 12)
		return undefined;
	if (day < 1 || day > 31)
		return undefined;

	if (!validateResolvedDateFields({ year, month, day }, { expectedDayOfWeek: resolvedWeekday }))
		return undefined;

	const time = resolveTimeComponents(getGroup);
	if (!time)
		return undefined;
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
		ctx,
	);
}

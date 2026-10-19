import { pad, suffix, WeakCache, Enum, resolveDayOfYear, getIsoWeek, fromIsoWeek, resolveIsoCalendarYear, resolveFractionalSeconds } from '@magmacomputing/tempo/library';
import { enums } from '@magmacomputing/tempo/support';
import {
	type FormatterFn,
	type DialectOptions,
	escapeRegex,
	resolveMonth,
	createGroupExtractor,
	resolveParseContext,
	resolveTimeComponents,
	buildParsedZonedDateTime,
} from './shared.compiler.js';

const ORACLE_FORMAT_CACHE = new WeakCache<string, FormatterFn>();
const ORACLE_PARSE_CACHE = new WeakCache<string, RegExp>();

const ORACLE_TOKEN_REGEX = /"[^"]*"|TZH:TZM|HH24|HH12|SSSSS|MONTH|IYYY|YYYY|RRRR|A\.M\.|P\.M\.|MON|YYY|IYY|TZD|TZR|TZH|TZM|DAY|DDTH|DDD|FF[1-9]?|FM|FX|IW|WW|YY|RR|IY|MM|DD|DY|HH|MI|SS|AM|PM|RM|OF|D|W|Q|Y|I|J/gi;

const ROMAN_MONTHS: readonly string[] = [
	'', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
];

const ROMAN_MAP: Readonly<Record<string, number>> = {
	i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6,
	vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

const JULIAN_DAY_OFFSET_1970 = 2_440_588;
let epochPlainDate: Temporal.PlainDate | undefined;
/** Returns the ISO date corresponding to Julian day number 2440588. */
function getEpochPlainDate(): Temporal.PlainDate {
	return (epochPlainDate ??= Temporal.PlainDate.from('1970-01-01'));
}

/** Uses uppercase or lowercase for uniform-case tokens and initial capitalization for mixed-case tokens. */
function applyCase(str: string, token: string): string {
	if (token === token.toUpperCase()) return str.toUpperCase();
	if (token === token.toLowerCase()) return str.toLowerCase();
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Compiles an Oracle/PostgreSQL SQL format model into a fast formatter function.
 * Double quotes delimit literals. FM toggles padding for supported numeric fields; FX emits no text.
 * Month and weekday names are English and follow token casing; FF defaults to six fractional digits.
 */
export function compileOracleFormatter(mask: string): FormatterFn {
	const cached = ORACLE_FORMAT_CACHE.get(mask);
	if (cached) return cached;

	const parts: ((zdt: Temporal.ZonedDateTime) => string)[] = [];
	let lastIndex = 0;
	let fillMode = false;

	for (const match of mask.matchAll(ORACLE_TOKEN_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			parts.push(() => literal);
		}

		const token = match[0];
		const upper = token.toUpperCase();

		if (token.startsWith('"') && token.endsWith('"')) {
			const literal = token.slice(1, -1);
			parts.push(() => literal);
		} else if (upper === 'FM') {
			fillMode = !fillMode;
		} else if (upper === 'FX') {
			// Format exact - parse only modifier
		} else {
			const isFm = fillMode;
			switch (upper) {
				case 'YYYY':
				case 'RRRR':
					parts.push((z) => pad(z.year, 4));
					break;
				case 'IYYY':
					parts.push((z) => pad(getIsoWeek(z).yearOfWeek, 4));
					break;
				case 'YYY':
					parts.push((z) => pad(Math.abs(z.year) % 1000, 3));
					break;
				case 'YY':
				case 'RR':
					parts.push((z) => pad(Math.abs(z.year) % 100, 2));
					break;
				case 'IYY':
					parts.push((z) => pad(Math.abs(getIsoWeek(z).yearOfWeek) % 1000, 3));
					break;
				case 'IY':
					parts.push((z) => pad(Math.abs(getIsoWeek(z).yearOfWeek) % 100, 2));
					break;
				case 'Y':
					parts.push((z) => String(Math.abs(z.year) % 10));
					break;
				case 'I':
					parts.push((z) => String(Math.abs(getIsoWeek(z).yearOfWeek) % 10));
					break;

				case 'MM':
					parts.push((z) => (isFm ? String(z.month) : pad(z.month, 2)));
					break;
				case 'MONTH':
					parts.push((z) => {
						const name = Enum.keyOf(enums.MONTHS, z.month) ?? String(z.month);
						return applyCase(name, token);
					});
					break;
				case 'MON':
					parts.push((z) => {
						const name = Enum.keyOf(enums.MONTH, z.month) ?? String(z.month);
						return applyCase(name, token);
					});
					break;
				case 'RM':
					parts.push((z) => {
						const rom = ROMAN_MONTHS[z.month] ?? '';
						return token === token.toLowerCase() ? rom.toLowerCase() : rom;
					});
					break;

				case 'DDTH':
					parts.push((z) => {
						const num = isFm ? String(z.day) : pad(z.day, 2);
						const ord = suffix(z.day).slice(-2);
						return num + applyCase(ord, token.slice(-2));
					});
					break;
				case 'DD':
					parts.push((z) => (isFm ? String(z.day) : pad(z.day, 2)));
					break;
				case 'DDD':
					parts.push((z) => (isFm ? String(z.dayOfYear) : pad(z.dayOfYear, 3)));
					break;
				case 'DAY':
					parts.push((z) => {
						const name = Enum.keyOf(enums.WEEKDAYS, z.dayOfWeek) ?? String(z.dayOfWeek);
						return applyCase(name, token);
					});
					break;
				case 'DY':
					parts.push((z) => {
						const name = Enum.keyOf(enums.WEEKDAY, z.dayOfWeek) ?? String(z.dayOfWeek);
						return applyCase(name, token);
					});
					break;
				case 'D':
					// Oracle D is day of week (1-7). Implemented using ISO 8601 weekday numbering (1 for Monday to 7 for Sunday).
					parts.push((z) => String(z.dayOfWeek));
					break;
				case 'J':
					parts.push((z) => {
						const daysSince1970 = z.toPlainDate().withCalendar('iso8601').since(getEpochPlainDate(), { largestUnit: 'day' }).days;
						return String(JULIAN_DAY_OFFSET_1970 + daysSince1970);
					});
					break;

				case 'HH24':
					parts.push((z) => (isFm ? String(z.hour) : pad(z.hour, 2)));
					break;
				case 'HH12':
				case 'HH':
					parts.push((z) => {
						const h = z.hour % 12 || 12;
						return isFm ? String(h) : pad(h, 2);
					});
					break;
				case 'MI':
					parts.push((z) => (isFm ? String(z.minute) : pad(z.minute, 2)));
					break;
				case 'SS':
					parts.push((z) => (isFm ? String(z.second) : pad(z.second, 2)));
					break;
				case 'SSSSS':
					parts.push((z) => {
						const secs = z.hour * 3600 + z.minute * 60 + z.second;
						return isFm ? String(secs) : pad(secs, 5);
					});
					break;

				case 'AM':
				case 'PM':
					parts.push((z) => {
						const mer = z.hour < 12 ? 'AM' : 'PM';
						return token === token.toLowerCase() ? mer.toLowerCase() : mer;
					});
					break;
				case 'A.M.':
				case 'P.M.':
					parts.push((z) => {
						const mer = z.hour < 12 ? 'A.M.' : 'P.M.';
						return token === token.toLowerCase() ? mer.toLowerCase() : mer;
					});
					break;

				case 'IW':
					parts.push((z) => {
						const w = getIsoWeek(z).weekOfYear;
						return isFm ? String(w) : pad(w, 2);
					});
					break;
				case 'WW':
					parts.push((z) => {
						const w = Math.ceil(z.dayOfYear / 7);
						return isFm ? String(w) : pad(w, 2);
					});
					break;
				case 'W':
					parts.push((z) => String(Math.ceil(z.day / 7)));
					break;
				case 'Q':
					parts.push((z) => String(Math.ceil(z.month / 3)));
					break;

				case 'TZH:TZM':
				case 'OF':
					parts.push((z) => z.offset);
					break;
				case 'TZH':
					parts.push((z) => z.offset.slice(0, 3));
					break;
				case 'TZM':
					parts.push((z) => z.offset.slice(4, 6));
					break;
				case 'TZR':
					parts.push((z) => z.timeZoneId);
					break;
				case 'TZD':
					parts.push((z) => {
						try {
							const dtf = new Intl.DateTimeFormat('en-US', { timeZone: z.timeZoneId, timeZoneName: 'short' });
							const part = dtf.formatToParts(z.epochMilliseconds).find((p) => p.type === 'timeZoneName');
							return part?.value ?? z.timeZoneId;
						} catch {
							return z.timeZoneId;
						}
					});
					break;

				default:
					if (upper.startsWith('FF')) {
						const precision = upper.length === 3 ? parseInt(upper[2], 10) : 6;
						parts.push((z) => {
							const totalNanos = BigInt(z.millisecond) * 1_000_000n + BigInt(z.microsecond) * 1_000n + BigInt(z.nanosecond);
							const s = pad(totalNanos.toString(), 9);
							return s.slice(0, precision);
						});
					} else {
						parts.push(() => token);
					}
					break;
			}
		}

		lastIndex = index + token.length;
	}

	if (lastIndex < mask.length) {
		const trailing = mask.slice(lastIndex);
		parts.push(() => trailing);
	}

	const fn: FormatterFn = (z) => parts.map((p) => p(z)).join('');
	ORACLE_FORMAT_CACHE.set(mask, fn);
	return fn;
}

/**
 * Formats a date using the Oracle/SQL TO_CHAR format dialect.
 */
export function formatOracle(zdt: Temporal.ZonedDateTime, mask: string): string {
	return compileOracleFormatter(mask)(zdt);
}

/**
 * Format tokens supported by formatOracle but unsupported for reverse parsing in parseOracle:
 * YYY, IYY, IY, Y, I, J, W, Q, IW, WW, SSSSS, TZH, TZM.
 */
const ORACLE_UNSUPPORTED_PARSE_TOKENS: ReadonlySet<string> = new Set([
	'YYY', 'IYY', 'IY', 'Y', 'I', 'J', 'W', 'Q', 'WW', 'SSSSS', 'TZH', 'TZM',
]);

/**
 * Compiles an Oracle format model into a regular expression for parsing.
 * Returns undefined if the mask contains unsupported reverse-parse tokens.
 * Matching is anchored and case-insensitive; FM and FX do not change parsing strictness.
 */
export function compileOracleParser(mask: string): RegExp | undefined {
	const cached = ORACLE_PARSE_CACHE.get(mask);
	if (cached) return cached;

	let pattern = '';
	let lastIndex = 0;
	let groupIndex = 0;

	const group = (name: string, rx: string) => `(?<${name}_${groupIndex++}>${rx})`;

	for (const match of mask.matchAll(ORACLE_TOKEN_REGEX)) {
		const index = match.index!;
		if (index > lastIndex) {
			const literal = mask.slice(lastIndex, index);
			pattern += escapeRegex(literal);
		}

		const token = match[0];
		const upper = token.toUpperCase();

		if (token.startsWith('"') && token.endsWith('"')) {
			const literal = token.slice(1, -1);
			pattern += escapeRegex(literal);
		} else if (upper === 'FM' || upper === 'FX') {
			// Modifiers have no character pattern representation in the input
		} else {
			switch (upper) {
				case 'YYYY':
				case 'RRRR':
					pattern += group('yyyy', '\\d{4}');
					break;
				case 'IYYY':
					pattern += group('iyyy', '\\d{4}');
					break;
				case 'YY':
					pattern += group('yy', '\\d{2}');
					break;
				case 'RR':
					pattern += group('rr', '\\d{2}');
					break;
				case 'MM':
					pattern += group('mm', '\\d{1,2}');
					break;
				case 'MONTH':
					pattern += group('month_name', '[A-Za-z]+');
					break;
				case 'MON':
					pattern += group('month_abbr', '[A-Za-z]{3}');
					break;
				case 'RM':
					pattern += group('month_roman', '[IVXLCDMivxlcdm]+');
					break;
				case 'DDTH':
					pattern += group('dd', '\\d{1,2}(?:st|nd|rd|th)');
					break;
				case 'DD':
					pattern += group('dd', '\\d{1,2}');
					break;
				case 'DDD':
					pattern += group('day_of_year', '\\d{1,3}');
					break;
				case 'DAY':
					pattern += group('weekday_name', '[A-Za-z]+');
					break;
				case 'DY':
					pattern += group('weekday_abbr', '[A-Za-z]{3}');
					break;
				case 'D':
					pattern += group('weekday_num', '\\d{1}');
					break;
				case 'IW':
					pattern += group('iw', '\\d{1,2}');
					break;
				case 'HH24':
					pattern += group('hh', '\\d{1,2}');
					break;
				case 'HH12':
				case 'HH':
					pattern += group('h12', '\\d{1,2}');
					break;
				case 'MI':
					pattern += group('mi', '\\d{1,2}');
					break;
				case 'SS':
					pattern += group('ss', '\\d{1,2}');
					break;
				case 'AM':
				case 'PM':
				case 'A.M.':
				case 'P.M.':
					pattern += group('mer', '[AaPp]\\.?[Mm]\\.?');
					break;
				case 'TZH:TZM':
				case 'OF':
					pattern += group('tz_offset', '[+-]\\d{2}(?::?\\d{2})?|Z');
					break;
				case 'TZR':
				case 'TZD':
					pattern += group('tz_name', '[A-Za-z0-9_/+.-]+');
					break;
				default:
					if (upper.startsWith('FF')) {
						pattern += group('us', '\\d{1,9}');
					} else if (ORACLE_UNSUPPORTED_PARSE_TOKENS.has(upper)) {
						return undefined;
					} else {
						pattern += escapeRegex(token);
					}
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
	ORACLE_PARSE_CACHE.set(mask, rx);
	return rx;
}

/**
 * Parses trimmed input with an Oracle TO_CHAR / TO_DATE format model.
 * Missing year uses the reference year; an explicit year defaults missing month/day to January 1,
 * and an explicit month defaults missing day to 1. Missing time fields default to zero.
 * YY uses the reference century. RR uses the previous century for 50-99 when the reference year ends in 00-49,
 * or the next century for 00-49 when it ends in 50-99; otherwise RR uses the reference century.
 *
 * @param options - `today` supplies date defaults and the year pivot; otherwise uses the current date in the resolved zone.
 * Parsed offsets or zone names override `timeZone` (default UTC); `calendar` defaults to iso8601.
 * @returns The parsed date-time, or undefined for a mismatch, unsupported parse token, or rejected fields.
 * Temporal construction errors, including invalid time zones or calendars, are caught and return undefined.
 */
export function parseOracle(
	input: string,
	mask: string,
	options: DialectOptions = {}
): Temporal.ZonedDateTime | undefined {
	const rx = compileOracleParser(mask);
	if (!rx) return undefined;

	const match = rx.exec(input.trim());
	if (!match || !match.groups) return undefined;

	const getGroup = createGroupExtractor(match);
	const ctx = resolveParseContext(getGroup, options);
	if (!ctx) return undefined;
	const { tz, today, cal } = ctx;

	let year = today.year;
	const yyyy = getGroup('yyyy');
	const iyyy = getGroup('iyyy');
	const iw = getGroup('iw');
	const yyVal = getGroup('yy');
	const rrVal = getGroup('rr');
	if (yyyy) {
		year = parseInt(yyyy, 10);
	} else if (iyyy) {
		year = parseInt(iyyy, 10);
	} else if (yyVal) {
		const yy = parseInt(yyVal, 10);
		const currentCentury = Math.floor(today.year / 100) * 100;
		year = currentCentury + yy;
	} else if (rrVal) {
		const rr = parseInt(rrVal, 10);
		const currentCentury = Math.floor(today.year / 100) * 100;
		const curYY = today.year % 100;
		if (curYY < 50) {
			year = rr < 50 ? currentCentury + rr : currentCentury - 100 + rr;
		} else {
			year = rr < 50 ? currentCentury + 100 + rr : currentCentury + rr;
		}
	}

	const hasYear = Boolean(yyyy || iyyy || yyVal || rrVal);

	let month = 1;
	const mm = getGroup('mm');
	const month_name = getGroup('month_name');
	const month_abbr = getGroup('month_abbr');
	const month_roman = getGroup('month_roman');
	if (mm) {
		month = parseInt(mm, 10);
	} else if (month_roman) {
		const r = ROMAN_MAP[month_roman.toLowerCase()];
		if (r) month = r;
		else return undefined;
	} else if (month_name || month_abbr) {
		const m = resolveMonth(month_name || month_abbr!);
		if (m) month = m;
		else return undefined;
	} else if (!hasYear) {
		month = today.month;
	}

	let day = 1;
	const dd = getGroup('dd');
	const doy = getGroup('day_of_year');
	if (dd) {
		day = parseInt(dd, 10);
	} else if (doy && !mm && !month_roman && !month_name && !month_abbr) {
		const res = resolveDayOfYear(year, parseInt(doy, 10));
		if (!res) return undefined;
		month = res.month;
		day = res.day;
	} else if (!hasYear && !mm && !month_roman && !month_name && !month_abbr) {
		day = today.day;
	}

	if (iw) {
		const isoYear = iyyy ? parseInt(iyyy, 10) : (hasYear ? year : ((today as any).yearOfWeek ?? today.year));
		const isoWeek = parseInt(iw, 10);
		if (isoWeek < 1 || isoWeek > 53) return undefined;
		const dVal = getGroup('weekday_num');
		const isoDay = dVal ? parseInt(dVal, 10) : 1;
		if (isoDay < 1 || isoDay > 7) return undefined;
		const targetDate = fromIsoWeek(isoYear, isoWeek, isoDay);
		const check = getIsoWeek(targetDate);
		if (check.yearOfWeek !== isoYear || check.weekOfYear !== isoWeek) return undefined;
		year = targetDate.year;
		month = targetDate.month;
		day = targetDate.day;
	} else {
		if (iyyy) {
			year = resolveIsoCalendarYear(parseInt(iyyy, 10), month, day);
		}
		const dVal = getGroup('weekday_num');
		if (dVal) {
			const expectedDay = parseInt(dVal, 10);
			try {
				const plainDate = Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' });
				if (plainDate.dayOfWeek !== expectedDay) return undefined;
			} catch {
				return undefined;
			}
		}
	}

	const time = resolveTimeComponents(getGroup);
	if (!time) return undefined;
	const { hour, minute, second } = time;
	const subseconds = resolveFractionalSeconds(getGroup('us'));

	return buildParsedZonedDateTime(
		{ year, month, day, hour, minute, second, ...subseconds },
		ctx
	);
}

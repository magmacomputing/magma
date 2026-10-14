import { pad, WeakCache, isNumber } from '@magmacomputing/tempo/library';
import { enums, Enum } from '@magmacomputing/tempo/support';

type FormatterFn = (zdt: Temporal.ZonedDateTime) => string;

const ORACLE_FORMAT_CACHE = new WeakCache<string, FormatterFn>();
const ORACLE_PARSE_CACHE = new WeakCache<string, RegExp>();

const ORACLE_TOKEN_REGEX = /"[^"]*"|TZH:TZM|HH24|HH12|SSSSS|MONTH|IYYY|YYYY|RRRR|A\.M\.|P\.M\.|MON|YYY|IYY|TZD|TZR|TZH|TZM|DAY|DDD|FF[1-9]?|FM|FX|IW|WW|YY|RR|IY|MM|DD|DY|HH|MI|SS|AM|PM|RM|OF|D|W|Q|Y|I|J/gi;

const ROMAN_MONTHS: readonly string[] = [
	'', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
];

const ROMAN_MAP: Readonly<Record<string, number>> = {
	i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6,
	vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

function applyCase(str: string, token: string): string {
	if (token === token.toUpperCase()) return str.toUpperCase();
	if (token === token.toLowerCase()) return str.toLowerCase();
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getIsoWeek(z: Temporal.ZonedDateTime): { weekOfYear: number; yearOfWeek: number } {
	if (isNumber((z as any).weekOfYear) && isNumber((z as any).yearOfWeek))
		return { weekOfYear: (z as any).weekOfYear, yearOfWeek: (z as any).yearOfWeek };

	const date = Temporal.PlainDate.from({ year: z.year, month: z.month, day: z.day });
	const dayOfWeek = date.dayOfWeek;
	const thursday = date.add({ days: 4 - dayOfWeek });
	const yearOfWeek = thursday.year;
	const jan1 = Temporal.PlainDate.from({ year: yearOfWeek, month: 1, day: 1 });
	const daysSinceJan1 = thursday.since(jan1, { largestUnit: 'days' }).days;
	const weekOfYear = Math.floor(daysSinceJan1 / 7) + 1;
	return { weekOfYear, yearOfWeek };
}

/**
 * Compiles an Oracle/PostgreSQL SQL format model into a fast formatter function.
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
			fillMode = true;
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
					parts.push((z) => pad(Math.abs(((z as any).yearOfWeek ?? z.year)) % 1000, 3));
					break;
				case 'IY':
					parts.push((z) => pad(Math.abs(((z as any).yearOfWeek ?? z.year)) % 100, 2));
					break;
				case 'Y':
					parts.push((z) => String(Math.abs(z.year) % 10));
					break;
				case 'I':
					parts.push((z) => String(Math.abs(((z as any).yearOfWeek ?? z.year)) % 10));
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
					parts.push((z) => String(z.dayOfWeek));
					break;
				case 'J':
					parts.push((z) => String(Math.floor((Number(z.epochMilliseconds) / 86400000) + 2440587.5)));
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
					parts.push((z) => String(z.hour * 3600 + z.minute * 60 + z.second));
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
				case 'WW':
					parts.push((z) => {
						const w = getIsoWeek(z).weekOfYear;
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
				case 'TZD':
					parts.push((z) => z.timeZoneId);
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
 * Compiles an Oracle format model into a regular expression for parsing.
 */
export function compileOracleParser(mask: string): RegExp {
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
			pattern += literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}

		const token = match[0];
		const upper = token.toUpperCase();

		if (token.startsWith('"') && token.endsWith('"')) {
			const literal = token.slice(1, -1);
			pattern += literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
				case 'RR':
					pattern += group('yy', '\\d{2}');
					break;
				case 'MM':
					pattern += group('mm', '\\d{1,2}');
					break;
				case 'MONTH':
					pattern += group('month_name', '[A-Za-z]+');
					break;
				case 'MON':
					pattern += group('month_abbr', '[A-Za-z]{3,}');
					break;
				case 'RM':
					pattern += group('month_roman', '[IVXLCDMivxlcdm]+');
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
					pattern += group('weekday_abbr', '[A-Za-z]{3,}');
					break;
				case 'D':
					pattern += group('weekday_num', '\\d{1}');
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
					pattern += group('mer', '[AaPp]\\.?[Mm]?\\.?');
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
					} else {
						pattern += token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
					}
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
	ORACLE_PARSE_CACHE.set(mask, rx);
	return rx;
}

/** Resolves an English month name or abbreviation to its month number. */
function resolveMonth(str: string): number | undefined {
	const cap = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
	return Enum.get(enums.MONTH, cap) ?? Enum.get(enums.MONTHS, cap) ?? Enum.get(enums.MONTH, cap.slice(0, 3));
}

/**
 * Parses an input string with an Oracle TO_CHAR / TO_DATE format model.
 */
export function parseOracle(
	input: string,
	mask: string,
	options: { timeZone?: any; calendar?: any; today?: Temporal.ZonedDateTime | undefined;[key: string]: any } = {}
): Temporal.ZonedDateTime | undefined {
	const rx = compileOracleParser(mask);
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
	if (yyyy) {
		year = parseInt(yyyy, 10);
	} else if (yyVal) {
		const yy = parseInt(yyVal, 10);
		// Oracle RR 2-digit pivot logic:
		year = yy >= 50 ? 1900 + yy : 2000 + yy;
	}

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
	} else if (!yyyy && !yyVal) {
		month = today.month;
	}

	let day = 1;
	const dd = getGroup('dd');
	const doy = getGroup('day_of_year');
	if (dd) {
		day = parseInt(dd, 10);
	} else if (doy && !mm && !month_name && !month_abbr) {
		const dVal = parseInt(doy, 10);
		const p = Temporal.PlainDate.from({ year, month: 1, day: 1 }).add({ days: dVal - 1 });
		month = p.month;
		day = p.day;
	} else if (!yyyy && !yyVal && !mm && !month_name && !month_abbr) {
		day = today.day;
	}

	let hour = 0;
	let minute = 0;
	let second = 0;
	let millisecond = 0;
	let microsecond = 0;

	const hh = getGroup('hh');
	const h12 = getGroup('h12');
	if (hh) {
		const val = parseInt(hh, 10);
		if (val < 0 || val > 23) return undefined;
		hour = val;
	} else if (h12) {
		const val = parseInt(h12, 10);
		if (val < 1 || val > 12) return undefined;
		hour = val;
	}

	const mer = getGroup('mer');
	if (mer) {
		const clean = mer.replace(/\./g, '').toLowerCase();
		const isPm = clean.startsWith('p');
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

	const usVal = getGroup('us');
	if (usVal) {
		const padded = usVal.padEnd(6, '0').slice(0, 6);
		const usTotal = parseInt(padded, 10);
		millisecond = Math.floor(usTotal / 1000);
		microsecond = usTotal % 1000;
	}

	try {
		return Temporal.ZonedDateTime.from({
			timeZone: tz,
			calendar: cal,
			year,
			month,
			day,
			hour,
			minute,
			second,
			millisecond,
			microsecond,
		});
	} catch {
		return undefined;
	}
}

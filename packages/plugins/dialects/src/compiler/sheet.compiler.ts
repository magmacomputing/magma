import { pad, WeakCache, Enum, resolveTwoDigitYear, resolveFractionalSeconds } from '@magmacomputing/tempo/library';
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

const SHEET_FORMAT_CACHE = new WeakCache<string, FormatterFn>();
const SHEET_PARSE_CACHE = new WeakCache<string, RegExp>();

export const SHEET_TOKENS = [
	'mmmmm', 'mmmm', 'mmm', 'mm', 'm',
	'dddd', 'ddd', 'dd', 'd',
	'yyyy', 'yy',
	'hh', 'h',
	'ss', 's',
	'AM/PM', 'am/pm', 'A/P', 'a/p',
	'.000', '.00', '.0',
	'[h]', '[m]', '[s]',
] as const;

export type SheetSpecifier = (typeof SHEET_TOKENS)[number];

const RE_SHEET_TOKEN = /"([^"]*)"|\\(.)|_[^\s]|[*][^\s]|\[(?:h+|m+|s+)\]|\[(?:red|green|blue|yellow|magenta|cyan|white|black)\]|(\.000|\.00|\.0|am\/pm|a\/p|yyyy|yy|mmmmm|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s)/gi;

const RE_AM_PM_CHECK = /\b(?:am\/pm|a\/p)\b/i;

/** @internal */
export interface SheetTokenMatch {
	readonly type: 'literal' | 'token';
	readonly value: string;
	readonly isMinute?: boolean;
}

/**
 * Tokenizes a sheet mask into an intermediate array resolving ambiguous m/mm tokens into month vs minute.
 * @internal
 */
export function tokenizeSheetMask(mask: string): SheetTokenMatch[] {
	const rawMatches: { index: number; text: string; literal?: string; token?: string }[] = [];
	RE_SHEET_TOKEN.lastIndex = 0;
	let match: RegExpExecArray | null;
	let lastIndex = 0;

	while ((match = RE_SHEET_TOKEN.exec(mask)) !== null) {
		const index = match.index;
		if (index > lastIndex) {
			rawMatches.push({
				index: lastIndex,
				text: mask.slice(lastIndex, index),
				literal: mask.slice(lastIndex, index),
			});
		}

		if (match[1] !== undefined) {
			rawMatches.push({ index, text: match[0], literal: match[1] });
		} else if (match[2] !== undefined) {
			rawMatches.push({ index, text: match[0], literal: match[2] });
		} else if (match[3] !== undefined) {
			rawMatches.push({ index, text: match[0], token: match[3].toLowerCase() });
		}
		// Notice _c, *c, color tags produce no literal output
		lastIndex = index + match[0].length;
	}

	if (lastIndex < mask.length) {
		rawMatches.push({
			index: lastIndex,
			text: mask.slice(lastIndex),
			literal: mask.slice(lastIndex),
		});
	}

	// Resolve m / mm context (preceded by h/hh or followed by s/ss)
	const result: SheetTokenMatch[] = [];
	for (let i = 0; i < rawMatches.length; i++) {
		const item = rawMatches[i];
		if (item.literal !== undefined) {
			result.push({ type: 'literal', value: item.literal });
			continue;
		}

		const tok = item.token!;
		if (tok === 'm' || tok === 'mm') {
			let isMinute = false;
			// Look backwards for h/hh without crossing d/y
			for (let prev = i - 1; prev >= 0; prev--) {
				const pt = rawMatches[prev].token;
				if (!pt)
					continue;
				if (pt === 'h' || pt === 'hh') {
					isMinute = true;
					break;
				}
				if (pt.startsWith('d') || pt.startsWith('y'))
					break;
			}
			// Look forwards for s/ss without crossing d/y
			if (!isMinute) {
				for (let next = i + 1; next < rawMatches.length; next++) {
					const nt = rawMatches[next].token;
					if (!nt)
						continue;
					if (nt === 's' || nt === 'ss') {
						isMinute = true;
						break;
					}
					if (nt.startsWith('d') || nt.startsWith('y'))
						break;
				}
			}

			result.push({ type: 'token', value: tok, isMinute });
		} else {
			result.push({ type: 'token', value: tok });
		}
	}

	return result;
}

/**
 * Compiles an Excel / Google Sheets format mask into a high-performance formatter function.
 */
export function compileSheetFormatter(mask: string): FormatterFn {
	const cached = SHEET_FORMAT_CACHE.get(mask);
	if (cached)
		return cached;

	const is12Hour = RE_AM_PM_CHECK.test(mask);
	const tokens = tokenizeSheetMask(mask);
	const parts: ((zdt: Temporal.ZonedDateTime) => string)[] = [];

	for (const t of tokens) {
		if (t.type === 'literal') {
			const lit = t.value;
			parts.push(() => lit);
			continue;
		}

		const tok = t.value;
		switch (tok) {
			case 'yyyy':
				parts.push((z) => pad(z.year, 4));
				break;
			case 'yy':
				parts.push((z) => pad(((z.year % 100) + 100) % 100, 2));
				break;
			case 'mmmmm':
				parts.push((z) => {
					const name = Enum.keyOf(enums.MONTHS, z.month) ?? '';
					return name.slice(0, 1);
				});
				break;
			case 'mmmm':
				parts.push((z) => Enum.keyOf(enums.MONTHS, z.month) ?? String(z.month));
				break;
			case 'mmm':
				parts.push((z) => Enum.keyOf(enums.MONTH, z.month) ?? String(z.month));
				break;
			case 'mm':
				if (t.isMinute)
					parts.push((z) => pad(z.minute, 2));
				else
					parts.push((z) => pad(z.month, 2));
				break;
			case 'm':
				if (t.isMinute)
					parts.push((z) => String(z.minute));
				else
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
			case 'hh':
				if (is12Hour)
					parts.push((z) => pad(((z.hour + 11) % 12) + 1, 2));
				else
					parts.push((z) => pad(z.hour, 2));
				break;
			case 'h':
				if (is12Hour)
					parts.push((z) => String(((z.hour + 11) % 12) + 1));
				else
					parts.push((z) => String(z.hour));
				break;
			case 'ss':
				parts.push((z) => pad(z.second, 2));
				break;
			case 's':
				parts.push((z) => String(z.second));
				break;
			case 'am/pm':
				parts.push((z) => (z.hour < 12 ? 'AM' : 'PM'));
				break;
			case 'a/p':
				parts.push((z) => (z.hour < 12 ? 'A' : 'P'));
				break;
			case '.000':
				parts.push((z) => `.${pad(z.millisecond, 3)}`);
				break;
			case '.00':
				parts.push((z) => `.${pad(Math.floor(z.millisecond / 10), 2)}`);
				break;
			case '.0':
				parts.push((z) => `.${Math.floor(z.millisecond / 100)}`);
				break;
			default:
				parts.push(() => tok);
				break;
		}
	}

	const fn: FormatterFn = (zdt) => parts.map((p) => p(zdt)).join('');
	SHEET_FORMAT_CACHE.set(mask, fn);
	return fn;
}

/**
 * Formats a date using Excel / Google Sheets format masks.
 */
export function formatSheet(zdt: Temporal.ZonedDateTime, mask: string): string {
	const formatter = compileSheetFormatter(mask);
	return formatter(zdt);
}

/**
 * Compiles a Sheet format mask into a parsing RegExp.
 */
export function compileSheetParser(mask: string): RegExp {
	const cached = SHEET_PARSE_CACHE.get(mask);
	if (cached)
		return cached;

	const is12Hour = RE_AM_PM_CHECK.test(mask);
	const tokens = tokenizeSheetMask(mask);
	const groupCounts: Record<string, number> = {};
	const group = (name: string, regex: string) => {
		const count = (groupCounts[name] = (groupCounts[name] ?? 0) + 1);
		const groupName = count === 1 ? name : `${name}_${count}`;
		return `(?<${groupName}>${regex})`;
	};

	let pattern = '';
	for (const t of tokens) {
		if (t.type === 'literal') {
			pattern += escapeRegex(t.value);
			continue;
		}

		const tok = t.value;
		switch (tok) {
			case 'yyyy':
				pattern += group('yyyy', '\\d{4}');
				break;
			case 'yy':
				pattern += group('yy', '\\d{2}');
				break;
			case 'mmmmm':
				pattern += group('month_letter', '[a-zA-Z]');
				break;
			case 'mmmm':
				pattern += group('month_name', '[a-zA-Z]+');
				break;
			case 'mmm':
				pattern += group('month_abbr', '[a-zA-Z]{3,}');
				break;
			case 'mm':
				if (t.isMinute)
					pattern += group('mi', '\\d{2}');
				else
					pattern += group('mm', '\\d{2}');
				break;
			case 'm':
				if (t.isMinute)
					pattern += group('mi', '\\d{1,2}');
				else
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
			case 'hh':
				pattern += is12Hour ? group('h12', '\\d{2}') : group('hh', '\\d{2}');
				break;
			case 'h':
				pattern += is12Hour ? group('h12', '\\d{1,2}') : group('hh', '\\d{1,2}');
				break;
			case 'ss':
				pattern += group('ss', '\\d{2}');
				break;
			case 's':
				pattern += group('ss', '\\d{1,2}');
				break;
			case 'am/pm':
				pattern += group('mer', 'AM|PM|am|pm');
				break;
			case 'a/p':
				pattern += group('mer', 'A|P|a|p');
				break;
			case '.000':
				pattern += `\\.${group('us', '\\d{3}')}`;
				break;
			case '.00':
				pattern += `\\.${group('us', '\\d{2}')}`;
				break;
			case '.0':
				pattern += `\\.${group('us', '\\d{1}')}`;
				break;
			default:
				pattern += escapeRegex(tok);
				break;
		}
	}

	const rx = new RegExp(`^${pattern}$`, 'i');
	SHEET_PARSE_CACHE.set(mask, rx);
	return rx;
}

/**
 * Parses an input string using an Excel / Google Sheets format mask.
 */
export function parseSheet(
	input: string,
	mask: string,
	options: DialectOptions = {},
): Temporal.ZonedDateTime | undefined {
	const rx = compileSheetParser(mask);
	const match = rx.exec(input.trim());
	if (!match)
		return undefined;

	const getGroup = createGroupExtractor(match);
	const ctx = resolveParseContext(getGroup, options);
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
	if (weekdayName || weekdayAbbr)
		resolvedWeekday = resolveWeekday(weekdayName || weekdayAbbr!);

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

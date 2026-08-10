import '#library/temporal.polyfill.js';
import { isString, isEmpty, isUndefined, isDefined, isTemporal, isInstant } from '#library/assertion.library.js';
import { ownKeys, ownEntries } from '#library/primitive.library.js';
import { asArray } from '#library/coercion.library.js';

import { pad, singular } from '#library/string.library.js';
import { Match, enums, isTempo, logError, logWarn, logDebug } from '#tempo/support';
import * as t from '../tempo.type.js';

/**
 * Internal Lexer helpers for the Tempo parsing engine.  
 * Extracted from Tempo class to reduce core file size.
 */

namespace Lexer {
	export type GroupWkd = { wkd?: t.WEEKDAY; mod?: t.Modifier; nbr?: string; sfx?: t.Relative; afx?: t.Relative } & { [K in 'hh' | 'mi' | 'ss' | 'ms' | 'us' | 'ns' | 'ff' | 'mer']?: string };
	export type GroupDate = { mod?: t.Modifier; nbr?: string; afx?: t.Relative; unt?: string; yy?: string; mm?: string; dd?: string; }
	export type GroupModifier = { mod?: t.Modifier | t.Relative, adjust: number, offset: number, period: number }
}

/** return a new object, with only numeric values */
function num(groups: Record<string, string | number>) {
	return ownEntries(groups)
		.reduce((acc: Record<string, number>, [key, val]: [string, any]) => {
			const v = isString(val) ? val.trim() : val;
			if (v === '') return acc;
			if (Number.isFinite(Number(v))) {
				acc[key] = Number(v);
				return acc;
			}

			const num = resolveNumber(val);
			if (enums.NUMBER.has(num)) {
				acc[key] = enums.NUMBER[num as t.Number];
				return acc;
			}

			const cal = prefix(val);															// get the three-character prefix for a Weekday/Month
			if (enums.WEEKDAY.has(cal)) acc[key] = enums.WEEKDAY[cal as t.WEEKDAY];
			else if (enums.MONTH.has(cal)) acc[key] = enums.MONTH[cal as t.MONTH];

			return acc;
		}, {} as Record<string, number>);
}

/** resolve a number word (0-10) using prefix matching */
export function resolveNumber(str: any): t.Number | any {
	if (!isString(str)) return str;
	const low = str.trim().toLowerCase();
	return enums.NUMBER.keys().find(key => key.startsWith(low)) ?? str;
}

/** conform weekday names (3-characters) using prefix matching */
export function prefix(str: t.WEEKDAY | t.WEEKDAYS): t.WEEKDAY;
/** conform month names (3-characters) using prefix matching */
export function prefix(str: t.MONTH | t.MONTHS): t.MONTH;
/** return original str if not a full weekday/month name */
export function prefix(str: string): string;
/** implementation */
export function prefix(str: any): any {
	if (!isString(str)) return str;

	const low = str.trim().toLowerCase().substring(0, 3);
	if (low.length < 2) return str;														// cannot determine ambiguity with less than 3 characters
	if (low === 'all' || low === 'eve') return 'All';					// handle special case of "all" / "every"

	for (const table of [enums.WEEKDAY, enums.MONTH]) {
		const match = table.keys().find(key => {
			const normalized = key.toLowerCase();
			return normalized.startsWith(low);
		});

		if (match) return match;
	}

	return str;
}

/** resolve a relative modifier (+, -, <, >, =, etc) */
export function normalizeModifier(mod: string, config: any = {}): string {
	if (mod && config?.registry?.modifiers) {
		const norm = mod.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
		for (const [sym, words] of Object.entries(config.registry.modifiers)) {
			if (asArray(words as string[])
				.map(w => w.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, ""))
				.includes(norm)) {
				return sym;
			}
		}
	}
	return mod;
}

export function parseModifier({ mod, adjust, offset, period }: Lexer.GroupModifier, config: any = {}) {
	adjust = Math.abs(adjust);
	mod = normalizeModifier(mod as string, config) as any;

	switch (mod) {
		case undefined:
		case '=':
			return 0
		case '+':
			return adjust;
		case '-':
			return -adjust;
		case '<':
			return (period <= offset) ? -adjust : -(adjust - 1);
		case '<=':
		case '-=':
			return (period < offset) ? -adjust : -(adjust - 1);
		case '>':
			return (period >= offset) ? adjust : (adjust - 1);
		case '>=':
		case '+=':
			return (period > offset) ? adjust : (adjust - 1);
		default:
			return 0;
	}
}

/**
 * if named-group 'wkd' detected (with optional 'mod', 'nbr', 'sfx' or time-units), then calc relative weekday offset  
 * | Example | Result | Note |
 * | :--- | :---- | :---- |
 * | `Wed` | Wed this week | might be earlier or later or equal to current day |
 * | `-Wed` | Wed last week | same as new Tempo('Wed').add({ weeks: -1 }) |
 * | `+Wed` | Wed next week | same as new Tempo('Wed').add({ weeks:  1 }) |
 * | `-3Wed` | Wed three weeks ago | same as new Tempo('Wed').add({ weeks: -3 }) |
 * | `<Wed` | Wed prior to today | might be current or previous week |
 * | `<=Wed` | Wed prior to tomorrow | might be current or previous week |
 * | `Wed noon` | Wed this week at 12:00pm | even though time-periods may be present, ignore them in this method |
 * 
 * @returns  ZonedDateTime with computed date-offset  
 */
export function parseWeekday(groups: t.Groups, dateTime: Temporal.ZonedDateTime, config: any): Temporal.ZonedDateTime {
	const { wkd, mod, nbr = '1', sfx, afx, ...rest } = groups as Lexer.GroupWkd;
	if (isUndefined(wkd)) return dateTime;

	const time = ['hh', 'mi', 'ss', 'ms', 'us', 'ns', 'ff', 'mer'] as ReadonlyArray<string>;
	if (!ownKeys(rest).every(key => time.includes(key) || key.startsWith('per')))
		return dateTime;

	if (!isEmpty(mod) && !isEmpty(sfx)) {
		logWarn(`Cannot provide both a modifier '${mod}' and suffix '${sfx}'`, config);
		return dateTime;
	}

	const weekday = prefix(wkd);
	const { nbr: adjust = 1 } = num({ nbr });
	const offset = (enums.WEEKDAY as any)[weekday] ?? (enums.WEEKDAYS as any)[weekday];

	if (!Number.isFinite(offset)) {
		logError(`Invalid weekday token: "${wkd}"`, config);
		return dateTime;
	}

	const days = offset - dateTime.dayOfWeek
		+ (parseModifier({ mod: mod ?? sfx ?? afx, adjust, offset, period: dateTime.dayOfWeek }, config) * dateTime.daysInWeek);

	delete groups["wkd"];
	delete groups["mod"];
	delete groups["nbr"];
	delete groups["sfx"];

	const finalDateTime = dateTime.add({ days });
	logDebug(`[Lexer] Applied weekday offset of ${days} days`, config);
	return finalDateTime;
}

/** resolve a date pattern match */
export function parseDate(groups: t.Groups, dateTime: Temporal.ZonedDateTime, config: any, pivot: number = 75): Temporal.ZonedDateTime {

	const { mod, nbr = '1', afx, unt, era } = groups as Lexer.GroupDate & { era?: string };
	// Normalize yy, mm, dd: treat empty captures as missing (regex groups yield '' for optional unmatched groups)
	let yy = groups.yy || undefined;
	let mm = groups.mm || undefined;
	let dd = groups.dd || undefined;

	if (era) {
		if (isUndefined(yy)) {
			logError(`[Tempo#lexer] Cannot resolve era '${era}' without an explicit year`, config);
			return dateTime;
		}
		const isBCE = /b\.?c\.?(?:e\.?)?|bc/i.test(era);
		if (isBCE) {
			yy = String(-(Number(yy) - 1));
		}
		if (isUndefined(mm) && isUndefined(dd)) {
			mm = '1';
			dd = '1';
		}
		delete groups["era"];
	}

	if (isEmpty(yy) && isEmpty(mm) && isEmpty(dd) && isUndefined(unt))
		return dateTime;

	if (!isEmpty(mod) && !isEmpty(afx)) {
		logWarn(`A date unit cannot have both a leading modifier ('${mod}') and a trailing affix ('${afx}') — use one or the other`, config);
		return dateTime;
	}

	// Fallback order: provided -> config.anchor (normalized to Temporal-like) -> dateTime
	let anchor = config?.anchor;
	if (isTempo(anchor)) anchor = anchor.toDateTime();
	if (isInstant(anchor)) anchor = anchor.toZonedDateTimeISO(config?.timeZone || 'UTC');
	if (!isTemporal(anchor)) anchor = undefined;

	const fallbackYear: number = isDefined(anchor?.year) ? anchor.year : dateTime.year;
	const fallbackMonth: number = isDefined(anchor?.month) ? anchor.month : dateTime.month;
	const fallbackDay: number = isDefined(anchor?.day) ? anchor.day : dateTime.day;

	let { year, month, day } = num({
		year: yy ?? fallbackYear,
		month: mm ?? fallbackMonth,
		day: dd ?? fallbackDay,
	} as any);

	if (unt) {
		const { nbr: adjust = 1 } = num({ nbr });
		const dir = parseModifier({ mod: mod ?? afx, adjust: 1, offset: 0, period: 0 }, config);
		const direction = dir < 0 ? -1 : 1;
		const plural = `${singular(unt)}s`;
		dateTime = dateTime.add({ [plural]: adjust * direction } as any);

		delete groups["unt"];
		delete groups["nbr"];
		delete groups["afx"];
		delete groups["mod"];

		return dateTime;
	}

	if (year.toString().match(Match.twoDigit)) {
		const pivotYear = dateTime.subtract({ years: pivot }).year % 100;
		const century = Math.trunc(dateTime.year / 100);
		year += (century - Number(year >= pivotYear)) * 100;
	}

	const { nbr: adjust = 1 } = num({ nbr });
	const offset = Number(pad(month) + '.' + pad(day));
	const period = Number(pad(dateTime.month) + '.' + pad(dateTime.day + 1));
	const tz = (dateTime as any).timeZoneId ?? (dateTime as any).timeZone;

	const pmRes = parseModifier({ mod: mod ?? afx, adjust, offset, period }, config);
	year += pmRes;
	Object.assign(groups, { yy: year, mm: month, dd: day });

	delete groups["mod"];
	delete groups["nbr"];
	delete groups["afx"];

	if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
		logError(`Invalid Date components: year=${year}, month=${month}, day=${day}`, config);
		return dateTime;
	}

	const finalDateTime = Temporal.PlainDate.from({ year, month, day }, { overflow: 'constrain' })
		.toZonedDateTime(tz)
		.withPlainTime(dateTime.toPlainTime());

	logDebug(`[Lexer] Resolved Date components to ${year}-${month}-${day}`, config);
	return finalDateTime;
}

/** resolve a time pattern match */
export function parseTime(groups: t.Groups = {}, dateTime: Temporal.ZonedDateTime): Temporal.ZonedDateTime {
	if (isUndefined(groups["hh"])) return dateTime;

	let { hh = 0, mi = 0, ss = 0, ms = 0, us = 0, ns = 0 } = num(groups);
	if (hh >= 24) {
		dateTime = dateTime.add({ days: Math.trunc(hh / 24) });
		hh %= 24;
	}

	if (isDefined(groups["ff"])) {
		const ff = groups["ff"].substring(0, 9).padEnd(9, '0');
		ms = +ff.substring(0, 3);
		us = +ff.substring(3, 6);
		ns = +ff.substring(6, 9);
	}

	if (groups["mer"]?.toLowerCase() === 'pm' && hh < 12 && (hh + mi + ss + ms + us + ns) > 0)
		hh += 12;
	if (groups["mer"]?.toLowerCase() === 'am' && hh >= 12)
		hh -= 12;

	const finalDateTime = dateTime.withPlainTime({ hour: hh, minute: mi, second: ss, millisecond: ms, microsecond: us, nanosecond: ns });
	logDebug(`[Lexer] Resolved Time components to ${pad(hh)}:${pad(mi)}:${pad(ss)}`, undefined);
	return finalDateTime;
}

/**
 * apply a timezone or calendar bracket to the current ZonedDateTime  
 * normalization is applied to ensure 'Z' is treated as 'UTC'
 */
export function parseZone(groups: t.Groups, dateTime: Temporal.ZonedDateTime, config?: any): Temporal.ZonedDateTime {
	if (!isTemporal(dateTime)) return dateTime;

	const tzd = groups["tzd"]?.replace(Match.zed, 'UTC');
	const brk = groups["brk"]?.replace(Match.zed, 'UTC');
	let zone: string | undefined = brk || tzd;

	if (zone) {
		const match = zone.match(/^([+-])(\d{1,2})(?::?(\d{2}))?$/);
		if (match)
			zone = `${match[1]}${match[2].padStart(2, '0')}:${match[3] ?? '00'}`;
	}

	let cal = groups["cal"];
	if (zone?.startsWith('u-ca=')) {
		cal = zone;
		zone = tzd;
	}

	const zdt = dateTime as any;
	if (zone && zone !== zdt.timeZoneId) {
		const resolvedZone = enums.TIMEZONE[zone.toLowerCase()] ?? zone;
		try {
			dateTime = zdt.toPlainDateTime().toZonedDateTime(resolvedZone);
			if (config) config.timeZone = resolvedZone;
		} catch {
			logWarn(`Unrecognized or invalid timezone identifier: '${zone}'`, config);
		}
	}
	if (cal && cal !== (dateTime as any).calendarId) {
		const calendar = cal.startsWith('u-ca=') ? cal.substring(5) : cal;
		if (config) config.calendar = calendar;
		dateTime = dateTime.withCalendar(calendar);
	}

	delete groups["brk"];
	delete groups["cal"];
	delete groups["tzd"];

	if (zone || cal)
		logDebug(`[Lexer] Applied Zone/Calendar adjustments: Zone=${zone ?? 'unchanged'}, Calendar=${cal ?? 'unchanged'}`, config);

	return dateTime;
}

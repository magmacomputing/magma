import { isDefined } from './assertion.library.js';

/**
 * Tests whether a string is a valid RFC 5545 Recurrence Rule (RRULE).
 *
 * @param input - The candidate string to inspect
 * @returns `true` if the string matches an RRULE pattern starting with FREQ=, otherwise `false`.
 */
export function isRRuleString(input: string): boolean {
	const trimmed = input.trim();
	return /^(RRULE:)?FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/i.test(trimmed);
}

/**
 * Checks whether an RRULE string represents a finite (bounded) series.
 *
 * @param rrule - The RFC 5545 RRULE string
 * @returns `true` if the rule contains an UNTIL or COUNT boundary clause, otherwise `false`.
 */
export function isFiniteRRule(rrule: string): boolean {
	return /(UNTIL|COUNT)=/i.test(rrule);
}

/**
 * Number of days in a standard week.
 */
export const DAYS_IN_WEEK = 7;

/**
 * Mapping of 2-letter ISO day abbreviations (MO..SU) to 1-indexed weekday numbers (1..7).
 */
export const DAY_MAP: Record<string, number> = Object.freeze({
	MO: 1,
	TU: 2,
	WE: 3,
	TH: 4,
	FR: 5,
	SA: 6,
	SU: 7
});

/**
 * Mapping of 3-letter month abbreviations (JAN..DEC) to 1-indexed month numbers (1..12).
 */
export const MONTH_MAP: Record<string, number> = Object.freeze({
	JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
	JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
});

/**
 * Parsed structure of an RFC 5545 Recurrence Rule string.
 */
export interface ParsedRRule {
	/** Frequency unit: DAILY, WEEKLY, MONTHLY, or YEARLY */
	freq: string;
	/** Inter-occurrence interval count (default: 1) */
	interval: number;
	/** Maximum number of occurrences to generate, if bounded by COUNT */
	count?: number | undefined;
	/** Bounded end timestamp in epoch milliseconds, if bounded by UNTIL */
	untilMs?: number | undefined;
	/** Filter months (1..12) from BYMONTH */
	byMonth?: number[] | undefined;
	/** Day-of-week specifications from BYDAY with optional nth occurrences */
	byDay?: Array<{ nth?: number | undefined; day: string }> | undefined;
	/** Hour filters (0..23) from BYHOUR */
	byHour?: number[] | undefined;
	/** Minute filters (0..59) from BYMINUTE */
	byMinute?: number[] | undefined;
	/** Set position selectors from BYSETPOS */
	bySetPos?: number[] | undefined;
}

/**
 * Parses an RFC 5545 RRULE string into a structured {@link ParsedRRule} object.
 *
 * @param rrule - The raw RFC 5545 RRULE string to parse
 * @returns Structured representation of the recurrence parameters
 */
export function parseRRule(rrule: string): ParsedRRule {
	const parts = rrule.split(';');
	let freq = 'DAILY';
	let interval = 1;
	let count: number | undefined;
	let untilMs: number | undefined;
	let byMonth: number[] | undefined;
	let byDay: Array<{ nth?: number | undefined; day: string }> | undefined;
	let byHour: number[] | undefined;
	let byMinute: number[] | undefined;
	let bySetPos: number[] | undefined;

	for (const part of parts) {
		const [key, val] = part.split('=');
		if (!key || !val) continue;
		const k = key.toUpperCase();
		const trimmedVal = val.trim();

		switch (k) {
			case 'FREQ':
				freq = trimmedVal.toUpperCase();
				break;
			case 'INTERVAL': {
				const parsed = parseInt(trimmedVal, 10);
				interval = !isNaN(parsed) && parsed > 0 ? parsed : 1;
				break;
			}
			case 'COUNT': {
				const parsed = parseInt(trimmedVal, 10);
				count = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
				break;
			}
			case 'UNTIL': {
				if (/^\d{8}$/.test(trimmedVal)) {
					const year = parseInt(trimmedVal.slice(0, 4), 10);
					const month = parseInt(trimmedVal.slice(4, 6), 10);
					const day = parseInt(trimmedVal.slice(6, 8), 10);
					untilMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999);
				} else {
					const uStr = trimmedVal.replace(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/, '$1-$2-$3T$4:$5:$6Z');
					const parsedDate = new Date(uStr);
					untilMs = !isNaN(parsedDate.getTime()) ? parsedDate.getTime() : undefined;
				}
				break;
			}
			case 'BYMONTH': {
				const items = trimmedVal.split(',').map(v => {
					const trimmed = v.trim();
					const num = parseInt(trimmed, 10);
					if (!isNaN(num) && num >= 1 && num <= 12) return num;
					const prefix = trimmed.slice(0, 3).toUpperCase();
					return MONTH_MAP[prefix];
				}).filter((v): v is number => isDefined(v));
				if (items.length > 0) byMonth = items;
				break;
			}
			case 'BYDAY': {
				const items = trimmedVal.split(',').map(item => {
					const m = item.match(/^([+-]?\d+)?([A-Z]+)$/i);
					const nthVal = m && m[1] ? parseInt(m[1], 10) : undefined;
					const rawDay = m ? m[2] : item;
					const canonicalDay = rawDay.slice(0, 2).toUpperCase();
					return { nth: isDefined(nthVal) && !isNaN(nthVal) ? nthVal : undefined, day: canonicalDay };
				}).filter(d => isDefined(DAY_MAP[d.day]));
				if (items.length > 0) byDay = items;
				break;
			}
			case 'BYHOUR': {
				const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v) && v >= 0 && v <= 23);
				if (items.length > 0) byHour = items;
				break;
			}
			case 'BYMINUTE': {
				const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v) && v >= 0 && v <= 59);
				if (items.length > 0) byMinute = items;
				break;
			}
			case 'BYSETPOS': {
				const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v));
				if (items.length > 0) bySetPos = items;
				break;
			}
			default:
				// Safely ignore unrecognized or extra RRULE parameters (e.g. WKST, EXDATE)
				break;
		}
	}

	return { freq, interval, count, untilMs, byMonth, byDay, byHour, byMinute, bySetPos };
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Expands occurrences of an RFC 5545 RRULE string into epoch millisecond numbers.
 * Pure function operating strictly on primitive timestamps and UTC Date calculations.
 *
 * @param rruleStr - The RFC 5545 recurrence rule string to expand
 * @param anchorEpochMs - Anchor timestamp in epoch milliseconds to evaluate occurrences from
 * @param options - Optional bounds and count controls for the evaluation
 * @returns Array of occurrence timestamps in epoch milliseconds
 */
export function expandRRuleEpochs(
	rruleStr: string,
	anchorEpochMs: number,
	options?: { count?: number | undefined; afterMs?: number | undefined; beforeMs?: number | undefined }
): number[] {
	const rule = parseRRule(rruleStr);
	const anchorDate = new Date(anchorEpochMs);
	const results: number[] = [];
	const maxToFetch = isDefined(rule.count) ? rule.count : (options?.count ?? 100);

	let totalGeneratedFromAnchor = 0;
	let resultsCount = 0;
	let step = 0;
	const MAX_STEPS = 1000;

	const anchorHours = anchorDate.getUTCHours();
	const anchorMinutes = anchorDate.getUTCMinutes();
	const anchorSeconds = anchorDate.getUTCSeconds();
	const anchorMs = anchorDate.getUTCMilliseconds();

	while (resultsCount < maxToFetch && step < MAX_STEPS) {
		let periodBases: Date[] = [];
		const baseDate = new Date(anchorEpochMs);

		switch (rule.freq) {
			case 'WEEKLY': {
				baseDate.setUTCDate(baseDate.getUTCDate() + step * rule.interval * DAYS_IN_WEEK);
				if (rule.byDay && rule.byDay.length > 0) {
					periodBases = rule.byDay.map(bd => {
						const targetDay = DAY_MAP[bd.day] ?? 1;
						const currentDow = baseDate.getUTCDay() === 0 ? DAY_MAP.SUN : baseDate.getUTCDay();
						const diff = (targetDay - currentDow + DAYS_IN_WEEK) % DAYS_IN_WEEK;
						const targetDate = new Date(baseDate.getTime());
						targetDate.setUTCDate(targetDate.getUTCDate() + diff);
						return targetDate;
					});
				} else {
					periodBases = [baseDate];
				}
				break;
			}
			case 'MONTHLY': {
				baseDate.setUTCMonth(baseDate.getUTCMonth() + step * rule.interval);
				const year = baseDate.getUTCFullYear();
				const month = baseDate.getUTCMonth() + 1;
				const daysInMonth = getDaysInMonth(year, month);

				if (rule.byDay && rule.byDay.length > 0) {
					const candidateDays: Date[] = [];
					for (const bd of rule.byDay) {
						const targetDow = DAY_MAP[bd.day] ?? 1;
						const matchingDates: Date[] = [];
						for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
							const d = new Date(Date.UTC(year, month - 1, dayNum, anchorHours, anchorMinutes, anchorSeconds, anchorMs));
							const dow = d.getUTCDay() === 0 ? DAY_MAP.SUN : d.getUTCDay();
							if (dow === targetDow) matchingDates.push(d);
						}

						if (isDefined(bd.nth)) {
							if (bd.nth > 0 && bd.nth <= matchingDates.length) {
								candidateDays.push(matchingDates[bd.nth - 1]);
							} else if (bd.nth < 0 && Math.abs(bd.nth) <= matchingDates.length) {
								candidateDays.push(matchingDates[matchingDates.length + bd.nth]);
							}
						} else {
							candidateDays.push(...matchingDates);
						}
					}
					periodBases = candidateDays;
				} else {
					periodBases = [baseDate];
				}
				break;
			}
			case 'YEARLY': {
				baseDate.setUTCFullYear(baseDate.getUTCFullYear() + step * rule.interval);
				periodBases = [baseDate];
				break;
			}
			case 'DAILY':
			default: {
				baseDate.setUTCDate(baseDate.getUTCDate() + step * rule.interval);
				periodBases = [baseDate];
				break;
			}
		}

		if (rule.byMonth && rule.byMonth.length > 0)
			periodBases = periodBases.filter(b => rule.byMonth!.includes(b.getUTCMonth() + 1));

		const periodCandidates: Date[] = [];
		for (const base of periodBases) {
			const hours = rule.byHour && rule.byHour.length > 0 ? rule.byHour : [base.getUTCHours()];
			const minutes = rule.byMinute && rule.byMinute.length > 0 ? rule.byMinute : [base.getUTCMinutes()];

			for (const h of hours) {
				for (const m of minutes) {
					const cand = new Date(base.getTime());
					cand.setUTCHours(h, m, anchorSeconds, anchorMs);
					periodCandidates.push(cand);
				}
			}
		}

		let finalPeriodCandidates = periodCandidates;
		if (rule.bySetPos && rule.bySetPos.length > 0 && periodCandidates.length > 0) {
			finalPeriodCandidates = [];
			for (const pos of rule.bySetPos) {
				if (pos > 0 && pos <= periodCandidates.length) {
					finalPeriodCandidates.push(periodCandidates[pos - 1]);
				} else if (pos < 0 && Math.abs(pos) <= periodCandidates.length) {
					finalPeriodCandidates.push(periodCandidates[periodCandidates.length + pos]);
				}
			}
		}

		step++;

		let stopSeries = false;
		for (const cand of finalPeriodCandidates) {
			totalGeneratedFromAnchor++;
			const candMs = cand.getTime();

			if (isDefined(rule.untilMs) && candMs > rule.untilMs) {
				stopSeries = true;
				break;
			}
			if (isDefined(rule.count) && totalGeneratedFromAnchor > rule.count) {
				stopSeries = true;
				break;
			}
			if (isDefined(options?.beforeMs) && candMs > options.beforeMs) {
				stopSeries = true;
				break;
			}
			if (isDefined(options?.afterMs) && candMs <= options.afterMs) {
				continue;
			}

			results.push(candMs);
			resultsCount++;

			if (resultsCount >= maxToFetch) {
				stopSeries = true;
				break;
			}
		}

		if (stopSeries) break;
	}

	return results;
}

/**
 * Computes the single next RRULE occurrence epoch millisecond timestamp after `fromEpochMs`.
 *
 * @param rruleStr - The RFC 5545 recurrence rule string
 * @param fromEpochMs - The baseline timestamp in epoch milliseconds
 * @returns Epoch millisecond timestamp of the next occurrence
 */
export function getNextRRuleEpoch(rruleStr: string, fromEpochMs: number): number {
	const expanded = expandRRuleEpochs(rruleStr, fromEpochMs, { count: 1, afterMs: fromEpochMs });
	if (expanded.length > 0) return expanded[0];

	// Fallback to simple 1 day shift if rule has ended or yields no occurrences
	return fromEpochMs + 86_400_000;
}

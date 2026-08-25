import { isDefined, isNumber, isString } from '#library/assertion.library.js';
import {
	DAYS_IN_WEEK,
	DAY_MAP,
	MONTH_MAP,
	getDaysInMonth,
	getUtcParts,
	fromUtcParts,
	isValidDate,
	addUtcDays,
	withUtcParts,
	type DayKey,
	type MonthKey,
} from '#library/calendar.library.js';

const RE_RRULE_FREQ = /^(RRULE:)?FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;|$)/i;
const RE_FINITE_RRULE = /(?:^|;)(?:RRULE:)?(UNTIL|COUNT)=/i;
const RE_RRULE_PREFIX = /^RRULE:/i;
const RE_DATE_8DIGIT = /^\d{8}$/;
const RE_UNTIL_TIMESTAMP = /^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?Z?$/;
const RE_BYDAY_PART = /^([+-]?\d+)?([A-Z]+)$/i;

/**
 * Tests whether a value is a valid RFC 5545 Recurrence Rule (RRULE) string.
 *
 * @param input - The candidate value to inspect
 * @returns `true` if the value is a string matching an RRULE pattern starting with FREQ=, otherwise `false`.
 */
export function isRRuleString(input: unknown): input is string {
	if (!isString(input)) return false;
	const trimmed = input.trim();
	return RE_RRULE_FREQ.test(trimmed);
}

/**
 * Checks whether an RRULE string represents a finite (bounded) series.
 *
 * @param rrule - The RFC 5545 RRULE string
 * @returns `true` if the rule contains an UNTIL or COUNT boundary clause, otherwise `false`.
 */
export function isFiniteRRule(rrule: string): boolean {
	return RE_FINITE_RRULE.test(rrule);
}

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
	const cleanRRule = rrule.trim().replace(RE_RRULE_PREFIX, '');
	const parts = cleanRRule.split(';');
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
		const trimmedArr = trimmedVal.split(',').map(v => v.trim());

		switch (k) {
			case 'FREQ':
				freq = trimmedVal.toUpperCase();
				break;
			case 'INTERVAL': {
				const parsed = parseInt(trimmedVal, 10);
				interval = isNumber(parsed) && parsed > 0 ? parsed : 1;
				break;
			}
			case 'COUNT': {
				const parsed = parseInt(trimmedVal, 10);
				count = isNumber(parsed) && parsed > 0 ? parsed : undefined;
				break;
			}
			case 'UNTIL': {
				if (RE_DATE_8DIGIT.test(trimmedVal)) {
					const year = parseInt(trimmedVal.slice(0, 4), 10);
					const month = parseInt(trimmedVal.slice(4, 6), 10);
					const day = parseInt(trimmedVal.slice(6, 8), 10);
					if (isValidDate(year, month, day))
						untilMs = fromUtcParts({ year, month, day, hours: 23, minutes: 59, seconds: 59, milliseconds: 999 }).getTime();
				} else {
					const uStr = trimmedVal.replace(RE_UNTIL_TIMESTAMP, '$1-$2-$3T$4:$5:$6Z');
					const parsedDate = new Date(uStr);
					untilMs = isNumber(parsedDate.getTime()) ? parsedDate.getTime() : undefined;
				}
				break;
			}
			case 'BYMONTH': {
				const items = trimmedArr.map(v => {
					const num = parseInt(v, 10);
					if (isNumber(num) && num >= 1 && num <= 12) return num;
					const prefix = v.slice(0, 3).toUpperCase();
					return prefix in MONTH_MAP ? MONTH_MAP[prefix as MonthKey] : undefined;
				}).filter((v): v is number => isDefined(v));
				if (items.length > 0) byMonth = items;
				break;
			}
			case 'BYDAY': {
				const items = trimmedArr.map(item => {
					const m = item.match(RE_BYDAY_PART);
					const nthVal = m && m[1] ? parseInt(m[1], 10) : undefined;
					const rawDay = m ? m[2] : item;
					const canonicalDay = rawDay.slice(0, 2).toUpperCase();
					return { nth: isNumber(nthVal) ? nthVal : undefined, day: canonicalDay };
				}).filter(d => d.day in DAY_MAP);
				if (items.length > 0) byDay = items;
				break;
			}
			case 'BYHOUR': {
				const items = trimmedArr.map(v => parseInt(v, 10)).filter(v => isNumber(v) && v >= 0 && v <= 23);
				if (items.length > 0) byHour = items;
				break;
			}
			case 'BYMINUTE': {
				const items = trimmedArr.map(v => parseInt(v, 10)).filter(v => isNumber(v) && v >= 0 && v <= 59);
				if (items.length > 0) byMinute = items;
				break;
			}
			case 'BYSETPOS': {
				const items = trimmedArr.map(v => parseInt(v, 10)).filter(isNumber);
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
	const maxToFetch = isDefined(rule.count) && isDefined(options?.count)
		? Math.min(rule.count, options.count)
		: (rule.count ?? options?.count ?? 100);

	let totalGeneratedFromAnchor = 0;
	let resultsCount = 0;
	let step = 0;
	const MAX_STEPS = 1000;

	const {
		year: anchorYear,
		month: anchorMonth,
		day: anchorDay,
		hours: anchorHours,
		minutes: anchorMinutes,
		seconds: anchorSeconds,
		milliseconds: anchorMs,
	} = getUtcParts(anchorDate);

	while (resultsCount < maxToFetch && step < MAX_STEPS) {
		let periodBases: Date[] = [];

		switch (rule.freq) {
			case 'WEEKLY': {
				const steppedDate = addUtcDays(anchorDate, step * rule.interval * DAYS_IN_WEEK);
				if (rule.byDay && rule.byDay.length > 0) {
					periodBases = rule.byDay.map(bd => {
						const targetDay = bd.day in DAY_MAP ? DAY_MAP[bd.day as DayKey] : 1;
						const currentDow = getUtcParts(steppedDate).weekday;
						const diff = (targetDay - currentDow + DAYS_IN_WEEK) % DAYS_IN_WEEK;
						return addUtcDays(steppedDate, diff);
					});
				} else {
					periodBases = [steppedDate];
				}
				break;
			}

			case 'MONTHLY': {
				const totalMonths = (anchorYear * 12 + (anchorMonth - 1)) + step * rule.interval;
				const targetYear = Math.floor(totalMonths / 12);
				const targetMonth = (totalMonths % 12) + 1;

				if (rule.byDay && rule.byDay.length > 0) {
					const daysInMonth = getDaysInMonth(targetYear, targetMonth);
					const candidateDays: Date[] = [];
					for (const bd of rule.byDay) {
						const targetDow = bd.day in DAY_MAP ? DAY_MAP[bd.day as DayKey] : 1;
						const matchingDates: Date[] = [];
						for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
							const d = fromUtcParts({
								year: targetYear,
								month: targetMonth,
								day: dayNum,
								hours: anchorHours,
								minutes: anchorMinutes,
								seconds: anchorSeconds,
								milliseconds: anchorMs,
							});
							const dow = getUtcParts(d).weekday;
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
					if (isValidDate(targetYear, targetMonth, anchorDay)) {
						periodBases = [fromUtcParts({
							year: targetYear,
							month: targetMonth,
							day: anchorDay,
							hours: anchorHours,
							minutes: anchorMinutes,
							seconds: anchorSeconds,
							milliseconds: anchorMs,
						})];
					}
				}
				break;
			}

			case 'YEARLY': {
				const targetYear = anchorYear + step * rule.interval;
				const months = rule.byMonth && rule.byMonth.length > 0 ? rule.byMonth : [anchorMonth];
				const candidateDays: Date[] = [];

				for (const m of months) {
					if (rule.byDay && rule.byDay.length > 0) {
						const daysInMonth = getDaysInMonth(targetYear, m);
						for (const bd of rule.byDay) {
							const targetDow = bd.day in DAY_MAP ? DAY_MAP[bd.day as DayKey] : 1;
							const matchingDates: Date[] = [];
							for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
								const d = fromUtcParts({
									year: targetYear,
									month: m,
									day: dayNum,
									hours: anchorHours,
									minutes: anchorMinutes,
									seconds: anchorSeconds,
									milliseconds: anchorMs,
								});
								const dow = getUtcParts(d).weekday;
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
					} else {
						if (isValidDate(targetYear, m, anchorDay)) {
							candidateDays.push(fromUtcParts({
								year: targetYear,
								month: m,
								day: anchorDay,
								hours: anchorHours,
								minutes: anchorMinutes,
								seconds: anchorSeconds,
								milliseconds: anchorMs,
							}));
						}
					}
				}
				periodBases = candidateDays;
				break;
			}

			case 'DAILY': {
				periodBases = [addUtcDays(anchorDate, step * rule.interval)];
				break;
			}

			default:
				throw new Error(`Unsupported RRULE frequency: ${rule.freq}`);
		}

		if (rule.byMonth && rule.byMonth.length > 0 && rule.freq !== 'YEARLY')
			periodBases = periodBases.filter(b => rule.byMonth!.includes(b.getUTCMonth() + 1));

		const periodCandidates: Date[] = [];
		for (const base of periodBases) {
			const { hours: baseHours, minutes: baseMinutes } = getUtcParts(base);
			const hours = rule.byHour && rule.byHour.length > 0 ? rule.byHour : [baseHours];
			const minutes = rule.byMinute && rule.byMinute.length > 0 ? rule.byMinute : [baseMinutes];

			for (const h of hours) {
				for (const m of minutes) {
					periodCandidates.push(withUtcParts(base, {
						hours: h,
						minutes: m,
						seconds: anchorSeconds,
						milliseconds: anchorMs,
					}));
				}
			}
		}

		periodCandidates.sort((a, b) => a.getTime() - b.getTime());

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
 * Note: RRULE evaluation is performed in UTC.
 *
 * @param rruleStr - The RFC 5545 recurrence rule string
 * @param fromEpochMs - The baseline timestamp in epoch milliseconds
 * @returns Epoch millisecond timestamp of the next occurrence, or null if no further occurrences exist
 */
export function getNextRRuleEpoch(rruleStr: string, fromEpochMs: number): number | null {
	const expanded = expandRRuleEpochs(rruleStr, fromEpochMs, { count: 1, afterMs: fromEpochMs });
	return expanded.length > 0 ? expanded[0] : null;
}

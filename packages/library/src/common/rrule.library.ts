import '#library/temporal.polyfill.js';

export function isRRuleString(input: string): boolean {
	const trimmed = input.trim();
	return /^(RRULE:)?FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/i.test(trimmed);
}

export function checkIsFinite(rrule: string): boolean {
	return /(UNTIL|COUNT)=/i.test(rrule);
}

export const DAY_MAP: Record<string, number> = {
	MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7
};

export interface ParsedRRule {
	freq: string;
	interval: number;
	count?: number | undefined;
	untilMs?: number | undefined;
	byMonth?: number[] | undefined;
	byDay?: Array<{ nth?: number | undefined; day: string }> | undefined;
	byHour?: number[] | undefined;
	byMinute?: number[] | undefined;
	bySetPos?: number[] | undefined;
}

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

		if (k === 'FREQ') {
			freq = trimmedVal.toUpperCase();
		} else if (k === 'INTERVAL') {
			const parsed = parseInt(trimmedVal, 10);
			interval = !isNaN(parsed) && parsed > 0 ? parsed : 1;
		} else if (k === 'COUNT') {
			const parsed = parseInt(trimmedVal, 10);
			count = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
		} else if (k === 'UNTIL') {
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
		} else if (k === 'BYMONTH') {
			const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v) && v >= 1 && v <= 12);
			if (items.length > 0) byMonth = items;
		} else if (k === 'BYDAY') {
			const items = trimmedVal.split(',').map(item => {
				const m = item.match(/^([+-]?\d+)?([A-Z]{2})$/i);
				const nthVal = m && m[1] ? parseInt(m[1], 10) : undefined;
				const dayVal = m ? m[2].toUpperCase() : item.toUpperCase();
				return { nth: nthVal !== undefined && !isNaN(nthVal) ? nthVal : undefined, day: dayVal };
			}).filter(d => DAY_MAP[d.day] !== undefined);
			if (items.length > 0) byDay = items;
		} else if (k === 'BYHOUR') {
			const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v) && v >= 0 && v <= 23);
			if (items.length > 0) byHour = items;
		} else if (k === 'BYMINUTE') {
			const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v) && v >= 0 && v <= 59);
			if (items.length > 0) byMinute = items;
		} else if (k === 'BYSETPOS') {
			const items = trimmedVal.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v));
			if (items.length > 0) bySetPos = items;
		}
	}

	return { freq, interval, count, untilMs, byMonth, byDay, byHour, byMinute, bySetPos };
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Expands occurrences of an RRULE string into epoch millisecond numbers.
 * Pure function operating strictly on epoch timestamps and Temporal/Date math.
 */
export function expandRRuleEpochs(
	rruleStr: string,
	anchorEpochMs: number,
	options?: { count?: number | undefined; afterMs?: number | undefined; beforeMs?: number | undefined }
): number[] {
	const rule = parseRRule(rruleStr);
	const anchorDate = new Date(anchorEpochMs);
	const results: number[] = [];
	const maxToFetch = rule.count !== undefined ? rule.count : (options?.count ?? 100);

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

		if (rule.freq === 'DAILY') {
			const d = new Date(anchorEpochMs);
			d.setUTCDate(d.getUTCDate() + step * rule.interval);
			periodBases = [d];
		} else if (rule.freq === 'WEEKLY') {
			const weekBase = new Date(anchorEpochMs);
			weekBase.setUTCDate(weekBase.getUTCDate() + step * rule.interval * 7);
			if (rule.byDay && rule.byDay.length > 0) {
				periodBases = rule.byDay.map(bd => {
					const targetDay = DAY_MAP[bd.day] ?? 1;
					const currentDow = weekBase.getUTCDay() === 0 ? 7 : weekBase.getUTCDay();
					const diff = (targetDay - currentDow + 7) % 7;
					const targetDate = new Date(weekBase.getTime());
					targetDate.setUTCDate(targetDate.getUTCDate() + diff);
					return targetDate;
				});
			} else {
				periodBases = [weekBase];
			}
		} else if (rule.freq === 'MONTHLY') {
			const monthBase = new Date(anchorEpochMs);
			monthBase.setUTCMonth(monthBase.getUTCMonth() + step * rule.interval);
			const year = monthBase.getUTCFullYear();
			const month = monthBase.getUTCMonth() + 1;
			const daysInMonth = getDaysInMonth(year, month);

			if (rule.byDay && rule.byDay.length > 0) {
				const candidateDays: Date[] = [];
				for (const bd of rule.byDay) {
					const targetDow = DAY_MAP[bd.day] ?? 1;
					const matchingDates: Date[] = [];
					for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
						const d = new Date(Date.UTC(year, month - 1, dayNum, anchorHours, anchorMinutes, anchorSeconds, anchorMs));
						const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
						if (dow === targetDow) matchingDates.push(d);
					}

					if (bd.nth !== undefined) {
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
				periodBases = [monthBase];
			}
		} else if (rule.freq === 'YEARLY') {
			const yearBase = new Date(anchorEpochMs);
			yearBase.setUTCFullYear(yearBase.getUTCFullYear() + step * rule.interval);
			periodBases = [yearBase];
		} else {
			const d = new Date(anchorEpochMs);
			d.setUTCDate(d.getUTCDate() + step * rule.interval);
			periodBases = [d];
		}

		if (rule.byMonth && rule.byMonth.length > 0) {
			periodBases = periodBases.filter(b => rule.byMonth!.includes(b.getUTCMonth() + 1));
		}

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

			if (rule.untilMs !== undefined && candMs > rule.untilMs) {
				stopSeries = true;
				break;
			}
			if (rule.count !== undefined && totalGeneratedFromAnchor > rule.count) {
				stopSeries = true;
				break;
			}
			if (options?.beforeMs !== undefined && candMs > options.beforeMs) {
				stopSeries = true;
				break;
			}
			if (options?.afterMs !== undefined && candMs <= options.afterMs) {
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
 */
export function getNextRRuleEpoch(rruleStr: string, fromEpochMs: number): number {
	const expanded = expandRRuleEpochs(rruleStr, fromEpochMs, { count: 1, afterMs: fromEpochMs });
	if (expanded.length > 0) return expanded[0];

	// Fallback to simple 1 day shift if rule has ended or yields no occurrences
	return fromEpochMs + 86_400_000;
}

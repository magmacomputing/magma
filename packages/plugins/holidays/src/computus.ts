/**
 * Computes calendar dates, floating Easter offsets, and weekday shifts.
 */

/**
 * Formats year, month, and day integers into an ISO 8601 'YYYY-MM-DD' date string.
 *
 * @param year - The full 4-digit calendar year
 * @param month - 1-based month (1 = Jan, 12 = Dec)
 * @param day - 1-based day of month (1..31)
 * @returns Formatted ISO date string
 */
export function formatDate(year: number, month: number, day: number): string {
	const mm = String(month).padStart(2, '0');
	const dd = String(day).padStart(2, '0');
	return `${year}-${mm}-${dd}`;
}

/**
 * Calculates the day of the week (1 = Monday, 7 = Sunday) according to ISO 8601.
 *
 * @param year - 4-digit calendar year
 * @param month - 1-based month
 * @param day - 1-based day of month
 * @returns ISO day of week (1 = Monday .. 7 = Sunday)
 */
export function getIsoDayOfWeek(year: number, month: number, day: number): number {
	const d = new Date(Date.UTC(year, month - 1, day));
	const dayOfWeek = d.getUTCDay();
	return dayOfWeek === 0 ? 7 : dayOfWeek;
}

/**
 * Adds or subtracts N days from a base date, returning the resulting ISO date string.
 *
 * @param year - Base year
 * @param month - Base month (1..12)
 * @param day - Base day (1..31)
 * @param daysOffset - Positive or negative number of days to offset
 * @returns The resulting ISO date string
 */
export function offsetDate(year: number, month: number, day: number, daysOffset: number): string {
	const d = new Date(Date.UTC(year, month - 1, day + daysOffset));
	return formatDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Calculates Easter Sunday for a given year using the Anonymous Gregorian Meeus algorithm.
 *
 * @param year - Calendar year (1583 to 4099)
 * @returns Object with year, month (1..12), and day
 */
export function getEasterSunday(year: number): { year: number; month: number; day: number; dateStr: string } {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;

	return { year, month, day, dateStr: formatDate(year, month, day) };
}

/** Returns ISO date string for Good Friday (Easter - 2 days). */
export function getGoodFriday(year: number): string {
	const { month, day } = getEasterSunday(year);
	return offsetDate(year, month, day, -2);
}

/** Returns ISO date string for Easter Saturday (Easter - 1 day). */
export function getEasterSaturday(year: number): string {
	const { month, day } = getEasterSunday(year);
	return offsetDate(year, month, day, -1);
}

/** Returns ISO date string for Easter Monday (Easter + 1 day). */
export function getEasterMonday(year: number): string {
	const { month, day } = getEasterSunday(year);
	return offsetDate(year, month, day, 1);
}

/** Returns ISO date string for Ascension Day (Easter + 39 days). */
export function getAscensionDay(year: number): string {
	const { month, day } = getEasterSunday(year);
	return offsetDate(year, month, day, 39);
}

/** Returns ISO date string for Whit Sunday / Pentecost (Easter + 49 days). */
export function getPentecost(year: number): string {
	const { month, day } = getEasterSunday(year);
	return offsetDate(year, month, day, 49);
}

/** Returns ISO date string for Whit Monday / Pentecost Monday (Easter + 50 days). */
export function getWhitMonday(year: number): string {
	const { month, day } = getEasterSunday(year);
	return offsetDate(year, month, day, 50);
}

/** Returns ISO date string for Corpus Christi (Easter + 60 days). */
export function getCorpusChristi(year: number): string {
	const { month, day } = getEasterSunday(year);
	return offsetDate(year, month, day, 60);
}

/**
 * Calculates the date of the Nth occurrence of a specific weekday in a given month.
 *
 * @param year - 4-digit calendar year
 * @param month - 1-based month (1 = Jan .. 12 = Dec)
 * @param weekday - ISO weekday (1 = Monday .. 7 = Sunday)
 * @param n - Occurrence: 1 (first), 2 (second), 3 (third), 4 (fourth), or -1 (last)
 * @returns ISO date string
 */
export function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): string {
	if (n === -1) {
		// Find last day of month
		const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
		for (let d = lastDayOfMonth; d >= 1; d--) {
			if (getIsoDayOfWeek(year, month, d) === weekday) {
				return formatDate(year, month, d);
			}
		}
		throw new Error(`Unable to find last weekday ${weekday} in ${year}-${month}`);
	}

	let count = 0;
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
	for (let d = 1; d <= daysInMonth; d++) {
		if (getIsoDayOfWeek(year, month, d) === weekday) {
			count++;
			if (count === n) {
				return formatDate(year, month, d);
			}
		}
	}
	throw new Error(`Unable to find ${n}th weekday ${weekday} in ${year}-${month}`);
}

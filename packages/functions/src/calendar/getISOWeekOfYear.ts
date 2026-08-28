import type { Tempo } from '@magmacomputing/tempo';
import type { Temporal } from '../support/index.js';
import { isTempo, isTemporal } from '../support/index.js';

/**
 * Computes the ISO 8601 week number and week-numbering year for a given date.
 * ISO week 1 is the week containing the year's first Thursday.
 *
 * @param zdt - The date to calculate the ISO week for (Tempo or Temporal date type)
 * @returns An object containing `weekOfYear` and `yearOfWeek`
 * @throws {TypeError} If the input is not a valid Tempo or Temporal object
 * @example
 * ```ts
 * const result = getISOWeekOfYear(Temporal.PlainDate.from('2024-01-01'));
 * // { weekOfYear: 1, yearOfWeek: 2024 }
 * ```
 */
export function getISOWeekOfYear(zdt: Tempo | Temporal.ZonedDateTime | Temporal.PlainDateTime | Temporal.PlainDate) {
	if (!isTempo(zdt) && !isTemporal(zdt))
		throw new TypeError("getISOWeekOfYear requires a Tempo or Temporal object.");

	const pd = (isTempo(zdt) || 'toPlainDate' in zdt ? zdt.toPlainDate() : (zdt as Temporal.PlainDate)).withCalendar('iso8601');

	// ISO 8601 week 1 is the week with the year's first Thursday in it.
	const targetThursday = pd.subtract({ days: pd.dayOfWeek - 4 });
	const targetYear = targetThursday.year;

	// January 4th is always in week 1.
	const firstThursday = targetThursday.with({ month: 1, day: 4 });
	const week1Thursday = firstThursday.subtract({ days: firstThursday.dayOfWeek - 4 });

	// Compute days between target Thursday and week 1 Thursday
	const daysBetween = targetThursday.since(week1Thursday).total('days');
	const weekOfYear = Math.floor(daysBetween / 7) + 1;

	return { weekOfYear, yearOfWeek: targetYear };
}

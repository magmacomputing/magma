import { Temporal } from '@js-temporal/polyfill';

/** compute the ISO week number and ISO week-numbering year for a given ZonedDateTime */
export function getISOWeekOfYear(zdt: Temporal.ZonedDateTime | Temporal.PlainDate) {
	// ISO 8601 week 1 is the week with the year's first Thursday in it.
	const targetThursday = zdt.subtract({ days: zdt.dayOfWeek - 4 });
	const targetYear = targetThursday.year;

	// January 4th is always in week 1.
	const firstThursday = Temporal.PlainDate.from({ year: targetYear, month: 1, day: 4 });
	const week1Thursday = firstThursday.subtract({ days: firstThursday.dayOfWeek - 4 });

	// Compute days between target Thursday and week 1 Thursday
	const daysBetween = targetThursday.since(week1Thursday).total({ unit: 'days' });
	const weekOfYear = Math.floor(daysBetween / 7) + 1;

	return { weekOfYear, yearOfWeek: targetYear };
}

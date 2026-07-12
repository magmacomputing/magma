/** Computes the ISO week number and ISO week-numbering year for a given date. */
export function getISOWeekOfYear(zdt: any) {
	const pd = (zdt.toPlainDate ? zdt.toPlainDate() : zdt).withCalendar('iso8601');

	// ISO 8601 week 1 is the week with the year's first Thursday in it.
	const targetThursday = pd.subtract({ days: pd.dayOfWeek - 4 });
	const targetYear = targetThursday.year;

	// January 4th is always in week 1.
	const firstThursday = targetThursday.with({ month: 1, day: 4 });
	const week1Thursday = firstThursday.subtract({ days: firstThursday.dayOfWeek - 4 });

	// Compute days between target Thursday and week 1 Thursday
	const daysBetween = targetThursday.since(week1Thursday).total({ unit: 'days' });
	const weekOfYear = Math.floor(daysBetween / 7) + 1;

	return { weekOfYear, yearOfWeek: targetYear };
}

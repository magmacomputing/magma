import { Temporal } from '@js-temporal/polyfill';

/** return the January and July offsets (nanoseconds) for a given timezone and year */
export function getOffsets(timeZone: string, year = 2024) {	//** use a fixed reference-year (2024) for stability */
	const jan = Temporal.PlainDate.from({ year, month: 1, day: 1 }).toZonedDateTime(timeZone).offsetNanoseconds;
	const jul = Temporal.PlainDate.from({ year, month: 7, day: 1 }).toZonedDateTime(timeZone).offsetNanoseconds;

	return { jan, jul };
}

import { Temporal } from '@js-temporal/polyfill';
import { getOffsets } from './getOffsets.js';

/** return whether the given (or current) date is in Daylight Savings */
export function isDST(date?: Temporal.ZonedDateTime | string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	const zdt = typeof date === 'string'
		? Temporal.ZonedDateTime.from(date)
		: (date ?? Temporal.Now.zonedDateTimeISO(timeZone));
	const { jan, jul } = getOffsets(zdt.timeZoneId, zdt.year);

	return zdt.offsetNanoseconds !== Math.min(jan, jul);
}

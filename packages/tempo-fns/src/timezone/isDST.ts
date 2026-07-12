import { Temporal } from '@js-temporal/polyfill';
import { getOffsets } from './getOffsets.js';

/** Determines whether the given date is in Daylight Savings Time (DST). */
export function isDST(date?: Temporal.ZonedDateTime | string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	let zdt: Temporal.ZonedDateTime;

	if (typeof date === 'string') {
		try {
			zdt = Temporal.Instant.from(date).toZonedDateTimeISO(timeZone);
		} catch {
			zdt = Temporal.PlainDate.from(date).toZonedDateTime(timeZone);
		}
	} else {
		zdt = date ?? Temporal.Now.zonedDateTimeISO(timeZone);
	}
	const { jan, jul } = getOffsets(zdt.timeZoneId, zdt.year);

	return zdt.offsetNanoseconds !== Math.min(jan, jul);
}

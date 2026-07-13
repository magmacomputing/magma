import { getOffsets } from './getOffsets.js';
import { getTemporal, type Temporal } from '../support/index.js';

/** Determines whether the given date is in Daylight Savings Time (DST). */
export function isDST(date?: Temporal.ZonedDateTime | string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	let zdt: Temporal.ZonedDateTime;
	const TemporalAPI = getTemporal();

	if (typeof date === 'string') {
		try {
			zdt = TemporalAPI.Instant.from(date).toZonedDateTimeISO(timeZone);
		} catch {
			zdt = TemporalAPI.PlainDate.from(date).toZonedDateTime(timeZone);
		}
	} else {
		zdt = date ?? TemporalAPI.Now.zonedDateTimeISO(timeZone);
	}
	const { jan, jul } = getOffsets(zdt.timeZoneId, zdt.year);

	return zdt.offsetNanoseconds !== Math.min(jan, jul);
}

import { getOffsets } from './getOffsets.js';
import { getTemporal, type Temporal } from '../support/index.js';

/**
 * Determines whether the given date is in Daylight Saving Time (DST).
 * Compares the date's offset against the minimum offset for the timezone and year.
 *
 * @param date - The date to check (ZonedDateTime or ISO string, defaults to current time)
 * @param timeZone - The IANA timezone identifier (defaults to system timezone)
 * @returns `true` if the date is in DST, `false` otherwise
 * @example
 * ```ts
 * const inDST = isDST('2024-07-01', 'America/New_York'); // true (summer)
 * const inDST = isDST('2024-01-01', 'America/New_York'); // false (winter)
 * ```
 */
export function isDST(date?: Temporal.ZonedDateTime | string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) {
	let zdt: Temporal.ZonedDateTime;
	const TemporalAPI = getTemporal();

	if (typeof date === 'string') {
		try {
			zdt = TemporalAPI.Instant.from(date).toZonedDateTimeISO(timeZone);
		} catch {
			try {
				zdt = TemporalAPI.PlainDateTime.from(date).toZonedDateTime(timeZone);
			} catch {
				zdt = TemporalAPI.PlainDate.from(date).toZonedDateTime(timeZone);
			}
		}
	} else {
		zdt = date ?? TemporalAPI.Now.zonedDateTimeISO(timeZone);
	}
	const { jan, jul } = getOffsets(zdt.timeZoneId, zdt.year);

	return zdt.offsetNanoseconds !== Math.min(jan, jul);
}

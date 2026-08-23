import type { Tempo } from '@magmacomputing/tempo';
import { getTemporal, isTempo, isZonedDateTime } from '../support/index.js';
import {
	parseCron,
	isCronString,
	getNextCronEpoch,
	getPrevCronEpoch,
	type CronField,
	type CronSchedule
} from '#library/cron.library.js';

export type { CronField, CronSchedule };
export { parseCron, isCronString };

/**
 * Returns the next occurrence of a Cron pattern as a new Tempo instance or Temporal.ZonedDateTime.
 */
export function nextCron<T extends Tempo | any>(input: T, pattern: string): T {
	const Temporal = getTemporal();
	if (isTempo(input)) {
		const nextMs = getNextCronEpoch(pattern, input.epoch.ms, input.tz);
		return input.set(nextMs) as T;
	}

	const anchorZdt = isZonedDateTime(input)
		? (input as any).toZonedDateTimeISO('UTC')
		: Temporal.Instant.fromEpochMilliseconds(typeof input === 'number' ? input : Date.now()).toZonedDateTimeISO('UTC');

	const nextMs = getNextCronEpoch(pattern, anchorZdt.epochMilliseconds, anchorZdt.timeZoneId);
	return Temporal.Instant.fromEpochMilliseconds(nextMs).toZonedDateTimeISO(anchorZdt.timeZoneId) as T;
}

/**
 * Returns the previous occurrence of a Cron pattern as a new Tempo instance or Temporal.ZonedDateTime.
 */
export function prevCron<T extends Tempo | any>(input: T, pattern: string): T {
	const Temporal = getTemporal();
	if (isTempo(input)) {
		const prevMs = getPrevCronEpoch(pattern, input.epoch.ms, input.tz);
		return input.set(prevMs) as T;
	}

	const anchorZdt = isZonedDateTime(input)
		? (input as any).toZonedDateTimeISO('UTC')
		: Temporal.Instant.fromEpochMilliseconds(typeof input === 'number' ? input : Date.now()).toZonedDateTimeISO('UTC');

	const prevMs = getPrevCronEpoch(pattern, anchorZdt.epochMilliseconds, anchorZdt.timeZoneId);
	return Temporal.Instant.fromEpochMilliseconds(prevMs).toZonedDateTimeISO(anchorZdt.timeZoneId) as T;
}


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
export function nextCron<T extends Tempo>(input: T, pattern: string): T;
export function nextCron(input: number, pattern: string): number;
export function nextCron(input: Temporal.ZonedDateTime, pattern: string): Temporal.ZonedDateTime;
export function nextCron(input: any, pattern: string): any {
	const Temporal = getTemporal();
	if (isTempo(input)) {
		const nextMs = getNextCronEpoch(pattern, input.epoch.ms, input.tz);
		return input.set(nextMs);
	}

	if (typeof input === 'number')
		return getNextCronEpoch(pattern, input, 'UTC');

	if (isZonedDateTime(input)) {
		const nextMs = getNextCronEpoch(pattern, input.epochMilliseconds, input.timeZoneId);
		return Temporal.Instant.fromEpochMilliseconds(nextMs).toZonedDateTimeISO(input.timeZoneId);
	}

	throw new TypeError('nextCron: Input must be a Tempo instance, number (epoch ms), or Temporal.ZonedDateTime');
}

/**
 * Returns the previous occurrence of a Cron pattern as a new Tempo instance, number, or Temporal.ZonedDateTime.
 */
export function prevCron<T extends Tempo>(input: T, pattern: string): T;
export function prevCron(input: number, pattern: string): number;
export function prevCron(input: Temporal.ZonedDateTime, pattern: string): Temporal.ZonedDateTime;
export function prevCron(input: any, pattern: string): any {
	const Temporal = getTemporal();
	if (isTempo(input)) {
		const prevMs = getPrevCronEpoch(pattern, input.epoch.ms, input.tz);
		return input.set(prevMs);
	}

	if (typeof input === 'number')
		return getPrevCronEpoch(pattern, input, 'UTC');

	if (isZonedDateTime(input)) {
		const prevMs = getPrevCronEpoch(pattern, input.epochMilliseconds, input.timeZoneId);
		return Temporal.Instant.fromEpochMilliseconds(prevMs).toZonedDateTimeISO(input.timeZoneId);
	}

	throw new TypeError('prevCron: Input must be a Tempo instance, number (epoch ms), or Temporal.ZonedDateTime');
}


import { isCronString, getNextCronEpoch } from './cron.library.js';
import { isRRuleString, getNextRRuleEpoch } from './rrule.library.js';

/**
 * Sniffs whether a given value is a valid schedule string (either Cron or RRULE).
 *
 * @param val - The candidate value to inspect
 * @returns `true` if the value is a valid Cron pattern or RRULE string, otherwise `false`.
 */
export function isScheduleString(val: unknown): val is string {
	return isCronString(val) || isRRuleString(val);
}

/**
 * Polymorphically computes the next occurrence epoch timestamp (in milliseconds)
 * for a schedule expression (Cron pattern or RRULE string).
 *
 * @remarks RRULE strings are evaluated in UTC because getNextRRuleEpoch does not accept a timeZone, while timeZone is applied only to Cron patterns.
 *
 * @param pattern - The schedule pattern (5-field Cron or RFC 5545 RRULE)
 * @param anchorMs - The starting anchor timestamp in epoch milliseconds
 * @param timeZone - The IANA time zone identifier for Cron patterns (defaults to UTC)
 * @returns Next epoch timestamp in milliseconds, or `null` if no future occurrences exist
 */
export function getNextScheduleEpoch(
	pattern: string,
	anchorMs: number,
	timeZone = 'UTC'
): number | null {
	if (isRRuleString(pattern))
		return getNextRRuleEpoch(pattern, anchorMs);

	if (isCronString(pattern)) {
		try {
			return getNextCronEpoch(pattern, anchorMs, timeZone);
		} catch {
			return null;
		}
	}

	return null;
}

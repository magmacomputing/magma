import { Tempo } from '../../tempo.class.js';
import { getNextRRuleEpoch, isRRuleString, isString } from '#library';

declare module '../../tempo.class.js' {
	interface Tempo {
		/**
		 * Computes the next occurrence of a recurrence rule (RRULE string) after this instant.
		 * 
		 * @param rrule - The RFC 5545 RRULE string or object with an rrule property
		 * @returns A new Tempo instance at the next occurrence
		 */
		nextOccurrence(rrule: string | { rrule: string }): Tempo;
	}
}

Tempo.prototype.nextOccurrence = function (this: Tempo, rrule: string | { rrule: string }): Tempo {
	const rruleStr = isString(rrule) ? rrule : rrule.rrule;
	const nextMs = getNextRRuleEpoch(rruleStr, this.epoch.ms);
	const epochMs = Temporal.Instant.fromEpochMilliseconds(nextMs);

	return new (this.constructor as typeof Tempo)(epochMs, this.config);
}

export { isRRuleString, getNextRRuleEpoch };

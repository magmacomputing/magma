import type { Tempo } from '@magmacomputing/tempo';

export interface TempoRecurrenceRule {
  rrule: string;
  next(count?: number): Tempo[];
}

/**
 * ## recurrenceAI (Upcoming Export)
 * Translates natural language descriptions of complex repeating schedules into 
 * structured RRULE strings and `Tempo` date generators.
 * 
 * ### Why it fits Tempo:
 * RRULE strings are notoriously complex to craft manually. `recurrenceAI` turns plain text 
 * into deterministic `Tempo` date sequences.
 * 
 * ### Example Usage:
 * ```ts
 * const rule = await recurrenceAI('every 2nd and 4th Thursday of the month except company holidays', {
 *   timeZone: 'Europe/London'
 * });
 * const nextDates = rule.next(5); // Returns array of 5 upcoming Tempo instances
 * ```
 */
export async function recurrenceAI(_prompt: string, _options?: Record<string, any>): Promise<TempoRecurrenceRule> {
  throw new Error('recurrenceAI is not yet implemented in tempo-plugin-ai.');
}

import type { Tempo } from '@magmacomputing/tempo';

export interface TempoAiDiffResult {
  formatted: string;
  days?: number;
  hours?: number;
  businessDays?: number;
  reasoning?: string;
}

/**
 * @internal Draft implementation scaffolded for v0.3.0 roadmap.
 * ## diffAI (Upcoming Export)
 * Expresses the delta between two timestamps or `Tempo` instances in human, business, 
 * or operational terms.
 * 
 * ### Why it fits Tempo:
 * Fills the gap between raw numeric milliseconds/days calculations in `Tempo.diff()` 
 * and domain-specific human summaries (accounting, shipping SLAs, project planning).
 * 
 * ### Example Usage:
 * ```ts
 * const start = new Tempo('2026-08-01T09:00:00');
 * const end = new Tempo('2026-08-10T17:00:00');
 * 
 * const diff = await diffAI(start, end, 'explain in terms of business working days excluding weekends');
 * // returns: { formatted: "6 business days (48 working hours)", businessDays: 6 }
 * ```
 */
export async function diffAI(_start: any, _end: any, _prompt?: string, _options?: Record<string, any>): Promise<TempoAiDiffResult> {
  throw new Error('diffAI is not yet implemented in tempo-plugin-ai.');
}

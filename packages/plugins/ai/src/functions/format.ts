import type { Tempo } from '@magmacomputing/tempo';

/**
 * ## formatAI (Upcoming Export)
 * Formats a `Tempo` instance into human-friendly, contextual narrative text 
 * tailored to specific UI tones, relative time frames, or business domains.
 * 
 * ### Why it fits Tempo:
 * Expands core `.format('{yyyy}-{mm}-{dd}')` into contextual, localized human 
 * descriptions that token patterns alone cannot capture.
 * 
 * ### Example Usage:
 * ```ts
 * const t = new Tempo('2026-08-07T17:00:00[America/New_York]');
 * 
 * // "this Friday at 5:00 PM EST (in 5 days)"
 * const friendly = await formatAI(t, 'friendly reminder tone with relative countdown');
 * ```
 */
export async function formatAI(_tempo: Tempo, _prompt: string, _options?: Record<string, any>): Promise<string> {
  throw new Error('formatAI is not yet implemented in tempo-plugin-ai.');
}

export interface TempoContext {
  timeZone: string;
  locale: string;
  calendar: string;
  confidence?: number;
}

/**
 * @internal Draft implementation scaffolded for v0.3.0 roadmap.
 * ## contextAI (Upcoming Export)
 * Infers `timeZone`, `locale`, and preferred `calendar` system from ambiguous location strings, 
 * user bios, or context descriptions.
 * 
 * ### Why it fits Tempo:
 * Integrates directly into Tempo's core configuration parameters (`timeZone`, `locale`, `calendar`).
 * 
 * ### Example Usage:
 * ```ts
 * const context = await contextAI('We are meeting near Shibuya Station during Golden Week');
 * // returns: { timeZone: 'Asia/Tokyo', locale: 'ja-JP', calendar: 'gregory' }
 * ```
 */
export async function contextAI(_text: string, _options?: Record<string, any>): Promise<TempoContext> {
  throw new Error('contextAI is not yet implemented in tempo-plugin-ai.');
}

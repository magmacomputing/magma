import type { Tempo } from '@magmacomputing/tempo';

export interface TempoEvent {
  label: string;
  start: Tempo;
  end?: Tempo | undefined;
  type?: 'event' | 'deadline' | 'milestone' | 'reminder' | string;
}

/**
 * @internal Draft implementation scaffolded for v0.3.0 roadmap.
 * ## extractAI (Upcoming Export)
 * Scans unstructured text (emails, transcripts, task notes) and extracts all 
 * embedded temporal entities, deadlines, and events into structured `TempoEvent` records.
 * 
 * ### Why it fits Tempo:
 * Essential for calendar apps and document processing workflows where temporal references 
 * are buried inside unstructured text.
 * 
 * ### Example Usage:
 * ```ts
 * const text = "Let's meet tomorrow at 10am. Final deliverables due next Friday EOD.";
 * const events = await extractAI(text, { anchor: new Tempo() });
 * // returns array of TempoEvent records with parsed Tempo instances
 * ```
 */
export async function extractAI(_text: string, _options?: Record<string, any>): Promise<TempoEvent[]> {
  throw new Error('extractAI is not yet implemented in tempo-plugin-ai.');
}

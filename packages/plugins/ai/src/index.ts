// Core Infrastructure & Configuration
export { TempoAiError } from './core/error.js';
export * from './core/types.js';
export * from './core/config.js';
export { loadRemoteManifest, resetManifestCache, DEFAULT_REMOTE_MANIFEST_URL } from './core/manifest.js';
export { initAI, clearAiCache, getAiRateLimits } from './core/init.js';

// AI Function Handlers
export { parseAI } from './functions/parse.js';

/*
 * ============================================================================
 * Upcoming AI Function Exports (Scaffolded for Future Releases)
 * ============================================================================
 * The following exports lay the groundwork for expanding tempo-plugin-ai.
 * Uncomment these exports as their implementations are finalized.
 */

// /** Formats a Tempo instance into human-friendly, contextual narrative text */
// export { formatAI } from './functions/format.js';

// /** Scans unstructured text and extracts embedded temporal entities & events */
// export { extractAI, type TempoEvent } from './functions/extract.js';

// /** Expresses the delta between two dates in human, business, or operational terms */
// export { diffAI, type TempoAiDiffResult } from './functions/diff.js';

// /** Resolves natural language scheduling prompts into optimal Tempo intervals */
// export { scheduleAI, type TempoInterval } from './functions/schedule.js';

// /** Translates natural language descriptions of repeating schedules into RRULEs */
// export { recurrenceAI, type TempoRecurrenceRule } from './functions/recurrence.js';

// /** Infers timeZone, locale, and calendar from ambiguous location or text strings */
// export { contextAI, inferContextAI, type TempoContext } from './functions/context.js';

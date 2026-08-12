// Core Infrastructure & Configuration
export { TempoAiError } from './core/error.js';
export * from './types/index.js';
export * from './core/config.js';

// AI Manifest Support
export { loadRemoteManifest, resetManifestCache, DEFAULT_REMOTE_MANIFEST_URL } from './core/manifest.js';

// AI Core Functions
export { initAI, resetAI, clearAiCache, getAiRateLimits, getAiProviderRateLimits, getAiConfig } from './core/init.js';

// AI Function Handlers
export { parseAI } from './functions/parse.js';
export { recurrenceAI } from './functions/recurrence.js';
export { scheduleAI } from './functions/schedule.js';
export { contextAI } from './functions/context.js';
export { diffAI } from './functions/diff.js';

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

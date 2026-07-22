/**
 * Term Plugin API
 * 
 * Exports the framework utilities and types required for authoring custom Term plugins.
 * This barrel is utilized by external developers building natural-language components.
 */
export { defineTerm, defineRange, getTermRange, resolveCycleWindow } from './term.util.js';
export type { TermPlugin, Range, ResolvedRange } from './term.type.js';

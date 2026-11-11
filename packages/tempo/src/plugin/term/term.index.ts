/**
 * Term Plugin API
 * 
 * Exports the framework utilities and types required for authoring custom Term plugins.
 * This barrel is utilized by external developers building natural-language components.
 */
export { defineTerm, defineRange, defineSpan, findTermPlugin, getTermRange, resolveCycleWindow, resolveRangeOrdinal, resolveRangeDiff, resolveRangeFormat, resolveTermSphere } from './term.util.js';
export { TermHook } from '#tempo/support';
export type { TermPlugin, Range, ResolvedRange, TermSpan, TermHookSymbol, TermLifecycleHooks, TermParseContext } from './term.type.js';

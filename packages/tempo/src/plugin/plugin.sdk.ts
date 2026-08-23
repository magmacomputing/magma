/**
 * Tempo Plugin SDK Facade (Superbarrel)
 * 
 * This file serves as the single, unified public endpoint for external plugins and extensions.
 * It consolidates all necessary granular internal utilities (core, library, terms, etc.)
 * into one importable path (`@magmacomputing/tempo/plugin/sdk`).
 * 
 * ARCHITECTURE NOTE:
 * By providing a single endpoint, we drastically simplify the `importmap` requirements
 * for end-users operating natively in the browser via Static CDNs. The compiled output
 * of this file relies entirely on relative paths, which the browser can traverse natively.
 */
export * from '../core.index.js';
export * from '../library.index.js';
export * from './plugin.index.js';
export * from '../support/support.enum.js';
export * from './term/term.index.js';

export { defineTerm, defineRange, getTermRange, resolveCycleWindow } from './term/term.index.js';
export { logError, logWarn, logDebug } from '../support/support.util.js';

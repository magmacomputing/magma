/**
 * Centralized registry for all Tempo-specific Global Symbols.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 * Tempo-specific symbols are kept here (rather than @magmacomputing/library) to maintain
 * clean separation of concerns.
 */

import type { Tempo } from '#tempo/tempo.class.js';

const $Tempo = Symbol.for('$Tempo');
const $Plugins = Symbol.for('$TempoPlugin');
const $Register = Symbol.for('$TempoRegister');
const $isTempo = Symbol.for('$isTempo');

const $Interpreter = Symbol.for('$TempoInterpreter');
const $logError = Symbol.for('$TempoLogError');
const $logDebug = Symbol.for('$TempoLogDebug');

const $termError = Symbol.for('$TempoTermError');
const $errored = Symbol.for('$TempoErrored');
const $Internal = Symbol.for('$TempoInternal');
const $mutateDepth = Symbol.for('$TempoMutateDepth');
const $rebuildGuard = Symbol.for('$TempoRebuildGuard');
export const $reset = Symbol.for('$TempoReset');

/**
 * Define a reactive registration hook on a global symbol.
 * Allows Tempo to listen for side-effect plugin registrations
 * from plugins loaded later in the lifecycle.
 * @returns any previous callback already registered for this symbol
 */
export function registerHook(sym: symbol, cb: (val: any) => void) {
    const existing = (globalThis as any)[sym];

    if (existing !== undefined && typeof existing === 'function')
        console.warn(`Overwriting existing hook for symbol: ${sym.description}`);

    (globalThis as any)[sym] = cb;
    return existing; // allow chaining or cleanup
}

/** check valid Tempo */
export const isTempo = (tempo?: any): tempo is Tempo => tempo?.[$isTempo] === true;

/** global symbols */
const _sym = {
    /** key for Global Discovery of Tempo configuration */  $Tempo,
    /** key for Global Discovery of Tempo Plugins */        $Plugins,
    /** key for Reactive Plugin Registration */             $Register,
    /** key for Global Identity Brand for Tempo */          $isTempo,
    /** key for Internal Interpreter Service */             $Interpreter,
    /** key for contextual Error Logging */                 $logError,
    /** key for contextual Debug Logging */                 $logDebug,
    /** key for centralized Term Error dispatching */       $termError,
    /** internal key for signaling pre-errored state in constructor */ $errored,
    /** internal key for accessing private instance state */ $Internal,
    /** internal key for tracking mutation recursion depth */ $mutateDepth,
    /** internal key for re-validating the Master Guard */  $rebuildGuard,
    /** internal key for decentralized registry resets */   $reset,
} as const;

export default _sym;

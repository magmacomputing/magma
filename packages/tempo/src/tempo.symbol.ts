import type { Tempo } from './tempo.class.js';

/**
 * Centralized registry for all Tempo-specific Global Symbols.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 * Tempo-specific symbols are kept here (rather than @magmacomputing/library) to maintain
 * clean separation of concerns.
 */

/** @internal Tempo Symbol Registry */
export const sym = {
    /** key for Global Discovery of Tempo configuration */  $Tempo: Symbol.for('$Tempo'),
    /** key for Global Discovery of Tempo Plugins */        $Plugins: Symbol.for('$TempoPlugin'),
    /** key for Reactive Plugin Registration */             $Register: Symbol.for('$TempoRegister'),
    /** key for Global Identity Brand for Tempo */          $isTempo: Symbol.for('$isTempo'),
    /** key for Internal Interpreter Service */             $Interpreter: Symbol.for('$TempoInterpreter'),
    /** key for contextual Error Logging */                 $logError: Symbol.for('$TempoLogError'),
    /** key for contextual Debug Logging */                 $logDebug: Symbol.for('$TempoLogDebug'),
    /** key for centralized Term Error dispatching */       $termError: Symbol.for('$TempoTermError'),
    /** key for contextual Debugger */                      $dbg: Symbol.for('$TempoDbg'),
    /** key for Master Guard */                             $guard: Symbol.for('$TempoGuard'),
    /** internal key for signaling pre-errored state in constructor */ $errored: Symbol.for('$TempoErrored'),
    /** internal key for accessing private instance state */ $Internal: Symbol.for('$TempoInternal'),
    /** internal key for tracking mutation recursion depth */ $mutateDepth: Symbol.for('$TempoMutateDepth'),
    /** internal key for tracking parser recursion depth */   $parseDepth: Symbol.for('$TempoParseDepth'),
    /** internal key for tracking discovered matches during parsing */ $matches: Symbol.for('$TempoMatches'),
    /** internal key for instance-level anchor baseline */    $anchor: Symbol.for('$TempoAnchor'),
    /** internal key for the underlying Temporal ZonedDateTime */ $zdt: Symbol.for('$TempoZDT'),
    /** internal key for re-validating the Master Guard */  $rebuildGuard: Symbol.for('$TempoRebuildGuard'),
    /** internal key for decentralized registry resets */   $reset: Symbol.for('$TempoReset'),
    /** internal key for tracking installed plugins */      $installed: Symbol.for('$TempoInstalled'),
    /** internal key for tracking registered terms */       $terms: Symbol.for('$TempoTerms'),
    /** internal key for tracking registered extensions */  $extends: Symbol.for('$TempoExtends'),
    /** internal key for tracking registered modules */     $modules: Symbol.for('$TempoModules'),
} as const;

/**
 * Define a reactive registration hook on a global symbol.
 */
export function registerHook(symbol: symbol, cb: (val: any) => void) {
    const existing = (globalThis as any)[symbol];

    if (existing !== undefined && typeof existing === 'function')
        console.warn(`Overwriting existing hook for symbol: ${symbol.description}`);
    (globalThis as any)[symbol] = cb;
    return existing; // allow chaining or cleanup
}

/** check valid Tempo instance */
export const isTempo = (tempo?: any): tempo is Tempo => tempo?.[sym.$isTempo] === true;

export default sym;

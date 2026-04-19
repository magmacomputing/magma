import type { Tempo } from './tempo.class.js';
import { getRuntime } from './tempo.runtime.js';

/**
 * Centralized registry for all Tempo-specific Global Symbols.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 * Tempo-specific symbols are kept here (rather than @magmacomputing/library) to maintain
 * clean separation of concerns.
 */

/** @internal Tempo Symbol Registry */
const sym = {
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
    // /** @deprecated use getRuntime().resetHooks — kept for backward compatibility */
    // $reset: Symbol.for('$TempoReset'),
    // /** @deprecated use getRuntime().installed — kept for backward compatibility */
    // $installed: Symbol.for('$TempoInstalled'),
    // /** @deprecated use getRuntime().terms — kept for backward compatibility */
    // $terms: Symbol.for('$TempoTerms'),
    // /** @deprecated use getRuntime().extensions — kept for backward compatibility */
    // $extends: Symbol.for('$TempoExtends'),
    // /** @deprecated use getRuntime().modules — kept for backward compatibility */
    // $modules: Symbol.for('$TempoModules'),
} as const;

/**
 * Install a reactive registration hook.
 *
 * When `symbol` is `sym.$Register` the hook is stored inside the TempoRuntime
 * (not directly on `globalThis`) so it benefits from the runtime's hardened,
 * single-slot global bridge.  For any other symbol the hook is written to
 * `globalThis` using the same legacy behaviour.
 */
export function registerHook(symbol: symbol, cb: (val: any) => void) {
    if (symbol === sym.$Register)
        return getRuntime().setRegisterHook(cb);

    const existing = (globalThis as any)[symbol];
    if (existing !== undefined && typeof existing === 'function')
        console.warn(`Overwriting existing hook for symbol: ${symbol.description}`);
    (globalThis as any)[symbol] = cb;
    return existing; // allow chaining or cleanup
}

/** check valid Tempo instance */
export const isTempo = (tempo?: any): tempo is Tempo => tempo?.[sym.$isTempo] === true;

export default sym;

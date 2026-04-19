import type { Tempo } from '../tempo.class.js';

/**
 * Centralized registry for all Tempo-specific Global Symbols.
 * These symbols utilize Symbol.for() to ensure consistency across module boundaries.
 * Tempo-specific symbols are kept here (rather than @magmacomputing/library) to maintain
 * clean separation of concerns.
 */

/** @internal Tempo Symbol Registry */
const sym = {
    /** key for Global Discovery of Tempo configuration */  $Tempo: Symbol.for('$Tempo'),
    /** key for Reactive Plugin Registration */             $Register: Symbol.for('$TempoRegister'),
    /** key for Global Identity Brand for Tempo */          $isTempo: Symbol.for('$isTempo'),
    /** key for Internal Interpreter Service */             $Interpreter: Symbol.for('$TempoInterpreter'),
    /** key for contextual Error Logging */                 $logError: Symbol.for('$TempoLogError'),
    /** key for contextual Debug Logging */                 $logDebug: Symbol.for('$TempoLogDebug'),
    /** key for centralized Term Error dispatching */       $termError: Symbol.for('$TempoTermError'),
    /** key for contextual Debugger */                      $dbg: Symbol.for('$TempoDbg'),
    /** key for Master Guard */                             $guard: Symbol.for('$TempoGuard'),
    /** internal key for signaling pre-errored state */     $errored: Symbol.for('$TempoErrored'),
    /** internal key for accessing private instance state */$Internal: Symbol.for('$TempoInternal'),
    /** hardened globalThis bridge key for the TempoRuntime */$Bridge: Symbol.for('magmacomputing/tempo/runtime'),
} as const;

/** check valid Tempo instance */
export const isTempo = (tempo?: any): tempo is Tempo => tempo?.[sym.$isTempo] === true;

export default sym;

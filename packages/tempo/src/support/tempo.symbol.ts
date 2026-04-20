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
    /** key for Reactive Plugin Registration */             $Register: Symbol.for('magmacomputing/tempo/register'),
    /** key for Global Identity Brand for Tempo */          $isTempo: Symbol.for('magmacomputing/tempo/isTempo'),
    /** key for Internal Interpreter Service */             $Interpreter: Symbol.for('magmacomputing/tempo/interpreter'),
    /** key for contextual Error Logging */                 $logError: Symbol.for('magmacomputing/tempo/logError'),
    /** key for contextual Debug Logging */                 $logDebug: Symbol.for('magmacomputing/tempo/logDebug'),
    /** key for centralized Term Error dispatching */       $termError: Symbol.for('magmacomputing/tempo/termError'),
    /** key for contextual Debugger */                      $dbg: Symbol.for('magmacomputing/tempo/dbg'),
    /** key for Master Guard */                             $guard: Symbol.for('magmacomputing/tempo/guard'),
    /** internal key for signaling pre-errored state */     $errored: Symbol.for('magmacomputing/tempo/errored'),
    /** internal key for accessing private instance state */$Internal: Symbol.for('magmacomputing/tempo/internal'),
    /** hardened globalThis bridge key for the TempoRuntime */$Bridge: Symbol.for('magmacomputing/tempo/runtime'),
    /** cross-bundle brand check for TempoRuntime */        $RuntimeBrand: Symbol.for('magmacomputing/tempo/runtime/brand'),
    /** branding for explicit PropertyDescriptors */        $Descriptor: Symbol.for('magmacomputing/tempo/descriptor'),
} as const;

/** check valid Tempo instance */
export const isTempo = (tempo?: any): tempo is Tempo => tempo?.[sym.$isTempo] === true;

export default sym;

/**
 * **Internal Type Stub**
 * 
 * This hand-written declaration file acts as a shim to cleanly break a circular dependency
 * between the `tempo` core engine and the `.std` workspace during TypeScript compilation.
 * 
 * When `tsc` builds the core engine, `#tempo/std` resolves here.
 * When `Rollup` bundles the final package, `#tempo/std` resolves to the actual compiled `.std/dist/index.js`.
 */
import type { TermPlugin } from './term.type.js';

export const StandardTerms: readonly TermPlugin[];

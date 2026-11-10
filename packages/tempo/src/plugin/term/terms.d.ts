/**
 * **Internal Type Stub**
 * 
 * This hand-written declaration file acts as a shim to cleanly break a circular dependency
 * between the `tempo` core engine and the `.terms` workspace during TypeScript compilation.
 * 
 * When `tsc` builds the core engine, `#tempo/terms` resolves here.
 * When `Rollup` bundles the final package, `#tempo/terms` resolves to the actual compiled `.terms/dist/index.js`.
 */
import type { TermPlugin } from './term.type.js';

export const StandardTerms: readonly TermPlugin[];
export const CivicTerms: readonly TermPlugin[];
export const CulturalTerms: readonly TermPlugin[];
export const QuarterTerm: TermPlugin & { keys: readonly string[] };
export const SeasonTerm: TermPlugin & { keys: readonly string[] };
export const TimelineTerm: TermPlugin & { keys: readonly string[] };

/**
 * Tempo Core (Bare Engine)
 * 
 * Exports the un-augmented `Tempo` class and fundamental primitives (e.g., `Interval`).
 * This barrel contains no automatic plugin registration, making it ideal for highly customized,
 * tree-shaken builds where every byte counts.
 */
import { Tempo } from './tempo.class.js';
import { getRuntime } from '#tempo/support';

getRuntime().modules['Tempo'] = Tempo;

export { enums, Token, Snippet, Match, Default, Guard } from '#tempo/support';

export { Interval } from './interval.class.js';
export * from './tempo.class.js';
export default Tempo;

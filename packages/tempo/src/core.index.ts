import { Tempo } from './tempo.class.js';
import { getRuntime } from '#tempo/support';

getRuntime().modules['Tempo'] = Tempo;

export { enums, Token, Snippet, Match, Default, Guard } from '#tempo/support';

export * from './tempo.class.js';
export default Tempo;

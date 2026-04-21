import { Tempo } from './tempo.class.js';

export * from './tempo.class.js';
import { getRuntime } from '#tempo/support';
export { enums, Token, Snippet, Match, Default, Guard } from '#tempo/support';

getRuntime().modules['Tempo'] = Tempo;

export default Tempo;

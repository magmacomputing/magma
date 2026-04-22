import { Tempo } from './tempo.class.js';
import { onRegistryReset, enums } from '#tempo/support';

import { ParseModule } from '#tempo/parse';
import { MutateModule } from '#tempo/mutate';
import { DurationModule } from '#tempo/duration';
import { FormatModule } from '#tempo/format';
import { TermsModule } from '#tempo/term';
import { getRuntime } from '#tempo/support';

// Batteries Included: Register standard modules
const core = [ParseModule, MutateModule, FormatModule, DurationModule, TermsModule];

getRuntime().modules['Tempo'] = Tempo;
onRegistryReset(() => {
	getRuntime().modules['Tempo'] = Tempo;
	Tempo.extend(core);
});

Tempo.extend(core);

export { parse } from './discrete/discrete.parse.js';
export { format } from './discrete/discrete.format.js';
export { enums };

export * from './tempo.class.js';
export default Tempo;

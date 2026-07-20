import { Tempo } from './tempo.class.js';
import { onRegistryReset, enums } from '#tempo/support';

import { ParseModule } from '#tempo/parse';
import { FormatModule } from '#tempo/format';

import { MutateModule } from '#tempo/mutate';
import { DurationModule } from '#tempo/duration';
import { StandardTerms } from '#tempo/std';
import { defineModule } from './plugin/plugin.util.js';

export const TermsModule = defineModule({
	name: 'TermsModule',
	install(this: typeof Tempo, TempoClass: typeof Tempo) {
		getRuntime().modules['TermsModule'] = true;
		onRegistryReset(() => { TempoClass.extend(StandardTerms); });
		TempoClass.extend(StandardTerms);
	},
});
import { getRuntime } from '#tempo/support';

// Batteries Included: Register standard modules
const core = [ParseModule, FormatModule, MutateModule, DurationModule, TermsModule];

getRuntime().modules['Tempo'] = Tempo;
onRegistryReset(() => {
	getRuntime().modules['Tempo'] = Tempo;
	Tempo.extend(core);
});

Tempo.extend(core);

export { parse, format } from '#tempo/module';
export { enums };
export { defineConfig } from './config/defineConfig.js';

// make the Tempo type augmentations available
export type * from '#tempo/parse';
export type * from '#tempo/format';
export type * from '#tempo/mutate';
export type * from '#tempo/duration';
export type * from '#tempo/term';

export { Interval } from './interval.class.js';
export * from './tempo.class.js';
export default Tempo;

import { Tempo } from './tempo.class.js';
import { TermsModule } from '#tempo/term';
import { DurationModule } from '#tempo/duration';
import { FormatModule } from '#tempo/format';
import { MutateModule } from '#tempo/mutate';
import { TickerModule } from '#tempo/ticker';
import { onRegistryReset } from './tempo.enum.js';

// Batteries Included: Register standard modules
const core = [MutateModule, FormatModule, DurationModule, TermsModule, TickerModule];

onRegistryReset(() => {
	Tempo.extend(core);
});

Tempo.extend(core);

export * from './tempo.class.js';
export { default as enums } from './tempo.enum.js';         // Tempo enumerators

// export common patterns and symbols for custom Layouts
export { Token, Snippet, Match, Default, Guard } from './tempo.default.js';

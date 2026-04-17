import { Tempo } from './tempo.class.js';
import { onRegistryReset } from './tempo.register.js';

import { TermsModule } from '#tempo/term';
import { DurationModule } from '#tempo/duration';
import { FormatModule } from '#tempo/format';
import { MutateModule } from '#tempo/mutate';

// Batteries Included: Register standard modules
const core = [MutateModule, FormatModule, DurationModule, TermsModule];

onRegistryReset(() => { Tempo.extend(core); });

Tempo.extend(core);

export * from './tempo.class.js';
export { default as enums } from './tempo.enum.js';

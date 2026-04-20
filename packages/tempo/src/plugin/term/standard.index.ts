import { Tempo } from '../../tempo.class.js';
import { onRegistryReset } from '../../support/tempo.register.js';
import { TermsModule } from './term.index.js';

// Side-effect: Automatically register all standard terms
Tempo.extend(TermsModule);

// Resilience: Ensure terms are restored after a registry reset
onRegistryReset(() => {
	Tempo.extend(TermsModule);
});

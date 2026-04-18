/**
 * Test/Dev Polyfill Bootstrap
 */
import './temporal-polyfill.js';

// Bootstrap Core Modules for Tests
import { Tempo } from '../src/tempo.class.js';
import { onRegistryReset } from '../src/tempo.register.js';
import { ParseModule } from '../src/plugin/module/module.parse.js';
import { MutateModule } from '../src/plugin/module/module.mutate.js';

const core = [ParseModule, MutateModule];

// Register core modules and ensure they are re-registered on every Tempo.init()
onRegistryReset(() => { Tempo.extend(core); });
Tempo.extend(core);

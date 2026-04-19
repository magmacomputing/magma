/**
 * Test/Dev Polyfill Bootstrap
 */
import './temporal-polyfill.js';

// Bootstrap Core Modules for Tests
import { Tempo } from '#tempo/core';
import { onRegistryReset } from '#tempo/tempo.register.js';
import { ParseModule } from '#tempo/parse';
import { MutateModule } from '#tempo/mutate';

const core = [ParseModule, MutateModule];

// Register core modules and ensure they are re-registered on every Tempo.init()
onRegistryReset(() => { Tempo.extend(core); });
Tempo.extend(core);

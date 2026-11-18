// Public Types & Module Augmentations
export * from './types/index.js';

// Reactive Global Configuration Signals
export {
	localeSignal,
	timeZoneSignal,
	createConfigSignals,
	disposeConfigSignals,
} from './core/config.js';

// Tree-Shakeable Signal Helpers
export { toRelativeSignal } from './functions/relative.js';
export { intervalSignal } from './functions/interval.js';

// Signals Plugin Definition & Tempo.signals Namespace
export { SignalsPlugin, signalsPlugin, default } from './plugin.js';

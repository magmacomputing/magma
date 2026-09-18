import { Tempo } from '@magmacomputing/tempo';
import { AiPlugin } from './plugin.js';

// Auto-register AiPlugin onto Tempo upon side-effect import
if (typeof Tempo !== 'undefined' && typeof Tempo.use === 'function') {
	Tempo.use(AiPlugin);
} else if (typeof globalThis !== 'undefined' && typeof (globalThis as any).Tempo?.use === 'function') {
	(globalThis as any).Tempo.use(AiPlugin);
}

export * from './index.js';
export { AiPlugin, aiPlugin, default } from './plugin.js';

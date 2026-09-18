import { Tempo } from '@magmacomputing/tempo';
import { GeoPlugin } from './index.js';

// Auto-register GeoPlugin onto Tempo upon side-effect import
if (typeof Tempo !== 'undefined' && typeof Tempo.use === 'function') {
	Tempo.use(GeoPlugin);
} else if (typeof globalThis !== 'undefined' && typeof (globalThis as any).Tempo?.use === 'function') {
	(globalThis as any).Tempo.use(GeoPlugin);
}

export * from './index.js';
export { GeoPlugin, geoPlugin, default } from './index.js';

import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { CelestialPlugin } from './index.js';

// Auto-register CelestialPlugin onto Tempo upon side-effect import
autoInstall(CelestialPlugin);

export * from './index.js';
export { CelestialPlugin, default } from './index.js';

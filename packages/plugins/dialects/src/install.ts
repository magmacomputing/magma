import { autoInstall } from '@magmacomputing/tempo/plugin/sdk';
import { DialectsPlugin } from './index.js';

// Auto-register plugin onto Tempo upon side-effect import
autoInstall(DialectsPlugin);

export * from './index.js';
export { DialectsPlugin, default } from './index.js';

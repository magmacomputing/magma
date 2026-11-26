import { autoInstall } from 'tempo-kit/plugin/sdk';
import { DialectsPlugin } from './index.js';

// Auto-register plugin onto Tempo upon side-effect import
autoInstall(DialectsPlugin);

export * from './index.js';
export { DialectsPlugin, default } from './index.js';

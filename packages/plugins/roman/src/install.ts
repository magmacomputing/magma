import { autoInstall } from 'tempo-kit/plugin/sdk';
import { RomanPlugin } from './index.js';

// Auto-register plugin onto Tempo upon side-effect import
autoInstall(RomanPlugin);

export * from './index.js';
export { RomanPlugin, default } from './index.js';

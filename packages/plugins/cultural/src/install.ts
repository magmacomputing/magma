import { autoInstall } from 'tempo-kit/plugin/sdk';
import { CulturalPlugin } from './index.js';

// Auto-register plugin onto Tempo upon side-effect import
autoInstall(CulturalPlugin);

export * from './index.js';
export { CulturalPlugin, default } from './index.js';

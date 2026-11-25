import { autoInstall } from 'tempo-kit/plugin/sdk';
import { HolidaysPlugin } from './index.js';

// Auto-register plugin onto Tempo upon side-effect import
autoInstall(HolidaysPlugin);

export * from './index.js';
export { HolidaysPlugin, default } from './index.js';
